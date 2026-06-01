/**
 * Script para generar el manual de uso del formulario de puertos
 * 
 * Uso: Ejecutar desde la consola del navegador
 * 
 * Ejemplo:
 *   import('./utils/generarManualPuertosDesdeConsola.js').then(m => m.generarManual());
 */

import { generarManualPuertos } from '../components/FormularioPuertosModular/generarManualPuertos.js';

/**
 * Función para generar el manual - puede ejecutarse desde la consola
 */
export const generarManual = async () => {
  console.log('📘 Generando manual de uso del formulario de puertos...');
  try {
    const resultado = await generarManualPuertos();
    console.log('✅ Manual generado exitosamente:', resultado.nombreArchivo);
    alert(`✅ Manual generado exitosamente: ${resultado.nombreArchivo}`);
    return resultado;
  } catch (error) {
    console.error('❌ Error al generar manual:', error);
    alert('❌ Error al generar el manual: ' + error.message);
    throw error;
  }
};

// Si se ejecuta directamente, generar el manual
if (typeof window !== 'undefined') {
  window.generarManualPuertos = generarManual;
  console.log('💡 Función disponible: window.generarManualPuertos()');
}














