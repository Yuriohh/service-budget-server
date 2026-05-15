import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { CreateBudgetSchema, GetBudgetSchema, UpdateBudgetSchema } from '../schemas/budget.schema';

export async function budgetRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // GET all budgets
  fastify.get('/', async (request, reply) => {
    const { id: userId } = request.user;

    const budgets = await prisma.budget.findMany({
      where: {
        userId,
      },
      omit: {
        userId: true,
      },
      include: {
        items: {
          omit: {
            budgetId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send(budgets);
  });

  // GET single budget
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .get('/:id', { schema: { params: GetBudgetSchema } }, async (request, reply) => {
      const { id } = request.params;
      const budget = await prisma.budget.findUnique({
        where: { id },
        omit: {
          userId: true,
        },
        include: {
          items: {
            omit: {
              budgetId: true,
            },
          },
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
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .patch(
      '/update/:id',
      { schema: { params: GetBudgetSchema, body: UpdateBudgetSchema } },
      async (request, reply) => {
        const { id: userId } = request.user;
        const { id: budgetId } = request.params;
        const { items, ...restData } = request.body;

        const budget = await prisma.budget.findFirst({
          where: { userId, id: budgetId },
        });

        if (!budget) {
          return reply.status(404).send({ error: 'Budget not found or Unauthorized' });
        }

        const updatePayload: Prisma.BudgetUpdateInput = { ...restData };

        if (items) {
          updatePayload.items = {
            deleteMany: {},
            create: items,
          };
        }

        const updatedBudget = await prisma.budget.update({
          where: { id: budgetId },
          data: updatePayload,
          include: {
            items: {
              omit: {
                budgetId: true,
              },
            },
          },
        });

        return reply.send(updatedBudget);
      },
    );

  // DELETE budget
  fastify
    .withTypeProvider<ZodTypeProvider>()
    .delete('/delete/:id', { schema: { params: GetBudgetSchema } }, async (request, reply) => {
      const { id: userId } = request.user;
      const { id } = request.params;

      const budget = await prisma.budget.findFirst({
        where: { userId, id },
      });

      if (!budget) {
        return reply.status(404).send({ error: 'Budget not found or Unauthorized' });
      }

      await prisma.budget.delete({
        where: { id },
      });

      return reply.status(204).send();
    });
}
