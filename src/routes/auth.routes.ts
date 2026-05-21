import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  UserLoginSchema,
  UserRegisterSchema,
  ResetPasswordBodySchema,
} from '../schemas/auth.schemas';

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

  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/reset-password',
    {
      schema: {
        body: ResetPasswordBodySchema,
      },
    },
    async (request, reply) => {
      const { token, password } = request.body;

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await prisma.user.findFirst({
        where: {
          resetToken: hashedToken,
          resetTokenExpiresAt: { gt: new Date() },
        },
      });

      if (!user) {
        return reply.status(400).send({ error: 'Token inválido ou expirado.' });
      }

      const hashedPassword = await bcrypt.hash(password, Number(process.env.SALT) || 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      });

      return reply.status(200).send({ message: 'Senha redefinida com sucesso.' });
    },
  );
}
