/**
 * Utilitaires pour la gestion et le formatage des numéros de téléphone au Bénin (+229 01).
 * Standard officiel : +229 01 XX XX XX XX (10 chiffres locaux)
 */

export const BENIN_COUNTRY_CODE = '+229';
export const BENIN_DEFAULT_PREFIX = '01';
export const BENIN_FULL_PREFIX = '+22901';

/**
 * Normalise n'importe quelle saisie en numéro international complet Bénin (+22901XXXXXXXX ou +229XXXXXXXX).
 */
export function normalizeBeninPhone(input: string): string {
  if (!input) return '';
  // Supprime tous les espaces, tirets et parenthèses
  let clean = input.replace(/[\s\-\(\)\.]/g, '').trim();

  // Si commence déjà par +22901
  if (clean.startsWith('+22901')) {
    return clean;
  }
  // Si commence par +229
  if (clean.startsWith('+229')) {
    const afterCode = clean.slice(4);
    if (afterCode.startsWith('01')) {
      return `+229${afterCode}`;
    }
    return `+22901${afterCode}`;
  }
  // Si commence par 229
  if (clean.startsWith('229')) {
    const afterCode = clean.slice(3);
    if (afterCode.startsWith('01')) {
      return `+229${afterCode}`;
    }
    return `+22901${afterCode}`;
  }
  // Si commence par 01
  if (clean.startsWith('01')) {
    return `+229${clean}`;
  }
  // Si 8 chiffres bruts (ex: 97001122 ou 57774305)
  return `+22901${clean}`;
}

/**
 * Formate un numéro de téléphone pour l'affichage visuel lisible : +229 01 XX XX XX XX
 */
export function formatBeninPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const normalized = normalizeBeninPhone(phone);
  // Extrait les 8 derniers chiffres
  const digits = normalized.replace(/\D/g, '');
  // Format attendu: 22901XXXXXXXX (13 chiffres) ou 229XXXXXXXX (11 chiffres)
  if (digits.startsWith('22901') && digits.length === 13) {
    const sub = digits.slice(5); // 8 chiffres
    return `+229 01 ${sub.slice(0, 2)} ${sub.slice(2, 4)} ${sub.slice(4, 6)} ${sub.slice(6, 8)}`;
  }
  if (digits.startsWith('229') && digits.length === 11) {
    const sub = digits.slice(3);
    return `+229 ${sub.slice(0, 2)} ${sub.slice(2, 4)} ${sub.slice(4, 6)} ${sub.slice(6, 8)}`;
  }
  return normalized;
}

/**
 * Extrait les 8 chiffres locaux pour les champs avec badge fixe [+229 01]
 */
export function extractLocalDigits(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[\s\-\(\)\.]/g, '').trim();
  if (clean.startsWith('+22901')) clean = clean.slice(6);
  else if (clean.startsWith('+229')) clean = clean.slice(4);
  else if (clean.startsWith('22901')) clean = clean.slice(5);
  else if (clean.startsWith('229')) clean = clean.slice(3);
  else if (clean.startsWith('01')) clean = clean.slice(2);
  return clean;
}
