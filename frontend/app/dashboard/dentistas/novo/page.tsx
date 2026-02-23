"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/api";
import type { Dentista } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";

const schema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cro: z.string().min(3, "CRO obrigatório"),
  especialidade: z.string().optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function NovoDentistaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await apiPost<Dentista>("/dentistas", {
        nome: data.nome,
        cro: data.cro,
        especialidade: data.especialidade || undefined,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["dentistas"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push(`/dashboard/dentistas`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar odontólogo");
    }
  };

  return (
    <div>
      <Header
        title="Novo odontólogo"
        action={
          <Link href="/dashboard/dentistas">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        }
      />
      <Card className="mt-6">
        <CardContent className="py-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4">
            <Input label="Nome *" error={errors.nome?.message} {...register("nome")} />
            <Input label="CRO *" error={errors.cro?.message} {...register("cro")} />
            <Input label="Especialidade" {...register("especialidade")} />
            <Input label="Telefone" {...register("telefone")} />
            <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
