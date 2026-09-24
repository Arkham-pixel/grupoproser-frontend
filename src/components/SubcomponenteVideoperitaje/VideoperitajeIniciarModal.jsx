import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  crearSesionVideoperitaje,
  listarPlantillasVideoperitaje,
} from '../../services/videoperitajeService.js';
import {
  urlPortalAsegurado,
  urlPortalLocalPrueba,
  vpBtnGhost,
  vpBtnPrimary,
  vpInput,
  vpLabel,
} from './videoperitajeUi.js';

const MODULOS = [
  { id: 'independiente', label: 'Independiente (sin caso)' },
  { id: 'bbva-cat', label: 'BBVA CAT' },
  { id: 'bbva-cat-listado', label: 'BBVA CAT listado' },
  { id: 'seguros-alfa', label: 'Seguros Alfa' },
  { id: 'zurich', label: 'Zurich' },
  { id: 'allianz', label: 'Allianz' },
  { id: 'previsora', label: 'Previsora' },
  { id: 'equidad-cat', label: 'Equidad CAT' },
];

export default function VideoperitajeIniciarModal({
  open,
  onClose,
  onCreated,
  casoId = '',
  modulo = 'independiente',
  defaults = {},
}) {
  const { t } = useTranslation();
  const [tipo, setTipo] = useState('live');
  const [form, setForm] = useState({
    expediente: defaults.expediente || '',
    celular: defaults.celular || '',
    email: defaults.email || '',
    aseguradoNombre: defaults.aseguradoNombre || '',
    modulo: modulo || 'independiente',
    plantillaId: '',
    programadaAt: defaults.programadaAt || '',
  });
  const [plantillas, setPlantillas] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!open) return;
    setTipo('live');
    setError('');
    setResultado(null);
    setForm({
      expediente: defaults.expediente || '',
      celular: defaults.celular || '',
      email: defaults.email || '',
      aseguradoNombre: defaults.aseguradoNombre || '',
      modulo: modulo || 'independiente',
      plantillaId: '',
      programadaAt: defaults.programadaAt || '',
    });
    listarPlantillasVideoperitaje()
      .then((r) => setPlantillas((r.data || []).filter((p) => p.activa !== false)))
      .catch(() => setPlantillas([]));
  }, [
    open,
    defaults.expediente,
    defaults.celular,
    defaults.email,
    defaults.aseguradoNombre,
    defaults.programadaAt,
    modulo,
  ]);

  const puedeCrear = useMemo(
    () => Boolean(form.celular || form.email),
    [form.celular, form.email]
  );

  if (!open) return null;

  const handleCrear = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await crearSesionVideoperitaje({
        tipo,
        modulo: form.modulo,
        casoId: casoId || undefined,
        expediente: form.expediente,
        celular: form.celular,
        email: form.email,
        aseguradoNombre: form.aseguradoNombre,
        plantillaId: tipo === 'guided' ? form.plantillaId : undefined,
        programadaAt: form.programadaAt ? new Date(form.programadaAt).toISOString() : null,
      });
      setResultado(r);
      onCreated?.(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-950">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
          {t('videoperitaje.startTitle')}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{t('videoperitaje.startHint')}</p>

        {!resultado ? (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                className={tipo === 'live' ? vpBtnPrimary : vpBtnGhost}
                onClick={() => setTipo('live')}
              >
                {t('videoperitaje.typeLive')}
              </button>
              <button
                type="button"
                className={tipo === 'guided' ? vpBtnPrimary : vpBtnGhost}
                onClick={() => setTipo('guided')}
              >
                {t('videoperitaje.typeGuided')}
              </button>
            </div>
            {Boolean(casoId) && (
              <label className="block">
                <span className={vpLabel}>{t('videoperitaje.module')}</span>
                <select
                  className={vpInput}
                  value={form.modulo}
                  onChange={(e) => setForm((f) => ({ ...f, modulo: e.target.value }))}
                >
                  {MODULOS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className={vpLabel}>{t('videoperitaje.file')}</span>
              <input
                className={vpInput}
                value={form.expediente}
                onChange={(e) => setForm((f) => ({ ...f, expediente: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className={vpLabel}>{t('videoperitaje.insured')}</span>
              <input
                className={vpInput}
                value={form.aseguradoNombre}
                onChange={(e) => setForm((f) => ({ ...f, aseguradoNombre: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className={vpLabel}>{t('videoperitaje.mobile')}</span>
              <input
                className={vpInput}
                value={form.celular}
                onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className={vpLabel}>{t('videoperitaje.email')}</span>
              <input
                className={vpInput}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className={vpLabel}>Fecha y hora de la videollamada</span>
              <input
                className={vpInput}
                type="datetime-local"
                value={form.programadaAt}
                onChange={(e) => setForm((f) => ({ ...f, programadaAt: e.target.value }))}
              />
              <span className="mt-1 block text-xs text-gray-500">
                Ventana: 15 min antes y 60 min después. Vacío = se puede iniciar de inmediato.
              </span>
            </label>
            {tipo === 'guided' && (
              <label className="block">
                <span className={vpLabel}>{t('videoperitaje.template')}</span>
                <select
                  className={vpInput}
                  value={form.plantillaId}
                  onChange={(e) => setForm((f) => ({ ...f, plantillaId: e.target.value }))}
                >
                  <option value="">{t('videoperitaje.pickTemplate')}</option>
                  {plantillas.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.titulo}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={vpBtnGhost} onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className={vpBtnPrimary}
                disabled={busy || !puedeCrear || (tipo === 'guided' && !form.plantillaId)}
                onClick={handleCrear}
              >
                {busy ? t('common.loading') : t('videoperitaje.createAndInvite')}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-green-700 dark:text-green-400">{t('videoperitaje.createdOk')}</p>
            {resultado.urlPublica && (
              <p className="break-all text-gray-600 dark:text-gray-300">
                {urlPortalAsegurado(resultado.urlPublica, resultado.tokenAsegurado)}
              </p>
            )}
            {resultado.emailEnviado && <p>{t('videoperitaje.emailSent')}</p>}
            {resultado.emailError && (
              <p className="text-amber-700">{t('videoperitaje.emailFail', { error: resultado.emailError })}</p>
            )}
            {resultado.whatsappEnviado && <p>{t('videoperitaje.whatsappSent')}</p>}
            {resultado.whatsappError && (
              <p className="text-amber-700">{t('videoperitaje.whatsappFail', { error: resultado.whatsappError })}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {urlPortalLocalPrueba(resultado.urlPublica, resultado.tokenAsegurado) && (
                <a
                  className={vpBtnPrimary}
                  href={urlPortalLocalPrueba(resultado.urlPublica, resultado.tokenAsegurado)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('videoperitaje.testAsInsured')}
                </a>
              )}
              {resultado.urlPublica && (
                <button
                  type="button"
                  className={vpBtnGhost}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        urlPortalAsegurado(resultado.urlPublica, resultado.tokenAsegurado)
                      );
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  {t('videoperitaje.copyLink')}
                </button>
              )}
              {resultado.data?._id && resultado.data?.tipo === 'live' && (
                <a className={vpBtnGhost} href={`/videoperitaje/sala/${resultado.data._id}`}>
                  {t('videoperitaje.enterRoom')}
                </a>
              )}
              <button type="button" className={vpBtnGhost} onClick={onClose}>
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
