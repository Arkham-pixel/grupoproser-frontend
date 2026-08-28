/**
 * Evita que un presupuesto NSR-10 ya digitado se reemplace por filas vacías
 * al cambiar de pestaña, remount o guardado.
 */

function textoItem(it = {}) {
  return String(
    it?.actividad ||
      it?.componente ||
      it?.capitulo ||
      it?.concepto ||
      it?.item ||
      it?.descripcion ||
      ''
  ).trim();
}

export function contarItemsPresupuestoNsr(liquidador) {
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (!Array.isArray(items)) return 0;
  return items.filter((it) => textoItem(it)).length;
}

export function contarItemsContenidosNsr(liquidador) {
  const items = liquidador?.evaluacionSismicaNSR10?.contenidos?.items;
  if (!Array.isArray(items)) return 0;
  return items.filter((it) =>
    String(it?.articulo || it?.categoria || it?.descripcion || '').trim()
  ).length;
}

export function contarItemsDetalleCat(liquidador) {
  const items = liquidador?.detalleLiquidacionCat;
  if (!Array.isArray(items)) return 0;
  return items.filter((it) => textoItem(it)).length;
}

function scoreCotizacionPdf(liquidador) {
  const c = liquidador?.cotizacionPdf;
  if (!c || typeof c !== 'object') return 0;
  const paginas = Array.isArray(c.paginas)
    ? c.paginas.filter((p) => p?.ruta || p?._id || p?.preview || p?.file).length
    : 0;
  const monto = String(c.montoFinal ?? '').replace(/[^\d]/g, '');
  return paginas + (monto.length ? 2 : 0);
}

export function contarOtrosAmparosAlfa(liquidador) {
  const items = liquidador?.otrosAmparos;
  if (!Array.isArray(items)) return 0;
  return items.filter((it) => {
    if (it?.aplica === false) return false;
    const v = it?.valor;
    if (v == null || v === '' || v === 0) return false;
    return String(v).replace(/[^\d]/g, '').length > 0;
  }).length;
}

export function scoreContenidoLiquidadorNsr(liquidador) {
  if (!liquidador || typeof liquidador !== 'object') return 0;
  return (
    contarItemsPresupuestoNsr(liquidador) +
    contarItemsContenidosNsr(liquidador) +
    contarItemsDetalleCat(liquidador) +
    contarOtrosAmparosAlfa(liquidador) +
    scoreCotizacionPdf(liquidador)
  );
}

/**
 * Si lo propuesto viene vacío y lo actual tiene ítems, conserva el actual entero
 * o al menos presupuesto / contenidos / detalle CAT.
 */
export function fusionarLiquidadorSinPerderPresupuestoNsr(propuesto, actual) {
  if (!propuesto || typeof propuesto !== 'object') return actual || propuesto;
  if (!actual || typeof actual !== 'object') return propuesto;

  const scoreNew = scoreContenidoLiquidadorNsr(propuesto);
  const scoreOld = scoreContenidoLiquidadorNsr(actual);

  // Cascarón vacío no pisa liquidador con datos
  if (scoreOld > 0 && scoreNew === 0) return actual;

  const evalNew = propuesto.evaluacionSismicaNSR10 || {};
  const evalOld = actual.evaluacionSismicaNSR10 || {};
  let evalOut = evalNew;
  let protegio = false;

  if (contarItemsPresupuestoNsr(actual) > contarItemsPresupuestoNsr(propuesto) && evalOld.presupuesto) {
    evalOut = { ...evalOut, presupuesto: evalOld.presupuesto };
    protegio = true;
  }
  if (contarItemsContenidosNsr(actual) > contarItemsContenidosNsr(propuesto) && evalOld.contenidos) {
    evalOut = { ...evalOut, contenidos: evalOld.contenidos };
    protegio = true;
  }

  let next = protegio
    ? { ...propuesto, evaluacionSismicaNSR10: evalOut }
    : { ...propuesto };

  if (
    contarItemsDetalleCat(actual) > contarItemsDetalleCat(propuesto) &&
    Array.isArray(actual.detalleLiquidacionCat)
  ) {
    next = { ...next, detalleLiquidacionCat: actual.detalleLiquidacionCat };
  }

  if (
    contarOtrosAmparosAlfa(actual) > contarOtrosAmparosAlfa(next) &&
    Array.isArray(actual.otrosAmparos)
  ) {
    next = { ...next, otrosAmparos: actual.otrosAmparos };
  }

  if (actual.cotizacionPdf && !next.cotizacionPdf) {
    next = { ...next, cotizacionPdf: actual.cotizacionPdf };
  }

  if (scoreOld >= scoreNew) {
    if (actual.liquidacionCatastrofico && !next.liquidacionCatastrofico) {
      next.liquidacionCatastrofico = actual.liquidacionCatastrofico;
    }
    if (actual.encabezado && (!next.encabezado || !Object.keys(next.encabezado).length)) {
      next.encabezado = actual.encabezado;
    }
    if (actual.firmaCliente && !next.firmaCliente) next.firmaCliente = actual.firmaCliente;
    if (actual.datosBancarios && !next.datosBancarios) next.datosBancarios = actual.datosBancarios;
    if (actual.observaciones && !next.observaciones) next.observaciones = actual.observaciones;
  }

  return next;
}

/** Elige el liquidador con más ítems reales (nunca prefiera vacío sobre lleno). */
export function preferirLiquidadorMasRico(a, b) {
  const sa = scoreContenidoLiquidadorNsr(a);
  const sb = scoreContenidoLiquidadorNsr(b);
  if (sa === 0 && sb === 0) return a || b || null;
  if (sa >= sb) return fusionarLiquidadorSinPerderPresupuestoNsr(a, b);
  return fusionarLiquidadorSinPerderPresupuestoNsr(b, a);
}

/**
 * Persistencia: si lo de pantalla tiene contenido, se guarda TAL CUAL
 * (no reinyectar la copia inicial). Solo se conserva el existente ante cascarón vacío.
 */
export function liquidadorParaPersistir(entrante, existente) {
  if (entrante === undefined) return existente ?? null;
  if (!entrante || typeof entrante !== 'object') {
    return scoreContenidoLiquidadorNsr(existente) > 0 ? existente : null;
  }
  if (scoreContenidoLiquidadorNsr(entrante) > 0) return entrante;
  if (scoreContenidoLiquidadorNsr(existente) > 0) return existente;
  return entrante;
}
