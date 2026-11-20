// Initials for the user menu button (R47): from the part of the email before the @,
// split at . _ - and +, the first letters of the first two pieces, in capitals.
export function initials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const pieces = local.split(/[._+-]+/).filter(Boolean);
  return pieces
    .slice(0, 2)
    .map((piece) => piece[0].toUpperCase())
    .join('');
}
