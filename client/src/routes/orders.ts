import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

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

    // Fetch real product data from the database — never trust prices from the frontend
    const productIds = items.map((item: { productId: string }) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products are unavailable.' });
    }

    // Build order items using real prices, and calculate the true subtotal
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
        total: subtotal, // no discounts yet — total equals subtotal for now
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

export default router;