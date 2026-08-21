import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaSave } from 'react-icons/fa';
import {
  borrarBorradorLocal,
  listarBorradoresLocales,
} from '../services/arnaldDraftLocalStore.js';
import {
  ARNALD_AUTO_RESTORE_KEY,
  ARNALD_PROMPT_DONE_KEY,
  ARNALD_PROMPT_LATER_KEY,
  clavePromptGeneral,
  describirBorrador,
  esRutaFormularioGeneral,
  rutaDesdeFormKey,
} from '../services/arnaldDraftRoutes.js';
import {
  eliminarBorradorArnald,
  listarMisBorradoresArnald,
} from '../services/arnaldPlataformaService.js';

function fusionarBorradores(locales, remotos) {
  const mapa = new Map();
  [...locales, ...remotos].forEach((item) => {
    if (!item?.formKey) return;
    const prev = mapa.get(item.formKey);
    if (!prev) {
      mapa.set(item.formKey, item);
      return;
    }
    const tPrev = new Date(prev.savedAt || 0).getTime();
    const tNew = new Date(item.savedAt || 0).getTime();
    if (tNew >= tPrev) mapa.set(item.formKey, { ...prev, ...item });
  });
  return [...mapa.values()].sort(
    (a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)
  );
}

export default function ArnaldBorradoresPendientesModal() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const rutaAnteriorRef = useRef(location.pathname);
  const [items, setItems] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [banner, setBanner] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-CO';
  const enFormularioGeneral = esRutaFormularioGeneral(location.pathname);

  const mostrarSegunDecision = (fusion) => {
    if (!fusion.length) return;
    setItems(fusion);
    if (sessionStorage.getItem(ARNALD_PROMPT_LATER_KEY) === '1') {
      setBanner(true);
      setAbierto(false);
      return;
    }
    setAbierto(true);
  };

  useEffect(() => {
    const anterior = rutaAnteriorRef.current;
    if (anterior !== location.pathname) {
      sessionStorage.removeItem(clavePromptGeneral(anterior));
      rutaAnteriorRef.current = location.pathname;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!enFormularioGeneral) {
      setAbierto(false);
      return undefined;
    }
    let cancelado = false;
    const cargar = async () => {
      if (!localStorage.getItem('token')) return;
      if (sessionStorage.getItem(ARNALD_AUTO_RESTORE_KEY)) return;
      if (sessionStorage.getItem(ARNALD_PROMPT_LATER_KEY) === '1') {
        const locales = listarBorradoresLocales();
        if (locales.length) {
          setItems(locales);
          setBanner(true);
        }
        return;
      }
      const yaPregunto = sessionStorage.getItem(clavePromptGeneral(location.pathname));
      if (yaPregunto === '1') return;

      const locales = listarBorradoresLocales();
      let remotos = [];
      try {
        remotos = await listarMisBorradoresArnald();
      } catch {
        remotos = [];
      }
      if (cancelado) return;
      const fusion = fusionarBorradores(locales, remotos);
      sessionStorage.setItem(clavePromptGeneral(location.pathname), '1');
      if (!fusion.length) return;
      mostrarSegunDecision(fusion);
    };
    const tmr = setTimeout(cargar, 400);
    return () => {
      cancelado = true;
      clearTimeout(tmr);
    };
  }, [enFormularioGeneral, location.pathname]);

  const masReciente = items[0];
  const listaTexto = useMemo(
    () => items.map((it) => describirBorrador(it.formKey, it.titulo)),
    [items]
  );

  const formatFecha = (valor) => {
    if (!valor) return '';
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(valor));
    } catch {
      return '';
    }
  };

  const continuar = (item = masReciente) => {
    if (!item?.formKey) return;
    sessionStorage.setItem(ARNALD_PROMPT_DONE_KEY, '1');
    sessionStorage.setItem(ARNALD_AUTO_RESTORE_KEY, item.formKey);
    sessionStorage.removeItem(ARNALD_PROMPT_LATER_KEY);
    setAbierto(false);
    setBanner(false);
    navigate(rutaDesdeFormKey(item.formKey));
  };

  const descartarTodos = async () => {
    setTrabajando(true);
    try {
      await Promise.all(
        items.map(async (it) => {
          borrarBorradorLocal(it.formKey);
          try {
            await eliminarBorradorArnald(it.formKey);
          } catch {
            // local ya se limpió
          }
        })
      );
      sessionStorage.setItem(ARNALD_PROMPT_DONE_KEY, '1');
      sessionStorage.removeItem(ARNALD_PROMPT_LATER_KEY);
      setItems([]);
      setAbierto(false);
      setBanner(false);
    } finally {
      setTrabajando(false);
    }
  };

  const masTarde = () => {
    sessionStorage.setItem(ARNALD_PROMPT_LATER_KEY, '1');
    setAbierto(false);
    setBanner(true);
  };

  if (!enFormularioGeneral) return null;
  if (!abierto && !banner) return null;

  return createPortal(
    <>
      {banner && !abierto && (
        <div className="fixed inset-x-0 top-0 z-[10110] flex items-center justify-center gap-3 bg-red-700 px-4 py-3 text-white shadow-lg">
          <FaSave className="shrink-0" />
          <p className="font-body text-sm font-semibold">
            {t('plataforma.draftPrompt.banner')}
          </p>
          <button
            type="button"
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-red-700"
            onClick={() => setAbierto(true)}
          >
            {t('plataforma.draftPrompt.review')}
          </button>
        </div>
      )}
      {abierto && (
        <div className="fixed inset-0 z-[10120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="arnald-draft-prompt-title"
            className="w-full max-w-lg rounded-2xl border border-gray-700 bg-white p-6 shadow-2xl dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl text-white">
                <FaSave />
              </div>
              <div>
                <h2
                  id="arnald-draft-prompt-title"
                  className="font-display text-xl font-bold text-gray-900 dark:text-white"
                >
                  {t('plataforma.draftPrompt.title')}
                </h2>
                <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-300">
                  {t('plataforma.draftPrompt.question')}
                </p>
              </div>
            </div>

            <ul className="mb-5 max-h-40 space-y-2 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              {items.map((it) => (
                <li key={it.formKey} className="text-sm text-gray-800 dark:text-gray-100">
                  <span className="font-semibold">{describirBorrador(it.formKey, it.titulo)}</span>
                  {it.savedAt ? (
                    <span className="ml-2 text-xs text-gray-500">
                      {formatFecha(it.savedAt)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={trabajando || !masReciente}
                onClick={() => continuar(masReciente)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t('plataforma.draftPrompt.yes')}
              </button>
              <button
                type="button"
                disabled={trabajando}
                onClick={descartarTodos}
                className="flex-1 rounded-xl border-2 border-gray-400 px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                {t('plataforma.draftPrompt.no')}
              </button>
            </div>
            <button
              type="button"
              disabled={trabajando}
              onClick={masTarde}
              className="mt-3 w-full py-2 text-sm text-gray-500 hover:underline"
            >
              {t('plataforma.draftPrompt.later')}
            </button>
            {listaTexto.length > 1 ? (
              <p className="mt-2 text-center text-xs text-gray-500">
                {t('plataforma.draftPrompt.yesHint')}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
