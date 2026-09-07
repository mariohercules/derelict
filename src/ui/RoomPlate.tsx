// A room's backdrop plate: the full 1672×941 render on desktop, the 960w
// derivative on phones. One place for the breakpoint, the candidates and the
// intrinsic size that reserves the layout box.
export function RoomPlate({ src, small }: { src: string; small: string }) {
  return (
    <picture aria-hidden="true">
      <source media="(max-width: 900px)" srcSet={`${small} 960w, ${src} 1672w`} sizes="100vw" />
      <img src={src} width="1672" height="941" alt="" decoding="async" />
    </picture>
  );
}
