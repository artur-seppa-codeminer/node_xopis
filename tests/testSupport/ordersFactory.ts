import { FastifyInstance } from 'fastify';
import { createTestProducts } from './productsFactory';

export async function createTestOrders(server: FastifyInstance): Promise<{ order: any; statusCode: number }> {
    const { product1Id, product2Id } = await createTestProducts(server);

    const input = {
        customer_id: 1,
        items: [
            { product_id: product1Id, quantity: 2, discount: 3.98 },
            { product_id: product2Id, quantity: 1, discount: 0.99 }
        ]
    };

    const response = await makeRequest(server, input);
    const statusCode = response.statusCode;

    const order = await response.json();
    return { order, statusCode };
}

const makeRequest = (server: FastifyInstance, input: any) =>
    server.inject({
        method: 'POST',
        url: '/orders',
        payload: input,
    });