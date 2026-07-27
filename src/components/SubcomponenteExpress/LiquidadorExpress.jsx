import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCalculator,
  FaClipboardCheck,
  FaFileExcel,
  FaFileWord,
  FaPlus,
  FaRecycle,
  FaSave,
  FaTrash,
} from 'react-icons/fa';
import {
  Campo,
  expressBtnGhost,
  expressBtnPrimary,
  InputFenix,
  SelectFenix,
  TextareaFenix,
} from './ExpressUiBlocks.jsx';
import {
  expressCard,
  expressCardBody,
  expressFormSection,
  expressSectionTitle,
  expressTableHead,
  expressTableWrap,
} from './expressFenixUi.js';
import { useExpressCatalogos } from './expressHelpers.js';
import {
  ANIOS_SMMLV,
  anioDesdeFecha,
  buildContratoReembolsoPreview,
  buildContratoTransaccionPreview,
  buildReciboPreview,
  calcularLiquidacion,
  conceptosAItemsAnalisis,
  DEFAULT_LIQUIDADOR_EXPRESS,
  DOCUMENTOS_SOPORTE,
  formatearMonto,
  liquidadorConNombreAjustador,
  mapCasoExpressALiquidador,
  aplicaFormatoSalvamento,
  NOTAS_SALVAMENTO,
  normalizarEstadoDocumento,
  normalizarListaEstadosDocumentos,
  OPCIONES_APLICA,
  pctDocumentosMarcados,
  resolverSmmlvPorAnio,
  SMMLV_POR_ANIO,
  totalesItemsAnalisis,
  valorSmdlvDesdeSmmlv,
} from './liquidadorExpressHelpers.js';
import { descargarReciboIndemnizacionWord } from './generarReciboIndemnizacionWord.js';
import { descargarContratoReembolsoWord } from './generarContratoReembolsoWord.js';
import { descargarContratoTransaccionWord } from './generarContratoTransaccionWord.js';
import {
  descargarChecklistExpressWord,
  descargarSalvamentoExpressWord,
} from './generarFormatosExpressWord.js';
import { descargarLiquidadorExpressExcel } from './generarLiquidadorExpressExcel.js';

const TABS_BASE = [
  { id: 'liquidacion', label: 'Liquidación', icon: FaCalculator },
  { id: 'checklist', label: 'Check-list', icon: FaClipboardCheck },
  { id: 'salvamento', label: 'Salvamento', icon: FaRecycle },
];

const grid2 = 'grid grid-cols-1 gap-4 sm:grid-cols-2';
const grid3 = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(tab.id)}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-body text-sm font-semibold transition ${
        active
          ? 'bg-fenix-primario text-white shadow-sm'
          : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
      }`}
    >
      <Icon className="text-sm" />
      {tab.label}
    </button>
  );
}

function SelectAplica({ value, onChange }) {
  return (
    <SelectFenix value={value} onChange={onChange}>
      {OPCIONES_APLICA.map((op) => (
        <option key={op} value={op}>{op}</option>
      ))}
    </SelectFenix>
  );
}

function SelectSiNo({ value, onChange }) {
  return (
    <SelectFenix value={value || 'NO'} onChange={onChange}>
      <option value="SI">Sí</option>
      <option value="NO">No</option>
    </SelectFenix>
  );
}

function FilaInfo({ label, children, destacado = false }) {
  return (
    <div className={`grid grid-cols-1 gap-1 border-b border-gray-100 py-2 sm:grid-cols-[minmax(180px,35%)_1fr] dark:border-gray-800 ${destacado ? 'bg-sky-50/80 dark:bg-sky-950/20' : ''}`}>
      <span className="font-body text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      <div>{children}</div>
    </div>
  );
}
function FilaTotal({ label, valor, destacado = false }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${
        destacado
          ? 'bg-emerald-50 font-bold text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'bg-gray-50 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200'
      }`}
    >
      <span className="font-body text-sm">{label}</span>
      <span className="font-accent text-sm">$ {formatearMonto(valor)}</span>
    </div>
  );
}

export default function LiquidadorExpress({
  casoExpress = null,
  valorInicial = null,
  onTotalIndemnizarChange,
  onLiquidar,
  onEstadoChange,
  onGuardarEnCaso,
  guardandoCaso = false,
  tieneLiquidadorGuardado = false,
  casoId = null,
  compact = false,
}) {
  const { obtenerNombreResponsable } = useExpressCatalogos();
  const [tab, setTab] = useState('liquidacion');
  const [liquidador, setLiquidador] = useState(() => {
    const base = casoExpress
      ? mapCasoExpressALiquidador(casoExpress, { obtenerNombreResponsable })
      : { ...DEFAULT_LIQUIDADOR_EXPRESS, conceptos: [], checklist: { ...DEFAULT_LIQUIDADOR_EXPRESS.checklist, itemsAnalisis: [] } };
    if (valorInicial && !(base.conceptos || []).length) {
      base.conceptos = [
        {
          id: Date.now(),
          concepto: 'Pérdida ajustada',
          detalle: 'Importado del caso Express',
          valor: String(valorInicial),
        },
      ];
    }
    return base;
  });
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(null); // 'recibo' | 'reembolso' | 'transaccion'
  const [descargandoWord, setDescargandoWord] = useState(false);
  const [errorWord, setErrorWord] = useState('');

  // Si el caso llega después (GET) con liquidador guardado, hidratar una vez.
  useEffect(() => {
    if (!casoExpress?.liquidador || typeof casoExpress.liquidador !== 'object') return;
    const conceptosGuardados = casoExpress.liquidador.conceptos;
    const tieneDatos =
      (Array.isArray(conceptosGuardados) && conceptosGuardados.length > 0) ||
      Boolean(casoExpress.liquidador.encabezado?.reclamo) ||
      Boolean(casoExpress.liquidador.checklist?.descripcionEvento);
    if (!tieneDatos) return;

    const conceptosActuales = liquidador?.conceptos || [];
    if (conceptosActuales.length > 0) return;

    setLiquidador(mapCasoExpressALiquidador(casoExpress, { obtenerNombreResponsable }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo hidratar al llegar liquidador vacío→lleno
  }, [casoExpress, obtenerNombreResponsable]);

  const liquidadorParaExport = useMemo(
    () => liquidadorConNombreAjustador(liquidador, obtenerNombreResponsable, casoExpress?.responsable),
    [liquidador, obtenerNombreResponsable, casoExpress?.responsable]
  );
  const nombreAjustador = liquidadorParaExport.checklist?.ajustador || '—';

  const totales = useMemo(() => calcularLiquidacion(liquidador), [liquidador]);
  const recibo = useMemo(
    () => buildReciboPreview(liquidador, totales),
    [liquidador, totales]
  );
  const previewReembolso = useMemo(
    () => buildContratoReembolsoPreview(liquidadorParaExport, totales),
    [liquidadorParaExport, totales]
  );
  const previewTransaccion = useMemo(
    () => buildContratoTransaccionPreview(liquidadorParaExport, totales),
    [liquidadorParaExport, totales]
  );
  const pctDocs = pctDocumentosMarcados(liquidador.checklist?.documentos);
  const totalesAnalisis = useMemo(
    () => totalesItemsAnalisis(liquidador.checklist?.itemsAnalisis),
    [liquidador.checklist?.itemsAnalisis]
  );

  const salvamentoActivo = aplicaFormatoSalvamento(liquidador, casoExpress);
  const tabsVisibles = useMemo(
    () => (salvamentoActivo ? TABS_BASE : TABS_BASE.filter((t) => t.id !== 'salvamento')),
    [salvamentoActivo]
  );

  useEffect(() => {
    if (!salvamentoActivo && tab === 'salvamento') {
      setTab('liquidacion');
    }
  }, [salvamentoActivo, tab]);

  useEffect(() => {
    onTotalIndemnizarChange?.(totales.totalIndemnizar);
    onEstadoChange?.(liquidadorParaExport, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callbacks de padre; evitamos bucles
  }, [liquidador, totales, liquidadorParaExport]);

  const actualizar = (path, valor) => {
    setLiquidador((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let ref = next;
      for (let i = 0; i < keys.length - 1; i += 1) {
        ref[keys[i]] = { ...ref[keys[i]] };
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = valor;

      // Al cambiar fecha de siniestro, alinear SMMLV/SMDLV al año del siniestro
      if (path === 'encabezado.fechaSiniestro') {
        const anio = anioDesdeFecha(valor);
        if (anio) {
          const smmlv = resolverSmmlvPorAnio(anio);
          next.deducible = {
            ...next.deducible,
            anioSMMLV: smmlv.anio,
            valorSMMLV: smmlv.valor,
            valorSMDLV: valorSmdlvDesdeSmmlv(smmlv.valor),
          };
        }
      }
      return next;
    });
  };

  const actualizarAnioSmmlv = (anio) => {
    const smmlv = resolverSmmlvPorAnio(anio);
    setLiquidador((prev) => ({
      ...prev,
      deducible: {
        ...prev.deducible,
        anioSMMLV: smmlv.anio,
        valorSMMLV: smmlv.valor,
        valorSMDLV: valorSmdlvDesdeSmmlv(smmlv.valor),
      },
    }));
  };

  const agregarConcepto = () => {
    setLiquidador((prev) => ({
      ...prev,
      conceptos: [
        ...(prev.conceptos || []),
        { id: Date.now(), concepto: '', detalle: '', valor: '' },
      ],
    }));
  };

  const actualizarConcepto = (id, campo, valor) => {
    setLiquidador((prev) => ({
      ...prev,
      conceptos: (prev.conceptos || []).map((item) =>
        item.id === id ? { ...item, [campo]: valor } : item
      ),
    }));
  };

  const eliminarConcepto = (id) => {
    setLiquidador((prev) => ({
      ...prev,
      conceptos: (prev.conceptos || []).filter((item) => item.id !== id),
    }));
  };

  const agregarItemAnalisis = () => {
    setLiquidador((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        itemsAnalisis: [
          ...(prev.checklist?.itemsAnalisis || []),
          {
            id: Date.now(),
            descripcion: '',
            reclamado: '',
            ajustado: '',
            observacion: '',
          },
        ],
      },
    }));
  };

  const handleLiquidar = () => {
    onTotalIndemnizarChange?.(totales.totalIndemnizar);
    setErrorWord('');
    setMostrarVistaPrevia('recibo');
    onLiquidar?.({ liquidador, totales, recibo: buildReciboPreview(liquidador, totales) });
  };

  const abrirVistaPreviaReembolso = () => {
    setErrorWord('');
    setMostrarVistaPrevia('reembolso');
  };

  const abrirVistaPreviaTransaccion = () => {
    setErrorWord('');
    setMostrarVistaPrevia('transaccion');
  };

  const cerrarVistaPrevia = () => {
    if (descargandoWord) return;
    setMostrarVistaPrevia(null);
  };

  const handleDescargarWord = async () => {
    setDescargandoWord(true);
    setErrorWord('');
    try {
      await descargarReciboIndemnizacionWord(liquidador, totales);
    } catch (err) {
      console.error('Error al generar recibo Word:', err);
      setErrorWord('No se pudo generar el documento Word. Intente de nuevo.');
    } finally {
      setDescargandoWord(false);
    }
  };

  const handleDescargarContratoReembolso = async () => {
    setDescargandoWord(true);
    setErrorWord('');
    try {
      await descargarContratoReembolsoWord(liquidadorParaExport, totales);
    } catch (err) {
      console.error('Error al generar contrato reembolso Word:', err);
      setErrorWord('No se pudo generar el contrato de reembolso Word.');
    } finally {
      setDescargandoWord(false);
    }
  };

  const handleDescargarContratoTransaccion = async () => {
    setDescargandoWord(true);
    setErrorWord('');
    try {
      await descargarContratoTransaccionWord(liquidadorParaExport, totales);
    } catch (err) {
      console.error('Error al generar contrato transacción Word:', err);
      setErrorWord('No se pudo generar el contrato de transacción Word.');
    } finally {
      setDescargandoWord(false);
    }
  };

  const handleDescargarChecklist = async () => {
    setDescargandoWord(true);
    setErrorWord('');
    try {
      await descargarChecklistExpressWord(liquidadorParaExport, totales);
    } catch (err) {
      console.error('Error al generar checklist Word:', err);
      setErrorWord('No se pudo generar el check-list Word.');
    } finally {
      setDescargandoWord(false);
    }
  };

  const handleDescargarSalvamento = async () => {
    if (!aplicaFormatoSalvamento(liquidador, casoExpress)) {
      setErrorWord('Salvamento no aplica en este caso: no se genera el formato SALVAMENTO.');
      return;
    }
    setDescargandoWord(true);
    setErrorWord('');
    try {
      await descargarSalvamentoExpressWord(liquidadorParaExport);
    } catch (err) {
      console.error('Error al generar salvamento Word:', err);
      setErrorWord('No se pudo generar el formato de salvamento Word.');
    } finally {
      setDescargandoWord(false);
    }
  };

  const handleDescargarExcel = async () => {
    setDescargandoWord(true);
    setErrorWord('');
    try {
      await descargarLiquidadorExpressExcel(liquidadorParaExport, totales, {
        incluirSalvamento: aplicaFormatoSalvamento(liquidador, casoExpress),
      });
    } catch (err) {
      console.error('Error al generar Excel del liquidador:', err);
      setErrorWord('No se pudo generar el archivo Excel del liquidador.');
    } finally {
      setDescargandoWord(false);
    }
  };

  const sincronizarAnalisisDesdeConceptos = () => {
    const items = conceptosAItemsAnalisis(liquidador.conceptos || []);
    actualizar('checklist.itemsAnalisis', items);
  };

  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const sal = liquidador.salvamento || {};
  const ded = liquidador.deducible || {};

  return (
    <div className="space-y-5">
      {errorWord && !mostrarVistaPrevia && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {errorWord}
        </p>
      )}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabsVisibles.map((t) => (
              <TabButton key={t.id} tab={t} active={tab === t.id} onClick={setTab} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {onGuardarEnCaso && (
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={() => onGuardarEnCaso(liquidadorParaExport, totales)}
                disabled={guardandoCaso || descargandoWord}
              >
                <FaSave />
                {guardandoCaso
                  ? 'Guardando…'
                  : tieneLiquidadorGuardado
                    ? 'Actualizar en caso'
                    : 'Guardar en caso'}
              </button>
            )}
            <button
              type="button"
              className={expressBtnGhost}
              onClick={handleDescargarExcel}
              disabled={descargandoWord || guardandoCaso}
            >
              <FaFileExcel />
              {descargandoWord
                ? 'Generando…'
                : salvamentoActivo
                  ? 'Descargar Excel (3 hojas)'
                  : 'Descargar Excel (2 hojas)'}
            </button>
          </div>
        </div>
      )}
      {casoId && tieneLiquidadorGuardado && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 font-body text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
          Este caso ya tiene liquidador guardado. Al actualizar se reemplazan Excel y Word en documentos del caso y se sincroniza el valor a indemnizar.
        </p>
      )}

      {tab === 'liquidacion' && (
        <div className="space-y-5">
          <section className={expressFormSection}>
            <h3 className={expressSectionTitle}>Información del reclamo</h3>
            <div className={grid2}>
              <Campo label="Reclamo / Siniestro">
                <InputFenix
                  value={enc.reclamo}
                  onChange={(e) => actualizar('encabezado.reclamo', e.target.value)}
                />
              </Campo>
              <Campo label="ZC / Workflow">
                <InputFenix
                  value={enc.zc}
                  onChange={(e) => actualizar('encabezado.zc', e.target.value)}
                />
              </Campo>
              <Campo label="Asegurado">
                <InputFenix
                  value={enc.asegurado}
                  onChange={(e) => actualizar('encabezado.asegurado', e.target.value)}
                />
              </Campo>
              <Campo label="NIT / CC">
                <InputFenix
                  value={enc.nit}
                  onChange={(e) => actualizar('encabezado.nit', e.target.value)}
                />
              </Campo>
              <Campo label="Póliza">
                <InputFenix
                  value={enc.poliza}
                  onChange={(e) => actualizar('encabezado.poliza', e.target.value)}
                />
              </Campo>
              <Campo label="Fecha siniestro">
                <InputFenix
                  type="date"
                  value={enc.fechaSiniestro}
                  onChange={(e) => actualizar('encabezado.fechaSiniestro', e.target.value)}
                />
              </Campo>
              <Campo label="Cobertura">
                <InputFenix
                  value={enc.cobertura}
                  onChange={(e) => actualizar('encabezado.cobertura', e.target.value)}
                />
              </Campo>
              <Campo label="Deducible (texto póliza)">
                <InputFenix
                  value={enc.deducibleTexto}
                  onChange={(e) => actualizar('encabezado.deducibleTexto', e.target.value)}
                  placeholder="Ej: 10% del valor de la pérdida, mínimo 4 SMMLV"
                />
              </Campo>
            </div>
          </section>

          <section className={expressFormSection}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className={`${expressSectionTitle} mb-0`}>Conceptos de pérdida</h3>
              <button type="button" onClick={agregarConcepto} className={expressBtnGhost}>
                <FaPlus /> Agregar concepto
              </button>
            </div>
            <div className={expressTableWrap}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className={expressTableHead}>
                    <tr>
                      <th className="px-3 py-2">Concepto</th>
                      <th className="px-3 py-2">Detalle</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(liquidador.conceptos || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">
                          Sin conceptos. Agregue filas para calcular la liquidación.
                        </td>
                      </tr>
                    ) : (
                      liquidador.conceptos.map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-2">
                            <InputFenix
                              value={item.concepto}
                              onChange={(e) => actualizarConcepto(item.id, 'concepto', e.target.value)}
                              placeholder="Concepto"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <TextareaFenix
                              value={item.detalle}
                              onChange={(e) => actualizarConcepto(item.id, 'detalle', e.target.value)}
                              rows={2}
                              placeholder="Detalle"
                            />
                          </td>
                          <td className="px-2 py-2 min-w-[140px]">
                            <InputFenix
                              value={item.valor}
                              onChange={(e) => actualizarConcepto(item.id, 'valor', e.target.value)}
                              placeholder="$ 0"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarConcepto(item.id)}
                              className="rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              aria-label="Eliminar"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={expressFormSection}>
            <h3 className={expressSectionTitle}>Deducible</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={
                  (ded.tipoMinimo || 'SMMLV') === 'SMMLV'
                    ? expressBtnPrimary
                    : expressBtnGhost
                }
                onClick={() => actualizar('deducible.tipoMinimo', 'SMMLV')}
              >
                Mínimo SMMLV (mensual)
              </button>
              <button
                type="button"
                className={
                  ded.tipoMinimo === 'SMDLV' ? expressBtnPrimary : expressBtnGhost
                }
                onClick={() => actualizar('deducible.tipoMinimo', 'SMDLV')}
              >
                Mínimo SMDLV (diario)
              </button>
            </div>
            <div className={grid3}>
              <Campo label="Porcentaje (%)">
                <InputFenix
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={ded.porcentaje ?? 10}
                  onChange={(e) => actualizar('deducible.porcentaje', e.target.value === '' ? '' : parseFloat(e.target.value))}
                />
              </Campo>
              <Campo label="Año salario mínimo">
                <SelectFenix
                  value={ded.anioSMMLV ?? totales.anioSMMLV ?? ANIOS_SMMLV[0]}
                  onChange={(e) => actualizarAnioSmmlv(e.target.value)}
                >
                  {ANIOS_SMMLV.map((anio) => (
                    <option key={anio} value={anio}>
                      {anio} — SMMLV $ {formatearMonto(SMMLV_POR_ANIO[anio])}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              {(ded.tipoMinimo || 'SMMLV') === 'SMMLV' ? (
                <>
                  <Campo label="Cantidad SMMLV">
                    <InputFenix
                      type="number"
                      min="0"
                      step="1"
                      value={ded.cantidadSMMLV ?? 4}
                      onChange={(e) => actualizar('deducible.cantidadSMMLV', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    />
                  </Campo>
                  <Campo label="Valor SMMLV (mensual)">
                    <InputFenix
                      value={ded.valorSMMLV ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLiquidador((prev) => ({
                          ...prev,
                          deducible: {
                            ...prev.deducible,
                            valorSMMLV: v,
                            valorSMDLV: valorSmdlvDesdeSmmlv(v),
                          },
                        }));
                      }}
                      placeholder="$ 1.750.905"
                      title="Se actualiza al elegir el año; puede ajustarlo manualmente"
                    />
                  </Campo>
                </>
              ) : (
                <>
                  <Campo label="Cantidad SMDLV">
                    <InputFenix
                      type="number"
                      min="0"
                      step="1"
                      value={ded.cantidadSMDLV ?? 10}
                      onChange={(e) => actualizar('deducible.cantidadSMDLV', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    />
                  </Campo>
                  <Campo label="Valor SMDLV (diario)">
                    <InputFenix
                      value={ded.valorSMDLV ?? valorSmdlvDesdeSmmlv(ded.valorSMMLV) ?? ''}
                      onChange={(e) => actualizar('deducible.valorSMDLV', e.target.value)}
                      placeholder="$ 58.364"
                      title="Por defecto SMMLV ÷ 30; puede ajustarlo manualmente"
                    />
                  </Campo>
                </>
              )}
            </div>
            <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
              {(ded.tipoMinimo || 'SMMLV') === 'SMMLV'
                ? 'SMMLV: salario mínimo mensual. El deducible aplicado es el mayor entre el % y (cantidad × SMMLV).'
                : `SMDLV: salario mínimo diario (SMMLV ÷ 30). Ejemplo 2026: $ ${formatearMonto(valorSmdlvDesdeSmmlv(ded.valorSMMLV || totales.valorSMMLV))} por día. El deducible aplicado es el mayor entre el % y (cantidad × SMDLV).`}
            </p>
            <div className="mt-4 space-y-2">
              <FilaTotal label="TOTAL PÉRDIDA" valor={totales.totalPerdida} />
              <FilaTotal
                label={`DEDUCIBLE ${totales.porcentaje}%`}
                valor={totales.deduciblePorcentaje}
              />
              {(ded.tipoMinimo || 'SMMLV') === 'SMMLV' ? (
                <FilaTotal
                  label={`DEDUCIBLE ${totales.cantidadSMMLV} SMMLV`}
                  valor={totales.deducibleSMMLV}
                />
              ) : (
                <FilaTotal
                  label={`DEDUCIBLE ${totales.cantidadSMDLV} SMDLV`}
                  valor={totales.deducibleSMDLV}
                />
              )}
              <FilaTotal
                label={`DEDUCIBLE APLICADO (${
                  totales.usaMinimo
                    ? totales.tipoMinimo === 'SMDLV'
                      ? 'SMDLV'
                      : 'SMMLV'
                    : '%'
                })`}
                valor={totales.deducibleAplicado}
              />
              <FilaTotal label="TOTAL A INDEMNIZAR" valor={totales.totalIndemnizar} destacado />
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={expressBtnGhost} onClick={handleDescargarExcel} disabled={descargandoWord}>
              <FaFileExcel />
              {descargandoWord ? 'Generando…' : 'Descargar Excel'}
            </button>
            <button type="button" className={expressBtnGhost} onClick={handleLiquidar}>
              <FaFileWord />
              Vista previa recibo
            </button>
            <button
              type="button"
              className={expressBtnGhost}
              onClick={abrirVistaPreviaReembolso}
              disabled={descargandoWord}
            >
              <FaFileWord />
              Vista previa reembolso
            </button>
            <button
              type="button"
              className={expressBtnGhost}
              onClick={abrirVistaPreviaTransaccion}
              disabled={descargandoWord}
            >
              <FaFileWord />
              Vista previa transacción
            </button>
          </div>
        </div>
      )}

      {tab === 'checklist' && (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={expressBtnGhost} onClick={handleDescargarExcel} disabled={descargandoWord}>
              <FaFileExcel />
              {descargandoWord ? 'Generando…' : 'Descargar Excel'}
            </button>
            <button type="button" className={expressBtnPrimary} onClick={handleDescargarChecklist} disabled={descargandoWord}>
              <FaFileWord />
              {descargandoWord ? 'Generando…' : 'Descargar Check-list Word'}
            </button>
          </div>

          <section className={expressFormSection}>
            <h3 className={expressSectionTitle}>FORMATO ÚNICO ATENCIÓN DE RECLAMOS EXPRESS — PROPERTY</h3>
            <p className="mb-3 font-body text-xs text-gray-500">Información general del reclamo (sincronizada con pestaña Liquidación)</p>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <FilaInfo label="Fecha">
                <InputFenix type="date" value={chk.fecha} onChange={(e) => actualizar('checklist.fecha', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="ZC">
                <InputFenix value={enc.zc} onChange={(e) => actualizar('encabezado.zc', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="STRO">
                <InputFenix value={enc.reclamo} onChange={(e) => actualizar('encabezado.reclamo', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Tipo de producto">
                <InputFenix value={chk.tipoProducto} onChange={(e) => actualizar('checklist.tipoProducto', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Número de póliza">
                <InputFenix value={enc.poliza} onChange={(e) => actualizar('encabezado.poliza', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Asegurado">
                <InputFenix value={enc.asegurado} onChange={(e) => actualizar('encabezado.asegurado', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Vigencia de la póliza">
                <div className="flex flex-wrap items-center gap-2">
                  <InputFenix type="date" value={chk.vigenciaDesde} onChange={(e) => actualizar('checklist.vigenciaDesde', e.target.value)} />
                  <span className="text-sm text-gray-500">al</span>
                  <InputFenix type="date" value={chk.vigenciaHasta} onChange={(e) => actualizar('checklist.vigenciaHasta', e.target.value)} />
                </div>
              </FilaInfo>
              <FilaInfo label="D.O.L" destacado>
                <InputFenix type="date" value={enc.fechaSiniestro} onChange={(e) => actualizar('encabezado.fechaSiniestro', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Riesgo asegurado">
                <InputFenix value={chk.riesgoAsegurado} onChange={(e) => actualizar('checklist.riesgoAsegurado', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Cobertura afectada">
                <InputFenix value={chk.coberturaAfectada || enc.cobertura} onChange={(e) => actualizar('checklist.coberturaAfectada', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Garantías">
                <SelectAplica value={chk.garantias} onChange={(e) => actualizar('checklist.garantias', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Exclusiones">
                <SelectAplica value={chk.exclusiones} onChange={(e) => actualizar('checklist.exclusiones', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Objeción">
                <SelectAplica value={chk.objecion} onChange={(e) => actualizar('checklist.objecion', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Tipo de pérdida">
                <SelectFenix value={chk.tipoPerdida} onChange={(e) => actualizar('checklist.tipoPerdida', e.target.value)}>
                  <option value="Parcial">Parcial</option>
                  <option value="Total">Total</option>
                </SelectFenix>
              </FilaInfo>
              <FilaInfo label="Aplica demérito">
                <SelectAplica value={chk.aplicaDemerito} onChange={(e) => actualizar('checklist.aplicaDemerito', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Límite o valor asegurado">
                <InputFenix value={chk.limiteAsegurado} onChange={(e) => actualizar('checklist.limiteAsegurado', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Pérdida ajustada">
                <span className="font-accent font-semibold">$ {formatearMonto(totales.totalPerdida)}</span>
              </FilaInfo>
              <FilaInfo label="Deducible">
                <span className="font-accent font-semibold">$ {formatearMonto(totales.deducibleAplicado)}</span>
              </FilaInfo>
              <FilaInfo label="Valor a indemnizar">
                <span className="font-accent text-lg font-bold text-emerald-700 dark:text-emerald-300">$ {formatearMonto(totales.totalIndemnizar)}</span>
              </FilaInfo>
              <FilaInfo label="Salvamento">
                <div className="flex flex-wrap gap-2">
                  <SelectAplica value={chk.salvamento} onChange={(e) => actualizar('checklist.salvamento', e.target.value)} />
                  {chk.salvamento === 'Aplica' && (
                    <InputFenix
                      value={chk.salvamentoDetalle}
                      onChange={(e) => actualizar('checklist.salvamentoDetalle', e.target.value)}
                      placeholder="Detalle (ej: MOTOR Y CO)"
                      className="min-w-[200px] flex-1"
                    />
                  )}
                </div>
              </FilaInfo>
              <FilaInfo label="Recobro">
                <SelectAplica value={chk.recobro} onChange={(e) => actualizar('checklist.recobro', e.target.value)} />
              </FilaInfo>
              <FilaInfo label="Indicadores de fraude">
                <SelectAplica value={chk.indicadoresFraude} onChange={(e) => actualizar('checklist.indicadoresFraude', e.target.value)} />
              </FilaInfo>
            </div>
            <Campo label="Breve descripción del evento" className="mt-4">
              <TextareaFenix value={chk.descripcionEvento} onChange={(e) => actualizar('checklist.descripcionEvento', e.target.value)} rows={4} />
            </Campo>
            <p className="mt-3 font-body text-sm text-gray-600 dark:text-gray-400">Ajustador — {nombreAjustador}</p>
          </section>

          <section className={expressFormSection}>
            <h3 className={expressSectionTitle}>Documentos de soporte</h3>
            <div className={expressTableWrap}>
              <table className="min-w-full">
                <thead className={expressTableHead}>
                  <tr>
                    <th className="px-3 py-2 w-12">N°</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2 w-32 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {DOCUMENTOS_SOPORTE.map((texto, idx) => (
                    <tr key={texto} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 text-sm">{idx + 1}</td>
                      <td className="px-3 py-2 text-sm">{texto}</td>
                      <td className="px-3 py-2 text-center">
                        <SelectFenix
                          value={normalizarEstadoDocumento(chk.documentos?.[idx])}
                          className="min-w-[7.5rem] text-sm"
                          onChange={(e) => {
                            const docs = normalizarListaEstadosDocumentos(
                              chk.documentos || DOCUMENTOS_SOPORTE.map(() => '')
                            );
                            docs[idx] = e.target.value;
                            actualizar('checklist.documentos', docs);
                          }}
                        >
                          <option value="">Pendiente</option>
                          <option value="Aplica">Aplica</option>
                          <option value="No Aplica">No Aplica</option>
                        </SelectFenix>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`${grid3} mt-4`}>
              <Campo label="Porcentaje de tareas finalizadas">
                <InputFenix readOnly value={`${pctDocs}%`} className="bg-gray-50 dark:bg-gray-900/40" />
              </Campo>
              <Campo label="¿El reclamo está formalizado?">
                <SelectFenix value={chk.reclamoFormalizado} onChange={(e) => actualizar('checklist.reclamoFormalizado', e.target.value)}>
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </SelectFenix>
              </Campo>
              <Campo label="Fecha formalización">
                <InputFenix type="date" value={chk.fechaFormalizacion} onChange={(e) => actualizar('checklist.fechaFormalizacion', e.target.value)} />
              </Campo>
            </div>
          </section>

          <section className={expressFormSection}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className={`${expressSectionTitle} mb-0`}>Análisis de la pérdida</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={sincronizarAnalisisDesdeConceptos} className={expressBtnGhost}>
                  Sincronizar desde liquidación
                </button>
                <button type="button" onClick={agregarItemAnalisis} className={expressBtnGhost}>
                  <FaPlus /> Agregar ítem
                </button>
              </div>
            </div>
            <div className={expressTableWrap}>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className={expressTableHead}>
                    <tr>
                      <th className="px-3 py-2 w-12">ITEM</th>
                      <th className="px-3 py-2 min-w-[200px]">DESCRIPCIÓN</th>
                      <th className="px-3 py-2 min-w-[140px]">V/R TOTAL (RECLAMADO)</th>
                      <th className="px-3 py-2 min-w-[140px]">V/R TOTAL (AJUSTADO)</th>
                      <th className="px-3 py-2 min-w-[200px]">OBSERVACIÓN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(chk.itemsAnalisis || []).map((item, idx) => (
                      <tr key={item.id}>
                        <td className="px-2 py-2 text-center text-sm">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <TextareaFenix rows={2} value={item.descripcion} onChange={(e) => {
                            const items = chk.itemsAnalisis.map((r) => r.id === item.id ? { ...r, descripcion: e.target.value } : r);
                            actualizar('checklist.itemsAnalisis', items);
                          }} />
                        </td>
                        <td className="px-2 py-2">
                          <InputFenix value={item.reclamado} onChange={(e) => {
                            const items = chk.itemsAnalisis.map((r) => r.id === item.id ? { ...r, reclamado: e.target.value } : r);
                            actualizar('checklist.itemsAnalisis', items);
                          }} />
                        </td>
                        <td className="px-2 py-2">
                          <InputFenix value={item.ajustado} onChange={(e) => {
                            const items = chk.itemsAnalisis.map((r) => r.id === item.id ? { ...r, ajustado: e.target.value } : r);
                            actualizar('checklist.itemsAnalisis', items);
                          }} />
                        </td>
                        <td className="px-2 py-2">
                          <TextareaFenix rows={2} value={item.observacion} onChange={(e) => {
                            const items = chk.itemsAnalisis.map((r) => r.id === item.id ? { ...r, observacion: e.target.value } : r);
                            actualizar('checklist.itemsAnalisis', items);
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50 font-bold dark:bg-emerald-950/20">
                      <td colSpan={2} className="px-3 py-2">Totales</td>
                      <td className="px-3 py-2">$ {formatearMonto(totalesAnalisis.totalReclamado)}</td>
                      <td className="px-3 py-2">$ {formatearMonto(totalesAnalisis.totalAjustado)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <Campo label="Comentarios adicionales" className="mt-4">
              <TextareaFenix value={chk.comentariosAdicionales} onChange={(e) => actualizar('checklist.comentariosAdicionales', e.target.value)} rows={3} />
            </Campo>
            <p className="mt-3 font-body text-sm text-gray-600 dark:text-gray-400">Ajustador — {nombreAjustador}</p>
          </section>
        </div>
      )}

      {tab === 'salvamento' && salvamentoActivo && (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={expressBtnGhost} onClick={handleDescargarExcel} disabled={descargandoWord}>
              <FaFileExcel />
              {descargandoWord ? 'Generando…' : 'Descargar Excel'}
            </button>
            <button type="button" className={expressBtnPrimary} onClick={handleDescargarSalvamento} disabled={descargandoWord}>
              <FaFileWord />
              {descargandoWord ? 'Generando…' : 'Descargar Salvamento Word'}
            </button>
          </div>

          <section className={expressFormSection}>
            <h3 className={expressSectionTitle}>Formato Salvamentos</h3>
            <div className={`${grid2} mb-4`}>
              <Campo label="Póliza"><InputFenix value={enc.poliza} readOnly className="bg-gray-50 dark:bg-gray-900/40" /></Campo>
              <Campo label="Reclamo"><InputFenix value={enc.reclamo} readOnly className="bg-gray-50 dark:bg-gray-900/40" /></Campo>
              <Campo label="Sub-tarea">
                <InputFenix value={sal.subTarea || 'SALVAMENTO'} onChange={(e) => actualizar('salvamento.subTarea', e.target.value)} />
              </Campo>
              <Campo label="Asegurado"><InputFenix value={enc.asegurado} readOnly className="bg-gray-50 dark:bg-gray-900/40" /></Campo>
            </div>

            <h4 className="mb-3 font-heading text-base font-bold text-[#002060]">Información de Salvamento</h4>
            <div className={grid2}>
              <Campo label="COMENTARIOS / Descripción salvamento">
                <TextareaFenix value={sal.descripcion} onChange={(e) => actualizar('salvamento.descripcion', e.target.value)} rows={3} placeholder="Ej: MOTOR Y CO" />
              </Campo>
              <Campo label="Especificación del daño y estado actual">
                <TextareaFenix value={sal.especificacionDano} onChange={(e) => actualizar('salvamento.especificacionDano', e.target.value)} rows={3} />
              </Campo>
              <Campo label="Cantidad (unidades)">
                <InputFenix value={sal.cantidad} onChange={(e) => actualizar('salvamento.cantidad', e.target.value)} />
              </Campo>
              <Campo label="Marca salvamento">
                <InputFenix value={sal.marca} onChange={(e) => actualizar('salvamento.marca', e.target.value)} placeholder="N/D" />
              </Campo>
              <Campo label="Serial salvamento">
                <InputFenix value={sal.serial} onChange={(e) => actualizar('salvamento.serial', e.target.value)} placeholder="N/D" />
              </Campo>
              <Campo label="Ubicación (dirección y ciudad)">
                <TextareaFenix value={sal.ubicacion} onChange={(e) => actualizar('salvamento.ubicacion', e.target.value)} rows={2} />
              </Campo>
              <Campo label="Contacto persona quien entrega">
                <TextareaFenix value={sal.contactoEntrega} onChange={(e) => actualizar('salvamento.contactoEntrega', e.target.value)} rows={2} />
              </Campo>
            </div>

            <div className={`${grid2} mt-4`}>
              <Campo label="Salvamento nacionalizado">
                <SelectSiNo value={sal.nacionalizado} onChange={(e) => actualizar('salvamento.nacionalizado', e.target.value)} />
              </Campo>
              <Campo label="Genera costos por custodia">
                <div className="flex gap-2">
                  <SelectSiNo value={sal.generaCustodia} onChange={(e) => actualizar('salvamento.generaCustodia', e.target.value)} />
                  <InputFenix value={sal.valorCustodia} onChange={(e) => actualizar('salvamento.valorCustodia', e.target.value)} placeholder="Valor $" className="flex-1" />
                </div>
              </Campo>
              <Campo label="Registro fotográfico">
                <SelectSiNo value={sal.registroFotografico} onChange={(e) => actualizar('salvamento.registroFotografico', e.target.value)} />
              </Campo>
              <Campo label="Indemnizado">
                <div className="flex gap-2">
                  <SelectSiNo value={sal.indemnizado} onChange={(e) => actualizar('salvamento.indemnizado', e.target.value)} />
                  <InputFenix value={sal.valorIndemnizado} onChange={(e) => actualizar('salvamento.valorIndemnizado', e.target.value)} placeholder="Valor $" className="flex-1" />
                </div>
              </Campo>
              <Campo label="Se solicitó oferta Non Cash">
                <div className="flex gap-2">
                  <SelectSiNo value={sal.ofertaNonCash} onChange={(e) => actualizar('salvamento.ofertaNonCash', e.target.value)} />
                  <InputFenix value={sal.valorNonCash} onChange={(e) => actualizar('salvamento.valorNonCash', e.target.value)} placeholder="Valor $" className="flex-1" />
                </div>
              </Campo>
            </div>

            <Campo label="Comentarios salvamento" className="mt-4">
              <TextareaFenix value={sal.comentarios} onChange={(e) => actualizar('salvamento.comentarios', e.target.value)} rows={4} />
            </Campo>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/30">
              <h4 className="mb-2 font-body text-sm font-bold text-gray-800 dark:text-gray-200">NOTAS</h4>
              <ol className="list-decimal space-y-2 pl-5 font-body text-xs text-gray-600 dark:text-gray-400">
                {NOTAS_SALVAMENTO.map((nota) => (
                  <li key={nota}>{nota}</li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      )}

      {mostrarVistaPrevia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vista-previa-titulo"
        >
          <div className={`${expressCard} max-h-[90vh] w-full max-w-2xl overflow-y-auto`}>
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 id="vista-previa-titulo" className="text-center font-heading text-lg font-bold">
                {mostrarVistaPrevia === 'recibo' && recibo.titulo}
                {mostrarVistaPrevia === 'reembolso' && previewReembolso.titulo}
                {mostrarVistaPrevia === 'transaccion' && previewTransaccion.titulo}
              </h2>
              <p className="text-center font-body text-sm text-gray-600">
                {mostrarVistaPrevia === 'recibo' && `Reclamo ${recibo.reclamo}`}
                {mostrarVistaPrevia === 'reembolso' && `Reclamo ${previewReembolso.reclamo}`}
                {mostrarVistaPrevia === 'transaccion' && `Siniestro ${previewTransaccion.siniestro}`}
              </p>
            </div>
            <div className={expressCardBody}>
              {mostrarVistaPrevia === 'recibo' && (
                <div className="space-y-2 font-body text-sm text-gray-800 dark:text-gray-200">
                  <p>
                    <strong>Asegurado:</strong> {recibo.asegurado}
                  </p>
                  <p>
                    <strong>NIT:</strong> {recibo.nit}
                  </p>
                  <p>
                    <strong>Póliza:</strong> {recibo.poliza}
                  </p>
                  <p>
                    <strong>Fecha de siniestro:</strong> {recibo.fecha}
                  </p>
                  <p className="mt-4 text-justify leading-relaxed">{recibo.parrafoPrincipal}</p>
                  <p className="text-justify text-xs text-gray-500">
                    Cláusulas de paz y salvo, subrogación y firma incluidas en el documento Word.
                  </p>
                  <p className="mt-4">
                    <strong>Valor en letras:</strong> {recibo.valorLetras}
                  </p>
                  <p>
                    <strong>Valor numérico:</strong> ${recibo.valor}
                  </p>
                </div>
              )}

              {mostrarVistaPrevia === 'reembolso' && (
                <div className="space-y-2 font-body text-sm text-gray-800 dark:text-gray-200">
                  <p>
                    <strong>STRO:</strong> {previewReembolso.reclamo}
                  </p>
                  <p>
                    <strong>ZC:</strong> {previewReembolso.zc}
                  </p>
                  <p>
                    <strong>Asegurado:</strong> {previewReembolso.asegurado}
                  </p>
                  <p>
                    <strong>Póliza:</strong> {previewReembolso.poliza}
                  </p>
                  <p className="mt-4 text-justify leading-relaxed">
                    <strong>Descripción del siniestro:</strong> {previewReembolso.descripcion}
                  </p>
                  <p className="mt-3">
                    <strong>Valor total del reclamo:</strong> {previewReembolso.totalReclamoLetras} ($
                    {previewReembolso.totalReclamo})
                  </p>
                  <p>
                    <strong>Deducible:</strong> ${previewReembolso.deducible}
                  </p>
                  <p>
                    <strong>Valor a indemnizar:</strong> {previewReembolso.totalIndemnizarLetras} ($
                    {previewReembolso.totalIndemnizar})
                  </p>
                  <p className="text-justify text-xs text-gray-500">
                    El Word completo incluye cláusulas contractuales y firmas de la plantilla.
                  </p>
                </div>
              )}

              {mostrarVistaPrevia === 'transaccion' && (
                <div className="space-y-2 font-body text-sm text-gray-800 dark:text-gray-200">
                  <p>
                    <strong>Póliza:</strong> {previewTransaccion.poliza}
                  </p>
                  <p>
                    <strong>Siniestro:</strong> {previewTransaccion.siniestro}
                  </p>
                  <p>
                    <strong>Tomador:</strong> {previewTransaccion.tomador}
                  </p>
                  <p>
                    <strong>Reclamante:</strong> {previewTransaccion.reclamante}
                  </p>
                  <p>
                    <strong>Documento:</strong> {previewTransaccion.nit}
                  </p>
                  <p>
                    <strong>Vigencia:</strong> {previewTransaccion.vigenciaDesde} al{' '}
                    {previewTransaccion.vigenciaHasta}
                  </p>
                  <p>
                    <strong>Fecha siniestro:</strong> {previewTransaccion.fechaSiniestro}
                  </p>
                  <p className="mt-4 text-justify leading-relaxed">
                    <strong>Hechos:</strong> {previewTransaccion.descripcion}
                  </p>
                  <p>
                    <strong>Oficina / detalle:</strong> {previewTransaccion.oficina}
                  </p>
                  <p className="mt-3">
                    <strong>Valor a indemnizar:</strong> {previewTransaccion.totalIndemnizarLetras} ($
                    {previewTransaccion.totalIndemnizar})
                  </p>
                  <p>
                    <strong>Deducible:</strong> {previewTransaccion.deducibleLetras} ($
                    {previewTransaccion.deducible})
                  </p>
                  <p className="text-justify text-xs text-gray-500">
                    El Word completo incluye consideraciones, acuerdo y firmas de la plantilla.
                  </p>
                </div>
              )}

              {errorWord && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {errorWord}
                </p>
              )}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={expressBtnGhost}
                  onClick={cerrarVistaPrevia}
                  disabled={descargandoWord}
                >
                  Cerrar
                </button>
                {mostrarVistaPrevia === 'recibo' && (
                  <button
                    type="button"
                    className={expressBtnGhost}
                    onClick={handleDescargarWord}
                    disabled={descargandoWord}
                  >
                    <FaFileWord />
                    {descargandoWord ? 'Generando…' : 'Descargar Recibo Word'}
                  </button>
                )}
                {mostrarVistaPrevia === 'reembolso' && (
                  <button
                    type="button"
                    className={expressBtnGhost}
                    onClick={handleDescargarContratoReembolso}
                    disabled={descargandoWord}
                  >
                    <FaFileWord />
                    {descargandoWord ? 'Generando…' : 'Descargar Contrato reembolso'}
                  </button>
                )}
                {mostrarVistaPrevia === 'transaccion' && (
                  <button
                    type="button"
                    className={expressBtnGhost}
                    onClick={handleDescargarContratoTransaccion}
                    disabled={descargandoWord}
                  >
                    <FaFileWord />
                    {descargandoWord ? 'Generando…' : 'Descargar Contrato transacción'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
