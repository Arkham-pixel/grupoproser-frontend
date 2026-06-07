import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

// Configurar axios para usar la URL base correcta
axios.defaults.baseURL = BASE_URL;

const TestApiRiesgos = () => {
  const [estados, setEstados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [clasificaciones, setClasificaciones] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    
    try {
// Probar estados de riesgo
const estadosRes = await axios.get('/api/estados/estados-riesgos');
setEstados(estadosRes.data);
      
      // Probar clientes
const clientesRes = await axios.get('/api/clientes');
setClientes(clientesRes.data);
      
      // Probar responsables
const responsablesRes = await axios.get('/api/responsables');
setResponsables(responsablesRes.data);
      
      // Probar clasificaciones
const clasificacionesRes = await axios.get('/api/estados/clasificaciones-riesgo');
setClasificaciones(clasificacionesRes.data);
      
      // Probar ciudades
const ciudadesRes = await axios.get('/api/ciudades/ciudades');
setCiudades(ciudadesRes.data);
      
} catch (error) {
      console.error('❌ Error en la prueba de API:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Prueba de API de Riesgos</h1>
      
      <div className="mb-6">
        <button
          onClick={testApi}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Probando...' : 'Probar API'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Estados de Riesgo ({estados.length})</h3>
          <pre className="text-sm overflow-auto max-h-40">
            {JSON.stringify(estados.slice(0, 3), null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Clientes ({clientes.length})</h3>
          <pre className="text-sm overflow-auto max-h-40">
            {JSON.stringify(clientes.slice(0, 3), null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Responsables ({responsables.length})</h3>
          <pre className="text-sm overflow-auto max-h-40">
            {JSON.stringify(responsables.slice(0, 3), null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Clasificaciones ({clasificaciones.length})</h3>
          <pre className="text-sm overflow-auto max-h-40">
            {JSON.stringify(clasificaciones.slice(0, 3), null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded col-span-full">
          <h3 className="font-bold mb-2">Ciudades ({ciudades.length})</h3>
          <pre className="text-sm overflow-auto max-h-40">
            {JSON.stringify(ciudades.slice(0, 3), null, 2)}
          </pre>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h3 className="font-bold mb-2">📊 Resumen</h3>
        <p><strong>URL Base:</strong> {BASE_URL}</p>
        <p><strong>Estados:</strong> {estados.length} registros</p>
        <p><strong>Clientes:</strong> {clientes.length} registros</p>
        <p><strong>Responsables:</strong> {responsables.length} registros</p>
        <p><strong>Clasificaciones:</strong> {clasificaciones.length} registros</p>
        <p><strong>Ciudades:</strong> {ciudades.length} registros</p>
      </div>
    </div>
  );
};

export default TestApiRiesgos;
