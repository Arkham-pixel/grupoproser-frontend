import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEdit, FaEye, FaFilePdf, FaCamera, FaPlus, FaFilter, FaSync, FaFileExcel, FaFileAlt } from 'react-icons/fa';
import { listarRegistrosPuertos } from '../../services/puertosService.js';
import {
  puertosBadge,
  puertosBadgeAlt,
  puertosBtnPrimary,
  puertosBtnSecondary,
  puertosPageSubtitle,
  puertosPageTitle,
  puertosTableHead,
  puertosTableRowEven,
  puertosTableRowOdd,
  puertosTableTd,
  puertosTableWrap,
} from './puertosFenixUi';

const TIPO_LABEL = {
  acta: 'Acta',
  caso_exportacion: 'Caso exportación',
};

function rutaEditar(registro) {
  if (registro.tipoRegistro === 'caso_exportacion') {
    return `/puertos/actas/caso/editar/${registro.id}`;
  }
  return `/puertos/actas/editar/${registro.id}`;
}

export default function PuertosActasListado() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const data = await listarRegistrosPuertos({ limit: 200 });
      setRegistros(data.registros || []);
    } catch (err) {
      setError(err.message || 'Error al cargar registros');
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={puertosPageTitle}>Actas y casos de exportación</h2>
          <p className={puertosPageSubtitle}>
            {cargando ? 'Cargando…' : `${registros.length} registro(s)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/puertos/actas/nueva" className={puertosBtnSecondary}>
            <FaPlus /> Nueva Acta
          </Link>
          <Link to="/puertos/actas/caso/nueva" className={puertosBtnPrimary}>
            <FaFileAlt /> Informe Exportación
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}. Verifique que el backend esté en ejecución.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={puertosBtnSecondary}>
          <FaFilter /> Filtrar
        </button>
        <button type="button" onClick={cargar} disabled={cargando} className={puertosBtnSecondary}>
          <FaSync className={cargando ? 'animate-spin' : ''} /> Actualizar
        </button>
        <button type="button" className={puertosBtnSecondary}>
          <FaFileExcel /> Exportar Excel
        </button>
      </div>

      <div className={puertosTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className={puertosTableHead}>
              <tr>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold" colSpan={4}>
                  Acciones
                </th>
                <th className="px-3 py-2.5 font-semibold">Tipo</th>
                <th className="px-3 py-2.5 font-semibold">Nro. / Consecutivo</th>
                <th className="px-3 py-2.5 font-semibold">Tipo Inspección</th>
                <th className="px-3 py-2.5 font-semibold">Regional / Ciudad</th>
                <th className="px-3 py-2.5 font-semibold">Fecha</th>
                <th className="px-3 py-2.5 font-semibold">Cliente</th>
                <th className="px-3 py-2.5 font-semibold">Beneficiario / Mercancía</th>
                <th className="px-3 py-2.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {!cargando && registros.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center font-body text-gray-500">
                    No hay registros. Cree una acta o un informe de exportación.
                  </td>
                </tr>
              )}
              {registros.map((fila, i) => (
                <tr key={`${fila.tipoRegistro}-${fila.id}`} className={i % 2 === 0 ? puertosTableRowEven : puertosTableRowOdd}>
                  {[
                    { icon: FaEdit, title: 'Editar', onClick: () => navigate(rutaEditar(fila)) },
                    { icon: FaEye, title: 'Ver', onClick: () => navigate(rutaEditar(fila)) },
                    { icon: FaFilePdf, title: 'PDF', onClick: null, danger: true },
                    { icon: FaCamera, title: 'Fotos', onClick: null },
                  ].map(({ icon: Icon, title, onClick, danger }) => (
                    <td key={title} className="px-2 py-2">
                      <button
                        type="button"
                        onClick={onClick || undefined}
                        className={`rounded-lg p-2 transition ${danger ? 'text-fenix-primario hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-gray-600 hover:bg-gray-100 hover:text-fenix-primario dark:text-gray-300 dark:hover:bg-gray-800'}`}
                        title={title}
                      >
                        <Icon />
                      </button>
                    </td>
                  ))}
                  <td className={puertosTableTd}>
                    <span className={fila.tipoRegistro === 'caso_exportacion' ? puertosBadge : puertosBadgeAlt}>
                      {TIPO_LABEL[fila.tipoRegistro] || fila.tipoRegistro}
                    </span>
                  </td>
                  <td className={`${puertosTableTd} font-medium`}>{fila.nroReferencia || '—'}</td>
                  <td className={puertosTableTd}>{fila.tipoInspeccion || '—'}</td>
                  <td className={puertosTableTd}>{fila.regional || '—'}</td>
                  <td className={`${puertosTableTd} whitespace-nowrap`}>{fila.fecha || '—'}</td>
                  <td className={puertosTableTd}>{fila.asegurado || '—'}</td>
                  <td className={puertosTableTd}>{fila.mercancia || fila.beneficiario || '—'}</td>
                  <td className={`${puertosTableTd} text-gray-500`}>{fila.estado || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
