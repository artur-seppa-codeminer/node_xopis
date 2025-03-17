import fastify from 'fastify';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import orderRoutes from './routes/order';

const shouldLog = process.env.NODE_ENV !== 'test';
const server = fastify({ logger: shouldLog });

server.register(userRoutes, { prefix: '/users' });
server.register(productRoutes, { prefix: '/products' });
server.register(orderRoutes, { prefix: '/orders' });

export default server;
