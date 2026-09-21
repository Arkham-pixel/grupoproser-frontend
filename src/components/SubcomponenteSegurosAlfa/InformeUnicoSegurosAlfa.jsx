import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel, FaUpload } from 'react-icons/fa';
import {
  Campo,
  ExpressAvisoModal,
  expressBtnPrimary,
  expressBtnSecondary,
  InputFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressBtnSuccess,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  AIU_PORCENTAJE_DEFAULT_ALFA,
  calcularLiquidacionAlfa,
  defaultInformeUnicoAlfa,
  mapCasoAlfaALiquidador,
} from './liquidadorAlfaHelpers.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import {
  descargarInformeCatAlfaExcel,
} from './generarInformeCatAlfaExcel.js';
import {
  archivarBlobEnCasoAlfa,
  MIME_ARCHIVO_ALFA,
} from './archivarDocumentoAlfa.js';
import {
  extraerConsecutivoAlfaDeNombre,
  parsearInformeCatAlfaExcel,
} from './parsearInformeCatAlfaExcel.js';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import AnalisisCoberturaCriteriaAlfa from './AnalisisCoberturaCriteriaAlfa.jsx';
import SeccionModoLiquidadorCat from '../SubcomponenteLiquidadorCatExpress/SeccionModoLiquidadorCat.jsx';
import { esLiquidadorExpress } from '../SubcomponenteLiquidadorCatExpress/liquidadorCatExpressHelpers.js';

export default function InformeUnicoSegurosAlfa({
  casoAlfa = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onImportarExcelCat,
  onCasoChange,
  onArchivoArchivado,
  guardandoCaso = false,
  liquidadorInicial = null,
}) {
  const { t } = useTranslation();
  const [informe, setInforme] = useState(() => defaultInformeUnicoAlfa(casoAlfa || {}));
  const [liquidador, setLiquidador] = useState(() => {
    const desdeCaso = mapCasoAlfaALiquidador(casoAlfa || {});
    return fusionarLiquidadorSinPerderPresupuestoNsr(
      liquidadorInicial || desdeCaso,
      desdeCaso
    );
  });
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);
  const fileExcelCatRef = useRef(null);
  const puedeImportarExcel = Boolean(
    onImportarExcelCat || (onGuardarEnCaso && casoAlfa?._id)
  );

  const totales = useMemo(() => calcularLiquidacionAlfa(liquidador), [liquidador]);
  const capturaMapaInicial = useMemo(() => {
    const im = informe.imagenMapa;
    if (!im) return '';
    if (typeof im === 'string') return im;
    return '';
  }, [informe.imagenMapa]);

  const handleMapaChange = (info) => {
    setInforme((prev) => {
      const next = { ...prev };
      if (info?.lat != null && info?.lng != null) {
        next.coordenadasRiesgo = `${info.lat}, ${info.lng}`;
      } else if (info?.coordenadas) {
        if (typeof info.coordenadas === 'string') {
          next.coordenadasRiesgo = info.coordenadas;
        } else if (info.coordenadas.lat != null && info.coordenadas.lng != null) {
          next.coordenadasRiesgo = `${info.coordenadas.lat}, ${info.coordenadas.lng}`;
        }
      }
      const img = info?.imagenMapa || info?.imagen;
      if (img) next.imagenMapa = img;
      if (info?.direccion) {
        next.direccionRiesgo = info.direccion;
        next.analisisGeneral = {
          ...(next.analisisGeneral || {}),
          ubicacionEvento:
            next.analisisGeneral?.ubicacionEvento ||
            info.direccion ||
            prev.analisisGeneral?.ubicacionEvento ||
            '',
        };
      }
      return next;
    });
  };

  useEffect(() => {
    setInforme(defaultInformeUnicoAlfa(casoAlfa || {}));
    const desdeCaso = mapCasoAlfaALiquidador(casoAlfa || {});
    setLiquidador(
      fusionarLiquidadorSinPerderPresupuestoNsr(liquidadorInicial || desdeCaso, desdeCaso)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoAlfa?._id]);

  // Si hay coordenadas pero no captura, forzar Static Maps al abrir el informe
  useEffect(() => {
    const coords = String(informe.coordenadasRiesgo || '').trim();
    const tieneMapa = Boolean(String(informe.imagenMapa || '').trim());
    if (coords && !tieneMapa) {
      setForzarCapturaMapa((n) => (n === 0 ? 1 : n));
    }
    // solo al cargar caso / cuando aparecen coords sin imagen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casoAlfa?._id, informe.coordenadasRiesgo]);

  useEffect(() => {
    onEstadoChange?.(informe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [informe]);

  useEffect(() => {
    onLiquidadorChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

  const setCampo = (campo, valor) => {
    setInforme((prev) => {
      const next = { ...prev, [campo]: valor };
      if (campo === 'actaAjustadorNombre') next.ajustadorNombre = valor;
      if (campo === 'ajustadorNombre' && !prev.actaAjustadorNombre) {
        next.actaAjustadorNombre = valor;
      }
      // Firma del ajustador: mantener ambos campos alineados (UI + Word/Excel)
      if (campo === 'actaAjustadorFirmaImagen') next.firmaAjustador = valor;
      if (campo === 'firmaAjustador') next.actaAjustadorFirmaImagen = valor;
      return next;
    });
  };

  const setAnalisisGeneral = (campo, valor) => {
    setInforme((prev) => {
      const next = {
        ...prev,
        analisisGeneral: {
          ...(prev.analisisGeneral || {}),
          [campo]: valor,
        },
      };
      if (campo === 'descripcionEvento') next.infoEvento = valor;
      if (campo === 'ubicacionEvento' && !String(prev.direccionRiesgo || '').trim()) {
        next.direccionRiesgo = valor;
      }
      return next;
    });
  };

  const setIndicadorFraude = (key, patch) => {
    setInforme((prev) => {
      const ag = prev.analisisGeneral || {};
      const indicadores = { ...(ag.indicadoresFraude || {}) };
      indicadores[key] = { ...(indicadores[key] || {}), ...patch };
      return {
        ...prev,
        analisisGeneral: { ...ag, indicadoresFraude: indicadores },
      };
    });
  };

  const handleExcelCat = async () => {
    setDescargando(true);
    setError('');
    setMensaje('');
    try {
      const resultado = await descargarInformeCatAlfaExcel({
        caso: casoAlfa || {},
        liquidador,
        totales,
        informe,
      });
      const casoId = casoAlfa?._id;
      if (casoId && resultado?.blob) {
        try {
          const creado = await archivarBlobEnCasoAlfa({
            casoId,
            blob: resultado.blob,
            nombre: resultado.filename || resultado.nombre,
            mime: MIME_ARCHIVO_ALFA.xlsx,
            etiqueta: 'INFORME',
          });
          appendArchivosAlCaso([creado]);
          if (typeof onArchivoArchivado === 'function') onArchivoArchivado(creado);
          setMensaje(
            creado?.replaced
              ? 'Excel CAT actualizado en archivero (sobrescrito; cola SharePoint).'
              : 'Excel CAT descargado y guardado en archivero (cola SharePoint SINIESTROS).'
          );
        } catch (errArchivo) {
          console.error('Archivero informe:', errArchivo);
          setError(
            `Excel descargado, pero NO se archivó: ${errArchivo?.message || 'error'}`
          );
        }
      } else {
        setMensaje('Excel CAT Alfa descargado (Liquidador + Análisis + anexos).');
      }
      setLiquidador((prev) => ({ ...prev, excelCatOrigen: 'generado' }));
      onLiquidadorChange?.({ ...liquidador, excelCatOrigen: 'generado' }, totales);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo generar el Excel CAT Alfa.');
    } finally {
      setDescargando(false);
    }
  };

  const handleSubirExcelCatTalCual = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const casoId = casoAlfa?._id;
    if (!casoId) {
      setError('Guarde el caso antes de importar el Excel.');
      return;
    }
    setDescargando(true);
    setError('');
    setMensaje('');
    try {
      if (typeof onImportarExcelCat === 'function') {
        const result = await onImportarExcelCat(file);
        if (result?.mensaje) setMensaje(result.mensaje);
        else {
          setMensaje(
            `Excel importado a ARNALD: liquidador (${result?.nItems ?? '?'} ítem(s)) e informe.`
          );
        }
        return;
      }

      const parsed = await parsearInformeCatAlfaExcel(file, {
        caso: casoAlfa || {},
        liquidadorActual: liquidador,
      });
      const nextLiq = { ...parsed.liquidador, excelCatOrigen: 'manual' };
      setLiquidador(nextLiq);
      onLiquidadorChange?.(nextLiq, calcularLiquidacionAlfa(nextLiq));
      if (parsed.analisisGeneral) {
        setInforme((prev) => ({
          ...prev,
          analisisGeneral: {
            ...(prev.analisisGeneral || {}),
            ...parsed.analisisGeneral,
          },
          ajustadorNombre: nextLiq.encabezado?.ajustador || prev.ajustadorNombre,
        }));
      }
      const creado = await archivarBlobEnCasoAlfa({
        casoId,
        blob: file,
        nombre: file.name || 'Informe_CAT_Seguros_Alfa.xlsx',
        mime: MIME_ARCHIVO_ALFA.xlsx,
        etiqueta: 'INFORME',
      });
      appendArchivosAlCaso([creado]);
      if (typeof onArchivoArchivado === 'function') onArchivoArchivado(creado);
      if (onGuardarEnCaso) {
        await onGuardarEnCaso({
          ...informe,
          analisisGeneral: {
            ...(informe.analisisGeneral || {}),
            ...(parsed.analisisGeneral || {}),
          },
          ajustadorNombre: nextLiq.encabezado?.ajustador || informe.ajustadorNombre,
        });
      }
      const consecArchivo = parsed.consecutivoArchivo || extraerConsecutivoAlfaDeNombre(file.name);
      const consecCaso = String(casoAlfa?.consecutivo || '').trim();
      const avisoConsec =
        consecArchivo && consecCaso && consecArchivo !== consecCaso.toUpperCase()
          ? ` Atención: el archivo parece de ${consecArchivo} y este caso es ${consecCaso}.`
          : '';
      setMensaje(
        `${
          creado?.replaced
            ? 'Excel CAT actualizado en el archivero.'
            : 'Excel CAT guardado en el archivero.'
        } ${parsed.nItems} ítem(s) cargados.${avisoConsec}`
      );
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo subir el Excel CAT.');
    } finally {
      setDescargando(false);
    }
  };

  const handleGuardarInforme = async () => {
    if (!onGuardarEnCaso) return;
    setError('');
    setMensaje('');
    try {
      // El workspace archiva el Excel CAT tras guardar (cola SharePoint)
      await onGuardarEnCaso(informe);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.reportUnique.saveError'));
    }
  };

  const appendArchivosAlCaso = (nuevos = []) => {
    if (!nuevos.length || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      let list = Array.isArray(prev.archivos) ? [...prev.archivos] : [];
      nuevos.forEach((a) => {
        if (!a) return;
        const id = a._id ? String(a._id) : null;
        if (id) {
          const idx = list.findIndex((x) => String(x._id) === id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...a };
            return;
          }
        }
        const et = String(a.etiqueta || '').toUpperCase();
        const ext = String(a.nombreOriginal || '')
          .toLowerCase()
          .match(/\.([a-z0-9]+)$/)?.[1];
        if (a.replaced && et && ext) {
          list = list.filter((x) => {
            if (String(x._id) === id) return true;
            if (String(x.etiqueta || '').toUpperCase() !== et) return true;
            const aExt = String(x.nombreOriginal || x.nombreArchivo || '')
              .toLowerCase()
              .match(/\.([a-z0-9]+)$/)?.[1];
            return aExt !== ext;
          });
        }
        list.push(a);
      });
      return { ...prev, archivos: list };
    });
  };

  const quitarArchivoDelCaso = (archivoId) => {
    if (!archivoId || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      const list = (Array.isArray(prev.archivos) ? prev.archivos : []).filter(
        (a) => String(a._id) !== String(archivoId)
      );
      return { ...prev, archivos: list };
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label={t('segurosAlfa.reportUnique.adjuster')}>
          <InputFenix
            value={informe.ajustadorNombre || ''}
            onChange={(e) => setCampo('ajustadorNombre', e.target.value)}
          />
        </Campo>
        <Campo label={t('segurosAlfa.reportUnique.reportDate')}>
          <InputFenix
            type="date"
            value={informe.fechaInforme || ''}
            onChange={(e) => setCampo('fechaInforme', e.target.value)}
          />
        </Campo>
      </div>

      {esLiquidadorExpress(liquidador) ? (
        <section className={expressFormSection}>
          <h3 className={expressSectionTitle}>Liquidador express</h3>
          <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
            El presupuesto y el deducible del liquidador express se incluyen en el informe y en el Excel CAT.
          </p>
          <SeccionModoLiquidadorCat
            modulo="alfa"
            liquidador={liquidador}
            onLiquidadorChange={setLiquidador}
            tomador={liquidador?.encabezado?.tomador || casoAlfa?.tomador || ''}
            onTomadorCasoChange={(tomador) => {
              onCasoChange?.((prev) => (prev ? { ...prev, tomador } : prev));
            }}
            aiuPorcentaje={
              Number(liquidador?.evaluacionSismicaNSR10?.presupuesto?.aiuPorcentaje) ||
              AIU_PORCENTAJE_DEFAULT_ALFA
            }
            disabled={guardandoCaso}
            ocultarToggle
          />
        </section>
      ) : null}

      <AnalisisCoberturaCriteriaAlfa
        analisis={informe.analisisGeneral || {}}
        coordenadasRiesgo={informe.coordenadasRiesgo || ''}
        direccionRiesgo={informe.direccionRiesgo || casoAlfa?.direccionPredio || ''}
        imagenMapa={capturaMapaInicial}
        forzarCapturaMapa={forzarCapturaMapa}
        onAnalisisChange={setAnalisisGeneral}
        onIndicadorFraudeChange={setIndicadorFraude}
        onMapaChange={handleMapaChange}
        onForzarCaptura={() => setForzarCapturaMapa((n) => n + 1)}
        onCoordenadasChange={(v) => setCampo('coordenadasRiesgo', v)}
        fotosInspeccion={informe.fotosInspeccion || []}
        onFotosChange={(lista) => setCampo('fotosInspeccion', lista)}
        casoId={casoAlfa?._id}
        onArchivoCreado={(creado) => {
          if (creado) appendArchivosAlCaso([creado]);
          if (typeof onArchivoArchivado === 'function') onArchivoArchivado(creado);
          setMensaje(t('segurosAlfa.reportUnique.photosUploaded', { count: 1 }));
        }}
        onArchivoEliminado={(archivoId) => {
          quitarArchivoDelCaso(archivoId);
          setMensaje(t('segurosAlfa.archive.deleteOk'));
        }}
      />

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosAlfa.reportUnique.sectionSignatures')}</h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosAlfa.reportUnique.signaturesHint')}
        </p>
        <SeccionFirmasActa
          formData={informe}
          onInputChange={setCampo}
          tituloAjustador={t('segurosAlfa.reportUnique.signatureAdjuster')}
          nombreRolProfesional="ajustador"
          permitirRegistrarAjustadores
          sinContenedor
          soloAjustador
        />
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <button
          type="button"
          className={expressBtnSecondary}
          disabled={descargando}
          onClick={handleExcelCat}
        >
          <FaFileExcel /> Excel CAT
        </button>
        {puedeImportarExcel && (
          <>
            <input
              ref={fileExcelCatRef}
              type="file"
              accept=".xlsx,.xlsm"
              className="hidden"
              onChange={handleSubirExcelCatTalCual}
            />
            <button
              type="button"
              className={expressBtnSuccess}
              disabled={descargando || guardandoCaso}
              onClick={() => fileExcelCatRef.current?.click()}
              title="Lee el Excel CAT (liquidador + análisis + fotos ANEXOS) y lo pega en ARNALD."
            >
              <FaUpload />
              {descargando ? 'Subiendo…' : 'Subir Excel liquidador e informe'}
            </button>
          </>
        )}
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso || descargando}
            onClick={handleGuardarInforme}
          >
            {guardandoCaso
              ? t('segurosAlfa.reportUnique.saving')
              : t('segurosAlfa.reportUnique.saveDraft')}
          </button>
        )}
      </div>

      {(mensaje || error) && (
        <ExpressAvisoModal
          open
          tipo={error ? 'error' : 'success'}
          titulo={error ? 'Error' : 'Guardado'}
          mensaje={error || mensaje}
          botonTexto="Aceptar"
          onClose={() => {
            setMensaje('');
            setError('');
          }}
        />
      )}
    </div>
  );
}
