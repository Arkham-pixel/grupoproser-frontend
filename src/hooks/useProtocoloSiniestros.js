import { useEffect, useState } from 'react';
import { obtenerProtocoloSiniestros } from '../services/protocoloService.js';
import {
  mapaTiemposLimiteDias,
  obtenerProtocoloPorDefecto,
} from '../config/protocoloSiniestrosDefaults.js';

export function useProtocoloSiniestros() {
  const [protocolo, setProtocolo] = useState(obtenerProtocoloPorDefecto());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    obtenerProtocoloSiniestros()
      .then((data) => {
        if (activo) setProtocolo(data);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const tiemposLimite = mapaTiemposLimiteDias(protocolo);

  return { protocolo, tiemposLimite, loading };
}
