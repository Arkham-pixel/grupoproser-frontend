import React from 'react';
import { useEffect, useState } from 'react';
import api from '../services/api';

type Pais = {
  codigo_pais: string;
  nombre: string;
  iso_alpha_3: string;
  activo: boolean;
};

export default function PaisesList() {
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/paises')
      .then((response) => {
        setPaises(response.data);
      })
      .catch(() => {
        setError('No se pudo cargar la lista de países.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Lista de Países</h2>
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
