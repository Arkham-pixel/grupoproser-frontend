import React from 'react';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { expressBtnSecondary } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import MapaGoogleEarth from '../MapaGoogleEarth.jsx';
import FotosInspeccionAlfa from './FotosInspeccionAlfa.jsx';
import { INDICADORES_FRAUDE_ALFA } from './generarInformeCatAlfaExcel.js';
import {
  alfaCatCell,
  alfaCatFraudHead,
  alfaCatHeaderGreen,
  alfaCatInput,
  alfaCatLabelGreen,
  alfaCatShell,
  alfaCatTextarea,
} from './alfaCatFormUi.js';

function Fila({ label, children, tall = false }) {
  return (
    <div className={`grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 md:grid-cols-[220px_1fr] ${tall ? '' : ''}`}>
      <div className={`${alfaCatLabelGreen} ${tall ? 'md:items-start md:pt-3' : ''}`}>{label}</div>
      <div className={alfaCatCell}>{children}</div>
    </div>
  );
}

/**
 * Formulario en pantalla que replica la hoja ANALISIS GENERAL del Excel CAT Alfa.
 * En UBICACIÓN se muestra el mapa de Google + captura.
 */
export default function AnalisisCoberturaCriteriaAlfa({
  analisis = {},
  coordenadasRiesgo = '',
  direccionRiesgo = '',
  imagenMapa = '',
  forzarCapturaMapa = 0,
  onAnalisisChange,
  onIndicadorFraudeChange,
  onMapaChange,
  onForzarCaptura,
  onCoordenadasChange,
  fotosInspeccion = [],
  onFotosChange,
  casoId,
  onArchivoCreado,
  onArchivoEliminado,
}) {
  const set = (campo, valor) => onAnalisisChange?.(campo, valor);
  const captura = typeof imagenMapa === 'string' ? imagenMapa : '';

  const marcarFraude = (key, nivel, valorDefault) => {
    onIndicadorFraudeChange?.(key, { nivel, valor: valorDefault });
  };

  return (
    <div className={alfaCatShell}>
      <div className={alfaCatHeaderGreen}>Análisis cobertura criteria</div>

      <Fila label="Ubicación del evento" tall>
        <div className="flex flex-col items-center gap-3 p-2 text-center">
          <input
            className={`${alfaCatInput} w-full max-w-3xl text-center`}
            value={analisis.ubicacionEvento || ''}
            onChange={(e) => set('ubicacionEvento', e.target.value)}
            placeholder="Dirección / ciudad del evento"
          />
          <input
            className={`${alfaCatInput} w-full max-w-md text-center font-mono text-xs`}
            value={coordenadasRiesgo || ''}
            onChange={(e) => onCoordenadasChange?.(e.target.value)}
            placeholder="Latitud, longitud"
          />
          {captura ? (
            <figure className="mx-auto w-full max-w-[520px]">
              <img
                src={captura}
                alt="Captura mapa ubicación del evento"
                className="mx-auto max-h-[280px] w-full rounded border border-gray-200 object-contain dark:border-gray-700"
              />
            </figure>
          ) : null}
          <div className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 text-left dark:border-gray-800">
            <span className="inline-flex items-center gap-2 font-body text-xs font-semibold text-gray-700 dark:text-gray-200">
              <FaMapMarkerAlt className="text-[#1F5C3A]" />
              Mapa Google (foto de ubicación)
            </span>
            <button type="button" className={expressBtnSecondary} onClick={() => onForzarCaptura?.()}>
              Actualizar captura
            </button>
          </div>
          <div className="min-h-[280px] w-full max-w-3xl overflow-hidden rounded border border-gray-200 dark:border-gray-700">
            <MapaGoogleEarth
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              coordenadasIniciales={coordenadasRiesgo}
              direccionInicial={direccionRiesgo || analisis.ubicacionEvento || ''}
              capturaInicial={captura || undefined}
              forzarCaptura={forzarCapturaMapa}
              onMapaChange={onMapaChange}
            />
          </div>
          {!captura ? (
            <p className="font-body text-xs text-gray-500">
              Mueva el pin o pulse «Actualizar captura» para guardar la foto del mapa en ubicación.
            </p>
          ) : null}
        </div>
      </Fila>

      <Fila label="Coaseguro">
        <input
          className={alfaCatInput}
          value={analisis.coaseguro || ''}
          onChange={(e) => set('coaseguro', e.target.value)}
        />
      </Fila>

      <Fila label="Descripción del evento" tall>
        <textarea
          className={alfaCatTextarea}
          rows={5}
          value={analisis.descripcionEvento || ''}
          onChange={(e) => set('descripcionEvento', e.target.value)}
        />
      </Fila>

      <Fila label="Causa del evento">
        <input
          className={alfaCatInput}
          value={analisis.causaEvento || ''}
          onChange={(e) => set('causaEvento', e.target.value)}
        />
      </Fila>

      <Fila label="Fecha de asignación">
        <input
          type="date"
          className={alfaCatInput}
          value={analisis.fechaAsignacion || ''}
          onChange={(e) => set('fechaAsignacion', e.target.value)}
        />
      </Fila>

      <Fila label="Fecha último documento">
        <input
          type="date"
          className={alfaCatInput}
          value={analisis.fechaUltimoDocumento || ''}
          onChange={(e) => set('fechaUltimoDocumento', e.target.value)}
        />
      </Fila>

      <Fila label="Aplicación de exclusiones">
        <input
          className={alfaCatInput}
          value={analisis.aplicacionExclusiones || ''}
          onChange={(e) => set('aplicacionExclusiones', e.target.value)}
        />
      </Fila>

      <Fila label="Cumplimiento de garantías">
        <input
          className={alfaCatInput}
          value={analisis.cumplimientoGarantias || ''}
          onChange={(e) => set('cumplimientoGarantias', e.target.value)}
        />
      </Fila>

      <Fila label="Salvamento">
        <input
          className={alfaCatInput}
          value={analisis.salvamento || ''}
          onChange={(e) => set('salvamento', e.target.value)}
        />
      </Fila>

      <div className="grid grid-cols-1 border-b border-gray-300 dark:border-gray-600 md:grid-cols-[220px_1fr]">
        <div className={`${alfaCatLabelGreen} md:items-start md:pt-3`}>Indicador fraude</div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className={`${alfaCatFraudHead} text-left`}>Indicador</th>
                <th className={alfaCatFraudHead}>Bajo</th>
                <th className={alfaCatFraudHead}>Medio</th>
                <th className={alfaCatFraudHead}>Alto</th>
              </tr>
            </thead>
            <tbody>
              {INDICADORES_FRAUDE_ALFA.map((ind) => {
                const data = analisis.indicadoresFraude?.[ind.key] || {};
                const nivel = String(data.nivel || ind.defaultNivel).toUpperCase();
                const valor = data.valor != null ? data.valor : ind.defaultValor;
                return (
                  <tr key={ind.key} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-2 py-2 font-body text-xs text-gray-800 dark:text-gray-100">
                      {ind.label}
                    </td>
                    {['BAJO', 'MEDIO', 'ALTO'].map((n) => (
                      <td key={n} className="border-l border-gray-200 px-1 py-1 text-center dark:border-gray-700">
                        <button
                          type="button"
                          className={`min-h-[36px] min-w-[52px] rounded font-body text-sm font-bold ${
                            nivel === n
                              ? 'bg-[#C6E0B4] text-gray-900 dark:bg-[#2F5D3A] dark:text-white'
                              : 'bg-white text-gray-400 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'
                          }`}
                          onClick={() => marcarFraude(ind.key, n, valor || ind.defaultValor)}
                          title={`Marcar ${n}`}
                        >
                          {nivel === n ? valor || 'X' : ''}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-gray-200 px-2 py-2 dark:border-gray-700">
            <p className="mb-1 font-body text-[11px] text-gray-500">
              Valor de la celda marcada (X, N/A, NO, SÍ…):
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {INDICADORES_FRAUDE_ALFA.map((ind) => {
                const data = analisis.indicadoresFraude?.[ind.key] || {};
                return (
                  <label key={`val-${ind.key}`} className="flex flex-col gap-0.5">
                    <span className="truncate font-body text-[10px] text-gray-500">{ind.label}</span>
                    <input
                      className="rounded border border-gray-200 px-2 py-1 font-body text-xs dark:border-gray-700 dark:bg-gray-900"
                      value={data.valor != null ? data.valor : ind.defaultValor}
                      onChange={(e) =>
                        onIndicadorFraudeChange?.(ind.key, {
                          nivel: data.nivel || ind.defaultNivel,
                          valor: e.target.value,
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Fila label="Posibilidad de recobro">
        <input
          className={alfaCatInput}
          value={analisis.posibilidadRecobro || ''}
          onChange={(e) => set('posibilidadRecobro', e.target.value)}
        />
      </Fila>

      <Fila label="Observaciones" tall>
        <textarea
          className={alfaCatTextarea}
          rows={3}
          value={analisis.observaciones || ''}
          onChange={(e) => set('observaciones', e.target.value)}
        />
      </Fila>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
        <div className={`${alfaCatLabelGreen} md:items-start md:pt-3`}>Anexos</div>
        <div className={`${alfaCatCell} min-h-[200px] p-3`}>
          <p className="mb-3 font-body text-xs text-gray-500">
            Fotos de inspección (salen en ANEXOS del Excel CAT).
          </p>
          <FotosInspeccionAlfa
            casoId={casoId}
            fotosInforme={fotosInspeccion || []}
            onFotosInformeChange={onFotosChange}
            onArchivoCreado={onArchivoCreado}
            onArchivoEliminado={onArchivoEliminado}
          />
        </div>
      </div>
    </div>
  );
}
