import React from 'react';
import { useTranslation } from 'react-i18next';

export default function PuertosDocumentosAdjuntos({
  tipos = { facturaComercial: false, listaEmpaque: false, docTransporte: false },
  onChangeTipos,
  soloLectura = false,
}) {
  const { t } = useTranslation();

  const toggleTipo = (key) => {
    if (soloLectura) return;
    onChangeTipos?.({ ...tipos, [key]: !tipos[key] });
  };

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <header className="px-5 py-3 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {t('ports.ui.actas.documents.title')}
        </h3>
      </header>

      <div className="p-5">
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={tipos.facturaComercial}
              onChange={() => toggleTipo('facturaComercial')}
              disabled={soloLectura}
              className="rounded border-slate-300"
            />
            {t('ports.ui.actas.documents.facturaComercial')}
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={tipos.listaEmpaque}
              onChange={() => toggleTipo('listaEmpaque')}
              disabled={soloLectura}
              className="rounded border-slate-300"
            />
            {t('ports.ui.actas.documents.listaEmpaque')}
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={tipos.docTransporte}
              onChange={() => toggleTipo('docTransporte')}
              disabled={soloLectura}
              className="rounded border-slate-300"
            />
            {t('ports.ui.actas.documents.docTransporte')}
          </label>
        </div>
      </div>
    </section>
  );
}
