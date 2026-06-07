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
import FormularioInspeccionPropiedades from './components/FormularioInspeccionPropiedades'
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
import AlertasComplex from './components/AlertasComplex';
import MatrizRiesgoAvanzada from './components/MatrizRiesgoAvanzada';
import ListaMatricesRiesgo from './components/ListaMatricesRiesgo';
import GestionClientesFuncionarios from './components/GestionClientesFuncionarios';
import GestionIntermediarios from './components/GestionIntermediarios';
import GestionResponsables from './components/GestionResponsables';
import GestionEstadosComplex from './components/SubcomponenteCompex/GestionEstadosComplex';
import SubcomponenteExpress from './components/SubcomponenteExpress/SubcomponenteExpress';
import ReporteExpress from './components/SubcomponenteExpress/ReporteExpress';
import DashboardExpress from './components/SubcomponenteExpress/DashboardExpress';
import TableroOperativoExpress from './components/SubcomponenteExpress/TableroOperativoExpress';
import CatalogosExpress from './components/SubcomponenteExpress/CatalogosExpress';
import EstadisticasTiempoUso from './components/EstadisticasTiempoUso';
import PuertosInspeccionMain from './components/FormularioPuertosModular/PuertosInspeccionMain';
import ActaInspeccion from './components/ActaInspeccion';
import GestionDocumentos from './components/GestionDocumentos/GestionDocumentos';

import { updateSiniestro } from './services/siniestrosApi';
import { updateCasoComplex } from './services/complexService';

import { CasosRiesgoProvider } from './context/CasosRiesgoContext'
import RequireAuth from './components/RequireAuth'
import sessionManager from './services/sessionManager'

// Comprueba si tenemos un token en localStorage
const isAuthenticated = () => !!localStorage.getItem('token')

const esRolVisualizador = () =>
  (localStorage.getItem('rol') || '').toLowerCase() === 'visualizador'

// Visualizadores solo usan matrices de riesgo: evitar aterrizar en el panel general
function InicioOrRedirectVisualizador() {
  return esRolVisualizador()
    ? <Navigate to="/matrices-riesgo" replace />
    : <Inicio />
}

// Para redirigir al dashboard si ya estás logueado
function LoginRedirect() {
  if (!isAuthenticated()) return <Login />
  return esRolVisualizador()
    ? <Navigate to="/matrices-riesgo" replace />
    : <Navigate to="/inicio" replace />
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
    if (resultado.descripcionEstado !== undefined && resultado.descripcionEstado !== null) {
      resultado.descripcionEstado = resultado.descripcionEstado;
    } else if (datosIniciales?.descripcionEstado !== undefined && datosIniciales?.descripcionEstado !== null) {
      resultado.descripcionEstado = datosIniciales.descripcionEstado;
    }
    
    if (resultado.observacionesPendientes !== undefined && resultado.observacionesPendientes !== null) {
      resultado.observacionesPendientes = resultado.observacionesPendientes;
    } else if (datosIniciales?.observacionesPendientes !== undefined && datosIniciales?.observacionesPendientes !== null) {
      resultado.observacionesPendientes = datosIniciales.observacionesPendientes;
    }

    delete resultado.nombreResponsable;
    delete resultado.funcAsgrdraNombre;
    delete resultado.funcionarioAseguradora;

return resultado;
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
        // Limpiar localStorage después de guardar exitosamente
        localStorage.removeItem('formularioComplex');
// Pasar los filtros de vuelta al reporte para restaurarlos (solo si estamos editando)
        navigate(returnPath, { 
          replace: true,
          state: filtros ? { filtros } : undefined
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
      onCancel={handleCancel}
      camposFijos={camposFijos}
    />
  );
};

export default function App() {
  return (
    <CasosRiesgoProvider>
      <Routes>
        {/* Ruta raíz: si estás, vas a /inicio, si no, a /login */}
        <Route
          path="/"
          element={
            isAuthenticated()
              ? (
                  esRolVisualizador()
                    ? <Navigate to="/matrices-riesgo" replace />
                    : <Navigate to="/inicio" replace />
                )
              : <Navigate to="/login" replace />
          }
        />

        {/* Rutas públicas */}
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ChangePasswordWithToken />} />

        {/* Rutas privadas protegidas por RequireAuth */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="inicio" element={<InicioOrRedirectVisualizador />} />
          <Route
            path="complex/formulario"
            element={<FormularioCasoComplex onSave={guardarCasoComplex} />}
          />
          <Route path="formularioinspeccion" element={<FormularioInspeccion />} />
          <Route path="formularioinspeccion/editar/:id" element={<FormularioInspeccion />} />
          <Route path="acta-inspeccion" element={<Navigate to="/ajuste" replace />} />
          <Route path="acta-inspeccion/editar/:id" element={<ActaInspeccion />} />
          <Route path="formulario-inspeccion-propiedades" element={<FormularioInspeccionPropiedades />} />
          <Route path="formulario-inspeccion-propiedades/editar/:id" element={<FormularioInspeccionPropiedades />} />
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
          <Route path="complex/alertas" element={<AlertasComplex />} />
          <Route path="matriz-riesgo-avanzada" element={<MatrizRiesgoAvanzada />} />
          <Route path="matriz-riesgo-avanzada/:id" element={<MatrizRiesgoAvanzada />} />
          <Route path="matrices-riesgo" element={<ListaMatricesRiesgo />} />
          <Route path="express/carga" element={<SubcomponenteExpress />} />
          <Route path="express/reporte" element={<ReporteExpress />} />
          <Route path="express/dashboard" element={<DashboardExpress />} />
          <Route path="express/tablero" element={<TableroOperativoExpress />} />
          <Route path="express/catalogos" element={<Navigate to="/admin/catalogos-express" replace />} />

          <Route path="puertos/formulario" element={<PuertosInspeccionMain />} />
          <Route path="puertos/formulario/editar/:id" element={<PuertosInspeccionMain />} />

          <Route path="historial" element={<HistorialFormularios />} />
          <Route path="siniestros" element={<SiniestrosList />} />
          <Route path="admin/usuarios" element={<AdminUsuarios />} />
          <Route path="admin/estadisticas-tiempo-uso" element={<EstadisticasTiempoUso />} />
          <Route path="admin/session-settings" element={<SessionSettings />} />
          <Route path="admin/clientes-funcionarios" element={<GestionClientesFuncionarios />} />
          <Route path="admin/intermediarios" element={<GestionIntermediarios />} />
          <Route path="admin/responsables" element={<GestionResponsables />} />
          <Route path="admin/catalogos-express" element={<CatalogosExpress />} />
          <Route path="admin/documentos" element={<GestionDocumentos />} />
          <Route path="test-email" element={<TestEmail />} />
          <Route path="test-email-complex" element={<TestEmailComplex />} />
          <Route path="test-api-riesgos" element={<TestApiRiesgos />} />
          <Route path="test-foto" element={<TestFoto />} />
          <Route path="editar-perfil-usuario" element={<EditarPerfilUsuario />} />
        </Route>

        {/* Cualquier otra ruta redirige a la raíz */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CasosRiesgoProvider>
  )
}
