import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ListaPerfilesUsuarios from './ListaPerfilesUsuarios';
import api from '../../services/api';
import { obtenerPerfil } from '../../services/userService';
import { IDENTIFICADORES_GESTION_DOCUMENTOS } from '../../config/gestionDocumentosPermitidos';
import { FaLock, FaExclamationTriangle } from 'react-icons/fa';

const IDENTIFICADORES_PERMITIDOS = IDENTIFICADORES_GESTION_DOCUMENTOS;

export default function GestionDocumentos() {
  const { theme } = useTheme();
  const [tieneAcceso, setTieneAcceso] = useState(null); // null = verificando, true = tiene acceso, false = no tiene acceso
  const [cargando, setCargando] = useState(true);

  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';

  useEffect(() => {
    verificarAcceso();
  }, []);

  const verificarAcceso = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');
      const tipoUsuario = localStorage.getItem('tipoUsuario') || 'normal';
      
      // Obtener perfil del usuario actual
      const { data } = await obtenerPerfil(token, tipoUsuario);
      const cedula = String(data.cedula || '').trim();
      const login = String(data.login || '').trim();
      
      // Permitir acceso por cedula o login autorizado
      const acceso = IDENTIFICADORES_PERMITIDOS.includes(cedula) || IDENTIFICADORES_PERMITIDOS.includes(login);
      setTieneAcceso(acceso);
      
      if (!acceso) {
        console.log(`🚫 Acceso denegado. Cedula: "${cedula}", login: "${login}"`);
      }
    } catch (error) {
      console.error('Error verificando acceso:', error);
      // Si hay error al verificar, intentar verificar con datos del localStorage
      const usuarioData = localStorage.getItem('usuario');
      if (usuarioData) {
        try {
          const usuario = JSON.parse(usuarioData);
          const cedula = String(usuario.cedula || '').trim();
          const login = String(usuario.login || '').trim();
          const acceso = IDENTIFICADORES_PERMITIDOS.includes(cedula) || IDENTIFICADORES_PERMITIDOS.includes(login);
          setTieneAcceso(acceso);
        } catch {
          setTieneAcceso(false);
        }
      } else {
        setTieneAcceso(false);
      }
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <div className="text-center py-8" style={{ color: textSecondary }}>
          Verificando acceso...
        </div>
      </div>
    );
  }

  if (!tieneAcceso) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <div 
          className="rounded-lg shadow-lg p-8 text-center"
          style={{
            backgroundColor: cardBg,
            border: `2px solid ${borderColor}`
          }}
        >
          <div className="mb-4 flex justify-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#FEF2F2'
              }}
            >
              <FaLock 
                className="text-4xl"
                style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
              />
            </div>
          </div>
          <h2 
            className="text-2xl font-bold mb-3"
            style={{ color: textPrimary }}
          >
            Acceso Restringido
          </h2>
          <div 
            className="flex items-center justify-center gap-2 mb-4"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            <FaExclamationTriangle />
            <p className="text-base">
              No tienes permisos para acceder a esta funcionalidad.
            </p>
          </div>
          <p 
            className="text-sm"
            style={{ color: textSecondary }}
          >
            Solo usuarios autorizados pueden gestionar documentos de empleados.
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div 
        className="rounded-lg shadow-sm p-6 mb-6"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h1 
          className="text-2xl sm:text-3xl font-bold mb-2"
          style={{ color: textPrimary }}
        >
          Gestión de Documentos por Empleado
        </h1>
        <p 
          className="text-sm sm:text-base"
          style={{ color: theme === 'dark' ? '#B0B0B0' : '#6B6B6B' }}
        >
          Gestiona los documentos de cada empleado. Edita perfiles, sube documentos y consulta el historial.
        </p>
      </div>

      <ListaPerfilesUsuarios />
    </div>
  );
}

