import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Seccion, Campo, inputCls, attrsTextarea, attrsInput } from './PuertosCasoDatosGenerales';
import PuertosCasoListaPuntos from './PuertosCasoListaPuntos';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';
import { nuevoRegistroFotograficoBodega } from './puertosCasoGranelState';
import {
  puertosBlockHeader,
  puertosBtnPrimary,
  puertosBtnSm,
  puertosCard,
  puertosCardBody,
  puertosInnerPanel,
  puertosSectionSubtitle,
} from './puertosFenixUi';

const FOTOS_BODEGA = [
  'Vista general bodega',
  'Carga a granel',
  'Operación de descargue',
  'Condición del producto',
];

export default function PuertosCasoGranelPagina5({ formData, onInformeChange, soloLectura = false }) {
  const { t } = useTranslation();
  const informe = formData.informeGranel || {};
  const registros = informe.registrosFotograficosBodegas || [];

  const setRegistros = (updater) => {
    onInformeChange('registrosFotograficosBodegas', updater);
  };

  const actualizarRegistro = (id, registroActualizado) => {
    setRegistros((prev) => prev.map((r) => (r.id === id ? registroActualizado : r)));
  };

  return (
    <div className="space-y-5">
      <Seccion titulo={t('ports.ui.casoGranel.conclusiones.sectionTitle')} cols={1}>
        <Campo label={t('ports.ui.casoGranel.conclusiones.parrafoPrincipal')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '100px' },
              value: informe.conclusionesTexto || '',
              onChange: (e) => onInformeChange('conclusionesTexto', e.target.value),
              placeholder: t('ports.ui.casoGranel.conclusiones.parrafoPlaceholder'),
            })}
          />
        </Campo>
        <PuertosCasoListaPuntos
          titulo={t('ports.ui.casoGranel.conclusiones.puntosTitulo')}
          puntos={informe.conclusionesPuntos || []}
          onChange={(updater) => onInformeChange('conclusionesPuntos', updater)}
          placeholder={t('ports.ui.casoGranel.conclusiones.puntoPlaceholder')}
          soloLectura={soloLectura}
        />
      </Seccion>

      <section className={puertosCard}>
        <div className={puertosCardBody}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className={puertosBlockHeader}>{t('ports.ui.casoGranel.photos.registroTitle')}</h3>
              <p className={puertosSectionSubtitle}>{t('ports.ui.casoGranel.photos.registroSubtitle')}</p>
            </div>
            {!soloLectura && (
              <button
                type="button"
                onClick={() => setRegistros((prev) => [...(prev || []), nuevoRegistroFotograficoBodega()])}
                className={puertosBtnPrimary}
              >
                <FaPlus /> {t('ports.ui.casoGranel.photos.agregarRegistro')}
              </button>
            )}
          </div>

          {registros.length === 0 && (
            <p className="py-8 text-center font-body text-sm text-gray-500">
              {t('ports.ui.casoGranel.photos.sinRegistros')}
            </p>
          )}

          <div className="space-y-6">
            {registros.map((registro, idx) => (
              <div key={registro.id} className={puertosInnerPanel}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className={puertosBlockHeader}>
                      {registro.titulo || t('ports.ui.casoGranel.photos.bodegaDefault', { n: idx + 1 })}
                    </h4>
                    <p className={puertosSectionSubtitle}>
                      {t('ports.ui.casoGranel.photos.registroN', { n: idx + 1 })}
                    </p>
                  </div>
                  {!soloLectura && (
                    <button
                      type="button"
                      onClick={() => setRegistros((prev) => prev.filter((r) => r.id !== registro.id))}
                      className={puertosBtnSm}
                    >
                      <FaTrash /> {t('ports.ui.casoGranel.photos.removeBlock')}
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <Campo label={t('ports.ui.casoGranel.photos.tituloInforme')}>
                    <input
                      {...attrsInput(soloLectura, {
                        className: inputCls,
                        value: registro.titulo || '',
                        onChange: (e) =>
                          actualizarRegistro(registro.id, { ...registro, titulo: e.target.value }),
                        placeholder: t('ports.ui.casoGranel.photos.tituloPlaceholder'),
                      })}
                    />
                  </Campo>
                </div>

                <PuertosCasoGridFotografico
                  titulo={t('ports.ui.casoGranel.photos.fotosTitle')}
                  imagenes={registro.imagenes || []}
                  onChange={(updater) => {
                    const imgs =
                      typeof updater === 'function' ? updater(registro.imagenes || []) : updater;
                    actualizarRegistro(registro.id, { ...registro, imagenes: imgs });
                  }}
                  columnas={3}
                  max={12}
                  descripcionesSugeridas={FOTOS_BODEGA}
                  datalistId={`puertos-granel-bodega-${registro.id}`}
                  soloLectura={soloLectura}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
