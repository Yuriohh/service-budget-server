import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { CreateBudgetSchema } from '../schemas/budget.schema';

export async function budgetRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET all budgets
  fastify.get('/budgets', async (request, reply) => {
    const budgets = await prisma.budget.findMany({
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send(budgets);
  });

  // GET single budget
  fastify.get<{ Params: { id: string } }>('/budgets/:id', async (request, reply) => {
    const { id } = request.params;

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!budget) {
      return reply.status(404).send({ error: 'Budget not found' });
    }

    return reply.send(budget);
  });

  // POST new budget
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/new-budget',
    {
      schema: {
        body: CreateBudgetSchema,
      },
    },
    async (request, reply) => {
      const { id: userId } = request.user;
      const { client, title, discount, totalPrice, items } = request.body;

      const budget = await prisma.budget.create({
        data: {
          client,
          title,
          discount,
          totalPrice,
          items: {
            create: items,
          },
          userId: userId,
        },
        include: {
          items: true,
        },
      });

      return reply.status(201).send(budget);
    },
  );

  // PUT update budget
  fastify.put<{
    Params: { id: string };
    Body: {
      client?: string;
      title?: string;
      discount?: number;
      status?: string;
      totalPrice?: number;
    };
  }>('/budgets/:id', async (request, reply) => {
    const { id } = request.params;
    const data = request.body;

    const budget = await prisma.budget.update({
      where: { id },
      data,
      include: {
        items: true,
      },
    });

    return reply.send(budget);
  });

  // DELETE budget
  fastify.delete<{ Params: { id: string } }>('/budgets/:id', async (request, reply) => {
    const { id } = request.params;

    await prisma.budget.delete({
      where: { id },
    });

    return reply.status(204).send();
  });
}
