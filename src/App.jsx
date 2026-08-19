// src/App.jsx
import React from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BASE_URL } from './config/apiConfig.js'

import Login from './components/login'
import Register from './components/Register'
import ResetPassword from './components/ResetPassword'
import ChangePasswordWithToken from './components/ChangePasswordWithToken'
import Layout from './components/Layout'
import Inicio from './components/Inicio'
import FormularioInspeccion from './components/FormularioInspeccion'
import ReporteCasosMejorado from './components/ReporteCasosMejorado'
import ReporteCasosPersona from './components/ReporteCasosPersona'
import DashboardComplex from './components/DashboardComplex'
import BandejaFacturacion from './components/SubcomponenteCompex/BandejaFacturacion'
import AgregarCasoRiesgo from './components/SubcomponentesRiesgo/AgregarCasoRiesgo'
import Dashboard from './components/SubcomponenteRiesgoDash/Dashboard'
import ReporteRiesgo from './components/SubcompoeneteRiesgoExport/ReporteRiesgo'
import Cuenta from './components/SubcomponenteCuenta/Cuenta'
import MiCuenta from './components/SubcomponenteCuenta/miCuenta'
import InformacionCompleta from './components/SubcomponenteCuenta/InformacionCompleta'
import FormularioMaquinaria from './components/SubcomponenteMaquinaria/FormularioMaquinaria'
import FormularioCasoComplex from './components/SubcomponenteCompex/FormularioCasoComplex'
import { controlHorasTieneDatos } from './components/SubcomponenteCompex/controlHoras/controlHorasUtils'
import SiniestrosList from "./components/SiniestrosList";
import ReportePolPadre from './components/ReportePol/ReportePolPadre';
import AdminUsuarios from './components/AdminUsuarios';
import TestEmail from './components/TestEmail';
import TestEmailComplex from './components/TestEmailComplex';
import TestApiRiesgos from './components/TestApiRiesgos';
import TestFoto from './components/TestFoto';
import EditarPerfilUsuario from './components/EditarPerfilUsuario';
import SessionSettings from './components/SessionSettings';
import HistorialFormularios from './components/HistorialFormularios';
import FormularioAjuste from './components/SubcomponenteFormularioAjuste/FormularioAjuste';
import FormularioCatastrofico from './components/SubcomponenteFormularioCatastrofico/FormularioCatastrofico';
import AlertasComplex from './components/AlertasComplex';
import IndicadoresAlertasComplex from './components/IndicadoresAlertasComplex';
import MisAlertasComplex from './components/MisAlertasComplex';
import HelpCenterPage from './components/HelpCenter/HelpCenterPage';
import MatrizRiesgoAvanzada from './components/MatrizRiesgoAvanzada';
import VistaReporteMatriz from './components/MatrizRiesgoAvanzada/VistaReporteMatriz';
import ListaMatricesRiesgo from './components/ListaMatricesRiesgo';
import GestionClientesFuncionarios from './components/GestionClientesFuncionarios';
import GestionIntermediarios from './components/GestionIntermediarios';
import GestionResponsables from './components/GestionResponsables';
import GestionAjustadoresCatastrofico from './components/GestionAjustadoresCatastrofico';
import GestionInspectoresCatastrofico from './components/GestionInspectoresCatastrofico';
import GestionEstadosComplex from './components/SubcomponenteCompex/GestionEstadosComplex';
import ProtocoloTiemposComplex from './components/SubcomponenteCompex/ProtocoloTiemposComplex';
import PortalSubtareaExterna from './components/SubcomponenteCompex/PortalSubtareaExterna';
import PortalAjusteExternoBridge from './components/SubcomponenteCompex/PortalAjusteExternoBridge';
import MisSubtareasComplex from './components/SubcomponenteCompex/MisSubtareasComplex';
import SubcomponenteExpress from './components/SubcomponenteExpress/SubcomponenteExpress';
import ReporteExpress from './components/SubcomponenteExpress/ReporteExpress';
import ProtocoloExpress from './components/SubcomponenteExpress/ProtocoloExpress';
import TableroOperativoExpress from './components/SubcomponenteExpress/TableroOperativoExpress';
import CatalogosExpress from './components/SubcomponenteExpress/CatalogosExpress';
import LiquidadorExpressPage from './components/SubcomponenteExpress/LiquidadorExpressPage';
import AlertasExpress from './components/SubcomponenteExpress/AlertasExpress';
import FormularioEquidadFdm from './components/SubcomponenteEquidadFdm/FormularioEquidadFdm';
import ReporteEquidadFdm from './components/SubcomponenteEquidadFdm/ReporteEquidadFdm';
import DashboardEquidadFdm from './components/SubcomponenteEquidadFdm/DashboardEquidadFdm';
import LiquidadorEquidadFdmPage from './components/SubcomponenteEquidadFdm/LiquidadorEquidadFdmPage';
import FormularioSegurosAlfa from './components/SubcomponenteSegurosAlfa/FormularioSegurosAlfa';
import ReporteSegurosAlfa from './components/SubcomponenteSegurosAlfa/ReporteSegurosAlfa';
import BoletinSemanalSegurosAlfa from './components/SubcomponenteSegurosAlfa/BoletinSemanalSegurosAlfa';
import DashboardSegurosAlfa from './components/SubcomponenteSegurosAlfa/DashboardSegurosAlfa';
import BloquesCercaniaSegurosAlfa from './components/SubcomponenteSegurosAlfa/BloquesCercaniaSegurosAlfa';
import CasoSegurosAlfaWorkspace, {
  RedirectAlfaInforme,
  RedirectAlfaLiquidador,
} from './components/SubcomponenteSegurosAlfa/CasoSegurosAlfaWorkspace';
import FormularioZurich from './components/SubcomponenteZurich/FormularioZurich';
import ReporteZurich from './components/SubcomponenteZurich/ReporteZurich';
import DashboardZurich from './components/SubcomponenteZurich/DashboardZurich';
import ReporteZurichListado from './components/SubcomponenteZurich/ReporteZurichListado';
import DashboardZurichListado from './components/SubcomponenteZurich/DashboardZurichListado';
import CasoZurichWorkspace, {
  RedirectZurichInforme,
  RedirectZurichLiquidador,
} from './components/SubcomponenteZurich/CasoZurichWorkspace';
import { FormularioCasoSuraPage } from './components/SubcomponenteSura/FormularioCasoSura';
import ReporteSegurosSura from './components/SubcomponenteSura/ReporteSegurosSura';
import BoletinSemanalSegurosSura from './components/SubcomponenteSura/BoletinSemanalSegurosSura';
import DashboardSegurosSura from './components/SubcomponenteSura/DashboardSegurosSura';
import BloquesCercaniaSegurosSura from './components/SubcomponenteSura/BloquesCercaniaSegurosSura';
import CasoSegurosSuraWorkspace, {
  RedirectSuraInforme,
  RedirectSuraLiquidador,
} from './components/SubcomponenteSura/CasoSegurosSuraWorkspace';
import CargaPropiedades from './components/SubcomponentePropiedades/CargaPropiedades';
import DashboardPropiedades from './components/SubcomponentePropiedades/DashboardPropiedades';
import ReportePropiedades from './components/SubcomponentePropiedades/ReportePropiedades';
import InspeccionDesdeCasoPropiedades from './components/SubcomponentePropiedades/InspeccionDesdeCasoPropiedades';
import EstadisticasTiempoUso from './components/EstadisticasTiempoUso';
import PuertosInspeccionMain from './components/FormularioPuertosModular/PuertosInspeccionMain';
import PuertosInspeccionMotorysaMain from './components/FormularioPuertosModular/PuertosInspeccionMotorysaMain';
import PuertosActasMain from './components/PuertosActas/PuertosActasMain';
import PuertosActasListado from './components/PuertosActas/PuertosActasListado';
import PuertosNuevaActa from './components/PuertosActas/PuertosNuevaActa';
import PuertosCatalogos from './components/PuertosActas/PuertosCatalogos';
import PuertosCasoExportacionMain from './components/PuertosActas/PuertosCasoExportacionMain';
import PuertosCasoGranelMain from './components/PuertosActas/PuertosCasoGranelMain';
import ActaInspeccion from './components/ActaInspeccion';
import GestionDocumentos from './components/GestionDocumentos/GestionDocumentos';
import SgSstEvaluacion from './components/SubcomponenteSGSST/SgSstEvaluacion';

import { updateSiniestro } from './services/siniestrosApi';
import { updateCasoComplex } from './services/complexService';

import { CasosRiesgoProvider } from './context/CasosRiesgoContext'
import RequireAuth from './components/RequireAuth'
import RequireRutaPermitida from './components/RequireRutaPermitida'
import { esRolVisualizador, esRolPuertos, esRolContractor, esRolExterno, rutaInicioPorRol } from './config/roles'
import PaginaError from './components/PaginaError'
import DetectorConexion from './components/DetectorConexion'
import OfflineBanner from './components/offline/OfflineBanner.jsx'
import SyncIndicator from './components/offline/SyncIndicator.jsx'
import OfflineBootstrap from './components/offline/OfflineBootstrap.jsx'
import { limpiarSesionLocal } from './utils/limpiarSesionLocal.js'

// Comprueba si tenemos un token en localStorage
const isAuthenticated = () => !!localStorage.getItem('token')

const esRolVisualizadorLocal = () => esRolVisualizador()
const esRolPuertosLocal = () => esRolPuertos()

/** Raíz: sesión externa no debe reenviar en bucle a la subtarea. */
function RootRedirect() {
  if (esRolExterno()) {
    limpiarSesionLocal();
    return <Navigate to="/login" replace />;
  }
  if (isAuthenticated()) return <Navigate to={rutaInicioPorRol()} replace />;
  return <Navigate to="/login" replace />;
}

// Visualizadores solo usan matrices de riesgo: evitar aterrizar en el panel general
function InicioOrRedirectPorRol() {
  if (esRolVisualizadorLocal()) return <Navigate to="/matrices-riesgo" replace />
  if (esRolPuertosLocal()) return <Navigate to="/puertos/actas" replace />
  if (esRolContractor()) return <Navigate to={rutaInicioPorRol()} replace />
  return <Inicio />
}

function RedirectPropiedadesEdit() {
  // Rutas antiguas del historial: ir al reporte (la inspección se abre desde el caso)
  return <Navigate to="/propiedades/reporte" replace />
}

// Para redirigir al dashboard si ya estás logueado
function LoginRedirect() {
  // Sesión limitada del enlace de subtarea: /login debe liberar el acceso
  // (antes redirigía otra vez a la subtarea y quedabas atrapado).
  if (esRolExterno()) {
    limpiarSesionLocal();
    return <Login />;
  }
  if (!isAuthenticated()) return <Login />
  return <Navigate to={rutaInicioPorRol()} replace />
}

// Función para guardar el caso complex
const guardarCasoComplex = async (formData) => {
  try {
const response = await fetch(`${BASE_URL}/api/complex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      const result = await response.json();
let bloqueCorreo = '';
      const n = result.notificaciones;
      if (n?.asignacion) {
        const a = n.asignacion;
        const dest = Array.isArray(a.destinatarios) && a.destinatarios.length
          ? ` → ${a.destinatarios.join(', ')}`
          : '';
        bloqueCorreo += `\n\n📧 Notificación de asignación: ${a.success ? 'enviada' : 'no enviada'}${dest}`;
        if (!a.success && a.message) bloqueCorreo += `\n   (${a.message})`;
      }
      if (n?.creador?.success) {
        const c = n.creador;
        const dest = Array.isArray(c.destinatarios) && c.destinatarios.length
          ? ` → ${c.destinatarios.join(', ')}`
          : '';
        bloqueCorreo += `\n📧 Copia al creador: enviada${dest}`;
      }
      if (n?.error) {
        bloqueCorreo += `\n\n⚠️ Error al enviar correos: ${n.error}`;
      }
      if (result.alertasComplexAutomaticas?.nota) {
        bloqueCorreo += `\n\nℹ️ Alertas resumen (módulo Alertas): ${result.alertasComplexAutomaticas.nota}`;
      }

      // Mostrar mensaje más elegante
      const mensaje = `
🎉 ¡Caso Complex Creado Exitosamente!

📋 Número de Ajuste: ${result.complex?.numero_ajuste || 'N/A'}
👤 Intermediario: ${result.complex?.intermediario || 'N/A'}
📅 Fecha de Creación: ${new Date(result.complex?.creado_en).toLocaleString()}

✅ El caso ha sido guardado en la base de datos.${bloqueCorreo}
      `;
      
      alert(mensaje);
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error al guardar caso complex:', errorData);
      alert(`❌ Error al guardar: ${errorData.error || 'Error desconocido'}`);
    }
  } catch (error) {
    console.error('❌ Error de red al guardar caso complex:', error);
    alert('❌ Error de conexión. Verifica que el servidor esté funcionando.');
  }
};

const FormularioCasoComplexPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Solo considerar initialData si tiene _id (es edición), de lo contrario es un caso nuevo
  const initialData = (location.state?.initialData && location.state?.initialData._id) 
    ? location.state.initialData 
    : null;
  const returnPath = location.state?.returnPath || '/complex/excel';
  const camposFijos = location.state?.camposFijos || false;
  // Solo pasar filtros si estamos editando (tiene initialData)
  const filtros = initialData && location.state?.filtros ? location.state.filtros : null;
  
  // Limpiar el estado de navegación y localStorage si estamos creando un caso nuevo (no tiene initialData)
  React.useEffect(() => {
    // Si estamos en la ruta de agregar y hay estado residual (initialData sin _id o filtros), limpiarlo
    if (location.pathname === '/complex/agregar') {
      // Limpiar localStorage si tiene nmroAjste (es un caso ya guardado)
      const datosGuardados = localStorage.getItem('formularioComplex');
      if (datosGuardados) {
        try {
          const datosParseados = JSON.parse(datosGuardados);
          if (datosParseados?.nmroAjste) {
localStorage.removeItem('formularioComplex');
          }
        } catch (error) {
          console.error('Error al verificar localStorage:', error);
          localStorage.removeItem('formularioComplex');
        }
      }
      
      // Limpiar estado de navegación si hay datos residuales
      if (location.state) {
        const tieneInitialDataSinId = location.state.initialData && !location.state.initialData._id;
        const tieneFiltrosSolo = location.state.filtros && !location.state.initialData;
        
        if (tieneInitialDataSinId || tieneFiltrosSolo) {
          // Si hay estado residual, limpiarlo para evitar datos residuales
navigate(location.pathname, { replace: true, state: {} });
        }
      }
    }
  }, [location.pathname, location.state, navigate]);

  const prepararPayloadParaComplex = (payload, datosIniciales) => {
    const resultado = { ...payload };
    const tomarPrimeroNoVacio = (...valores) =>
      valores.find((valor) => valor !== undefined && valor !== null && valor !== '');
    
    // IMPORTANTE: Preservar todas las fechas de trazabilidad del payload
    const fechasTrazabilidad = [
      'fchaContIni', 'fchaCoordInspeccion', 'fchaProgInspeccion', 'fchaInspccion', 'fchaSoliDocu', 
      'fchaInfoPrelm', 'fchaInfoFnal', 'fchaRepoActi'
    ];
    
// Asegurar que las fechas se preserven
    fechasTrazabilidad.forEach(campo => {
      if (payload[campo] !== undefined && payload[campo] !== null && payload[campo] !== '') {
        resultado[campo] = payload[campo];
}
    });

    // Reforzar coordinación de inspección para evitar pérdida por variantes de nombre.
    resultado.fchaCoordInspeccion = tomarPrimeroNoVacio(
      payload.fchaCoordInspeccion,
      payload.fcha_coord_inspeccion,
      datosIniciales?.fchaCoordInspeccion,
      datosIniciales?.fcha_coord_inspeccion
    );
    resultado.fchaProgInspeccion = tomarPrimeroNoVacio(
      payload.fchaProgInspeccion,
      payload.fcha_prog_inspeccion,
      datosIniciales?.fchaProgInspeccion,
      datosIniciales?.fcha_prog_inspeccion
    );
    
    // PRESERVAR el responsable - usar el valor del payload si existe y es válido
    // Si no viene en el payload o está vacío, NO incluirlo para preservar el valor existente en BD
    const responsablePayload = resultado.codiRespnsble || resultado.nombreResponsable;
    
    if (responsablePayload && responsablePayload.trim() !== '' && responsablePayload.toLowerCase() !== 'sin asignar') {
      // Si viene un responsable válido en el payload, usarlo
      resultado.codiRespnsble = responsablePayload;
} else if (datosIniciales?.codiRespnsble && datosIniciales.codiRespnsble.trim() !== '' && datosIniciales.codiRespnsble.toLowerCase() !== 'sin asignar') {
      // Si no viene en el payload pero hay uno en datosIniciales, preservarlo
      resultado.codiRespnsble = datosIniciales.codiRespnsble;
} else {
      // Si no hay responsable válido en ningún lado, NO incluirlo en el resultado
      // Esto permite que MongoDB preserve el valor existente
      delete resultado.codiRespnsble;
}

    // PRESERVAR el funcionario - usar el valor del payload si existe, sino el de datosIniciales
    // NO eliminar si tiene un valor válido
    let funcionario = resultado.funcAsgrdra || resultado.funcAsgrdraNombre || resultado.funcionarioAseguradora || '';
    
    // Si el payload no tiene funcionario pero los datos iniciales sí, preservarlo
    if (!funcionario || funcionario === '' || funcionario.toLowerCase() === 'sin asignar') {
      funcionario = datosIniciales?.funcAsgrdra || 
                   datosIniciales?.funcAsgrdraNombre || 
                   datosIniciales?.funcionarioAseguradora || 
                   '';
    }
    
    // Solo establecer como vacío si realmente es "sin asignar"
    if (funcionario && funcionario.toLowerCase() !== 'sin asignar' && funcionario.trim() !== '') {
      resultado.funcAsgrdra = funcionario;
    } else {
      // Si no hay funcionario válido, usar el de datosIniciales si existe
      const funcionarioInicial = datosIniciales?.funcAsgrdra || 
                                datosIniciales?.funcAsgrdraNombre || 
                                datosIniciales?.funcionarioAseguradora || '';
      if (funcionarioInicial && funcionarioInicial.toLowerCase() !== 'sin asignar' && funcionarioInicial.trim() !== '') {
        resultado.funcAsgrdra = funcionarioInicial;
      } else {
        resultado.funcAsgrdra = '';
      }
    }

    // PRESERVAR descripcionEstado y observacionesPendientes
    if (resultado.descripcionEstado === undefined || resultado.descripcionEstado === null) {
      if (datosIniciales?.descripcionEstado !== undefined && datosIniciales?.descripcionEstado !== null) {
      resultado.descripcionEstado = datosIniciales.descripcionEstado;
      }
    }
    
    if (resultado.observacionesPendientes === undefined || resultado.observacionesPendientes === null) {
      if (datosIniciales?.observacionesPendientes !== undefined && datosIniciales?.observacionesPendientes !== null) {
      resultado.observacionesPendientes = datosIniciales.observacionesPendientes;
      }
    }

    // Preservar control de horas si el payload no trae filas válidas pero el caso ya las tenía
    if (!controlHorasTieneDatos(resultado.control_horas) && controlHorasTieneDatos(datosIniciales?.control_horas)) {
      resultado.control_horas = datosIniciales.control_horas;
    } else if (!controlHorasTieneDatos(resultado.control_horas)) {
      delete resultado.control_horas;
    }

    // No enviar historialDocs vacío: evita borrar trazabilidad si el formulario no cargó adjuntos.
    if (Array.isArray(resultado.historialDocs) && resultado.historialDocs.length === 0) {
      delete resultado.historialDocs;
    }

    delete resultado.nombreResponsable;
    delete resultado.funcAsgrdraNombre;
    delete resultado.funcionarioAseguradora;

return resultado;
  };

  const handleAutoSave = async (payload, { silent = false, datosBase = null } = {}) => {
    if (!initialData?._id) return false;
    try {
      const origen = initialData?.origen || 'complex';
      const base = datosBase || initialData;
      if (origen === 'complex') {
        const datosNormalizados = prepararPayloadParaComplex(payload, base);
        const respuesta = await updateCasoComplex(initialData._id, datosNormalizados);
        if (!respuesta || respuesta.error) {
          if (!silent) {
            console.error('❌ Error en autoguardado:', respuesta?.error);
          }
          return false;
        }
        return respuesta;
      } else {
        const respuesta = await updateSiniestro(initialData._id, payload);
        if (!respuesta || respuesta.error) return false;
        return respuesta;
      }
    } catch (error) {
      if (!silent) console.error('❌ Error en autoguardado:', error);
      return false;
    }
  };

  const handleSave = async (payload) => {
    try {
      if (initialData?._id) {
        const origen = initialData?.origen || 'complex';
        let respuesta;
        if (origen === 'complex') {
          const datosNormalizados = prepararPayloadParaComplex(payload, initialData);
          respuesta = await updateCasoComplex(initialData._id, datosNormalizados);
        } else {
          respuesta = await updateSiniestro(initialData._id, payload);
        }
        if (!respuesta || respuesta.error) {
          console.error('❌ Error al actualizar el caso:', respuesta?.error);
          alert('No fue posible editar el caso. Verifica la información e inténtalo nuevamente.');
          return;
        }

        alert('✅ El caso ha sido editado exitosamente.');
        localStorage.removeItem('formularioComplex');
        navigate(returnPath, {
          replace: true,
          state: filtros ? { filtros } : undefined,
        });
      } else {
await guardarCasoComplex(payload);
        // Limpiar localStorage después de guardar exitosamente
        localStorage.removeItem('formularioComplex');
// Cuando es un caso nuevo, navegar sin filtros
        navigate(returnPath, { replace: true });
      }
    } catch (error) {
      console.error('❌ Error al guardar caso complex:', error);
      alert('⚠️ Ocurrió un error al guardar. Revisa la consola para más detalles.');
    }
  };

  const handleCancel = () => {
    // Pasar los filtros de vuelta al reporte solo si estamos editando (tiene initialData)
    if (initialData?._id && filtros) {
      navigate(returnPath, { 
        replace: true,
        state: { filtros }
      });
    } else {
      // Si es un caso nuevo, navegar sin filtros
      navigate(returnPath, { replace: true });
    }
  };

  return (
    <FormularioCasoComplex
      initialData={initialData}
      onSave={handleSave}
      onAutoSave={initialData?._id ? (payload, opts) => handleAutoSave(payload, { silent: true, ...opts }) : undefined}
      onCancel={handleCancel}
      camposFijos={camposFijos}
    />
  );
};

export default function App() {
  return (
    <CasosRiesgoProvider>
      <OfflineBootstrap>
      <DetectorConexion>
      <OfflineBanner />
      <SyncIndicator />
      <Routes>
        {/* Ruta raíz: si estás, vas a /inicio, si no, a /login */}
        <Route path="/" element={<RootRedirect />} />

        {/* Rutas públicas */}
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ChangePasswordWithToken />} />
        <Route path="/error" element={<PaginaError />} />
        <Route path="/sin-conexion" element={<PaginaError tipoForzado="sin-conexion" />} />
        <Route path="/servicio-no-disponible" element={<PaginaError tipoForzado="servicio" />} />
        <Route path="/complex/subtarea/:token" element={<PortalSubtareaExterna />} />
        <Route path="/complex/subtarea/:token/ajuste" element={<PortalAjusteExternoBridge />} />

        {/* Reporte ejecutivo de matriz — pantalla completa sin Layout */}
        <Route
          path="matriz-riesgo-reporte"
          element={
            <RequireAuth>
              <VistaReporteMatriz />
            </RequireAuth>
          }
        />

        {/* Rutas privadas protegidas por RequireAuth */}
        <Route
          element={
            <RequireAuth>
              <RequireRutaPermitida>
                <Layout />
              </RequireRutaPermitida>
            </RequireAuth>
          }
        >
          <Route path="inicio" element={<InicioOrRedirectPorRol />} />
          <Route path="ayuda" element={<HelpCenterPage />} />
          <Route
            path="complex/formulario"
            element={<FormularioCasoComplex onSave={guardarCasoComplex} />}
          />
          <Route path="formularioinspeccion" element={<FormularioInspeccion />} />
          <Route path="formularioinspeccion/editar/:id" element={<FormularioInspeccion />} />
          <Route path="acta-inspeccion" element={<Navigate to="/ajuste" replace />} />
          <Route path="acta-inspeccion/editar/:id" element={<ActaInspeccion />} />
          <Route path="complex/agregar" element={<FormularioCasoComplexPage />} />
          <Route path="complex/editar" element={<FormularioCasoComplexPage />} />
          <Route path="complex/excel" element={<ReporteCasosMejorado />} />
          <Route path="complex/mis-casos" element={<ReporteCasosPersona />} />
          <Route path="complex/bandeja-facturacion" element={<BandejaFacturacion />} />
          <Route path="complex/reporte-mejorado" element={<ReporteCasosMejorado />} />
          <Route path="complex/dashboard" element={<DashboardComplex />} />
          <Route path="complex/gestion-estados" element={<GestionEstadosComplex />} />
          <Route path="editar-caso/:id" element={<FormularioCasoComplex onSave={guardarCasoComplex} modoEdicion={true} />} />
          <Route path="riesgos/agregar" element={<AgregarCasoRiesgo />} />
          <Route path="riesgos/dashboard" element={<Dashboard />} />
          <Route path="riesgos/exportar" element={<ReporteRiesgo />} />
          <Route path="riesgos/editar/:id" element={<AgregarCasoRiesgo />} />
          <Route path="cuenta" element={<Cuenta />} />
          <Route path="micuenta" element={<MiCuenta />} />
          <Route path="informacion-completa" element={<InformacionCompleta />} />
          <Route path="formulario-maquinaria" element={<FormularioMaquinaria />} />
          <Route path="formulario-maquinaria/editar/:id" element={<FormularioMaquinaria />} />
          <Route path="reporte-pol" element={<ReportePolPadre />} />
          <Route path="ajuste" element={<FormularioAjuste />} />
          <Route path="ajuste/editar/:id" element={<FormularioAjuste />} />
          <Route path="catastrofico" element={<FormularioCatastrofico />} />
          <Route path="catastrofico/editar/:id" element={<FormularioCatastrofico />} />
          <Route path="complex/alertas" element={<AlertasComplex />} />
          <Route path="complex/mis-alertas" element={<MisAlertasComplex />} />
          <Route path="complex/indicadores-alertas" element={<IndicadoresAlertasComplex />} />
          <Route path="complex/protocolo-tiempos" element={<ProtocoloTiemposComplex />} />
          <Route path="complex/mis-subtareas" element={<MisSubtareasComplex />} />
          <Route path="matriz-riesgo-avanzada" element={<MatrizRiesgoAvanzada />} />
          <Route path="matriz-riesgo-avanzada/:id" element={<MatrizRiesgoAvanzada />} />
          <Route path="matrices-riesgo" element={<ListaMatricesRiesgo />} />
          <Route path="express/carga" element={<SubcomponenteExpress />} />
          <Route path="express/liquidador" element={<LiquidadorExpressPage />} />
          <Route path="express/reporte" element={<ReporteExpress />} />
          <Route path="express/protocolo" element={<ProtocoloExpress />} />
          <Route path="express/dashboard" element={<Navigate to="/express/protocolo" replace />} />
          <Route path="express/alertas" element={<AlertasExpress />} />
          <Route path="express/tablero" element={<TableroOperativoExpress />} />
          <Route path="express/catalogos" element={<Navigate to="/admin/catalogos-express" replace />} />

          <Route path="equidad-fdm/carga" element={<FormularioEquidadFdm />} />
          <Route path="equidad-fdm/liquidador" element={<LiquidadorEquidadFdmPage />} />
          <Route path="equidad-fdm/reporte" element={<ReporteEquidadFdm />} />
          <Route path="equidad-fdm/dashboard" element={<DashboardEquidadFdm />} />

          <Route path="seguros-alfa/carga" element={<FormularioSegurosAlfa />} />
          <Route path="seguros-alfa/reporte" element={<ReporteSegurosAlfa />} />
          <Route path="seguros-alfa/dashboard" element={<DashboardSegurosAlfa />} />
          <Route path="seguros-alfa/boletin" element={<BoletinSemanalSegurosAlfa />} />
          <Route path="seguros-alfa/bloques" element={<BloquesCercaniaSegurosAlfa />} />
          <Route path="seguros-alfa/caso" element={<CasoSegurosAlfaWorkspace />} />
          <Route path="seguros-alfa/liquidador" element={<RedirectAlfaLiquidador />} />
          <Route path="seguros-alfa/informe-unico" element={<RedirectAlfaInforme />} />

          <Route path="zurich/carga" element={<FormularioZurich origen="listado" />} />
          <Route path="zurich/listado/reporte" element={<ReporteZurichListado />} />
          <Route path="zurich/listado/dashboard" element={<DashboardZurichListado />} />
          <Route path="zurich/reporte" element={<ReporteZurich />} />
          <Route path="zurich/dashboard" element={<DashboardZurich />} />
          <Route path="zurich/boletin" element={<Navigate to="/zurich/dashboard" replace />} />
          <Route path="zurich/caso" element={<CasoZurichWorkspace />} />
          <Route path="zurich/liquidador" element={<RedirectZurichLiquidador />} />
          <Route path="zurich/informe-unico" element={<RedirectZurichInforme />} />

          <Route path="sura/carga" element={<FormularioCasoSuraPage />} />
          <Route path="sura/editar" element={<FormularioCasoSuraPage />} />
          <Route path="sura/reporte" element={<ReporteSegurosSura />} />
          <Route path="sura/dashboard" element={<DashboardSegurosSura />} />
          <Route path="sura/boletin" element={<BoletinSemanalSegurosSura />} />
          <Route path="sura/bloques" element={<BloquesCercaniaSegurosSura />} />
          <Route path="sura/caso" element={<CasoSegurosSuraWorkspace />} />
          <Route path="sura/liquidador" element={<RedirectSuraLiquidador />} />
          <Route path="sura/informe-unico" element={<RedirectSuraInforme />} />
          <Route path="sura" element={<Navigate to="/sura/reporte" replace />} />

          <Route path="formulario-inspeccion-propiedades" element={<Navigate to="/propiedades/carga" replace />} />
          <Route
            path="formulario-inspeccion-propiedades/editar/:id"
            element={<RedirectPropiedadesEdit />}
          />
          <Route path="propiedades/carga" element={<CargaPropiedades />} />
          <Route path="propiedades/dashboard" element={<DashboardPropiedades />} />
          <Route path="propiedades/reporte" element={<ReportePropiedades />} />
          <Route path="propiedades/inspeccion/:casoId" element={<InspeccionDesdeCasoPropiedades />} />

          <Route path="puertos/formulario" element={<PuertosInspeccionMain />} />
          <Route path="puertos/formulario/editar/:id" element={<PuertosInspeccionMain />} />

          <Route path="puertos/actas" element={<PuertosActasMain />}>
            <Route index element={<PuertosActasListado />} />
            <Route path="nueva" element={<PuertosNuevaActa />} />
            <Route path="editar/:id" element={<PuertosNuevaActa />} />
            <Route path="caso/nueva" element={<PuertosCasoExportacionMain />} />
            <Route path="caso/ver/:id" element={<PuertosCasoExportacionMain />} />
            <Route path="caso/editar/:id" element={<PuertosCasoExportacionMain />} />
            <Route path="granel/nueva" element={<PuertosCasoGranelMain />} />
            <Route path="granel/ver/:id" element={<PuertosCasoGranelMain />} />
            <Route path="granel/editar/:id" element={<PuertosCasoGranelMain />} />
            <Route
              path="inspeccion-asegurado/nueva"
              element={<PuertosInspeccionMain tipoInicial="riicp004" modoActas />}
            />
            <Route
              path="inspeccion-asegurado/editar/:id"
              element={<PuertosInspeccionMain tipoInicial="riicp004" modoActas />}
            />
            <Route path="inspeccion-motorysa/nueva" element={<PuertosInspeccionMotorysaMain />} />
            <Route path="inspeccion-motorysa/editar/:id" element={<PuertosInspeccionMotorysaMain />} />
            <Route path="catalogos" element={<PuertosCatalogos />} />
          </Route>

          <Route path="puertos/inspeccion-asegurado" element={<Navigate to="/puertos/actas/inspeccion-asegurado/nueva" replace />} />
          <Route path="puertos/inspeccion-asegurado/editar/:id" element={<Navigate to="/puertos/actas/inspeccion-asegurado/editar/:id" replace />} />
          <Route path="puertos/inspeccion-motorysa" element={<Navigate to="/puertos/actas/inspeccion-motorysa/nueva" replace />} />
          <Route path="puertos/inspeccion-motorysa/editar/:id" element={<Navigate to="/puertos/actas/inspeccion-motorysa/editar/:id" replace />} />

          <Route path="sg-sst" element={<SgSstEvaluacion />} />
          <Route path="historial" element={<HistorialFormularios />} />
          <Route path="siniestros" element={<SiniestrosList />} />
          <Route path="admin/usuarios" element={<AdminUsuarios />} />
          <Route path="admin/estadisticas-tiempo-uso" element={<EstadisticasTiempoUso />} />
          <Route path="admin/session-settings" element={<SessionSettings />} />
          <Route path="admin/clientes-funcionarios" element={<GestionClientesFuncionarios />} />
          <Route path="admin/intermediarios" element={<GestionIntermediarios />} />
          <Route path="admin/responsables" element={<GestionResponsables />} />
          <Route path="admin/ajustadores-catastrofico" element={<GestionAjustadoresCatastrofico />} />
          <Route path="admin/inspectores-catastrofico" element={<GestionInspectoresCatastrofico />} />
          <Route path="admin/catalogos-express" element={<CatalogosExpress />} />
          <Route path="admin/documentos" element={<GestionDocumentos />} />
          <Route path="test-email" element={<TestEmail />} />
          <Route path="test-email-complex" element={<TestEmailComplex />} />
          <Route path="test-api-riesgos" element={<TestApiRiesgos />} />
          <Route path="test-foto" element={<TestFoto />} />
          <Route path="editar-perfil-usuario" element={<EditarPerfilUsuario />} />
        </Route>

        {/* Rutas no encontradas */}
        <Route path="*" element={<PaginaError />} />
      </Routes>
      </DetectorConexion>
      </OfflineBootstrap>
    </CasosRiesgoProvider>
  )
}
