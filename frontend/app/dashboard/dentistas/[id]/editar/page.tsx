"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "@/lib/api";
import type { Dentista } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cro: z.string().min(3, "CRO obrigatório"),
  especialidade: z.string().optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  ativo: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditarDentistaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data: dentista, isLoading } = useQuery({
    queryKey: ["dentista", id],
    queryFn: () => apiGet<Dentista>(`/dentistas/${id}`),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: dentista
      ? {
          nome: dentista.nome,
          cro: dentista.cro,
          especialidade: dentista.especialidade ?? "",
          telefone: dentista.telefone ?? "",
          email: dentista.email ?? "",
          ativo: dentista.ativo !== false,
        }
      : undefined,
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await apiPut<Dentista>(`/dentistas/${id}`, {
        nome: data.nome,
        cro: data.cro,
        especialidade: data.especialidade || undefined,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
        ativo: data.ativo,
      });
      await queryClient.invalidateQueries({ queryKey: ["dentistas"] });
      await queryClient.invalidateQueries({ queryKey: ["dentista", id] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      window.location.href = "/dashboard/dentistas";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  };

  if (isLoading || !dentista) {
    return (
      <div>
        <Header title="Editar odontólogo" />
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-gray-500">Carregando...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Editar odontólogo"
        subtitle={dentista.nome}
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
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ativo" {...register("ativo")} className="rounded border-gray-300" />
              <label htmlFor="ativo" className="text-sm text-gray-700">
                Ativo
              </label>
            </div>
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
