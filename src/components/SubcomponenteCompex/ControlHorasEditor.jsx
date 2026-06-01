import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaPlus, FaTrash, FaSave, FaFileExcel } from 'react-icons/fa';
import {
  complexBtnPrimary,
  complexBtnSecondary,
  complexCard,
  complexInfoPanel,
  complexInput,
  complexLabel,
  complexTableWrap,
} from './complexFenixUi';
import {
  buildCabeceraControlHoras,
  calcularTotalesControlHoras,
  crearControlHorasInicial,
  crearFilaVacia,
  formatearFechaDisplay,
  formatearMoneda,
  normalizarControlHorasParaGuardar,
  totalFila,
} from './controlHoras/controlHorasUtils';
import { generarControlHorasExcel, descargarBlob } from './controlHoras/generarControlHorasExcel';
import { resolverTarifaHora } from './controlHoras/tarifasHoraAseguradoras';

export default function ControlHorasEditor({
  abierto,
  onCerrar,
  formData,
  nombreAseguradora,
  controlHorasGuardado,
  onGuardar,
}) {
  const [datos, setDatos] = useState(null);
  const [mensajeTarifa, setMensajeTarifa] = useState('');
  const [edicionManualValorHora, setEdicionManualValorHora] = useState(false);

  const nombreAseguradoraResuelto =
    nombreAseguradora || formData.nombreCliente || formData.codiAsgrdra || '';

  useEffect(() => {
    if (!abierto) return;
    const inicial = crearControlHorasInicial(formData, nombreAseguradoraResuelto, controlHorasGuardado);
    setMensajeTarifa(inicial._mensajeTarifa || '');
    const { _mensajeTarifa, ...resto } = inicial;
    setDatos(resto);
    setEdicionManualValorHora(resto.valor_hora_origen !== 'tarifa');
  }, [abierto, formData, nombreAseguradoraResuelto, controlHorasGuardado]);

  const cabecera = useMemo(
    () => buildCabeceraControlHoras(formData, nombreAseguradora),
    [formData, nombreAseguradora]
  );

  const totales = useMemo(
    () => (datos ? calcularTotalesControlHoras(datos) : null),
    [datos]
  );

  if (!abierto || !datos) return null;

  const valorHoraPorTarifa = datos.valor_hora_origen === 'tarifa' && !edicionManualValorHora;
  const tarifaCatalogo = resolverTarifaHora({
    codiAsgrdra: formData.codiAsgrdra,
    nombreAseguradora: nombreAseguradoraResuelto,
    nombreCliente: formData.nombreCliente,
    fchaAsgncion: formData.fchaAsgncion,
  });
  const puedeRestaurarTarifa = tarifaCatalogo.origen === 'tarifa';

  const actualizarCampo = (campo, valor) => {
    setDatos((prev) => {
      const next = { ...prev, [campo]: valor };
      if (campo === 'valor_hora') {
        next.valor_hora_origen = 'manual';
      }
      return next;
    });
    if (campo === 'valor_hora') {
      setEdicionManualValorHora(true);
    }
  };

  const actualizarFila = (id, campo, valor) => {
    setDatos((prev) => ({
      ...prev,
      filas: prev.filas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    }));
  };

  const agregarFila = () => {
    const responsable = formData.nombreResponsable || formData.responsable || '';
    setDatos((prev) => ({
      ...prev,
      filas: [...prev.filas, crearFilaVacia({ nombre_funcionario: responsable, cargo: 'Ajustador' })],
    }));
  };

  const eliminarFila = (id) => {
    if (datos.filas.length <= 1) {
      alert('Debe conservar al menos una fila de actividad.');
      return;
    }
    setDatos((prev) => ({
      ...prev,
      filas: prev.filas.filter((f) => f.id !== id),
    }));
  };

  const reaplicarTarifa = () => {
    const tarifa = resolverTarifaHora({
      codiAsgrdra: formData.codiAsgrdra,
      nombreAseguradora: nombreAseguradoraResuelto,
      nombreCliente: formData.nombreCliente,
      fchaAsgncion: formData.fchaAsgncion,
    });
    setMensajeTarifa(tarifa.mensaje);
    setEdicionManualValorHora(tarifa.origen !== 'tarifa');
    setDatos((prev) => ({
      ...prev,
      valor_hora: tarifa.valorHora ?? prev.valor_hora,
      valor_hora_origen: tarifa.origen,
    }));
  };

  const validar = () => {
    if (!datos.filas.length) {
      alert('Agregue al menos una actividad.');
      return false;
    }
    if (totales.total_horas <= 0) {
      alert('Registre al menos una hora en las actividades.');
      return false;
    }
    if (!datos.valor_hora && datos.valor_hora !== 0) {
      alert('Ingrese el valor hora.');
      return false;
    }
    return true;
  };

  const handleGuardar = () => {
    if (!validar()) return;
    const normalizado = normalizarControlHorasParaGuardar(datos);
    onGuardar(normalizado, totales);
    onCerrar();
  };

  const handleExportar = async () => {
    if (!validar()) return;
    try {
      const { blob, nombre } = await generarControlHorasExcel({
        formData,
        controlHoras: datos,
        nombreAseguradora,
      });
      descargarBlob(blob, nombre);
    } catch (e) {
      console.error(e);
      alert('No se pudo generar el Excel.');
    }
  };

  const inputHorasClass = `${complexInput} max-w-[5.5rem] text-center`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-[#1A1A1A]">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              Control de horas del caso
            </h2>
            <p className="font-body text-xs text-gray-500 dark:text-gray-400">
              Referencia: {cabecera.referencia || '—'} · Un registro por caso (editable)
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-fenix-primario dark:hover:bg-gray-800"
            aria-label="Cerrar"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Cabecera readonly */}
          <div className={complexCard}>
            <h3 className="mb-3 font-heading text-sm font-bold text-gray-800 dark:text-white">
              Datos del caso (Datos Generales)
            </h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Firma', cabecera.firma],
                ['Compañía', cabecera.compania],
                ['Asegurado', cabecera.asegurado],
                ['Siniestro', cabecera.siniestro],
                ['Riesgo', cabecera.riesgo],
                ['Lugar', cabecera.lugar],
                ['Analista', cabecera.analista],
                ['F. siniestro', formatearFechaDisplay(cabecera.fechaSiniestro)],
                ['F. asignación', formatearFechaDisplay(cabecera.fechaAsignacion)],
                ['F. inspección', formatearFechaDisplay(cabecera.fechaInspeccion)],
                ['Referencia', cabecera.referencia],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-gray-50/80 px-3 py-2 dark:bg-gray-900/40">
                  <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400">{k}</span>
                  <span className="text-gray-800 dark:text-gray-200">{v || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Liquidación */}
          <div className={complexCard}>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <h3 className="font-heading text-sm font-bold text-gray-800 dark:text-white">Liquidación</h3>
              <div className="flex flex-wrap gap-2">
                {valorHoraPorTarifa && (
                  <button
                    type="button"
                    onClick={() => setEdicionManualValorHora(true)}
                    className={complexBtnSecondary}
                  >
                    Editar valor manualmente
                  </button>
                )}
                {edicionManualValorHora && puedeRestaurarTarifa && (
                  <button type="button" onClick={reaplicarTarifa} className={complexBtnSecondary}>
                    Usar tarifa de aseguradora
                  </button>
                )}
              </div>
            </div>
            {mensajeTarifa && (
              <div className={`${complexInfoPanel} mb-3`}>
                <p className="font-body text-sm text-gray-700 dark:text-gray-300">{mensajeTarifa}</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={complexLabel}>
                  Valor hora
                  {valorHoraPorTarifa && (
                    <span className="ml-2 font-normal text-fenix-primario">(tarifa automática)</span>
                  )}
                </label>
                {valorHoraPorTarifa ? (
                  <div
                    className={`${complexInput} cursor-default bg-gray-50 font-semibold text-gray-900 dark:bg-gray-900/60 dark:text-white`}
                    aria-readonly
                  >
                    {formatearMoneda(datos.valor_hora)}
                  </div>
                ) : (
                  <input
                    type="number"
                    className={complexInput}
                    value={datos.valor_hora}
                    onChange={(e) => actualizarCampo('valor_hora', e.target.value)}
                    min="0"
                    step="1000"
                    placeholder={
                      tarifaCatalogo.origen === 'manual'
                        ? 'Ingrese valor hora'
                        : 'Sin tarifa en catálogo'
                    }
                  />
                )}
                {valorHoraPorTarifa && (
                  <p className="mt-1 font-body text-xs text-gray-500">
                    Según tarifa de {nombreAseguradoraResuelto || 'la aseguradora'}.
                  </p>
                )}
              </div>
              <div>
                <label className={complexLabel}>Gastos</label>
                <input
                  type="number"
                  className={complexInput}
                  value={datos.gastos}
                  onChange={(e) => actualizarCampo('gastos', e.target.value)}
                  min="0"
                  step="1000"
                />
              </div>
              <div className="rounded-lg bg-red-50/50 px-3 py-2 dark:bg-red-950/20">
                <span className="text-xs text-gray-500">Total horas</span>
                <p className="font-heading text-lg font-bold text-fenix-primario">
                  {totales?.total_horas?.toFixed(2) ?? '0.00'}
                </p>
              </div>
              <div className="rounded-lg bg-red-50/50 px-3 py-2 dark:bg-red-950/20">
                <span className="text-xs text-gray-500">Total facturable</span>
                <p className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                  {formatearMoneda(totales?.total)}
                </p>
              </div>
            </div>
            <p className="mt-2 font-body text-xs text-gray-500">
              Subtotal honorarios: {formatearMoneda(totales?.subtotal_honorarios)}
            </p>
          </div>

          {/* Tabla actividades */}
          <div className={complexCard}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold text-gray-800 dark:text-white">
                Relación del tiempo empleado
              </h3>
              <button type="button" onClick={agregarFila} className={complexBtnSecondary}>
                <FaPlus /> Agregar actividad
              </button>
            </div>
            <div className={complexTableWrap}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <th className="px-2 py-2">Fecha</th>
                      <th className="min-w-[180px] px-2 py-2">Descripción</th>
                      <th className="px-2 py-2">Funcionario</th>
                      <th className="px-2 py-2">Cargo</th>
                      <th className="px-2 py-2">Viaje</th>
                      <th className="px-2 py-2">Campo</th>
                      <th className="px-2 py-2">Oficina</th>
                      <th className="px-2 py-2">Secr.</th>
                      <th className="px-2 py-2">Total</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {datos.filas.map((fila) => (
                      <tr key={fila.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-1 py-1">
                          <input
                            type="date"
                            className={complexInput}
                            value={fila.fecha || ''}
                            onChange={(e) => actualizarFila(fila.id, 'fecha', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <textarea
                            className={`${complexInput} min-h-[2.5rem]`}
                            rows={2}
                            value={fila.descripcion}
                            onChange={(e) => actualizarFila(fila.id, 'descripcion', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={complexInput}
                            value={fila.nombre_funcionario}
                            onChange={(e) => actualizarFila(fila.id, 'nombre_funcionario', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className={complexInput}
                            value={fila.cargo}
                            onChange={(e) => actualizarFila(fila.id, 'cargo', e.target.value)}
                          />
                        </td>
                        {['horas_viaje', 'horas_campo', 'horas_oficina', 'horas_secretaria'].map((campo) => (
                          <td key={campo} className="px-1 py-1">
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              className={inputHorasClass}
                              value={fila[campo]}
                              onChange={(e) => actualizarFila(fila.id, campo, e.target.value)}
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 font-semibold text-fenix-primario">
                          {totalFila(fila).toFixed(2)}
                        </td>
                        <td className="px-1 py-1">
                          <button
                            type="button"
                            onClick={() => eliminarFila(fila.id)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Eliminar fila"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold dark:border-gray-700 dark:bg-gray-900/50">
                      <td colSpan={4} className="px-2 py-2">
                        TOTAL
                      </td>
                      <td className="px-2 py-2">{totales?.viaje?.toFixed(2)}</td>
                      <td className="px-2 py-2">{totales?.campo?.toFixed(2)}</td>
                      <td className="px-2 py-2">{totales?.oficina?.toFixed(2)}</td>
                      <td className="px-2 py-2">{totales?.secretaria?.toFixed(2)}</td>
                      <td className="px-2 py-2 text-fenix-primario">{totales?.total_horas?.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <button type="button" onClick={onCerrar} className={complexBtnSecondary}>
            Cancelar
          </button>
          <button type="button" onClick={handleExportar} className={complexBtnSecondary}>
            <FaFileExcel className="text-green-700" /> Descargar Excel
          </button>
          <button type="button" onClick={handleGuardar} className={complexBtnPrimary}>
            <FaSave /> Guardar control de horas
          </button>
        </div>
      </div>
    </div>
  );
}
