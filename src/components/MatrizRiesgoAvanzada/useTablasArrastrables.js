import { useEffect } from 'react';

const SELECTOR_TABLAS =
  '.tabla-valoracion-container, .tabla-container, .tabla-formulario-container, .tabla-resumen-mapa-scroll';

function enlazarArrastre(el) {
  if (el.dataset.arrastreListo === '1') return () => {};
  el.dataset.arrastreListo = '1';
  el.classList.add('reporte-tabla-arrastrable');

  let activo = false;
  let inicioX = 0;
  let scrollInicial = 0;

  const alPresionar = (evento) => {
    if (evento.button !== 0) return;
    if (evento.target.closest('button, a')) return;
    activo = true;
    inicioX = evento.pageX;
    scrollInicial = el.scrollLeft;
    el.classList.add('is-dragging');
    evento.preventDefault();
  };

  const alSoltar = () => {
    activo = false;
    el.classList.remove('is-dragging');
  };

  const alMover = (evento) => {
    if (!activo) return;
    evento.preventDefault();
    el.scrollLeft = scrollInicial - (evento.pageX - inicioX);
  };

  el.addEventListener('mousedown', alPresionar);
  window.addEventListener('mouseup', alSoltar);
  el.addEventListener('mouseleave', alSoltar);
  el.addEventListener('mousemove', alMover);

  return () => {
    delete el.dataset.arrastreListo;
    el.removeEventListener('mousedown', alPresionar);
    window.removeEventListener('mouseup', alSoltar);
    el.removeEventListener('mouseleave', alSoltar);
    el.removeEventListener('mousemove', alMover);
    el.classList.remove('reporte-tabla-arrastrable', 'is-dragging');
  };
}

function enlazarTodasLasTablas(root) {
  if (!root) return [];
  const limpiar = [];
  root.querySelectorAll(SELECTOR_TABLAS).forEach((el) => {
    const off = enlazarArrastre(el);
    if (off) limpiar.push(off);
  });
  return limpiar;
}

/** Permite desplazar tablas anchas arrastrando con el mouse (como Excel). */
export function useTablasArrastrables(contenedorRef) {
  useEffect(() => {
    const root = contenedorRef.current;
    if (!root) return undefined;

    let limpiar = enlazarTodasLasTablas(root);

    const observer = new MutationObserver(() => {
      limpiar.forEach((fn) => fn());
      limpiar = enlazarTodasLasTablas(root);
    });

    observer.observe(root, { childList: true, subtree: true });

    const t1 = setTimeout(() => {
      limpiar.forEach((fn) => fn());
      limpiar = enlazarTodasLasTablas(root);
    }, 800);

    const t2 = setTimeout(() => {
      limpiar.forEach((fn) => fn());
      limpiar = enlazarTodasLasTablas(root);
    }, 2000);

    return () => {
      observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      limpiar.forEach((fn) => fn());
    };
  }, [contenedorRef]);
}
