import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FormularioInspeccionPropiedades from '../FormularioInspeccionPropiedades.jsx';
import {
  getCasoPropiedadesById,
  mapCasoADatosInspeccion,
} from '../../services/propiedadesService.js';
import { expressPageWrap, expressScope } from '../SubcomponenteExpress/expressFenixUi.js';
import { PropiedadesPageHeader } from './PropiedadesUiBlocks.jsx';
import Loader from '../Loader.jsx';

/**
 * Formulario de inspección alimentado por los datos básicos del caso (desde el reporte).
 * Rutas:
 *  - /propiedades/inspeccion/:casoId  (nueva o continuar)
 *  - /propiedades/inspeccion/:casoId?inspeccionId=xxx (editar historial vinculado)
 */
export default function InspeccionDesdeCasoPropiedades() {
  const { casoId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inspeccionIdParam = searchParams.get('inspeccionId');

  const [caso, setCaso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      if (!casoId) {
        setError('Falta el identificador del caso.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await getCasoPropiedadesById(casoId);
        if (!cancelado) setCaso(data);
      } catch (err) {
        if (!cancelado) {
          setError(err.message || 'No se pudo cargar el caso.');
          setCaso(null);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoId]);

  if (loading) {
    return (
      <div className={`${expressScope} flex min-h-[40vh] items-center justify-center bg-fenix-fondo`}>
        <Loader />
      </div>
    );
  }

  if (error || !caso) {
    return (
      <div className={`${expressScope} min-h-full bg-fenix-fondo p-6`}>
        <div className={`${expressPageWrap} space-y-4`}>
          <PropiedadesPageHeader
            title="Inspección de propiedades"
            subtitle="No se pudo abrir el formulario."
            activePath="/propiedades/reporte"
          />
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error || 'Caso no encontrado'}
          </div>
          <button
            type="button"
            className="rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white"
            onClick={() => navigate('/propiedades/reporte')}
          >
            Volver al reporte
          </button>
        </div>
      </div>
    );
  }

  const prefill = mapCasoADatosInspeccion(caso);
  const inspeccionId = inspeccionIdParam || caso.inspeccionId || null;

  return (
    <div className={`${expressScope} min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F]`}>
      <div className={`${expressPageWrap} space-y-2 pb-2`}>
        <PropiedadesPageHeader
          title="Formulario de inspección"
          subtitle={`Caso ${caso.consecutivo || ''} — ${caso.nombreCliente || ''}. Los datos básicos vienen del caso.`}
          activePath="/propiedades/reporte"
        />
      </div>
      <FormularioInspeccionPropiedades
        casoPropiedadesId={casoId}
        casoPrefill={prefill}
        inspeccionHistorialId={inspeccionId}
      />
    </div>
  );
}
