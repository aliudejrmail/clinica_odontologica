"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { PacientesResponse } from "@/types/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Plus, Search, Eye, Pencil } from "lucide-react";
import { ToothIcon } from "@/components/icons/ToothIcon";

export default function PacientesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pacientes", page, searchDebounced],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (searchDebounced) params.set("search", searchDebounced);
      return apiGet<PacientesResponse>(`/pacientes?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchDebounced(search);
    setPage(1);
  };

  return (
    <div>
      <Header
        title="Pacientes"
        subtitle="Listagem de pacientes da clínica"
        action={
          <Link href="/dashboard/pacientes/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo paciente
            </Button>
          </Link>
        }
      />
      <Card className="mt-6">
        <CardContent className="py-4">
          <form onSubmit={handleSearchSubmit} className="mb-4 flex gap-2">
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              <div className="relative overflow-x-auto">
                {isFetching && !isLoading && (
                  <div className="absolute right-4 top-2 flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    Atualizando...
                  </div>
                )}
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="pb-3 font-medium">Nome</th>
                      <th className="pb-3 font-medium">CPF</th>
                      <th className="pb-3 font-medium">Telefone</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pacientes?.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-900">{p.nome}</td>
                        <td className="py-3 text-gray-600">{formatCpf(p.cpf)}</td>
                        <td className="py-3 text-gray-600">{p.telefone ?? "—"}</td>
                        <td className="py-3 text-gray-600">{p.email ?? "—"}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.ativo !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {p.ativo !== false ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/dashboard/pacientes/${p.id}`}
                            className="mr-2 inline-flex text-gray-600 hover:text-primary-600"
                            title="Ver ficha"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/pacientes/${p.id}/odontograma`}
                            className="mr-2 inline-flex text-gray-600 hover:text-primary-600"
                            title="História clínica / Odontograma"
                          >
                            <ToothIcon className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/pacientes/${p.id}/editar`}
                            className="inline-flex text-gray-600 hover:text-primary-600"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data && data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-600">
                    Total: {data.total} | Página {data.page} de {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-600">
            <th className="pb-3 font-medium">Nome</th>
            <th className="pb-3 font-medium">CPF</th>
            <th className="pb-3 font-medium">Telefone</th>
            <th className="pb-3 font-medium">Email</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-3"><span className="inline-block h-4 w-32 animate-pulse rounded bg-gray-200" /></td>
              <td className="py-3"><span className="inline-block h-4 w-24 animate-pulse rounded bg-gray-200" /></td>
              <td className="py-3"><span className="inline-block h-4 w-28 animate-pulse rounded bg-gray-200" /></td>
              <td className="py-3"><span className="inline-block h-4 w-36 animate-pulse rounded bg-gray-200" /></td>
              <td className="py-3"><span className="inline-block h-5 w-14 animate-pulse rounded-full bg-gray-200" /></td>
              <td className="py-3 text-right"><span className="inline-block h-4 w-20 animate-pulse rounded bg-gray-200" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCpf(cpf: string): string {
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11) return cpf;
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
