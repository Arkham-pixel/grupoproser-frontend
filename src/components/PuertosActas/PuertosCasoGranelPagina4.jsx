import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Seccion, Campo, inputCls, attrsTextarea } from './PuertosCasoDatosGenerales';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';
import PuertosCasoListaPuntos from './PuertosCasoListaPuntos';
import {
  nuevaFilaSeguimientoGranel,
  nuevaFilaMovimientoMercancia,
  nuevoResumenEmail,
  normalizarFechasInspeccion,
  formatearFechasSeguimientoCorta,
} from './puertosCasoGranelState';
import {
  puertosBtnLink,
  puertosBtnSm,
  puertosCardHeaderAccent,
  puertosSectionTitle,
  puertosTableRowEven,
  puertosTableTd,
  puertosTableTh,
  puertosTableThRow,
  puertosTableWrap,
} from './puertosFenixUi';

function CeldaInput({ value, onChange, type = 'text', soloLectura = false, className = '', placeholder = '' }) {
  return (
    <input
      type={type}
      className={`${inputCls} text-xs py-1 min-w-[72px]${soloLectura ? ' bg-gray-50 cursor-default dark:bg-gray-900/60' : ''} ${className}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      readOnly={soloLectura}
      placeholder={placeholder}
    />
  );
}

const FOTOS_CONDICION = [
  'Plano de estiba de la carga',
  'Trigo en estado inicial – Bodega',
  'Inicio de operaciones de descargue',
  'Carga en buen estado',
];
const FOTOS_NOVEDADES = [
  'Carta de protesta por la sociedad portuaria',
  'Trigo regado del lado de babor',
  'Trigo regado del lado de estribor',
  'Almacenamiento en Bodega 6A SPRB',
];
const FOTOS_EQUIPOS = ['Equipos de operación', 'Grúas / tolvas', 'Personal operativo'];
const FOTOS_METEO = ['Condiciones meteo', 'Cubierta', 'Operación bajo clima'];

export default function PuertosCasoGranelPagina4({ formData, onInformeChange, soloLectura = false }) {
  const { t } = useTranslation();
  const informe = formData.informeGranel || {};
  const seguimiento = informe.seguimientoGranel || [];
  const movimiento = informe.movimientoMercancia || [];
  const emails = informe.resumenEmails || [];
  const fechasInspeccionCaso = normalizarFechasInspeccion(
    formData.fechasInspeccion,
    formData.fchaInspccion
  );
  const textoFechasInspeccion = formatearFechasSeguimientoCorta(fechasInspeccionCaso);

  const setSeguimiento = (filas) => onInformeChange('seguimientoGranel', filas);
  const setMovimiento = (filas) => onInformeChange('movimientoMercancia', filas);
  const setEmails = (filas) => onInformeChange('resumenEmails', filas);

  const actualizarSeguimiento = (id, campo, valor) => {
    setSeguimiento(seguimiento.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  };

  const actualizarMovimiento = (id, campo, valor) => {
    setMovimiento(movimiento.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  };

  const actualizarEmail = (id, campo, valor) => {
    setEmails(emails.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  };

  return (
    <div className="space-y-5">
      <section className={puertosTableWrap}>
        <header className={`${puertosCardHeaderAccent} flex flex-wrap items-center justify-between gap-2`}>
          <h3 className={puertosSectionTitle}>{t('ports.ui.casoGranel.supervision.seguimientoTitle')}</h3>
          {!soloLectura && (
            <button
              type="button"
              onClick={() =>
                setSeguimiento([
                  ...seguimiento,
                  {
                    ...nuevaFilaSeguimientoGranel(),
                    fecha: textoFechasInspeccion || '',
                  },
                ])
              }
              className={puertosBtnSm}
            >
              <FaPlus /> {t('ports.ui.casoGranel.supervision.agregarFila')}
            </button>
          )}
        </header>
        <div className="overflow-x-auto p-3">
          <p className="mb-2 font-body text-xs text-gray-500">
            {t('ports.ui.casoGranel.supervision.seguimientoHint')}
          </p>
          <table className="min-w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className={puertosTableThRow}>
                <th className={`${puertosTableTh} min-w-[200px] border border-red-700`}>
                  {t('ports.ui.casoGranel.supervision.colFecha')}
                </th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colBl')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colProducto')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colAnunciada')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colBuenEstado')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colSobrante')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colFaltante')}</th>
                <th className={`${puertosTableTh} w-10 border border-red-700`} />
              </tr>
            </thead>
            <tbody>
              {seguimiento.length === 0 && (
                <tr>
                  <td colSpan={8} className="border px-3 py-6 text-center font-body text-gray-500">
                    {t('ports.ui.casoGranel.supervision.sinSeguimiento')}
                  </td>
                </tr>
              )}
              {seguimiento.map((fila) => (
                <tr key={fila.id} className={puertosTableRowEven}>
                  <td className={`${puertosTableTd} p-1 align-top`}>
                    <div className="space-y-1">
                      <CeldaInput
                        value={fila.fecha}
                        onChange={(v) => actualizarSeguimiento(fila.id, 'fecha', v)}
                        soloLectura={soloLectura}
                        className="min-w-[180px] w-full"
                        placeholder={t('ports.ui.casoGranel.supervision.fechaPlaceholder')}
                      />
                      {!soloLectura && textoFechasInspeccion ? (
                        <button
                          type="button"
                          onClick={() => actualizarSeguimiento(fila.id, 'fecha', textoFechasInspeccion)}
                          className={`${puertosBtnLink} text-[11px]`}
                        >
                          {t('ports.ui.casoGranel.supervision.usarFechasInspeccion')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.bl} onChange={(v) => actualizarSeguimiento(fila.id, 'bl', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.producto} onChange={(v) => actualizarSeguimiento(fila.id, 'producto', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.anunciada} onChange={(v) => actualizarSeguimiento(fila.id, 'anunciada', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.buenEstado} onChange={(v) => actualizarSeguimiento(fila.id, 'buenEstado', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.sobrante} onChange={(v) => actualizarSeguimiento(fila.id, 'sobrante', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.faltante} onChange={(v) => actualizarSeguimiento(fila.id, 'faltante', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1 text-center`}>
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={() => setSeguimiento(seguimiento.filter((f) => f.id !== fila.id))}
                        className="p-1 text-fenix-primario"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Seccion titulo={t('ports.ui.casoGranel.supervision.comentariosTitle')} cols={1}>
        <Campo label={t('ports.ui.casoGranel.supervision.comentariosLabel')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '80px' },
              value: informe.comentariosSupervision || '',
              onChange: (e) => onInformeChange('comentariosSupervision', e.target.value),
            })}
          />
        </Campo>
      </Seccion>

      <section className={puertosTableWrap}>
        <header className={`${puertosCardHeaderAccent} flex flex-wrap items-center justify-between gap-2`}>
          <h3 className={puertosSectionTitle}>{t('ports.ui.casoGranel.supervision.movimientoTitle')}</h3>
          {!soloLectura && (
            <button
              type="button"
              onClick={() => setMovimiento([...movimiento, nuevaFilaMovimientoMercancia()])}
              className={puertosBtnSm}
            >
              <FaPlus /> {t('ports.ui.casoGranel.supervision.agregarFila')}
            </button>
          )}
        </header>
        <div className="overflow-x-auto p-3">
          <table className="min-w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className={puertosTableThRow}>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colProducto')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colTipoCarga')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colCantidad')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colCantPeso')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colUnidadPeso')}</th>
                <th className={`${puertosTableTh} border border-red-700`}>{t('ports.ui.casoGranel.supervision.colDestino')}</th>
                <th className={`${puertosTableTh} w-10 border border-red-700`} />
              </tr>
            </thead>
            <tbody>
              {movimiento.length === 0 && (
                <tr>
                  <td colSpan={7} className="border px-3 py-6 text-center font-body text-gray-500">
                    {t('ports.ui.casoGranel.supervision.sinMovimiento')}
                  </td>
                </tr>
              )}
              {movimiento.map((fila) => (
                <tr key={fila.id} className={puertosTableRowEven}>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.producto} onChange={(v) => actualizarMovimiento(fila.id, 'producto', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.tipoCarga} onChange={(v) => actualizarMovimiento(fila.id, 'tipoCarga', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.cantidad} onChange={(v) => actualizarMovimiento(fila.id, 'cantidad', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.cantPeso} onChange={(v) => actualizarMovimiento(fila.id, 'cantPeso', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.unidadPeso} onChange={(v) => actualizarMovimiento(fila.id, 'unidadPeso', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <CeldaInput value={fila.destino} onChange={(v) => actualizarMovimiento(fila.id, 'destino', v)} soloLectura={soloLectura} />
                  </td>
                  <td className={`${puertosTableTd} p-1 text-center`}>
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={() => setMovimiento(movimiento.filter((f) => f.id !== fila.id))}
                        className="p-1 text-fenix-primario"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Seccion titulo={t('ports.ui.casoGranel.supervision.comentariosMovimientoTitle')} cols={1}>
        <Campo label={t('ports.ui.casoGranel.supervision.comentariosMovimientoLabel')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '70px' },
              value: informe.comentariosMovimiento || '',
              onChange: (e) => onInformeChange('comentariosMovimiento', e.target.value),
            })}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.casoGranel.supervision.condicionTitle')} cols={1}>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('ports.ui.casoGranel.supervision.condicionHint')}
        </p>
        <Campo label={t('ports.ui.casoGranel.supervision.condicionLabel')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '90px' },
              value: informe.condicionCargaTexto || '',
              onChange: (e) => onInformeChange('condicionCargaTexto', e.target.value),
              placeholder: t('ports.ui.casoGranel.supervision.condicionPlaceholder'),
            })}
          />
        </Campo>
        <PuertosCasoGridFotografico
          titulo={t('ports.ui.casoGranel.supervision.fotosCondicion')}
          subtitulo={t('ports.ui.casoGranel.supervision.fotosCondicionSubtitle')}
          imagenes={informe.imagenesCondicionCarga || []}
          onChange={(updater) => onInformeChange('imagenesCondicionCarga', updater)}
          columnas={2}
          max={8}
          descripcionesSugeridas={FOTOS_CONDICION}
          datalistId="puertos-granel-condicion"
          soloLectura={soloLectura}
        />
      </Seccion>

      <Seccion titulo={t('ports.ui.casoGranel.supervision.novedadesTitle')} cols={1}>
        <p className="mb-2 font-body text-xs text-gray-500">
          {t('ports.ui.casoGranel.supervision.novedadesHint')}
        </p>
        <Campo label={t('ports.ui.casoGranel.supervision.novedadesLabel')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '70px' },
              value: informe.novedadesAveriasTexto || '',
              onChange: (e) => onInformeChange('novedadesAveriasTexto', e.target.value),
              placeholder: t('ports.ui.casoGranel.supervision.novedadesPlaceholder'),
            })}
          />
        </Campo>
        <PuertosCasoListaPuntos
          titulo={t('ports.ui.casoGranel.supervision.novedadesPuntos')}
          puntos={informe.novedadesAveriasPuntos || []}
          onChange={(updater) => onInformeChange('novedadesAveriasPuntos', updater)}
          placeholder={t('ports.ui.casoGranel.supervision.novedadPuntoPlaceholder')}
          soloLectura={soloLectura}
        />
        <PuertosCasoGridFotografico
          titulo={t('ports.ui.casoGranel.supervision.fotosNovedades')}
          subtitulo={t('ports.ui.casoGranel.supervision.fotosNovedadesSubtitle')}
          imagenes={informe.imagenesNovedadesAverias || []}
          onChange={(updater) => onInformeChange('imagenesNovedadesAverias', updater)}
          columnas={2}
          max={8}
          descripcionesSugeridas={FOTOS_NOVEDADES}
          datalistId="puertos-granel-novedades"
          soloLectura={soloLectura}
        />
      </Seccion>

      <Seccion titulo={t('ports.ui.casoGranel.supervision.equiposTitle')} cols={1}>
        <Campo label={t('ports.ui.casoGranel.supervision.equiposIntro')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '60px' },
              value: informe.equiposOperacionIntro || '',
              onChange: (e) => onInformeChange('equiposOperacionIntro', e.target.value),
            })}
          />
        </Campo>
        <PuertosCasoListaPuntos
          titulo={t('ports.ui.casoGranel.supervision.equiposPuntos')}
          puntos={informe.equiposOperacionPuntos || []}
          onChange={(updater) => onInformeChange('equiposOperacionPuntos', updater)}
          placeholder={t('ports.ui.casoGranel.supervision.equipoPlaceholder')}
          soloLectura={soloLectura}
        />
        <PuertosCasoGridFotografico
          titulo={t('ports.ui.casoGranel.supervision.fotosEquipos')}
          imagenes={informe.imagenesEquiposOperacion || []}
          onChange={(updater) => onInformeChange('imagenesEquiposOperacion', updater)}
          columnas={3}
          max={9}
          descripcionesSugeridas={FOTOS_EQUIPOS}
          datalistId="puertos-granel-equipos"
          soloLectura={soloLectura}
        />
      </Seccion>

      <Seccion titulo={t('ports.ui.casoGranel.supervision.meteoTitle')} cols={1}>
        <Campo label={t('ports.ui.casoGranel.supervision.meteoLabel')}>
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '60px' },
              value: informe.condicionesMeteoTexto || '',
              onChange: (e) => onInformeChange('condicionesMeteoTexto', e.target.value),
            })}
          />
        </Campo>
        <PuertosCasoGridFotografico
          titulo={t('ports.ui.casoGranel.supervision.fotosMeteo')}
          imagenes={informe.imagenesCondicionesMeteo || []}
          onChange={(updater) => onInformeChange('imagenesCondicionesMeteo', updater)}
          columnas={3}
          max={6}
          descripcionesSugeridas={FOTOS_METEO}
          datalistId="puertos-granel-meteo"
          soloLectura={soloLectura}
        />
      </Seccion>

      <section className={puertosTableWrap}>
        <header className={`${puertosCardHeaderAccent} flex flex-wrap items-center justify-between gap-2`}>
          <h3 className={puertosSectionTitle}>{t('ports.ui.casoGranel.supervision.emailsTitle')}</h3>
          {!soloLectura && (
            <button
              type="button"
              onClick={() => setEmails([...emails, nuevoResumenEmail()])}
              className={puertosBtnSm}
            >
              <FaPlus /> {t('ports.ui.casoGranel.supervision.agregarEmail')}
            </button>
          )}
        </header>
        <div className="space-y-3 p-3">
          {emails.length === 0 && (
            <p className="py-4 text-center font-body text-sm text-gray-500">
              {t('ports.ui.casoGranel.supervision.sinEmails')}
            </p>
          )}
          {emails.map((fila, idx) => (
            <div
              key={fila.id}
              className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-body text-xs font-semibold text-gray-600">
                  {t('ports.ui.casoGranel.supervision.emailN', { n: idx + 1 })}
                </span>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={() => setEmails(emails.filter((e) => e.id !== fila.id))}
                    className="p-1 text-fenix-primario"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <Campo label={t('ports.ui.casoGranel.supervision.colFecha')}>
                  <input
                    type="date"
                    className={inputCls}
                    value={fila.fecha || ''}
                    onChange={(e) => actualizarEmail(fila.id, 'fecha', e.target.value)}
                    readOnly={soloLectura}
                  />
                </Campo>
                <div className="sm:col-span-3">
                  <Campo label={t('ports.ui.casoGranel.supervision.colEvento')}>
                    <textarea
                      {...attrsTextarea(soloLectura, {
                        className: inputCls,
                        style: { minHeight: '90px' },
                        value: fila.evento || '',
                        onChange: (e) => actualizarEmail(fila.id, 'evento', e.target.value),
                        placeholder: t('ports.ui.casoGranel.supervision.emailEventoPlaceholder'),
                      })}
                    />
                  </Campo>
                </div>
              </div>
              <div className="mt-3">
                <PuertosCasoGridFotografico
                  titulo={t('ports.ui.casoGranel.supervision.fotosEmail')}
                  subtitulo={t('ports.ui.casoGranel.supervision.fotosEmailSubtitle')}
                  imagenes={fila.imagenes || []}
                  onChange={(updater) => {
                    const imgs =
                      typeof updater === 'function' ? updater(fila.imagenes || []) : updater;
                    actualizarEmail(fila.id, 'imagenes', imgs);
                  }}
                  columnas={2}
                  max={6}
                  descripcionesSugeridas={[
                    'Captura de tablas / avance operativo',
                    'Adjunto del correo',
                    'Plano o prorrateo',
                  ]}
                  datalistId={`puertos-granel-email-${fila.id}`}
                  soloLectura={soloLectura}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
