// Jump the reader to a station: focus it without the focus scroll, then bring
// it into view at the top. Used by every room's station index.
export function inspect(id: string): void {
  const target = document.getElementById(id);
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'start' });
}
