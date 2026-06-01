import React, { useState, useEffect } from 'react';
import { BASE_URL, isDevelopmentEnv, showConfig } from '../config/apiConfig';

const TestFoto = () => {
  const [configInfo, setConfigInfo] = useState({});
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    // Mostrar configuración actual
    const config = {
      entorno: isDevelopmentEnv ? 'DESARROLLO' : 'PRODUCCIÓN',
      baseUrl: BASE_URL,
      hostname: window.location.hostname,
      port: window.location.port,
      userAgent: navigator.userAgent
    };
    setConfigInfo(config);
    
    // Ejecutar pruebas automáticamente
    runTests();
  }, []);

  const runTests = () => {
    const results = [];
    
    // Prueba 1: Verificar configuración
    try {
      showConfig();
      results.push({ test: 'Configuración', status: '✅ PASÓ', details: 'Configuración cargada correctamente' });
    } catch (error) {
      results.push({ test: 'Configuración', status: '❌ FALLÓ', details: error.message });
    }

    // Prueba 2: Verificar BASE_URL
    if (BASE_URL) {
      results.push({ test: 'BASE_URL', status: '✅ PASÓ', details: `URL: ${BASE_URL}` });
    } else {
      results.push({ test: 'BASE_URL', status: '❌ FALLÓ', details: 'BASE_URL no está definido' });
    }

    // Prueba 3: Verificar detección de entorno
    if (typeof isDevelopmentEnv === 'boolean') {
      results.push({ test: 'Detección de Entorno', status: '✅ PASÓ', details: `Entorno: ${isDevelopmentEnv ? 'DESARROLLO' : 'PRODUCCIÓN'}` });
    } else {
      results.push({ test: 'Detección de Entorno', status: '❌ FALLÓ', details: 'isDevelopmentEnv no es un booleano' });
    }

    // Prueba 4: Simular construcción de URL de foto
    const fotoUrlRelativa = '/uploads/test-foto.jpg';
    const urlCompleta = `${BASE_URL}${fotoUrlRelativa}`;
    results.push({ 
      test: 'Construcción de URL', 
      status: '✅ PASÓ', 
      details: `${fotoUrlRelativa} → ${urlCompleta}` 
    });

    // Prueba 5: Verificar que la URL sea válida
    try {
      new URL(urlCompleta);
      results.push({ test: 'URL Válida', status: '✅ PASÓ', details: 'URL construida es válida' });
    } catch (error) {
      results.push({ test: 'URL Válida', status: '❌ FALLÓ', details: 'URL construida no es válida' });
    }

    setTestResults(results);
  };

  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/secur-auth/test-db`);
      if (response.ok) {
        const data = await response.json();
        setTestResults(prev => [...prev, { 
          test: 'Conexión Backend', 
          status: '✅ PASÓ', 
          details: `Backend respondió: ${data.message}` 
        }]);
      } else {
        setTestResults(prev => [...prev, { 
          test: 'Conexión Backend', 
          status: '❌ FALLÓ', 
          details: `HTTP ${response.status}: ${response.statusText}` 
        }]);
      }
    } catch (error) {
      setTestResults(prev => [...prev, { 
        test: 'Conexión Backend', 
        status: '❌ FALLÓ', 
        details: `Error: ${error.message}` 
      }]);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🧪 Pruebas del Sistema de Fotos</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>🔧 Configuración Actual</h3>
        <pre style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(configInfo, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTests}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          🔄 Ejecutar Pruebas
        </button>
        
        <button 
          onClick={testBackendConnection}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          🌐 Probar Conexión Backend
        </button>
      </div>

      <div>
        <h3>📊 Resultados de las Pruebas</h3>
        {testResults.map((result, index) => (
          <div 
            key={index} 
            style={{ 
              margin: '10px 0', 
              padding: '10px', 
              backgroundColor: result.status.includes('✅') ? '#d4edda' : '#f8d7da',
              border: `1px solid ${result.status.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px'
            }}
          >
            <strong>{result.test}:</strong> {result.status}
            <br />
            <small>{result.details}</small>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
        <h3>📋 Instrucciones para Probar</h3>
        <ol>
          <li>Verifica que el backend esté corriendo en <code>http://localhost:3000</code></li>
          <li>Verifica que el frontend esté corriendo en <code>http://localhost:5173</code></li>
          <li>Ejecuta las pruebas haciendo clic en "🔄 Ejecutar Pruebas"</li>
          <li>Prueba la conexión al backend con "🌐 Probar Conexión Backend"</li>
          <li>Si todo está bien, ve a "Mi Cuenta" y prueba subir una foto</li>
        </ol>
      </div>
    </div>
  );
};

export default TestFoto;
