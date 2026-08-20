import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/auditLog';
import { getCurrentStock } from '../lib/inventory';

const router = Router();

// POST /api/orders — create a new order (customer must be logged in)
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, fulfillmentType, pickupDate, pickupTime, deliveryAddress, notes, customerName, contactNumber } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }
    if (!fulfillmentType) {
      return res.status(400).json({ error: 'Fulfillment type is required.' });
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

    let subtotal = 0;
    const orderItemsData = items.map((item: { productId: string; quantity: number }) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = Number(product.price);
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: itemSubtotal,
      };
    });

    const orderNumber = `ORD-${Date.now()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: req.user!.userId,
        subtotal,
        total: subtotal,
        fulfillmentType,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        pickupTime,
        deliveryAddress,
        notes,
        items: {
          create: orderItemsData,
        },
      },
      include: { items: true },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
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