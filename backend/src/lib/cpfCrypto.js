/**
 * Criptografia determinística para CPF (LGPD).
 * Mesmo valor em texto claro gera sempre o mesmo ciphertext, permitindo UNIQUE e busca por igualdade.
 * Chave em CPF_ENCRYPTION_KEY (32 bytes hex ou string que será derivada para 32 bytes).
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey() {
  const raw = process.env.CPF_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-dev-key-change-in-production';
  if (raw.length >= 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw.slice(0, 64), 'hex').slice(0, KEY_LENGTH);
  }
  return crypto.createHash('sha256').update(raw).digest().slice(0, KEY_LENGTH);
}

/** IV determinístico: SHA256(key + "iv") primeiros 16 bytes - mesmo plaintext => mesmo ciphertext */
function getIV() {
  const key = getKey();
  return crypto.createHash('sha256').update(Buffer.concat([key, Buffer.from('iv-cpf-lgpd', 'utf8')])).digest().slice(0, IV_LENGTH);
}

/**
 * Criptografa CPF em texto claro (11 dígitos).
 * @param {string} plainCpf - 11 dígitos
 * @returns {string} - Base64 do ciphertext (para armazenar em VARCHAR)
 */
function encrypt(plainCpf) {
  if (!plainCpf || typeof plainCpf !== 'string') return plainCpf;
  const normalized = plainCpf.replace(/\D/g, '');
  if (normalized.length !== 11) return plainCpf;
  const key = getKey();
  const iv = getIV();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

/**
 * Descriptografa valor armazenado ou retorna texto claro se for legado (11 dígitos).
 * @param {string} stored - Base64 do ciphertext ou 11 dígitos (legado)
 * @returns {string} - 11 dígitos em texto claro
 */
function decrypt(stored) {
  if (stored == null || stored === '') return stored;
  const s = String(stored).trim();
  if (/^\d{11}$/.test(s)) return s; // legado em texto claro
  try {
    const key = getKey();
    const iv = getIV();
    const buf = Buffer.from(s, 'base64');
    if (buf.length === 0) return stored;
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(buf), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return stored;
  }
}

/**
 * Retorna true se o valor parece criptografado (base64), false se texto claro legado.
 */
function isEncrypted(stored) {
  if (!stored || typeof stored !== 'string') return false;
  const s = stored.trim();
  if (s.length === 11 && /^\d+$/.test(s)) return false;
  return true;
}

/**
 * Aplica decrypt em cpf e responsavel_cpf de um objeto paciente (ou array).
 */
function decryptPaciente(paciente) {
  if (!paciente) return paciente;
  const out = { ...paciente };
  if (out.cpf != null) out.cpf = decrypt(out.cpf);
  if (out.responsavel_cpf != null) out.responsavel_cpf = decrypt(out.responsavel_cpf);
  return out;
}

function decryptPacientes(pacientes) {
  return Array.isArray(pacientes) ? pacientes.map(decryptPaciente) : [];
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  decryptPaciente,
  decryptPacientes,
};
