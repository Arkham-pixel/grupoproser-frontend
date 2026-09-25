import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave, FaFileExcel } from 'react-icons/fa';
import {
  complexBtnPrimary,
  complexBtnSecondary,
  complexCard,
  complexInfoPanel,
  complexInput,
  complexLabel,
  complexTableWrap,
} from './complexFenixUi';
import { ComplexAvisoModal } from './ComplexUiBlocks';
import {
  aplicarPlantillaTipoLiquidador,
  buildCabeceraControlHoras,
  calcularTotalesControlHoras,
  crearControlHorasInicial,
  crearFilaVacia,
  formatearFechaDisplay,
  formatearMoneda,
  normalizarControlHorasParaGuardar,
  resolverEmailAnalistaAseguradora,
  totalFila,
} from './controlHoras/controlHorasUtils';
import {
  TIPOS_LIQUIDADOR_CONTROL_HORAS,
  TIPO_ITEM_EXTRA,
  esFilaFijaControlHoras,
  limitarHorasCampoLiquidador,
  minimoHorasCampoLiquidador,
  normalizarTipoLiquidadorControlHoras,
} from './controlHoras/catalogoControlHoras';
import { generarControlHorasExcel, descargarBlob } from './controlHoras/generarControlHorasExcel';
import { resolverTarifaHora } from './controlHoras/tarifasHoraAseguradoras';

export default function ControlHorasEditor({
  abierto,
  onCerrar,
  formData,
  nombreAseguradora,
  controlHorasGuardado,
  onGuardar,
  tarifaBloqueada = false,
}) {
  const [datos, setDatos] = useState(null);
  const [mensajeTarifa, setMensajeTarifa] = useState('');
  const [edicionManualValorHora, setEdicionManualValorHora] = useState(false);
  const [emailAnalista, setEmailAnalista] = useState('');
  const [aviso, setAviso] = useState({ open: false, titulo: '', mensaje: '', tipo: 'warning' });

  const mostrarAviso = (mensaje, titulo = t('complex.ui.control_horas_editor.atencion'), tipo = 'warning') => {
    setAviso({ open: true, titulo, mensaje, tipo });
  };

  const cerrarAviso = () => setAviso((prev) => ({ ...prev, open: false }));

  const nombreAseguradoraResuelto =
    nombreAseguradora || formData.nombreCliente || formData.codiAsgrdra || '';

  const argsTarifa = {
    codiAsgrdra: formData.codiAsgrdra,
    nombreAseguradora: nombreAseguradoraResuelto,
    nombreCliente: formData.nombreCliente,
    fchaAsgncion: formData.fchaAsgncion,
    reserva: formData.reserva,
    formData,
    caso: {
      ...formData,
      control_horas: controlHorasGuardado || formData.control_horas || datos || null,
    },
  };

  useEffect(() => {
    if (!abierto) return;
    const inicial = crearControlHorasInicial(formData, nombreAseguradoraResuelto, controlHorasGuardado);
    setMensajeTarifa(inicial._mensajeTarifa || '');
    const { _mensajeTarifa, ...resto } = inicial;
    if (tarifaBloqueada) {
      const tarifa = resolverTarifaHora({
        ...argsTarifa,
        nombreAseguradora: nombreAseguradoraResuelto || 'SURA',
        nombreCliente: formData.nombreCliente || 'SURA',
      });
      resto.valor_hora = tarifa.valorHora ?? 187400;
      resto.valor_hora_origen = 'tarifa';
      setMensajeTarifa(tarifa.mensaje || inicial._mensajeTarifa || '');
    }
    setDatos(resto);
    setEdicionManualValorHora(tarifaBloqueada ? false : resto.valor_hora_origen !== 'tarifa');
    setEmailAnalista(resolverEmailAnalistaAseguradora(formData));
  }, [abierto, formData, nombreAseguradoraResuelto, controlHorasGuardado, tarifaBloqueada]);

  const cabecera = useMemo(
    () =>
      buildCabeceraControlHoras(
        {
          ...formData,
          emailFuncionarioAseguradora: emailAnalista || formData.emailFuncionarioAseguradora,
        },
        nombreAseguradora
      ),
    [formData, nombreAseguradora, emailAnalista]
  );

  const totales = useMemo(
    () => (datos ? calcularTotalesControlHoras(datos) : null),
    [datos]
  );

  if (!abierto || !datos) return null;

  const valorHoraPorTarifa =
    tarifaBloqueada || (datos.valor_hora_origen === 'tarifa' && !edicionManualValorHora);
  const tarifaCatalogo = resolverTarifaHora(argsTarifa);
  const esTarifaPrevisora = tarifaCatalogo.tarifaId === 'PREVISORA';
  const esTarifaSura = tarifaCatalogo.tarifaId === 'SURA';
  const topeHorasPrevisora = esTarifaPrevisora ? Number(tarifaCatalogo.maxHoras) || 12.5 : null;
  const topeHonorariosSura = esTarifaSura ? Number(tarifaCatalogo.maxHonorarios) || null : null;
  const puedeRestaurarTarifa = tarifaCatalogo.origen === 'tarifa';

  const actualizarCampo = (campo, valor) => {
    setDatos((prev) => {
      const next = { ...prev, [campo]: valor };
      if (campo === 'valor_hora') {
        next.valor_hora_origen = 'manual';
      }
      return next;
    });
    if (campo === 'valor_hora') {
      setEdicionManualValorHora(true);
    }
  };

  const actualizarFila = (id, campo, valor) => {
    let excedeTope = false;
    setDatos((prev) => {
      const filas = prev.filas.map((f) => {
        if (f.id !== id) return f;
        if (esFilaFijaControlHoras(f) && (campo === 'descripcion' || String(campo).startsWith('horas_'))) {
          return f;
        }
        const siguiente = String(campo).startsWith('horas_')
          ? limitarHorasCampoLiquidador(f, campo, valor)
          : valor;
        return { ...f, [campo]: siguiente };
      });
      const next = { ...prev, filas };
      if (String(campo).startsWith('horas_')) {
        const calc = calcularTotalesControlHoras(next);
        if (
          topeHorasPrevisora &&
          !prev.horas_extra_autorizadas &&
          calc.total_horas > topeHorasPrevisora + 0.001
        ) {
          excedeTope = true;
          return prev;
        }
        // SURA: el tope es orientativo; traslados largos (p. ej. 8 h) pueden superar el monto.
      }
      return next;
    });
    if (excedeTope) {
      mostrarAviso(
        t('complex.ui.control_horas_editor.tope_horas_previsora', {
          max: topeHorasPrevisora,
        }),
        t('complex.ui.control_horas_editor.tarifa_previsora'),
        'warning'
      );
    }
  };

  const agregarFila = () => {
    const responsable = formData.nombreResponsable || formData.responsable || '';
    setDatos((prev) => ({
      ...prev,
      filas: [
        ...prev.filas,
        crearFilaVacia({
          nombre_funcionario: responsable,
          cargo: t('complex.ui.control_horas_editor.ajustador'),
          tipo_item: TIPO_ITEM_EXTRA,
          fijo: false,
        }),
      ],
    }));
  };

  const cambiarTipoLiquidador = (tipoNuevo) => {
    const tipo = normalizarTipoLiquidadorControlHoras(tipoNuevo);
    setDatos((prev) => {
      if (normalizarTipoLiquidadorControlHoras(prev.tipo_liquidador) === tipo) return prev;
      return {
        ...prev,
        tipo_liquidador: tipo,
        filas: aplicarPlantillaTipoLiquidador(prev.filas, tipo, formData),
      };
    });
  };

  const eliminarFila = (id) => {
    const fila = datos.filas.find((f) => f.id === id);
    if (fila && esFilaFijaControlHoras(fila)) {
      mostrarAviso(
        t('complex.ui.control_horas_editor.no_eliminar_fija'),
        t('complex.ui.control_horas_editor.actividad_fija'),
        'warning'
      );
      return;
    }
    if (datos.filas.length <= 1) {
      mostrarAviso(t('complex.ui.control_horas_editor.debe_conservar_fila'), t('complex.ui.control_horas_editor.no_se_puede_eliminar'), 'warning');
      return;
    }
    setDatos((prev) => ({
      ...prev,
      filas: prev.filas.filter((f) => f.id !== id),
    }));
  };

  const reaplicarTarifa = () => {
    const tarifa = resolverTarifaHora(argsTarifa);
    setMensajeTarifa(tarifa.mensaje);
    setEdicionManualValorHora(tarifa.origen !== 'tarifa');
    setDatos((prev) => ({
      ...prev,
      valor_hora: tarifa.valorHora ?? prev.valor_hora,
      valor_hora_origen: tarifa.origen,
    }));
  };

  const validar = () => {
    if (!datos.filas.length) {
      mostrarAviso(t('complex.ui.control_horas_editor.agregue_actividad'), t('complex.ui.control_horas_editor.control_incompleto'), 'warning');
      return false;
    }
    if (totales.total_horas <= 0) {
      mostrarAviso(t('complex.ui.control_horas_editor.registre_una_hora'), t('complex.ui.control_horas_editor.control_incompleto'), 'warning');
      return false;
    }
    if (!datos.valor_hora && datos.valor_hora !== 0) {
      mostrarAviso(t('complex.ui.control_horas_editor.ingrese_valor_hora'), t('complex.ui.control_horas_editor.control_incompleto'), 'warning');
      return false;
    }

    const filasSinFecha = datos.filas.filter((fila) => {
      const tieneHoras = totalFila(fila) > 0;
      const tieneDescripcion = String(fila.descripcion || '').trim() !== '';
      if (!tieneHoras && !tieneDescripcion) return false;
      return !String(fila.fecha || '').trim();
    });
    if (filasSinFecha.length > 0) {
      mostrarAviso(
        t('complex.ui.control_horas_editor.complete_fechas'),
        t('complex.ui.control_horas_editor.fechas_pendientes'),
        'warning'
      );
      return false;
    }

    const filasSinDescripcion = datos.filas.filter((fila) => {
      const tieneHoras = totalFila(fila) > 0;
      if (!tieneHoras) return false;
      return !String(fila.descripcion || '').trim();
    });
    if (filasSinDescripcion.length > 0) {
      mostrarAviso(
        t('complex.ui.control_horas_editor.complete_descripcion'),
        t('complex.ui.control_horas_editor.descripcion_pendiente'),
        'warning'
      );
      return false;
    }

    if (!cabecera.analista) {
      mostrarAviso(
        t('complex.ui.control_horas_editor.asigne_analista'),
        t('complex.ui.control_horas_editor.analista_pendiente'),
        'warning'
      );
      return false;
    }

    const emailLimpio = String(emailAnalista || '').trim();
    if (!emailLimpio || !emailLimpio.includes('@')) {
      mostrarAviso(
        t('complex.ui.control_horas_editor.correo_analista_obligatorio'),
        t('complex.ui.control_horas_editor.correo_del_analista'),
        'warning'
      );
      return false;
    }

    if (
      topeHorasPrevisora &&
      !datos.horas_extra_autorizadas &&
      totales.total_horas > topeHorasPrevisora + 0.001
    ) {
      mostrarAviso(
        t('complex.ui.control_horas_editor.tope_horas_previsora', {
          max: topeHorasPrevisora,
        }),
        t('complex.ui.control_horas_editor.tarifa_previsora'),
        'warning'
      );
      return false;
    }

    // Cancelado SURA ($0): no se factura. El resto puede superar el tope sin freno.
    if (
      topeHonorariosSura != null &&
      topeHonorariosSura <= 0 &&
      totales.subtotal_honorarios > 0.5
    ) {
      mostrarAviso(
        'Este caso es Cancelado SURA / sin cobro. No se pueden guardar honorarios.',
        'Tope honorarios SURA',
        'warning'
      );
      return false;
    }

    return true;
  };

  const handleGuardar = () => {
    if (!validar()) return;
    const normalizado = normalizarControlHorasParaGuardar(datos);
    const emailLimpio = String(emailAnalista || '').trim();
    onGuardar(normalizado, totales, { emailAnalista: emailLimpio });
    onCerrar();
  };

  const handleExportar = async () => {
    if (!validar()) return;
    try {
      const { blob, nombre } = await generarControlHorasExcel({
        formData: {
          ...formData,
          emailFuncionarioAseguradora: String(emailAnalista || '').trim(),
        },
        controlHoras: datos,
        nombreAseguradora,
      });
      descargarBlob(blob, nombre);
    } catch (e) {
      console.error(e);
      mostrarAviso(t('complex.ui.control_horas_editor.no_generar_excel'), t('complex.ui.control_horas_editor.error'), 'error');
    }
  };

  const inputHorasClass = `${complexInput} max-w-[5.5rem] text-center`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#1A1A1A]">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">{t("complex.ui.control_horas_editor.control_de_horas_del_caso")}</h2>
            <p className="font-body text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.control_horas_editor.referencia")}{cabecera.referencia || '—'}{t("complex.ui.control_horas_editor.un_registro_por_caso_editable")}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-fenix-primario dark:hover:bg-gray-800"
            aria-label={t("complex.ui.control_horas_editor.cerrar")}
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-base">
          {/* Cabecera readonly */}
          <div className={complexCard}>
            <h3 className="mb-3 font-heading text-base font-bold text-gray-800 dark:text-white">{t("complex.ui.control_horas_editor.datos_del_caso_datos_generales")}</h3>
            <div className="grid gap-2 text-base sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Firma', cabecera.firma],
                [t('complex.ui.control_horas_editor.compania'), cabecera.compania],
                ['Asegurado', cabecera.asegurado],
                [t('complex.ui.control_horas_editor.siniestro'), cabecera.siniestro],
                ['Riesgo', cabecera.riesgo],
                ['Lugar', cabecera.lugar],
                [t('complex.ui.control_horas_editor.analista_compania'), cabecera.analista],
                [t('complex.ui.control_horas_editor.ajustador_proser'), cabecera.ajustador],
                [t('complex.ui.control_horas_editor.f_siniestro'), formatearFechaDisplay(cabecera.fechaSiniestro)],
                [t('complex.ui.control_horas_editor.f_asignacion'), formatearFechaDisplay(cabecera.fechaAsignacion)],
                [t('complex.ui.control_horas_editor.f_inspeccion'), formatearFechaDisplay(cabecera.fechaInspeccion)],
                ['Referencia', cabecera.referencia],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-gray-50/80 px-3 py-2 dark:bg-gray-900/40">
                  <span className="block text-sm font-semibold text-gray-500 dark:text-gray-400">{k}</span>
                  <span className="text-gray-800 dark:text-gray-200">{v || '—'}</span>
                </div>
              ))}
              <div className="rounded-lg bg-gray-50/80 px-3 py-2 dark:bg-gray-900/40 sm:col-span-2 lg:col-span-1">
                <label className="mb-1 block text-sm font-semibold text-gray-500 dark:text-gray-400">{t("complex.ui.control_horas_editor.correo_analista")}</label>
                <input
                  type="email"
                  className={complexInput}
                  value={emailAnalista}
                  onChange={(e) => setEmailAnalista(e.target.value)}
                  placeholder={t("complex.ui.control_horas_editor.correo_aseguradora_com")}
                  autoComplete="email"
                />
                <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">{t("complex.ui.control_horas_editor.si_falta_en_el_catalogo_escribalo_aqui_se_guardara_en_la")}</p>
              </div>
            </div>
            {!cabecera.analista && (
              <p className="mt-2 font-body text-sm text-amber-700 dark:text-amber-400">{t("complex.ui.control_horas_editor.no_hay_analista_de_compania_en_datos_generales_asignelo_")}</p>
            )}
          </div>

          {/* Liquidación */}
          <div className={complexCard}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h3 className="font-heading text-base font-bold text-gray-800 dark:text-white">{t("complex.ui.control_horas_editor.liquidacion")}</h3>
              <div className="flex flex-wrap gap-2">
                {valorHoraPorTarifa && !tarifaBloqueada && (
                  <button
                    type="button"
                    onClick={() => setEdicionManualValorHora(true)}
                    className={complexBtnSecondary}
                  >{t("complex.ui.control_horas_editor.editar_valor_manualmente")}</button>
                )}
                {edicionManualValorHora && puedeRestaurarTarifa && (
                  <button type="button" onClick={reaplicarTarifa} className={complexBtnSecondary}>{t("complex.ui.control_horas_editor.usar_tarifa_de_aseguradora")}</button>
                )}
              </div>
            </div>
            {mensajeTarifa && (
              <div className={`${complexInfoPanel} mb-3`}>
                <p className="font-body text-base text-gray-700 dark:text-gray-300">{mensajeTarifa}</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={complexLabel}>{t("complex.ui.control_horas_editor.valor_hora")}{valorHoraPorTarifa && (
                    <span className="ml-2 font-normal text-fenix-primario">{t("complex.ui.control_horas_editor.tarifa_automatica")}</span>
                  )}
                </label>
                {valorHoraPorTarifa ? (
                  <div
                    className={`${complexInput} cursor-default bg-gray-50 font-semibold text-gray-900 dark:bg-gray-900/60 dark:text-white`}
                    aria-readonly
                  >
                    {formatearMoneda(datos.valor_hora)}
                  </div>
                ) : (
                  <input
                    type="number"
                    className={complexInput}
                    value={datos.valor_hora}
                    onChange={(e) => actualizarCampo('valor_hora', e.target.value)}
                    min="0"
                    step="1000"
                    placeholder={
                      tarifaCatalogo.origen === 'manual'
                        ? t('complex.ui.control_horas_editor.ingrese_valor_hora')
                        : t('complex.ui.control_horas_editor.sin_tarifa_catalogo')
                    }
                  />
                )}
                {valorHoraPorTarifa && (
                  <p className="mt-1 font-body text-sm text-gray-500">{t("complex.ui.control_horas_editor.segun_tarifa_de")}{nombreAseguradoraResuelto || t('complex.ui.control_horas_editor.la_aseguradora')}{t("complex.ui.control_horas_editor.texto")}</p>
                )}
              </div>
              <div>
                <label className={complexLabel}>{t("complex.ui.control_horas_editor.gastos")}</label>
                <input
                  type="number"
                  className={complexInput}
                  value={datos.gastos}
                  onChange={(e) => actualizarCampo('gastos', e.target.value)}
                  min="0"
                  step="1000"
                />
              </div>
              <div className="rounded-lg bg-red-50/50 px-3 py-2 dark:bg-red-950/20">
                <span className="text-sm text-gray-500">{t("complex.ui.control_horas_editor.total_horas")}</span>
                <p className="font-heading text-xl font-bold text-fenix-primario">
                  {totales?.total_horas?.toFixed(2) ?? '0.00'}
                  {esTarifaPrevisora && topeHorasPrevisora ? ` / ${topeHorasPrevisora}` : ''}
                </p>
              </div>
              <div className="rounded-lg bg-red-50/50 px-3 py-2 dark:bg-red-950/20">
                <span className="text-sm text-gray-500">{t("complex.ui.control_horas_editor.total_facturable")}</span>
                <p className="font-heading text-xl font-bold text-gray-900 dark:text-white">
                  {formatearMoneda(totales?.total)}
                </p>
                {esTarifaSura && topeHonorariosSura != null && topeHonorariosSura > 0 ? (
                  <p className="mt-0.5 font-body text-xs text-gray-500">
                    Referencia SURA {formatearMoneda(topeHonorariosSura)}
                    {tarifaCatalogo.honorariosSugeridos
                      ? ` · sugerido ${formatearMoneda(tarifaCatalogo.honorariosSugeridos)}`
                      : ''}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="mt-2 font-body text-sm text-gray-500">{t("complex.ui.control_horas_editor.subtotal_honorarios")}{formatearMoneda(totales?.subtotal_honorarios)}
            </p>
            {esTarifaPrevisora && (
              <div className="mt-3 space-y-2">
                <p className="font-body text-sm text-gray-700 dark:text-gray-300">
                  {t('complex.ui.control_horas_editor.horas_usadas_previsora', {
                    usadas: (totales?.total_horas ?? 0).toFixed(2),
                    max: topeHorasPrevisora,
                  })}
                </p>
                <label className="flex items-start gap-2 font-body text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(datos.horas_extra_autorizadas)}
                    onChange={(e) =>
                      setDatos((prev) => ({
                        ...prev,
                        horas_extra_autorizadas: e.target.checked,
                      }))
                    }
                  />
                  <span>{t('complex.ui.control_horas_editor.horas_extra_gerencia')}</span>
                </label>
              </div>
            )}
          </div>

          {/* Tabla actividades */}
          <div className={complexCard}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-heading text-base font-bold text-gray-800 dark:text-white">{t("complex.ui.control_horas_editor.relacion_del_tiempo_empleado")}</h3>
                <label className={`${complexLabel} mt-2`}>
                  {t('complex.ui.control_horas_editor.tipo_liquidador')}
                </label>
                <select
                  className={`${complexInput} mt-1 max-w-xs`}
                  value={normalizarTipoLiquidadorControlHoras(datos.tipo_liquidador)}
                  onChange={(e) => cambiarTipoLiquidador(e.target.value)}
                >
                  {TIPOS_LIQUIDADOR_CONTROL_HORAS.map((op) => (
                    <option key={op.id} value={op.id}>
                      {t(`complex.ui.control_horas_editor.tipo_${op.id}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={agregarFila} className={complexBtnSecondary}>
                <FaPlus />{t("complex.ui.control_horas_editor.agregar_actividad")}</button>
            </div>
            <p className="mb-2 font-body text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.control_horas_editor.fecha_y_descripcion_son_obligatorias_en_cada_actividad_c")}</p>
            <p className="mb-3 font-body text-sm text-amber-800 dark:text-amber-300">
              {t('complex.ui.control_horas_editor.nota_items_fijos')}
            </p>
            <div className={complexTableWrap}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-base">
                  <thead>
                    <tr className="bg-gray-50 text-sm uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <th className="px-2 py-2">{t("complex.ui.control_horas_editor.fecha")}</th>
                      <th className="min-w-[180px] px-2 py-2">{t("complex.ui.control_horas_editor.descripcion")}</th>
                      <th className="px-2 py-2">{t("complex.ui.control_horas_editor.funcionario")}</th>
                      <th className="px-2 py-2">{t("complex.ui.control_horas_editor.cargo")}</th>
                      <th className="px-2 py-2">{t("complex.ui.control_horas_editor.viaje")}</th>
                      <th className="px-2 py-2">{t("complex.ui.control_horas_editor.campo")}</th>
                      <th className="px-2 py-2">{t("complex.ui.control_horas_editor.oficina")}</th>
                      <th className="px-2 py-2">{t("complex.ui.control_horas_editor.secr")}</th>
                      <th className="px-2 py-2">{t("complex.ui.control_horas_editor.total")}</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {datos.filas.map((fila) => {
                      const esFija = esFilaFijaControlHoras(fila);
                      const esExtra = fila.tipo_item === TIPO_ITEM_EXTRA && !esFija;
                      const filaClass = esFija
                        ? 'border-t border-amber-200 bg-yellow-100 dark:border-yellow-900/40 dark:bg-yellow-950/40'
                        : esExtra
                          ? 'border-t border-gray-100 dark:border-gray-800'
                          : 'border-t border-sky-100 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/30';
                      const inputBloqueado = `${complexInput} cursor-default bg-yellow-50/80 dark:bg-yellow-950/20`;
                      return (
                      <tr key={fila.id} className={filaClass}>
                        <td className="px-1 py-1">
                          <input
                            type="date"
                            className={complexInput}
                            value={fila.fecha || ''}
                            onChange={(e) => actualizarFila(fila.id, 'fecha', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <textarea
                            className={`${esFija ? inputBloqueado : complexInput} min-h-[2.5rem]`}
                            rows={2}
                            value={fila.descripcion}
                            readOnly={esFija}
                            onChange={(e) => actualizarFila(fila.id, 'descripcion', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={complexInput}
                            value={fila.nombre_funcionario}
                            onChange={(e) => actualizarFila(fila.id, 'nombre_funcionario', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={complexInput}
                            value={fila.cargo}
                            onChange={(e) => actualizarFila(fila.id, 'cargo', e.target.value)}
                          />
                        </td>
                        {['horas_viaje', 'horas_campo', 'horas_oficina', 'horas_secretaria'].map((campo) => {
                          const minHoras = esFija ? 0 : minimoHorasCampoLiquidador(fila, campo);
                          return (
                          <td key={campo} className="px-1 py-1">
                            <input
                              type="number"
                              min={minHoras}
                              step="0.25"
                              className={esFija ? `${inputHorasClass} cursor-default bg-yellow-50/80 dark:bg-yellow-950/20` : inputHorasClass}
                              value={fila[campo]}
                              readOnly={esFija}
                              onChange={(e) => actualizarFila(fila.id, campo, e.target.value)}
                            />
                          </td>
                          );
                        })}
                        <td className="px-2 py-1 font-semibold text-fenix-primario">
                          {totalFila(fila).toFixed(2)}
                        </td>
                        <td className="px-1 py-1">
                          {!esFija && (
                            <button
                              type="button"
                              onClick={() => eliminarFila(fila.id)}
                              className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title={t("complex.ui.control_horas_editor.eliminar_fila")}
                            >
                              <FaTrash />
                            </button>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold dark:border-gray-700 dark:bg-gray-900/50">
                      <td colSpan={4} className="px-2 py-2">{t("complex.ui.control_horas_editor.total_2")}</td>
                      <td className="px-2 py-2">{totales?.viaje?.toFixed(2)}</td>
                      <td className="px-2 py-2">{totales?.campo?.toFixed(2)}</td>
                      <td className="px-2 py-2">{totales?.oficina?.toFixed(2)}</td>
                      <td className="px-2 py-2">{totales?.secretaria?.toFixed(2)}</td>
                      <td className="px-2 py-2 text-fenix-primario">{totales?.total_horas?.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-3 font-body text-sm text-gray-600 dark:text-gray-300">
              {t('complex.ui.control_horas_editor.nota_agregar_items')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <button type="button" onClick={onCerrar} className={complexBtnSecondary}>{t("complex.ui.control_horas_editor.cancelar")}</button>
          <button type="button" onClick={handleExportar} className={complexBtnSecondary}>
            <FaFileExcel className="text-green-700" />{t("complex.ui.control_horas_editor.descargar_excel")}</button>
          <button type="button" onClick={handleGuardar} className={complexBtnPrimary}>
            <FaSave />{t("complex.ui.control_horas_editor.guardar_control_de_horas")}</button>
        </div>
      </div>

      <ComplexAvisoModal
        open={aviso.open}
        onClose={cerrarAviso}
        titulo={aviso.titulo}
        mensaje={aviso.mensaje}
        tipo={aviso.tipo}
        botonTexto="Entendido"
        zIndexClass="z-[120]"
      />
    </div>
  );
}
