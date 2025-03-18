import { FastifyInstance } from 'fastify';
import orderUpdate from '../actions/orders/update';

export default async function orderRoutes(server: FastifyInstance) {
  server.post('/', orderUpdate);
}
