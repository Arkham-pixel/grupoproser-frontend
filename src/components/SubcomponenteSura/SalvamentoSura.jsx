import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash } from 'react-icons/fa';
import {
  Campo,
  expressBtnPrimary,
  InputFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { getImageUrl, createImageErrorHandler } from '../../utils/imageUtils';
import { subirArchivoSura } from '../../services/segurosSuraService.js';
import { defaultSalvamentoSura } from './informeAgilSuraHelpers.js';
import { ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA, asegurarJpeg, esArchivoImagen } from '../../utils/heicToJpeg.js';

export default function SalvamentoSura({
  casoSura = null,
  onEstadoChange,
  onGuardarEnCaso,
  onCasoChange,
  guardandoCaso = false,
}) {
  const { t } = useTranslation();
  const casoId = casoSura?._id ? String(casoSura._id) : '';
  const [form, setForm] = useState(() => defaultSalvamentoSura(casoSura || {}));
  const [error, setError] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    setForm(defaultSalvamentoSura(casoSura || {}));
  }, [casoSura?._id]);

  useEffect(() => {
    onEstadoChange?.(form);
  }, [form]);

  const setCampo = (key, valor) => {
    setForm((prev) => ({ ...prev, [key]: valor }));
  };

  const handleAplica = (valor) => {
    setForm((prev) => ({
      ...prev,
      aplica: valor,
      ...(valor === 'no_aplica'
        ? {
            descripcion: '',
            cantidad: '',
            pesoAproximado: '',
            ubicacionFisica: '',
            contactoRecoleccion: '',
            aseguradoOferta: '',
            requiereNacionalizacion: '',
            condicionesEspeciales: '',
          }
        : {}),
    }));
  };

  const handleFotos = async (files) => {
    if (!casoId) {
      setError(t('segurosSura.salvamento.savedCaseRequired'));
      return;
    }
    const lista = Array.from(files || []).filter((f) => esArchivoImagen(f));
    if (!lista.length) return;
    setSubiendo(true);
    setError('');
    try {
      const creados = [];
      for (const original of lista) {
        const file = await asegurarJpeg(original);
        const creado = await subirArchivoSura(casoId, file, 'SALVAMENTO');
        if (creado) {
          creados.push({
            _id: creado._id,
            ruta: creado.ruta,
            nombreOriginal: creado.nombreOriginal || file.name,
            preview: URL.createObjectURL(file),
          });
        }
      }
      setForm((prev) => ({ ...prev, fotos: [...(prev.fotos || []), ...creados] }));
      if (creados.length && onCasoChange) {
        onCasoChange((prev) => {
          if (!prev) return prev;
          const list = Array.isArray(prev.archivos) ? prev.archivos : [];
          return { ...prev, archivos: [...list, ...creados] };
        });
      }
    } catch (err) {
      setError(err.message || t('segurosSura.salvamento.uploadError'));
    } finally {
      setSubiendo(false);
    }
  };

  const quitarFoto = (id) => {
    setForm((prev) => ({
      ...prev,
      fotos: (prev.fotos || []).filter((f) => String(f._id || f.ruta) !== String(id)),
    }));
  };

  const handleGuardar = async () => {
    if (!onGuardarEnCaso) return;
    setError('');
    try {
      await onGuardarEnCaso(form);
    } catch (err) {
      setError(err.message || t('segurosSura.salvamento.saveError'));
    }
  };

  const aplica = form.aplica === 'aplica';

  return (
    <div className="space-y-5">
      {error && <p className={expressAlertError}>{error}</p>}
      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            {t('segurosSura.salvamento.title')}
          </h3>
          {onGuardarEnCaso && (
            <button
              type="button"
              className={expressBtnPrimary}
              disabled={guardandoCaso}
              onClick={handleGuardar}
            >
              {guardandoCaso
                ? t('segurosSura.workspace.saving')
                : t('segurosSura.salvamento.save')}
            </button>
          )}
        </div>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.salvamento.hint')}
        </p>

        <div className="mb-4 flex flex-wrap gap-4 font-body text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="suraSalvamentoAplica"
              checked={aplica}
              onChange={() => handleAplica('aplica')}
            />
            {t('segurosSura.salvamento.applies')}
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="suraSalvamentoAplica"
              checked={form.aplica === 'no_aplica'}
              onChange={() => handleAplica('no_aplica')}
            />
            {t('segurosSura.salvamento.notApplies')}
          </label>
        </div>

        {aplica && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label={t('segurosSura.salvamento.description')} className="sm:col-span-2">
              <textarea
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
                rows={3}
                value={form.descripcion || ''}
                onChange={(e) => setCampo('descripcion', e.target.value)}
              />
            </Campo>
            <Campo label={t('segurosSura.salvamento.quantity')}>
              <InputFenix
                value={form.cantidad || ''}
                onChange={(e) => setCampo('cantidad', e.target.value)}
              />
            </Campo>
            <Campo label={t('segurosSura.salvamento.weight')}>
              <InputFenix
                value={form.pesoAproximado || ''}
                onChange={(e) => setCampo('pesoAproximado', e.target.value)}
              />
            </Campo>
            <Campo label={t('segurosSura.salvamento.location')} className="sm:col-span-2">
              <InputFenix
                value={form.ubicacionFisica || ''}
                onChange={(e) => setCampo('ubicacionFisica', e.target.value)}
              />
            </Campo>
            <Campo label={t('segurosSura.salvamento.contact')} className="sm:col-span-2">
              <InputFenix
                value={form.contactoRecoleccion || ''}
                onChange={(e) => setCampo('contactoRecoleccion', e.target.value)}
              />
            </Campo>
            <Campo label={t('segurosSura.salvamento.offer')}>
              <InputFenix
                value={form.aseguradoOferta || ''}
                onChange={(e) => setCampo('aseguradoOferta', e.target.value)}
              />
            </Campo>
            <Campo label={t('segurosSura.salvamento.nationalization')}>
              <InputFenix
                value={form.requiereNacionalizacion || ''}
                onChange={(e) => setCampo('requiereNacionalizacion', e.target.value)}
              />
            </Campo>
            <Campo label={t('segurosSura.salvamento.special')} className="sm:col-span-2">
              <textarea
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
                rows={3}
                value={form.condicionesEspeciales || ''}
                onChange={(e) => setCampo('condicionesEspeciales', e.target.value)}
              />
            </Campo>
            <div className="sm:col-span-2">
              <label className="mb-2 block font-body text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('segurosSura.salvamento.photos')}
              </label>
              <input
                type="file"
                accept={ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA}
                multiple
                disabled={!casoId || subiendo}
                onChange={(e) => {
                  handleFotos(e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(form.fotos || []).map((foto, idx) => {
                  const src = getImageUrl(foto);
                  const id = foto._id || foto.ruta || idx;
                  return (
                    <div key={id} className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <img
                        src={src}
                        alt={foto.nombreOriginal || 'Foto salvamento'}
                        className="h-36 w-full object-cover"
                        onError={createImageErrorHandler(foto)}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600"
                        onClick={() => quitarFoto(id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
