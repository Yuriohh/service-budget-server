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

export const UserUpdateSchema = z.object({
  name: z.string().min(2, 'Nome precisa ter pelo menos 2 caracteres'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export const ResetPasswordQuerySchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
});

export const ResetPasswordBodySchema = z
  .object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: z.string().min(8, 'Senha precisa ter pelo menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });
