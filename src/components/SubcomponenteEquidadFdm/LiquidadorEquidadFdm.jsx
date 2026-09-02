import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FaFileExcel,
  FaFilePdf,
  FaFileUpload,
  FaFileWord,
  FaPlus,
  FaTrash,
} from 'react-icons/fa';
import {
  Campo,
  expressBtnGhost,
  expressBtnPrimary,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressBtnSuccess,
  expressFormSection,
  expressSectionTitle,
  expressTableHead,
  expressTableWrap,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  CATALOGO_CONTENIDOS_NSR10,
  catalogoContenidosPorTipo,
  TIPOS_INMUEBLE_CONTENIDOS_NSR10,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  buildCartaCoberturaPreview,
  buildConstanciaPreview,
  calcularLiquidacionFdm,
  crearItem,
  formatearMonto,
  mapCasoFdmALiquidador,
  SMMLV_POR_ANIO,
} from './liquidadorEquidadFdmHelpers.js';
import { parsearLiquidadorFdmExcel } from './parsearLiquidadorFdmExcel.js';
import { descargarConstanciaFdmWord } from './generarConstanciaFdmWord.js';
import { descargarCartaCoberturaFdmWord } from './generarCartaCoberturaFdmWord.js';
import { descargarConstanciaFdmPdf } from './generarConstanciaFdmPdf.js';
import { descargarLiquidadorFdmExcel } from './generarLiquidadorFdmExcel.js';

const grid2 = 'grid grid-cols-1 gap-4 sm:grid-cols-2';
const grid3 = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

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

function TablaItems({
  titulo,
  items,
  onAdd,
  onChange,
  onChangePatch,
  onRemove,
  conCatalogo = false,
  tipoInmueble = '',
  onTipoInmuebleChange,
}) {
  const { t } = useTranslation();
  const catalogo = conCatalogo
    ? catalogoContenidosPorTipo(tipoInmueble)
    : CATALOGO_CONTENIDOS_NSR10;
  return (
    <section className={expressFormSection}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className={`${expressSectionTitle} mb-0`}>{titulo}</h3>
        <button type="button" onClick={onAdd} className={expressBtnGhost}>
          <FaPlus /> {t('equidadFdm.settlement.addItem')}
        </button>
      </div>
      {conCatalogo ? (
        <div className="mb-4 max-w-sm">
          <Campo label="Tipo de inmueble / riesgo">
            <SelectFenix
              value={tipoInmueble || ''}
              onChange={(e) => onTipoInmuebleChange?.(e.target.value)}
            >
              <option value="">— Seleccione —</option>
              {TIPOS_INMUEBLE_CONTENIDOS_NSR10.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <p className="mt-1 font-body text-xs text-gray-500">
            Elija del catálogo o escriba un ítem libre si no aparece.
          </p>
        </div>
      ) : null}
      <div className={expressTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className={expressTableHead}>
              <tr>
                <th className="px-3 py-2 w-12">{t('equidadFdm.settlement.colNumber')}</th>
                {conCatalogo ? <th className="px-3 py-2 min-w-[180px]">Catálogo</th> : null}
                <th className="px-3 py-2">{t('equidadFdm.settlement.colItem')}</th>
                <th className="px-3 py-2 min-w-[140px]">{t('equidadFdm.settlement.colValue')}</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {!items.length ? (
                <tr>
                  <td
                    colSpan={conCatalogo ? 5 : 4}
                    className="px-3 py-6 text-center text-sm text-gray-500"
                  >
                    {t('equidadFdm.settlement.noItems')}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-center text-sm text-gray-500">{idx + 1}</td>
                    {conCatalogo ? (
                      <td className="px-2 py-2">
                        <SelectFenix
                          value={item.catalogoId || ''}
                          onChange={(e) => {
                            const id = e.target.value;
                            if (!id || id === '__custom__') {
                              onChangePatch?.(item.id, { catalogoId: '' });
                              return;
                            }
                            const hit = catalogo.find((c) => c.id === id);
                            onChangePatch?.(item.id, {
                              catalogoId: id,
                              ...(hit?.articulo ? { item: hit.articulo } : {}),
                            });
                          }}
                        >
                          <option value="">— Elegir —</option>
                          {catalogo.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.categoria}: {c.articulo}
                            </option>
                          ))}
                          <option value="__custom__">Otro / escribir libre</option>
                        </SelectFenix>
                      </td>
                    ) : null}
                    <td className="px-2 py-2">
                      <InputFenix
                        value={item.item}
                        onChange={(e) => onChange(item.id, 'item', e.target.value)}
                        placeholder={t('equidadFdm.settlement.itemDescriptionPlaceholder')}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <InputFenix
                        value={item.valor}
                        onChange={(e) => onChange(item.id, 'valor', e.target.value)}
                        placeholder={t('equidadFdm.settlement.zeroAmountPlaceholder')}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="rounded p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label={t('equidadFdm.settlement.delete')}
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
  );
}

export default function LiquidadorEquidadFdm({
  casoFdm = null,
  onEstadoChange,
  onGuardarEnCaso,
  guardandoCaso = false,
  tieneLiquidadorGuardado = false,
}) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [liquidador, setLiquidador] = useState(() => mapCasoFdmALiquidador(casoFdm || {}));
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState('');
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const totales = useMemo(() => calcularLiquidacionFdm(liquidador), [liquidador]);
  const preview = useMemo(() => buildConstanciaPreview(liquidador, totales), [liquidador, totales]);
  const previewCarta = useMemo(
    () => buildCartaCoberturaPreview(liquidador, totales),
    [liquidador, totales]
  );

  useEffect(() => {
    onEstadoChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

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
      return next;
    });
  };

  const actualizarAnioSmmlv = (anio) => {
    const n = Number(anio);
    setLiquidador((prev) => ({
      ...prev,
      deducible: {
        ...prev.deducible,
        anioSMMLV: n,
        valorSMMLV: SMMLV_POR_ANIO[n] || prev.deducible?.valorSMMLV,
      },
    }));
  };

  const agregarItem = (lista) => {
    setLiquidador((prev) => ({
      ...prev,
      [lista]: [...(prev[lista] || []), crearItem()],
    }));
  };

  const actualizarItem = (lista, id, campo, valor) => {
    setLiquidador((prev) => ({
      ...prev,
      [lista]: (prev[lista] || []).map((item) =>
        item.id === id ? { ...item, [campo]: valor } : item
      ),
    }));
  };

  const actualizarItemPatch = (lista, id, patch) => {
    setLiquidador((prev) => ({
      ...prev,
      [lista]: (prev[lista] || []).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const eliminarItem = (lista, id) => {
    setLiquidador((prev) => ({
      ...prev,
      [lista]: (prev[lista] || []).filter((item) => item.id !== id),
    }));
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportando(true);
    setError('');
    setMensajeImport('');
    try {
      const parseado = await parsearLiquidadorFdmExcel(file);
      setLiquidador(parseado);
      setMensajeImport(
        t('equidadFdm.settlement.importSuccess', {
          name: parseado.encabezado?.asegurado || t('equidadFdm.settlement.unnamed'),
          count: (parseado.contenidos?.length || 0) + (parseado.edificios?.length || 0),
        })
      );
    } catch (err) {
      console.error(err);
      setError(err.message || t('equidadFdm.settlement.importError'));
    } finally {
      setImportando(false);
    }
  };

  const handleDescargarWord = async () => {
    setDescargando(true);
    setError('');
    try {
      await descargarConstanciaFdmWord(liquidador, totales);
      setPreviewDoc(null);
    } catch (err) {
      console.error(err);
      setError(t('equidadFdm.settlement.wordError'));
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarCarta = async () => {
    setDescargando(true);
    setError('');
    try {
      await descargarCartaCoberturaFdmWord(liquidador, totales);
      setPreviewDoc(null);
    } catch (err) {
      console.error(err);
      setError(err.message || t('equidadFdm.settlement.coverageLetterError'));
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarPdf = async () => {
    setDescargando(true);
    setError('');
    try {
      await descargarConstanciaFdmPdf(liquidador, totales);
      setPreviewDoc(null);
    } catch (err) {
      console.error(err);
      setError(t('equidadFdm.settlement.pdfError'));
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarExcel = async () => {
    setDescargando(true);
    setError('');
    try {
      await descargarLiquidadorFdmExcel(liquidador, totales);
    } catch (err) {
      console.error(err);
      setError(t('equidadFdm.settlement.excelError'));
    } finally {
      setDescargando(false);
    }
  };

  const enc = liquidador.encabezado || {};
  const ded = liquidador.deducible || {};
  const qtySmmlv = String(totales.cantidadSMMLV).replace('.', ',');
  const pctTxt = String(totales.porcentaje ?? 10).replace('.', ',');
  const deductibleBasis = totales.usaManual
    ? t('equidadFdm.settlement.basisManual')
    : totales.usaSMMLV
      ? t('equidadFdm.settlement.basisSmmlv', { qty: qtySmmlv })
      : t('equidadFdm.settlement.basisPercent', { pct: pctTxt });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
          <button
            type="button"
            className={expressBtnGhost}
            onClick={() => fileRef.current?.click()}
            disabled={importando || guardandoCaso}
          >
            <FaFileUpload />
            {importando
              ? t('equidadFdm.settlement.importing')
              : t('equidadFdm.settlement.uploadExcel')}
          </button>
          {onGuardarEnCaso && (
            <button
              type="button"
              className={expressBtnPrimary}
              onClick={onGuardarEnCaso}
              disabled={guardandoCaso || importando}
            >
              {guardandoCaso
                ? t('equidadFdm.actions.saving')
                : tieneLiquidadorGuardado
                  ? t('equidadFdm.settlement.updateCase')
                  : t('equidadFdm.settlement.saveCase')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={expressBtnGhost}
            onClick={handleDescargarExcel}
            disabled={descargando || importando || guardandoCaso}
          >
            <FaFileExcel />
            {descargando
              ? t('equidadFdm.settlement.generating')
              : t('equidadFdm.settlement.downloadExcel')}
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            onClick={handleDescargarPdf}
            disabled={descargando || importando || guardandoCaso}
          >
            <FaFilePdf />
            {descargando
              ? t('equidadFdm.settlement.generating')
              : t('equidadFdm.settlement.downloadPdf')}
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            onClick={() => setPreviewDoc('carta')}
            disabled={descargando}
          >
            <FaFileWord />
            {t('equidadFdm.settlement.generateCoverageLetter')}
          </button>
          <button
            type="button"
            className={expressBtnSuccess}
            onClick={() => setPreviewDoc('constancia')}
            disabled={descargando}
          >
            <FaFileWord />
            {t('equidadFdm.settlement.generateWord')}
          </button>
        </div>
      </div>

      {tieneLiquidadorGuardado && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 font-body text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
          {t('equidadFdm.settlement.existingSettlementNotice')}
        </p>
      )}
      {mensajeImport && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {mensajeImport}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('equidadFdm.settlement.insuredPolicySection')}</h3>
        <div className={grid2}>
          <Campo label={t('equidadFdm.settlement.policyholder')}>
            <InputFenix value={enc.tomador} onChange={(e) => actualizar('encabezado.tomador', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.settlement.insuredBeneficiary')}>
            <InputFenix value={enc.asegurado} onChange={(e) => actualizar('encabezado.asegurado', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.fields.id')}>
            <InputFenix value={enc.cedula} onChange={(e) => actualizar('encabezado.cedula', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.settlement.policy')}>
            <InputFenix value={enc.poliza} onChange={(e) => actualizar('encabezado.poliza', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.fields.order')}>
            <InputFenix value={enc.orden} onChange={(e) => actualizar('encabezado.orden', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.fields.claim')}>
            <InputFenix value={enc.siniestro} onChange={(e) => actualizar('encabezado.siniestro', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.fields.case')}>
            <InputFenix value={enc.caso} onChange={(e) => actualizar('encabezado.caso', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.settlement.eventCoverage')}>
            <InputFenix value={enc.evento} onChange={(e) => actualizar('encabezado.evento', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.settlement.claimDate')}>
            <InputFenix
              type="date"
              value={enc.fechaSiniestro}
              onChange={(e) => actualizar('encabezado.fechaSiniestro', e.target.value)}
            />
          </Campo>
          <Campo label={t('equidadFdm.fields.affectedAddress')}>
            <InputFenix value={enc.direccion} onChange={(e) => actualizar('encabezado.direccion', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.settlement.lineOfBusiness')}>
            <InputFenix value={enc.ramo} onChange={(e) => actualizar('encabezado.ramo', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.settlement.agency')}>
            <InputFenix value={enc.agencia} onChange={(e) => actualizar('encabezado.agencia', e.target.value)} />
          </Campo>
          <Campo label={t('equidadFdm.settlement.signatureCity')}>
            <InputFenix
              value={enc.ciudadFirma}
              onChange={(e) => actualizar('encabezado.ciudadFirma', e.target.value)}
              placeholder={t('equidadFdm.settlement.signatureCityPlaceholder')}
            />
          </Campo>
          <Campo label={t('equidadFdm.settlement.printSignDate')}>
            <InputFenix
              type="date"
              value={enc.fechaImpreso}
              onChange={(e) => actualizar('encabezado.fechaImpreso', e.target.value)}
            />
          </Campo>
        </div>
      </section>

      <TablaItems
        titulo={t('equidadFdm.settlement.contents')}
        items={liquidador.contenidos || []}
        onAdd={() => agregarItem('contenidos')}
        onChange={(id, campo, valor) => actualizarItem('contenidos', id, campo, valor)}
        onChangePatch={(id, patch) => actualizarItemPatch('contenidos', id, patch)}
        onRemove={(id) => eliminarItem('contenidos', id)}
        conCatalogo
        tipoInmueble={liquidador.tipoInmuebleContenidos || ''}
        onTipoInmuebleChange={(valor) => actualizar('tipoInmuebleContenidos', valor)}
      />

      <TablaItems
        titulo={t('equidadFdm.settlement.buildings')}
        items={liquidador.edificios || []}
        onAdd={() => agregarItem('edificios')}
        onChange={(id, campo, valor) => actualizarItem('edificios', id, campo, valor)}
        onRemove={(id) => eliminarItem('edificios', id)}
      />

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('equidadFdm.settlement.deductibleSubsidySection')}</h3>
        <div className={grid3}>
          <Campo label={t('equidadFdm.settlement.smmlvYear')}>
            <SelectFenix value={ded.anioSMMLV ?? 2026} onChange={(e) => actualizarAnioSmmlv(e.target.value)}>
              {Object.keys(SMMLV_POR_ANIO).map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('equidadFdm.settlement.smmlvValue')}>
            <InputFenix
              value={ded.valorSMMLV ?? ''}
              onChange={(e) => actualizar('deducible.valorSMMLV', e.target.value)}
            />
          </Campo>
          <Campo label={t('equidadFdm.settlement.smmlvQuantity')}>
            <InputFenix
              type="number"
              min="0"
              step="0.01"
              value={ded.cantidadSMMLV ?? 0.75}
              onChange={(e) =>
                actualizar(
                  'deducible.cantidadSMMLV',
                  e.target.value === '' ? '' : parseFloat(e.target.value)
                )
              }
            />
          </Campo>
          <Campo label={t('equidadFdm.settlement.deductiblePercent')}>
            <InputFenix
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={ded.porcentaje ?? 10}
              onChange={(e) =>
                actualizar(
                  'deducible.porcentaje',
                  e.target.value === '' ? '' : parseFloat(e.target.value)
                )
              }
            />
          </Campo>
          <Campo label={t('equidadFdm.settlement.deductibleAppliedManual')}>
            <InputFenix
              value={ded.montoManual ?? ''}
              placeholder={t('equidadFdm.settlement.deductibleAppliedManualPlaceholder')}
              onChange={(e) => actualizar('deducible.montoManual', e.target.value)}
            />
          </Campo>
          <Campo label={t('equidadFdm.fields.subsidy')}>
            <InputFenix
              value={liquidador.subsidio ?? 0}
              onChange={(e) => actualizar('subsidio', e.target.value)}
            />
          </Campo>
        </div>

        <div className="mt-4 space-y-2">
          <FilaTotal label={t('equidadFdm.settlement.subtotalContents')} valor={totales.subtotalContenidos} />
          <FilaTotal label={t('equidadFdm.settlement.subtotalBuildings')} valor={totales.subtotalEdificios} />
          <FilaTotal label={t('equidadFdm.settlement.establishedLoss')} valor={totales.totalPerdida} />
          <FilaTotal
            label={t('equidadFdm.settlement.deductiblePercentLine', { pct: pctTxt })}
            valor={totales.deduciblePorcentajeExcel}
          />
          <FilaTotal
            label={t('equidadFdm.settlement.deductibleSmmlvLine', { qty: qtySmmlv })}
            valor={totales.deducibleSMMLV}
          />
          <FilaTotal
            label={t('equidadFdm.settlement.deductibleAppliedLine', { basis: deductibleBasis })}
            valor={totales.deducibleAplicado}
          />
          <FilaTotal label={t('equidadFdm.settlement.subsidyLine')} valor={totales.subsidio} />
          <FilaTotal label={t('equidadFdm.settlement.indemnityLine')} valor={totales.totalIndemnizar} destacado />
          <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
            {t('equidadFdm.settlement.formulaHint')}
          </p>
          <p className="font-body text-xs italic text-gray-600 dark:text-gray-300">
            {preview.indemnizacionLetras}
          </p>
        </div>
      </section>

      {previewDoc === 'constancia' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#1A1A1A]">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="text-center font-heading text-lg font-bold">
                {t('equidadFdm.settlement.certificateTitle')}
              </h2>
              <p className="text-center font-body text-sm text-gray-600">
                {preview.asegurado} · ${preview.indemnizacion}
              </p>
            </div>
            <div className="space-y-3 px-5 py-5 font-body text-sm text-gray-800 dark:text-gray-200">
              <p>
                <strong>{t('equidadFdm.settlement.policy')}:</strong> {preview.poliza} ·{' '}
                <strong>{t('equidadFdm.fields.order')}:</strong> {preview.orden}
              </p>
              <p className="text-justify leading-relaxed">
                {t('equidadFdm.settlement.certificateEvent', {
                  event: preview.evento,
                  address: preview.direccion,
                  date: preview.fechaSiniestroLarga,
                })}
              </p>
              <p className="text-justify leading-relaxed">
                {t('equidadFdm.settlement.certificateIndemnity', {
                  indemnity: preview.indemnizacion,
                  letters: preview.indemnizacionLetras,
                  loss: preview.totalPerdida,
                  rate: preview.tasaTxt,
                  deductible: preview.deducible,
                  subsidy: preview.subsidio,
                })}
              </p>
              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <button
                  type="button"
                  className={expressBtnGhost}
                  onClick={() => setPreviewDoc(null)}
                  disabled={descargando}
                >
                  {t('equidadFdm.settlement.close')}
                </button>
                <button
                  type="button"
                  className={expressBtnPrimary}
                  onClick={handleDescargarWord}
                  disabled={descargando}
                >
                  <FaFileWord />
                  {descargando
                    ? t('equidadFdm.settlement.generating')
                    : t('equidadFdm.settlement.downloadWord')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewDoc === 'carta' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#1A1A1A]">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="text-center font-heading text-lg font-bold">
                {t('equidadFdm.settlement.coverageLetterTitle')}
              </h2>
              <p className="text-center font-body text-sm text-gray-600">
                {previewCarta.asegurado} · ${previewCarta.indemnizacion}
              </p>
            </div>
            <div className="space-y-3 px-5 py-5 font-body text-sm text-gray-800 dark:text-gray-200">
              <p>
                {t('equidadFdm.settlement.coverageLetterDate', {
                  city: previewCarta.ciudadCarta,
                  date: previewCarta.fechaCarta,
                })}
              </p>
              <p>
                <strong>{t('equidadFdm.settlement.insuredBeneficiary')}:</strong>{' '}
                {previewCarta.asegurado}
              </p>
              <p>
                <strong>{t('equidadFdm.fields.id')}:</strong> {previewCarta.cedula} ·{' '}
                <strong>{t('equidadFdm.settlement.policy')}:</strong> {previewCarta.poliza}
              </p>
              <p className="text-justify leading-relaxed">
                {t('equidadFdm.settlement.coverageLetterIntro', {
                  cause: previewCarta.causaEvento,
                  date: previewCarta.fechaEventoCarta,
                })}
              </p>
              <p className="text-justify leading-relaxed">
                {t('equidadFdm.settlement.coverageLetterAmount', {
                  amount: previewCarta.indemnizacion,
                  letters: previewCarta.indemnizacionLetrasCarta,
                })}
              </p>
              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <button
                  type="button"
                  className={expressBtnGhost}
                  onClick={() => setPreviewDoc(null)}
                  disabled={descargando}
                >
                  {t('equidadFdm.settlement.close')}
                </button>
                <button
                  type="button"
                  className={expressBtnPrimary}
                  onClick={handleDescargarCarta}
                  disabled={descargando}
                >
                  <FaFileWord />
                  {descargando
                    ? t('equidadFdm.settlement.generating')
                    : t('equidadFdm.settlement.downloadCoverageLetter')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
