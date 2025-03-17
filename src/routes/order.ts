import { FastifyInstance } from 'fastify';
import orderCreate from '../actions/orders/create';

export default async function orderRoutes(server: FastifyInstance) {
  server.post('/', orderCreate);
}
