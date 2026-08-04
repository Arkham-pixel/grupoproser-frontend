import { useTranslation } from 'react-i18next';
import React, { useEffect, useMemo, useState } from 'react';
import Loader from '../Loader';
import {
  guardarProtocoloSiniestros,
  obtenerProtocoloSiniestros,
  restaurarProtocoloSiniestros,
} from '../../services/protocoloService.js';
import { obtenerHistorialProtocolo } from '../../services/alertasComplexService.js';
import {
  etiquetaLimite,
  nombreEtapaProtocoloUi,
  nombreSeguimientoProtocoloUi,
  descripcionSeguimientoProtocoloUi,
  obtenerProtocoloPorDefecto,
  PROTOCOLO_DOCUMENTO,
  PROTOCOLO_FECHA_ACTIVACION,
} from '../../config/protocoloSiniestrosDefaults.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
  complexSectionTitle,
  complexTableHead,
  complexTableSimple,
  complexTableWrap,
} from './complexFenixUi.js';
import {
  Campo,
  ComplexFilterSection,
  ComplexPageHeader,
  InputFenix,
  SelectFenix,
} from './ComplexUiBlocks.jsx';

function unidadesProtocolo(t) {
  return [
    { value: 'horas', label: t('complex.ui.protocolo_tiempos_complex.horas') },
    { value: 'dias', label: t('complex.ui.protocolo_tiempos_complex.dias_calendario') },
    { value: 'dias_habiles', label: t('complex.ui.protocolo_tiempos_complex.dias_habiles') },
    { value: 'mismo_dia', label: t('complex.ui.protocolo_tiempos_complex.mismo_dia_calendario') },
  ];
}

function actualizarEtapa(etapas, id, campo, valor) {
  return etapas.map((etapa) => {
    if (etapa.id !== id) return etapa;
    if (campo === 'limiteValor' || campo === 'limiteUnidad') {
      return {
        ...etapa,
        limite: {
          ...etapa.limite,
          valor: campo === 'limiteValor' ? Number(valor) : etapa.limite.valor,
          unidad: campo === 'limiteUnidad' ? valor : etapa.limite.unidad,
        },
      };
    }
    if (campo === 'maxValor' || campo === 'maxUnidad') {
      const limiteMaximo = etapa.limiteMaximo || { valor: 0, unidad: 'horas' };
      return {
        ...etapa,
        limiteMaximo: {
          ...limiteMaximo,
          valor: campo === 'maxValor' ? Number(valor) : limiteMaximo.valor,
          unidad: campo === 'maxUnidad' ? valor : limiteMaximo.unidad,
        },
      };
    }
    return { ...etapa, [campo]: valor };
  });
}

function actualizarSeguimiento(seguimientos, id, valor) {
  return seguimientos.map((seg) =>
    seg.id === id ? { ...seg, intervaloDias: Number(valor) } : seg
  );
}

const ProtocoloTiemposComplex = () => {
  const { t } = useTranslation();
  const UNIDADES = useMemo(() => unidadesProtocolo(t), [t]);
  const [protocolo, setProtocolo] = useState(obtenerProtocoloPorDefecto());
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const recargarHistorial = () =>
    obtenerHistorialProtocolo(15)
      .then(setHistorial)
      .catch(() => setHistorial([]));

  useEffect(() => {
    let activo = true;
    Promise.all([
      obtenerProtocoloSiniestros(true),
      obtenerHistorialProtocolo(15).catch(() => []),
    ])
      .then(([proto, hist]) => {
        if (!activo) return;
        setProtocolo(proto);
        setHistorial(hist);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      const guardado = await guardarProtocoloSiniestros(protocolo);
      setProtocolo(guardado);
      await recargarHistorial();
      setMensaje(t('complex.ui.protocolo_tiempos_complex.protocolo_guardado'));
    } catch (error) {
      setMensaje(error.message || t('complex.ui.protocolo_tiempos_complex.error_al_guardar'));
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = async () => {
    if (!window.confirm(t('complex.ui.protocolo_tiempos_complex.confirmar_restaurar'))) return;
    setGuardando(true);
    setMensaje('');
    try {
      const restaurado = await restaurarProtocoloSiniestros();
      setProtocolo(restaurado);
      await recargarHistorial();
      setMensaje(t('complex.ui.protocolo_tiempos_complex.protocolo_restaurado'));
    } catch (error) {
      setMensaje(error.message || t('complex.ui.protocolo_tiempos_complex.error_al_restaurar'));
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className={complexDashboardRoot}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={complexDashboardRoot}>
      <div className={`${complexScope} ${complexDashboardWrap}`}>
        <ComplexPageHeader
          badge="Complex · Protocolo"
          title={t("complex.ui.protocolo_tiempos_complex.protocolo_de_tiempos_y_alertas")}
          subtitle={`Reglamento: ${PROTOCOLO_DOCUMENTO}. Vigente para alertas desde ${PROTOCOLO_FECHA_ACTIVACION}.`}
          activePath="/complex/protocolo-tiempos"
        />

        <ComplexFilterSection title={t("complex.ui.protocolo_tiempos_complex.acciones")}>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? t('complex.ui.protocolo_tiempos_complex.guardando') : t('complex.ui.protocolo_tiempos_complex.guardar_cambios')}
            </button>
            <button
              type="button"
              onClick={restaurar}
              disabled={guardando}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
            >{t("complex.ui.protocolo_tiempos_complex.restaurar_valores_oficiales")}</button>
          </div>
          {mensaje && (
            <p className="mt-3 font-body text-sm text-gray-600 dark:text-gray-300">{mensaje}</p>
          )}
        </ComplexFilterSection>

        <section>
          <h2 className={complexSectionTitle}>{t("complex.ui.protocolo_tiempos_complex.hitos_con_plazo_fijo")}</h2>
          <div className={complexTableWrap}>
            <table className={`${complexTableSimple} min-w-[900px]`}>
              <thead>
                <tr className={complexTableHead}>
                  <th className="text-left">{t("complex.ui.protocolo_tiempos_complex.fase")}</th>
                  <th className="text-left">{t("complex.ui.protocolo_tiempos_complex.actividad")}</th>
                  <th className="text-left">{t("complex.ui.protocolo_tiempos_complex.referencia")}</th>
                  <th className="text-right">{t("complex.ui.protocolo_tiempos_complex.plazo")}</th>
                  <th className="text-left">{t("complex.ui.protocolo_tiempos_complex.unidad")}</th>
                  <th className="text-right">{t("complex.ui.protocolo_tiempos_complex.maximo_opc")}</th>
                </tr>
              </thead>
              <tbody>
                {protocolo.etapas.map((etapa) => (
                  <tr key={etapa.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-3 tabular-nums">{etapa.fase}</td>
                    <td className="px-3 py-3 font-medium">{nombreEtapaProtocoloUi(etapa, t)}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{etapa.referencia}</td>
                    <td className="px-3 py-3 text-right">
                      <InputFenix
                        type="number"
                        min={0}
                        step={etapa.limite?.unidad === 'horas' ? 1 : 0.5}
                        value={etapa.limite?.valor ?? 0}
                        onChange={(e) =>
                          setProtocolo((prev) => ({
                            ...prev,
                            etapas: actualizarEtapa(prev.etapas, etapa.id, 'limiteValor', e.target.value),
                          }))
                        }
                        className="w-24 text-right"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <SelectFenix
                        value={etapa.limite?.unidad || 'horas'}
                        onChange={(e) =>
                          setProtocolo((prev) => ({
                            ...prev,
                            etapas: actualizarEtapa(prev.etapas, etapa.id, 'limiteUnidad', e.target.value),
                          }))
                        }
                      >
                        {UNIDADES.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </SelectFenix>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-500">
                      {etapa.limiteMaximo ? (
                        <div className="flex items-center justify-end gap-2">
                          <InputFenix
                            type="number"
                            min={0}
                            value={etapa.limiteMaximo.valor}
                            onChange={(e) =>
                              setProtocolo((prev) => ({
                                ...prev,
                                etapas: actualizarEtapa(prev.etapas, etapa.id, 'maxValor', e.target.value),
                              }))
                            }
                            className="w-20 text-right"
                          />
                          <span className="text-xs">{t("complex.ui.protocolo_tiempos_complex.h")}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">{t("complex.ui.protocolo_tiempos_complex.vista_previa_contacto_inicial")}{etiquetaLimite(protocolo.etapas.find((e) => e.id === 'contactoInicial')?.limite, t)}{t("complex.ui.protocolo_tiempos_complex.informe_preliminar")}{etiquetaLimite(protocolo.etapas.find((e) => e.id === 'informePreliminar')?.limite, t)}{t("complex.ui.protocolo_tiempos_complex.desde_asignacion")}</p>
        </section>

        <section className="mt-8">
          <h2 className={complexSectionTitle}>{t("complex.ui.protocolo_tiempos_complex.seguimientos_recurrentes_alertas")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {protocolo.seguimientosRecurrentes.map((seg) => (
              <div
                key={seg.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]"
              >
                <p className="font-medium text-gray-900 dark:text-white">{nombreSeguimientoProtocoloUi(seg, t)}</p>
                <p className="mt-1 text-xs text-gray-500">{descripcionSeguimientoProtocoloUi(seg, t)}</p>
                <Campo label={t("complex.ui.protocolo_tiempos_complex.intervalo_dias_calendario")} className="mt-3">
                  <InputFenix
                    type="number"
                    min={1}
                    value={seg.intervaloDias}
                    onChange={(e) =>
                      setProtocolo((prev) => ({
                        ...prev,
                        seguimientosRecurrentes: actualizarSeguimiento(
                          prev.seguimientosRecurrentes,
                          seg.id,
                          e.target.value
                        ),
                      }))
                    }
                  />
                </Campo>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className={complexSectionTitle}>{t("complex.ui.protocolo_tiempos_complex.historial_de_cambios")}</h2>
          {historial.length === 0 ? (
            <p className="text-sm text-gray-500">{t("complex.ui.protocolo_tiempos_complex.aun_no_hay_cambios_registrados_en_el_protocolo")}</p>
          ) : (
            <div className={complexTableWrap}>
              <table className={`${complexTableSimple} min-w-[640px]`}>
                <thead>
                  <tr className={complexTableHead}>
                    <th className="text-left">{t("complex.ui.protocolo_tiempos_complex.fecha")}</th>
                    <th className="text-left">{t("complex.ui.protocolo_tiempos_complex.accion")}</th>
                    <th className="text-left">{t("complex.ui.protocolo_tiempos_complex.usuario")}</th>
                    <th className="text-left">{t("complex.ui.protocolo_tiempos_complex.resumen")}</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((entry) => (
                    <tr key={entry._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleString('es-CO')
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-sm capitalize">{entry.accion || '—'}</td>
                      <td className="px-3 py-2 text-sm">{entry.usuario || 'sistema'}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                        {entry.cambiosResumen || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
          <p className="font-semibold text-gray-800 dark:text-gray-100">{t("complex.ui.protocolo_tiempos_complex.matriz_oficial_del_protocolo_bandejas_de_trazabilidad")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_1_recepcion_asignacion_recibida_dia_0")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_2_cargue_en_arnald_12_h_asignacion_interna_del_ajus")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_3_contacto_inicial_12_h_desde_asignacion_al_ajustad")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_4_coordinacion_de_inspeccion_alerta_a_los_10_dias_h")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_5_inspeccion_ideal_24_h_maximo_72_h_desde_asignacio")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_6_solicitud_de_documentos_12_h_post_inspeccion")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_7_informe_preliminar_3_dias_habiles_desde_asignacio")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_8_seguimiento_documental_primer_aviso_a_10_dias_hab")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_9_acreditacion_fecha_del_ultimo_documento_fcharepoa")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_10_informe_final_3_dias_habiles_desde_acreditacion")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_11_autorizacion_de_cifras_seguimiento_10_dias_habil")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_12_presentacion_de_cifras_y_finiquitos_12_h_desde_a")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_13_seguimiento_para_pago_primer_aviso_a_10_dias_hab")}</li>
            <li>{t("complex.ui.protocolo_tiempos_complex.fase_14_envio_de_finiquito_alerta_a_los_10_dias_habiles_")}</li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">{t("complex.ui.protocolo_tiempos_complex.esperas_de_terceros_asegurado_compania_intermediario_pri")}</p>
        </section>
      </div>
    </div>
  );
};

export default ProtocoloTiemposComplex;
