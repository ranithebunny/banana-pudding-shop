import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { logAction } from '../lib/auditLog';

const router = Router();

// GET /api/reviews/summary — public: average rating + count for every product, in one request
router.get('/summary', async (req, res) => {
  try {
    const grouped = await prisma.review.groupBy({
      by: ['productId'],
      _avg: { rating: true },
      _count: { rating: true },
    });

    const summary: Record<string, { averageRating: number; count: number }> = {};
    for (const g of grouped) {
      summary[g.productId] = {
        averageRating: g._avg.rating || 0,
        count: g._count.rating,
      };
    }

    res.json(summary);
  } catch (error) {
    console.error('Review summary error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/reviews/product/:productId — public: list reviews for one product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const count = reviews.length;
    const averageRating = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        customerName: r.customer.name,
      })),
      averageRating,
      count,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/reviews/product/:productId/eligibility — logged-in: can this customer review this product?
router.get('/product/:productId/eligibility', authenticate, async (req, res) => {
  try {
    const existing = await prisma.review.findUnique({
      where: {
        productId_customerId: { productId: req.params.productId, customerId: req.user!.userId },
      },
    });
    if (existing) {
      return res.json({ canReview: false, reason: 'ALREADY_REVIEWED' });
    }

    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId: req.params.productId,
        order: { customerId: req.user!.userId, status: 'COMPLETED' },
      },
    });
    if (!purchased) {
      return res.json({ canReview: false, reason: 'NOT_PURCHASED' });
    }

    res.json({ canReview: true });
  } catch (error) {
    console.error('Review eligibility error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/reviews/product/:productId — logged-in customer: submit a review (verified purchase only)
router.post('/product/:productId', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const existing = await prisma.review.findUnique({
      where: {
        productId_customerId: { productId: req.params.productId, customerId: req.user!.userId },
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this product.' });
    }

    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId: req.params.productId,
        order: { customerId: req.user!.userId, status: 'COMPLETED' },
      },
    });
    if (!purchased) {
      return res.status(403).json({ error: 'You can only review products from a completed order.' });
    }

    const review = await prisma.review.create({
      data: {
        productId: req.params.productId,
        customerId: req.user!.userId,
        rating,
        comment: comment || null,
      },
      include: { customer: { select: { name: true } } },
    });

    res.status(201).json({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      customerName: review.customer.name,
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// DELETE /api/reviews/:id — staff/owner only: remove an inappropriate review
router.delete('/:id', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    await prisma.review.delete({ where: { id: req.params.id } });
    await logAction(req.user!.userId, 'Review deleted', 'Review', req.params.id);

    res.status(204).send();
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;