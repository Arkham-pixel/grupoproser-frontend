import fabIcon from './asistenteArnaldFabIcon.png';

/**
 * Icono exacto del mock «ANIMACIÓN DEL ASISTENTE»
 * (nube con punta de chat + A Arnald), extraído sin fondo de presentación.
 */
export default function AsistenteArnaldFabIcon({ className = '' }) {
  return (
    <img
      className={className}
      src={fabIcon}
      alt=""
      width={56}
      height={56}
      draggable={false}
      decoding="async"
    />
  );
}
