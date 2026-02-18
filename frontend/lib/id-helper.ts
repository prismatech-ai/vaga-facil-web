/**
 * Utilitários para normalizar e gerenciar IDs anonimos de candidatos
 */

/**
 * Normaliza ID anonimo para o formato CAND-XXXXXXXX
 * @param id - ID anonimo em qualquer formato (número, string, uuid)
 * @returns ID no formato CAND-XXXXXXXX ou string original
 */
export function normalizeAnonymousId(id: string | number | undefined): string {
  if (!id) return '';
  
  const idStr = String(id);
  
  // Já está no formato correto
  if (idStr.startsWith('CAND-')) {
    return idStr;
  }
  
  // É um número, converter para formato CAND-XXXXXXXX
  if (/^\d+$/.test(idStr)) {
    const numId = parseInt(idStr);
    return `CAND-${numId.toString().padStart(8, '0').toUpperCase()}`;
  }
  
  // É uma hash/uuid (32 caracteres hex ou uuid format), retornar como está
  if (idStr.length > 20 && (idStr.match(/^[0-9a-f]+$/i) || idStr.includes('-'))) {
    // Se é um hash longo, tomar os primeiros 8 caracteres
    return `CAND-${idStr.substring(0, 8).toUpperCase()}`;
  }
  
  // Qualquer outro formato
  return idStr;
}

/**
 * Extrai o ID numérico de um ID anonimo
 * @param id - ID anonimo (ex: CAND-00000123)
 * @returns ID numérico ou null se não encontrar
 */
export function extractNumericId(id: string | number | undefined): number | null {
  if (!id) return null;
  
  const idStr = String(id);
  const match = idStr.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Prepara o ID para usar em chamadas de API
 * Tenta usar ID numérico primeiro (mais eficiente)
 * Se não tiver, usa ID anonimo
 * @param candidato - Objeto do candidato com id e/ou id_anonimo
 * @returns ID para usar na API
 */
export function prepareIdForApi(candidato: any): string | number {
  // Se tem ID numérico, use ele (é mais eficiente)
  if (candidato?.id && typeof candidato.id === 'number') {
    return candidato.id;
  }
  
  // Se tem ID anonimo, tente extrair numérico
  if (candidato?.id_anonimo) {
    const numId = extractNumericId(candidato.id_anonimo);
    if (numId) return numId;
    return candidato.id_anonimo;
  }
  
  // Fallback
  return candidato?.id || '';
}

/**
 * Valida se um ID anonimo é válido
 * @param id - ID anonimo a validar
 * @returns true se for um ID válido
 */
export function isValidAnonymousId(id: string | number | undefined): boolean {
  if (!id) return false;
  
  const idStr = String(id);
  
  // Formato CAND-XXXXXXXX
  if (idStr.match(/^CAND-[0-9A-F]{8}$/i)) {
    return true;
  }
  
  // Número puro
  if (/^\d+$/.test(idStr)) {
    return true;
  }
  
  // Hash/UUID longo
  if (idStr.length >= 20) {
    return true;
  }
  
  return false;
}

/**
 * Gera um ID anonimo formatado a partir de um ID numérico
 * Útil para testes e desenvolvimento
 * @param numericId - ID numérico
 * @returns ID anonimo formatado (CAND-XXXXXXXX)
 */
export function generateAnonymousId(numericId: number): string {
  return `CAND-${numericId.toString().padStart(8, '0').toUpperCase()}`;
}

/**
 * Compara dois IDs anonimos (ignora formato)
 * @param id1 - Primeiro ID
 * @param id2 - Segundo ID
 * @returns true se os IDs representam o mesmo candidato
 */
export function isSameAnonymousId(id1: string | number | undefined, id2: string | number | undefined): boolean {
  if (!id1 || !id2) return false;
  
  // Tenta comparar numericamente primeiro
  const num1 = extractNumericId(String(id1));
  const num2 = extractNumericId(String(id2));
  
  if (num1 && num2) {
    return num1 === num2;
  }
  
  // Se não conseguir extrair números, compara as strings
  return String(id1).toUpperCase() === String(id2).toUpperCase();
}
