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
import { ROLES } from "@/lib/constants";

const schema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["clinica_admin", "dentista", "recepcionista"]),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", senha: "", role: "recepcionista" },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const res = await apiPost<AuthResponse>("/auth/register", {
        email: data.email,
        senha: data.senha,
        role: data.role,
      });
      setAuth(res.token, res.user);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao cadastrar");
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Criar conta</h1>
        <p className="text-sm text-gray-500">Cadastre um novo usuário</p>
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
            autoComplete="new-password"
            error={errors.senha?.message}
            {...register("senha")}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Perfil
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              {...register("role")}
            >
              <option value="recepcionista">{ROLES.recepcionista}</option>
              <option value="dentista">{ROLES.dentista}</option>
              <option value="clinica_admin">{ROLES.clinica_admin}</option>
            </select>
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Cadastrar
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
