import { FastifyReply, FastifyRequest } from 'fastify';
import { transaction, ValidationError } from 'objection';
import Order from '../../models/Order';
import OrderItem from '../../models/OrderItem';
import { OrderStatus } from '../../models/Order';
import { calculateTotals, validateItems, ProductNotFoundError } from '../../handlers/orderHandlers';
import { Item } from '../../types/item';

type Request = FastifyRequest<{ Body: { customer_id: number; items: Item[] } }>;

export default async (
  { body: { customer_id, items } }: Request,
  reply: FastifyReply
) => {

  if (!customer_id || !items) {
    return reply.code(400).send({ message: `customer_id and items are required` });
  }

  const trx = await transaction.start(Order.knex());

  try {
    const { productMap } = await validateItems(items, trx);
    const { orderItems, totalPaid, totalDiscount } = calculateTotals(items, productMap);

    const orderWithItems = {
      customer_id,
      total_paid: totalPaid,
      total_tax: 0,
      total_shipping: 0,
      total_discount: totalDiscount,
      status: OrderStatus.PaymentPending,
      items: orderItems,
    };

    const order = await Order.query(trx).insertGraph(orderWithItems);
    await trx.commit()

    return reply.code(201).send({
      id: order.id,
      customer_id: order.customer_id,
      total_paid: order.total_paid,
      total_discount: order.total_discount,
      status: order.status,
      items: order.items.map((item: { product_id: any; quantity: any; discount: any; }) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        discount: item.discount,
      })),
    });
  } catch (error) {
    await trx.rollback();

    if (error instanceof ProductNotFoundError) {
      return reply.code(404).send({ message: error.message });
    }

    if (error instanceof ValidationError) {
      return reply.code(400).send({
        message: 'Validation error',
        error: {
          name: error.name,
          type: error.type,
          data: error.data,
        },
      });
    }

    return reply.code(500).send({ message: 'Internal server error', error });
  }
};