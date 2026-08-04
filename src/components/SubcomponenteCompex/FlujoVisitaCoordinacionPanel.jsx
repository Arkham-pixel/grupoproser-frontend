import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
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
        t('complex.ui.flujo_visita_coordinacion_panel.suba_acta_fotos'),
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
        t('complex.ui.flujo_visita_coordinacion_panel.debe_adjuntar_acta'),
      ]);
    }
    if (politicaEntrega === 'exige_preliminar' && formatos.length === 0) {
      return onCompletar(null, [
        t('complex.ui.flujo_visita_coordinacion_panel.exige_preliminar'),
      ]);
    }
    await onCompletar(true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
        <p className="font-semibold">{t("complex.ui.flujo_visita_coordinacion_panel.flujo_de_visita")}{etiquetaFaseFlujoVisita(fase) || t('complex.ui.flujo_visita_coordinacion_panel.coordinacion')}
        </p>
        <p className="mt-1 text-xs opacity-90">{t("complex.ui.flujo_visita_coordinacion_panel.coordinacion_inspeccion_y_acta")}{' '}
          {politicaEntrega === 'exige_preliminar'
            ? t('complex.ui.flujo_visita_coordinacion_panel.debe_completar_preliminar')
            : politicaEntrega === 'solo_acta'
              ? t('complex.ui.flujo_visita_coordinacion_panel.entrega_acta_soportes')
              : t('complex.ui.flujo_visita_coordinacion_panel.puede_continuar_o_cerrar')}
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
            ? t('complex.ui.flujo_visita_coordinacion_panel.observaciones_coordinacion')
            : 'Observaciones / datos de la visita'}
        </label>
        <textarea
          className={complexTextarea}
          rows={4}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder={
            fase === 'coordinacion'
              ? t('complex.ui.flujo_visita_coordinacion_panel.notas_llamada')
              : 'Hallazgos, personas presentes, datos de la visita…'
          }
        />
      </div>

      {camposFase.length > 0 && (
        <div className="space-y-3">
          <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500">{t("complex.ui.flujo_visita_coordinacion_panel.fechas_de_protocolo")}</p>
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
          >{t("complex.ui.flujo_visita_coordinacion_panel.guardar_avance")}</button>
          <button
            type="button"
            disabled={guardando}
            className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
            onClick={avanzarAInspeccion}
          >{t("complex.ui.flujo_visita_coordinacion_panel.continuar_a_inspeccion")}</button>
        </div>
      )}

      {(fase === 'inspeccion' || fase === 'decidir' || fase === 'preliminar') && (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {tieneActa
              ? t('complex.ui.flujo_visita_coordinacion_panel.ya_hay_acta')
              : t('complex.ui.flujo_visita_coordinacion_panel.debe_elaborar_acta')}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={onAbrirActa}
              title={t("complex.ui.flujo_visita_coordinacion_panel.abre_el_formulario_de_ajuste_en_acta_de_inspeccion")}
            >{t("complex.ui.flujo_visita_coordinacion_panel.generar_acta_formato")}</button>
            <label className="cursor-pointer">
              <span className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}>{t("complex.ui.flujo_visita_coordinacion_panel.subir_acta_fisica")}</span>
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
              <span className={complexBtnFormAction}>{t("complex.ui.flujo_visita_coordinacion_panel.subir_fotos_datos_visita")}</span>
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
          <p className={complexHint}>{t("complex.ui.flujo_visita_coordinacion_panel.puede_subir_varios_archivos_acta_fotos_croquis_etc_cada_")}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
                <FaPaperclip />{t("complex.ui.flujo_visita_coordinacion_panel.documentos_fotos")}</p>
              {docs.length === 0 ? (
                <p className={complexHint}>{t("complex.ui.flujo_visita_coordinacion_panel.sin_archivos_aun")}</p>
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
                <FaFileAlt />{t("complex.ui.flujo_visita_coordinacion_panel.formatos_generados")}</p>
              {formatos.length === 0 ? (
                <p className={complexHint}>{t("complex.ui.flujo_visita_coordinacion_panel.sin_formatos_aun")}</p>
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
          >{t("complex.ui.flujo_visita_coordinacion_panel.guardar_avance")}</button>
          <button
            type="button"
            disabled={guardando || !tieneActa}
            className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
            onClick={pasarADecidir}
          >{t("complex.ui.flujo_visita_coordinacion_panel.continuar_decidir_entrega")}</button>
        </div>
      )}

      {fase === 'decidir' && (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">{t("complex.ui.flujo_visita_coordinacion_panel.que_sigue_despues_del_acta")}</p>
          <p className="text-xs text-emerald-800">{t("complex.ui.flujo_visita_coordinacion_panel.puede_elaborar_el_informe_preliminar_ahora_o_cerrar_la_t")}</p>
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
            >{t("complex.ui.flujo_visita_coordinacion_panel.continuar_con_informe_preliminar")}</button>
            )}
            {politicaEntrega !== 'exige_preliminar' && (
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={cerrarAlAjustador}
            >
              <FaCheckCircle className="mr-1.5 text-emerald-600" />{t("complex.ui.flujo_visita_coordinacion_panel.cerrar_y_entregar_al_ajustador")}</button>
            )}
          </div>
        </div>
      )}

      {fase === 'preliminar' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
            {politicaEntrega === 'exige_preliminar'
              ? t('complex.ui.flujo_visita_coordinacion_panel.preliminar_obligatorio')
              : t('complex.ui.flujo_visita_coordinacion_panel.preliminar_opcional')}
            {modoExterno ? ' Use el enlace del formulario de ajuste.' : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={onAbrirPreliminar}
            >{t("complex.ui.flujo_visita_coordinacion_panel.abrir_informe_preliminar")}</button>
            <label className="cursor-pointer">
              <span className={complexBtnFormAction}>{t("complex.ui.flujo_visita_coordinacion_panel.subir_formato_preliminar")}</span>
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
            >{t("complex.ui.flujo_visita_coordinacion_panel.guardar_avance")}</button>
            <button
              type="button"
              disabled={guardando}
              className={`${complexBtnFormAction} ${complexBtnFormActionSaveHover}`}
              onClick={cerrarAlAjustador}
            >
              <FaCheckCircle className="mr-1.5 text-emerald-600" />{t("complex.ui.flujo_visita_coordinacion_panel.cerrar_tarea")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
