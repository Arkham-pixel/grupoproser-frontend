import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  parsearArchivoRiesgosExcel,
  mapearFilasExcelAFilasFormulario,
  generarPlantillaRiesgosExcel,
} from '../../utils/importarRiesgosDesdeExcel';
import { FaClipboardList, FaFileExcel, FaPlus, FaSearch } from 'react-icons/fa';
import MatrizSeccionTitulo from './MatrizSeccionTitulo';
import { MatrizResumenIdentificacion } from './MatrizUiBlocks';
import { CATEGORIAS_RIESGO } from './matrizContenidoShared';
import { matrizBtnPrimary, matrizCard } from './matrizFenixUi';
import './IdentificacionRiesgos.css';
import './matrizFenixTheme.css';

const IdentificacionRiesgos = ({ datos, onDatosChange }) => {
  // Asegurar que datos no sea undefined
  const datosSeguros = datos || {};
  const [riesgos, setRiesgos] = useState(datosSeguros.riesgos || []);
  const [columnasAdicionales, setColumnasAdicionales] = useState(datosSeguros.columnasAdicionales || []);
  const [mostrarModalColumnas, setMostrarModalColumnas] = useState(false);
  const [nuevaColumna, setNuevaColumna] = useState({
    nombre: '',
    tipo: 'texto',
    requerido: false
  });
  const [filasFormulario, setFilasFormulario] = useState(() => {
    if (Array.isArray(datosSeguros.filasFormulario) && datosSeguros.filasFormulario.length > 0) {
      return datosSeguros.filasFormulario;
    }
    if (Array.isArray(datosSeguros.riesgos) && datosSeguros.riesgos.length > 0) {
      return [];
    }
    return [
      {
        id: Date.now().toString(),
        numero: 1,
        procesos: [],
        nombreProceso: '',
        tipoProceso: '',
        riesgoIdentificado: '',
        categorias: {
          estrategico: false,
          cumplimiento: false,
          reputacional: false,
          operativo: false,
          financiero: false,
          tecnologico: false,
          corrupcion: false,
          ddhh: false
        }
      }
    ];
  });
  const omitirGuardadoFilasInicialRef = useRef(
    (datosSeguros.riesgos || []).length > 0
  );
  const [procesoModal, setProcesoModal] = useState({ abierto: false, filaId: null });
  const [importandoExcel, setImportandoExcel] = useState(false);
  const [mensajeImport, setMensajeImport] = useState(null);
  const [modoImportacion, setModoImportacion] = useState('agregar_tabla');
  const inputExcelRef = useRef(null);

  // Datos de referencia para la función BUSCARV (equivalente a la hoja "Datos" en Excel)
  const datosProcesos = [
    { nombre: 'Seleccione', tipo: 'Seleccione' },
    { nombre: 'Gerencia', tipo: 'Estratégico' },
    { nombre: 'Sistemas integrados de gestión', tipo: 'Estratégico' },
    { nombre: 'Deshuese Bovino, Ovino, Caprino', tipo: 'Misionales' },
    { nombre: 'Beneficio Bovino, Ovino, Caprino', tipo: 'Misionales' },
    { nombre: 'Beneficio y deshuese porcino', tipo: 'Misionales' },
    { nombre: 'Curtiembre', tipo: 'Misionales' },
    { nombre: 'Juguetes caninos', tipo: 'Misionales' },
    { nombre: 'Embutidos', tipo: 'Misionales' },
    { nombre: 'Gestión comercial', tipo: 'Misionales' },
    { nombre: 'Gestión logística y despacho', tipo: 'Misionales' },
    { nombre: 'Comercio exterior', tipo: 'Apoyo' },
    { nombre: 'Gestión contable y financiera', tipo: 'Apoyo' },
    { nombre: 'Gestión de compras y almacén', tipo: 'Apoyo' },
    { nombre: 'Seguridad', tipo: 'Apoyo' },
    { nombre: 'Gestión laboral', tipo: 'Apoyo' },
    { nombre: 'Mantenimientos e instalaciones y equipo', tipo: 'Apoyo' },
    { nombre: 'SST', tipo: 'Apoyo' },
    { nombre: 'TI', tipo: 'Apoyo' },
    { nombre: 'Cumplimiento', tipo: 'Apoyo' },
    { nombre: 'Planeación estratégica', tipo: 'Estratégico' },
    { nombre: 'Producción', tipo: 'Misionales' },
    { nombre: 'Todos los procesos', tipo: 'Estratégico' }
  ];

  const tiposProceso = [
    'Seleccione',
    'Estratégico',
    'Misionales',
    'Apoyo'
  ];

  // Función equivalente a BUSCARV para buscar el tipo de proceso
  const buscarTipoProceso = (nombreProceso) => {
    if (!nombreProceso) return '';
    
    // Normalizar texto para búsqueda (remover tildes y convertir a minúsculas)
    const normalizarTexto = (texto) => {
      return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remover tildes
    };
    
    const proceso = datosProcesos.find(p => 
      normalizarTexto(p.nombre) === normalizarTexto(nombreProceso)
    );
    
    return proceso ? proceso.tipo : '';
  };

  const categoriasRiesgo = CATEGORIAS_RIESGO.map(({ valor, etiqueta }) => ({ valor, etiqueta }));

  const handleInputChange = (filaId, campo, valor) => {
    setFilasFormulario(prev => prev.map(fila => {
      if (fila.id === filaId) {
        const nuevaFila = { ...fila, [campo]: valor };
        
        // Si se cambia el nombre del proceso (formato antiguo), mantener compatibilidad
        if (campo === 'nombreProceso') {
          const tipoEncontrado = buscarTipoProceso(valor);
          if (tipoEncontrado) {
            nuevaFila.tipoProceso = tipoEncontrado;
            // Si hay un proceso seleccionado, agregarlo al array de procesos
            if (valor && valor !== 'Seleccione') {
              const procesoEncontrado = datosProcesos.find(p => p.nombre === valor);
              if (procesoEncontrado) {
                const procesos = nuevaFila.procesos || [];
                const existe = procesos.some(p => p.nombre === valor);
                if (!existe) {
                  nuevaFila.procesos = [...procesos, { nombre: valor, tipo: procesoEncontrado.tipo }];
                }
              }
            }
          }
        }
        
        return nuevaFila;
      }
      return fila;
    }));
  };

  // Funciones para gestionar múltiples procesos
  const abrirModalProcesos = (filaId) => {
    setProcesoModal({ abierto: true, filaId });
  };

  const cerrarModalProcesos = () => {
    setProcesoModal({ abierto: false, filaId: null });
  };

  const agregarProceso = (filaId, nombreProceso, tipoProceso) => {
    setFilasFormulario(prev => prev.map(fila => {
      if (fila.id === filaId) {
        const procesos = fila.procesos || [];
        const existe = procesos.some(p => 
          p.nombre.toLowerCase() === nombreProceso.toLowerCase()
        );
        
        if (!existe) {
          const nuevosProcesos = [...procesos, { nombre: nombreProceso, tipo: tipoProceso }];
          return { 
            ...fila, 
            procesos: nuevosProcesos,
            // Mantener compatibilidad: usar el primer proceso como nombreProceso
            nombreProceso: nuevosProcesos.length === 1 ? nuevosProcesos[0].nombre : fila.nombreProceso,
            tipoProceso: nuevosProcesos.length === 1 ? nuevosProcesos[0].tipo : fila.tipoProceso
          };
        }
      }
      return fila;
    }));
  };

  const eliminarProceso = (filaId, indexProceso) => {
    setFilasFormulario(prev => prev.map(fila => {
      if (fila.id === filaId) {
        const procesos = fila.procesos || [];
        const nuevosProcesos = procesos.filter((_, index) => index !== indexProceso);
        return { 
          ...fila, 
          procesos: nuevosProcesos,
          // Actualizar nombreProceso y tipoProceso si se eliminó el primero
          nombreProceso: nuevosProcesos.length > 0 ? nuevosProcesos[0].nombre : '',
          tipoProceso: nuevosProcesos.length > 0 ? nuevosProcesos[0].tipo : ''
        };
      }
      return fila;
    }));
  };

  const handleCategoriaChange = (filaId, categoria, checked) => {
    setFilasFormulario(prev => prev.map(fila => 
      fila.id === filaId ? {
        ...fila,
        categorias: {
          ...fila.categorias,
          [categoria]: checked
        }
      } : fila
    ));
  };

  const agregarFila = () => {
    const nuevaFila = {
      id: Date.now().toString(),
      numero: filasFormulario.length + 1,
      procesos: [], // Nuevo formato
      nombreProceso: '', // Mantener para compatibilidad
      tipoProceso: '', // Mantener para compatibilidad
      riesgoIdentificado: '',
      categorias: {
        estrategico: false,
        cumplimiento: false,
        reputacional: false,
        operativo: false,
        financiero: false,
        tecnologico: false,
        corrupcion: false,
        ddhh: false
      }
    };
    
    // Agregar valores para columnas adicionales
    columnasAdicionales.forEach(col => {
      nuevaFila[col.clave] = '';
    });
    
    setFilasFormulario(prev => [...prev, nuevaFila]);
  };

  const eliminarFila = (filaId) => {
    if (filasFormulario.length > 1) {
      setFilasFormulario(prev => {
        const nuevasFilas = prev.filter(fila => fila.id !== filaId);
        // Renumerar las filas
        return nuevasFilas.map((fila, index) => ({
          ...fila,
          numero: index + 1
        }));
      });
    }
  };

  const agregarColumna = () => {
    if (nuevaColumna.nombre) {
      const columna = {
        ...nuevaColumna,
        id: Date.now().toString(),
        clave: nuevaColumna.nombre.toLowerCase().replace(/\s+/g, '_')
      };
      
      const nuevasColumnas = [...columnasAdicionales, columna];
      setColumnasAdicionales(nuevasColumnas);
      onDatosChange({ ...datosSeguros, columnasAdicionales: nuevasColumnas });
      
      // Limpiar formulario
      setNuevaColumna({
        nombre: '',
        tipo: 'texto',
        requerido: false
      });
      setMostrarModalColumnas(false);
    }
  };

  const eliminarColumna = (id) => {
    const nuevasColumnas = columnasAdicionales.filter(col => col.id !== id);
    setColumnasAdicionales(nuevasColumnas);
    onDatosChange({ ...datosSeguros, columnasAdicionales: nuevasColumnas });
  };

  const handleInputChangeColumna = (campo, valor) => {
    setNuevaColumna(prev => ({ ...prev, [campo]: valor }));
  };

  // Guardar filas del formulario cuando cambien (con debounce para evitar guardados excesivos)
  useEffect(() => {
    if (omitirGuardadoFilasInicialRef.current) {
      omitirGuardadoFilasInicialRef.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      onDatosChange({
        ...datosSeguros,
        filasFormulario
      });
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filasFormulario]);

  const procesarFormulario = () => {
    // Filtrar solo las filas que tienen datos completos (al menos un proceso y riesgo identificado)
    const filasCompletas = filasFormulario.filter(fila => {
      const procesos = fila.procesos || [];
      const tieneProcesos = procesos.length > 0 || (fila.nombreProceso && fila.tipoProceso);
      return tieneProcesos && fila.riesgoIdentificado;
    });

    if (filasCompletas.length === 0) {
      alert('⚠️ No hay filas completas para procesar.\n\nPor favor, llena al menos:\n• Al menos un Proceso (con su tipo)\n• Riesgo Identificado');
      return;
    }

    // Crear riesgos desde las filas completas
    // Si una fila tiene múltiples procesos, crear un riesgo por cada proceso
    const nuevosRiesgos = [];
    filasCompletas.forEach((fila, index) => {
      const procesos = fila.procesos && fila.procesos.length > 0 
        ? fila.procesos 
        : (fila.nombreProceso ? [{ nombre: fila.nombreProceso, tipo: fila.tipoProceso }] : []);
      
      procesos.forEach((proceso, procIndex) => {
        nuevosRiesgos.push({
          id: `${fila.id}-proc-${procIndex}`,
          numero: riesgos.length + nuevosRiesgos.length + 1,
          nombreProceso: proceso.nombre,
          tipoProceso: proceso.tipo,
          riesgoIdentificado: fila.riesgoIdentificado,
          categorias: fila.categorias || {}
        });
      });
    });

    // Agregar los nuevos riesgos a los existentes
    const todosLosRiesgos = [...riesgos, ...nuevosRiesgos];
    setRiesgos(todosLosRiesgos);

    // Actualizar datos globales
    const datosActualizados = {
      ...datosSeguros,
      riesgos: todosLosRiesgos
    };
    onDatosChange(datosActualizados);

    // Limpiar las filas procesadas
    const filasRestantes = filasFormulario.filter(fila => {
      const procesos = fila.procesos || [];
      const tieneProcesos = procesos.length > 0 || (fila.nombreProceso && fila.tipoProceso);
      return !tieneProcesos || !fila.riesgoIdentificado;
    });
    setFilasFormulario(filasRestantes);

    alert(`✅ Formulario Procesado!\n\n📊 Riesgos agregados: ${nuevosRiesgos.length}\n📋 Total de riesgos: ${todosLosRiesgos.length}\n\nLos riesgos han sido agregados a la tabla de abajo.`);
  };

  const finalizarIdentificacion = () => {
    if (riesgos.length === 0) {
      alert('No hay riesgos identificados para finalizar. Por favor, agrega al menos un riesgo primero.');
      return;
    }

    // Marcar la identificación como finalizada
    const datosFinalizados = {
      ...datosSeguros,
      riesgos: riesgos,
      identificacionFinalizada: true,
      fechaFinalizacion: new Date().toISOString()
    };

    console.log('IdentificacionRiesgos - Finalizando identificación con', riesgos.length, 'riesgos');
    console.log('IdentificacionRiesgos - Datos finalizados:', datosFinalizados);
    
    onDatosChange(datosFinalizados);
    
    alert(`✅ Identificación Finalizada!\n\n📊 Resumen:\n• Total de Riesgos: ${riesgos.length}\n• Procesos Únicos: ${new Set(riesgos.map(r => r.nombreProceso)).size}\n• Tipos de Proceso: ${new Set(riesgos.map(r => r.tipoProceso)).size}\n\nLos riesgos están listos para ser valorados en la siguiente pestaña.`);
  };

  const agregarRiesgo = () => {
    // Filtrar solo las filas que tienen datos completos
    const filasCompletas = filasFormulario.filter(fila => {
      const procesos = fila.procesos || [];
      const tieneProcesos = procesos.length > 0 || (fila.nombreProceso && fila.tipoProceso);
      return tieneProcesos && fila.riesgoIdentificado;
    });
    
    if (filasCompletas.length === 0) {
      alert('Por favor completa al menos una fila con todos los campos obligatorios:\n• Al menos un Proceso (con su tipo)\n• Riesgo Identificado');
      return;
    }
    
    // Agregar valores para columnas adicionales
    // Si una fila tiene múltiples procesos, crear un riesgo por cada proceso
    const nuevosRiesgos = [];
    filasCompletas.forEach((fila, index) => {
      const procesos = fila.procesos && fila.procesos.length > 0 
        ? fila.procesos 
        : (fila.nombreProceso ? [{ nombre: fila.nombreProceso, tipo: fila.tipoProceso }] : []);
      
      const columnasAdicionalesData = {};
      columnasAdicionales.forEach(col => {
        columnasAdicionalesData[col.clave] = fila[col.clave] || '';
      });
      
      procesos.forEach((proceso, procIndex) => {
        nuevosRiesgos.push({
          ...fila,
          ...columnasAdicionalesData,
          nombreProceso: proceso.nombre,
          tipoProceso: proceso.tipo,
          id: `${fila.id}-proc-${procIndex}`,
          numero: riesgos.length + nuevosRiesgos.length + 1
        });
      });
    });
    
    const todosLosRiesgos = [...riesgos, ...nuevosRiesgos];
    console.log('IdentificacionRiesgos - Riesgos agregados:', nuevosRiesgos);
    console.log('IdentificacionRiesgos - Total de riesgos:', todosLosRiesgos);
    setRiesgos(todosLosRiesgos);
    onDatosChange({ ...datosSeguros, riesgos: todosLosRiesgos });
    
    // Limpiar formulario - mantener solo una fila vacía
    setFilasFormulario([{
      id: Date.now().toString(),
      numero: 1,
      procesos: [],
      nombreProceso: '',
      tipoProceso: '',
      riesgoIdentificado: '',
      categorias: {
        estrategico: false,
        cumplimiento: false,
        reputacional: false,
        operativo: false,
        financiero: false,
        tecnologico: false,
        corrupcion: false,
        ddhh: false
      }
    }]);
  };

  const eliminarRiesgo = (id) => {
    const nuevosRiesgos = riesgos.filter(riesgo => riesgo.id !== id);
    // Renumerar después de eliminar
    const riesgosRenumerados = nuevosRiesgos.map((riesgo, index) => ({
      ...riesgo,
      numero: index + 1
    }));
    setRiesgos(riesgosRenumerados);
    onDatosChange({ ...datosSeguros, riesgos: riesgosRenumerados });
  };

  const getCategoriasSeleccionadas = (categorias) => {
    return categoriasRiesgo.filter(cat => categorias[cat.valor]);
  };

  const convertirFilasFormularioARiesgos = useCallback(
    (filasEntrada, baseRiesgos = riesgos) => {
      const nuevosRiesgos = [];
      filasEntrada.forEach((fila) => {
        const procesos =
          fila.procesos?.length > 0
            ? fila.procesos
            : fila.nombreProceso
              ? [{ nombre: fila.nombreProceso, tipo: fila.tipoProceso || buscarTipoProceso(fila.nombreProceso) || 'Misionales' }]
              : [{ nombre: 'Sin proceso', tipo: 'Misionales' }];

        const columnasAdicionalesData = {};
        columnasAdicionales.forEach((col) => {
          columnasAdicionalesData[col.clave] = fila[col.clave] || '';
        });

        procesos.forEach((proceso, procIndex) => {
          nuevosRiesgos.push({
            ...fila,
            ...columnasAdicionalesData,
            nombreProceso: proceso.nombre,
            tipoProceso: proceso.tipo,
            id: `${fila.id}-proc-${procIndex}`,
            numero: baseRiesgos.length + nuevosRiesgos.length + 1,
          });
        });
      });
      return nuevosRiesgos;
    },
    [riesgos, columnasAdicionales]
  );

  const filasFormularioTienenDatos = (filas) =>
    filas.some((f) => {
      const tieneProcesos = (f.procesos?.length || 0) > 0 || (f.nombreProceso && f.tipoProceso);
      return tieneProcesos || Boolean(f.riesgoIdentificado?.trim());
    });

  const handleDescargarPlantillaExcel = () => {
    try {
      generarPlantillaRiesgosExcel();
    } catch (error) {
      alert('No se pudo generar la plantilla: ' + error.message);
    }
  };

  const handleArchivoExcel = async (event) => {
    const archivo = event.target.files?.[0];
    event.target.value = '';
    if (!archivo) return;

    const ext = archivo.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'xlsm'].includes(ext || '')) {
      setMensajeImport({ tipo: 'error', texto: 'Use un archivo Excel (.xlsx, .xls).' });
      return;
    }

    setImportandoExcel(true);
    setMensajeImport(null);

    try {
      const parsed = await parsearArchivoRiesgosExcel(archivo);
      const { filas, omitidas } = mapearFilasExcelAFilasFormulario(
        parsed.filasDatos,
        buscarTipoProceso
      );

      if (!filas.length) {
        throw new Error(
          'No se importó ningún riesgo. Revise que exista la columna RIESGO IDENTIFICADO con datos.'
        );
      }

      if (modoImportacion === 'agregar_tabla') {
        const nuevosRiesgos = convertirFilasFormularioARiesgos(filas);
        const todosLosRiesgos = [...riesgos, ...nuevosRiesgos].map((r, index) => ({
          ...r,
          numero: index + 1,
        }));
        setRiesgos(todosLosRiesgos);
        onDatosChange({
          ...datosSeguros,
          riesgos: todosLosRiesgos,
          filasFormulario,
        });
      } else if (modoImportacion === 'reemplazar_formulario') {
        const renumeradas = filas.map((f, index) => ({ ...f, numero: index + 1 }));
        setFilasFormulario(renumeradas);
        onDatosChange({ ...datosSeguros, filasFormulario: renumeradas });
      } else {
        const base = filasFormularioTienenDatos(filasFormulario) ? filasFormulario : [];
        const merged = [...base, ...filas].map((f, index) => ({ ...f, numero: index + 1 }));
        setFilasFormulario(merged);
        onDatosChange({ ...datosSeguros, filasFormulario: merged });
      }

      const omitidasTxt =
        omitidas.length > 0 ? ` (${omitidas.length} fila(s) omitidas sin riesgo).` : '';
      setMensajeImport({
        tipo: 'ok',
        texto: `Se importaron ${filas.length} riesgo(s) desde «${parsed.nombreHoja}».${omitidasTxt}`,
      });
    } catch (error) {
      console.error('Error importando Excel:', error);
      setMensajeImport({
        tipo: 'error',
        texto: error.message || 'Error al leer el archivo Excel.',
      });
    } finally {
      setImportandoExcel(false);
    }
  };

  return (
    <div className="identificacion-riesgos">
      <MatrizSeccionTitulo
        icon={FaSearch}
        title="Importar desde Excel"
        description="Cargue riesgos desde plantilla o agregue filas manualmente en el formulario."
      />

      <div className="importar-excel-panel">
        <div className="importar-excel-info">
          <h4>Importar riesgos desde Excel</h4>
          <p>
            Cargue un archivo con columnas como <strong>NOMBRE DEL PROCESO</strong>,{' '}
            <strong>TIPO DE PROCESO</strong>, <strong>RIESGO IDENTIFICADO</strong> y categorías
            (marque con X). Puede descargar la plantilla de ejemplo.
          </p>
        </div>
        <div className="importar-excel-controles">
          <label className="importar-excel-modo">
            <span>Destino:</span>
            <select
              value={modoImportacion}
              onChange={(e) => setModoImportacion(e.target.value)}
              disabled={importandoExcel}
            >
              <option value="agregar_tabla">Agregar directo a la tabla de riesgos</option>
              <option value="agregar_formulario">Agregar al formulario (revisar antes)</option>
              <option value="reemplazar_formulario">Reemplazar filas del formulario</option>
            </select>
          </label>
          <div className="importar-excel-botones">
            <button
              type="button"
              className="btn-plantilla-excel"
              onClick={handleDescargarPlantillaExcel}
              disabled={importandoExcel}
            >
              📄 Descargar plantilla
            </button>
            <input
              ref={inputExcelRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              className="input-excel-file"
              onChange={handleArchivoExcel}
              disabled={importandoExcel}
            />
            <button
              type="button"
              className="btn-importar-excel"
              onClick={() => inputExcelRef.current?.click()}
              disabled={importandoExcel}
            >
              {importandoExcel ? 'Leyendo archivo…' : '📂 Seleccionar Excel'}
            </button>
          </div>
        </div>
        {mensajeImport && (
          <div className={`importar-excel-mensaje importar-excel-mensaje--${mensajeImport.tipo}`}>
            {mensajeImport.texto}
          </div>
        )}
      </div>

      <div className="identificacion-content">
        {/* Formulario estilo Excel para agregar riesgos */}
        <div className="formulario-excel">
          <MatrizSeccionTitulo icon={FaPlus} title="Agregar nuevos riesgos" />
          
          <div className="tabla-formulario-container">
            <table className="tabla-formulario" style={{ width: '1560px', minWidth: '1560px' }}>
              <thead>
                <tr>
                  <th className="col-numero" style={{ width: '60px', minWidth: '60px' }}>No.</th>
                  <th className="col-proceso" style={{ width: '250px', minWidth: '250px' }}>NOMBRE DEL PROCESO</th>
                  <th className="col-tipo" style={{ width: '200px', minWidth: '200px' }}>TIPO DE PROCESO</th>
                  <th className="col-riesgo" style={{ width: '350px', minWidth: '350px' }}>RIESGO IDENTIFICADO</th>
                  <th className="col-categorias-header" colSpan="8" style={{ width: '600px', minWidth: '600px' }}>CATEGORÍA DEL RIESGO (marque X)</th>
                  {columnasAdicionales.map(columna => (
                    <th key={columna.id} className="col-adicional">
                      {columna.nombre.toUpperCase()}
                    </th>
                  ))}
                  <th className="col-acciones" style={{ width: '100px', minWidth: '100px' }}>Acciones</th>
                </tr>
                <tr>
                  <th className="col-numero"></th>
                  <th className="col-proceso"></th>
                  <th className="col-tipo"></th>
                  <th className="col-riesgo"></th>
                  <th className="col-categorias">Estratégico</th>
                  <th className="col-categorias">Cumplimiento</th>
                  <th className="col-categorias">Reputacional</th>
                  <th className="col-categorias">Operativo</th>
                  <th className="col-categorias">Financiero</th>
                  <th className="col-categorias">Tecnológico</th>
                  <th className="col-categorias">Corrupción</th>
                  <th className="col-categorias">DDHH</th>
                  {columnasAdicionales.map(columna => (
                    <th key={columna.id} className="col-adicional"></th>
                  ))}
                  <th className="col-acciones"></th>
                </tr>
              </thead>
              <tbody>
                {filasFormulario.map((fila, index) => (
                  <tr key={fila.id} className="fila-formulario">
                    <td className="col-numero" style={{ width: '60px', minWidth: '60px' }}>
                      <span className="numero-auto">{fila.numero}</span>
                    </td>
                    <td className="col-proceso" style={{ width: '250px', minWidth: '250px' }}>
                      <div style={{ position: 'relative' }}>
                        {(() => {
                          const procesos = fila.procesos || [];
                          return (
                            <div>
                              {procesos.length > 0 ? (
                                <div style={{ marginBottom: '8px' }}>
                                  {procesos.map((proceso, idx) => (
                                    <div 
                                      key={idx} 
                                      style={{
                                        padding: '4px 8px',
                                        marginBottom: '4px',
                                        backgroundColor: '#e3f2fd',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <span>
                                        <strong>{proceso.nombre}</strong> 
                                        <span style={{ color: '#666', marginLeft: '6px', fontSize: '0.8rem' }}>
                                          ({proceso.tipo})
                                        </span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => eliminarProceso(fila.id, idx)}
                                        style={{
                                          background: '#dc3545',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '3px',
                                          padding: '2px 6px',
                                          cursor: 'pointer',
                                          fontSize: '0.75rem'
                                        }}
                                        title="Eliminar proceso"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ 
                                  padding: '8px', 
                                  textAlign: 'center', 
                                  color: '#999',
                                  fontSize: '0.85rem',
                                  fontStyle: 'italic'
                                }}>
                                  Sin procesos
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => abrirModalProcesos(fila.id)}
                                style={{
                                  width: '100%',
                                  padding: '6px',
                                  background: '#0d6efd',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  fontWeight: '600'
                                }}
                              >
                                + Agregar Proceso
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="col-tipo" style={{ width: '200px', minWidth: '200px' }}>
                      <div 
                        className="tipo-proceso-display"
                        style={{
                          backgroundColor: fila.procesos && fila.procesos.length > 0 ? '#d4edda' : '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          padding: '8px 12px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: fila.procesos && fila.procesos.length > 0 ? '#155724' : '#6c757d',
                          position: 'relative',
                          fontSize: '0.85rem'
                        }}
                        title={fila.procesos && fila.procesos.length > 0 ? `✅ ${fila.procesos.length} proceso(s) agregado(s)` : 'Agrega procesos para ver sus tipos'}
                      >
                        {fila.procesos && fila.procesos.length > 0 
                          ? `${fila.procesos.length} proceso(s)` 
                          : 'Agrega procesos'}
                        {fila.procesos && fila.procesos.length > 0 && (
                          <span className="auto-fill-indicator" title="Procesos agregados">
                            ✅
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="col-riesgo">
                      <textarea
                        value={fila.riesgoIdentificado}
                        onChange={(e) => handleInputChange(fila.id, 'riesgoIdentificado', e.target.value)}
                        placeholder="Describe el riesgo..."
                        className="textarea-excel"
                        rows="2"
                      />
                    </td>
                    <td className="col-categorias text-center">
                      <input
                        type="checkbox"
                        checked={fila.categorias.estrategico}
                        onChange={(e) => handleCategoriaChange(fila.id, 'estrategico', e.target.checked)}
                        className="checkbox-excel"
                      />
                    </td>
                    <td className="col-categorias text-center">
                      <input
                        type="checkbox"
                        checked={fila.categorias.cumplimiento}
                        onChange={(e) => handleCategoriaChange(fila.id, 'cumplimiento', e.target.checked)}
                        className="checkbox-excel"
                      />
                    </td>
                    <td className="col-categorias text-center">
                      <input
                        type="checkbox"
                        checked={fila.categorias.reputacional}
                        onChange={(e) => handleCategoriaChange(fila.id, 'reputacional', e.target.checked)}
                        className="checkbox-excel"
                      />
                    </td>
                    <td className="col-categorias text-center">
                      <input
                        type="checkbox"
                        checked={fila.categorias.operativo}
                        onChange={(e) => handleCategoriaChange(fila.id, 'operativo', e.target.checked)}
                        className="checkbox-excel"
                      />
                    </td>
                    <td className="col-categorias text-center">
                      <input
                        type="checkbox"
                        checked={fila.categorias.financiero}
                        onChange={(e) => handleCategoriaChange(fila.id, 'financiero', e.target.checked)}
                        className="checkbox-excel"
                      />
                    </td>
                    <td className="col-categorias text-center">
                      <input
                        type="checkbox"
                        checked={fila.categorias.tecnologico}
                        onChange={(e) => handleCategoriaChange(fila.id, 'tecnologico', e.target.checked)}
                        className="checkbox-excel"
                      />
                    </td>
                    <td className="col-categorias text-center">
                      <input
                        type="checkbox"
                        checked={fila.categorias.corrupcion}
                        onChange={(e) => handleCategoriaChange(fila.id, 'corrupcion', e.target.checked)}
                        className="checkbox-excel"
                      />
                    </td>
                    <td className="col-categorias text-center">
                      <input
                        type="checkbox"
                        checked={fila.categorias.ddhh}
                        onChange={(e) => handleCategoriaChange(fila.id, 'ddhh', e.target.checked)}
                        className="checkbox-excel"
                      />
                    </td>
                    {columnasAdicionales.map(columna => (
                      <td key={columna.id} className="col-adicional">
                        {columna.tipo === 'texto' ? (
                          <input
                            type="text"
                            value={fila[columna.clave] || ''}
                            onChange={(e) => handleInputChange(fila.id, columna.clave, e.target.value)}
                            placeholder={`${columna.nombre}...`}
                            className="input-excel"
                          />
                        ) : columna.tipo === 'numero' ? (
                          <input
                            type="number"
                            value={fila[columna.clave] || ''}
                            onChange={(e) => handleInputChange(fila.id, columna.clave, e.target.value)}
                            placeholder="0"
                            className="input-excel"
                          />
                        ) : columna.tipo === 'fecha' ? (
                          <input
                            type="date"
                            value={fila[columna.clave] || ''}
                            onChange={(e) => handleInputChange(fila.id, columna.clave, e.target.value)}
                            className="input-excel"
                          />
                        ) : (
                          <input
                            type="text"
                            value={fila[columna.clave] || ''}
                            onChange={(e) => handleInputChange(fila.id, columna.clave, e.target.value)}
                            placeholder={`${columna.nombre}...`}
                            className="input-excel"
                          />
                        )}
                      </td>
                    ))}
                    <td className="col-acciones">
                      <div className="acciones-fila">
                        {filasFormulario.length > 1 && (
                          <button 
                            onClick={() => eliminarFila(fila.id)}
                            className="btn-eliminar-fila"
                            title="Eliminar fila"
                          >
                            🗑️
                          </button>
                        )}
                        {index === filasFormulario.length - 1 && (
                          <button 
                            onClick={agregarRiesgo}
                            className="btn-agregar-excel"
                            title="Agregar todos los riesgos"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="formulario-footer">
            <button 
              onClick={agregarFila}
              className="btn-agregar-fila"
              title="Agregar nueva fila"
            >
              ➕ Agregar Fila
            </button>
            
            <button 
              onClick={procesarFormulario}
              className="btn-procesar-formulario"
              title="Procesar todas las filas completas"
            >
              ⚡ Procesar Formulario
            </button>
          </div>
        </div>

        {/* Tabla de riesgos identificados */}
        <div className="tabla-riesgos">
          <MatrizSeccionTitulo
            icon={FaClipboardList}
            title={`Riesgos identificados (${riesgos.length})`}
          />

          {riesgos.length === 0 ? (
            <div className="sin-riesgos">
              <div className="sin-riesgos-icono">📝</div>
              <h5>No hay riesgos identificados</h5>
              <p>Comienza agregando el primer riesgo usando el formulario de arriba.</p>
            </div>
          ) : (
            <div className="tabla-container">
              <table className="tabla-identificacion">
                <thead>
                  {/* Fila 4 - Headers principales */}
                  <tr>
                    <th className="col-numero">No.</th>
                    <th className="col-proceso">NOMBRE DEL PROCESO</th>
                    <th className="col-tipo">TIPO DE PROCESO</th>
                    <th className="col-riesgo">RIESGO IDENTIFICADO</th>
                    <th className="col-categorias-header" colSpan="8">CATEGORÍA DEL RIESGO (marque X)</th>
                    {columnasAdicionales.map(columna => (
                      <th key={columna.id} className="col-adicional">
                        {columna.nombre.toUpperCase()}
                      </th>
                    ))}
                    <th className="col-acciones">Acciones</th>
                  </tr>
                  {/* Fila 5 - Subheaders de categorías */}
                  <tr>
                    <th className="col-numero"></th>
                    <th className="col-proceso"></th>
                    <th className="col-tipo"></th>
                    <th className="col-riesgo"></th>
                    <th className="col-categorias">Estratégico</th>
                    <th className="col-categorias">Cumplimiento</th>
                    <th className="col-categorias">Reputacional</th>
                    <th className="col-categorias">Operativo</th>
                    <th className="col-categorias">Financiero</th>
                    <th className="col-categorias">Tecnológico</th>
                    <th className="col-categorias">Corrupción</th>
                    <th className="col-categorias">DDHH</th>
                    {columnasAdicionales.map(columna => (
                      <th key={columna.id} className="col-adicional"></th>
                    ))}
                    <th className="col-acciones"></th>
                  </tr>
                </thead>
                <tbody>
                  {riesgos.map(riesgo => (
                    <tr key={riesgo.id}>
                      <td className="col-numero">{riesgo.numero}</td>
                      <td className="col-proceso">{riesgo.nombreProceso}</td>
                      <td className="col-tipo">{riesgo.tipoProceso}</td>
                      <td className="col-riesgo">{riesgo.riesgoIdentificado}</td>
                      <td className="col-categorias text-center">
                        {riesgo.categorias.estrategico ? 'X' : ''}
                      </td>
                      <td className="col-categorias text-center">
                        {riesgo.categorias.cumplimiento ? 'X' : ''}
                      </td>
                      <td className="col-categorias text-center">
                        {riesgo.categorias.reputacional ? 'X' : ''}
                      </td>
                      <td className="col-categorias text-center">
                        {riesgo.categorias.operativo ? 'X' : ''}
                      </td>
                      <td className="col-categorias text-center">
                        {riesgo.categorias.financiero ? 'X' : ''}
                      </td>
                      <td className="col-categorias text-center">
                        {riesgo.categorias.tecnologico ? 'X' : ''}
                      </td>
                      <td className="col-categorias text-center">
                        {riesgo.categorias.corrupcion ? 'X' : ''}
                      </td>
                      <td className="col-categorias text-center">
                        {riesgo.categorias.ddhh ? 'X' : ''}
                      </td>
                      {columnasAdicionales.map(columna => (
                        <td key={columna.id} className="col-adicional">
                          {riesgo[columna.clave] || ''}
                        </td>
                      ))}
                      <td className="col-acciones">
                        <button 
                          onClick={() => eliminarRiesgo(riesgo.id)}
                          className="btn-eliminar-tabla"
                          title="Eliminar riesgo"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <MatrizResumenIdentificacion riesgos={riesgos} />

        {riesgos.length > 0 && (
          <div className={`${matrizCard} finalizar-identificacion-section flex flex-col items-center text-center`}>
            <button type="button" className={matrizBtnPrimary} onClick={finalizarIdentificacion}>
              Finalizar identificación de riesgos
            </button>
            <p className="finalizar-descripcion mt-3 max-w-md font-body text-sm text-gray-500 dark:text-gray-400">
              Al finalizar, los riesgos identificados estarán disponibles para valoración en la siguiente
              sección.
            </p>
          </div>
        )}
      </div>

      {/* Modal para agregar columnas adicionales */}
      {mostrarModalColumnas && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📊 Agregar Columna Adicional</h3>
              <button 
                onClick={() => setMostrarModalColumnas(false)}
                className="btn-cerrar-modal"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="campo-formulario">
                <label htmlFor="nombreColumna">
                  Nombre de la Columna *
                </label>
                <input
                  type="text"
                  id="nombreColumna"
                  value={nuevaColumna.nombre}
                  onChange={(e) => handleInputChangeColumna('nombre', e.target.value)}
                  placeholder="Ej: Responsable, Fecha Límite, Prioridad"
                  className="campo-input"
                />
              </div>

              <div className="campo-formulario">
                <label htmlFor="tipoColumna">
                  Tipo de Campo *
                </label>
                <select
                  id="tipoColumna"
                  value={nuevaColumna.tipo}
                  onChange={(e) => handleInputChangeColumna('tipo', e.target.value)}
                  className="campo-input"
                >
                  <option value="texto">Texto</option>
                  <option value="numero">Número</option>
                  <option value="fecha">Fecha</option>
                </select>
              </div>

              <div className="campo-formulario">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={nuevaColumna.requerido}
                    onChange={(e) => handleInputChangeColumna('requerido', e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Campo requerido</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setMostrarModalColumnas(false)}
                className="btn-cancelar"
              >
                Cancelar
              </button>
              <button 
                onClick={agregarColumna}
                className="btn-confirmar"
                disabled={!nuevaColumna.nombre}
              >
                Agregar Columna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar procesos */}
      {procesoModal.abierto && (
        <ModalProcesos
          filaId={procesoModal.filaId}
          procesosExistentes={filasFormulario.find(f => f.id === procesoModal.filaId)?.procesos || []}
          datosProcesos={datosProcesos.filter(p => p.nombre !== 'Seleccione')}
          tiposProceso={tiposProceso.filter(t => t !== 'Seleccione')}
          onAgregar={agregarProceso}
          onCerrar={cerrarModalProcesos}
        />
      )}
    </div>
  );
};

// Componente Modal para gestionar procesos
const ModalProcesos = ({ filaId, procesosExistentes, datosProcesos, tiposProceso, onAgregar, onCerrar }) => {
  const [modo, setModo] = useState('seleccionar'); // 'seleccionar' o 'nuevo'
  const [procesoSeleccionado, setProcesoSeleccionado] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('Estratégico');

  const handleAgregarDesdeLista = () => {
    if (procesoSeleccionado) {
      const proceso = datosProcesos.find(p => p.nombre === procesoSeleccionado);
      if (proceso) {
        onAgregar(filaId, proceso.nombre, proceso.tipo);
        setProcesoSeleccionado('');
      }
    }
  };

  const handleAgregarNuevo = () => {
    if (nuevoNombre.trim() && nuevoTipo) {
      onAgregar(filaId, nuevoNombre.trim(), nuevoTipo);
      setNuevoNombre('');
      setNuevoTipo('Estratégico');
      setModo('seleccionar');
    }
  };

  // Filtrar procesos que ya están agregados
  const procesosDisponibles = datosProcesos.filter(p => 
    !procesosExistentes.some(ep => ep.nombre.toLowerCase() === p.nombre.toLowerCase())
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>📋 Gestionar Procesos</h3>
          <button
            onClick={onCerrar}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        {/* Procesos existentes */}
        {procesosExistentes.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>Procesos agregados:</h4>
            {procesosExistentes.map((proceso, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  marginBottom: '6px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}
              >
                <strong>{proceso.nombre}</strong> <span style={{ color: '#666' }}>({proceso.tipo})</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs para seleccionar o crear nuevo */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e0e0e0' }}>
            <button
              onClick={() => setModo('seleccionar')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: modo === 'seleccionar' ? '#0d6efd' : 'transparent',
                color: modo === 'seleccionar' ? 'white' : '#666',
                cursor: 'pointer',
                borderRadius: '4px 4px 0 0',
                fontWeight: modo === 'seleccionar' ? '600' : '400'
              }}
            >
              Seleccionar de lista
            </button>
            <button
              onClick={() => setModo('nuevo')}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: modo === 'nuevo' ? '#0d6efd' : 'transparent',
                color: modo === 'nuevo' ? 'white' : '#666',
                cursor: 'pointer',
                borderRadius: '4px 4px 0 0',
                fontWeight: modo === 'nuevo' ? '600' : '400'
              }}
            >
              Agregar nuevo proceso
            </button>
          </div>
        </div>

        {/* Contenido según el modo */}
        {modo === 'seleccionar' ? (
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
              Seleccionar proceso:
            </label>
            <select
              value={procesoSeleccionado}
              onChange={(e) => setProcesoSeleccionado(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '15px',
                fontSize: '0.95rem'
              }}
            >
              <option value="">Seleccione un proceso...</option>
              {procesosDisponibles.map((proceso, idx) => (
                <option key={idx} value={proceso.nombre}>
                  {proceso.nombre} ({proceso.tipo})
                </option>
              ))}
            </select>
            {procesosDisponibles.length === 0 && (
              <p style={{ color: '#999', fontSize: '0.9rem', fontStyle: 'italic' }}>
                Todos los procesos de la lista ya han sido agregados
              </p>
            )}
            <button
              onClick={handleAgregarDesdeLista}
              disabled={!procesoSeleccionado || procesosDisponibles.length === 0}
              style={{
                width: '100%',
                padding: '12px',
                background: procesoSeleccionado && procesosDisponibles.length > 0 ? '#0d6efd' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: procesoSeleccionado && procesosDisponibles.length > 0 ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              Agregar Proceso
            </button>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
              Nombre del proceso:
            </label>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Gestión de calidad"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '15px',
                fontSize: '0.95rem'
              }}
            />
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
              Tipo de proceso:
            </label>
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginBottom: '15px',
                fontSize: '0.95rem'
              }}
            >
              {tiposProceso.map((tipo, idx) => (
                <option key={idx} value={tipo}>{tipo}</option>
              ))}
            </select>
            <button
              onClick={handleAgregarNuevo}
              disabled={!nuevoNombre.trim()}
              style={{
                width: '100%',
                padding: '12px',
                background: nuevoNombre.trim() ? '#28a745' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: nuevoNombre.trim() ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              Agregar Nuevo Proceso
            </button>
          </div>
        )}

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button
            onClick={onCerrar}
            style={{
              padding: '10px 20px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentificacionRiesgos;
