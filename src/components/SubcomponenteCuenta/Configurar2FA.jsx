// src/components/SubcomponenteCuenta/Configurar2FA.jsx
// Activación de la verificación en dos pasos con app de autenticación (TOTP)

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig';

export default function Configurar2FA({ isDark }) {
  const { t } = useTranslation();
  const [cargando, setCargando] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const [cuentaId, setCuentaId] = useState('');
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [disableMode, setDisableMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const cargarQr = async () => {
    const res = await axios.post(`${BASE_URL}/api/secur-auth/2fa/setup`, {}, authHeaders());
    setSetupData({
      qr: res.data.qr,
      secret: res.data.secret,
      label: res.data.label,
      issuer: res.data.issuer || 'ARNALD DATA FLOW',
    });
    setPending(true);
    setCode('');
  };

  useEffect(() => {
    const cargarEstado = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/secur-auth/2fa/status`, authHeaders());
        setEnabled(res.data.enabled);
        setPending(res.data.pending);
        setCuentaId(res.data.accountId || '');

        if (res.data.pending && !res.data.enabled) {
          await cargarQr();
          setMensaje(t('account.ui.cuenta.twoFa.pendingMessage'));
        }
      } catch (err) {
        console.error('Error consultando estado 2FA:', err);
      } finally {
        setCargando(false);
      }
    };
    cargarEstado();
    // La carga inicial debe ejecutarse una vez al montar el componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarActivacion = async () => {
    setBusy(true);
    setError('');
    setMensaje('');
    try {
      await cargarQr();
    } catch (err) {
      setError(err.response?.data?.message || t('account.ui.cuenta.twoFa.qrError'));
    } finally {
      setBusy(false);
    }
  };

  const confirmarActivacion = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(`${BASE_URL}/api/secur-auth/2fa/activate`, { code }, authHeaders());
      setEnabled(true);
      setPending(false);
      setSetupData(null);
      setCode('');
      setMensaje(res.data.message || t('account.ui.cuenta.twoFa.activateSuccess'));
      window.dispatchEvent(new Event('2fa-actualizado'));
    } catch (err) {
      setError(err.response?.data?.message || t('account.ui.cuenta.twoFa.codeError'));
    } finally {
      setBusy(false);
    }
  };

  const desactivar = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(`${BASE_URL}/api/secur-auth/2fa/disable`, { code }, authHeaders());
      setEnabled(false);
      setPending(false);
      setDisableMode(false);
      setCode('');
      setMensaje(res.data.message || t('account.ui.cuenta.twoFa.disableSuccess'));
      window.dispatchEvent(new Event('2fa-actualizado'));
    } catch (err) {
      setError(err.response?.data?.message || t('account.ui.cuenta.twoFa.codeError'));
    } finally {
      setBusy(false);
    }
  };

  const estadoBadge = enabled
    ? t('account.ui.cuenta.twoFa.status.enabled')
    : pending
      ? t('account.ui.cuenta.twoFa.status.pending')
      : t('account.ui.cuenta.twoFa.status.disabled');

  const inputCodigo = (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
      placeholder="• • • • • •"
      className={`w-40 px-3 py-2.5 rounded-lg text-center tracking-[0.35em] font-mono text-lg font-bold border-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
        isDark
          ? 'bg-gray-900 text-gray-100 border-gray-700'
          : 'bg-white text-gray-800 border-gray-300'
      }`}
    />
  );

  return (
    <div className={`${isDark ? 'bg-cyan-900/30 border-cyan-800/50' : 'bg-cyan-50 border-cyan-200'} p-4 sm:p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${isDark ? 'hover:shadow-cyan-900/20' : 'hover:shadow-cyan-200/50'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg ${isDark ? 'bg-cyan-800/50' : 'bg-cyan-100'}`}>
          <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke={isDark ? '#67e8f9' : '#0e7490'} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>{t('account.ui.cuenta.twoFa.title')}</h3>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-cyan-200/70' : 'text-cyan-700/80'}`}>
            {t('account.ui.cuenta.twoFa.subtitle')}
          </p>
        </div>
        {!cargando && (
          <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
            enabled
              ? (isDark ? 'bg-green-800/60 text-green-200 border border-green-700' : 'bg-green-100 text-green-800 border border-green-300')
              : pending
                ? (isDark ? 'bg-yellow-800/60 text-yellow-200 border border-yellow-700' : 'bg-yellow-100 text-yellow-800 border border-yellow-300')
                : (isDark ? 'bg-gray-700 text-gray-300 border border-gray-600' : 'bg-gray-100 text-gray-600 border border-gray-300')
          }`}>
            {estadoBadge}
          </span>
        )}
      </div>

      {cargando ? (
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('account.ui.cuenta.twoFa.loading')}</p>
      ) : (
        <>
          {mensaje && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${isDark ? 'bg-green-900/40 text-green-200 border border-green-800' : 'bg-green-50 text-green-800 border border-green-200'}`}>
              ✅ {mensaje}
            </div>
          )}
          {error && (
            <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${isDark ? 'bg-red-900/40 text-red-200 border border-red-800' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              ⚠️ {error}
            </div>
          )}

          {!enabled && !setupData && (
            <button
              type="button"
              onClick={iniciarActivacion}
              disabled={busy}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                isDark
                  ? 'bg-cyan-700 text-white hover:bg-cyan-600'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700'
              }`}
            >
              {busy ? t('account.ui.cuenta.twoFa.generating') : t('account.ui.cuenta.twoFa.activate')}
            </button>
          )}

          {!enabled && setupData && (
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <div className="flex-shrink-0 p-3 bg-white rounded-xl shadow-md">
                <img src={setupData.qr} alt={t('account.ui.cuenta.twoFa.qrAlt')} className="w-52 h-52" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-cyan-200' : 'text-cyan-800'}`}>
                  {t('account.ui.cuenta.twoFa.seeInApp', { label: setupData.label || cuentaId })}
                </p>
                <ol className={`list-decimal list-inside space-y-2 text-sm mb-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  <li>{t('account.ui.cuenta.twoFa.step1')}</li>
                  <li>{t('account.ui.cuenta.twoFa.step2', { label: setupData.label || cuentaId })}</li>
                  <li>{t('account.ui.cuenta.twoFa.step3')}</li>
                </ol>
                <p className={`text-xs mb-4 break-all ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('account.ui.cuenta.twoFa.manualKey')} <span className="font-mono font-bold">{setupData.secret}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {inputCodigo}
                  <button
                    type="button"
                    onClick={confirmarActivacion}
                    disabled={busy || code.length !== 6}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                      isDark ? 'bg-green-700 text-white hover:bg-green-600' : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {busy ? t('account.ui.cuenta.twoFa.verifying') : t('account.ui.cuenta.twoFa.confirmActivate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSetupData(null); setCode(''); setError(''); setMensaje(''); }}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {t('account.ui.cuenta.twoFa.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {enabled && !disableMode && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className={`flex-1 text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {t('account.ui.cuenta.twoFa.enabledHint')}
              </p>
              <button
                type="button"
                onClick={() => { setDisableMode(true); setCode(''); setError(''); setMensaje(''); }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark ? 'bg-red-900/50 text-red-200 hover:bg-red-900/70 border border-red-800' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                {t('account.ui.cuenta.twoFa.deactivate')}
              </button>
            </div>
          )}

          {enabled && disableMode && (
            <div className="flex flex-wrap items-center gap-3">
              <p className={`w-full text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {t('account.ui.cuenta.twoFa.disableHint')}
              </p>
              {inputCodigo}
              <button
                type="button"
                onClick={desactivar}
                disabled={busy || code.length !== 6}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                  isDark ? 'bg-red-700 text-white hover:bg-red-600' : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {busy ? t('account.ui.cuenta.twoFa.verifying') : t('account.ui.cuenta.twoFa.confirmDeactivate')}
              </button>
              <button
                type="button"
                onClick={() => { setDisableMode(false); setCode(''); setError(''); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {t('account.ui.cuenta.twoFa.cancel')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
