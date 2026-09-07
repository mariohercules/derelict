import cryo from '../assets/opening-cryo.webp';
import cryoSmall from '../assets/opening-cryo-small.webp';

// Shared plate keeps the menu and thaw in the same physical compartment.
// The bitmap contains no writing; every readable control is real HTML.
export function OpeningBackdrop() {
  return <div className="opening-visual" aria-hidden="true">
    <picture>
      <source media="(max-width: 700px)" srcSet={`${cryoSmall} 960w, ${cryo} 1672w`} sizes="100vw" />
      <img className="opening-image" src={cryo} alt="" width="1672" height="941" fetchPriority="high" />
    </picture>
    <div className="opening-shade" />
    <div className="opening-vapor"><i /><i /></div>
    <div className="opening-lamplight" />
  </div>;
}
