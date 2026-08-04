// Aviso global: invita a configurar verificación en dos pasos (ARNALD DATA FLOW)
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaShieldAlt, FaTimes, FaMobileAlt } from 'react-icons/fa';
import { BASE_URL } from '../config/apiConfig';

const RUTAS_CONFIGURACION = ['/cuenta', '/micuenta'];

export default function Aviso2FAPrompt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [cargando, setCargando] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [pending, setPending] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  const enPaginaConfiguracion = RUTAS_CONFIGURACION.some((r) => location.pathname.startsWith(r));

  const consultarEstado = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || localStorage.getItem('tipoUsuario') !== 'secur') {
      setCargando(false);
      setEnabled(true);
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/secur-auth/2fa/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activo = Boolean(res.data.enabled);
      const pendiente = Boolean(res.data.pending);
      setEnabled(activo);
      setPending(pendiente);

      if (!activo) {
        setBannerVisible(true);
        const forzarModal = sessionStorage.getItem('aviso2fa_mostrar') === '1';
        const modalCerradoSesion = sessionStorage.getItem('aviso2fa_modal_cerrado') === '1';
        if (forzarModal || !modalCerradoSesion) {
          setModalAbierto(true);
        }
        sessionStorage.removeItem('aviso2fa_mostrar');
      } else {
        setBannerVisible(false);
        setModalAbierto(false);
      }
    } catch {
      setEnabled(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    consultarEstado();
    const onActualizado = () => consultarEstado();
    window.addEventListener('2fa-actualizado', onActualizado);
    return () => window.removeEventListener('2fa-actualizado', onActualizado);
  }, [consultarEstado, location.pathname]);

  useEffect(() => {
    if (enPaginaConfiguracion) {
      setModalAbierto(false);
    }
  }, [enPaginaConfiguracion]);

  if (cargando || enabled) return null;

  const irAConfigurar = () => {
    setModalAbierto(false);
    navigate('/cuenta');
  };

  const cerrarModal = () => {
    sessionStorage.setItem('aviso2fa_modal_cerrado', '1');
    setModalAbierto(false);
  };

  const cerrarBanner = () => {
    setBannerVisible(false);
  };

  const titulo = pending
    ? t('auth.twoFactorPrompt.titlePending')
    : t('auth.twoFactorPrompt.titleEnable');

  const mensaje = pending
    ? t('auth.twoFactorPrompt.messagePending')
    : t('auth.twoFactorPrompt.messageEnable');

  return (
    <>
      {bannerVisible && !enPaginaConfiguracion && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <FaShieldAlt className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">{titulo}</p>
                <p className="text-xs text-amber-800/90 sm:text-sm">
                  {pending
                    ? t('auth.twoFactorPrompt.bannerPending')
                    : t('auth.twoFactorPrompt.bannerEnable')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={irAConfigurar}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 sm:text-sm"
              >
                {t('auth.twoFactorPrompt.configureNow')}
              </button>
              <button
                type="button"
                onClick={cerrarBanner}
                className="rounded-lg p-1.5 text-amber-700 transition hover:bg-amber-100"
                title={t('auth.twoFactorPrompt.hideNotice')}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAbierto && !enPaginaConfiguracion && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aviso-2fa-titulo"
          >
            <button
              type="button"
              onClick={cerrarModal}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label={t('auth.twoFactorPrompt.close')}
            >
              <FaTimes />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <FaShieldAlt className="text-xl text-red-600" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">{t('auth.twoFactorPrompt.securityMessage')}</p>
                <h2 id="aviso-2fa-titulo" className="text-lg font-bold text-gray-900">{titulo}</h2>
              </div>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-gray-600">{mensaje}</p>

            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start gap-3">
                <FaMobileAlt className="mt-0.5 shrink-0 text-red-500" />
                <ol className="list-decimal space-y-1 pl-4 text-sm text-gray-700">
                  <li>{t('auth.twoFactorPrompt.step1')}</li>
                  <li>{t('auth.twoFactorPrompt.step2')}</li>
                  <li>{t('auth.twoFactorPrompt.step3')}</li>
                  <li>{t('auth.twoFactorPrompt.step4')}</li>
                </ol>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={irAConfigurar}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-700"
              >
                {t('auth.twoFactorPrompt.goConfigure')}
              </button>
              <button
                type="button"
                onClick={cerrarModal}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                {t('auth.twoFactorPrompt.later')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
