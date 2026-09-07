// The door PIN is day+month (DDMM). Agents send it in every shape a human
// would: a number that lost its leading zero, "04/07", "4/7", a stray space or
// full stop, a word in front. Formatting is not a wrong code — only the digits
// are. Two digit groups are day and month, each padded; one group is the PIN,
// padded to four; anything longer passes through so the door can say why.
export function normalizeAuthCode(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const groups = String(raw).match(/\d+/g);
  if (!groups) return null;
  if (groups.length === 2) return groups.map((g) => g.padStart(2, '0')).join('');
  const digits = groups.join('');
  return digits.length < 4 ? digits.padStart(4, '0') : digits;
}
