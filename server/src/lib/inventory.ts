import { prisma } from './prisma';

export async function getCurrentStock(productId: string): Promise<number> {
  const result = await prisma.inventoryTransaction.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}