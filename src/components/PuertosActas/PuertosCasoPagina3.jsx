import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Seccion, Campo, inputCls } from './PuertosCasoDatosGenerales';
import PuertosCasoImagenUnica from './PuertosCasoImagenUnica';
import PuertosCasoAreaFotograficaMercancia from './PuertosCasoAreaFotograficaMercancia';
import {
  calcularNumContenedoresMercancia,
  calcularTotalMercancia,
  nuevaLineaMercancia,
} from './puertosCasoExportacionState';
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

export default function PuertosCasoPagina3({ formData, onInformeChange, onNestedInformeChange }) {
  const informe = formData.informeExportacion || {};
  const buque = informe.buque || {};
  const lineas = informe.lineasMercancia || [];
  const total = calcularTotalMercancia(lineas);
  const numContenedores = calcularNumContenedoresMercancia(lineas);

  const setBuque = (campo, valor) => {
    onNestedInformeChange('buque', { ...buque, [campo]: valor });
  };

  const setImagenBuque = (imagen) => {
    setBuque('imagenBuque', imagen);
  };

  const setLineas = (nuevasLineas) => {
    onInformeChange('lineasMercancia', nuevasLineas);
  };

  const actualizarLinea = (id, campo, valor) => {
    setLineas(lineas.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  };

  return (
    <div className="space-y-5">
      <Seccion titulo="2. Particularidades del buque — Características del barco" cols={1}>
        <PuertosCasoImagenUnica
          titulo="Fotografía de la motonave"
          descripcion="Como en el informe Word: imagen del buque sobre la tabla de características"
          imagen={buque.imagenBuque || null}
          onChange={setImagenBuque}
        />
      </Seccion>

      <Seccion titulo="Características del barco">
        <Campo label="Origen">
          <input className={inputCls} value={buque.origen || ''} onChange={(e) => setBuque('origen', e.target.value)} placeholder="BARRANQUILLA/COLOMBIA" />
        </Campo>
        <Campo label="Puerto de embarque">
          <input className={inputCls} value={buque.puertoEmbarque || ''} onChange={(e) => setBuque('puertoEmbarque', e.target.value)} />
        </Campo>
        <Campo label="Puerto de descargue">
          <input className={inputCls} value={buque.puertoDescargue || ''} onChange={(e) => setBuque('puertoDescargue', e.target.value)} />
        </Campo>
        <Campo label="Nombre motonave">
          <input className={inputCls} value={buque.nombre || ''} onChange={(e) => setBuque('nombre', e.target.value)} placeholder="MN ECO TRAMONTANE" />
        </Campo>
        <Campo label="Bandera">
          <input className={inputCls} value={buque.bandera || ''} onChange={(e) => setBuque('bandera', e.target.value)} />
        </Campo>
        <Campo label="Tipo de buque">
          <input className={inputCls} value={buque.tipoBuque || ''} onChange={(e) => setBuque('tipoBuque', e.target.value)} placeholder="PORTACONTENEDORES" />
        </Campo>
        <Campo label="IMO Nro.">
          <input className={inputCls} value={buque.imo || ''} onChange={(e) => setBuque('imo', e.target.value)} />
        </Campo>
        <Campo label="Tonelaje bruto">
          <input className={inputCls} value={buque.tonelajeBruto || ''} onChange={(e) => setBuque('tonelajeBruto', e.target.value)} placeholder="16242 t" />
        </Campo>
        <Campo label="Peso muerto">
          <input className={inputCls} value={buque.pesoMuerto || ''} onChange={(e) => setBuque('pesoMuerto', e.target.value)} placeholder="13629 t" />
        </Campo>
        <Campo label="Eslora x manga">
          <input className={inputCls} value={buque.esloraManga || ''} onChange={(e) => setBuque('esloraManga', e.target.value)} placeholder="148 x 27 m" />
        </Campo>
        <Campo label="Año de construcción">
          <input className={inputCls} value={buque.anioConstruccion || ''} onChange={(e) => setBuque('anioConstruccion', e.target.value)} />
        </Campo>
        <Campo label="Fecha de arribo">
          <input type="date" className={inputCls} value={buque.fechaArribo || ''} onChange={(e) => setBuque('fechaArribo', e.target.value)} />
        </Campo>
      </Seccion>

      <section className={puertosTableWrap}>
        <header className={`${puertosCardHeaderAccent} flex flex-wrap items-center justify-between gap-2`}>
          <h3 className={puertosSectionTitle}>3. Información general — Descripción de la mercancía</h3>
          <button type="button" onClick={() => setLineas([...lineas, nuevaLineaMercancia()])} className={puertosBtnSm}>
            <FaPlus /> Agregar línea
          </button>
        </header>
        <div className="overflow-x-auto p-3">
          <table className="min-w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className={puertosTableThRow}>
                <th className={`${puertosTableTh} w-20 border border-red-700`}>N° cont.</th>
                <th className={`${puertosTableTh} min-w-[130px] border border-red-700`}>B/L N°</th>
                <th className={`${puertosTableTh} min-w-[280px] border border-red-700`}>Producto</th>
                <th className={`${puertosTableTh} w-24 border border-red-700`}>Cantidad</th>
                <th className={`${puertosTableTh} min-w-[150px] border border-red-700`}>Tipo carga</th>
                <th className={`${puertosTableTh} min-w-[180px] border border-red-700`}>Destino</th>
                <th className={`${puertosTableTh} w-10 border border-red-700`}></th>
              </tr>
            </thead>
            <tbody>
              {lineas.length === 0 && (
                <tr>
                  <td colSpan={7} className="border px-3 py-6 text-center font-body text-gray-500">
                    Sin líneas. Agregue al menos una fila de mercancía.
                  </td>
                </tr>
              )}
              {lineas.map((linea) => (
                <tr key={linea.id} className={puertosTableRowEven}>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs`}
                      value={linea.numContenedores || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'numContenedores', e.target.value)}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs`}
                      value={linea.bl || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'bl', e.target.value)}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs w-full`}
                      value={linea.producto || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'producto', e.target.value)}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs`}
                      value={linea.cantidad || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'cantidad', e.target.value)}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs w-full`}
                      value={linea.tipoCarga || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'tipoCarga', e.target.value)}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1`}>
                    <input
                      className={`${inputCls} py-1 text-xs w-full`}
                      value={linea.destino || ''}
                      onChange={(e) => actualizarLinea(linea.id, 'destino', e.target.value)}
                    />
                  </td>
                  <td className={`${puertosTableTd} p-1 text-center`}>
                    <button
                      type="button"
                      onClick={() => setLineas(lineas.filter((l) => l.id !== linea.id))}
                      className="p-1 text-fenix-primario"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
              {lineas.length > 0 && (
                <tr className="bg-gray-50 font-semibold dark:bg-gray-900/40">
                  <td colSpan={3} className="border px-2 py-2 text-right font-body">
                    Total
                  </td>
                  <td className="border px-2 py-2 font-body">{total > 0 ? `${total} UDS` : '—'}</td>
                  <td colSpan={3} className="border" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <PuertosCasoAreaFotograficaMercancia
        informe={informe}
        onInformeChange={onInformeChange}
        numContenedores={numContenedores}
      />
    </div>
  );
}
