import { Navigate } from 'react-router-dom';

/** Redirige a Protocolo Express (indicadores ANS). */
export default function AlertasExpress() {
  return <Navigate to="/express/protocolo" replace />;
}
