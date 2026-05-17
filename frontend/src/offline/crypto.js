/**
 * Cripto p/ login offline.
 *
 * Estratégia:
 *  - PBKDF2-SHA256 (200k iterações) deriva uma chave AES-256-GCM a partir da
 *    password + salt aleatório por operador.
 *  - O blob da sessão (user, escola, token, plano, limites) é encriptado com
 *    AES-GCM. A tag de autenticação do GCM serve como "validação implícita":
 *    se a password estiver errada, a desencriptação falha — não guardamos
 *    hash separado da password.
 *  - Salt e IV ficam ao lado do ciphertext em IndexedDB.
 *
 * Trade-offs (documentados):
 *  - Se o dispositivo for roubado E o atacante extrair o IDB, pode tentar
 *    brute-force offline. As 200k iterações tornam o custo proibitivo para
 *    passwords de 8+ chars não-triviais, mas dicionário simples cai em horas.
 *    O risco é aceitável para o contexto POS/escola; em ambientes mais
 *    sensíveis, considerar exigir 2º factor + remote wipe.
 *  - Tokens cacheados podem expirar server-side. A 1ª request online após
 *    login offline pode devolver 401 → o utilizador é mandado para o /login
 *    normal e re-autentica (a outbox espera e retoma quando houver token novo).
 */

const PBKDF2_ITERATIONS = 200_000;
const KEY_LENGTH_BITS   = 256;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES   = 12;

function getSubtle() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto não disponível neste browser.");
  }
  return crypto.subtle;
}

export function randomBytes(n) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return arr;
}

export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const baseKey = await getSubtle().importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return getSubtle().deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH_BITS },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encripta um objecto JSON-serializável. Devolve {salt, iv, ciphertext} como Uint8Arrays. */
export async function encryptJson(password, obj) {
  const salt = randomBytes(SALT_LENGTH_BYTES);
  const iv   = randomBytes(IV_LENGTH_BYTES);
  const key  = await deriveKey(password, salt);
  const enc  = new TextEncoder();
  const data = enc.encode(JSON.stringify(obj));
  const ciphertext = await getSubtle().encrypt({ name: "AES-GCM", iv }, key, data);
  return { salt, iv, ciphertext: new Uint8Array(ciphertext) };
}

/**
 * Tenta desencriptar. Devolve o objecto se a password estiver correcta;
 * lança erro caso contrário (a GCM auth tag falha → DOMException OperationError).
 */
export async function decryptJson(password, salt, iv, ciphertext) {
  const key  = await deriveKey(password, salt);
  const data = await getSubtle().decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  const dec  = new TextDecoder();
  return JSON.parse(dec.decode(data));
}
