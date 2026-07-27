import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  buildConstanciaPreview,
  calcularLiquidacionFdm,
  crearItem,
  formatearMonto,
  mapCasoFdmALiquidador,
  SMMLV_POR_ANIO,
} from './liquidadorEquidadFdmHelpers.js';
import { parsearLiquidadorFdmExcel } from './parsearLiquidadorFdmExcel.js';
import { descargarConstanciaFdmWord } from './generarConstanciaFdmWord.js';
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

function TablaItems({ titulo, items, onAdd, onChange, onRemove }) {
  return (
    <section className={expressFormSection}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className={`${expressSectionTitle} mb-0`}>{titulo}</h3>
        <button type="button" onClick={onAdd} className={expressBtnGhost}>
          <FaPlus /> Agregar ítem
        </button>
      </div>
      <div className={expressTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead className={expressTableHead}>
              <tr>
                <th className="px-3 py-2 w-12">N°</th>
                <th className="px-3 py-2">Ítem</th>
                <th className="px-3 py-2 min-w-[140px]">Valor</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {!items.length ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500">
                    Sin ítems. Agregue filas o importe un Excel del modelo de liquidación.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-center text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <InputFenix
                        value={item.item}
                        onChange={(e) => onChange(item.id, 'item', e.target.value)}
                        placeholder="Descripción del bien"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <InputFenix
                        value={item.valor}
                        onChange={(e) => onChange(item.id, 'valor', e.target.value)}
                        placeholder="$ 0"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
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
  );
}

export default function LiquidadorEquidadFdm({
  casoFdm = null,
  onEstadoChange,
  onGuardarEnCaso,
  guardandoCaso = false,
  tieneLiquidadorGuardado = false,
}) {
  const fileRef = useRef(null);
  const [liquidador, setLiquidador] = useState(() => mapCasoFdmALiquidador(casoFdm || {}));
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState('');
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const totales = useMemo(() => calcularLiquidacionFdm(liquidador), [liquidador]);
  const preview = useMemo(() => buildConstanciaPreview(liquidador, totales), [liquidador, totales]);

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
        `Excel importado: ${parseado.encabezado?.asegurado || 'sin nombre'} · ${
          (parseado.contenidos?.length || 0) + (parseado.edificios?.length || 0)
        } ítem(s).`
      );
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo leer el Excel del liquidador.');
    } finally {
      setImportando(false);
    }
  };

  const handleDescargarWord = async () => {
    setDescargando(true);
    setError('');
    try {
      await descargarConstanciaFdmWord(liquidador, totales);
      setMostrarPreview(false);
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el Word de constancia.');
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarPdf = async () => {
    setDescargando(true);
    setError('');
    try {
      await descargarConstanciaFdmPdf(liquidador, totales);
      setMostrarPreview(false);
    } catch (err) {
      console.error(err);
      setError('No se pudo generar el PDF del liquidador.');
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
      setError('No se pudo generar el Excel del modelo de liquidación.');
    } finally {
      setDescargando(false);
    }
  };

  const enc = liquidador.encabezado || {};
  const ded = liquidador.deducible || {};

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
            {importando ? 'Importando…' : 'Subir Excel liquidador'}
          </button>
          {onGuardarEnCaso && (
            <button
              type="button"
              className={expressBtnPrimary}
              onClick={onGuardarEnCaso}
              disabled={guardandoCaso || importando}
            >
              {guardandoCaso
                ? 'Guardando…'
                : tieneLiquidadorGuardado
                  ? 'Actualizar en caso'
                  : 'Guardar en caso'}
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
            {descargando ? 'Generando…' : 'Descargar Excel'}
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            onClick={handleDescargarPdf}
            disabled={descargando || importando || guardandoCaso}
          >
            <FaFilePdf />
            {descargando ? 'Generando…' : 'Descargar PDF liquidador'}
          </button>
          <button
            type="button"
            className={expressBtnSuccess}
            onClick={() => setMostrarPreview(true)}
            disabled={descargando}
          >
            <FaFileWord />
            Generar constancia Word
          </button>
        </div>
      </div>

      {tieneLiquidadorGuardado && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 font-body text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
          Este caso ya tiene liquidador guardado. Al actualizar se sincronizan el valor indemnizado y los totales del caso.
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
        <h3 className={expressSectionTitle}>Datos del asegurado / póliza</h3>
        <div className={grid2}>
          <Campo label="Tomador">
            <InputFenix value={enc.tomador} onChange={(e) => actualizar('encabezado.tomador', e.target.value)} />
          </Campo>
          <Campo label="Asegurado / beneficiario">
            <InputFenix value={enc.asegurado} onChange={(e) => actualizar('encabezado.asegurado', e.target.value)} />
          </Campo>
          <Campo label="Cédula">
            <InputFenix value={enc.cedula} onChange={(e) => actualizar('encabezado.cedula', e.target.value)} />
          </Campo>
          <Campo label="Póliza">
            <InputFenix value={enc.poliza} onChange={(e) => actualizar('encabezado.poliza', e.target.value)} />
          </Campo>
          <Campo label="Orden">
            <InputFenix value={enc.orden} onChange={(e) => actualizar('encabezado.orden', e.target.value)} />
          </Campo>
          <Campo label="Siniestro">
            <InputFenix value={enc.siniestro} onChange={(e) => actualizar('encabezado.siniestro', e.target.value)} />
          </Campo>
          <Campo label="Caso">
            <InputFenix value={enc.caso} onChange={(e) => actualizar('encabezado.caso', e.target.value)} />
          </Campo>
          <Campo label="Evento / cobertura">
            <InputFenix value={enc.evento} onChange={(e) => actualizar('encabezado.evento', e.target.value)} />
          </Campo>
          <Campo label="Fecha siniestro">
            <InputFenix
              type="date"
              value={enc.fechaSiniestro}
              onChange={(e) => actualizar('encabezado.fechaSiniestro', e.target.value)}
            />
          </Campo>
          <Campo label="Dirección afectada">
            <InputFenix value={enc.direccion} onChange={(e) => actualizar('encabezado.direccion', e.target.value)} />
          </Campo>
          <Campo label="Ramo">
            <InputFenix value={enc.ramo} onChange={(e) => actualizar('encabezado.ramo', e.target.value)} />
          </Campo>
          <Campo label="Agencia">
            <InputFenix value={enc.agencia} onChange={(e) => actualizar('encabezado.agencia', e.target.value)} />
          </Campo>
          <Campo label="Ciudad firma (constancia)">
            <InputFenix
              value={enc.ciudadFirma}
              onChange={(e) => actualizar('encabezado.ciudadFirma', e.target.value)}
              placeholder="Ej: Lorica"
            />
          </Campo>
          <Campo label="Fecha impreso / firma">
            <InputFenix
              type="date"
              value={enc.fechaImpreso}
              onChange={(e) => actualizar('encabezado.fechaImpreso', e.target.value)}
            />
          </Campo>
        </div>
      </section>

      <TablaItems
        titulo="Contenidos"
        items={liquidador.contenidos || []}
        onAdd={() => agregarItem('contenidos')}
        onChange={(id, campo, valor) => actualizarItem('contenidos', id, campo, valor)}
        onRemove={(id) => eliminarItem('contenidos', id)}
      />

      <TablaItems
        titulo="Edificios"
        items={liquidador.edificios || []}
        onAdd={() => agregarItem('edificios')}
        onChange={(id, campo, valor) => actualizarItem('edificios', id, campo, valor)}
        onRemove={(id) => eliminarItem('edificios', id)}
      />

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>Deducible y subsidio</h3>
        <div className={grid3}>
          <Campo label="Año SMMLV">
            <SelectFenix value={ded.anioSMMLV ?? 2026} onChange={(e) => actualizarAnioSmmlv(e.target.value)}>
              {Object.keys(SMMLV_POR_ANIO).map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label="Valor SMMLV">
            <InputFenix
              value={ded.valorSMMLV ?? ''}
              onChange={(e) => actualizar('deducible.valorSMMLV', e.target.value)}
            />
          </Campo>
          <Campo label="Cantidad SMMLV (ej. 0.75)">
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
          <Campo label="Porcentaje deducible (%)">
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
          <Campo label="Subsidio (COP)">
            <InputFenix
              value={liquidador.subsidio ?? 0}
              onChange={(e) => actualizar('subsidio', e.target.value)}
            />
          </Campo>
        </div>

        <div className="mt-4 space-y-2">
          <FilaTotal label="Subtotal contenidos" valor={totales.subtotalContenidos} />
          <FilaTotal label="Subtotal edificios" valor={totales.subtotalEdificios} />
          <FilaTotal label="PÉRDIDA ESTABLECIDA" valor={totales.totalPerdida} />
          <FilaTotal label="(-) DEDUCIBLE 10%" valor={totales.deduciblePorcentajeExcel} />
          <FilaTotal
            label={`(-) DEDUCIBLE ${String(totales.cantidadSMMLV).replace('.', ',')} SMMLV`}
            valor={totales.deducibleSMMLV}
          />
          <FilaTotal
            label={`DEDUCIBLE APLICADO (${totales.usaSMMLV ? '0,75 SMMLV' : '10%'})`}
            valor={totales.deducibleAplicado}
          />
          <FilaTotal label="(+) SUBSIDIO" valor={totales.subsidio} />
          <FilaTotal label="(=) INDEMNIZACIÓN" valor={totales.totalIndemnizar} destacado />
          <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
            Igual que Excel: MAX(0,75×SMMLV, 10% pérdida) → pérdida − deducible + subsidio
          </p>
          <p className="font-body text-xs italic text-gray-600 dark:text-gray-300">
            {preview.indemnizacionLetras}
          </p>
        </div>
      </section>

      {mostrarPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#1A1A1A]">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="text-center font-heading text-lg font-bold">
                Constancia de Indemnización y Paz y Salvo
              </h2>
              <p className="text-center font-body text-sm text-gray-600">
                {preview.asegurado} · ${preview.indemnizacion}
              </p>
            </div>
            <div className="space-y-3 px-5 py-5 font-body text-sm text-gray-800 dark:text-gray-200">
              <p>
                <strong>Póliza:</strong> {preview.poliza} · <strong>Orden:</strong> {preview.orden}
              </p>
              <p className="text-justify leading-relaxed">
                Evento <strong>{preview.evento}</strong> en {preview.direccion}, hechos el{' '}
                {preview.fechaSiniestroLarga}.
              </p>
              <p className="text-justify leading-relaxed">
                Indemnización: <strong>${preview.indemnizacion}</strong> ({preview.indemnizacionLetras})
                — pérdida ${preview.totalPerdida} menos deducible {preview.tasaTxt} (${preview.deducible})
                + subsidio ${preview.subsidio}.
              </p>
              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <button
                  type="button"
                  className={expressBtnGhost}
                  onClick={() => setMostrarPreview(false)}
                  disabled={descargando}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className={expressBtnPrimary}
                  onClick={handleDescargarWord}
                  disabled={descargando}
                >
                  <FaFileWord />
                  {descargando ? 'Generando…' : 'Descargar Word'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
