/**
 * Script one-shot: criptografar CPFs ainda em texto claro na tabela pacientes (LGPD).
 * Execute após deploy da migração de CPF (VARCHAR 128) e do código que usa cpfCrypto.
 * Usa SQL direto para atualizar apenas cpf/responsavel_cpf (não depende de outras colunas do schema).
 * Uso: node src/scripts/encrypt_cpfs.js
 * Requer: DATABASE_URL e CPF_ENCRYPTION_KEY (ou JWT_SECRET) no .env
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { encrypt, isEncrypted } = require('../lib/cpfCrypto');

const prisma = new PrismaClient();

function onlyDigits(str) {
  return str && String(str).replace(/\D/g, '');
}

async function main() {
  const [{ character_maximum_length: cpfLen }] = await prisma.$queryRaw`
    SELECT character_maximum_length FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pacientes' AND column_name = 'cpf'
  `;
  if (!cpfLen || Number(cpfLen) < 64) {
    console.error(
      'Erro: A coluna pacientes.cpf ainda é VARCHAR(11). O valor criptografado precisa de mais espaço.\n' +
      'Rode primeiro a migração: npx prisma migrate deploy\n' +
      'Depois execute este script novamente: npm run encrypt-cpfs'
    );
    process.exit(1);
  }

  const pacientes = await prisma.$queryRaw`
    SELECT id, cpf, responsavel_cpf FROM pacientes
  `;

  let updated = 0;
  for (const p of pacientes) {
    const updates = {};
    if (p.cpf && !isEncrypted(p.cpf)) {
      const digits = onlyDigits(p.cpf);
      if (digits.length === 11) updates.cpf = encrypt(digits);
    }
    if (p.responsavel_cpf && !isEncrypted(p.responsavel_cpf)) {
      const digits = onlyDigits(p.responsavel_cpf);
      if (digits.length === 11) updates.responsavel_cpf = encrypt(digits);
    }
    if (Object.keys(updates).length > 0) {
      if (updates.cpf !== undefined && updates.responsavel_cpf !== undefined) {
        await prisma.$executeRaw`
          UPDATE pacientes SET cpf = ${updates.cpf}, responsavel_cpf = ${updates.responsavel_cpf} WHERE id = ${p.id}
        `;
      } else if (updates.cpf !== undefined) {
        await prisma.$executeRaw`
          UPDATE pacientes SET cpf = ${updates.cpf} WHERE id = ${p.id}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE pacientes SET responsavel_cpf = ${updates.responsavel_cpf} WHERE id = ${p.id}
        `;
      }
      updated++;
      console.log(`Paciente id=${p.id}: criptografado`);
    }
  }

  console.log(`Concluído: ${updated} paciente(s) atualizado(s) de ${pacientes.length} total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
