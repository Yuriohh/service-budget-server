import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { name: string; email: string; password: string } }>(
    '/register',
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

  fastify.post<{ Body: { email: string; password: string } }>('/login', async (request, reply) => {
    const { email, password } = request.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
      return reply.status(401).send({ error: 'Invalid Credentials' });
    }

    const token = fastify.jwt.sign({ id: user.id }, { expiresIn: '1d' });

    return reply.status(200).send({ token });
  });
}
