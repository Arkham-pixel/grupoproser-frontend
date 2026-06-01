import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaComment, FaPlus, FaShieldAlt, FaTrashAlt } from 'react-icons/fa';
import MatrizSeccionTitulo from './MatrizSeccionTitulo';
import {
  matrizBtnDanger,
  matrizBtnPrimary,
  matrizCard,
  matrizInput,
  matrizLabel,
  matrizTextarea,
} from './matrizFenixUi';
import './matrizFenixTheme.css';

const GestionRiesgos = ({ datos, onDatosChange }) => {
  const [gestionRiesgos, setGestionRiesgos] = useState(() => {
    const defaultData = {
      recomendaciones: [
        {
          id: 1,
          recomendacion: '',
          fechaInicial: '',
          fechaImplementacion1: '',
          comentariosImplementacion1: '',
          fechaImplementacion2: '',
          comentariosImplementacion2: '',
        },
      ],
    };

    if (datos) {
      return {
        ...defaultData,
        ...datos,
        recomendaciones:
          datos.recomendaciones && datos.recomendaciones.length > 0
            ? datos.recomendaciones
            : defaultData.recomendaciones,
      };
    }

    return defaultData;
  });

  useEffect(() => {
    if (onDatosChange) {
      onDatosChange(gestionRiesgos);
    }
  }, [gestionRiesgos, onDatosChange]);

  const agregarRecomendacion = () => {
    setGestionRiesgos((prev) => ({
      ...prev,
      recomendaciones: [
        ...prev.recomendaciones,
        {
          id: Date.now(),
          recomendacion: '',
          fechaInicial: '',
          fechaImplementacion1: '',
          comentariosImplementacion1: '',
          fechaImplementacion2: '',
          comentariosImplementacion2: '',
        },
      ],
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

  return (
    <div className="gestion-riesgos space-y-4">
      <MatrizSeccionTitulo
        icon={FaShieldAlt}
        title="Recomendaciones de gestión"
        description="Registra las recomendaciones identificadas y su seguimiento de implementación."
      />

      <div className={`recomendaciones-section ${matrizCard}`}>
        <div className="space-y-4">
          {gestionRiesgos.recomendaciones.map((recomendacion, index) => (
            <div
              key={recomendacion.id}
              className="recomendacion-card rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/30"
            >
              <div className="recomendacion-header mb-4 flex items-center justify-between gap-2">
                <h4 className="font-heading text-sm font-bold text-gray-800 dark:text-white">
                  Recomendación #{index + 1}
                </h4>
                {gestionRiesgos.recomendaciones.length > 1 && (
                  <button
                    type="button"
                    className={matrizBtnDanger}
                    onClick={() => eliminarRecomendacion(recomendacion.id)}
                    title="Eliminar esta recomendación"
                  >
                    <FaTrashAlt />
                  </button>
                )}
              </div>

              <div className="recomendacion-form grid gap-4 sm:grid-cols-2">
                <div className="form-group-recomendacion full-width sm:col-span-2">
                  <label htmlFor={`recomendacion-${recomendacion.id}`} className={matrizLabel}>
                    Recomendación
                  </label>
                  <textarea
                    id={`recomendacion-${recomendacion.id}`}
                    value={recomendacion.recomendacion}
                    onChange={(e) =>
                      actualizarRecomendacion(recomendacion.id, 'recomendacion', e.target.value)
                    }
                    placeholder="Describe la recomendación específica para la gestión de riesgos..."
                    className={matrizTextarea}
                    rows={3}
                  />
                </div>

                <div className="form-group-recomendacion">
                  <label htmlFor={`fechaInicial-${recomendacion.id}`} className={matrizLabel}>
                    <FaCalendarAlt className="mr-1 inline text-fenix-primario" />
                    Fecha inicial
                  </label>
                  <input
                    type="date"
                    id={`fechaInicial-${recomendacion.id}`}
                    value={recomendacion.fechaInicial}
                    onChange={(e) =>
                      actualizarRecomendacion(recomendacion.id, 'fechaInicial', e.target.value)
                    }
                    className={matrizInput}
                  />
                </div>

                <div className="form-group-recomendacion">
                  <label htmlFor={`fechaImpl1-${recomendacion.id}`} className={matrizLabel}>
                    Fecha implementación 1
                  </label>
                  <input
                    type="date"
                    id={`fechaImpl1-${recomendacion.id}`}
                    value={recomendacion.fechaImplementacion1}
                    onChange={(e) =>
                      actualizarRecomendacion(
                        recomendacion.id,
                        'fechaImplementacion1',
                        e.target.value
                      )
                    }
                    className={matrizInput}
                  />
                </div>

                <div className="form-group-recomendacion sm:col-span-2">
                  <label htmlFor={`comentariosImpl1-${recomendacion.id}`} className={matrizLabel}>
                    <FaComment className="mr-1 inline text-fenix-primario" />
                    Comentarios implementación 1
                  </label>
                  <textarea
                    id={`comentariosImpl1-${recomendacion.id}`}
                    value={recomendacion.comentariosImplementacion1}
                    onChange={(e) =>
                      actualizarRecomendacion(
                        recomendacion.id,
                        'comentariosImplementacion1',
                        e.target.value
                      )
                    }
                    placeholder="Comentarios sobre la primera implementación..."
                    className={matrizTextarea}
                    rows={2}
                  />
                </div>

                <div className="form-group-recomendacion">
                  <label htmlFor={`fechaImpl2-${recomendacion.id}`} className={matrizLabel}>
                    Fecha implementación 2
                  </label>
                  <input
                    type="date"
                    id={`fechaImpl2-${recomendacion.id}`}
                    value={recomendacion.fechaImplementacion2}
                    onChange={(e) =>
                      actualizarRecomendacion(
                        recomendacion.id,
                        'fechaImplementacion2',
                        e.target.value
                      )
                    }
                    className={matrizInput}
                  />
                </div>

                <div className="form-group-recomendacion sm:col-span-2">
                  <label htmlFor={`comentariosImpl2-${recomendacion.id}`} className={matrizLabel}>
                    Comentarios implementación 2
                  </label>
                  <textarea
                    id={`comentariosImpl2-${recomendacion.id}`}
                    value={recomendacion.comentariosImplementacion2}
                    onChange={(e) =>
                      actualizarRecomendacion(
                        recomendacion.id,
                        'comentariosImplementacion2',
                        e.target.value
                      )
                    }
                    placeholder="Comentarios sobre la segunda implementación..."
                    className={matrizTextarea}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="recomendaciones-footer mt-6 flex justify-center border-t border-gray-100 pt-4 dark:border-gray-800">
          <button type="button" className={matrizBtnPrimary} onClick={agregarRecomendacion}>
            <FaPlus />
            Agregar recomendación
          </button>
        </div>
      </div>
    </div>
  );
};

export default GestionRiesgos;
