import { FastifyInstance } from 'fastify';
import orderCreate from '../actions/orders/create';
import orderUpdate from '../actions/orders/update';

export default async function orderRoutes(server: FastifyInstance) {
  server.post('/', orderCreate);
  server.post('/update', orderUpdate);
}
