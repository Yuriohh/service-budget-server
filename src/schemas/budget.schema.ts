import z from 'zod';

export const CreateBudgetSchema = z.object({
  client: z.string(),
  title: z.string(),
  discount: z.number().optional(),
  totalPrice: z.number().positive('O preço não pode ser negativo'),
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      quantity: z.number().min(1, 'Quantidade mínima é 1'),
      price: z.number(),
    }),
  ),
});
