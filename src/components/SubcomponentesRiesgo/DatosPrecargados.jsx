// src/components/SubcomponentesRiesgo/DatosPrecargados.jsx
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function DatosPrecargados({ formData, setFormData }) {
  const { t } = useTranslation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    // No-op placeholder for future prefill hooks
  }, []);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">{t('inspection.fields.insurer')}:</label>
        <input
          type="text"
          name="aseguradora"
          value={formData.aseguradora}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">{t('inspection.fields.address')}:</label>
        <input
          type="text"
          name="direccion"
          value={formData.direccion}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">{t('inspection.fields.city')}:</label>
        <input
          type="text"
          name="ciudad"
          value={formData.ciudad}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">{t('inspection.fields.insured')}:</label>
        <input
          type="text"
          name="asegurado"
          value={formData.asegurado}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-1">{t('inspection.fields.inspectionDate')}:</label>
        <input
          type="date"
          name="fechaInspeccion"
          value={formData.fechaInspeccion}
          onChange={handleChange}
          className="border p-2 sm:p-3 rounded w-full text-xs sm:text-sm"
        />
      </div>
    </div>
  );
}
