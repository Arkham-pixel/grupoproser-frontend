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
  esAplicaInformeAgil,
  esOpcionOtros,
} from '../SubcomponenteSura/informeAgilSuraHelpers.js';
import {
  CAMPOS_INFORME_AGIL,
  computarInformeAgilDesdeCasoAllianz,
  defaultInformeAgilAllianz,
  fusionarInformeAgilAllianz,
} from './informeAgilAllianzHelpers.js';

export default function InformeAgilAllianz({
  casoAllianz = null,
  liquidador = null,
  totales = null,
  onEstadoChange,
  onGuardarEnCaso,
  guardandoCaso = false,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(() =>
    defaultInformeAgilAllianz({ caso: casoAllianz, liquidador, totales })
  );
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(defaultInformeAgilAllianz({ caso: casoAllianz, liquidador, totales }));
  }, [casoAllianz?._id]);

  useEffect(() => {
    const computed = computarInformeAgilDesdeCasoAllianz({
      caso: casoAllianz,
      liquidador,
      totales,
    });
    setForm((prev) => fusionarInformeAgilAllianz(prev, computed));
  }, [
    totales?.totalIndemnizar,
    totales?.totalDanios,
    totales?.deducibleAplicado,
    totales?.deducibleTexto,
    totales?.diagrama?.sumaDeducibles,
    liquidador?.liquidacionCatastrofico?.hospedajeManual,
    liquidador?.liquidacionCatastrofico?.deducible,
    liquidador?.liquidacionCatastrofico?.deducibleConfigPresupuesto?.texto,
    liquidador?.liquidacionCatastrofico?.deducibleConfigPresupuesto?.modo,
    casoAllianz?.correo,
    casoAllianz?.celular,
    casoAllianz?.identificacion,
    casoAllianz?.tomador,
    casoAllianz?.asegurado,
    casoAllianz?.intermediario,
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
      setError(err.message || t('allianz.informeAgil.saveError'));
    }
  };

  return (
    <div className="space-y-5">
      {error && <p className={expressAlertError}>{error}</p>}
      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>{t('allianz.informeAgil.title')}</h3>
          {onGuardarEnCaso && (
            <button
              type="button"
              className={expressBtnPrimary}
              disabled={guardandoCaso}
              onClick={handleGuardar}
            >
              {guardandoCaso ? t('allianz.workspace.saving') : t('allianz.informeAgil.save')}
            </button>
          )}
        </div>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('allianz.informeAgil.hint')}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CAMPOS_INFORME_AGIL.map((campo) => {
            const span = campo.tipo === 'textarea' || campo.conDetalle ? 'sm:col-span-2' : '';
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
                        if (campo.conDetalle && !esAplicaInformeAgil(next)) {
                          setForm((prev) => ({
                            ...prev,
                            [campo.key]: next,
                            [campo.detalleKey]: '',
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
                      {valor && !opciones.includes(valor) && !esOpcionOtros(valor) && (
                        <option value={valor}>{valor}</option>
                      )}
                    </SelectFenix>
                    {mostrarOtros && (
                      <InputFenix
                        className="mt-2"
                        placeholder={t('allianz.informeAgil.actividadOtroPlaceholder')}
                        value={form.actividadOtro || ''}
                        onChange={(e) => setCampo('actividadOtro', e.target.value)}
                      />
                    )}
                    {campo.conDetalle && esAplicaInformeAgil(valor) && (
                      <textarea
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm dark:border-gray-700 dark:bg-gray-900"
                        rows={3}
                        placeholder={t('allianz.informeAgil.solicitudDocumentosDetallePlaceholder')}
                        value={form[campo.detalleKey] || ''}
                        onChange={(e) => setCampo(campo.detalleKey, e.target.value)}
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
