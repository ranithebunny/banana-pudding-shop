import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/auditLog';

const router = Router();

// GET /api/expenses — owner only: list expenses, optionally filtered by date range
router.get('/', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/expenses — owner only: record an expense
router.post('/', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { category, description, amount, date } = req.body;

    if (!category || !amount || !date) {
      return res.status(400).json({ error: 'Category, amount, and date are required.' });
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount,
        date: new Date(date),
        createdById: req.user!.userId,
      },
    });

    await logAction(req.user!.userId, 'Expense created', 'Expense', expense.id);

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// PATCH /api/expenses/:id — owner only: edit an expense
router.patch('/:id', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const { category, description, amount, date } = req.body;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        category,
        description,
        amount,
        date: date ? new Date(date) : undefined,
      },
    });

    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// DELETE /api/expenses/:id — owner only
router.delete('/:id', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;