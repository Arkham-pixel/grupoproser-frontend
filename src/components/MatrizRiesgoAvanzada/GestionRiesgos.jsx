import React, { useState, useEffect, useRef } from 'react';
import { FaCalendarAlt, FaComment, FaPlus, FaShieldAlt, FaTrashAlt } from 'react-icons/fa';
import MatrizSeccionTitulo from './MatrizSeccionTitulo';
import {
  crearRecomendacionVacia,
  crearSeguimientoVacio,
  normalizarGestionRiesgos,
} from './gestionRiesgosHelpers';
import {
  matrizBtnDanger,
  matrizBtnPrimary,
  matrizBtnSecondary,
  matrizCard,
  matrizInput,
  matrizLabel,
  matrizTextarea,
} from './matrizFenixUi';
import './matrizFenixTheme.css';

const GestionRiesgos = ({ datos, onDatosChange, modoReporte = false }) => {
  const [gestionRiesgos, setGestionRiesgos] = useState(() => normalizarGestionRiesgos(datos));
  const gestionRef = useRef(gestionRiesgos);
  const onDatosChangeRef = useRef(onDatosChange);
  const ultimoEnviadoRef = useRef('');

  gestionRef.current = gestionRiesgos;
  onDatosChangeRef.current = onDatosChange;

  const notificarPadre = (next) => {
    let serializado = '';
    try {
      serializado = JSON.stringify(next ?? {});
    } catch {
      onDatosChangeRef.current?.(next);
      return;
    }
    if (serializado === ultimoEnviadoRef.current) return;
    ultimoEnviadoRef.current = serializado;
    onDatosChangeRef.current?.(next);
  };

  useEffect(() => {
    notificarPadre(gestionRiesgos);
  }, [gestionRiesgos]);

  useEffect(() => {
    return () => {
      notificarPadre(gestionRef.current);
    };
  }, []);

  const agregarRecomendacion = () => {
    setGestionRiesgos((prev) => ({
      ...prev,
      recomendaciones: [...prev.recomendaciones, crearRecomendacionVacia()],
    }));
  };

  const eliminarRecomendacion = (id) => {
    setGestionRiesgos((prev) => ({
      ...prev,
      recomendaciones: prev.recomendaciones.filter((rec) => rec.id !== id),
    }));
  };

  const actualizarRecomendacion = (id, campo, valor) => {
    setGestionRiesgos((prev) => ({
      ...prev,
      recomendaciones: prev.recomendaciones.map((rec) =>
        rec.id === id ? { ...rec, [campo]: valor } : rec
      ),
    }));
  };

  const agregarSeguimiento = (recomendacionId) => {
    setGestionRiesgos((prev) => ({
      ...prev,
      recomendaciones: prev.recomendaciones.map((rec) =>
        rec.id === recomendacionId
          ? {
              ...rec,
              seguimientos: [...(rec.seguimientos || []), crearSeguimientoVacio()],
            }
          : rec
      ),
    }));
  };

  const eliminarSeguimiento = (recomendacionId, seguimientoId) => {
    setGestionRiesgos((prev) => ({
      ...prev,
      recomendaciones: prev.recomendaciones.map((rec) => {
        if (rec.id !== recomendacionId) return rec;
        const restantes = (rec.seguimientos || []).filter((seg) => seg.id !== seguimientoId);
        return {
          ...rec,
          seguimientos: restantes.length > 0 ? restantes : [crearSeguimientoVacio()],
        };
      }),
    }));
  };

  const actualizarSeguimiento = (recomendacionId, seguimientoId, campo, valor) => {
    setGestionRiesgos((prev) => ({
      ...prev,
      recomendaciones: prev.recomendaciones.map((rec) =>
        rec.id === recomendacionId
          ? {
              ...rec,
              seguimientos: (rec.seguimientos || []).map((seg) =>
                seg.id === seguimientoId ? { ...seg, [campo]: valor } : seg
              ),
            }
          : rec
      ),
    }));
  };

  return (
    <div className="gestion-riesgos space-y-4">
      <MatrizSeccionTitulo
        icon={FaShieldAlt}
        title={'Recomendaciones de gesti\u00f3n'}
        description={'Registra cada recomendaci\u00f3n con su fecha y el seguimiento de avances.'}
      />

      <div className={`recomendaciones-section ${matrizCard}`}>
        <div className="space-y-6">
          {gestionRiesgos.recomendaciones.map((recomendacion, index) => (
            <article
              key={recomendacion.id}
              className="recomendacion-card overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#1A1A1A]"
            >
              <header className="flex items-center justify-between gap-3 border-b border-gray-100 bg-red-50/60 px-4 py-3 dark:border-gray-800 dark:bg-red-950/20 sm:px-5">
                <div className="min-w-0">
                  <p className="font-heading text-xs font-semibold uppercase tracking-wide text-fenix-primario">
                    {'Recomendaci\u00f3n '}
                    {index + 1}
                  </p>
                  <h4 className="font-heading text-sm font-bold text-gray-800 dark:text-white">
                    {'Datos de la recomendaci\u00f3n'}
                  </h4>
                </div>
                {gestionRiesgos.recomendaciones.length > 1 && !modoReporte && (
                  <button
                    type="button"
                    className={matrizBtnDanger}
                    onClick={() => eliminarRecomendacion(recomendacion.id)}
                    title={'Eliminar esta recomendaci\u00f3n'}
                  >
                    <FaTrashAlt />
                  </button>
                )}
              </header>

              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_minmax(200px,240px)]">
                  <div>
                    <label htmlFor={`recomendacion-${recomendacion.id}`} className={matrizLabel}>
                      {'Texto de la recomendaci\u00f3n'}
                    </label>
                    <textarea
                      id={`recomendacion-${recomendacion.id}`}
                      value={recomendacion.recomendacion}
                      onChange={(e) =>
                        actualizarRecomendacion(recomendacion.id, 'recomendacion', e.target.value)
                      }
                      placeholder={
                        'Describe la recomendaci\u00f3n espec\u00edfica para la gesti\u00f3n de riesgos...'
                      }
                      className={matrizTextarea}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label htmlFor={`fechaRecomendacion-${recomendacion.id}`} className={matrizLabel}>
                      <FaCalendarAlt className="mr-1 inline text-fenix-primario" />
                      {'Fecha de recomendaci\u00f3n'}
                    </label>
                    <input
                      type="date"
                      id={`fechaRecomendacion-${recomendacion.id}`}
                      value={recomendacion.fechaRecomendacion || ''}
                      onChange={(e) =>
                        actualizarRecomendacion(
                          recomendacion.id,
                          'fechaRecomendacion',
                          e.target.value
                        )
                      }
                      className={matrizInput}
                    />
                  </div>
                </div>

                <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-heading text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Seguimiento
                      </p>
                      <h5 className="font-heading text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {'Avances de la recomendaci\u00f3n '}
                        {index + 1}
                      </h5>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(recomendacion.seguimientos || []).map((seguimiento, segIndex) => (
                      <div
                        key={seguimiento.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#141414]"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="font-heading text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {'Seguimiento '}
                            {segIndex + 1}
                          </span>
                          {(recomendacion.seguimientos || []).length > 1 && !modoReporte && (
                            <button
                              type="button"
                              className={`${matrizBtnDanger} !px-2 !py-1 text-xs`}
                              onClick={() =>
                                eliminarSeguimiento(recomendacion.id, seguimiento.id)
                              }
                              title="Eliminar este seguimiento"
                            >
                              <FaTrashAlt />
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-[minmax(180px,220px)_1fr]">
                          <div>
                            <label
                              htmlFor={`fechaSeguimiento-${recomendacion.id}-${seguimiento.id}`}
                              className={matrizLabel}
                            >
                              <FaCalendarAlt className="mr-1 inline text-fenix-primario" />
                              Fecha de seguimiento
                            </label>
                            <input
                              type="date"
                              id={`fechaSeguimiento-${recomendacion.id}-${seguimiento.id}`}
                              value={seguimiento.fecha || ''}
                              onChange={(e) =>
                                actualizarSeguimiento(
                                  recomendacion.id,
                                  seguimiento.id,
                                  'fecha',
                                  e.target.value
                                )
                              }
                              className={matrizInput}
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`comentariosSeguimiento-${recomendacion.id}-${seguimiento.id}`}
                              className={matrizLabel}
                            >
                              <FaComment className="mr-1 inline text-fenix-primario" />
                              Comentarios del seguimiento
                            </label>
                            <textarea
                              id={`comentariosSeguimiento-${recomendacion.id}-${seguimiento.id}`}
                              value={seguimiento.comentarios || ''}
                              onChange={(e) =>
                                actualizarSeguimiento(
                                  recomendacion.id,
                                  seguimiento.id,
                                  'comentarios',
                                  e.target.value
                                )
                              }
                              placeholder="Detalle del avance, estado o observaciones..."
                              className={matrizTextarea}
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!modoReporte && (
                  <div className="mt-4 flex justify-center border-t border-gray-200 pt-4 dark:border-gray-700">
                    <button
                      type="button"
                      className={matrizBtnSecondary}
                      onClick={() => agregarSeguimiento(recomendacion.id)}
                    >
                      <FaPlus />
                      {'Agregar seguimiento a recomendaci\u00f3n '}
                      {index + 1}
                    </button>
                  </div>
                  )}
                </section>
              </div>
            </article>
          ))}
        </div>

        {!modoReporte && (
        <div className="recomendaciones-footer mt-6 flex justify-center border-t border-gray-100 pt-4 dark:border-gray-800">
          <button type="button" className={matrizBtnPrimary} onClick={agregarRecomendacion}>
            <FaPlus />
            {'Agregar recomendaci\u00f3n'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
};

export default GestionRiesgos;
