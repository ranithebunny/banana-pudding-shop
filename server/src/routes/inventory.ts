import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { getCurrentStock } from '../lib/inventory';
import { logAction } from '../lib/auditLog';

const router = Router();

// GET /api/inventory — staff/owner: current stock for every active product
router.get('/', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const stockLevels = await Promise.all(
      products.map(async (product) => ({
        productId: product.id,
        productName: product.name,
        stock: await getCurrentStock(product.id),
      }))
    );

    res.json(stockLevels);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/inventory/restock — staff/owner: add stock for a product
router.post('/restock', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'A product and a positive quantity are required.' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const transaction = await prisma.inventoryTransaction.create({
      data: {
        productId,
        type: 'RESTOCK',
        quantity,
        reason,
        createdById: req.user!.userId,
      },
    });

    const newStock = await getCurrentStock(productId);

    await logAction(req.user!.userId, 'Inventory restocked', 'InventoryTransaction', transaction.id);

    res.status(201).json({ transaction, currentStock: newStock });
  } catch (error) {
    console.error('Restock error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// POST /api/inventory/adjust — staff/owner: manual adjustment (waste, correction, etc.)
router.post('/adjust', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const { productId, quantity, type, reason } = req.body;

    if (!productId || quantity === undefined || quantity === 0) {
      return res.status(400).json({ error: 'A product and a non-zero quantity are required.' });
    }
    if (!['ADJUSTMENT', 'WASTE', 'RETURN'].includes(type)) {
      return res.status(400).json({ error: 'Invalid adjustment type.' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (quantity < 0) {
      const currentStock = await getCurrentStock(productId);
      if (currentStock + quantity < 0) {
        return res.status(400).json({ error: 'This adjustment would make stock negative.' });
      }
    }

    const transaction = await prisma.inventoryTransaction.create({
      data: {
        productId,
        type,
        quantity,
        reason,
        createdById: req.user!.userId,
      },
    });

    const newStock = await getCurrentStock(productId);

    await logAction(req.user!.userId, `Inventory ${type.toLowerCase()}`, 'InventoryTransaction', transaction.id);

    res.status(201).json({ transaction, currentStock: newStock });
  } catch (error) {
    console.error('Adjust inventory error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;