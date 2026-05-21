import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ForgotPasswordSchema, UserUpdateSchema } from '../schemas/auth.schemas';
import { authMiddleware } from '../middleware/auth';

const resend = new Resend(process.env.RESEND);

export async function userRoutes(fastify: FastifyInstance) {
  // Rota pública: não requer autenticação e ignora qualquer Bearer token presente no header
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/forgot-password',
    {
      config: { skipAuth: true },
      schema: {
        body: ForgotPasswordSchema,
      },
    },
    async (request, reply) => {
      const { email } = request.body;

      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken: hashedToken, resetTokenExpiresAt: expiresAt },
        });

        const resetLink = `${process.env.RESET_PASSWORD_URL}?token=${token}`;

        const { error: emailError } = await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: email,
          subject: 'Recuperação de senha',
          html: `
            <p>Olá, ${user.name}!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p>Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.</p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
              Recuperar Senha
            </a>
            <p>Se você não solicitou a recuperação, ignore este e-mail.</p>
          `,
        });

        if (emailError) {
          request.log.error({ err: emailError }, 'Falha ao enviar e-mail de recuperação de senha');
          return reply
            .status(500)
            .send({ error: 'Falha ao enviar e-mail. Tente novamente mais tarde.' });
        }
      }

      return reply
        .status(200)
        .send({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' });
    },
  );

  // Rotas privadas: requerem autenticação via Bearer token
  fastify.register(async (privateRoutes) => {
    privateRoutes.addHook('preHandler', authMiddleware);

    privateRoutes.withTypeProvider<ZodTypeProvider>().patch(
      '/update',
      {
        schema: {
          body: UserUpdateSchema,
        },
      },
      async (request, reply) => {
        const { id } = request.user;
        const { name } = request.body;

        const updatedUser = await prisma.user.update({
          where: { id },
          data: { name },
          select: { id: true, name: true, email: true },
        });

        return reply.status(200).send({ user: updatedUser });
      },
    );
  });
}
