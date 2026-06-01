/**
 * Servicio de mapeo de funcionarios de aseguradora
 * 
 * Este servicio mantiene un mapeo de códigos de funcionarios a sus nombres
 * para asegurar que siempre se muestre el nombre en lugar del código
 */

import { BASE_URL } from '../config/apiConfig.js';

// Cache del mapeo de funcionarios
let funcionariosMap = new Map();
let funcionariosCargados = false;
let cargaEnProgreso = null;

/**
 * Carga todos los funcionarios de todas las aseguradoras y crea un mapeo código -> nombre
 */
export async function cargarMapeoFuncionarios() {
  // Si ya está cargado, retornar el mapeo existente
  if (funcionariosCargados && funcionariosMap.size > 0) {
    return funcionariosMap;
  }

  // Si hay una carga en progreso, esperar a que termine
  if (cargaEnProgreso) {
    return cargaEnProgreso;
  }

  // Iniciar nueva carga
  cargaEnProgreso = (async () => {
    try {
      console.log('🔄 [FuncionarioMapper] Cargando mapeo de funcionarios...');
      
      // Obtener todas las aseguradoras primero
      const clientesResponse = await fetch(`${BASE_URL}/api/clientes`);
      if (!clientesResponse.ok) {
        throw new Error(`Error obteniendo clientes: ${clientesResponse.status}`);
      }
      
      const clientesData = await clientesResponse.json();
      const clientes = Array.isArray(clientesData) ? clientesData : (clientesData.success && clientesData.data ? clientesData.data : []);
      
      console.log(`📊 [FuncionarioMapper] Encontradas ${clientes.length} aseguradoras`);
      
      // Cargar funcionarios de cada aseguradora
      const promesasFuncionarios = clientes.map(async (cliente) => {
        try {
          const codigoCliente = cliente.codiAsgrdra || cliente.cod1Asgrdra;
          if (!codigoCliente) {
            return [];
          }

          const funcionariosResponse = await fetch(`${BASE_URL}/api/funcionarios-aseguradora?codiAsgrdra=${codigoCliente}`);
          if (!funcionariosResponse.ok) {
            console.warn(`⚠️ [FuncionarioMapper] Error obteniendo funcionarios para ${codigoCliente}: ${funcionariosResponse.status}`);
            return [];
          }

          const funcionariosData = await funcionariosResponse.json();
          const funcionarios = funcionariosData.success && funcionariosData.data 
            ? funcionariosData.data 
            : (Array.isArray(funcionariosData) ? funcionariosData : []);

          return funcionarios.map(f => ({
            codigo: f.id ?? f.codiContacto ?? f.codigo ?? f._id ?? f.codiFuncionario ?? '',
            nombre: f.nmbrContcto || f.nombre || f.label || '',
            codigoCliente: codigoCliente
          }));
        } catch (error) {
          console.error(`❌ [FuncionarioMapper] Error cargando funcionarios para cliente ${cliente.codiAsgrdra}:`, error);
          return [];
        }
      });

      const resultados = await Promise.allSettled(promesasFuncionarios);
      const todosLosFuncionarios = resultados
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .filter(f => f.codigo && f.nombre);

      // Crear el mapeo
      funcionariosMap.clear();
      todosLosFuncionarios.forEach(funcionario => {
        const codigoStr = String(funcionario.codigo).trim();
        const nombreStr = String(funcionario.nombre).trim();
        const codigoCliente = String(funcionario.codigoCliente || '').trim();
        
        // Mapear por código directo
        if (codigoStr && nombreStr) {
          funcionariosMap.set(codigoStr, nombreStr);
          
          // También mapear el nombre como clave (por si acaso)
          if (codigoStr !== nombreStr) {
            funcionariosMap.set(nombreStr, nombreStr);
          }
          
          // Mapear por combinación aseguradora_código para búsquedas más precisas
          if (codigoCliente) {
            const claveCombinada = `${codigoCliente}_${codigoStr}`;
            funcionariosMap.set(claveCombinada, nombreStr);
          }
          
          // Mapear variaciones del código (con/sin espacios, mayúsculas/minúsculas)
          const codigoLower = codigoStr.toLowerCase();
          if (codigoLower !== codigoStr) {
            funcionariosMap.set(codigoLower, nombreStr);
          }
        }
      });

      funcionariosCargados = true;
      console.log(`✅ [FuncionarioMapper] Mapeo cargado: ${funcionariosMap.size} funcionarios mapeados`);
      
      // Log de algunos funcionarios para debugging
      if (funcionariosMap.size > 0) {
        const primerosFuncionarios = Array.from(funcionariosMap.entries()).slice(0, 5);
        console.log('📋 [FuncionarioMapper] Ejemplos de funcionarios mapeados:', primerosFuncionarios);
      }
      
      return funcionariosMap;
    } catch (error) {
      console.error('❌ [FuncionarioMapper] Error cargando mapeo de funcionarios:', error);
      funcionariosCargados = false;
      throw error;
    } finally {
      cargaEnProgreso = null;
    }
  })();

  return cargaEnProgreso;
}

/**
 * Obtiene el nombre de un funcionario a partir de su código
 * @param {string|number} codigo - Código del funcionario
 * @param {string} nombreAlternativo - Nombre alternativo si no se encuentra el código
 * @param {string} codigoAseguradora - Código de la aseguradora (opcional, para búsqueda más precisa)
 * @returns {string} Nombre del funcionario o el código si no se encuentra
 */
export function obtenerNombreFuncionario(codigo, nombreAlternativo = null, codigoAseguradora = null) {
  // Si no hay código, retornar el nombre alternativo o "Sin asignar"
  if (!codigo || codigo === '' || codigo === 'null' || codigo === 'undefined') {
    return nombreAlternativo || 'Sin asignar';
  }

  const codigoStr = String(codigo).trim();

  // Si el código es "Sin asignar", retornar eso
  if (codigoStr === 'Sin asignar' || codigoStr.toLowerCase() === 'sin asignar') {
    return 'Sin asignar';
  }

  // Si ya es un nombre (no es numérico y tiene más de 3 caracteres), retornarlo
  if (!/^\d+$/.test(codigoStr) && codigoStr.length > 3) {
    return codigoStr;
  }

  // Buscar en el mapeo por código directo
  let nombreEncontrado = funcionariosMap.get(codigoStr);
  if (nombreEncontrado) {
    return nombreEncontrado;
  }

  // Si hay código de aseguradora, intentar buscar en el mapeo con esa combinación
  // (esto es útil si el mapeo almacena información por aseguradora)
  if (codigoAseguradora) {
    const claveCombinada = `${codigoAseguradora}_${codigoStr}`;
    nombreEncontrado = funcionariosMap.get(claveCombinada);
    if (nombreEncontrado) {
      return nombreEncontrado;
    }
  }

  // Si hay nombre alternativo y no es "Sin asignar", usarlo
  if (nombreAlternativo && 
      nombreAlternativo !== 'Sin asignar' && 
      nombreAlternativo.toLowerCase() !== 'sin asignar' &&
      !/^\d+$/.test(String(nombreAlternativo).trim())) {
    return nombreAlternativo;
  }

  // Si no se encuentra y es código numérico, intentar cargar el mapeo si no está cargado
  if (!funcionariosCargados && /^\d+$/.test(codigoStr)) {
    cargarMapeoFuncionarios().catch(err => {
      console.warn('⚠️ [FuncionarioMapper] No se pudo cargar el mapeo:', err);
    });
  }

  // Si es código numérico y no se encontró, intentar buscar de forma asíncrona
  // pero por ahora retornar el código (se actualizará cuando se cargue el mapeo)
  if (/^\d+$/.test(codigoStr)) {
    // Intentar buscar de forma asíncrona si el mapeo está cargando
    if (cargaEnProgreso) {
      cargaEnProgreso.then(() => {
        const nombreActualizado = funcionariosMap.get(codigoStr);
        if (nombreActualizado && nombreActualizado !== codigoStr) {
          console.log(`✅ [FuncionarioMapper] Nombre actualizado para código ${codigoStr}: ${nombreActualizado}`);
        }
      }).catch(() => {});
    } else if (funcionariosCargados) {
      // Si el mapeo está cargado pero no encontramos el código, loguear para debugging
      console.warn(`⚠️ [FuncionarioMapper] Código ${codigoStr} no encontrado en mapeo (${funcionariosMap.size} funcionarios cargados)`);
    }
  }

  return codigoStr;
}

/**
 * Obtiene el nombre de un funcionario desde un objeto caso
 * @param {object} caso - Objeto caso con información del funcionario
 * @returns {string} Nombre del funcionario
 */
export function obtenerNombreFuncionarioDesdeCaso(caso) {
  // Intentar obtener el código del funcionario desde múltiples campos posibles
  const codigo = caso.funcAsgrdra || 
                 caso.funcionarioAseguradoraId || 
                 caso.funcionarioAseguradora || 
                 '';
  
  // Intentar obtener el nombre desde múltiples campos posibles
  const nombreAlternativo = caso.funcAsgrdraNombre || 
                           caso.funcionarioAseguradora || 
                           caso.nombreFuncionario ||
                           '';
  
  // Obtener código de aseguradora para búsqueda más precisa
  const codigoAseguradora = caso.codiAsgrdra || 
                           caso.cod1Asgrdra || 
                           caso.aseguradora || 
                           null;
  
  // Si el código está vacío o es inválido
  if (!codigo || codigo === '' || codigo === 'null' || codigo === 'undefined') {
    // Si hay nombre alternativo válido, usarlo
    if (nombreAlternativo && 
        nombreAlternativo !== 'Sin asignar' && 
        nombreAlternativo.toLowerCase() !== 'sin asignar') {
      return nombreAlternativo;
    }
    return 'Sin asignar';
  }
  
  const codigoStr = String(codigo).trim();
  const esCodigoNumerico = /^\d+$/.test(codigoStr);
  
  // Si ya tenemos un nombre válido (no es código numérico y no es "Sin asignar"), usarlo
  if (nombreAlternativo && 
      nombreAlternativo !== 'Sin asignar' && 
      nombreAlternativo.toLowerCase() !== 'sin asignar' &&
      !/^\d+$/.test(String(nombreAlternativo).trim()) &&
      nombreAlternativo.length > 3) {
    // Verificar que no sea el mismo código
    if (nombreAlternativo !== codigoStr) {
      return nombreAlternativo;
    }
  }
  
  // Si es código numérico, buscar en el mapeo
  if (esCodigoNumerico) {
    const nombreDelMapeo = obtenerNombreFuncionario(codigoStr, nombreAlternativo, codigoAseguradora);
    // Si el mapeo devolvió algo diferente al código, usarlo
    if (nombreDelMapeo && nombreDelMapeo !== codigoStr && !/^\d+$/.test(nombreDelMapeo)) {
      return nombreDelMapeo;
    }
  }
  
  // Si el código no es numérico y tiene más de 3 caracteres, probablemente es un nombre
  if (codigoStr && !esCodigoNumerico && codigoStr.length > 3) {
    return codigoStr;
  }
  
  // Si tenemos nombre alternativo válido, usarlo
  if (nombreAlternativo && 
      nombreAlternativo !== 'Sin asignar' && 
      nombreAlternativo.toLowerCase() !== 'sin asignar' &&
      nombreAlternativo !== codigoStr) {
    return nombreAlternativo;
  }
  
  // Último recurso: retornar el código (o "Sin asignar" si está vacío)
  return codigoStr || 'Sin asignar';
}

/**
 * Fuerza la recarga del mapeo de funcionarios
 */
export function recargarMapeoFuncionarios() {
  funcionariosCargados = false;
  funcionariosMap.clear();
  return cargarMapeoFuncionarios();
}

/**
 * Obtiene el mapeo completo (solo lectura)
 */
export function obtenerMapeoCompleto() {
  return new Map(funcionariosMap);
}

