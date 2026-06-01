/**
 * 🧪 ARCHIVO DE PRUEBA - CONFIGURACIÓN DE API
 * 
 * Este archivo te permite probar la nueva configuración
 * antes de migrar completamente tu proyecto
 */

import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  apiRequest, 
  logAPIConfig, 
  testAPIConnection 
} from './apiConfig.js';

// ========================================
// 🧪 FUNCIONES DE PRUEBA
// ========================================

// Función para probar la configuración básica
export const probarConfiguracionBasica = () => {
  console.log('🧪 === PRUEBA DE CONFIGURACIÓN BÁSICA ===');
  
  // Mostrar configuración actual
  logAPIConfig();
  
  // Verificar que los endpoints estén definidos
  console.log('📋 Endpoints disponibles:');
  Object.keys(API_ENDPOINTS).forEach(key => {
    if (typeof API_ENDPOINTS[key] === 'string') {
      console.log(`   ${key}: ${API_ENDPOINTS[key]}`);
    } else if (typeof API_ENDPOINTS[key] === 'function') {
      console.log(`   ${key}: Función (ej: ${key}(123))`);
    }
  });
  
  // Verificar configuración
  console.log('🔧 Configuración:');
  console.log(`   Base URL: ${API_CONFIG.BASE_URL}`);
  console.log(`   Timeout: ${API_CONFIG.TIMEOUT}ms`);
  console.log(`   Headers:`, API_CONFIG.HEADERS);
  
  return true;
};

// Función para probar la conectividad
export const probarConectividad = async () => {
  console.log('🧪 === PRUEBA DE CONECTIVIDAD ===');
  
  try {
    const isConnected = await testAPIConnection();
    
    if (isConnected) {
      console.log('✅ Conectividad exitosa!');
      return true;
    } else {
      console.log('❌ Problemas de conectividad');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en prueba de conectividad:', error.message);
    return false;
  }
};

// Función para probar endpoints específicos
export const probarEndpoints = async () => {
  console.log('🧪 === PRUEBA DE ENDPOINTS ===');
  
  const resultados = {};
  
  // Probar endpoint de usuarios (debe existir en tu backend)
  try {
    console.log('🔍 Probando endpoint de usuarios...');
    const usuarios = await apiRequest(API_ENDPOINTS.USUARIOS);
    console.log('✅ Usuarios:', Array.isArray(usuarios) ? `${usuarios.length} usuarios` : 'Datos recibidos');
    resultados.usuarios = true;
  } catch (error) {
    console.log('❌ Error en usuarios:', error.message);
    resultados.usuarios = false;
  }
  
  // Probar endpoint de estados
  try {
    console.log('🔍 Probando endpoint de estados...');
    const estados = await apiRequest(API_ENDPOINTS.ESTADOS);
    console.log('✅ Estados:', Array.isArray(estados) ? `${estados.length} estados` : 'Datos recibidos');
    resultados.estados = true;
  } catch (error) {
    console.log('❌ Error en estados:', error.message);
    resultados.estados = false;
  }
  
  // Probar endpoint de ciudades
  try {
    console.log('🔍 Probando endpoint de ciudades...');
    const ciudades = await apiRequest(API_ENDPOINTS.CIUDADES);
    console.log('✅ Ciudades:', Array.isArray(ciudades) ? `${ciudades.length} ciudades` : 'Datos recibidos');
    resultados.ciudades = true;
  } catch (error) {
    console.log('❌ Error en ciudades:', error.message);
    resultados.ciudades = false;
  }
  
  return resultados;
};

// Función para probar manejo de errores
export const probarManejoErrores = async () => {
  console.log('🧪 === PRUEBA DE MANEJO DE ERRORES ===');
  
  try {
    // Intentar acceder a un endpoint que no existe
    console.log('🔍 Probando endpoint inexistente...');
    await apiRequest('/endpoint-inexistente');
    console.log('❌ No se detectó el error esperado');
    return false;
  } catch (error) {
    console.log('✅ Error detectado correctamente:', error.message);
    return true;
  }
};

// Función principal de pruebas
export const ejecutarTodasLasPruebas = async () => {
  console.log('🚀 === INICIANDO PRUEBAS COMPLETAS ===');
  console.log('');
  
  // Prueba 1: Configuración básica
  const configOk = probarConfiguracionBasica();
  console.log('');
  
  // Prueba 2: Conectividad
  const conectividadOk = await probarConectividad();
  console.log('');
  
  if (conectividadOk) {
    // Prueba 3: Endpoints (solo si hay conectividad)
    const endpointsOk = await probarEndpoints();
    console.log('');
    
    // Prueba 4: Manejo de errores
    const erroresOk = await probarManejoErrores();
    console.log('');
    
    // Resumen final
    console.log('📊 === RESUMEN DE PRUEBAS ===');
    console.log(`✅ Configuración: ${configOk ? 'OK' : 'ERROR'}`);
    console.log(`✅ Conectividad: ${conectividadOk ? 'OK' : 'ERROR'}`);
    console.log(`✅ Endpoints: ${Object.values(endpointsOk).every(v => v) ? 'OK' : 'ERROR'}`);
    console.log(`✅ Manejo de errores: ${erroresOk ? 'OK' : 'ERROR'}`);
    
    const todasOk = configOk && conectividadOk && 
                   Object.values(endpointsOk).every(v => v) && erroresOk;
    
    if (todasOk) {
      console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
      console.log('🚀 Tu nueva configuración está lista para usar');
    } else {
      console.log('⚠️ Algunas pruebas fallaron. Revisa los logs anteriores');
    }
    
    return todasOk;
  } else {
    console.log('❌ No se pueden probar endpoints sin conectividad');
    console.log('💡 Verifica que tu backend esté corriendo en el puerto 3000');
    return false;
  }
};

// ========================================
// 🚀 FUNCIONES DE INICIALIZACIÓN
// ========================================

// Función para inicializar y probar automáticamente
export const inicializarYProbar = async () => {
  console.log('🔧 === INICIALIZANDO CONFIGURACIÓN DE API ===');
  
  // Mostrar configuración inicial
  logAPIConfig();
  
  // Ejecutar pruebas
  const resultado = await ejecutarTodasLasPruebas();
  
  return resultado;
};

// Exportar todo para uso externo
export default {
  probarConfiguracionBasica,
  probarConectividad,
  probarEndpoints,
  probarManejoErrores,
  ejecutarTodasLasPruebas,
  inicializarYProbar
};
