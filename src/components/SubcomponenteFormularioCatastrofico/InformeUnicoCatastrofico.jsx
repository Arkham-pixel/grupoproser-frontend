import React, { useEffect, useMemo, useState } from 'react';
import { FaPlus, FaTrash, FaMapMarkerAlt } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';
import {
  CLASES_INMUEBLE_CATASTROFICO,
  CLASES_TIPOS_INMUEBLE_CATASTROFICO,
  fusionarDistribucionConPlantilla,
  zonasDistribucionDesdePlantilla,
} from './distribucionInmuebleCatastrofico.js';
import {
  CATALOGO_CRONOLOGIA_CATASTROFICO,
  resolverCronologiaCatastrofico,
  buscarCronologiaPorDepartamento,
  claveDepartamentoCronologia,
} from './catalogoCronologiaCatastrofico.js';

const emptyEspacio = () => ({ espacio: '', dimensiones: '', area: '' });

function matchCatalogoIdParaDepartamento(departamento) {
  const dep = claveDepartamentoCronologia(departamento);
  if (!dep) return '';
  const hit = CATALOGO_CRONOLOGIA_CATASTROFICO.find(
    (c) => claveDepartamentoCronologia(c.departamento) === dep
  );
  return hit?.id || '';
}

function extraerLatLng(texto) {
  const parts = String(texto || '')
    .split(',')
    .map((c) => parseFloat(String(c).trim()));
  if (
    parts.length >= 2 &&
    Number.isFinite(parts[0]) &&
    Number.isFinite(parts[1])
  ) {
    return {
      latitud: parts[0].toFixed(6),
      longitud: parts[1].toFixed(6),
    };
  }
  return { latitud: '', longitud: '' };
}

export default function InformeUnicoCatastrofico({
  formData,
  onInputChange,
  onMapaChange,
}) {
  const { theme } = useTheme();
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const [forzarCapturaMapa, setForzarCapturaMapa] = useState(0);

  const inputClass =
    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide';

  const set = (name, value) => onInputChange({ target: { name, value } });

  const espacios = formData.espaciosAfectados || [];
  const distribucion = formData.distribucionInmueble || [];
  const coords = useMemo(
    () => extraerLatLng(formData.coordenadasRiesgo),
    [formData.coordenadasRiesgo]
  );

  const capturaInicial = useMemo(() => {
    const im = formData.imagenMapa;
    if (!im) return '';
    if (typeof im === 'string') return im;
    return '';
  }, [formData.imagenMapa]);

  const cronologiaActiva = useMemo(
    () => resolverCronologiaCatastrofico(formData),
    [formData]
  );

  const [cronologiaHeredada, setCronologiaHeredada] = useState(null);
  const [buscandoCronologia, setBuscandoCronologia] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const dep = String(formData.departamento || '').trim();
    // Si ya hay imagen en el form o match de catálogo, no buscar historial
    if (cronologiaActiva?.imagenUrl || !dep) {
      setCronologiaHeredada(null);
      return undefined;
    }
    setBuscandoCronologia(true);
    buscarCronologiaPorDepartamento({ departamento: dep })
      .then((res) => {
        if (!cancelled) setCronologiaHeredada(res);
      })
      .finally(() => {
        if (!cancelled) setBuscandoCronologia(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.departamento, cronologiaActiva?.imagenUrl]);

  const cronologiaMostrada = cronologiaActiva || cronologiaHeredada;

  useEffect(() => {
    if (
      cronologiaHeredada?.imagenUrl &&
      !formData.imagenCronologia &&
      !cronologiaActiva?.imagenUrl
    ) {
      set('imagenCronologia', cronologiaHeredada.imagenUrl);
      set('cronologiaCatastroficoId', cronologiaHeredada.id || 'custom-departamento');
      set(
        'cronologiaNombre',
        cronologiaHeredada.nombre || `Cronología ${formData.departamento || ''}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cronologiaHeredada?.imagenUrl]);

  const aplicarPlantillaCatalogo = (id) => {
    const item = CATALOGO_CRONOLOGIA_CATASTROFICO.find((c) => c.id === id);
    if (!item) {
      set('cronologiaCatastroficoId', '');
      set('imagenCronologia', '');
      set('cronologiaNombre', '');
      return;
    }
    set('cronologiaCatastroficoId', item.id);
    set('imagenCronologia', ''); // usa imagenUrl del catálogo vía resolver
    set('cronologiaNombre', item.nombre);
    if (!String(formData.departamento || '').trim() && item.departamento) {
      set('departamento', item.departamento);
    }
  };

  const subirCronologiaDepartamento = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      set('imagenCronologia', dataUrl);
      set('cronologiaCatastroficoId', 'custom-departamento');
      set(
        'cronologiaNombre',
        `Cronología ${formData.departamento || formData.ciudad || 'personalizada'}`
      );
      set('cronologiaLeyenda', 'Diagrama cronología de la emergencia');
    };
    reader.readAsDataURL(file);
  };

  const updateList = (name, list) => set(name, list);

  // Sin clase no hay plantilla: limpia residuos de sesiones previas (casa por defecto).
  useEffect(() => {
    if (formData.claseInmueble) return;
    if (!Array.isArray(formData.distribucionInmueble) || formData.distribucionInmueble.length === 0) {
      return;
    }
    set('distribucionInmueble', []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapaChangeInterno = (info) => {
    if (typeof onMapaChange === 'function') {
      onMapaChange(info);
      return;
    }
    if (info?.lat != null && info?.lng != null) {
      set('coordenadasRiesgo', `${info.lat}, ${info.lng}`);
    } else if (info?.coordenadas) {
      if (typeof info.coordenadas === 'string') {
        set('coordenadasRiesgo', info.coordenadas);
      } else if (info.coordenadas.lat != null && info.coordenadas.lng != null) {
        set(
          'coordenadasRiesgo',
          `${info.coordenadas.lat}, ${info.coordenadas.lng}`
        );
      }
    }
    const img = info?.imagenMapa || info?.imagen;
    if (img) set('imagenMapa', img);
    if (info?.direccion && !String(formData.direccionRiesgo || '').trim()) {
      set('direccionRiesgo', info.direccion);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-4" style={{ borderColor, backgroundColor: cardBg }}>
        <h2 className="mb-3 text-lg font-semibold" style={{ color: textPrimary }}>
          Datos del informe único
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['ciudad', 'Ciudad'],
            ['departamento', 'Departamento'],
            ['destinatario', 'Atención (Atn)'],
            ['cargo', 'Cargo'],
            ['aseguradora', 'Compañía'],
            ['ciudadDestino', 'Ciudad destino'],
            ['funcionarioAsigna', 'Funcionario que asigna'],
            ['tomador', 'Tomador'],
            ['vigenciaPoliza', 'Vigencia'],
            ['asegurado', 'Asegurado'],
            ['identificacionActa', 'Identificación'],
            ['direccionRiesgo', 'Dirección riesgo asegurado'],
            ['ubicacionRiesgo', 'Ubicación riesgo afectado'],
            ['tipoEvento', 'Tipo de evento'],
            ['numeroSiniestro', 'Siniestro No.'],
            ['numeroCaso', 'Reporte / No. ajuste'],
            ['fechaOcurrencia', 'Fecha de ocurrencia', 'date'],
            ['fechaAsignacion', 'Fecha de asignación', 'date'],
            ['fechaInspeccion', 'Fecha de visita', 'date'],
            ['areaLote', 'Área lote (m2)'],
            ['nivelesInmueble', 'Niveles'],
          ].map(([name, label, type = 'text']) => (
            <label key={name} className="block">
              <span className={labelClass} style={{ color: textSecondary }}>
                {label}
              </span>
              <input
                type={type}
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={formData[name] ?? ''}
                onChange={(e) => set(name, e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ borderColor, backgroundColor: cardBg }}>
        <h2 className="mb-3 text-lg font-semibold" style={{ color: textPrimary }}>
          Antecedentes
        </h2>
        <textarea
          rows={5}
          className={inputClass}
          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
          value={formData.antecedentes || ''}
          onChange={(e) => set('antecedentes', e.target.value)}
        />
      </section>

      <section className="rounded-xl border p-4" style={{ borderColor, backgroundColor: cardBg }}>
        <h2 className="mb-3 text-lg font-semibold" style={{ color: textPrimary }}>
          Circunstancia del siniestro
        </h2>
        <textarea
          rows={5}
          className={inputClass}
          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
          value={formData.circunstanciasSiniestro || formData.descripcionSiniestro || ''}
          onChange={(e) => set('circunstanciasSiniestro', e.target.value)}
        />

        <div className="mt-4 rounded-xl border p-3" style={{ borderColor }}>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: textPrimary }}>
            Diagrama de cronología (varía por departamento / catastrófico)
          </h3>
          <p className="mb-3 text-xs" style={{ color: textSecondary }}>
            La imagen depende del departamento del evento. Córdoba usa la plantilla del Río Sinú;
            otros departamentos usan su propia imagen (catálogo o la del primer caso guardado allí).
          </p>

          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass} style={{ color: textSecondary }}>
                Departamento del catastrófico
              </span>
              <input
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={formData.departamento || ''}
                onChange={(e) => {
                  set('departamento', e.target.value);
                  // Al cambiar de departamento, no arrastrar imagen de otro
                  const depNuevo = claveDepartamentoCronologia(e.target.value);
                  const depImg = claveDepartamentoCronologia(
                    cronologiaMostrada?.departamento
                  );
                  if (depNuevo && depImg && depNuevo !== depImg) {
                    set('imagenCronologia', '');
                    set('cronologiaCatastroficoId', '');
                    set('cronologiaNombre', '');
                  }
                }}
                placeholder="Ej. Córdoba, La Guajira, Atlántico…"
              />
            </label>
            <label className="block">
              <span className={labelClass} style={{ color: textSecondary }}>
                Plantilla de catálogo (si existe)
              </span>
              <select
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={
                  formData.cronologiaCatastroficoId &&
                  formData.cronologiaCatastroficoId !== 'custom-departamento'
                    ? formData.cronologiaCatastroficoId
                    : matchCatalogoIdParaDepartamento(formData.departamento) || ''
                }
                onChange={(e) => aplicarPlantillaCatalogo(e.target.value)}
              >
                <option value="">— Sin plantilla de catálogo —</option>
                {CATALOGO_CRONOLOGIA_CATASTROFICO.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.departamento}: {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              Subir / fijar imagen de este departamento
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={subirCronologiaDepartamento}
              />
            </label>
            {formData.imagenCronologia ? (
              <button
                type="button"
                className="rounded-lg border px-3 py-2 text-xs font-semibold"
                style={{ borderColor, color: textPrimary }}
                onClick={() => {
                  set('imagenCronologia', '');
                  set('cronologiaCatastroficoId', '');
                  set('cronologiaNombre', '');
                }}
              >
                Quitar imagen fijada
              </button>
            ) : null}
          </div>

          {buscandoCronologia ? (
            <p className="text-xs" style={{ color: textSecondary }}>
              Buscando cronología previa de este departamento…
            </p>
          ) : null}

          {cronologiaMostrada?.imagenUrl ? (
            <div className="overflow-hidden rounded-lg border" style={{ borderColor }}>
              <img
                src={cronologiaMostrada.imagenUrl}
                alt={cronologiaMostrada.nombre}
                className="max-h-80 w-full object-contain bg-white"
              />
              <p className="px-2 py-1 text-center text-xs font-semibold" style={{ color: textSecondary }}>
                {cronologiaMostrada.leyenda || 'Diagrama cronología de la emergencia'}
                {cronologiaMostrada.departamento
                  ? ` · ${cronologiaMostrada.departamento}`
                  : ''}
                {cronologiaMostrada.origen === 'historial'
                  ? ' · heredada del primer caso del departamento'
                  : cronologiaMostrada.origen === 'formulario'
                    ? ' · fijada en este caso'
                    : cronologiaMostrada.origen === 'catalogo' ||
                        cronologiaMostrada.origen === 'departamento' ||
                        cronologiaMostrada.origen === 'alias'
                      ? ' · plantilla de catálogo'
                      : ''}
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-4 text-sm" style={{ borderColor, color: textSecondary }}>
              No hay cronología para{' '}
              <strong style={{ color: textPrimary }}>
                {formData.departamento || 'este departamento'}
              </strong>
              . Sube la infografía del evento para fijarla; los próximos casos del mismo
              departamento la reutilizarán.
            </p>
          )}
        </div>

        <label className="mt-3 block">
          <span className={labelClass} style={{ color: textSecondary }}>
            Nota adicional sobre la cronología (opcional)
          </span>
          <textarea
            rows={2}
            className={inputClass}
            style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
            value={formData.diagramaCronologiaNota || ''}
            onChange={(e) => set('diagramaCronologiaNota', e.target.value)}
          />
        </label>
      </section>

      <section className="rounded-xl border p-4" style={{ borderColor, backgroundColor: cardBg }}>
        <h2 className="mb-3 text-lg font-semibold" style={{ color: textPrimary }}>
          Descripción de los daños y/o perjuicios
        </h2>
        <textarea
          rows={5}
          className={inputClass}
          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
          value={formData.descripcionDanios || formData.descripcionRiesgo || ''}
          onChange={(e) => set('descripcionDanios', e.target.value)}
          placeholder="Ubicación del riesgo, tipología constructiva, estado previo, hallazgos de la visita…"
        />

        <div className="mt-4 rounded-xl border p-3" style={{ borderColor }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaMapMarkerAlt className="text-blue-600" />
              Ubicación del riesgo (mapa + coordenadas)
            </h3>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => setForzarCapturaMapa((n) => n + 1)}
            >
              Actualizar captura
            </button>
          </div>
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass} style={{ color: textSecondary }}>
                Latitud
              </span>
              <input
                readOnly
                className={`${inputClass} font-mono`}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={coords.latitud}
                placeholder="Se llena desde el mapa"
              />
            </label>
            <label className="block">
              <span className={labelClass} style={{ color: textSecondary }}>
                Longitud
              </span>
              <input
                readOnly
                className={`${inputClass} font-mono`}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                value={coords.longitud}
                placeholder="Se llena desde el mapa"
              />
            </label>
          </div>
          <label className="mb-3 block">
            <span className={labelClass} style={{ color: textSecondary }}>
              Coordenadas (texto)
            </span>
            <input
              className={`${inputClass} font-mono`}
              style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
              value={formData.coordenadasRiesgo || ''}
              onChange={(e) => set('coordenadasRiesgo', e.target.value)}
              placeholder="8.760470, -75.902449"
            />
          </label>
          <div className="min-h-[320px] overflow-hidden rounded-lg">
            <MapaGoogleEarth
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              coordenadasIniciales={formData.coordenadasRiesgo}
              direccionInicial={formData.direccionRiesgo}
              capturaInicial={capturaInicial || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={handleMapaChangeInterno}
            />
          </div>
          {capturaInicial ? (
            <p className="mt-2 text-xs" style={{ color: textSecondary }}>
              Captura lista para el Word (se inserta en «Descripción de los daños» como «Ubicación del riesgo»).
            </p>
          ) : (
            <p className="mt-2 text-xs" style={{ color: textSecondary }}>
              Mueve el marcador o busca la dirección; la captura se genera automáticamente para el informe.
            </p>
          )}
        </div>

        <h3 className="mb-2 mt-4 text-sm font-semibold" style={{ color: textPrimary }}>
          Distribución del inmueble
        </h3>
        <p className="mb-3 text-xs" style={{ color: textSecondary }}>
          Elige clase y tipo (igual que Propiedades). Las zonas se ajustan solas; puedes agregar o
          quitar filas.
        </p>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass} style={{ color: textSecondary }}>
              Clase de inmueble
            </span>
            <select
              className={inputClass}
              style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
              value={formData.claseInmueble || ''}
              onChange={(e) => {
                const clase = e.target.value;
                const nextZonas = clase
                  ? fusionarDistribucionConPlantilla(distribucion, clase, '')
                  : [];
                onInputChange({
                  claseInmueble: clase,
                  tipoInmueble: '',
                  distribucionInmueble: nextZonas,
                });
              }}
            >
              <option value="">— Seleccionar clase —</option>
              {CLASES_INMUEBLE_CATASTROFICO.map((clase) => (
                <option key={clase} value={clase}>
                  {clase}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass} style={{ color: textSecondary }}>
              Tipo de inmueble
            </span>
            <select
              className={inputClass}
              style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
              value={formData.tipoInmueble || ''}
              disabled={!formData.claseInmueble}
              onChange={(e) => {
                const tipo = e.target.value;
                onInputChange({
                  tipoInmueble: tipo,
                  distribucionInmueble: fusionarDistribucionConPlantilla(
                    distribucion,
                    formData.claseInmueble,
                    tipo
                  ),
                });
              }}
            >
              <option value="">
                {formData.claseInmueble
                  ? '— Seleccionar tipo —'
                  : 'Seleccione primero la clase'}
              </option>
              {(CLASES_TIPOS_INMUEBLE_CATASTROFICO[formData.claseInmueble] || []).map(
                (tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                )
              )}
            </select>
          </label>
        </div>
        {formData.claseInmueble ? (
          <p className="mb-2 text-xs" style={{ color: textSecondary }}>
            Plantilla:{' '}
            <strong style={{ color: textPrimary }}>
              {formData.claseInmueble}
              {formData.tipoInmueble ? ` · ${formData.tipoInmueble}` : ''}
            </strong>
          </p>
        ) : null}
        <div className="space-y-2">
          {!formData.claseInmueble && distribucion.length === 0 ? (
            <p className="text-xs" style={{ color: textSecondary }}>
              Selecciona una clase para cargar zonas, o agrega una zona manualmente.
            </p>
          ) : null}
          {distribucion.map((row, i) => (
            <div
              key={row.areaId ? `${row.areaId}-${i}` : `zona-${i}`}
              className="grid grid-cols-[1fr_120px_40px] gap-2"
            >
              <input
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                placeholder="Zona"
                value={row.zona || ''}
                onChange={(e) => {
                  const next = [...distribucion];
                  next[i] = { ...next[i], zona: e.target.value, areaId: '' };
                  updateList('distribucionInmueble', next);
                }}
              />
              <input
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                placeholder="Cant."
                value={row.cantidad || ''}
                onChange={(e) => {
                  const next = [...distribucion];
                  next[i] = { ...next[i], cantidad: e.target.value };
                  updateList('distribucionInmueble', next);
                }}
              />
              <button
                type="button"
                className="text-red-600"
                onClick={() =>
                  updateList(
                    'distribucionInmueble',
                    distribucion.filter((_, idx) => idx !== i)
                  )
                }
              >
                <FaTrash />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            onClick={() =>
              onInputChange({
                distribucionInmueble: [
                  ...(formData.distribucionInmueble || []),
                  { zona: '', cantidad: '', areaId: '' },
                ],
              })
            }
          >
            <FaPlus /> Agregar zona
          </button>
          {formData.claseInmueble ? (
            <button
              type="button"
              className="ml-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
              onClick={() =>
                updateList(
                  'distribucionInmueble',
                  zonasDistribucionDesdePlantilla(
                    formData.claseInmueble,
                    formData.tipoInmueble
                  )
                )
              }
            >
              Restablecer zonas de la plantilla
            </button>
          ) : null}
        </div>

        <h3 className="mb-2 mt-4 text-sm font-semibold" style={{ color: textPrimary }}>
          Secciones internas afectadas
        </h3>
        <div className="space-y-2">
          {espacios.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_100px_40px] gap-2">
              <input
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                placeholder="Espacio"
                value={row.espacio || ''}
                onChange={(e) => {
                  const next = [...espacios];
                  next[i] = { ...next[i], espacio: e.target.value };
                  updateList('espaciosAfectados', next);
                }}
              />
              <input
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                placeholder="Dimensiones"
                value={row.dimensiones || ''}
                onChange={(e) => {
                  const next = [...espacios];
                  next[i] = { ...next[i], dimensiones: e.target.value };
                  updateList('espaciosAfectados', next);
                }}
              />
              <input
                className={inputClass}
                style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
                placeholder="Área m2"
                value={row.area || ''}
                onChange={(e) => {
                  const next = [...espacios];
                  next[i] = { ...next[i], area: e.target.value };
                  updateList('espaciosAfectados', next);
                }}
              />
              <button
                type="button"
                className="text-red-600"
                onClick={() =>
                  updateList(
                    'espaciosAfectados',
                    espacios.filter((_, idx) => idx !== i)
                  )
                }
              >
                <FaTrash />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            onClick={() => updateList('espaciosAfectados', [...espacios, emptyEspacio()])}
          >
            <FaPlus /> Agregar espacio
          </button>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ borderColor, backgroundColor: cardBg }}>
        <h2 className="mb-3 text-lg font-semibold" style={{ color: textPrimary }}>
          Observaciones
        </h2>
        <textarea
          rows={4}
          className={inputClass}
          style={{ backgroundColor: inputBg, borderColor, color: textPrimary }}
          value={formData.observacionesInforme || formData.actaObservaciones || ''}
          onChange={(e) => set('observacionesInforme', e.target.value)}
        />
      </section>
    </div>
  );
}
