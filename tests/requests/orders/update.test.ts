import 'tests/setup';
import server from 'src/server';
import { createTestProducts } from '../../testSupport/productsFactory';

describe('POST /orders/update', () => {
    describe('when the input is valid', () => {
        describe('when creating an order with items', () => {
            it('create the order and returns 200', async () => {
                const { product1Id, product2Id } = await createTestProducts(server);

                const orderInput = {
                    customer_id: 1,
                    status: 'approved',
                    items: [
                        {
                            product_id: product1Id,
                            quantity: 3,
                            discount: 3.98
                        },
                        {
                            product_id: product2Id,
                            quantity: 1,
                            discount: 0.99
                        }
                    ],
                };

                const response = await makeRequest(orderInput);
                const statusCode = response.statusCode;
                const existingOrder = response.json();

                expect(statusCode).toBe(200);
                expect(existingOrder).toMatchObject({
                    id: existingOrder.id,
                    customer_id: orderInput.customer_id,
                    status: orderInput.status,
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            product_id: orderInput.items[0].product_id,
                            quantity: orderInput.items[0].quantity,
                            discount: orderInput.items[0].discount,
                        })
                    ]),
                });
            });

            it('updates the order and returns 200', async () => {
                const { order } = await createOrders();

                const { product1Id, product2Id } = await createTestProducts(server);
                const orderUpddate = {
                    id: order.id,
                    customer_id: order.customer_id,
                    status: 'approved',
                    items: [
                        {
                            product_id: product1Id,
                            quantity: 3,
                            discount: 3.98
                        },
                        {
                            product_id: product2Id,
                            quantity: 1,
                            discount: 0.99
                        }
                    ],
                };

                const response = await makeRequest(orderUpddate);
                const statusCode = response.statusCode;
                const existingOrder = response.json();

                expect(statusCode).toBe(200);
                expect(existingOrder).toMatchObject({
                    id: existingOrder.id,
                    customer_id: orderUpddate.customer_id,
                    status: orderUpddate.status,
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            product_id: orderUpddate.items[0].product_id,
                            quantity: orderUpddate.items[0].quantity,
                            discount: orderUpddate.items[0].discount,
                        })
                    ]),
                });
            });
        });

        describe('when creating an order without items', () => {
            it('create the order and returns 200', async () => {
                const { order: existingOrder, statusCode } = await createOrders();

                expect(statusCode).toBe(200);
                expect(existingOrder).toMatchObject(
                    expect.objectContaining({
                        id: existingOrder.id,
                        customer_id: 1,
                        status: 'payment_pending',
                        items: [],
                    })
                );
            });

            it('updates the order and returns 200', async () => {
                const { order } = await createOrders();

                const orderUpddate = {
                    id: order.id,
                    customer_id: order.customer_id,
                    status: 'approved',
                    items: []
                };

                const response = await makeRequest(orderUpddate);
                const statusCode = response.statusCode;
                const existingOrder = response.json();

                expect(statusCode).toBe(200);
                expect(existingOrder).toMatchObject({
                    id: existingOrder.id,
                    customer_id: orderUpddate.customer_id,
                    status: orderUpddate.status,
                    items: []
                });
            });
        });
    });

    describe('when the product does not exist', () => {
        it('returns a bad request response', async () => {
            const { order: existingOrder } = await createOrders();

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
            const { order: existingOrder } = await createOrders();

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
            const { order: existingOrder } = await createOrders();

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

    describe('when the order status does not allow updates', () => {
        it('returns 400 with an error message', async () => {
            const orderInput = {
                customer_id: 1,
                status: 'approved',
                items: [],
            };

            const responseOrder = await makeRequest(orderInput);
            const existingOrder = responseOrder.json();

            const updateInput = {
                id: existingOrder.id,
                customer_id: existingOrder.customer_id,
                status: 'payment_pending',
                items: [],
            };

            const response = await makeRequest(updateInput);

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({
                message: "Only orders with status 'payment_pending' can be updated",
            });
        });
    });

    async function createOrders(): Promise<{ order: any; statusCode: number }> {
        const input = {
            customer_id: 1,
            status: 'payment_pending',
            items: []
        };

        const response = await makeRequest(input);
        const statusCode = response.statusCode;
        const order = response.json();

        return { order, statusCode };
    }

    const makeRequest = async (input: any) =>
        server.inject({
            method: 'POST',
            url: '/orders',
            body: input,
        });

});