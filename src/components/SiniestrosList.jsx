import React, { useState } from "react";
import { useSiniestros } from "../hooks/useSiniestros";
import { deleteSiniestro } from "../services/siniestrosApi";
import SiniestroForm from "./SiniestroForm";

export default function SiniestrosList() {
  const [params, setParams] = useState({ page: 1, limit: 5 });
  const { siniestros, total, page, limit, loading, error, refetch } = useSiniestros(params);
  const [editSiniestro, setEditSiniestro] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar siniestro?")) {
      await deleteSiniestro(id);
      refetch(params);
    }
  };

  const handleEdit = (siniestro) => {
    setEditSiniestro(siniestro);
    setModalOpen(true);
  };

  const handleSave = () => {
    refetch(params);
  };

  return (
    <div className="p-2 sm:p-4">
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Listado de Siniestros</h2>
      {loading && <p className="text-sm">Cargando...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">ID</th>
              <th className="border border-gray-300 p-2 text-left">Número Siniestro</th>
              <th className="border border-gray-300 p-2 text-left">Responsable</th>
              <th className="border border-gray-300 p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {siniestros.map((s) => (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2">{s._id}</td>
                <td className="border border-gray-300 p-2">{s.nmro_siniestro || s.nmro_sinstro}</td>
                <td className="border border-gray-300 p-2">{s.codi_respnble || s.codi_respnsble}</td>
                <td className="border border-gray-300 p-2">
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                    <button 
                      onClick={() => handleEdit(s)}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(s._id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-xs sm:text-sm">Página {page} de {Math.ceil(total / limit)}</span>
        <div className="flex gap-2">
          <button 
            disabled={page <= 1} 
            onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
            className="px-3 py-1 bg-gray-500 text-white rounded text-xs disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            Anterior
          </button>
          <button 
            disabled={page * limit >= total} 
            onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
            className="px-3 py-1 bg-gray-500 text-white rounded text-xs disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            Siguiente
          </button>
        </div>
      </div>
      <SiniestroForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        siniestro={editSiniestro}
        onSave={handleSave}
      />
    </div>
  );
} 