import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FaBalanceScale,
  FaBolt,
  FaBookOpen,
  FaBriefcase,
  FaBuilding,
  FaChartLine,
  FaChevronDown,
  FaCog,
  FaFileAlt,
  FaHome,
  FaSearch,
  FaShieldAlt,
  FaShip,
} from 'react-icons/fa';
import ManualUtilizacionComplex from '../ManualUtilizacionComplex.jsx';
import { HELP_MANUALS, HELP_MODULES, puedeVerModuloAyuda } from '../../config/helpCenterContent.js';
import { etiquetaRol, obtenerRolAlmacenado } from '../../config/roles.js';

const ICONOS_MODULO = {
  home: FaHome,
  briefcase: FaBriefcase,
  shield: FaShieldAlt,
  chart: FaChartLine,
  bolt: FaBolt,
  balance: FaBalanceScale,
  building: FaBuilding,
  ship: FaShip,
  file: FaFileAlt,
  cog: FaCog,
};

function TextoConNegrilla({ texto }) {
  return String(texto)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((parte, index) =>
      parte.startsWith('**') && parte.endsWith('**') ? (
        <strong key={`${parte}-${index}`}>{parte.slice(2, -2)}</strong>
      ) : (
        parte
      )
    );
}

function ArticuloAyuda({ articulo, onNavigate, t }) {
  return (
    <article className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-bold text-gray-900 dark:text-white">{articulo.titulo}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{articulo.descripcion}</p>
        </div>
        {articulo.ruta && (
          <button
            type="button"
            onClick={() => onNavigate(articulo.ruta)}
            className="shrink-0 rounded-lg border border-fenix-primario/30 px-3 py-1.5 text-xs font-semibold text-fenix-primario transition hover:bg-fenix-primario hover:text-white"
          >
            {t('help.ui.goToModule')}
          </button>
        )}
      </div>
      {articulo.pasos?.length > 0 && (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700 marker:font-semibold marker:text-fenix-primario dark:text-gray-300">
          {articulo.pasos.map((paso) => (
            <li key={paso}>
              <TextoConNegrilla texto={paso} />
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function ManualOperativo({ manual, onNavigate, t }) {
  return (
    <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
      <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{manual.titulo}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
        {t('help.ui.manualFollowOrder')}
      </p>
      <div className="mt-4 space-y-3">
        {manual.secciones.map((seccion) => (
          <details
            key={seccion.titulo}
            open
            className="group overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 marker:content-none dark:bg-gray-900/40 dark:text-white">
              {seccion.titulo}
              <FaChevronDown className="shrink-0 text-gray-400 transition group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
              {seccion.ruta && (
                <button
                  type="button"
                  onClick={() => onNavigate(seccion.ruta)}
                  className="mb-3 rounded-lg border border-fenix-primario/30 px-3 py-1.5 text-xs font-semibold text-fenix-primario transition hover:bg-fenix-primario hover:text-white"
                >
                  {t('help.ui.openSection')}
                </button>
              )}
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700 marker:font-semibold marker:text-fenix-primario dark:text-gray-300">
                {seccion.pasos.map((paso) => (
                  <li key={paso}>
                    <TextoConNegrilla texto={paso} />
                  </li>
                ))}
              </ol>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function traducirModulo(modulo, t) {
  return {
    ...modulo,
    titulo: t(`help.ui.content.modules.${modulo.id}.title`, { defaultValue: modulo.titulo }),
    descripcion: t(`help.ui.content.modules.${modulo.id}.description`, {
      defaultValue: modulo.descripcion,
    }),
    articulos: modulo.articulos.map((articulo, index) => ({
      ...articulo,
      titulo: t(`help.ui.content.modules.${modulo.id}.articles.${index}.title`, {
        defaultValue: articulo.titulo,
      }),
      descripcion: t(`help.ui.content.modules.${modulo.id}.articles.${index}.description`, {
        defaultValue: articulo.descripcion,
      }),
    })),
  };
}

function traducirManual(manualId, manual, t) {
  if (!manual) return null;
  return {
    ...manual,
    titulo: t(`help.ui.content.manuals.${manualId}.title`, { defaultValue: manual.titulo }),
    secciones: manual.secciones.map((seccion, index) => ({
      ...seccion,
      titulo: t(`help.ui.content.manuals.${manualId}.sections.${index}.title`, {
        defaultValue: seccion.titulo,
      }),
    })),
  };
}

export default function HelpCenterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rol = obtenerRolAlmacenado();
  const [consulta, setConsulta] = useState('');
  const [moduloSeleccionado, setModuloSeleccionado] = useState('primeros-pasos');

  const modulosVisibles = useMemo(
    () =>
      HELP_MODULES.filter((modulo) => puedeVerModuloAyuda(modulo, rol)).map((modulo) =>
        traducirModulo(modulo, t)
      ),
    [rol, t]
  );
  const consultaNormalizada = consulta.trim().toLocaleLowerCase();
  const modulosFiltrados = useMemo(() => {
    if (!consultaNormalizada) return modulosVisibles;
    return modulosVisibles.filter((modulo) =>
      [modulo.titulo, modulo.descripcion, ...modulo.palabrasClave, ...modulo.articulos.flatMap((a) => [a.titulo, a.descripcion])]
        .join(' ')
        .toLocaleLowerCase()
        .includes(consultaNormalizada)
    );
  }, [consultaNormalizada, modulosVisibles]);
  const moduloActivo =
    modulosVisibles.find((modulo) => modulo.id === moduloSeleccionado) || modulosVisibles[0];
  const manualActivo = traducirManual(moduloActivo?.id, HELP_MANUALS[moduloActivo?.id], t);

  useEffect(() => {
    if (moduloActivo && moduloActivo.id !== moduloSeleccionado) {
      setModuloSeleccionado(moduloActivo.id);
    }
  }, [moduloActivo, moduloSeleccionado]);

  if (!moduloActivo) return null;

  const IconoActivo = ICONOS_MODULO[moduloActivo.icono] || FaBookOpen;

  return (
    <main className="min-h-full bg-gray-50 px-4 py-6 dark:bg-[#111] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-2xl bg-gradient-to-r from-fenix-primario to-red-700 px-5 py-7 text-white shadow-sm sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <FaBookOpen className="text-2xl" aria-hidden />
                <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t('help.ui.title')}</h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-red-50 sm:text-base">
                {t('help.ui.subtitle')}
              </p>
              <p className="mt-2 text-xs text-red-100">{t('help.ui.currentProfile', { role: etiquetaRol(rol) })}</p>
            </div>
            <label className="relative block w-full max-w-md">
              <span className="sr-only">{t('help.ui.searchLabel')}</span>
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                value={consulta}
                onChange={(event) => setConsulta(event.target.value)}
                placeholder={t('help.ui.searchPlaceholder')}
                className="w-full rounded-xl border-0 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm outline-none ring-2 ring-transparent placeholder:text-gray-400 focus:ring-red-200"
              />
            </label>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
            <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-gray-500">{t('help.ui.modules')}</p>
            <nav className="space-y-1" aria-label={t('help.ui.modulesNav')}>
              {modulosFiltrados.map((modulo) => {
                const Icono = ICONOS_MODULO[modulo.icono] || FaBookOpen;
                const activo = modulo.id === moduloActivo.id;
                return (
                  <button
                    key={modulo.id}
                    type="button"
                    onClick={() => setModuloSeleccionado(modulo.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      activo
                        ? 'bg-fenix-primario text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icono aria-hidden />
                    <span>{modulo.titulo}</span>
                  </button>
                );
              })}
            </nav>
            {modulosFiltrados.length === 0 && (
              <p className="px-3 py-5 text-sm text-gray-500">{t('help.ui.noModulesFound')}</p>
            )}
          </aside>

          <section className="min-w-0">
            <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A] sm:flex-row sm:items-start">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fenix-primario/10 text-fenix-primario">
                  <IconoActivo className="text-xl" aria-hidden />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">{moduloActivo.titulo}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{moduloActivo.descripcion}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(moduloActivo.ruta)}
                className="shrink-0 rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                {t('help.ui.openModule')}
              </button>
            </div>

            {moduloActivo.manualCompleto && (
              <div className="mb-5 rounded-2xl border border-fenix-primario/20 bg-white shadow-sm dark:border-fenix-primario/30 dark:bg-[#1A1A1A]">
                <ManualUtilizacionComplex embedded />
              </div>
            )}

            {manualActivo && <ManualOperativo manual={manualActivo} onNavigate={navigate} t={t} />}

            <div className="space-y-4">
              {moduloActivo.articulos.map((articulo) => (
                <ArticuloAyuda key={articulo.titulo} articulo={articulo} onNavigate={navigate} t={t} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
