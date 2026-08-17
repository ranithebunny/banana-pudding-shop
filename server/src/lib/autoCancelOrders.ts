import { prisma } from './prisma';
import { logAction } from './auditLog';

export async function autoCancelExpiredOrders() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      createdAt: { lt: twentyFourHoursAgo },
    },
  });

  for (const order of expiredOrders) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });
    await logAction('system', 'Order auto-cancelled (no payment within 24 hours)', 'Order', order.id);
    console.log(`Auto-cancelled order ${order.orderNumber} (no payment within 24 hours)`);
  }

  if (expiredOrders.length > 0) {
    console.log(`Auto-cancelled ${expiredOrders.length} expired order(s).`);
  }
}