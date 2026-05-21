import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ResetPasswordQuerySchema } from '../schemas/auth.schemas';

export async function resetPasswordRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        querystring: ResetPasswordQuerySchema,
      },
    },
    async (request, reply) => {
      const { token } = request.query;
      const deepLink = `${process.env.APP_SCHEME}://reset-password?token=${token}`;
      return reply.redirect(deepLink, 302);
    },
  );
}
