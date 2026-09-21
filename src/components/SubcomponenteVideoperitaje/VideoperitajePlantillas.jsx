import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  actualizarPlantillaVideoperitaje,
  archivarPlantillaVideoperitaje,
  crearPlantillaVideoperitaje,
  listarPlantillasVideoperitaje,
} from '../../services/videoperitajeService.js';
import {
  vpBtnGhost,
  vpBtnPrimary,
  vpCard,
  vpInput,
  vpLabel,
  vpPage,
  vpWrap,
} from './videoperitajeUi.js';

function pasoVacio() {
  return {
    id: `p-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    titulo: '',
    instruccion: '',
    minFotos: 1,
    maxFotos: 3,
    obligatorio: true,
  };
}

export default function VideoperitajePlantillas() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);

  const cargar = async () => {
    try {
      const r = await listarPlantillasVideoperitaje();
      setRows(r.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardar = async () => {
    setError('');
    try {
      const payload = {
        titulo: editing.titulo,
        descripcion: editing.descripcion,
        pasos: editing.pasos,
        activa: true,
      };
      if (editing._id) await actualizarPlantillaVideoperitaje(editing._id, payload);
      else await crearPlantillaVideoperitaje(payload);
      setEditing(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={vpPage}>
      <div className={vpWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link to="/videoperitaje" className="text-sm text-fenix-primario">
              ← {t('videoperitaje.title')}
            </Link>
            <h1 className="mt-1 font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('videoperitaje.templates')}
            </h1>
            <p className="text-sm text-gray-500">{t('videoperitaje.templatesHint')}</p>
          </div>
          <button
            type="button"
            className={vpBtnPrimary}
            onClick={() =>
              setEditing({
                titulo: '',
                descripcion: '',
                pasos: [pasoVacio()],
              })
            }
          >
            {t('videoperitaje.newTemplate')}
          </button>
        </div>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {editing && (
          <div className={`${vpCard} mb-6 space-y-3`}>
            <label className="block">
              <span className={vpLabel}>{t('videoperitaje.templateTitle')}</span>
              <input
                className={vpInput}
                value={editing.titulo}
                onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={vpLabel}>{t('videoperitaje.templateDesc')}</span>
              <textarea
                className={vpInput}
                rows={2}
                value={editing.descripcion || ''}
                onChange={(e) => setEditing({ ...editing, descripcion: e.target.value })}
              />
            </label>
            {(editing.pasos || []).map((p, idx) => (
              <div key={p.id || idx} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                  {t('videoperitaje.step')} {idx + 1}
                </p>
                <input
                  className={`${vpInput} mb-2`}
                  placeholder={t('videoperitaje.stepTitle')}
                  value={p.titulo}
                  onChange={(e) => {
                    const pasos = [...editing.pasos];
                    pasos[idx] = { ...p, titulo: e.target.value };
                    setEditing({ ...editing, pasos });
                  }}
                />
                <textarea
                  className={`${vpInput} mb-2`}
                  rows={2}
                  placeholder={t('videoperitaje.stepHint')}
                  value={p.instruccion}
                  onChange={(e) => {
                    const pasos = [...editing.pasos];
                    pasos[idx] = { ...p, instruccion: e.target.value };
                    setEditing({ ...editing, pasos });
                  }}
                />
                <div className="flex flex-wrap gap-3 text-sm">
                  <label>
                    Min
                    <input
                      type="number"
                      className={`${vpInput} ml-2 w-20`}
                      value={p.minFotos}
                      onChange={(e) => {
                        const pasos = [...editing.pasos];
                        pasos[idx] = { ...p, minFotos: Number(e.target.value) };
                        setEditing({ ...editing, pasos });
                      }}
                    />
                  </label>
                  <label>
                    Max
                    <input
                      type="number"
                      className={`${vpInput} ml-2 w-20`}
                      value={p.maxFotos}
                      onChange={(e) => {
                        const pasos = [...editing.pasos];
                        pasos[idx] = { ...p, maxFotos: Number(e.target.value) };
                        setEditing({ ...editing, pasos });
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.obligatorio !== false}
                      onChange={(e) => {
                        const pasos = [...editing.pasos];
                        pasos[idx] = { ...p, obligatorio: e.target.checked };
                        setEditing({ ...editing, pasos });
                      }}
                    />
                    {t('videoperitaje.required')}
                  </label>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={vpBtnGhost}
                onClick={() => setEditing({ ...editing, pasos: [...editing.pasos, pasoVacio()] })}
              >
                {t('videoperitaje.addStep')}
              </button>
              <button type="button" className={vpBtnPrimary} onClick={guardar}>
                {t('common.save')}
              </button>
              <button type="button" className={vpBtnGhost} onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((p) => (
            <article key={p._id} className={vpCard}>
              <h2 className="font-semibold text-gray-900 dark:text-white">{p.titulo}</h2>
              <p className="text-sm text-gray-500">{p.descripcion}</p>
              <p className="mt-2 text-xs text-gray-400">
                {t('videoperitaje.stepsCount', { count: p.pasos?.length || 0 })}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" className={vpBtnGhost} onClick={() => setEditing(p)}>
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  className={vpBtnGhost}
                  onClick={async () => {
                    await archivarPlantillaVideoperitaje(p._id);
                    cargar();
                  }}
                >
                  {t('videoperitaje.archive')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
