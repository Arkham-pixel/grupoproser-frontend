import React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

type Pais = {
  codigo_pais: string;
  nombre: string;
  iso_alpha_3: string;
  activo: boolean;
};

export default function PaisesList() {
  const { t } = useTranslation();
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/paises')
      .then((response) => {
        setPaises(response.data);
      })
      .catch(() => {
        setError(t('countries.ui.loadError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <p className="text-gray-500">{t('countries.ui.loading')}</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t('countries.ui.title')}</h2>
      <ul className="list-disc pl-5">
        {paises.map((pais) => (
          <li key={pais.codigo_pais}>
            {pais.nombre} ({pais.codigo_pais}) - {pais.iso_alpha_3}
          </li>
        ))}
      </ul>
    </div>
  );
}
