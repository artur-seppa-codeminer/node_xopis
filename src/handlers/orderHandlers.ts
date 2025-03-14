import { transaction } from 'objection';
import Product from '../models/Product';
import { Item } from '../types/item'; 

export class ProductNotFoundError extends Error {
  constructor(productId: number) {
    super(`Product with ID ${productId} not found`);
    this.name = 'ProductNotFoundError';
  }
}

export async function validateItems(items: Item[], trx: any) {
  const productIds = items.map(item => item.product_id);
  const products = await Product.query(trx).findByIds(productIds);

  const productMap = new Map(products.map(product => [product.id, product]));

  return { productMap };
}

export function calculateTotals(order:any, items: Item[], productMap: Map<number, Product>) {
  let totalPaid = 0;
  let totalDiscount = 0;

  const orderItems = items.map(item => {
    const product = productMap.get(item.product_id);

    if (!product) {
      throw new ProductNotFoundError(item.product_id);
    }

    const itemPaid = product.price * item.quantity;
    const itemDiscount = item.discount ?? 0;

    totalPaid += itemPaid;
    totalDiscount += itemDiscount;

    return {
      order_id: order?.id || null,
      product_id: item.product_id,
      quantity: item.quantity,
      tax: 0,
      shipping: 0,
      discount: itemDiscount,
      paid: itemPaid,
    };
  });

  return { orderItems, totalPaid, totalDiscount };
}