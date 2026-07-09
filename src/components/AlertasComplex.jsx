import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaSync } from 'react-icons/fa';
import Loader from './Loader';
import {
  enviarAlertasAjustador,
  enviarAlertasTodos,
  obtenerResumenAlertas,
  obtenerTodasAlertas,
} from '../services/alertasComplexService.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
  complexSectionTitle,
} from './SubcomponenteCompex/complexFenixUi.js';
import {
  ComplexAvisoModal,
  ComplexFilterSection,
  ComplexPageHeader,
  SelectFenix,
} from './SubcomponenteCompex/ComplexUiBlocks.jsx';

function TarjetaAlerta({ alerta }) {
  const esAlta = alerta.prioridad === 'ALTA';
  const esMedia = alerta.prioridad === 'MEDIA';
  return (
    <div
      className={`rounded-lg border-l-4 p-3 ${
        esAlta
          ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
          : esMedia
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
            : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            className={`text-sm font-medium ${
              esAlta
                ? 'text-red-800 dark:text-red-300'
                : esMedia
                  ? 'text-amber-800 dark:text-amber-300'
                  : 'text-yellow-800 dark:text-yellow-300'
            }`}
          >
            {alerta.mensaje}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{alerta.accion}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            esAlta
              ? 'bg-red-100 text-red-800'
              : esMedia
                ? 'bg-amber-100 text-amber-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {alerta.prioridad}
        </span>
      </div>
    </div>
  );
}

export default function AlertasComplex() {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState('TODAS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [modal, setModal] = useState(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumenData, alertasData] = await Promise.all([
        obtenerResumenAlertas(),
        obtenerTodasAlertas(),
      ]);
      setResumen(resumenData);
      setAlertas(alertasData);
    } catch (e) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirCaso = (caso) => {
    navigate('/complex/editar', {
      state: {
        initialData: { _id: caso.casoId, nmroAjste: caso.numeroAjuste },
        returnPath: '/complex/alertas',
      },
    });
  };

  const enviarEmail = async (codigoResponsable) => {
    try {
      const data = await enviarAlertasAjustador(codigoResponsable);
      setModal({
        tipo: data.success ? 'success' : 'error',
        titulo: data.success ? 'Correo enviado' : 'Error',
        mensaje: data.success
          ? `Alertas enviadas a ${codigoResponsable}`
          : data.message || 'No se pudo enviar el correo',
      });
    } catch {
      setModal({ tipo: 'error', titulo: 'Error', mensaje: 'Error de conexión al enviar alertas' });
    }
  };

  const confirmarEnviarTodos = () => {
    setModal({
      tipo: 'confirmacion',
      titulo: 'Enviar alertas a todos',
      mensaje: '¿Enviar correos de alerta a todos los ajustadores con casos pendientes?',
      onConfirm: async () => {
        setModal(null);
        setLoading(true);
        try {
          const data = await enviarAlertasTodos();
          setModal({
            tipo: data.success ? 'success' : 'error',
            titulo: data.success ? 'Envío completado' : 'Error',
            mensaje: data.success
              ? `Alertas enviadas a ${data.data?.totalEnviados ?? 0} ajustador(es)`
              : data.message,
          });
          if (data.success) cargar();
        } catch {
          setModal({ tipo: 'error', titulo: 'Error', mensaje: 'Error de conexión' });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const alertasFiltradas = useMemo(() => {
    if (!alertas) return [];
    let filtradas = alertas.ajustadores.flatMap((ajustador) =>
      ajustador.casos.map((caso) => ({
        ...caso,
        ajustador: ajustador.ajustador,
      }))
    );
    if (filtroPrioridad !== 'TODAS') {
      filtradas = filtradas.filter((caso) =>
        caso.alertas.some((a) => a.prioridad === filtroPrioridad)
      );
    }
    if (filtroTipo !== 'TODOS') {
      filtradas = filtradas.filter((caso) =>
        caso.alertas.some((a) => a.tipo === filtroTipo)
      );
    }
    return filtradas;
  }, [alertas, filtroPrioridad, filtroTipo]);

  const tiposUnicos = useMemo(() => {
    if (!alertas) return [];
    const tipos = new Set();
    alertas.ajustadores.forEach((aj) => {
      aj.casos.forEach((c) => c.alertas.forEach((a) => tipos.add(a.tipo)));
    });
    return Array.from(tipos).sort();
  }, [alertas]);

  const prioridadesUnicas = useMemo(() => {
    if (!alertas) return [];
    const p = new Set();
    alertas.ajustadores.forEach((aj) => {
      aj.casos.forEach((c) => c.alertas.forEach((a) => p.add(a.prioridad)));
    });
    return Array.from(p).sort();
  }, [alertas]);

  if (loading && !alertas) {
    return (
      <div className={complexDashboardRoot}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={complexDashboardRoot}>
      <div className={`${complexScope} ${complexDashboardWrap}`}>
        <ComplexPageHeader
          badge="Complex · Soporte"
          title="Sistema de alertas"
          subtitle="Monitoreo global según el protocolo de tiempos. Los ajustadores ven sus alertas en Mis alertas."
          activePath="/complex/alertas"
          actions={
            <>
              <button
                type="button"
                onClick={confirmarEnviarTodos}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                <FaEnvelope />
                Enviar a todos
              </button>
              <button
                type="button"
                onClick={cargar}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium dark:border-gray-700"
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                Actualizar
              </button>
            </>
          }
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={cargar} className="ml-3 underline">
              Reintentar
            </button>
          </div>
        )}

        {resumen && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Ajustadores', value: resumen.totalAjustadores },
              { label: 'Con alertas', value: resumen.ajustadoresConAlertas },
              { label: 'Casos críticos', value: resumen.casosCriticos },
              { label: 'Total alertas', value: resumen.totalAlertas },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]"
              >
                <p className="text-xs text-gray-500">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        <ComplexFilterSection title="Filtros">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Prioridad</span>
              <SelectFenix
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
              >
                <option value="TODAS">Todas</option>
                {prioridadesUnicas.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </SelectFenix>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Tipo</span>
              <SelectFenix value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="TODOS">Todos</option>
                {tiposUnicos.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </SelectFenix>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setFiltroPrioridad('TODAS');
                  setFiltroTipo('TODOS');
                }}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-gray-700"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </ComplexFilterSection>

        <section className="mt-6">
          <h2 className={complexSectionTitle}>Alertas ({alertasFiltradas.length})</h2>

          {alertasFiltradas.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-[#1A1A1A]">
              <p className="font-medium">No hay alertas con los filtros actuales</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alertasFiltradas.map((caso, index) => (
                <article
                  key={`${caso.casoId}-${index}`}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">Caso {caso.numeroAjuste}</h3>
                        <span className="text-xs text-gray-500">
                          Siniestro {caso.numeroSiniestro || '—'}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                          {caso.ajustador}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {caso.asegurado || 'Sin asegurado'} · {caso.estado || '—'}
                      </p>
                      <div className="mt-3 space-y-2">
                        {caso.alertas.map((alerta, i) => (
                          <TarjetaAlerta key={`${alerta.tipo}-${i}`} alerta={alerta} />
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => enviarEmail(caso.ajustador)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                      >
                        Enviar correo
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirCaso(caso)}
                        className="rounded-lg bg-fenix-primario px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Abrir caso
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {resumen?.topAjustadores?.length > 0 && (
          <section className="mt-8">
            <h2 className={complexSectionTitle}>Ajustadores con más alertas</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resumen.topAjustadores.map((aj, index) => (
                <div
                  key={aj.codigo}
                  className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#1A1A1A]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      #{index + 1} {aj.codigo}
                    </span>
                    <button
                      type="button"
                      onClick={() => enviarEmail(aj.codigo)}
                      className="text-sm text-fenix-primario underline"
                    >
                      Enviar
                    </button>
                  </div>
                  <dl className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between">
                      <dt>Casos con alertas</dt>
                      <dd className="font-medium">{aj.casosConAlertas}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Críticos</dt>
                      <dd className="font-medium text-red-600">{aj.casosCriticos}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-6 text-xs text-gray-500">
          Plazos configurables en{' '}
          <Link to="/complex/protocolo-tiempos" className="text-fenix-primario underline">
            Protocolo de tiempos
          </Link>
          . Solo casos desde octubre 2025.
        </p>
      </div>

      {modal && (
        <ComplexAvisoModal
          open
          tipo={modal.tipo === 'confirmacion' ? 'warning' : modal.tipo}
          titulo={modal.titulo}
          mensaje={modal.mensaje}
          onClose={() => setModal(null)}
          onConfirm={modal.onConfirm}
        />
      )}
    </div>
  );
}
