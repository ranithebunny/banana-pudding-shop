import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/auditLog';

const router = Router();

// GET /api/products — public, only active products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/products/:id — public
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/products — staff/owner only
router.post('/', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const { name, description, price, cost, categoryId, image } = req.body;

    if (!name || price === undefined || cost === undefined) {
      return res.status(400).json({ error: 'Name, price, and cost are required.' });
    }

    const product = await prisma.product.create({
      data: { name, description, price, cost, categoryId, image },
    });

    await logAction(req.user!.userId, 'Product created', 'Product', product.id);

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/products/:id — staff/owner only
router.patch('/:id', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const { name, description, price, cost, categoryId, image, isActive } = req.body;

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, description, price, cost, categoryId, image, isActive },
    });

    await logAction(req.user!.userId, 'Product edited', 'Product', product.id);

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;