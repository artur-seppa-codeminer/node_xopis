import 'tests/setup';
import server from 'src/server';
import { createTestOrders } from '../../testSupport/ordersFactory';

describe('POST /orders/update', () => {
    describe('when the input is valid', () => {
        describe('when updating an order with items', () => {
            it('updates the order and returns 200', async () => {
                const { order: existingOrder } = await createTestOrders(server);

                const updateInput = {
                    id: existingOrder.id,
                    customer_id: existingOrder.customer_id,
                    status: 'approved',
                    items: [
                        { product_id: existingOrder.items[0].product_id, quantity: 5, discount: 10.0 }
                    ],
                };

                const response = await makeRequest(updateInput);

                expect(response.statusCode).toBe(200);
                expect(response.json()).toMatchObject({
                    id: existingOrder.id,
                    customer_id: updateInput.customer_id,
                    status: updateInput.status,
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            product_id: updateInput.items[0].product_id,
                            quantity: updateInput.items[0].quantity,
                            discount: updateInput.items[0].discount,
                        })
                    ]),
                });
            });
        });

        describe('when updating an order without items', () => {
            it('updates the order and returns 200', async () => {
                const { order: existingOrder } = await createTestOrders(server);

                const updateInput = {
                    id: existingOrder.id,
                    customer_id: existingOrder.customer_id,
                    status: 'approved',
                    items: []
                };

                const response = await makeRequest(updateInput);

                expect(response.statusCode).toBe(200);
                expect(response.json()).toMatchObject(
                    expect.objectContaining({
                        id: existingOrder.id,
                        customer_id: updateInput.customer_id,
                        status: updateInput.status,
                        items: [], 
                    })
                );
            });
        });
    });

    describe('when the product does not exist', () => {
        it('returns a bad request response', async () => {
            const { order: existingOrder } = await createTestOrders(server);

            const updateInput = {
                id: existingOrder.id,
                customer_id: existingOrder.customer_id,
                status: 'approved',
                items: [{ product_id: 999, quantity: 1 }],
            };

            const response = await makeRequest(updateInput);

            expect(response.statusCode).toBe(404);
            expect(response.json()).toEqual(
                expect.objectContaining({
                    message: expect.stringContaining('Product with ID 999 not found'),
                })
            );
        });
    });

    describe('when the input is invalid', () => {
        it('returns 400 for missing customer_id', async () => {
            const { order: existingOrder } = await createTestOrders(server);

            const updateInput = {
                id: existingOrder.id,
                status: 'approved',
                items: [{ product_id: 1, quantity: 1 }],
            };

            const response = await makeRequest(updateInput);

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({
                message: 'customer_id and status are required',
            });
        });

        it('returns 400 for missing status', async () => {
            const { order: existingOrder } = await createTestOrders(server);

            const updateInput = {
                id: existingOrder.id,
                customer_id: existingOrder.customer_id,
                items: [{ product_id: 1, quantity: 1 }],
            };

            const response = await makeRequest(updateInput);

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({
                message: 'customer_id and status are required',
            });
        });
    });

    describe('when the order does not exist', () => {
        it('returns 404 with an error message', async () => {
            const updateInput = {
                id: 999,
                customer_id: 1,
                status: 'approved',
                items: [{ product_id: 1, quantity: 1 }],
            };

            const response = await makeRequest(updateInput);

            expect(response.statusCode).toBe(404);
            expect(response.json()).toEqual({
                message: 'Order with ID 999 not found',
            });
        });
    });

    describe('when the order status does not allow updates', () => {
        it('returns 400 with an error message', async () => {
            const { order: existingOrder } = await createTestOrders(server);

            const updateInput = {
                id: existingOrder.id,
                customer_id: existingOrder.customer_id,
                status: 'asd',
                items: [{ product_id: 1, quantity: 1 }],
            };

            const response = await makeRequest(updateInput);

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({
                message: "Only orders with status 'payment_pending' can be updated",
            });
        });
    });

    const makeRequest = async (input: any) =>
        server.inject({
            method: 'POST',
            url: '/orders/update',
            body: input,
        });

});