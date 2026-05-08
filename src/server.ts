import fastify from 'fastify';
import { budgetRoutes } from './routes/budget.routes';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.routes';

const app = fastify({
  logger: true,
});

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'super_secret_token',
})

app.register(budgetRoutes);
app.register(authRoutes, {prefix: '/user'})

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' });
    console.log('🚀 HTTP server running on http://localhost:3333');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
