import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { getCurrentStock } from '../lib/inventory';

const router = Router();

const PAID_STATUSES = ['CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

function parseDateRange(req: any) {
  const { startDate, endDate } = req.query;
  const range: { gte?: Date; lte?: Date } = {};
  if (startDate) range.gte = new Date(startDate as string);
  if (endDate) range.lte = new Date(endDate as string);
  return Object.keys(range).length > 0 ? range : undefined;
}

// GET /api/reports/sales — total sales over a date range, plus a breakdown by day
router.get('/sales', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const dateRange = parseDateRange(req);

    const orders = await prisma.order.findMany({
      where: {
        status: { in: PAID_STATUSES },
        ...(dateRange && { createdAt: dateRange }),
      },
      select: { total: true, createdAt: true },
    });

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const orderCount = orders.length;

    res.json({ totalSales, orderCount, orders });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/reports/products — best-selling products, revenue by product
router.get('/products', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const dateRange = parseDateRange(req);

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: PAID_STATUSES },
          ...(dateRange && { createdAt: dateRange }),
        },
      },
      select: { productId: true, productName: true, quantity: true, subtotal: true },
    });

    const byProduct: Record<string, { productName: string; quantitySold: number; revenue: number }> = {};
    for (const item of items) {
      if (!byProduct[item.productId]) {
        byProduct[item.productId] = { productName: item.productName, quantitySold: 0, revenue: 0 };
      }
      byProduct[item.productId].quantitySold += item.quantity;
      byProduct[item.productId].revenue += Number(item.subtotal);
    }

    const results = Object.entries(byProduct)
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.quantitySold - a.quantitySold);

    res.json(results);
  } catch (error) {
    console.error('Products report error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/reports/profit — revenue - cost of goods sold - expenses
router.get('/profit', authenticate, authorize('OWNER'), async (req, res) => {
  try {
    const dateRange = parseDateRange(req);

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: PAID_STATUSES },
          ...(dateRange && { createdAt: dateRange }),
        },
      },
      select: { productId: true, quantity: true, subtotal: true },
    });

    const revenue = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    // Look up each product's cost to calculate true cost of goods sold
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, cost: true },
    });
    const costById = Object.fromEntries(products.map((p) => [p.id, Number(p.cost)]));

    const costOfGoodsSold = items.reduce(
      (sum, item) => sum + (costById[item.productId] ?? 0) * item.quantity,
      0
    );

    const expenses = await prisma.expense.findMany({
      where: dateRange ? { date: dateRange } : undefined,
      select: { amount: true },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const estimatedProfit = revenue - costOfGoodsSold - totalExpenses;

    res.json({
      revenue,
      costOfGoodsSold,
      totalExpenses,
      estimatedProfit,
      note: 'This is an estimate based on recorded product costs and expenses.',
    });
  } catch (error) {
    console.error('Profit report error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/reports/inventory — current stock for all products, flagging low stock
router.get('/inventory', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const LOW_STOCK_THRESHOLD = 5;

    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const report = await Promise.all(
      products.map(async (product) => {
        const stock = await getCurrentStock(product.id);
        return { productId: product.id, productName: product.name, stock, lowStock: stock <= LOW_STOCK_THRESHOLD };
      })
    );

    res.json(report);
  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// GET /api/reports/dashboard — the at-a-glance numbers for the staff/owner home screen
router.get('/dashboard', authenticate, authorize('STAFF', 'OWNER'), async (req, res) => {
  try {
    const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // Philippines is UTC+8

const nowPH = new Date(Date.now() + PH_OFFSET_MS);
const startOfTodayPH = new Date(Date.UTC(nowPH.getUTCFullYear(), nowPH.getUTCMonth(), nowPH.getUTCDate(), 0, 0, 0));
const startOfToday = new Date(startOfTodayPH.getTime() - PH_OFFSET_MS);

const startOfMonthPH = new Date(Date.UTC(nowPH.getUTCFullYear(), nowPH.getUTCMonth(), 1, 0, 0, 0));
const startOfMonth = new Date(startOfMonthPH.getTime() - PH_OFFSET_MS);

    const [todaysOrders, monthlyOrders, pendingPayments, pendingOrders] = await Promise.all([
      prisma.order.findMany({
        where: { status: { in: PAID_STATUSES }, createdAt: { gte: startOfToday } },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { status: { in: PAID_STATUSES }, createdAt: { gte: startOfMonth } },
        select: { total: true },
      }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'PAYMENT_REVIEW'] } } }),
    ]);

    const todaysSales = todaysOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + Number(o.total), 0);

    res.json({
      todaysSales,
      monthlyRevenue,
      pendingPayments,
      pendingOrders,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

export default router;