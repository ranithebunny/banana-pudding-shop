import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/auditLog';
import { getCurrentStock } from '../lib/inventory';
import { getDiscountedTubsUsedToday, applyStaffDiscount } from '../lib/staffDiscount';

const router = Router();

const DELIVERY_FEES: Record<string, number> = {
  OWN_COURIER: 0,
  TEAM_DELIVERY: 150,
};

// POST /api/orders — create a new order (customer must be logged in)
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, fulfillmentType, pickupDate, pickupTime, deliveryAddress, deliveryMethod, notes, contactNumber } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }
    if (!fulfillmentType) {
      return res.status(400).json({ error: 'Fulfillment type is required.' });
    }
    if (!contactNumber || !contactNumber.trim()) {
      return res.status(400).json({ error: 'Contact number is required.' });
    }
    if (fulfillmentType === 'DELIVERY' && !DELIVERY_FEES.hasOwnProperty(deliveryMethod)) {
      return res.status(400).json({ error: 'A valid delivery method is required.' });
    }

    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products are unavailable.' });
    }

    // Check current stock for every item before creating the order
    for (const item of items as { productId: string; quantity: number }[]) {
      const product = products.find((p) => p.id === item.productId)!;
      const currentStock = await getCurrentStock(product.id);
      if (currentStock <= 0) {
        return res.status(400).json({
          error: `${product.name} is currently out of stock. Please remove it from your cart before checking out.`,
        });
      }
      if (currentStock < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${product.name}. Only ${currentStock} left.`,
        });
      }
    }

    const isStaff = req.user!.role === 'STAFF';

    let discountBreakdown = null;
    if (isStaff) {
      const tubsUsedToday = await getDiscountedTubsUsedToday(req.user!.userId);
      discountBreakdown = applyStaffDiscount(
        items.map((item: { productId: string; quantity: number }) => {
          const product = products.find((p) => p.id === item.productId)!;
          return {
            productId: product.id,
            productName: product.name,
            unitPrice: Number(product.price),
            quantity: item.quantity,
          };
        }),
        tubsUsedToday
      );
    }

    let subtotal = 0;
    let totalDiscount = 0;
    const orderItemsData = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = Number(product.price);

      if (isStaff && discountBreakdown) {
        const discountedItem = discountBreakdown.items.find(
          (i: { productId: string }) => i.productId === product.id
        )!;
        subtotal += discountedItem.lineTotal;
        totalDiscount += (unitPrice * item.quantity) - discountedItem.lineTotal;

        return {
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: discountedItem.lineTotal,
          discountedQuantity: discountedItem.discountedQuantity,
        };
      }

      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: itemSubtotal,
        discountedQuantity: 0,
      };
    });

    const deliveryFee = fulfillmentType === 'DELIVERY' ? DELIVERY_FEES[deliveryMethod] : 0;
    const total = subtotal + deliveryFee;

    const orderNumber = `ORD-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: req.user!.userId,
        subtotal,
        discount: totalDiscount,
        deliveryMethod: fulfillmentType === 'DELIVERY' ? deliveryMethod : null,
        deliveryFee,
        total,
        fulfillmentType,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        pickupTime,
        deliveryAddress,
        notes,
        contactNumber: contactNumber.trim(),
        items: {
          create: orderItemsData,
        },
      },
      include: { items: true },
    });

    res.status(201).json({
      ...order,
      staffDiscount: isStaff && discountBreakdown ? {
        applied: discountBreakdown.totalDiscountedTubsThisOrder > 0,
        discountedTubsThisOrder: discountBreakdown.totalDiscountedTubsThisOrder,
        dailyLimitReached: discountBreakdown.dailyLimitReached,
        tubsRemainingToday: discountBreakdown.tubsRemainingToday,
      } : null,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/orders/preview — staff-only: preview discount breakdown before checkout (no order created)
router.post('/preview', authenticate, async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    if (req.user!.role !== 'STAFF') {
      return res.json({ isStaff: false });
    }

    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    const tubsUsedToday = await getDiscountedTubsUsedToday(req.user!.userId);

    const breakdown = applyStaffDiscount(
      items.map((item: { productId: string; quantity: number }) => {
        const product = products.find((p) => p.id === item.productId)!;
        return {
          productId: product.id,
          productName: product.name,
          unitPrice: Number(product.price),
          quantity: item.quantity,
        };
      }),
      tubsUsedToday
    );

    res.json({
      isStaff: true,
      tubsUsedToday,
      ...breakdown,
    });
  } catch (error) {
    console.error('Preview discount error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/orders — logged-in customer's own orders
router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user!.userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/orders/staff/all — staff/owner: view all orders, optionally filtered by status
router.get('/staff/all', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const { status } = req.query;

    const orders = await prisma.order.findMany({
      where: status ? { status: status as string } : undefined,
      include: { items: true, payment: true, customer: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/orders/:id — one order (only its owner can view it)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, payment: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.customerId !== req.user!.userId) {
      return res.status(403).json({ error: 'You do not have permission to view this order.' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/orders/:id/status — staff/owner: advance order status
router.patch('/:id/status', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const { status } = req.body;

    const validTransitions: Record<string, string[]> = {
      CONFIRMED: ['PREPARING'],
      PREPARING: ['READY'],
      READY: ['COMPLETED'],
    };

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const allowedNextStatuses = validTransitions[order.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        error: `Cannot move order from ${order.status} to ${status}.`,
      });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });

    await logAction(req.user!.userId, `Order status changed to ${status}`, 'Order', updated.id);

    res.json(updated);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/orders/:id/cancel — staff/owner: cancel an order
router.post('/:id/cancel', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      return res.status(400).json({ error: `Cannot cancel an order that is already ${order.status.toLowerCase()}.` });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    await logAction(req.user!.userId, 'Order cancelled', 'Order', updated.id);

    res.json(updated);
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// DELETE /api/orders/:id — owner only: permanently delete an order from history
router.delete('/:id', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { orderId: order.id } }),
      prisma.orderItem.deleteMany({ where: { orderId: order.id } }),
      prisma.order.delete({ where: { id: order.id } }),
    ]);

    await logAction(req.user!.userId, 'Order deleted', 'Order', order.id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;