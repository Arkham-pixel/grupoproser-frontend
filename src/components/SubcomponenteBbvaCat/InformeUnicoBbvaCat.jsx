import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileWord, FaMapMarkerAlt, FaRedo } from 'react-icons/fa';
import {
  Campo,
  expressBtnGhost,
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
  INFO_EVENTO_DEFAULT_BBVA_CAT,
  calcularLiquidacionBbvaCat,
  defaultInformeUnicoBbvaCat,
  formatDateLarga,
  mapcasoBbvaCatALiquidador,
} from './liquidadorBbvaCatHelpers.js';
import FormatoLiquidacionBbvaCat from './FormatoLiquidacionBbvaCat.jsx';
import {
  contextoFechasBbvaCat,
  defaultDeducibleFormatoBbvaCat,
  nuevoItemDetalleBbvaCat,
  patchFilaDetalleBbvaCat,
  resolverDetalleLiquidacionBbvaCat,
  sincronizarDetalleBbvaConPresupuestoNsr,
} from './formatoLiquidacionBbvaCat.js';
import {
  aplicarTipoLiquidadorEnLiquidacionBbvaCat,
  esObservacionFiniquitoDefaultBbvaCat,
  observacionesFiniquitoPorDefectoBbvaCat,
} from './deduciblesBbvaCat.js';
import { descargarWordInformeBbvaCat } from './generarWordInformeBbvaCat.js';
import { bbvaCatArchivosApi } from './bbvaCatArchivosApi.js';
import FotosInspeccionZurich from '../SubcomponenteZurich/FotosInspeccionZurich.jsx';
import SeccionFirmasActa from '../SeccionFirmasActa.jsx';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';

function extraerLatLng(texto) {
  const parts = String(texto || '')
    .split(',')
    .map((c) => parseFloat(String(c).trim()));
  if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return {
      latitud: parts[0].toFixed(6),
      longitud: parts[1].toFixed(6),
    };
  }
  return { latitud: '', longitud: '' };
}

export default function InformeUnicoBbvaCat({
  casoBbvaCat = null,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
  origen = 'cat',
  liquidadorInicial = null,
}) {
  const { t } = useTranslation();
  const api = useMemo(() => bbvaCatArchivosApi(origen), [origen]);
  const [informe, setInforme] = useState(() => defaultInformeUnicoBbvaCat(casoBbvaCat || {}));
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapcasoBbvaCatALiquidador(casoBbvaCat || {})
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [descargando, setDescargando] = useState(false);
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

  const totales = useMemo(() => calcularLiquidacionBbvaCat(liquidador), [liquidador]);
  const coordsRiesgo = useMemo(
    () => extraerLatLng(informe.coordenadasRiesgo),
    [informe.coordenadasRiesgo]
  );
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
      if (info?.direccion && !String(prev.direccionRiesgo || '').trim()) {
        next.direccionRiesgo = info.direccion;
      }
      return next;
    });
  };

  useEffect(() => {
    setInforme(defaultInformeUnicoBbvaCat(casoBbvaCat || {}));
    setLiquidador(liquidadorInicial || mapcasoBbvaCatALiquidador(casoBbvaCat || {}));
  }, [casoBbvaCat?._id]);

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

  const itemsDetalle = useMemo(
    () => resolverDetalleLiquidacionBbvaCat(liquidador),
    [liquidador]
  );

  const setDetalle = (filas) => {
    setLiquidador((prev) => sincronizarDetalleBbvaConPresupuestoNsr(prev, filas));
  };

  const handleItemChange = (index, patch = {}) => {
    const base = resolverDetalleLiquidacionBbvaCat(liquidador).map((it) => ({ ...it }));
    if (!base[index]) return;
    const ctx = contextoFechasBbvaCat(liquidador.encabezado || {}, casoBbvaCat || {});
    base[index] = patchFilaDetalleBbvaCat(base[index], patch, ctx);
    setDetalle(base);
  };

  const actualizarEncabezado = (campo, valor) => {
    setLiquidador((prev) => {
      const next = {
        ...prev,
        encabezado: { ...(prev.encabezado || {}), [campo]: valor },
      };
      if (campo === 'valorAseguradoInmueble' || campo === 'valorGlobal') {
        const liq = prev.liquidacionCatastrofico || {};
        next.liquidacionCatastrofico = { ...liq, valorAsegurado: valor };
        next.encabezado.valorGlobal = valor;
        next.encabezado.valorAseguradoInmueble = valor;
      }
      if (campo === 'ramoAfectado') {
        next.deducibleFormato = defaultDeducibleFormatoBbvaCat(prev.tipoLiquidador, valor);
      }
      return next;
    });
  };

  const restaurarInfoEvento = () => {
    setCampo('infoEvento', INFO_EVENTO_DEFAULT_BBVA_CAT);
  };

  const handleWord = async () => {
    setDescargando(true);
    setError('');
    try {
      await descargarWordInformeBbvaCat({
        caso: casoBbvaCat || {},
        informe,
        liquidador,
      });
    } catch (err) {
      console.error(err);
      setError(t('bbvaCat.reportUnique.wordError'));
    } finally {
      setDescargando(false);
    }
  };

  const appendArchivosAlCaso = (creados = []) => {
    const lista = (Array.isArray(creados) ? creados : [creados]).filter(Boolean);
    if (!lista.length) return;
    onCasoChange?.((prev) => {
      if (!prev) return prev;
      const actuales = Array.isArray(prev.archivos) ? prev.archivos : [];
      const ids = new Set(actuales.map((a) => String(a?._id || '')).filter(Boolean));
      const extra = lista.filter((a) => a?._id && !ids.has(String(a._id)));
      if (!extra.length) return prev;
      return { ...prev, archivos: [...actuales, ...extra] };
    });
  };

  const quitarArchivoDelCaso = (archivoId) => {
    if (!archivoId) return;
    onCasoChange?.((prev) => {
      if (!prev) return prev;
      const actuales = Array.isArray(prev.archivos) ? prev.archivos : [];
      return {
        ...prev,
        archivos: actuales.filter((a) => String(a?._id) !== String(archivoId)),
      };
    });
  };

  return (
    <div className="space-y-5">
      {mensaje && <p className={expressAlertSuccess}>{mensaje}</p>}
      {error && <p className={expressAlertError}>{error}</p>}

      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            1. {t('bbvaCat.reportUnique.sectionEvent')}
          </h3>
          <button type="button" className={expressBtnGhost} onClick={restaurarInfoEvento}>
            <FaRedo /> {t('bbvaCat.reportUnique.resetEvent')}
          </button>
        </div>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('bbvaCat.reportUnique.eventHint')}
        </p>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={6}
          value={informe.infoEvento || ''}
          onChange={(e) => setCampo('infoEvento', e.target.value)}
        />
        <figure className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <img
            src={`${import.meta.env.BASE_URL || '/'}templates/mapa-evento-siniestro-Zurich.png`}
            alt={t('bbvaCat.reportUnique.eventMapAlt')}
            className="mx-auto max-h-[420px] w-full object-contain bg-white p-2"
          />
          <figcaption className="border-t border-gray-100 px-3 py-2 text-center font-body text-xs text-gray-500 dark:border-gray-800">
            {t('bbvaCat.reportUnique.eventMapCaption')}
          </figcaption>
        </figure>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label={t('bbvaCat.reportUnique.adjuster')}>
            <InputFenix
              value={informe.ajustadorNombre || ''}
              onChange={(e) => setCampo('ajustadorNombre', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.reportUnique.reportDate')}>
            <InputFenix
              type="date"
              value={informe.fechaInforme || ''}
              onChange={(e) => setCampo('fechaInforme', e.target.value)}
            />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          2. {t('bbvaCat.reportUnique.sectionDamages')}
        </h3>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
          rows={5}
          value={informe.descripcionDanios || ''}
          onChange={(e) => setCampo('descripcionDanios', e.target.value)}
          placeholder={t('bbvaCat.reportUnique.sectionDamagesHint')}
        />

        <div className="mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-2 font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
              <FaMapMarkerAlt className="text-blue-600" />
              {t('bbvaCat.reportUnique.sectionRiskMap')}
            </h4>
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setForzarCapturaMapa((n) => n + 1)}
            >
              {t('bbvaCat.reportUnique.updateMapCapture')}
            </button>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Campo label={t('bbvaCat.reportUnique.latitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.latitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
            <Campo label={t('bbvaCat.reportUnique.longitude')}>
              <InputFenix
                readOnly
                className="font-mono"
                value={coordsRiesgo.longitud}
                placeholder="Se llena desde el mapa"
              />
            </Campo>
          </div>

          <Campo label={t('bbvaCat.reportUnique.coordinatesText')}>
            <InputFenix
              className="font-mono"
              value={informe.coordenadasRiesgo || ''}
              onChange={(e) => setCampo('coordenadasRiesgo', e.target.value)}
              placeholder="8.760470, -75.902449"
            />
          </Campo>

          <div className="mt-3 min-h-[320px] overflow-hidden rounded-lg">
            <MapaGoogleEarth
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              coordenadasIniciales={informe.coordenadasRiesgo}
              direccionInicial={informe.direccionRiesgo || casoBbvaCat?.direccionPredio || ''}
              capturaInicial={capturaMapaInicial || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChange}
            />
          </div>
          <p className="mt-2 font-body text-xs text-gray-500">
            {capturaMapaInicial
              ? t('bbvaCat.reportUnique.mapCaptureReady')
              : t('bbvaCat.reportUnique.mapCaptureHint')}
          </p>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>3. {t('bbvaCat.reportUnique.sectionPolicy')}</h3>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{t('bbvaCat.fields.tomador')}</dt>
            <dd className="font-medium">{casoBbvaCat?.tomador || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('bbvaCat.fields.numeroPoliza')}</dt>
            <dd className="font-medium">{casoBbvaCat?.numeroPoliza || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('bbvaCat.fields.fechaInicioPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoBbvaCat?.fechaInicioPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('bbvaCat.fields.fechaFinPoliza')}</dt>
            <dd className="font-medium">
              {formatDateLarga(casoBbvaCat?.fechaFinPoliza)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('bbvaCat.fields.cobertura')}</dt>
            <dd className="font-medium">{casoBbvaCat?.cobertura || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('bbvaCat.fields.estadoPagoPrimas')}</dt>
            <dd className="font-medium">{casoBbvaCat?.estadoPagoPrimas || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('bbvaCat.fields.direccionPredio')}</dt>
            <dd className="font-medium">{casoBbvaCat?.direccionPredio || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">
              {t('bbvaCat.fields.ciudad')} / {t('bbvaCat.fields.departamento')}
            </dt>
            <dd className="font-medium">
              {casoBbvaCat?.ciudad || '—'} / {casoBbvaCat?.departamento || '—'}
            </dd>
          </div>
        </dl>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>4. Liquidación de indemnización BBVA</h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          Formato Excel (deudores / leasing) con logo BBVA, deducibles y base de precios Valle del
          Cauca.
        </p>

        <FormatoLiquidacionBbvaCat
          caso={casoBbvaCat || {}}
          encabezado={liquidador.encabezado || {}}
          liquidador={liquidador}
          itemsDetalle={itemsDetalle}
          onEncabezadoChange={actualizarEncabezado}
          onTipoLiquidadorChange={(tipo) =>
            setLiquidador((prev) => {
              const obsActual = prev.observacionesFiniquito ?? '';
              const obsSiguiente = esObservacionFiniquitoDefaultBbvaCat(obsActual)
                ? observacionesFiniquitoPorDefectoBbvaCat(tipo)
                : obsActual;
              return {
                ...prev,
                tipoLiquidador: tipo,
                observacionesFiniquito: obsSiguiente,
                deducibleFormato: defaultDeducibleFormatoBbvaCat(
                  tipo,
                  prev.encabezado?.ramoAfectado || prev.encabezado?.cobertura
                ),
                liquidacionCatastrofico: aplicarTipoLiquidadorEnLiquidacionBbvaCat(
                  prev.liquidacionCatastrofico || {},
                  tipo,
                  { forzarDeducible: true }
                ),
              };
            })
          }
          onDeducibleFormatoChange={(patch) =>
            setLiquidador((prev) => ({
              ...prev,
              deducibleFormato: { ...(prev.deducibleFormato || {}), ...patch },
            }))
          }
          onItemChange={handleItemChange}
          onAddItem={() =>
            setDetalle([
              ...resolverDetalleLiquidacionBbvaCat(liquidador),
              nuevoItemDetalleBbvaCat(),
            ])
          }
          onRemoveItem={(index) => {
            const base = resolverDetalleLiquidacionBbvaCat(liquidador).map((it) => ({ ...it }));
            base.splice(index, 1);
            setDetalle(base);
          }}
          onLiquidadoPorChange={(v) => setLiquidador((prev) => ({ ...prev, liquidadoPor: v }))}
          onAreaLiquidadorChange={(v) =>
            setLiquidador((prev) => ({ ...prev, areaLiquidador: v }))
          }
          onObservacionesChange={(v) =>
            setLiquidador((prev) => ({ ...prev, observacionesFiniquito: v }))
          }
          onAceptacionChange={(v) =>
            setLiquidador((prev) => ({ ...prev, aceptacionIndemnizacion: v }))
          }
          onDatosFiniquitoChange={(campo, valor) =>
            setLiquidador((prev) => ({
              ...prev,
              datosFiniquito: { ...(prev.datosFiniquito || {}), [campo]: valor },
            }))
          }
          onFirmaClienteChange={(v) => setLiquidador((prev) => ({ ...prev, firmaCliente: v }))}
          onNombreFirmanteChange={(v) =>
            setLiquidador((prev) => ({ ...prev, nombreFirmante: v }))
          }
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>5. {t('bbvaCat.reportUnique.sectionPhotos')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('bbvaCat.reportUnique.photosUploadHint')}
        </p>
        <FotosInspeccionZurich
          casoId={casoBbvaCat?._id}
          origen={origen}
          api={api}
          inputIdPrefix="bbva-foto"
          fotosInforme={informe.fotosInspeccion || []}
          onFotosInformeChange={(lista) => setCampo('fotosInspeccion', lista)}
          onArchivoCreado={(creado) => {
            if (creado) appendArchivosAlCaso([creado]);
            setMensaje(t('bbvaCat.reportUnique.photosUploaded', { count: 1 }));
          }}
          onArchivoEliminado={(archivoId) => {
            quitarArchivoDelCaso(archivoId);
            setMensaje(t('bbvaCat.archive.deleteOk'));
          }}
        />
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>6. {t('bbvaCat.reportUnique.sectionConclusions')}</h3>
        <Campo label={t('bbvaCat.reportUnique.conclusions')}>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
            rows={4}
            value={informe.conclusiones || ''}
            onChange={(e) => setCampo('conclusiones', e.target.value)}
          />
        </Campo>
        <div className="mt-3">
          <Campo label={t('bbvaCat.reportUnique.recommendation')}>
            <textarea
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
              rows={4}
              value={informe.recomendacion || ''}
              onChange={(e) => setCampo('recomendacion', e.target.value)}
            />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>7. {t('bbvaCat.reportUnique.sectionSignatures')}</h3>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('bbvaCat.reportUnique.signaturesHint')}
        </p>
        <SeccionFirmasActa
          formData={informe}
          onInputChange={setCampo}
          tituloAjustador={t('bbvaCat.reportUnique.signatureAdjuster')}
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
          onClick={handleWord}
        >
          <FaFileWord /> {t('bbvaCat.reportUnique.downloadWord')}
        </button>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={() => onGuardarEnCaso(informe)}
          >
            {guardandoCaso
              ? t('bbvaCat.reportUnique.saving')
              : t('bbvaCat.reportUnique.saveDraft')}
          </button>
        )}
      </div>
    </div>
  );
}
