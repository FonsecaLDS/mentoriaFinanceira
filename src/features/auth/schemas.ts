import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.");
const password = z.string().min(8, "A senha deve ter pelo menos 8 caracteres.");

export const loginSchema = z.object({ email, password });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Informe seu nome completo."),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais.",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
