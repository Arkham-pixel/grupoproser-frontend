import React, { useRef, useState } from 'react';
import { FaFileExcel, FaTimes, FaUpload } from 'react-icons/fa';
import { importarCasosBbvaCat } from '../../services/bbvaCatService.js';
import { importarCasosBbvaCatListado } from '../../services/bbvaCatListadoService.js';
import {
  parsearCasosBbvaCatDesdeExcel,
  parsearListadoClienteBbvaCatDesdeExcel,
} from './importarBbvaCatExcel.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
} from '../SubcomponenteExpress/expressFenixUi.js';

export function esAdminOSoporteBbvaCat() {
  const rol = String(localStorage.getItem('rol') || '')
    .trim()
    .toLowerCase();
  return rol === 'admin' || rol === 'soporte' || rol === 'administrador' || rol === 'support';
}

/**
 * Carga masiva BBVA CAT:
 * - BASE BBVA / consolidado CAT → expedientes de inspección (liquidador e informe).
 * - Listado cliente (ZC, STRO) → módulo listado.
 */
export default function ModalImportarExcelBbvaCat({ open, onClose, onCompleted }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [hoja, setHoja] = useState('');
  const [casos, setCasos] = useState([]);
  const [modo, setModo] = useState('listado');
  const [error, setError] = useState(null);
  const [analizando, setAnalizando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setHoja('');
    setCasos([]);
    setModo('listado');
    setError(null);
    setResultado(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleFile = async (selected) => {
    setError(null);
    setResultado(null);
    setCasos([]);
    setHoja('');
    setModo('listado');
    setFile(selected || null);
    if (!selected) return;
    setAnalizando(true);
    try {
      let listado = null;
      let cat = null;
      try {
        listado = await parsearListadoClienteBbvaCatDesdeExcel(selected);
      } catch {
        listado = null;
      }
      try {
        cat = await parsearCasosBbvaCatDesdeExcel(selected);
      } catch {
        cat = null;
      }
      const esBaseBbva = /BASE BBVA/i.test(cat?.hoja || '');
      const usarCat =
        Boolean(cat?.casos?.length) &&
        (esBaseBbva || !listado?.casos?.length || cat.casos.length >= listado.casos.length);
      const parsed = usarCat ? cat : listado;
      if (!parsed?.casos?.length) {
        throw new Error(
          'No se encontraron filas válidas. Use BASE BBVA (siniestro, ID, asegurado) o el listado con ZC/STRO.'
        );
      }
      setModo(usarCat ? 'cat' : 'listado');
      setHoja(parsed.hoja || '');
      setCasos(Array.isArray(parsed.casos) ? parsed.casos : []);
    } catch (err) {
      setError(err.message || 'No se pudo leer el Excel');
    } finally {
      setAnalizando(false);
    }
  };

  const handleImport = async () => {
    if (!casos.length) return;
    setImportando(true);
    setError(null);
    try {
      const data =
        modo === 'cat'
          ? await importarCasosBbvaCat(casos)
          : await importarCasosBbvaCatListado(casos);
      const totals = {
        rows: data?.totalRecibidos ?? casos.length,
        created: data?.creados ?? 0,
        updated: data?.actualizados ?? 0,
        skipped: data?.omitidos ?? 0,
      };
      setResultado({ ...data, totals });
      await onCompleted?.({ totals, data });
    } catch (err) {
      setError(err.message || 'No se pudo importar el Excel');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              Importar Excel BBVA CAT
            </p>
            <p className="mt-1 font-body text-sm text-gray-500">
              {modo === 'cat'
                ? 'Formato BASE BBVA / consolidado: se crean o actualizan expedientes (liquidador e informe) por siniestro o identificación.'
                : 'Listado cliente: columnas ZC, STRO, Asegurado y Ciudad. Si el ZC ya existe, se actualiza; si no, se crea.'}
            </p>
          </div>
          <button type="button" className={expressBtnGhost} onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </p>
        )}

        {!resultado && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              className={expressBtnPrimary}
              disabled={analizando || importando}
              onClick={() => fileRef.current?.click()}
            >
              <FaUpload />
              {analizando ? 'Analizando…' : file ? 'Cambiar archivo' : 'Seleccionar Excel'}
            </button>
            {file && (
              <p className="mt-3 flex items-center gap-2 font-body text-sm text-gray-600 dark:text-gray-300">
                <FaFileExcel />
                {file.name}
                {hoja ? ` · hoja ${hoja}` : ''}
                {casos.length ? ` · ${casos.length} filas` : ''}
                {casos.length ? ` · ${modo === 'cat' ? 'expedientes CAT' : 'listado'}` : ''}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={expressBtnGhost} onClick={handleClose}>
                Cancelar
              </button>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={!casos.length || importando || analizando}
                onClick={handleImport}
              >
                {importando ? 'Importando…' : 'Confirmar importación'}
              </button>
            </div>
          </>
        )}

        {resultado && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Leídos</p>
                <p className="text-xl font-bold">{resultado.totals?.rows ?? 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Creados</p>
                <p className="text-xl font-bold text-fenix-primario">
                  {resultado.totals?.created ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Actualizados</p>
                <p className="text-xl font-bold">{resultado.totals?.updated ?? 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">Omitidos</p>
                <p className="text-xl font-bold">{resultado.totals?.skipped ?? 0}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" className={expressBtnPrimary} onClick={handleClose}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
