import React, { useState } from 'react';
import { useCasosRiesgo } from '../../context/CasosRiesgoContext';
import { FaEdit } from 'react-icons/fa';
import {
  riesgoBtnEdit,
  riesgoInput,
  riesgoLabel,
  riesgoPaginationBtn,
  riesgoPaginationBtnActive,
  riesgoTableRowEven,
  riesgoTableRowOdd,
  riesgoTableTd,
  riesgoTableTh,
  riesgoTableWrap,
} from './riesgoFenixUi.js';
import { getEstadoRiesgoNombre } from '../../utils/riesgoEstadoUtils.js';

const getCiudadNombre = (codigo, ciudades) => {
  if (!ciudades || !Array.isArray(ciudades)) return codigo;
  const ciudad = ciudades.find((c) => c.value === codigo || c.codiMunicipio === codigo);
  return ciudad ? ciudad.label : codigo;
};

const getEstadoNombre = (codigo, estados) => getEstadoRiesgoNombre(codigo, estados);

const ListaCasosRiesgo = ({ onEditarCaso, ciudades, estados }) => {
  const { casos } = useCasosRiesgo();
  const [pagina, setPagina] = useState(1);
  const casosPorPagina = 10;
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const filtrarPorFecha = (caso) => {
    if (!fechaDesde && !fechaHasta) return true;
    const fecha = caso.fchaInspccion ? new Date(caso.fchaInspccion) : null;
    if (!fecha) return false;
    if (fechaDesde && fecha < new Date(fechaDesde)) return false;
    if (fechaHasta && fecha > new Date(fechaHasta)) return false;
    return true;
  };
  const casosFiltrados = Array.isArray(casos) ? casos.filter(filtrarPorFecha) : [];

  const totalPaginas = Math.ceil(casosFiltrados.length / casosPorPagina) || 1;
  const casosPagina = casosFiltrados.slice((pagina - 1) * casosPorPagina, pagina * casosPorPagina);
  const desde = (pagina - 1) * casosPorPagina + 1;
  const hasta = Math.min(pagina * casosPorPagina, casosFiltrados.length);

  return (
    <div className="mt-6 w-full">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label className={riesgoLabel}>Inspección desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => {
              setPagina(1);
              setFechaDesde(e.target.value);
            }}
            className={`${riesgoInput} w-full sm:w-auto`}
          />
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label className={riesgoLabel}>hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => {
              setPagina(1);
              setFechaHasta(e.target.value);
            }}
            className={`${riesgoInput} w-full sm:w-auto`}
          />
        </div>
      </div>

      <div className={`${riesgoTableWrap} overflow-x-auto`}>
        <table className="w-full min-w-[720px] text-center text-xs sm:text-sm">
          <thead>
            <tr>
              <th className={riesgoTableTh}>N° Riesgo</th>
              <th className={riesgoTableTh}>Consecutivo</th>
              <th className={riesgoTableTh}>Asegurado</th>
              <th className={riesgoTableTh}>Ciudad</th>
              <th className={riesgoTableTh}>Estado</th>
              <th className={riesgoTableTh}>Fecha inspección</th>
              <th className={riesgoTableTh}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {casosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className={`${riesgoTableTd} py-6 text-gray-500`}>
                  No hay casos registrados
                </td>
              </tr>
            ) : (
              casosPagina.map((caso, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? riesgoTableRowEven : riesgoTableRowOdd}>
                  <td className={`${riesgoTableTd} font-mono`}>{caso.nmroRiesgo}</td>
                  <td className={`${riesgoTableTd} font-mono`} title={caso.nmroConsecutivo || ''}>
                    {caso.nmroConsecutivo || ''}
                  </td>
                  <td className={`${riesgoTableTd} max-w-[180px] truncate`} title={caso.asgrBenfcro}>
                    {caso.asgrBenfcro}
                  </td>
                  <td
                    className={`${riesgoTableTd} max-w-[120px] truncate`}
                    title={getCiudadNombre(caso.codigoPoblado || caso.ciudadSucursal, ciudades)}
                  >
                    {getCiudadNombre(caso.codigoPoblado || caso.ciudadSucursal, ciudades)}
                  </td>
                  <td className={riesgoTableTd} title={getEstadoNombre(caso.codiEstdo, estados)}>
                    {getEstadoNombre(caso.codiEstdo, estados)}
                  </td>
                  <td className={riesgoTableTd}>
                    {caso.fchaInspccion ? new Date(caso.fchaInspccion).toLocaleDateString() : ''}
                  </td>
                  <td className={riesgoTableTd}>
                    <button
                      type="button"
                      className={`${riesgoBtnEdit} mx-auto`}
                      onClick={() =>
                        onEditarCaso && onEditarCaso(caso, (pagina - 1) * casosPorPagina + idx)
                      }
                      aria-label="Editar caso"
                      title="Editar caso"
                    >
                      <FaEdit className="mr-1 inline" /> Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setPagina(1)}
          disabled={pagina === 1}
          className={riesgoPaginationBtn}
        >
          {'<<'}
        </button>
        <button
          type="button"
          onClick={() => setPagina(pagina - 1)}
          disabled={pagina === 1}
          className={riesgoPaginationBtn}
        >
          {'<'}
        </button>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
          .slice(Math.max(0, pagina - 3), pagina + 2)
          .map((i) => (
            <button
              key={i}
              type="button"
              className={pagina === i ? riesgoPaginationBtnActive : riesgoPaginationBtn}
              onClick={() => setPagina(i)}
            >
              {i}
            </button>
          ))}
        <button
          type="button"
          onClick={() => setPagina(pagina + 1)}
          disabled={pagina === totalPaginas}
          className={riesgoPaginationBtn}
        >
          {'>'}
        </button>
        <button
          type="button"
          onClick={() => setPagina(totalPaginas)}
          disabled={pagina === totalPaginas}
          className={riesgoPaginationBtn}
        >
          {'>>'}
        </button>
        <span className="ml-2 font-body text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
          Mostrando {casosFiltrados.length === 0 ? 0 : desde}-{hasta} de {casosFiltrados.length}
        </span>
      </div>
    </div>
  );
};

export default ListaCasosRiesgo;
