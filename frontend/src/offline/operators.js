import { getDb, STORES } from "./db";
import { encryptJson, decryptJson } from "./crypto";

/**
 * Gestão de operadores autorizados a entrar offline neste dispositivo.
 *
 * O blob `auth` ({ token, user, escola, plano, limites, tenantId }) é guardado
 * encriptado com chave derivada da password via PBKDF2. Listar é seguro
 * (devolve só metadados); unlock requer a password.
 */

function operatorId(escolaCodigo, email) {
  return `${String(escolaCodigo || "").toLowerCase()}:${String(email || "").toLowerCase()}`;
}

/**
 * Provisiona (ou re-provisiona, se já existia) um operador a partir do
 * resultado de um login online bem-sucedido.
 *
 * @param {object} input
 * @param {string} input.password          Password em claro (usada para derivar a chave).
 * @param {string} input.escola_codigo     Código da escola usado no login.
 * @param {object} input.auth              { token, user, escola, plano?, limites?, tenantId? }
 */
export async function provisionOperator({ password, escola_codigo, auth }) {
  if (!password || !escola_codigo || !auth?.user?.email) {
    throw new Error("Dados insuficientes para provisionar operador.");
  }
  const id = operatorId(escola_codigo, auth.user.email);
  const { salt, iv, ciphertext } = await encryptJson(password, auth);
  const db = await getDb();
  await db.put(STORES.operators, {
    id,
    escola_codigo,
    email:    auth.user.email,
    nome:     auth.user.nome || auth.user.email,
    tipo:     auth.user.tipo || null,
    foto:     auth.user.foto || null,
    escola_nome: auth.escola?.nome || null,
    salt,
    iv,
    ciphertext,
    provisioned_at: Date.now(),
    last_used_at:   Date.now(),
  });
  return id;
}

/** Lista operadores provisionados (só metadados visíveis — sem auth). */
export async function listOperators() {
  const db = await getDb();
  const all = await db.getAll(STORES.operators);
  return all
    .map(({ salt, iv, ciphertext, ...meta }) => meta)
    .sort((a, b) => (b.last_used_at || 0) - (a.last_used_at || 0));
}

export async function hasOperators() {
  const db = await getDb();
  return (await db.count(STORES.operators)) > 0;
}

/**
 * Tenta desbloquear um operador. Se a password estiver correcta, devolve o
 * blob `auth` original. Caso contrário lança "Password incorrecta."
 * (Inferimos password errada pela falha da auth tag do GCM — não há hash
 * separado a comparar.)
 */
export async function unlockOperator(id, password) {
  const db = await getDb();
  const row = await db.get(STORES.operators, id);
  if (!row) throw new Error("Operador não encontrado neste dispositivo.");
  let auth;
  try {
    auth = await decryptJson(password, row.salt, row.iv, row.ciphertext);
  } catch {
    throw new Error("Password incorrecta.");
  }
  // Marcar último uso (best-effort).
  db.put(STORES.operators, { ...row, last_used_at: Date.now() }).catch(() => {});
  return auth;
}

export async function removeOperator(id) {
  const db = await getDb();
  await db.delete(STORES.operators, id);
}
