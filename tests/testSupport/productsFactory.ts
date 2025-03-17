import { FastifyInstance } from 'fastify';
import Product from 'src/models/Product';

export async function createTestProducts(server: FastifyInstance): Promise<{ product1Id: number; product2Id: number }> {
    const product1: Partial<Product> = {
        name: 'Video Game',
        sku: 'ATUSJN',
        description: 'Video Game',
        price: 42.0,
        stock: 100,
    };

    const product2: Partial<Product> = {
        name: 'Notebook',
        sku: 'ASJDND',
        description: 'Le novo',
        price: 15.0,
        stock: 200,
    };

    const response1 = await makeRequestProduct(server, product1);
    const response2 = await makeRequestProduct(server, product2);

    const jsonResponse1 = await response1.json();
    const jsonResponse2 = await response2.json();

    return {
        product1Id: jsonResponse1.id,
        product2Id: jsonResponse2.id,
    };
}

const makeRequestProduct = (server: FastifyInstance, input: Partial<Product>) =>
    server.inject({
        method: 'POST',
        url: '/products',
        payload: input,
    });