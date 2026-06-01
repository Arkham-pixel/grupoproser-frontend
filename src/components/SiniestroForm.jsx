import React, { useState, useEffect } from "react";
import { updateSiniestro } from "../services/siniestrosApi";

const camposPrincipales = [
  { clave: "nmro_ajste", label: "Nro Ajuste" },
  { clave: "codi_respnsble", label: "Responsable" },
  { clave: "codi_asgrdra", label: "Aseguradora" },
  { clave: "nmro_sinstro", label: "Nro Siniestro" },
  { clave: "cod_workflow", label: "Cod Workflow" },
  { clave: "func_asgrdra", label: "Func. Aseguradora" },
  { clave: "fcha_asgncion", label: "Fecha Asignación" },
  { clave: "asgr_benfcro", label: "Beneficiario" },
  { clave: "tipo_ducumento", label: "Tipo Documento" },
  { clave: "num_documento", label: "Nro Documento" },
  { clave: "tipo_poliza", label: "Tipo Póliza" },
  { clave: "nmro_polza", label: "Nro Póliza" },
  { clave: "ampr_afctdo", label: "Amparo Afectado" },
  { clave: "fcha_sinstro", label: "Fecha Siniestro" },
  { clave: "desc_sinstro", label: "Descripción Siniestro" },
  { clave: "ciudad_siniestro", label: "Ciudad Siniestro" },
  { clave: "codi_estdo", label: "Estado" },
  { clave: "vlor_resrva", label: "Valor Reserva" },
  { clave: "vlor_reclmo", label: "Valor Reclamo" },
  { clave: "monto_indmzar", label: "Monto Indemnizar" },
];

export default function SiniestroForm({ open, onClose, siniestro, onSave }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setForm(siniestro || {});
  }, [siniestro]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updated = await updateSiniestro(form._id, form);
      onSave(updated);
      onClose();
    } catch (err) {
      setError("Error al guardar cambios");
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <form onSubmit={handleSubmit} style={{ 
        background: "#fff", 
        padding: "16px", 
        borderRadius: 8, 
        minWidth: "280px", 
        maxWidth: "90vw",
        maxHeight: "90vh", 
        overflowY: "auto",
        margin: "10px"
      }}>
        <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Editar Siniestro</h3>
        {camposPrincipales.map(({ clave, label }) => (
          <div key={clave} style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", fontWeight: 500, fontSize: "12px" }}>{label}</label>
            <input
              type="text"
              name={clave}
              value={form[clave] || ""}
              onChange={handleChange}
              style={{ 
                width: "100%", 
                padding: "6px", 
                borderRadius: 4, 
                border: "1px solid #ccc",
                fontSize: "12px"
              }}
            />
          </div>
        ))}
        {error && <div style={{ color: "red", fontSize: "12px" }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
          <button type="button" onClick={onClose} style={{ 
            padding: "6px 12px", 
            fontSize: "12px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "#f5f5f5"
          }}>Cancelar</button>
          <button type="submit" disabled={loading} style={{ 
            padding: "6px 12px", 
            background: "#1976d2", 
            color: "#fff", 
            border: "none", 
            borderRadius: 4,
            fontSize: "12px"
          }}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
} 