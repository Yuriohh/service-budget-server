import z from 'zod';

export const UserRegisterSchema = z.object({
  name: z.string(),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha precisa ter pelo menos 8 caracteres'),
});

export const UserLoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string(),
});
