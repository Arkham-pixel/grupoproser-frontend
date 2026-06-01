// src/components/SubcomponenteCuenta/InformacionCompleta.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from '../../config/apiConfig';
import { useTheme } from '../../context/ThemeContext';

// Lista de usuarios autorizados para ver información completa
const USUARIOS_AUTORIZADOS = [
  '1065012991', // Usuario principal
  // Agregar aquí los otros 2 usuarios autorizados
  // Ejemplo: '1234567890', '0987654321'
];

// Función para verificar si el usuario actual está autorizado
const esUsuarioAutorizado = () => {
  const login = localStorage.getItem('login');
  const cedula = localStorage.getItem('cedula');
  return (login && USUARIOS_AUTORIZADOS.includes(login)) || 
         (cedula && USUARIOS_AUTORIZADOS.includes(cedula));
};

// Función helper para formatear fechas evitando problemas de zona horaria
const formatearFechaParaMostrar = (fecha) => {
  if (!fecha) return "";
  try {
    if (typeof fecha === 'string') {
      const match = fecha.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const fechaLocal = new Date(year, month - 1, day);
          return fechaLocal.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
    }
    
    if (fecha instanceof Date) {
      const year = fecha.getUTCFullYear();
      const month = fecha.getUTCMonth();
      const day = fecha.getUTCDate();
      const fechaLocal = new Date(year, month, day);
      return fechaLocal.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return "";
    
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    const fechaLocal = new Date(year, month, day);
    
    return fechaLocal.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    console.error('Error formateando fecha:', fecha, e);
    return "";
  }
};

export default function InformacionCompleta() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    // Verificar autorización
    if (!esUsuarioAutorizado()) {
      navigate("/micuenta");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Cargar todos los usuarios
    const tipoUsuario = localStorage.getItem("tipoUsuario") || "normal";
    
    // Función async para cargar usuarios
    const cargarUsuarios = async () => {
      try {
        // Cargar usuarios según el tipo
        let usuariosData = [];
        
        if (tipoUsuario === "secur") {
          // Cargar usuarios secur
          const response = await axios.get(`${BASE_URL}/api/secur-auth/usuarios`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          usuariosData = response.data.usuarios || [];
        } else {
          // Cargar usuarios normales
          const response = await axios.get(`${BASE_URL}/api/auth/usuarios`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          usuariosData = response.data.usuarios || [];
        }
        
        console.log('✅ Usuarios cargados:', usuariosData.length);
        setUsuarios(usuariosData);
        setLoading(false);
      } catch (err) {
        console.error("❌ Error cargando información:", err);
        // Si falla, intentar cargar solo el perfil del usuario actual
        try {
          const { data } = await axios.get(
            `${BASE_URL}${tipoUsuario === "secur" ? "/api/secur-auth/perfil" : "/api/usuarios/perfil"}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUsuarios([data]);
        } catch (err2) {
          console.error("❌ Error cargando perfil:", err2);
        }
        setLoading(false);
      }
    };

    cargarUsuarios();
  }, [navigate]);

  if (loading) {
    return (
      <div className={`text-center mt-16 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        <p>Cargando información completa…</p>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl w-full mx-auto rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 mt-4 sm:mt-6 lg:mt-8 border transition-colors ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="mb-6">
        <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
          📊 Información Completa de Empleados
        </h1>
        <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Vista completa de información laboral, contractual y adicional de todos los empleados
        </p>
      </div>

      <div className="space-y-6">
        {usuarios.map((usuario, index) => (
          <div 
            key={usuario.id || usuario._id || index}
            className={`${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'} p-4 sm:p-5 rounded-xl border-2`}
          >
            {/* Encabezado del usuario */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-gray-300 dark:border-gray-600">
              <div className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                {usuario.name || usuario.nombre || 'Usuario'} {usuario.apellido || ''}
              </div>
              {usuario.sucursal && (
                <div className={`ml-auto px-4 py-2 rounded-lg ${isDark ? 'bg-blue-800/50 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                  <div className="text-xs font-semibold uppercase">Sucursal</div>
                  <div className="text-sm font-bold">{usuario.sucursal}</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información Personal */}
              <div className={`${isDark ? 'bg-blue-900/30 border-blue-800/50' : 'bg-blue-50 border-blue-200'} p-4 rounded-xl border-2`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>📋 Información Personal</h3>
                <div className="space-y-2 text-sm">
                  {usuario.cedula && (
                    <div><span className="font-semibold">Cédula:</span> {usuario.cedula}</div>
                  )}
                  {usuario.fechaNacimiento && (
                    <div><span className="font-semibold">Fecha Nacimiento:</span> {formatearFechaParaMostrar(usuario.fechaNacimiento)}</div>
                  )}
                  {usuario.tipoSangre && (
                    <div><span className="font-semibold">Tipo Sangre:</span> {usuario.tipoSangre}</div>
                  )}
                  {usuario.direccion && (
                    <div><span className="font-semibold">Dirección:</span> {usuario.direccion}</div>
                  )}
                </div>
              </div>

              {/* Información de Contacto */}
              <div className={`${isDark ? 'bg-indigo-900/30 border-indigo-800/50' : 'bg-indigo-50 border-indigo-200'} p-4 rounded-xl border-2`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>📞 Información de Contacto</h3>
                <div className="space-y-2 text-sm">
                  {usuario.telefonoFijo && (
                    <div><span className="font-semibold">Teléfono Fijo:</span> {usuario.telefonoFijo}</div>
                  )}
                  {(usuario.celular || usuario.celulares) && (
                    <div><span className="font-semibold">Celular(es):</span> {usuario.celulares || usuario.celular}</div>
                  )}
                  {(usuario.correo || usuario.email || usuario.correosElectronicos) && (
                    <div><span className="font-semibold">Correo(s):</span> {usuario.correosElectronicos || usuario.correo || usuario.email}</div>
                  )}
                </div>
              </div>

              {/* Información Laboral */}
              <div className={`${isDark ? 'bg-green-900/30 border-green-800/50' : 'bg-green-50 border-green-200'} p-4 rounded-xl border-2`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-green-300' : 'text-green-800'}`}>💼 Información Laboral</h3>
                <div className="space-y-2 text-sm">
                  {usuario.empresa && (
                    <div><span className="font-semibold">Empresa:</span> {usuario.empresa}</div>
                  )}
                  {usuario.fechaIngreso && (
                    <div><span className="font-semibold">Fecha Ingreso:</span> {formatearFechaParaMostrar(usuario.fechaIngreso)}</div>
                  )}
                  {usuario.cargos && (
                    <div><span className="font-semibold">Cargo(s):</span> {usuario.cargos}</div>
                  )}
                  {usuario.salario && (
                    <div><span className="font-semibold">Salario:</span> ${usuario.salario?.toLocaleString('es-CO') || usuario.salario}</div>
                  )}
                  {usuario.fechaModificacionSueldo && (
                    <div><span className="font-semibold">Fecha Mod. Sueldo:</span> {formatearFechaParaMostrar(usuario.fechaModificacionSueldo)}</div>
                  )}
                </div>
              </div>

              {/* Información Contractual */}
              <div className={`${isDark ? 'bg-orange-900/30 border-orange-800/50' : 'bg-orange-50 border-orange-200'} p-4 rounded-xl border-2`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>📄 Información Contractual</h3>
                <div className="space-y-2 text-sm">
                  {usuario.tipoContrato && (
                    <div><span className="font-semibold">Tipo Contrato:</span> {usuario.tipoContrato}</div>
                  )}
                  {usuario.fechaModificacionContrato && (
                    <div><span className="font-semibold">Fecha Mod. Contrato:</span> {formatearFechaParaMostrar(usuario.fechaModificacionContrato)}</div>
                  )}
                  {usuario.vencimiento && (
                    <div><span className="font-semibold">Vencimiento:</span> {formatearFechaParaMostrar(usuario.vencimiento)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Aportes y Evaluación */}
            <div className={`mt-6 ${isDark ? 'bg-purple-900/30 border-purple-800/50' : 'bg-purple-50 border-purple-200'} p-4 rounded-xl border-2`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>📊 Información Adicional</h3>
              
              {(usuario.aportesSalud || usuario.aportesPension || usuario.aportesCesantias || usuario.aportesARL || usuario.aportesCCF) && (
                <div className="mb-4">
                  <h4 className={`text-base font-bold mb-3 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>APORTES</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                    {usuario.aportesSalud && (
                      <div>
                        <div className="font-semibold text-xs uppercase mb-1">SALUD</div>
                        <div>{usuario.aportesSalud}</div>
                      </div>
                    )}
                    {usuario.aportesPension && (
                      <div>
                        <div className="font-semibold text-xs uppercase mb-1">PENSION</div>
                        <div>{usuario.aportesPension}</div>
                      </div>
                    )}
                    {usuario.aportesCesantias && (
                      <div>
                        <div className="font-semibold text-xs uppercase mb-1">CESANTIAS</div>
                        <div>{usuario.aportesCesantias}</div>
                      </div>
                    )}
                    {usuario.aportesARL && (
                      <div>
                        <div className="font-semibold text-xs uppercase mb-1">ARL</div>
                        <div>{usuario.aportesARL}</div>
                      </div>
                    )}
                    {usuario.aportesCCF && (
                      <div>
                        <div className="font-semibold text-xs uppercase mb-1">C.C.F.</div>
                        <div>{usuario.aportesCCF}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {usuario.evaluacionPeriodoPrueba !== undefined && usuario.evaluacionPeriodoPrueba !== null && (
                <div>
                  <div className="font-semibold text-sm mb-1">Evaluación Período de Prueba</div>
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm ${
                    usuario.evaluacionPeriodoPrueba === 'Aprobado' || usuario.evaluacionPeriodoPrueba === true
                      ? (isDark ? 'bg-green-800/50 text-green-200' : 'bg-green-100 text-green-800')
                      : (isDark ? 'bg-yellow-800/50 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                  }`}>
                    {usuario.evaluacionPeriodoPrueba === true ? 'Aprobado' : usuario.evaluacionPeriodoPrueba === false ? 'Pendiente' : usuario.evaluacionPeriodoPrueba}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

