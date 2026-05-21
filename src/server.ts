import fastify from 'fastify';
import { budgetRoutes } from './routes/budget.routes';
import fastifyJwt from '@fastify/jwt';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { resetPasswordRoutes } from './routes/reset-password.routes';

const app = fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || 'super_secret_token',
});

app.register(budgetRoutes, { prefix: '/budgets' });
app.register(authRoutes, { prefix: '/user' });
app.register(userRoutes, { prefix: '/user' });
app.register(resetPasswordRoutes, { prefix: '/reset-password' });

app.setErrorHandler((err, req, reply) => {
  if (hasZodFastifySchemaValidationErrors(err)) {
    return reply.code(400).send({
      error: 'Response Validation Error',
      message: "Request doesn't match the schema",
      statusCode: 400,
      details: {
        issues: err.validation,
        method: req.method,
        url: req.url,
      },
    });
  }

  if (isResponseSerializationError(err)) {
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: "Response doesn't match the schema",
      statusCode: 500,
      details: {
        issues: err.cause.issues,
        method: err.method,
        url: err.url,
      },
    });
  }

  console.error(err);

  return reply.code(500).send({
    error: 'Internal Server Error',
    message: 'Um erro inesperado aconteceu do nosso lado. Tente novamente mais tarde.',
  });
});

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
