import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/categories — public: list all categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/categories — staff/owner: create a new category
router.post('/', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }

    const category = await prisma.category.create({ data: { name } });
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;