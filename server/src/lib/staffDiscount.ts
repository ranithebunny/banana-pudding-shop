import { prisma } from './prisma';

const DAILY_DISCOUNT_LIMIT = 3;
const STAFF_DISCOUNT_RATE = 0.20;

/**
 * Returns how many discounted tubs this staff account has already
 * used today, across all completed/placed orders.
 */
export async function getDiscountedTubsUsedToday(customerId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const result = await prisma.orderItem.aggregate({
    _sum: { discountedQuantity: true },
    where: {
      order: {
        customerId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        // status: { not: 'CANCELLED' },
      },
    },
  });

  return result._sum.discountedQuantity ?? 0;
}

/**
 * Given the tubs already used today and the current cart's items,
 * decides how many units of each item get the discount.
 * Mutates nothing — returns a breakdown.
 */
export interface CartItemInput {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface DiscountedCartItem extends CartItemInput {
  discountedQuantity: number;
  regularQuantity: number;
  discountedUnitPrice: number;
  lineTotal: number;
}

export function applyStaffDiscount(
  items: CartItemInput[],
  tubsAlreadyUsedToday: number
) {
  let remainingSlots = Math.max(0, DAILY_DISCOUNT_LIMIT - tubsAlreadyUsedToday);

  const breakdown: DiscountedCartItem[] = items.map((item) => {
    const discountedQuantity = Math.min(item.quantity, remainingSlots);
    const regularQuantity = item.quantity - discountedQuantity;
    remainingSlots -= discountedQuantity;

    const discountedUnitPrice = Math.round(item.unitPrice * (1 - STAFF_DISCOUNT_RATE) * 100) / 100;
    const lineTotal =
      discountedQuantity * discountedUnitPrice + regularQuantity * item.unitPrice;

    return {
      ...item,
      discountedQuantity,
      regularQuantity,
      discountedUnitPrice,
      lineTotal,
    };
  });

  const totalDiscountedTubsThisOrder = breakdown.reduce(
    (sum, i) => sum + i.discountedQuantity, 0
  );
  const tubsRemainingAfterThisOrder = Math.max(
    0, DAILY_DISCOUNT_LIMIT - tubsAlreadyUsedToday - totalDiscountedTubsThisOrder
  );

  return {
    items: breakdown,
    total: breakdown.reduce((sum, i) => sum + i.lineTotal, 0),
    totalDiscountedTubsThisOrder,
    dailyLimitReached: tubsAlreadyUsedToday + totalDiscountedTubsThisOrder >= DAILY_DISCOUNT_LIMIT,
    tubsRemainingToday: tubsRemainingAfterThisOrder,
  };
}