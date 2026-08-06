import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Seccion, Campo, inputCls } from './PuertosCasoDatosGenerales';
import PuertosCasoImagenUnica from './PuertosCasoImagenUnica';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';
import {
  calcularTotalMercanciaGranel,
  formatearCantidadEuropea,
  nuevaLineaMercanciaGranel,
} from './puertosCasoGranelState';
import {
  puertosBtnSm,
  puertosCardHeaderAccent,
  puertosSectionTitle,
  puertosTableRowEven,
  puertosTableTd,
  puertosTableTh,
  puertosTableThRow,
  puertosTableWrap,
} from './puertosFenixUi';

export default function PuertosCasoGranelPagina3({
  formData,
  onInformeChange,
  onNestedInformeChange,
  soloLectura = false,
}) {
  const { t } = useTranslation();
  const informe = formData.informeGranel || {};
  const buque = informe.buque || {};
  const lineas = informe.lineasMercancia || [];
  const total = calcularTotalMercanciaGranel(lineas);

  const setBuque = (campo, valor) => {
    onNestedInformeChange('buque', { ...buque, [campo]: valor });
  };

  const setLineas = (nuevasLineas) => {
    onInformeChange('lineasMercancia', nuevasLineas);
  };

  const actualizarLinea = (id, campo, valor) => {
    setLineas(lineas.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  };

  return (
    <div className="space-y-5">
      <Seccion titulo={t('ports.ui.casoExportacion.buque.particularidadesTitle')} cols={1}>
        <PuertosCasoImagenUnica
          titulo={t('ports.ui.casoExportacion.buque.fotoMotonave')}
          descripcion={t('ports.ui.casoExportacion.buque.fotoMotonaveDesc')}
          imagen={buque.imagenBuque || null}
          onChange={(imagen) => setBuque('imagenBuque', imagen)}
          soloLectura={soloLectura}
        />
      </Seccion>

      <Seccion titulo={t('ports.ui.casoExportacion.buque.caracteristicasTitle')}>
        <Campo label={t('ports.ui.casoExportacion.buque.origen')}>
          <input className={inputCls} value={buque.origen || ''} onChange={(e) => setBuque('origen', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.puertoEmbarque')}>
          <input className={inputCls} value={buque.puertoEmbarque || ''} onChange={(e) => setBuque('puertoEmbarque', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.puertoDescargue')}>
          <input className={inputCls} value={buque.puertoDescargue || ''} onChange={(e) => setBuque('puertoDescargue', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.nombreMotonave')}>
          <input className={inputCls} value={buque.nombre || ''} onChange={(e) => setBuque('nombre', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.bandera')}>
          <input className={inputCls} value={buque.bandera || ''} onChange={(e) => setBuque('bandera', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.tipoBuque')}>
          <input className={inputCls} value={buque.tipoBuque || ''} onChange={(e) => setBuque('tipoBuque', e.target.value)} placeholder="GRANELERO" />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.imo')}>
          <input className={inputCls} value={buque.imo || ''} onChange={(e) => setBuque('imo', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.tonelajeBruto')}>
          <input className={inputCls} value={buque.tonelajeBruto || ''} onChange={(e) => setBuque('tonelajeBruto', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.pesoMuerto')}>
          <input className={inputCls} value={buque.pesoMuerto || ''} onChange={(e) => setBuque('pesoMuerto', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.esloraManga')}>
          <input className={inputCls} value={buque.esloraManga || ''} onChange={(e) => setBuque('esloraManga', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.anioConstruccion')}>
          <input className={inputCls} value={buque.anioConstruccion || ''} onChange={(e) => setBuque('anioConstruccion', e.target.value)} />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.buque.fechaArribo')}>
          <input type="date" className={inputCls} value={buque.fechaArribo || ''} onChange={(e) => setBuque('fechaArribo', e.target.value)} />
        </Campo>
      </Seccion>

      <section className={puertosTableWrap}>
        <header className={`${puertosCardHeaderAccent} flex flex-wrap items-center justify-between gap-2`}>
          <h3 className={puertosSectionTitle}>{t('ports.ui.casoGranel.mercancia.sectionTitle')}</h3>
          {!soloLectura && (
            <button
              type="button"
              onClick={() => setLineas([...lineas, nuevaLineaMercanciaGranel()])}
              className={puertosBtnSm}
            >
              <FaPlus /> {t('ports.ui.casoGranel.mercancia.agregarLinea')}
            </button>
          )}
        </header>
        <div className="overflow-x-auto p-3">
          <p className="mb-2 font-body text-xs text-gray-500">{t('ports.ui.casoGranel.mercancia.hint')}</p>
          <table className="min-w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className={puertosTableThRow}>
                <th className={`${puertosTableTh} min-w-[130px] border border-red-700`}>
                  {t('ports.ui.casoGranel.mercancia.colBl')}
                </th>
                <th className={`${puertosTableTh} min-w-[280px] border border-red-700`}>
                  {t('ports.ui.casoGranel.mercancia.colProducto')}
                </th>
                <th className={`${puertosTableTh} min-w-[150px] border border-red-700`}>
                  {t('ports.ui.casoGranel.mercancia.colTipoCarga')}
                </th>
                <th className={`${puertosTableTh} w-28 border border-red-700`}>
                  {t('ports.ui.casoGranel.mercancia.colCantidad')}
                </th>
                <th className={`${puertosTableTh} min-w-[180px] border border-red-700`}>
                  {t('ports.ui.casoGranel.mercancia.colDestino')}
                </th>
                <th className={`${puertosTableTh} w-10 border border-red-700`} />
              </tr>
            </thead>
            <tbody>
              {lineas.length === 0 && (
                <tr>
                  <td colSpan={6} className="border px-3 py-6 text-center font-body text-gray-500">
                    {t('ports.ui.casoGranel.mercancia.sinLineas')}
                  </td>
                </tr>
              )}
              {lineas.map((linea) => (
                <tr key={linea.id} className={puertosTableRowEven}>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs`}
                      value={linea.bl || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'bl', e.target.value)}
                      readOnly={soloLectura}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs w-full`}
                      value={linea.producto || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'producto', e.target.value)}
                      readOnly={soloLectura}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs w-full`}
                      value={linea.tipoCarga || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'tipoCarga', e.target.value)}
                      readOnly={soloLectura}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs`}
                      value={linea.cantidad || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'cantidad', e.target.value)}
                      readOnly={soloLectura}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs w-full`}
                      value={linea.destino || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'destino', e.target.value)}
                      readOnly={soloLectura}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1 text-center`}>
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={() => setLineas(lineas.filter((l) => l.id !== linea.id))}
                        className="p-1 text-fenix-primario"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {lineas.length > 0 && (
                <tr className="bg-gray-50 font-semibold dark:bg-gray-900/40">
                  <td colSpan={3} className="border px-2 py-2 text-right font-body">
                    {t('ports.ui.casoGranel.mercancia.total')}
                  </td>
                  <td className="border px-2 py-2 font-body">
                    {total > 0 ? `${formatearCantidadEuropea(total, 2)} ton` : t('ports.ui.common.dash')}
                  </td>
                  <td colSpan={2} className="border" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <PuertosCasoGridFotografico
        titulo={t('ports.ui.casoGranel.mercancia.fotosTitle')}
        subtitulo={t('ports.ui.casoGranel.mercancia.fotosSubtitle')}
        imagenes={informe.imagenesMercancia || []}
        onChange={(updater) => onInformeChange('imagenesMercancia', updater)}
        columnas={3}
        max={9}
        descripcionesSugeridas={[
          'Mercancía a granel',
          'Bodega de carga',
          'Operación de descargue',
        ]}
        datalistId="puertos-granel-fotos-mercancia"
        soloLectura={soloLectura}
      />
    </div>
  );
}
