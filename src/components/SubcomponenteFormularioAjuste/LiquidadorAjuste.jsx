import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaCalculator } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

export default function LiquidadorAjuste({ formData, onInputChange }) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const tableHeaderBg = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE';
  const tableHeaderText = theme === 'dark' ? '#93C5FD' : '#1E3A8A';
  const totalRowBg = theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#D1FAE5';
  const totalRowText = theme === 'dark' ? '#86EFAC' : '#065F46';

  // Inicializar liquidador si no existe
  const liquidador = formData.liquidador || {
    items: [],
    limiteAsegurado: '',
    deduciblePorcentaje: 15,
    deducibleSMMLV: false,
    valorSMMLV: 0,
    cantidadSMMLV: 4, // Cantidad de SMMLV para el deducible
    // Valores de la tabla de resumen (editables independientes)
    resumenTotalAjustado: '',
    resumenDeducible15: '',
    resumenDeducibleSMMLV: '',
    resumenTotalIndemnizar: ''
  };

  // Función para formatear números con separadores de miles
  const formatearNumero = (valor) => {
    if (!valor || valor === '') return '0';
    // Remover caracteres no numéricos excepto punto y coma
    let numero = String(valor).replace(/[^\d.,]/g, '');
    // Si tiene punto y coma, el punto es separador de miles y la coma es decimal
    // Si solo tiene puntos, son separadores de miles
    if (numero.includes(',') && numero.includes('.')) {
      // Tiene ambos: punto es miles, coma es decimal
      numero = numero.replace(/\./g, '').replace(',', '.');
    } else if (numero.includes('.') && !numero.includes(',')) {
      // Solo tiene puntos: son separadores de miles
      numero = numero.replace(/\./g, '');
    } else if (numero.includes(',')) {
      // Solo tiene coma: es decimal
      numero = numero.replace(',', '.');
    }
    return numero;
  };

  // Función para formatear número para mostrar
  const formatearNumeroMostrar = (valor) => {
    if (valor === '' || valor === null || valor === undefined) return '';
    const numero = typeof valor === 'number' ? valor : parseFloat(formatearNumero(valor));
    if (isNaN(numero)) return '';
    // Formatear el número manteniendo el signo negativo si existe
    const esNegativo = numero < 0;
    const numeroAbsoluto = Math.abs(numero);
    const formateado = new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numeroAbsoluto);
    // Agregar el signo negativo si el número es negativo
    return esNegativo ? `-${formateado}` : formateado;
  };

  // Calcular totales
  const calcularTotales = () => {
    const totalReclamado = liquidador.items.reduce((sum, item) => {
      const valor = parseFloat(formatearNumero(item.valorReclamado || 0));
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);

    const totalAjustado = liquidador.items.reduce((sum, item) => {
      const valor = parseFloat(formatearNumero(item.valorAjustado || 0));
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);

    // Deducible por porcentaje: Total valor ajustado × porcentaje
    const porcentajeDeducible = parseFloat(liquidador.deduciblePorcentaje) || 15;
    const deduciblePorcentaje = totalAjustado * (porcentajeDeducible / 100);

    // Deducible SMMLV: valor SMMLV × cantidad
    const valorSMMLV = parseFloat(formatearNumero(liquidador.valorSMMLV || 0));
    const cantidadSMMLV = parseFloat(liquidador.cantidadSMMLV) || 4;
    const deducibleSMMLV = (isNaN(valorSMMLV) ? 0 : valorSMMLV) * cantidadSMMLV;

    // Aplicar el deducible de mayor valor
    const deducible = Math.max(deduciblePorcentaje, deducibleSMMLV);
    
    // Total a indemnizar: Total valor ajustado - Deducible
    const totalIndemnizar = totalAjustado - deducible;

    return {
      totalReclamado,
      totalAjustado,
      deduciblePorcentaje,
      deducibleSMMLV,
      deducible,
      totalIndemnizar
    };
  };

  const totales = calcularTotales();

  // Calcular valores del cuadro pequeño automáticamente (solo para mostrar)
  const calcularResumen = () => {
    const totalAjustadoStr = formatearNumero(liquidador.resumenTotalAjustado || '0');
    const totalAjustadoResumen = parseFloat(totalAjustadoStr) || 0;
    
    // Deducible: Total del valor ajustado × porcentaje del deducible
    const porcentajeDeducible = parseFloat(liquidador.deduciblePorcentaje) || 15;
    const deducible15Resumen = totalAjustadoResumen * (porcentajeDeducible / 100);
    
    // Deducible SMMLV: valor SMMLV × cantidad
    const valorSMMLVStr = formatearNumero(liquidador.valorSMMLV || '0');
    const valorSMMLV = parseFloat(valorSMMLVStr) || 0;
    const cantidadSMMLV = parseFloat(liquidador.cantidadSMMLV) || 4;
    const deducibleSMMLVResumen = valorSMMLV * cantidadSMMLV;
    
    // Seleccionar deducible de mayor valor para mostrar/aplicar
    const usarDeducibleSMMLV = deducibleSMMLVResumen > deducible15Resumen;
    const deducibleSeleccionadoResumen = usarDeducibleSMMLV ? deducibleSMMLVResumen : deducible15Resumen;

    // Total a indemnizar: Total ajustado - deducible de mayor valor
    const deducibleMayorResumen = Math.max(deducible15Resumen, deducibleSMMLVResumen);
    const totalIndemnizarResumen = totalAjustadoResumen - deducibleMayorResumen;

    return {
      deducible15: deducible15Resumen,
      deducibleSMMLV: deducibleSMMLVResumen,
      usaSMMLV: usarDeducibleSMMLV,
      deducibleSeleccionado: deducibleSeleccionadoResumen,
      totalIndemnizar: totalIndemnizarResumen
    };
  };

  const resumenCalculado = calcularResumen();

  // Actualizar valores calculados cuando cambian los parámetros (excepto cuando se sincroniza desde el cuadro grande)
  useEffect(() => {
    // Si no hay total ajustado, limpiar los valores
    if (!liquidador.resumenTotalAjustado || liquidador.resumenTotalAjustado === '') {
      onInputChange('liquidador', {
        ...liquidador,
        resumenDeducible15: '',
        resumenDeducibleSMMLV: '',
        resumenTotalIndemnizar: ''
      });
      return;
    }

    // Solo calcular si hay un valor ajustado válido
    const totalAjustadoNum = parseFloat(formatearNumero(liquidador.resumenTotalAjustado));
    if (totalAjustadoNum > 0) {
      const nuevoResumen = calcularResumen();
      const deducible15Actual = formatearNumeroMostrar(nuevoResumen.deducible15);
      const deducibleSMMLVActual = formatearNumeroMostrar(nuevoResumen.deducibleSMMLV);
      const totalIndemnizarActual = formatearNumeroMostrar(nuevoResumen.totalIndemnizar);
      
      // Solo actualizar si los valores han cambiado
      if (liquidador.resumenDeducible15 !== deducible15Actual ||
          liquidador.resumenDeducibleSMMLV !== deducibleSMMLVActual ||
          liquidador.resumenTotalIndemnizar !== totalIndemnizarActual) {
        onInputChange('liquidador', {
          ...liquidador,
          resumenDeducible15: deducible15Actual,
          resumenDeducibleSMMLV: deducibleSMMLVActual,
          resumenTotalIndemnizar: totalIndemnizarActual
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador.resumenTotalAjustado, liquidador.deduciblePorcentaje, liquidador.valorSMMLV, liquidador.cantidadSMMLV]);

  // Sincronizar automáticamente el total ajustado del cuadro grande al cuadro pequeño
  useEffect(() => {
    // Si no hay items o el total es 0, limpiar los valores del resumen
    if (!liquidador.items || liquidador.items.length === 0 || totales.totalAjustado === 0) {
      onInputChange('liquidador', {
        ...liquidador,
        resumenTotalAjustado: '',
        resumenDeducible15: '',
        resumenDeducibleSMMLV: '',
        resumenTotalIndemnizar: ''
      });
      return;
    }

    // Solo sincronizar si hay un total ajustado mayor a 0
    if (totales.totalAjustado > 0) {
      const totalAjustadoFormateado = formatearNumeroMostrar(totales.totalAjustado);
      const totalAjustadoActual = parseFloat(formatearNumero(liquidador.resumenTotalAjustado || 0));
      
      // Solo actualizar si el campo está vacío o si el valor del cuadro grande es diferente
      if (!liquidador.resumenTotalAjustado || 
          Math.abs(totalAjustadoActual - totales.totalAjustado) > 0.01) {
        // Calcular valores del cuadro pequeño basados en el total ajustado del cuadro grande
        const totalAjustadoParaCalcular = totales.totalAjustado;
        // Deducible: Total del valor ajustado × porcentaje del deducible (igual que el cuadro grande)
        const porcentajeDeducible = parseFloat(liquidador.deduciblePorcentaje) || 15;
        const deducibleCalc = totalAjustadoParaCalcular * (porcentajeDeducible / 100);
        const valorSMMLV = parseFloat(formatearNumero(liquidador.valorSMMLV || 0));
        const cantidadSMMLV = liquidador.cantidadSMMLV || 4;
        const deducibleSMMLVCalc = valorSMMLV * cantidadSMMLV;
        // Total a indemnizar: Total valor ajustado - deducible de mayor valor (puede ser negativo)
        const deducibleMayorCalc = Math.max(deducibleCalc, deducibleSMMLVCalc);
        const totalIndemnizarCalc = totalAjustadoParaCalcular - deducibleMayorCalc;
        
        onInputChange('liquidador', {
          ...liquidador,
          resumenTotalAjustado: totalAjustadoFormateado,
          resumenDeducible15: formatearNumeroMostrar(deducibleCalc),
          resumenDeducibleSMMLV: formatearNumeroMostrar(deducibleSMMLVCalc),
          resumenTotalIndemnizar: formatearNumeroMostrar(totalIndemnizarCalc)
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totales.totalAjustado, liquidador.items?.length]);

  // Agregar nuevo item
  const agregarItem = () => {
    const nuevoItem = {
      id: Date.now(),
      bienAfectado: '',
      limiteAsegurado: liquidador.limiteAsegurado || '',
      valorReclamado: '',
      valorAjustado: '',
      observacion: ''
    };
    
    const nuevosItems = [...(liquidador.items || []), nuevoItem];
    onInputChange('liquidador', {
      ...liquidador,
      items: nuevosItems
    });
  };

  // Eliminar item
  const eliminarItem = (id) => {
    const nuevosItems = liquidador.items.filter(item => item.id !== id);
    onInputChange('liquidador', {
      ...liquidador,
      items: nuevosItems
    });
  };

  // Actualizar item
  const actualizarItem = (id, campo, valor) => {
    const nuevosItems = liquidador.items.map(item => {
      if (item.id === id) {
        return { ...item, [campo]: valor };
      }
      return item;
    });
    
    onInputChange('liquidador', {
      ...liquidador,
      items: nuevosItems
    });
  };

  // Actualizar límite asegurado (aplicar a todos los items)
  const actualizarLimiteAsegurado = (valor) => {
    const nuevosItems = liquidador.items.map(item => ({
      ...item,
      limiteAsegurado: valor
    }));
    
    onInputChange('liquidador', {
      ...liquidador,
      limiteAsegurado: valor,
      items: nuevosItems
    });
  };

  return (
    <div className="space-y-4">
      <div 
        className="pb-4"
        style={{
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-xl font-bold flex items-center"
          style={{ color: textPrimary }}
        >
          <FaCalculator className="mr-3" style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }} />
          LIQUIDADOR
        </h3>
        <p 
          className="mt-2 text-sm"
          style={{ color: textSecondary }}
        >
          Tabla de liquidación de pérdida con cálculos automáticos
        </p>
      </div>

      {/* Límite Asegurado Global */}
      <div className="mb-4">
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          Límite Asegurado (aplicado a todos los items)
        </label>
        <input
          type="text"
          value={liquidador.limiteAsegurado || ''}
          onChange={(e) => actualizarLimiteAsegurado(e.target.value)}
          placeholder="Ej: $ 7.548.808.800"
          className="w-full px-3 py-2 rounded-md focus:outline-none"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
        />
      </div>

      {/* Configuración de Deducibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            Porcentaje de Deducible (%)
          </label>
          <input
            type="number"
            value={liquidador.deduciblePorcentaje || 15}
            onChange={(e) => onInputChange('liquidador', {
              ...liquidador,
              deduciblePorcentaje: parseFloat(e.target.value) || 15
            })}
            min="0"
            max="100"
            step="0.1"
            className="w-full px-3 py-2 rounded-md focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            Valor SMMLV
          </label>
          <input
            type="text"
            value={liquidador.valorSMMLV || ''}
            onChange={(e) => onInputChange('liquidador', {
              ...liquidador,
              valorSMMLV: e.target.value
            })}
            placeholder="Ej: $ 1.750.905"
            className="w-full px-3 py-2 rounded-md focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            Cantidad SMMLV
          </label>
          <input
            type="number"
            value={liquidador.cantidadSMMLV || 4}
            onChange={(e) => onInputChange('liquidador', {
              ...liquidador,
              cantidadSMMLV: parseFloat(e.target.value) || 4
            })}
            min="0"
            step="1"
            className="w-full px-3 py-2 rounded-md focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
      </div>

      {/* Tabla de Items */}
      <div className="overflow-x-auto">
        <table 
          className="w-full border-collapse"
          style={{ border: `1px solid ${borderColor}` }}
        >
          <thead>
            <tr style={{ backgroundColor: tableHeaderBg }}>
              <th 
                className="p-3 text-left text-sm font-semibold"
                style={{ 
                  color: tableHeaderText,
                  border: `1px solid ${borderColor}`
                }}
              >
                BIEN AFECTADO
              </th>
              <th 
                className="p-3 text-left text-sm font-semibold"
                style={{ 
                  color: tableHeaderText,
                  border: `1px solid ${borderColor}`
                }}
              >
                LÍMITE ASEGURADO
              </th>
              <th 
                className="p-3 text-left text-sm font-semibold"
                style={{ 
                  color: tableHeaderText,
                  border: `1px solid ${borderColor}`
                }}
              >
                VALOR RECLAMADO
              </th>
              <th 
                className="p-3 text-left text-sm font-semibold"
                style={{ 
                  color: tableHeaderText,
                  border: `1px solid ${borderColor}`
                }}
              >
                VALOR AJUSTADO
              </th>
              <th 
                className="p-3 text-left text-sm font-semibold"
                style={{ 
                  color: tableHeaderText,
                  border: `1px solid ${borderColor}`
                }}
              >
                OBSERVACIÓN
              </th>
              <th 
                className="p-3 text-center text-sm font-semibold"
                style={{ 
                  color: tableHeaderText,
                  border: `1px solid ${borderColor}`
                }}
              >
                ACCIÓN
              </th>
            </tr>
          </thead>
          <tbody>
            {liquidador.items && liquidador.items.length > 0 ? (
              liquidador.items.map((item, index) => (
                <tr 
                  key={item.id}
                  style={{
                    backgroundColor: index % 2 === 0 
                      ? (theme === 'dark' ? '#1F1F1F' : '#F9FAFB')
                      : (theme === 'dark' ? '#1A1A1A' : '#FFFFFF'),
                    border: `1px solid ${borderColor}`
                  }}
                >
                  <td 
                    className="p-2"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <textarea
                      value={item.bienAfectado || ''}
                      onChange={(e) => actualizarItem(item.id, 'bienAfectado', e.target.value)}
                      placeholder="Descripción del bien afectado"
                      rows={2}
                      className="w-full px-2 py-1 text-sm rounded focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                  </td>
                  <td 
                    className="p-2"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <input
                      type="text"
                      value={item.limiteAsegurado || ''}
                      onChange={(e) => actualizarItem(item.id, 'limiteAsegurado', e.target.value)}
                      placeholder="$ 0"
                      className="w-full px-2 py-1 text-sm rounded focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                  </td>
                  <td 
                    className="p-2"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <input
                      type="text"
                      value={item.valorReclamado || ''}
                      onChange={(e) => actualizarItem(item.id, 'valorReclamado', e.target.value)}
                      placeholder="$ 0"
                      className="w-full px-2 py-1 text-sm rounded focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                  </td>
                  <td 
                    className="p-2"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <input
                      type="text"
                      value={item.valorAjustado || ''}
                      onChange={(e) => actualizarItem(item.id, 'valorAjustado', e.target.value)}
                      placeholder="$ 0"
                      className="w-full px-2 py-1 text-sm rounded focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                  </td>
                  <td 
                    className="p-2"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <textarea
                      value={item.observacion || ''}
                      onChange={(e) => actualizarItem(item.id, 'observacion', e.target.value)}
                      placeholder="Observaciones"
                      rows={2}
                      className="w-full px-2 py-1 text-sm rounded focus:outline-none"
                      style={{
                        backgroundColor: inputBg,
                        color: textPrimary,
                        border: `1px solid ${borderColor}`
                      }}
                    />
                  </td>
                  <td 
                    className="p-2 text-center"
                    style={{ border: `1px solid ${borderColor}` }}
                  >
                    <button
                      onClick={() => eliminarItem(item.id)}
                      className="px-2 py-1 rounded transition-colors"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#EF4444',
                        color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#EF4444';
                      }}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan="6" 
                  className="p-4 text-center"
                  style={{ 
                    color: textSecondary,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  No hay items agregados. Haz clic en "Agregar Item" para comenzar.
                </td>
              </tr>
            )}
          </tbody>
          {/* Totales */}
          {liquidador.items && liquidador.items.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: totalRowBg }}>
                <td 
                  colSpan="2"
                  className="p-3 font-bold text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  TOTAL
                </td>
                <td 
                  className="p-3 font-bold text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  $ {formatearNumeroMostrar(totales.totalReclamado)}
                </td>
                <td 
                  className="p-3 font-bold text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  $ {formatearNumeroMostrar(totales.totalAjustado)}
                </td>
                <td colSpan="2" style={{ border: `1px solid ${borderColor}` }}></td>
              </tr>
              <tr style={{ backgroundColor: totalRowBg }}>
                <td 
                  colSpan="3"
                  className="p-3 font-bold text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  DEDUCIBLE {liquidador.deduciblePorcentaje}%
                </td>
                <td 
                  className="p-3 font-bold text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  $ {formatearNumeroMostrar(totales.deduciblePorcentaje)}
                </td>
                <td colSpan="2" style={{ border: `1px solid ${borderColor}` }}></td>
              </tr>
              <tr style={{ backgroundColor: totalRowBg }}>
                <td 
                  colSpan="3"
                  className="p-3 font-bold text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  DEDUCIBLE {liquidador.cantidadSMMLV || 4} SMMLV
                </td>
                <td 
                  className="p-3 font-bold text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  $ {formatearNumeroMostrar(totales.deducibleSMMLV)}
                </td>
                <td colSpan="2" style={{ border: `1px solid ${borderColor}` }}></td>
              </tr>
              <tr style={{ backgroundColor: totalRowBg }}>
                <td 
                  colSpan="3"
                  className="p-3 font-bold text-lg"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  TOTAL A INDEMNIZAR
                </td>
                <td 
                  className="p-3 font-bold text-lg"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  $ {formatearNumeroMostrar(totales.totalIndemnizar)}
                </td>
                <td colSpan="2" style={{ border: `1px solid ${borderColor}` }}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Botón Agregar Item */}
      <div className="flex justify-end mt-4">
        <button
          onClick={agregarItem}
          className="px-4 py-2 rounded-lg transition-colors flex items-center font-medium"
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A',
            color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#15803D';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A';
          }}
        >
          <FaPlus className="mr-2" />
          Agregar Item
        </button>
      </div>

      {/* Tabla de Resumen de Deducibles - Independiente con cálculos automáticos */}
      <div className="mt-6">
        <h4 
          className="text-lg font-semibold mb-3"
          style={{ color: textPrimary }}
        >
          Resumen de Liquidación
        </h4>
        <p 
          className="text-xs mb-3"
          style={{ color: textSecondary }}
        >
          El total ajustado se sincroniza automáticamente desde la tabla principal. Los deducibles se calculan automáticamente.
        </p>
        <div className="overflow-x-auto">
          <table 
            className="w-full border-collapse"
            style={{ 
              border: `1px solid ${borderColor}`,
              maxWidth: '500px'
            }}
          >
              <tbody>
                <tr style={{ backgroundColor: totalRowBg }}>
                  <td 
                    className="p-3 text-sm"
                    style={{ 
                      color: totalRowText,
                      border: `1px solid ${borderColor}`
                    }}
                  >
                    Total del valor ajustado
                  </td>
                  <td 
                    className="p-3"
                    style={{ 
                      color: totalRowText,
                      border: `1px solid ${borderColor}`
                    }}
                  >
                  <input
                    type="text"
                    value={liquidador.resumenTotalAjustado || ''}
                    readOnly
                    placeholder={totales.totalAjustado > 0 ? `$ ${formatearNumeroMostrar(totales.totalAjustado)}` : "Ej: $ 60.098.890,05"}
                    className="w-full px-2 py-1 text-sm rounded focus:outline-none font-bold"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F3F4F6',
                      color: totalRowText,
                      border: `1px solid ${borderColor}`,
                      cursor: 'not-allowed'
                    }}
                  />
                  </td>
                </tr>
              <tr style={{ backgroundColor: totalRowBg }}>
                <td 
                  className="p-3 text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  {resumenCalculado.usaSMMLV
                    ? `deducible ${liquidador.cantidadSMMLV || 4} SMMLV`
                    : `deducible ${liquidador.deduciblePorcentaje}%`}
                </td>
                <td 
                  className="p-3"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  <input
                    type="text"
                    value={liquidador.resumenTotalAjustado ? formatearNumeroMostrar(resumenCalculado.deducibleSeleccionado) : ''}
                    readOnly
                    className="w-full px-2 py-1 text-sm rounded focus:outline-none"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F3F4F6',
                      color: totalRowText,
                      border: `1px solid ${borderColor}`,
                      cursor: 'not-allowed'
                    }}
                  />
                </td>
              </tr>
              <tr style={{ backgroundColor: totalRowBg }}>
                <td 
                  className="p-3 font-bold text-sm"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  Total a indemnizar
                </td>
                <td 
                  className="p-3"
                  style={{ 
                    color: totalRowText,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  <input
                    type="text"
                    value={liquidador.resumenTotalAjustado ? formatearNumeroMostrar(resumenCalculado.totalIndemnizar) : ''}
                    readOnly
                    className="w-full px-2 py-1 text-sm rounded focus:outline-none font-bold"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F3F4F6',
                      color: totalRowText,
                      border: `1px solid ${borderColor}`,
                      cursor: 'not-allowed'
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
