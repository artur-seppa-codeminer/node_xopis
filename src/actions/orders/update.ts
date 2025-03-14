import { FastifyReply, FastifyRequest } from 'fastify';
import { transaction } from 'objection';
import Order from '../../models/Order';
import OrderItem from '../../models/OrderItem';
import Product from '../../models/Product';
import { OrderStatus } from '../../models/Order';
import { ValidationError } from 'objection';

interface Item {
    product_id: number;
    quantity: number;
    discount?: number;
}

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
        let order: Order;

        if (id) {
            const existingOrder = await Order.query(trx).findById(id);

            if (!existingOrder) {
                return reply.code(404).send({ message: `Order with ID ${id} not found` });
            }

            if (existingOrder.status !== OrderStatus.PaymentPending) {
                return reply.code(400).send({ message: `Only orders with status 'payment_pending' can be updated` });
            }

            if (status) {
                existingOrder.status = status;
            }

            order = existingOrder;
        } else {
            order = await Order.query(trx).insert({
                customer_id,
                total_paid: 0,
                total_tax: 0,
                total_shipping: 0,
                total_discount: 0,
                status: status || OrderStatus.PaymentPending,
            });
        }

        const productIds = items.map((item: Item) => item.product_id);
        const products = await Product.query(trx).findByIds(productIds);
        const productMap = new Map(products.map(product => [product.id, product]));

        let totalPaid = 0;
        let totalDiscount = 0;

        const orderItems = items.map((item) => {
            const product = productMap.get(item.product_id);

            if (!product) {
                throw new Error(`Product with ID ${item.product_id} not found`);
            }

            const itemPaid = product.price * item.quantity;
            const itemDiscount = item.discount ?? 0;

            totalPaid += itemPaid;
            totalDiscount += itemDiscount;

            return {
                order_id: order.id,
                product_id: item.product_id,
                quantity: item.quantity,
                tax: 0,
                shipping: 0,
                discount: itemDiscount,
                paid: itemPaid,
            };
        });

        order.total_paid = totalPaid;
        order.total_discount = totalDiscount;

        await Order.query(trx).patchAndFetchById(order.id, {
            total_paid: order.total_paid,
            total_discount: order.total_discount,
            status: order.status,
        });

        if (!items) {
            await OrderItem.query(trx)
                .delete()
                .where('order_id', order.id)
        } else {
            const existingOrderItems = await OrderItem.query(trx).where('order_id', order.id);
            const existingOrderItemMap = new Map(existingOrderItems.map(item => [item.product_id, item]));

            for (const newItem of orderItems) {
                const existingItem = existingOrderItemMap.get(newItem.product_id);

                if (existingItem) {
                    await OrderItem.query(trx)
                        .patch({
                            quantity: newItem.quantity,
                            discount: newItem.discount,
                            paid: newItem.paid,
                        })
                        .where('id', existingItem.id);
                } else {
                    await OrderItem.query(trx).insert(newItem);
                }
            }
        }

        await trx.commit();

        return reply.code(200).send({
            id: order.id,
            customer_id: order.customer_id,
            status: order.status,
            items: orderItems,
        });
    } catch (error) {
        await trx.rollback();

        if (error instanceof Error) {
            if (error.message.includes('Product with ID')) {
                return reply.code(400).send({ message: error.message });
            }
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