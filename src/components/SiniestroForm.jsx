import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { updateSiniestro } from "../services/siniestrosApi";

const CAMPOS_CLAVES = [
  "nmro_ajste",
  "codi_respnsble",
  "codi_asgrdra",
  "nmro_sinstro",
  "cod_workflow",
  "func_asgrdra",
  "fcha_asgncion",
  "asgr_benfcro",
  "tipo_ducumento",
  "num_documento",
  "tipo_poliza",
  "nmro_polza",
  "ampr_afctdo",
  "fcha_sinstro",
  "desc_sinstro",
  "ciudad_siniestro",
  "codi_estdo",
  "vlor_resrva",
  "vlor_reclmo",
  "monto_indmzar",
];

export default function SiniestroForm({ open, onClose, siniestro, onSave }) {
  const { t } = useTranslation();
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
    } catch {
      setError(t("siniestros.ui.saveError"));
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
        <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>{t("siniestros.ui.editTitle")}</h3>
        {CAMPOS_CLAVES.map((clave) => (
          <div key={clave} style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", fontWeight: 500, fontSize: "12px" }}>
              {t(`siniestros.ui.fields.${clave}`)}
            </label>
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
          }}>{t("siniestros.ui.cancel")}</button>
          <button type="submit" disabled={loading} style={{ 
            padding: "6px 12px", 
            background: "#1976d2", 
            color: "#fff", 
            border: "none", 
            borderRadius: 4,
            fontSize: "12px"
          }}>
            {loading ? t("siniestros.ui.saving") : t("siniestros.ui.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
