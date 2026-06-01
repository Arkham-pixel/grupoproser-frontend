// Utilidades para manejo correcto de fechas evitando problemas de zona horaria

/**
 * Convierte una fecha en formato ISO (YYYY-MM-DD) o string a una fecha local
 * sin problemas de zona horaria
 * @param {string|Date} fecha - Fecha en formato ISO o Date object
 * @returns {Date|null} - Fecha en zona horaria local o null si es inválida
 */
export const crearFechaLocal = (fecha) => {
  if (!fecha) return null;
  
  // Si es un string que contiene "NaN" o "Invalid", retornar null
  if (typeof fecha === 'string' && (fecha.includes('NaN') || fecha.includes('Invalid'))) {
    return null;
  }
  
  // Si ya es un objeto Date, validarlo
  if (fecha instanceof Date) {
    // Verificar que la fecha sea válida
    if (isNaN(fecha.getTime()) || fecha.toString() === 'Invalid Date') {
      return null;
    }
    // Verificar que la fecha sea razonable (entre 1900 y 2100)
    const año = fecha.getFullYear();
    if (año < 1900 || año > 2100) {
      return null;
    }
    return fecha;
  }
  
  // Si es un string en formato ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
    // Verificar si tiene hora en el string (contiene 'T' seguido de hora)
    if (fecha.includes('T') && /T\d{2}:\d{2}/.test(fecha)) {
      // Si tiene hora, usar directamente el constructor Date que parsea ISO correctamente
      // pero ajustar a la zona horaria local para preservar la hora real
      try {
        const fechaParsed = new Date(fecha);
        
        // Validar que la fecha sea válida
        if (isNaN(fechaParsed.getTime()) || fechaParsed.toString() === 'Invalid Date') {
          return null;
        }
        
        // Verificar que la fecha sea razonable
        const año = fechaParsed.getFullYear();
        if (año < 1900 || año > 2100) {
          return null;
        }
        
        // Retornar la fecha parseada directamente (mantiene la hora original)
        return fechaParsed;
      } catch (e) {
        return null;
      }
    } else {
      // Si solo tiene fecha sin hora, extraer solo la parte de fecha (YYYY-MM-DD)
      // MongoDB devuelve fechas en formato ISO con hora UTC, lo que puede causar cambios de día
      const fechaPart = fecha.split('T')[0].split(' ')[0];
      const [year, month, day] = fechaPart.split('-');
      
      // Validar que los valores sean números válidos
      const año = parseInt(year);
      const mes = parseInt(month);
      const dia = parseInt(day);
      
      if (isNaN(año) || isNaN(mes) || isNaN(dia)) {
        return null;
      }
      
      // Crear fecha a mediodía (12:00) en zona horaria local para evitar problemas de zona horaria
      // Esto asegura que aunque se convierta a UTC, el día se mantenga correcto
      const fechaLocal = new Date(año, mes - 1, dia, 12, 0, 0);
      
      // Validar que la fecha sea válida
      if (isNaN(fechaLocal.getTime()) || fechaLocal.toString() === 'Invalid Date') {
        return null;
      }
      
      // Verificar que la fecha sea razonable
      if (año < 1900 || año > 2100) {
        return null;
      }
      
      return fechaLocal;
    }
  }
  
  // Para otros formatos, intentar parsear
  try {
    const fechaLocal = new Date(fecha);
    // Validar que la fecha sea válida
    if (isNaN(fechaLocal.getTime()) || fechaLocal.toString() === 'Invalid Date') {
      return null;
    }
    // Verificar que la fecha sea razonable
    const año = fechaLocal.getFullYear();
    if (año < 1900 || año > 2100) {
      return null;
    }
    return fechaLocal;
  } catch (e) {
    return null;
  }
};

/**
 * Formatea una fecha para mostrar en la interfaz de usuario
 * @param {string|Date} fecha - Fecha a formatear
 * @param {string} locale - Locale para el formateo (default: 'es-ES')
 * @param {object} options - Opciones de formateo
 * @returns {string} - Fecha formateada
 */
export const formatearFechaUI = (fecha, locale = 'es-ES', options = {}) => {
  const fechaLocal = crearFechaLocal(fecha);
  if (!fechaLocal) return '';
  
  // Usar métodos getDate(), getMonth(), getFullYear() para evitar problemas de zona horaria
  // Estos métodos siempre devuelven valores en la zona horaria local
  const dia = fechaLocal.getDate();
  const mes = fechaLocal.getMonth() + 1;
  const año = fechaLocal.getFullYear();
  
  // Formatear manualmente para evitar problemas de zona horaria con toLocaleDateString
  return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año}`;
};

/**
 * Formatea una fecha para exportación a Excel (como string)
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha en formato DD/MM/YYYY o cadena vacía si es inválida
 * @deprecated Usar convertirFechaParaExcelDate() para obtener objetos Date
 */
export const formatearFechaParaExcel = (fecha) => {
  // Validar entrada
  if (!fecha || fecha === null || fecha === undefined) {
    return '';
  }
  
  // Si es string y contiene NaN o Invalid, retornar vacío
  if (typeof fecha === 'string' && (fecha.includes('NaN') || fecha.includes('Invalid'))) {
    return '';
  }
  
  const fechaLocal = crearFechaLocal(fecha);
  if (!fechaLocal) {
    return '';
  }
  
  // Validar que la fecha sea válida antes de formatear
  try {
    const dia = fechaLocal.getDate();
    const mes = fechaLocal.getMonth() + 1;
    const año = fechaLocal.getFullYear();
    
    // Verificar que los valores sean números válidos
    if (isNaN(dia) || isNaN(mes) || isNaN(año)) {
      return '';
    }
    
    // Verificar que la fecha sea razonable
    if (año < 1900 || año > 2100) {
      return '';
    }
    
    return `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año}`;
  } catch (e) {
    return '';
  }
};

/**
 * Convierte una fecha a un objeto Date para exportación a Excel
 * Excel reconocerá esto como tipo fecha (no texto), mejorando el rendimiento
 * @param {string|Date} fecha - Fecha a convertir
 * @returns {Date|null} - Objeto Date válido o null si es inválida
 */
export const convertirFechaParaExcelDate = (fecha) => {
  // Validar entrada
  if (!fecha || fecha === null || fecha === undefined) {
    return null;
  }
  
  // Si es string y contiene NaN o Invalid, retornar null
  if (typeof fecha === 'string' && (fecha.includes('NaN') || fecha.includes('Invalid'))) {
    return null;
  }
  
  // Si ya es un objeto Date válido, retornarlo
  if (fecha instanceof Date) {
    if (!isNaN(fecha.getTime()) && fecha.toString() !== 'Invalid Date') {
      const año = fecha.getFullYear();
      if (año >= 1900 && año <= 2100) {
        return fecha;
      }
    }
    return null;
  }
  
  // Si es un string, intentar parsearlo
  if (typeof fecha === 'string') {
    const s = fecha.trim();
    if (!s) return null;
    
    // Preferir solo la parte de fecha para evitar desfases por zona horaria
    const soloFecha = s.includes('T') ? s.split('T')[0] : s.split(' ')[0];
    
    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
      const [y, m, d] = soloFecha.split('-').map((n) => parseInt(n, 10));
      // Usar mediodía local para evitar cambios por DST/UTC
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      if (!isNaN(dt.getTime())) {
        const año = dt.getFullYear();
        if (año >= 1900 && año <= 2100) {
          return dt;
        }
      }
      return null;
    }
    
    // Formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(soloFecha)) {
      const [d, m, y] = soloFecha.split('/').map((n) => parseInt(n, 10));
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      if (!isNaN(dt.getTime())) {
        const año = dt.getFullYear();
        if (año >= 1900 && año <= 2100) {
          return dt;
        }
      }
      return null;
    }
    
    // Fallback: intentar parseo nativo (puede incluir hora)
    const dt = new Date(s);
    if (!isNaN(dt.getTime()) && dt.toString() !== 'Invalid Date') {
      const año = dt.getFullYear();
      if (año >= 1900 && año <= 2100) {
        return dt;
      }
    }
    return null;
  }
  
  // Para otros tipos, usar crearFechaLocal como fallback
  const fechaLocal = crearFechaLocal(fecha);
  if (!fechaLocal) {
    return null;
  }
  
  return fechaLocal;
};

/**
 * Formatea una fecha para exportación a Word
 * @param {string|Date} fecha - Fecha a formatear
 * @param {string} locale - Locale para el formateo (default: 'es-CO')
 * @returns {string} - Fecha formateada para Word
 */
export const formatearFechaParaWord = (fecha, locale = 'es-CO') => {
  const fechaLocal = crearFechaLocal(fecha);
  if (!fechaLocal) return '';
  
  return fechaLocal.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Obtiene la fecha actual en formato ISO para nombres de archivo
 * @returns {string} - Fecha actual en formato YYYY-MM-DD
 */
export const obtenerFechaActualISO = () => {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
  const dia = ahora.getDate().toString().padStart(2, '0');
  return `${año}-${mes}-${dia}`;
};

/**
 * Obtiene la fecha y hora actual en formato ISO
 * @returns {string} - Fecha y hora actual en formato ISO
 */
export const obtenerFechaHoraActualISO = () => {
  return new Date().toISOString();
};

/**
 * Formatea una fecha con hora para mostrar en la interfaz
 * @param {string|Date} fecha - Fecha a formatear
 * @param {string} locale - Locale para el formateo (default: 'es-ES')
 * @returns {string} - Fecha y hora formateada
 */
export const formatearFechaHoraUI = (fecha, locale = 'es-ES') => {
  const fechaLocal = crearFechaLocal(fecha);
  if (!fechaLocal) return '';
  
  return fechaLocal.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Obtiene la hora actual formateada para Colombia
 * @returns {string} - Hora actual en formato HH:MM:SS
 */
export const obtenerHoraActualColombia = () => {
  return new Date().toLocaleTimeString('es-CO', { 
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Obtiene la fecha y hora actual para Colombia
 * @returns {string} - Fecha y hora actual en formato ISO para Colombia
 */
export const obtenerFechaHoraActualColombia = () => {
  const ahora = new Date();
  const colombiaTime = new Date(ahora.toLocaleString("en-US", {timeZone: "America/Bogota"}));
  return colombiaTime.toISOString();
};

/**
 * Formatea una hora específica para Colombia
 * @param {string|Date} fecha - Fecha/hora a formatear
 * @returns {string} - Hora formateada para Colombia
 */
export const formatearHoraColombia = (fecha) => {
  if (!fecha) return '';
  const fechaLocal = crearFechaLocal(fecha);
  if (!fechaLocal) return '';
  
  return fechaLocal.toLocaleTimeString('es-CO', { 
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
