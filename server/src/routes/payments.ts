import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { getCurrentStock } from '../lib/inventory';
import { logAction } from '../lib/auditLog';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matching your spec
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
    }
  },
});

// POST /api/orders/:id/payment — submit payment method + proof for an order
router.post('/orders/:id/payment', authenticate, upload.single('proof'), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.customerId !== req.user!.userId) {
      return res.status(403).json({ error: 'You do not have permission to pay for this order.' });
    }
    if (order.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ error: 'This order is not awaiting payment.' });
    }

    const { paymentMethod } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Proof of payment image is required.' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${order.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('payment-proofs')
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload proof image.' });
    }

const [payment] = await prisma.$transaction([
  prisma.payment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      paymentMethod,
      amount: order.total,
      proofUrl: fileName,
      status: 'PENDING',
    },
    update: {
      paymentMethod,
      proofUrl: fileName,
      status: 'PENDING',
      rejectionReason: null,
      verifiedById: null,
      verifiedAt: null,
    },
  }),
  prisma.order.update({
    where: { id: order.id },
    data: { status: 'PAYMENT_REVIEW' },
  }),
]);

    res.status(201).json(payment);
  } catch (error) {
    console.error('Submit payment error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/payments — staff/owner: list payments awaiting review
router.get('/payments', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: { order: { include: { customer: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/payments/:id/proof-url — staff/owner: get a temporary secure link to view the proof image
router.get('/payments/:id/proof-url', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment || !payment.proofUrl) {
      return res.status(404).json({ error: 'Payment or proof image not found.' });
    }

    const { data, error } = await supabaseAdmin.storage
      .from('payment-proofs')
      .createSignedUrl(payment.proofUrl, 60);

    if (error) {
      console.error('Signed URL error:', error);
      return res.status(500).json({ error: 'Failed to generate image link.' });
    }

    res.json({ url: data.signedUrl });
  } catch (error) {
    console.error('Get proof URL error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/payments/:id/verify — staff/owner: approve a payment
router.post('/payments/:id/verify', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { items: true } } },
    });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }
    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'This payment has already been reviewed.' });
    }

    for (const item of payment.order.items) {
      const currentStock = await getCurrentStock(item.productId);
      if (currentStock < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${item.productName}. Available: ${currentStock}, needed: ${item.quantity}.`,
        });
      }
    }

    const inventoryTransactions = payment.order.items.map((item) => ({
      productId: item.productId,
      type: 'SALE' as const,
      quantity: -item.quantity,
      referenceId: payment.orderId,
      createdById: req.user!.userId,
    }));

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'VERIFIED', verifiedById: req.user!.userId, verifiedAt: new Date() },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'CONFIRMED' },
      }),
      prisma.inventoryTransaction.createMany({ data: inventoryTransactions }),
    ]);

    await logAction(req.user!.userId, 'Payment verified', 'Payment', payment.id);

    res.json({ message: 'Payment verified.' });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/payments/:id/reject — staff/owner: reject a payment, with a reason
router.post('/payments/:id/reject', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ error: 'A rejection reason is required.' });
    }

    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }
    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'This payment has already been reviewed.' });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REJECTED',
          rejectionReason,
          verifiedById: req.user!.userId,
          verifiedAt: new Date(),
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'PENDING_PAYMENT' },
      }),
    ]);

    await logAction(req.user!.userId, 'Payment rejected', 'Payment', payment.id);

    res.json({ message: 'Payment rejected.' });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;