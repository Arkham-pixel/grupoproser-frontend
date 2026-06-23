import React from 'react';

const toolbarBtn =
  'px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700';

function EditorMock({ titulo, placeholder }) {
  const inputCls =
    'w-full rounded-b-lg border border-slate-300 dark:border-slate-600 border-t-0 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[140px] text-slate-800 dark:text-slate-100';

  return (
    <div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{titulo}</p>
      <div className="rounded-t-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-2 py-1.5 flex flex-wrap gap-1">
        <button type="button" className={toolbarBtn} title="Negrita">
          <strong>B</strong>
        </button>
        <button type="button" className={toolbarBtn} title="Cursiva">
          <em>I</em>
        </button>
        <button type="button" className={toolbarBtn}>
          Lista
        </button>
        <button type="button" className={toolbarBtn}>
          Enlace
        </button>
        <button type="button" className={toolbarBtn}>
          Imagen
        </button>
        <button type="button" className={toolbarBtn}>
          Tabla
        </button>
      </div>
      <textarea className={inputCls} placeholder={placeholder} />
    </div>
  );
}

export default function PuertosObservacionesActa() {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <header className="px-5 py-3 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">Observaciones</h3>
      </header>
      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EditorMock titulo="Observaciones" placeholder="Escriba las observaciones del acta…" />
        <EditorMock titulo="Recomendaciones" placeholder="Escriba las recomendaciones…" />
      </div>
    </section>
  );
}
