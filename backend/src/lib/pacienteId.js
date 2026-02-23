const prisma = require('./prisma');

/**
 * Resolve identificador de paciente (UUID ou ID inteiro) para o id interno (Int).
 * Uso: LGPD - expor apenas UUID em URLs/API; internamente usamos id.
 * @param {string} idParam - UUID ou id numérico em string
 * @param {number} clinicaId - ID da clínica (segurança)
 * @returns {Promise<number|null>} - id do paciente ou null se não encontrado
 */
async function resolvePacienteId(idParam, clinicaId) {
  if (!idParam || typeof idParam !== 'string') return null;
  const trimmed = idParam.trim();
  const numericId = parseInt(trimmed, 10);
  if (!Number.isNaN(numericId) && String(numericId) === trimmed) {
    const p = await prisma.pacientes.findFirst({
      where: { id: numericId, clinica_id: clinicaId },
      select: { id: true }
    });
    return p ? p.id : null;
  }
  const byUuid = await prisma.pacientes.findFirst({
    where: { uuid: trimmed, clinica_id: clinicaId },
    select: { id: true }
  });
  return byUuid ? byUuid.id : null;
}

module.exports = { resolvePacienteId };
