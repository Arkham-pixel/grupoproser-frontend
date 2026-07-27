import React from 'react';
import { FaCheckCircle, FaFileAlt, FaPaperclip } from 'react-icons/fa';
import {
  complexBtnFormAction,
  complexBtnFormActionSaveHover,
  complexHint,
  complexInput,
  complexLabel,
  complexTextarea,
} from './complexFenixUi.js';
import {
  camposProtocoloFlujoVisita,
  etiquetaFaseFlujoVisita,
  faltanFechasFlujoVisitaParaCerrar,
  faltanFechasProtocoloRequeridas,
  faseFlujoVisita,
  politicaEntregaFlujoVisita,
  subtareaTieneActaVisita,
  urlArchivoSubtarea,
} from './subtareasComplexUtils.js';

/**
 * Flujo: Coordinación → Inspección/acta → (preliminar opcional | cerrar al ajustador).
 */
export default function FlujoVisitaCoordinacionPanel({
  subtarea,
  obs,
  setObs,
  fechasProtocolo,
  setFechasProtocolo,
  guardando,
  onGuardarAvance,
  onAvanzarFase,
  onCompletar,
  onSubirArchivo,
  onAbrirActa,
  onAbrirPreliminar,
  modoExterno = false,
}) {
  const fase = faseFlujoVisita(subtarea);
  const docs = (subtarea.archivos || []).filter(
    (a) => (a.tipoArchivo || 'documento') !== 'formato'
  );
  const formatos = (subtarea.archivos || []).filter((a) => a.tipoArchivo === 'formato');
  const tieneActa = subtareaTieneActaVisita(subtarea);
  const politicaEntrega = politicaEntregaFlujoVisita(subtarea);
  const camposFase = camposProtocoloFlujoVisita(fase);

  const avanzarAInspeccion = async () => {
    const faltantes = faltanFechasProtocoloRequeridas(
      'coordinacionInspeccion',
      fechasProtocolo
    );
    if (faltantes.length) {
      return onAvanzarFase(null, faltantes);
    }
    await onAvanzarFase('inspeccion');
  };

  const pasarADecidir = async () => {
    const faltantes = faltanFechasProtocoloRequeridas('inspeccion', fechasProtocolo);
    if (faltantes.length) {
      return onAvanzarFase(null, faltantes);
    }
    if (!tieneActa) {
      return onAvanzarFase(null, [
        'Suba el acta (físico) o genérela con el formato, y las fotos/datos de la visita',
      ]);
    }
    await onAvanzarFase('decidir');
  };

  const cerrarAlAjustador = async () => {
    const faltantes = faltanFechasFlujoVisitaParaCerrar(fechasProtocolo);
    if (faltantes.length) {
      return onCompletar(null, faltantes);
    }
    if (!tieneActa) {
      return onCompletar(null, [
        'Debe adjuntar acta y/o fotos de la visita antes de cerrar',
      ]);
    }
    if (politicaEntrega === 'exige_preliminar' && formatos.length === 0) {
      return onCompletar(null, [
        'Esta subtarea exige el informe preliminar antes de cerrar. Genérelo o súbalo como formato.',
      ]);
    }
    await onCompletar(true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
        <p className="font-semibold">
          Flujo de visita: {etiquetaFaseFlujoVisita(fase) || 'Coordinación'}
        </p>
        <p className="mt-1 text-xs opacity-90">
          Coordinación → inspección y acta →{' '}
          {politicaEntrega === 'exige_preliminar'
            ? 'debe completar el informe preliminar antes de cerrar.'
            : politicaEntrega === 'solo_acta'
              ? 'se entrega el acta y los soportes al ajustador.'
              : 'puede continuar con informe preliminar o cerrar para que el ajustador continúe.'}
        </p>
        <ol className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
          {['coordinacion', 'inspeccion', 'decidir'].map((f) => (
            <li
              key={f}
              className={`rounded-full border px-2 py-0.5 ${
                fase === f || (f === 'decidir' && fase === 'preliminar')
                  ? 'border-sky-500 bg-white text-sky-800'
                  : 'border-sky-100 text-sky-400'
              }`}
            >
              {etiquetaFaseFlujoVisita(f).replace(/^\d+\.\s*/, '')}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <label className={complexLabel}>
          {fase === 'coordinacion'
            ? 'Observaciones de la coordinación'
            : 'Observaciones / datos de la visita'}
        </label>
        <textarea
          className={complexTextarea}
          rows={4}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder={
            fase === 'coordinacion'
              ? 'Notas de la llamada / coordinación…'
              : 'Hallazgos, personas presentes, datos de la visita…'
          }
        />
      </div>

      {camposFase.length > 0 && (
        <div className="space-y-3">
          <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500">
            Fechas de protocolo
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {camposFase.map((c) => (
              <div key={c.campo}>
                <label className={complexLabel}>
                  {c.label}
                  {c.requerido ? ' *' : ''}
                </label>
                <input
                  type="date"
                  className={complexInput}
                  value={fechasProtocolo[c.campo] || ''}
                  onChange={(e) =>
                    setFechasProtocolo((prev) => ({
                      ...prev,
                      [c.campo]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {fase === 'coordinacion' && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={guardando}
            className={complexBtnFormAction}
            onClick={() => onGuardarAvance()}
          >
            Guardar avance
          </button>
          <button
            type="button"
            disabled={guardando}
            className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
            onClick={avanzarAInspeccion}
          >
            Continuar a inspección
          </button>
        </div>
      )}

      {(fase === 'inspeccion' || fase === 'decidir' || fase === 'preliminar') && (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {tieneActa
              ? 'Ya hay acta/documentos de visita cargados. Quedarán en la trazabilidad del caso (Inspección).'
              : 'Debe elaborar el acta (subir físico o generar con el formato) y cargar fotos / datos de la visita.'}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={onAbrirActa}
              title="Abre el Formulario de Ajuste en Acta de inspección"
            >
              Generar acta (formato)
            </button>
            <label className="cursor-pointer">
              <span className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}>
                Subir acta física
              </span>
              <input
                type="file"
                className="hidden"
                disabled={guardando}
                accept=".pdf,.doc,.docx,image/*"
                onChange={(e) => {
                  onSubirArchivo(e.target.files?.[0], 'documento');
                  e.target.value = '';
                }}
              />
            </label>
            <label className="cursor-pointer">
              <span className={complexBtnFormAction}>Subir fotos / datos visita</span>
              <input
                type="file"
                className="hidden"
                disabled={guardando}
                accept="image/*,.pdf,.doc,.docx,.zip"
                multiple={false}
                onChange={(e) => {
                  onSubirArchivo(e.target.files?.[0], 'documento');
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <p className={complexHint}>
            Puede subir varios archivos (acta, fotos, croquis, etc.). Cada uno se envía a
            la bandeja de Inspección del caso.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                <FaPaperclip /> Documentos / fotos
              </p>
              {docs.length === 0 ? (
                <p className={complexHint}>Sin archivos aún.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {docs.map((a, i) => (
                    <li key={a._id || i}>
                      {urlArchivoSubtarea(a) ? (
                        <a
                          href={urlArchivoSubtarea(a)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-fenix-primario hover:underline"
                        >
                          {a.nombre}
                        </a>
                      ) : (
                        a.nombre
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                <FaFileAlt /> Formatos generados
              </p>
              {formatos.length === 0 ? (
                <p className={complexHint}>Sin formatos aún.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {formatos.map((a, i) => (
                    <li key={a._id || i}>
                      {urlArchivoSubtarea(a) ? (
                        <a
                          href={urlArchivoSubtarea(a)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-fenix-primario hover:underline"
                        >
                          {a.nombre}
                        </a>
                      ) : (
                        a.nombre
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {fase === 'inspeccion' && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={guardando}
            className={complexBtnFormAction}
            onClick={() => onGuardarAvance()}
          >
            Guardar avance
          </button>
          <button
            type="button"
            disabled={guardando || !tieneActa}
            className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
            onClick={pasarADecidir}
          >
            Continuar (decidir entrega)
          </button>
        </div>
      )}

      {fase === 'decidir' && (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">
            ¿Qué sigue después del acta?
          </p>
          <p className="text-xs text-emerald-800">
            Puede elaborar el informe preliminar ahora, o cerrar la tarea para que el
            ajustador continúe con lo subido (acta, fotos y datos de la visita).
          </p>
          <div className="flex flex-wrap gap-2">
            {politicaEntrega !== 'solo_acta' && (
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={async () => {
                await onAvanzarFase('preliminar');
                onAbrirPreliminar?.();
              }}
            >
              Continuar con informe preliminar
            </button>
            )}
            {politicaEntrega !== 'exige_preliminar' && (
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={cerrarAlAjustador}
            >
              <FaCheckCircle className="mr-1.5 text-emerald-600" />
              Cerrar y entregar al ajustador
            </button>
            )}
          </div>
        </div>
      )}

      {fase === 'preliminar' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
            {politicaEntrega === 'exige_preliminar'
              ? 'Informe preliminar obligatorio. Genérelo en el formulario de ajuste o súbalo como formato antes de cerrar la tarea.'
              : 'Informe preliminar opcional. Genérelo en el formulario de ajuste o súbalo como formato; luego cierre la tarea.'}
            {modoExterno ? ' Use el enlace del formulario de ajuste.' : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={onAbrirPreliminar}
            >
              Abrir informe preliminar
            </button>
            <label className="cursor-pointer">
              <span className={complexBtnFormAction}>Subir formato preliminar</span>
              <input
                type="file"
                className="hidden"
                disabled={guardando}
                onChange={(e) => {
                  onSubirArchivo(e.target.files?.[0], 'formato');
                  e.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              disabled={guardando}
              className={complexBtnFormAction}
              onClick={() => onGuardarAvance()}
            >
              Guardar avance
            </button>
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={cerrarAlAjustador}
            >
              <FaCheckCircle className="mr-1.5 text-emerald-600" />
              Cerrar tarea
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
