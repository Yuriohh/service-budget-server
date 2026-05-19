import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  ForgotPasswordSchema,
  UserLoginSchema,
  UserRegisterSchema,
  UserUpdateSchema,
} from '../schemas/auth.schemas';
import { authMiddleware } from '../middleware/auth';

const resend = new Resend(process.env.RESEND);

export async function authRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/register',
    {
      schema: {
        body: UserRegisterSchema,
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body;

      const userAlreadyExists = await prisma.user.findUnique({ where: { email } });

      if (userAlreadyExists) {
        return reply.status(409).send({ error: 'User already exists' });
      }

      const hashPassword = await bcrypt.hash(password, Number(process.env.SALT) || 10);

      await prisma.user.create({ data: { name, email, password: hashPassword } });

      return reply.status(201).send({ success: 'User created with success!' });
    },
  );

  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/login',
    {
      schema: {
        body: UserLoginSchema,
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return reply.status(404).send({ error: 'Invalid credentials' });
      }

      const checkPassword = await bcrypt.compare(password, user.password);

      if (!checkPassword) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = fastify.jwt.sign({ id: user.id }, { expiresIn: '1d' });

      return reply.status(200).send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    },
  );

  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/update',
    {
      preHandler: authMiddleware,
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

  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/forgot-password',
    {
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

        const resetLink = `myapp://reset-password?token=${token}`;

        await resend.emails.send({
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
      }

      return reply
        .status(200)
        .send({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' });
    },
  );
}
