"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api";
import { DENTE_NUMEROS, ODONTOGRAM_ESTADOS } from "@/lib/constants";
import { clsx } from "clsx";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DenteInfo {
  estado: string;
  faces?: Record<string, string>;
  observacoes?: string;
  data_registro?: string;
}

interface OdontogramaGridProps {
  pacienteId: number;
  dentesMap: Map<string, DenteInfo>;
}

export function OdontogramaGrid({ pacienteId, dentesMap }: OdontogramaGridProps) {
  const queryClient = useQueryClient();
  const [selectedDente, setSelectedDente] = useState<string | null>(null);
  const [estado, setEstado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const info = selectedDente ? dentesMap.get(selectedDente) : null;

  const handleSave = async () => {
    if (!selectedDente || !estado) return;
    setError(null);
    setSaving(true);
    try {
      await apiPost("/odontogramas", {
        paciente_id: pacienteId,
        dente_num: selectedDente,
        estado,
        observacoes: observacoes || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["odontograma", String(pacienteId)] });
      setSelectedDente(null);
      setEstado("");
      setObservacoes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDenteClick = (num: string) => {
    setSelectedDente(num);
    const d = dentesMap.get(num);
    setEstado(d?.estado ?? "sadio");
    setObservacoes(d?.observacoes ?? "");
  };

  // Quadrantes: 1 superior direita, 2 superior esquerda, 3 inferior esquerda, 4 inferior direita
  const quadrante1 = DENTE_NUMEROS.filter((n) => n.startsWith("1"));
  const quadrante2 = DENTE_NUMEROS.filter((n) => n.startsWith("2"));
  const quadrante3 = DENTE_NUMEROS.filter((n) => n.startsWith("3"));
  const quadrante4 = DENTE_NUMEROS.filter((n) => n.startsWith("4"));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-8 md:flex-row md:justify-center">
        <div className="text-center">
          <p className="mb-2 text-xs font-medium text-gray-500">Superior direito (1x)</p>
          <div className="flex gap-1 justify-center">
            {quadrante1.map((num) => (
              <DenteCell
                key={num}
                num={num}
                info={dentesMap.get(num)}
                selected={selectedDente === num}
                onClick={() => handleDenteClick(num)}
              />
            ))}
          </div>
        </div>
        <div className="text-center">
          <p className="mb-2 text-xs font-medium text-gray-500">Superior esquerdo (2x)</p>
          <div className="flex gap-1 justify-center">
            {quadrante2.map((num) => (
              <DenteCell
                key={num}
                num={num}
                info={dentesMap.get(num)}
                selected={selectedDente === num}
                onClick={() => handleDenteClick(num)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-8 md:flex-row md:justify-center">
        <div className="text-center">
          <p className="mb-2 text-xs font-medium text-gray-500">Inferior esquerdo (3x)</p>
          <div className="flex gap-1 justify-center">
            {quadrante3.map((num) => (
              <DenteCell
                key={num}
                num={num}
                info={dentesMap.get(num)}
                selected={selectedDente === num}
                onClick={() => handleDenteClick(num)}
              />
            ))}
          </div>
        </div>
        <div className="text-center">
          <p className="mb-2 text-xs font-medium text-gray-500">Inferior direito (4x)</p>
          <div className="flex gap-1 justify-center">
            {quadrante4.map((num) => (
              <DenteCell
                key={num}
                num={num}
                info={dentesMap.get(num)}
                selected={selectedDente === num}
                onClick={() => handleDenteClick(num)}
              />
            ))}
          </div>
        </div>
      </div>

      {selectedDente && (
        <Card className="mt-8 border-primary-200 bg-primary-50/50">
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Dente {selectedDente}</h3>
            {info?.data_registro && (
              <p className="text-xs text-gray-500">
                Última atualização: {new Date(info.data_registro).toLocaleString("pt-BR")}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2"
              >
                {ODONTOGRAM_ESTADOS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} loading={saving}>
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setSelectedDente(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Legenda</p>
        <div className="flex flex-wrap gap-3">
          {ODONTOGRAM_ESTADOS.map(({ value, label, color }) => (
            <span key={value} className={clsx("rounded border px-2 py-0.5 text-xs", color)}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DenteCell({
  num,
  info,
  selected,
  onClick,
}: {
  num: string;
  info?: DenteInfo;
  selected: boolean;
  onClick: () => void;
}) {
  const estadoConfig = ODONTOGRAM_ESTADOS.find((e) => e.value === (info?.estado ?? "sadio"));
  return (
    <button
      type="button"
      title={`Dente ${num}${info ? ` - ${estadoConfig?.label}` : ""}`}
      onClick={onClick}
      className={clsx(
        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 text-sm font-medium transition-all",
        estadoConfig?.color ?? "bg-white border-gray-300",
        selected && "ring-2 ring-primary-500 ring-offset-2"
      )}
    >
      {num}
    </button>
  );
}

