import { FastifyReply, FastifyRequest } from 'fastify';
import { transaction, ValidationError } from 'objection';
import Order from '../../models/Order';
import { OrderStatus } from '../../models/Order';
import { calculateTotals, validateItems, ProductNotFoundError } from '../../handlers/orderHandlers';
import { Item } from '../../types/item';

type Request = FastifyRequest<{ Body: { id?: number; customer_id: number; status: OrderStatus; items: Item[] } }>;

export default async (
    { body: { id, customer_id, status, items } }: Request,
    reply: FastifyReply
) => {
    if (!customer_id || !status) {
        return reply.code(400).send({ message: `customer_id and status are required` });
    }

    const trx = await transaction.start(Order.knex());

    try {
        if (id) {
            const existingOrder = await Order.query(trx).findById(id);

            if (!existingOrder) {
                return reply.code(404).send({ message: `Order with ID ${id} not found` });
            }

            if (existingOrder.status !== OrderStatus.PaymentPending) {
                return reply.code(400).send({ message: `Only orders with status 'payment_pending' can be updated` });
            }
        }

        const { productMap } = await validateItems(items, trx);
        const { orderItems, totalPaid, totalDiscount } = calculateTotals(items, productMap);

        const orderWithItems = {
            id,
            customer_id,
            total_paid: totalPaid,
            total_tax: 0,
            total_shipping: 0,
            total_discount: totalDiscount,
            status: status || OrderStatus.PaymentPending,
            items: orderItems,
        };

        const updatedOrder = await Order.query(trx).upsertGraph(orderWithItems, {
            relate: true,
            unrelate: true,
            noDelete: false,
        });

        await trx.commit();

        const response = {
            id: updatedOrder.id,
            customer_id: updatedOrder.customer_id,
            total_paid: updatedOrder.total_paid,
            total_discount: updatedOrder.total_discount,
            status: updatedOrder.status,
            items: updatedOrder.items.map((item: { product_id: any; quantity: any; discount: any; }) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                discount: item.discount,
            })),
        };
        
        return reply.code(200).send(response);
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