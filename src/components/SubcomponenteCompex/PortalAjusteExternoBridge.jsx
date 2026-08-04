import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { crearSesionAjusteExterna } from '../../services/complexSubtareasService.js';
import {
  estadoAjusteDesdeEtapaSubtarea,
  navegarAjusteDesdeCasoComplex,
} from '../../utils/navegarAjusteDesdeCasoComplex.js';

/**
 * Puente público: valida el enlace de la subtarea externa, emite una sesión
 * limitada (rol "externo") y abre el formulario de ajuste real de la
 * plataforma, igual que el botón «Ajuste» del reporte Complex.
 */
export default function PortalAjusteExternoBridge() {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await crearSesionAjusteExterna(token);
        if (!activo) return;
        localStorage.setItem('token', res.token);
        localStorage.setItem('rol', 'externo');
        localStorage.setItem('login', `externo:${res.subtarea?.id || ''}`);
        localStorage.setItem('nombre', res.nombre || 'Externo');
        localStorage.setItem('subtareaExternaReturn', `/complex/subtarea/${token}`);
        const estadoQuery = new URLSearchParams(window.location.search).get('estado');
        const etapa = res.subtarea?.etapaTrazabilidad;
        await navegarAjusteDesdeCasoComplex(navigate, res.caso, {
          returnPath: `/complex/subtarea/${token}`,
          origen: 'subtarea-externa',
          estadoInicial:
            estadoQuery ||
            estadoAjusteDesdeEtapaSubtarea(etapa) ||
            (String(etapa || '').trim() === 'coordinacionInspeccion'
              ? 'actaInspeccion'
              : ''),
        });
      } catch (err) {
        if (activo) {
          setError(err.message || t('complex.ui.portal_ajuste_externo_bridge.no_abrir_formulario'));
        }
      }
    })();
    return () => {
      activo = false;
    };
  }, [token, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 font-sans">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("complex.ui.portal_ajuste_externo_bridge.grupo_proser")}</p>
        {error ? (
          <>
            <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
            <button
              type="button"
              className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => navigate(`/complex/subtarea/${token}`)}
            >{t("complex.ui.portal_ajuste_externo_bridge.volver_a_la_tarea")}</button>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{t("complex.ui.portal_ajuste_externo_bridge.abriendo_el_formulario_de_ajuste")}</p>
        )}
      </div>
    </div>
  );
}
