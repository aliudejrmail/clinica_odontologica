"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/api";
import type { AuthResponse } from "@/types/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

const schema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", senha: "" },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const res = await apiPost<AuthResponse>("/auth/login", {
        email: data.email,
        senha: data.senha,
      });
      setAuth(res.token, res.user);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fazer login");
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Odonto Clínica</h1>
        <p className="text-sm text-gray-500">Entre com sua conta</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.senha?.message}
            {...register("senha")}
          />
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Entrar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Não tem conta?{" "}
          <Link href="/register" className="font-medium text-primary-600 hover:underline">
            Cadastrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
