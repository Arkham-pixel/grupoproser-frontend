import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel } from 'react-icons/fa';
import {
  Campo,
  expressBtnPrimary,
  expressBtnSecondary,
  InputFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  calcularLiquidacionAlfa,
  defaultInformeUnicoAlfa,
  mapCasoAlfaALiquidador,
} from './liquidadorAlfaHelpers.js';
import { descargarInformeCatAlfaExcel } from './generarInformeCatAlfaExcel.js';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import AnalisisCoberturaCriteriaAlfa from './AnalisisCoberturaCriteriaAlfa.jsx';

export default function InformeUnicoSegurosAlfa({
  casoAlfa = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
}) {
  const { t } = useTranslation();
  const [informe, setInforme] = useState(() => defaultInformeUnicoAlfa(casoAlfa || {}));
  const [liquidador, setLiquidador] = useState(() => mapCasoAlfaALiquidador(casoAlfa || {}));
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

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
    setLiquidador(mapCasoAlfaALiquidador(casoAlfa || {}));
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
      await descargarInformeCatAlfaExcel({
        caso: casoAlfa || {},
        liquidador,
        totales,
        informe,
      });
      setMensaje('Excel CAT Alfa descargado (Liquidador + Análisis + anexos).');
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo generar el Excel CAT Alfa.');
    } finally {
      setDescargando(false);
    }
  };

  const appendArchivosAlCaso = (nuevos = []) => {
    if (!nuevos.length || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.archivos) ? prev.archivos : [];
      const ids = new Set(list.map((a) => String(a._id)));
      const merged = [...list];
      nuevos.forEach((a) => {
        if (a?._id && !ids.has(String(a._id))) merged.push(a);
      });
      return { ...prev, archivos: merged };
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
      {mensaje && <p className={expressAlertSuccess}>{mensaje}</p>}
      {error && <p className={expressAlertError}>{error}</p>}

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
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={() => onGuardarEnCaso(informe)}
          >
            {guardandoCaso
              ? t('segurosAlfa.reportUnique.saving')
              : t('segurosAlfa.reportUnique.saveDraft')}
          </button>
        )}
      </div>
    </div>
  );
}
