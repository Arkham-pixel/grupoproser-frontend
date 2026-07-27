import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  esRolExterno,
  obtenerRolAlmacenado,
  rutaInicioPorRol,
  rutaPermitidaParaRol,
} from '../config/roles';
import { limpiarSesionLocal } from '../utils/limpiarSesionLocal.js';

export default function RequireRutaPermitida({ children }) {
  const location = useLocation();
  const rol = obtenerRolAlmacenado();

  if (!rutaPermitidaParaRol(location.pathname, rol)) {
    // Externo intentó ir a inicio u otra ruta de plataforma: liberar sesión
    // en lugar de reenviar en bucle a la subtarea.
    if (esRolExterno(rol)) {
      limpiarSesionLocal();
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={rutaInicioPorRol(rol)} replace />;
  }

  return children;
}
