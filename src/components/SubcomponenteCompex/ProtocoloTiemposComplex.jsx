import React, { useEffect, useState } from 'react';
import Loader from '../Loader';
import {
  guardarProtocoloSiniestros,
  obtenerProtocoloSiniestros,
  restaurarProtocoloSiniestros,
} from '../../services/protocoloService.js';
import { obtenerHistorialProtocolo } from '../../services/alertasComplexService.js';
import {
  etiquetaLimite,
  obtenerProtocoloPorDefecto,
  PROTOCOLO_DOCUMENTO,
  PROTOCOLO_FECHA_ACTIVACION,
} from '../../config/protocoloSiniestrosDefaults.js';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
  complexSectionTitle,
  complexTableHead,
  complexTableSimple,
  complexTableWrap,
} from './complexFenixUi.js';
import {
  Campo,
  ComplexFilterSection,
  ComplexPageHeader,
  InputFenix,
  SelectFenix,
} from './ComplexUiBlocks.jsx';

const UNIDADES = [
  { value: 'horas', label: 'Horas' },
  { value: 'dias', label: 'Días calendario' },
  { value: 'dias_habiles', label: 'Días hábiles' },
  { value: 'mismo_dia', label: 'Mismo día calendario' },
];

function actualizarEtapa(etapas, id, campo, valor) {
  return etapas.map((etapa) => {
    if (etapa.id !== id) return etapa;
    if (campo === 'limiteValor' || campo === 'limiteUnidad') {
      return {
        ...etapa,
        limite: {
          ...etapa.limite,
          valor: campo === 'limiteValor' ? Number(valor) : etapa.limite.valor,
          unidad: campo === 'limiteUnidad' ? valor : etapa.limite.unidad,
        },
      };
    }
    if (campo === 'maxValor' || campo === 'maxUnidad') {
      const limiteMaximo = etapa.limiteMaximo || { valor: 0, unidad: 'horas' };
      return {
        ...etapa,
        limiteMaximo: {
          ...limiteMaximo,
          valor: campo === 'maxValor' ? Number(valor) : limiteMaximo.valor,
          unidad: campo === 'maxUnidad' ? valor : limiteMaximo.unidad,
        },
      };
    }
    return { ...etapa, [campo]: valor };
  });
}

function actualizarSeguimiento(seguimientos, id, valor) {
  return seguimientos.map((seg) =>
    seg.id === id ? { ...seg, intervaloDias: Number(valor) } : seg
  );
}

const ProtocoloTiemposComplex = () => {
  const [protocolo, setProtocolo] = useState(obtenerProtocoloPorDefecto());
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const recargarHistorial = () =>
    obtenerHistorialProtocolo(15)
      .then(setHistorial)
      .catch(() => setHistorial([]));

  useEffect(() => {
    let activo = true;
    Promise.all([
      obtenerProtocoloSiniestros(true),
      obtenerHistorialProtocolo(15).catch(() => []),
    ])
      .then(([proto, hist]) => {
        if (!activo) return;
        setProtocolo(proto);
        setHistorial(hist);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      const guardado = await guardarProtocoloSiniestros(protocolo);
      setProtocolo(guardado);
      await recargarHistorial();
      setMensaje('Protocolo guardado. Las alertas automáticas usarán estos valores.');
    } catch (error) {
      setMensaje(error.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const restaurar = async () => {
    if (!window.confirm('¿Restaurar el protocolo a los valores del documento oficial?')) return;
    setGuardando(true);
    setMensaje('');
    try {
      const restaurado = await restaurarProtocoloSiniestros();
      setProtocolo(restaurado);
      await recargarHistorial();
      setMensaje('Protocolo restaurado a valores por defecto.');
    } catch (error) {
      setMensaje(error.message || 'Error al restaurar');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
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
          badge="Complex · Protocolo"
          title="Protocolo de tiempos y alertas"
          subtitle={`Reglamento: ${PROTOCOLO_DOCUMENTO}. Vigente para alertas desde ${PROTOCOLO_FECHA_ACTIVACION}.`}
          activePath="/complex/protocolo-tiempos"
        />

        <ComplexFilterSection title="Acciones">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={restaurar}
              disabled={guardando}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
            >
              Restaurar valores oficiales
            </button>
          </div>
          {mensaje && (
            <p className="mt-3 font-body text-sm text-gray-600 dark:text-gray-300">{mensaje}</p>
          )}
        </ComplexFilterSection>

        <section>
          <h2 className={complexSectionTitle}>Hitos con plazo fijo</h2>
          <div className={complexTableWrap}>
            <table className={`${complexTableSimple} min-w-[900px]`}>
              <thead>
                <tr className={complexTableHead}>
                  <th className="text-left">Fase</th>
                  <th className="text-left">Actividad</th>
                  <th className="text-left">Referencia</th>
                  <th className="text-right">Plazo</th>
                  <th className="text-left">Unidad</th>
                  <th className="text-right">Máximo (opc.)</th>
                </tr>
              </thead>
              <tbody>
                {protocolo.etapas.map((etapa) => (
                  <tr key={etapa.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-3 py-3 tabular-nums">{etapa.fase}</td>
                    <td className="px-3 py-3 font-medium">{etapa.nombre}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{etapa.referencia}</td>
                    <td className="px-3 py-3 text-right">
                      <InputFenix
                        type="number"
                        min={0}
                        step={etapa.limite?.unidad === 'horas' ? 1 : 0.5}
                        value={etapa.limite?.valor ?? 0}
                        onChange={(e) =>
                          setProtocolo((prev) => ({
                            ...prev,
                            etapas: actualizarEtapa(prev.etapas, etapa.id, 'limiteValor', e.target.value),
                          }))
                        }
                        className="w-24 text-right"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <SelectFenix
                        value={etapa.limite?.unidad || 'horas'}
                        onChange={(e) =>
                          setProtocolo((prev) => ({
                            ...prev,
                            etapas: actualizarEtapa(prev.etapas, etapa.id, 'limiteUnidad', e.target.value),
                          }))
                        }
                      >
                        {UNIDADES.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </SelectFenix>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-gray-500">
                      {etapa.limiteMaximo ? (
                        <div className="flex items-center justify-end gap-2">
                          <InputFenix
                            type="number"
                            min={0}
                            value={etapa.limiteMaximo.valor}
                            onChange={(e) =>
                              setProtocolo((prev) => ({
                                ...prev,
                                etapas: actualizarEtapa(prev.etapas, etapa.id, 'maxValor', e.target.value),
                              }))
                            }
                            className="w-20 text-right"
                          />
                          <span className="text-xs">h</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Vista previa: contacto inicial {etiquetaLimite(protocolo.etapas.find((e) => e.id === 'contactoInicial')?.limite)},
            informe preliminar {etiquetaLimite(protocolo.etapas.find((e) => e.id === 'informePreliminar')?.limite)} desde asignación.
          </p>
        </section>

        <section className="mt-8">
          <h2 className={complexSectionTitle}>Seguimientos recurrentes (alertas)</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {protocolo.seguimientosRecurrentes.map((seg) => (
              <div
                key={seg.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]"
              >
                <p className="font-medium text-gray-900 dark:text-white">{seg.nombre}</p>
                <p className="mt-1 text-xs text-gray-500">{seg.descripcion || seg.referencia}</p>
                <Campo label="Intervalo (días calendario)" className="mt-3">
                  <InputFenix
                    type="number"
                    min={1}
                    value={seg.intervaloDias}
                    onChange={(e) =>
                      setProtocolo((prev) => ({
                        ...prev,
                        seguimientosRecurrentes: actualizarSeguimiento(
                          prev.seguimientosRecurrentes,
                          seg.id,
                          e.target.value
                        ),
                      }))
                    }
                  />
                </Campo>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className={complexSectionTitle}>Historial de cambios</h2>
          {historial.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay cambios registrados en el protocolo.</p>
          ) : (
            <div className={complexTableWrap}>
              <table className={`${complexTableSimple} min-w-[640px]`}>
                <thead>
                  <tr className={complexTableHead}>
                    <th className="text-left">Fecha</th>
                    <th className="text-left">Acción</th>
                    <th className="text-left">Usuario</th>
                    <th className="text-left">Resumen</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((entry) => (
                    <tr key={entry._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleString('es-CO')
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-sm capitalize">{entry.accion || '—'}</td>
                      <td className="px-3 py-2 text-sm">{entry.usuario || 'sistema'}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                        {entry.cambiosResumen || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
          <p className="font-semibold text-gray-800 dark:text-gray-100">
            Matriz oficial del protocolo (bandejas de trazabilidad)
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Fase 1 Recepción: asignación recibida (día 0).</li>
            <li>Fase 2 Cargue en ARNALD: 12 h — asignación interna del ajustador (soporte).</li>
            <li>Fase 3 Contacto inicial: 12 h desde asignación al ajustador.</li>
            <li>Fase 4 Coordinación de inspección: alerta a los 10 días hábiles sin fecha programada.</li>
            <li>Fase 5 Inspección: ideal 24 h, máximo 72 h desde asignación.</li>
            <li>Fase 6 Solicitud de documentos: 12 h post-inspección.</li>
            <li>Fase 7 Informe preliminar: 3 días hábiles desde asignación.</li>
            <li>Fase 8 Seguimiento documental: primer aviso a 10 días hábiles; luego cada 15 días.</li>
            <li>Fase 9 Acreditación: fecha del último documento (`fchaRepoActi`).</li>
            <li>Fase 10 Informe final: 3 días hábiles desde acreditación.</li>
            <li>Fase 11 Autorización de cifras: seguimiento (10 días hábiles + cada 5 días calendario).</li>
            <li>Fase 12 Presentación de cifras y finiquitos: 12 h desde aprobación.</li>
            <li>Fase 13 Seguimiento para pago: primer aviso a 10 días hábiles; luego cada 15 días.</li>
            <li>Fase 14 Envío de finiquito: alerta a los 10 días hábiles sin cierre documental.</li>
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Esperas de terceros (asegurado, compañía, intermediario): primera alerta tras 10 días hábiles.
            Tiempo bajo gestión directa del ajustador: ~6 días hábiles + 12 h (sin esperas externas).
            Use «Restaurar valores oficiales» tras actualizar el reglamento en el sistema.
          </p>
        </section>
      </div>
    </div>
  );
};

export default ProtocoloTiemposComplex;
