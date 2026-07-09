import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';
import Loader from './Loader';
import { obtenerMisAlertas } from '../services/alertasComplexService.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
  complexSectionTitle,
} from './SubcomponenteCompex/complexFenixUi.js';
import { ComplexPageHeader } from './SubcomponenteCompex/ComplexUiBlocks.jsx';

function TarjetaAlerta({ alerta }) {
  const esAlta = alerta.prioridad === 'ALTA';
  return (
    <div
      className={`rounded-lg border-l-4 p-3 ${
        esAlta
          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
          : 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
      }`}
    >
      <p className={`text-sm font-medium ${esAlta ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
        {alerta.mensaje}
      </p>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{alerta.accion}</p>
    </div>
  );
}

const MisAlertasComplex = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = () => {
    setLoading(true);
    setError(null);
    obtenerMisAlertas()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirCaso = (caso) => {
    navigate('/complex/editar', {
      state: {
        initialData: { _id: caso.casoId, nmroAjste: caso.numeroAjuste },
        returnPath: '/complex/indicadores-alertas?tab=alertas',
      },
    });
  };

  if (loading) {
    return embedded ? <Loader /> : (
      <div className={complexDashboardRoot}>
        <Loader />
      </div>
    );
  }

  const contenido = (
    <>
        {!embedded && (
          <ComplexPageHeader
            badge="Complex"
            title="Mis alertas de gestión"
            subtitle="Vencimientos y seguimientos según el protocolo vigente. Solo casos asignados a usted desde octubre 2025."
            activePath="/complex/indicadores-alertas"
          />
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={cargar} className="ml-3 underline">
              Reintentar
            </button>
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
            <p className="text-xs text-gray-500">Casos activos</p>
            <p className="text-2xl font-bold">{data?.totalCasos ?? 0}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs text-amber-700 dark:text-amber-400">Con alertas</p>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
              {data?.casosConAlertas ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
            <p className="text-xs text-gray-500">Total alertas</p>
            <p className="text-2xl font-bold">{data?.totalAlertas ?? 0}</p>
          </div>
        </div>

        <section>
          <h2 className={complexSectionTitle}>Casos que requieren atención</h2>

          {!data?.casos?.length ? (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-[#1A1A1A]">
              <p className="text-lg font-medium text-gray-800 dark:text-gray-200">Sin alertas pendientes</p>
              <p className="mt-2 text-sm text-gray-500">Sus casos están al día según el protocolo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.casos.map((caso) => (
                <article
                  key={caso.casoId}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <FaExclamationTriangle className="text-fenix-primario" />
                        <h3 className="font-semibold">Caso {caso.numeroAjuste}</h3>
                        <span className="text-xs text-gray-500">
                          Siniestro {caso.numeroSiniestro || '—'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {caso.asegurado || 'Sin asegurado'} · {caso.alertas.length} alerta(s)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirCaso(caso)}
                      className="shrink-0 rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Abrir caso
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {caso.alertas.map((alerta, i) => (
                      <TarjetaAlerta key={`${alerta.tipo}-${i}`} alerta={alerta} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 text-xs text-gray-500">
          Las alertas usan el protocolo vigente desde octubre 2025. En esperas de terceros (fecha de
          inspección, documentos, autorización de compañía, pago) la primera alerta se envía tras 10
          días hábiles (festivos Colombia).
        </p>
    </>
  );

  if (embedded) return contenido;

  return (
    <div className={complexDashboardRoot}>
      <div className={`${complexScope} ${complexDashboardWrap}`}>
        {contenido}
      </div>
    </div>
  );
};

export default MisAlertasComplex;
