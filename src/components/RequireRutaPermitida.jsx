import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { obtenerRolAlmacenado, rutaInicioPorRol, rutaPermitidaParaRol } from '../config/roles';

export default function RequireRutaPermitida({ children }) {
  const location = useLocation();
  const rol = obtenerRolAlmacenado();

  if (!rutaPermitidaParaRol(location.pathname, rol)) {
    return <Navigate to={rutaInicioPorRol(rol)} replace />;
  }

  return children;
}
