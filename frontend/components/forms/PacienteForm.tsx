"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Paciente } from "@/types/api";

const schema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  cpf: z.string().regex(/^\d{0,11}$/, "CPF deve ter 11 dígitos").optional().transform((v) => (v === "" ? undefined : v)),
  data_nascimento: z.string().optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.string().optional(),
  responsavel_nome: z.string().optional(),
  responsavel_cpf: z.string().optional(),
  responsavel_telefone: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().optional(),
});

export type PacienteFormData = z.infer<typeof schema>;

interface PacienteFormProps {
  defaultValues?: Partial<Paciente>;
  onSubmit: (data: PacienteFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function PacienteForm({ defaultValues, onSubmit, isSubmitting }: PacienteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PacienteFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: defaultValues?.nome ?? "",
      cpf: defaultValues?.cpf?.replace(/\D/g, "") ?? "",
      data_nascimento: defaultValues?.data_nascimento ? String(defaultValues.data_nascimento).slice(0, 10) : "",
      telefone: defaultValues?.telefone ?? "",
      email: defaultValues?.email ?? "",
      endereco: defaultValues?.endereco ?? "",
      responsavel_nome: defaultValues?.responsavel_nome ?? "",
      responsavel_cpf: defaultValues?.responsavel_cpf ?? "",
      responsavel_telefone: defaultValues?.responsavel_telefone ?? "",
      observacoes: defaultValues?.observacoes ?? "",
      ativo: defaultValues?.ativo ?? true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome *" error={errors.nome?.message} {...register("nome")} />
        <Input label="CPF (apenas números)" placeholder="11 dígitos" error={errors.cpf?.message} {...register("cpf")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Data de nascimento" type="date" {...register("data_nascimento")} />
        <Input label="Telefone" {...register("telefone")} />
      </div>
      <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
      <Input label="Endereço" {...register("endereco")} />
      <div className="border-t border-gray-100 pt-4">
        <h3 className="mb-2 font-medium text-gray-900">Responsável (opcional)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Nome" {...register("responsavel_nome")} />
          <Input label="CPF" {...register("responsavel_cpf")} />
          <Input label="Telefone" {...register("responsavel_telefone")} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          rows={3}
          {...register("observacoes")}
        />
      </div>
      {defaultValues && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ativo" {...register("ativo")} className="rounded border-gray-300" />
          <label htmlFor="ativo" className="text-sm text-gray-700">
            Paciente ativo
          </label>
        </div>
      )}
      <div className="flex gap-2 pt-4">
        <Button type="submit" loading={isSubmitting}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
