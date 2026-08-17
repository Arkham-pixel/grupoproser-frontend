import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Campo,
  expressBtnPrimary,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  CAMPOS_INFORME_AGIL,
  defaultInformeAgilSura,
  fusionarVaciosInformeAgil,
  computarInformeAgilDesdeCaso,
  esOpcionOtros,
} from './informeAgilSuraHelpers.js';

export default function InformeAgilSura({
  casoSura = null,
  liquidador = null,
  totales = null,
  salvamento = null,
  onEstadoChange,
  onGuardarEnCaso,
  guardandoCaso = false,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() =>
    defaultInformeAgilSura({ caso: casoSura, liquidador, totales, salvamento })
  );
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(defaultInformeAgilSura({ caso: casoSura, liquidador, totales, salvamento }));
  }, [casoSura?._id]);

  useEffect(() => {
    const computed = computarInformeAgilDesdeCaso({
      caso: casoSura,
      liquidador,
      totales,
      salvamento,
    });
    setForm((prev) => fusionarVaciosInformeAgil(prev, computed));
  }, [
    totales?.totalIndemnizar,
    totales?.totalDanios,
    salvamento?.aplica,
    salvamento?.descripcion,
    casoSura?.correo,
    casoSura?.celular,
  ]);

  useEffect(() => {
    onEstadoChange?.(form);
  }, [form]);

  const setCampo = (key, valor) => {
    setForm((prev) => ({ ...prev, [key]: valor }));
  };

  const handleGuardar = async () => {
    if (!onGuardarEnCaso) return;
    setError('');
    try {
      await onGuardarEnCaso(form);
    } catch (err) {
      setError(err.message || t('segurosSura.informeAgil.saveError'));
    }
  };

  return (
    <div className="space-y-5">
      {error && <p className={expressAlertError}>{error}</p>}
      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            {t('segurosSura.informeAgil.title')}
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
                : t('segurosSura.informeAgil.save')}
            </button>
          )}
        </div>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.informeAgil.hint')}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CAMPOS_INFORME_AGIL.map((campo) => {
            const span = campo.tipo === 'textarea' ? 'sm:col-span-2' : '';
            const valor = form[campo.key] || '';
            const opciones = campo.opciones || [];
            const mostrarOtros = campo.conOtros && esOpcionOtros(valor);
            const sufijoNit =
              campo.key === 'nitTomador'
                ? ' (tomador)'
                : campo.key === 'nitAsegurado'
                  ? ' (asegurado)'
                  : '';
            return (
              <Campo
                key={campo.key}
                label={`${campo.row - 2}. ${campo.label}${sufijoNit}`}
                className={span}
              >
                {campo.tipo === 'textarea' ? (
                  <textarea
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
                    rows={3}
                    value={valor}
                    onChange={(e) => setCampo(campo.key, e.target.value)}
                  />
                ) : campo.tipo === 'select' ? (
                  <>
                    <SelectFenix
                      value={valor}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (campo.conOtros && !esOpcionOtros(next)) {
                          setForm((prev) => ({
                            ...prev,
                            [campo.key]: next,
                            actividadOtro: '',
                          }));
                          return;
                        }
                        setCampo(campo.key, next);
                      }}
                    >
                      <option value="">{t('common.select')}</option>
                      {opciones.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                      {valor &&
                        !opciones.includes(valor) &&
                        !esOpcionOtros(valor) && (
                          <option value={valor}>{valor}</option>
                        )}
                    </SelectFenix>
                    {mostrarOtros && (
                      <InputFenix
                        className="mt-2"
                        placeholder={t('segurosSura.informeAgil.actividadOtroPlaceholder')}
                        value={form.actividadOtro || ''}
                        onChange={(e) => setCampo('actividadOtro', e.target.value)}
                      />
                    )}
                  </>
                ) : (
                  <InputFenix
                    type={campo.tipo === 'date' ? 'date' : 'text'}
                    value={valor}
                    onChange={(e) => setCampo(campo.key, e.target.value)}
                  />
                )}
              </Campo>
            );
          })}
        </div>
      </section>
    </div>
  );
}
