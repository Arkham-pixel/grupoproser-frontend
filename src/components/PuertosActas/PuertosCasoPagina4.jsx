import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Seccion, Campo, inputCls } from './PuertosCasoDatosGenerales';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';
import PuertosCasoSeccionInformeWord from './PuertosCasoSeccionInformeWord';
import PuertosCasoRegistrosFotograficosContenedores from './PuertosCasoRegistrosFotograficosContenedores';
import {
  nuevaFilaSeguimiento,
  nuevoContenedorSeguimiento,
} from './puertosCasoExportacionState';
import {
  puertosBtnLink,
  puertosBtnSm,
  puertosCard,
  puertosCardHeaderAccent,
  puertosInnerPanel,
  puertosSectionTitle,
} from './puertosFenixUi';

function CeldaInput({ value, onChange, type = 'text', placeholder = '', soloLectura = false }) {
  return (
    <input
      type={type}
      className={`${inputCls} text-xs py-1 min-w-[72px]${soloLectura ? ' bg-gray-50 cursor-default dark:bg-gray-900/60' : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={soloLectura}
    />
  );
}

const FOTOS_INICIAL = [
  'Contenedor (es) asignado (s)',
  'Vehículo (s) asignado (s)',
  'Carga almacenada en Bodega 9',
];

const FOTOS_VEHICULO = [
  'Precinto / sello de seguridad',
  'Placa del vehículo',
  'Vista del vehículo',
];

const FOTOS_CONDICION_CARGA = [
  'Descarpado de los vehículos',
  'Inicio del descargue',
  'Final del descargue de los vehículos',
];

const FOTOS_INSPECCION_ARRIBO = [
  '3 contenedores aptos para llenado',
  'Patio 14 de SPRB',
  'Carga en buen estado',
];

const FOTOS_EQUIPOS = [
  'Montacargas',
  'Contenedores y vehículos',
  'Estibas y personal operativo',
];

const FOTOS_METEO = [
  'Apertura de contenedores',
  'Inicio llenado de los contenedores',
  'Final del llenado contenedores',
];

export default function PuertosCasoPagina4({ formData, onInformeChange, soloLectura = false }) {
  const informe = formData.informeExportacion || {};
  const seguimiento = informe.seguimiento || [];

  const setSeguimiento = (filas) => onInformeChange('seguimiento', filas);

  const actualizarFila = (filaId, campo, valor) => {
    setSeguimiento(seguimiento.map((f) => (f.id === filaId ? { ...f, [campo]: valor } : f)));
  };

  const actualizarContenedor = (filaId, contId, campo, valor) => {
    setSeguimiento(
      seguimiento.map((f) => {
        if (f.id !== filaId) return f;
        return {
          ...f,
          contenedores: f.contenedores.map((c) =>
            c.id === contId ? { ...c, [campo]: valor } : c
          ),
        };
      })
    );
  };

  const agregarContenedor = (filaId) => {
    setSeguimiento(
      seguimiento.map((f) =>
        f.id === filaId
          ? { ...f, contenedores: [...(f.contenedores || []), nuevoContenedorSeguimiento()] }
          : f
      )
    );
  };

  const eliminarContenedor = (filaId, contId) => {
    setSeguimiento(
      seguimiento.map((f) => {
        if (f.id !== filaId) return f;
        const restantes = f.contenedores.filter((c) => c.id !== contId);
        return { ...f, contenedores: restantes.length ? restantes : [nuevoContenedorSeguimiento()] };
      })
    );
  };

  return (
    <div className="space-y-5">
      <section className={puertosCard}>
        <header className={`${puertosCardHeaderAccent} flex flex-wrap items-center justify-between gap-2`}>
          <h3 className={puertosSectionTitle}>Seguimiento contenedor</h3>
          {!soloLectura && (
          <button type="button" onClick={() => setSeguimiento([...seguimiento, nuevaFilaSeguimiento()])} className={puertosBtnSm}>
            <FaPlus /> Agregar vehículo / jornada
          </button>
          )}
        </header>

        <div className="space-y-6 p-5">
          {seguimiento.length === 0 && (
            <p className="py-6 text-center font-body text-sm text-gray-500">
              Agregue filas de seguimiento (vehículo, descargue, contenedores y sellos).
            </p>
          )}

          {seguimiento.map((fila, idx) => (
            <div key={fila.id} className={`${puertosInnerPanel} space-y-4`}>
              <div className="flex items-center justify-between">
                <span className="font-body text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Registro {idx + 1}
                </span>
                {!soloLectura && (
                <button
                  type="button"
                  onClick={() => setSeguimiento(seguimiento.filter((f) => f.id !== fila.id))}
                  className="inline-flex items-center gap-1 font-body text-sm text-fenix-primario"
                >
                  <FaTrash /> Eliminar
                </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Campo label="Fecha">
                  <CeldaInput soloLectura={soloLectura} type="date" value={fila.fecha} onChange={(v) => actualizarFila(fila.id, 'fecha', v)} />
                </Campo>
                <Campo label="Entrada vehículo">
                  <CeldaInput soloLectura={soloLectura} value={fila.entradaVehiculo} onChange={(v) => actualizarFila(fila.id, 'entradaVehiculo', v)} placeholder="07:55" />
                </Campo>
                <Campo label="Salida vehículo">
                  <CeldaInput soloLectura={soloLectura} value={fila.salidaVehiculo} onChange={(v) => actualizarFila(fila.id, 'salidaVehiculo', v)} placeholder="11:47" />
                </Campo>
                <Campo label="Placa">
                  <CeldaInput soloLectura={soloLectura} value={fila.placa} onChange={(v) => actualizarFila(fila.id, 'placa', v)} placeholder="XMA 685" />
                </Campo>
                <Campo label="Descargue inicio">
                  <CeldaInput soloLectura={soloLectura} value={fila.descargueInicio} onChange={(v) => actualizarFila(fila.id, 'descargueInicio', v)} />
                </Campo>
                <Campo label="Descargue final">
                  <CeldaInput soloLectura={soloLectura} value={fila.descargueFin} onChange={(v) => actualizarFila(fila.id, 'descargueFin', v)} />
                </Campo>
                <Campo label="Bultos (total vehículo)">
                  <CeldaInput soloLectura={soloLectura} value={fila.bultos} onChange={(v) => actualizarFila(fila.id, 'bultos', v)} />
                </Campo>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-body text-xs font-semibold uppercase text-gray-500">Contenedores</span>
                  {!soloLectura && (
                  <button type="button" onClick={() => agregarContenedor(fila.id)} className={`${puertosBtnLink} text-xs`}>
                    <FaPlus /> Contenedor
                  </button>
                  )}
                </div>
                <p className="font-body text-xs text-gray-500">
                  Si al llenar un contenedor queda carga pendiente y se completa con el siguiente
                  vehículo, marque en ese vehículo la casilla «Complementa el contenedor del
                  vehículo anterior»: el informe une las celdas y consolida el conteo de la carga.
                </p>
                {(fila.contenedores || []).map((cont, idxCont) => (
                  <div key={cont.id} className="border-t border-gray-200 pt-3 dark:border-gray-700">
                    {idxCont === 0 && idx > 0 && (
                      <label className="mb-2 flex items-center gap-2 font-body text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={!!cont.continuaAnterior}
                          disabled={soloLectura}
                          onChange={(e) =>
                            actualizarContenedor(fila.id, cont.id, 'continuaAnterior', e.target.checked)
                          }
                        />
                        Complementa el contenedor del vehículo anterior
                        {cont.continuaAnterior && (() => {
                          const contsAnt = seguimiento[idx - 1]?.contenedores || [];
                          const numAnt = contsAnt[contsAnt.length - 1]?.numeroContenedor;
                          return numAnt ? (
                            <span className="font-semibold text-fenix-primario">
                              (se une con {numAnt})
                            </span>
                          ) : null;
                        })()}
                      </label>
                    )}
                    <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-4 lg:grid-cols-9">
                    <Campo label="Bultos">
                      <CeldaInput soloLectura={soloLectura} value={cont.bultos} onChange={(v) => actualizarContenedor(fila.id, cont.id, 'bultos', v)} />
                    </Campo>
                    <Campo label="Cantidad">
                      <CeldaInput soloLectura={soloLectura} value={cont.cantidad} onChange={(v) => actualizarContenedor(fila.id, cont.id, 'cantidad', v)} />
                    </Campo>
                    <Campo label="Tipo">
                      <CeldaInput soloLectura={soloLectura} value={cont.tipoContenedor} onChange={(v) => actualizarContenedor(fila.id, cont.id, 'tipoContenedor', v)} />
                    </Campo>
                    <Campo label="N° contenedor" className="sm:col-span-2">
                      <CeldaInput soloLectura={soloLectura} value={cont.numeroContenedor} onChange={(v) => actualizarContenedor(fila.id, cont.id, 'numeroContenedor', v)} />
                    </Campo>
                    <Campo label="Llenado inicio">
                      <CeldaInput soloLectura={soloLectura} value={cont.llenadoInicio} onChange={(v) => actualizarContenedor(fila.id, cont.id, 'llenadoInicio', v)} />
                    </Campo>
                    <Campo label="Llenado final">
                      <CeldaInput soloLectura={soloLectura} value={cont.llenadoFin} onChange={(v) => actualizarContenedor(fila.id, cont.id, 'llenadoFin', v)} />
                    </Campo>
                    <Campo label="Sello 1">
                      <CeldaInput soloLectura={soloLectura} value={cont.sello1} onChange={(v) => actualizarContenedor(fila.id, cont.id, 'sello1', v)} />
                    </Campo>
                    <Campo label="Sello 2">
                      <CeldaInput soloLectura={soloLectura} value={cont.sello2} onChange={(v) => actualizarContenedor(fila.id, cont.id, 'sello2', v)} />
                    </Campo>
                    {!soloLectura && (
                    <button
                      type="button"
                      onClick={() => eliminarContenedor(fila.id, cont.id)}
                      className="text-red-500 p-2 justify-self-end"
                      title="Quitar contenedor"
                    >
                      <FaTrash />
                    </button>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Seccion titulo="Comentarios" cols={1}>
        <Campo label="Comentarios del reporte de supervisión">
          <textarea
            className={`${inputCls} min-h-[120px]`}
            value={informe.comentariosSupervision || ''}
            onChange={(e) => onInformeChange('comentariosSupervision', e.target.value)}
            placeholder="Las cajas fueron descargadas y ubicadas en los contenedores asignados..."
          />
        </Campo>
      </Seccion>

      <PuertosCasoGridFotografico
        titulo="Vehículo (s) asignado (s)"
        subtitulo="Precinto, placa y vista del vehículo (3 columnas)"
        imagenes={informe.imagenesVehiculosMercancia || []}
        onChange={(updater) => onInformeChange('imagenesVehiculosMercancia', updater)}
        columnas={3}
        max={24}
        descripcionesSugeridas={FOTOS_VEHICULO}
        datalistId="puertos-fotos-vehiculos-mercancia"
        soloLectura={soloLectura}
      />

      <PuertosCasoRegistrosFotograficosContenedores
        informe={informe}
        onInformeChange={onInformeChange}
        campo="registrosFotograficosSupervision"
        soloLectura={soloLectura}
      />

      <PuertosCasoGridFotografico
        titulo="Almacenamiento de las cargas"
        subtitulo="Contenedores aptos, vehículos con sellos, carga en bodega (máx. 4 fotos)"
        imagenes={informe.imagenesRegistroInicialSupervision || []}
        onChange={(updater) => onInformeChange('imagenesRegistroInicialSupervision', updater)}
        columnas={3}
        max={4}
        descripcionesSugeridas={FOTOS_INICIAL}
        datalistId="puertos-fotos-inicial-supervision"
        soloLectura={soloLectura}
      />

      <PuertosCasoSeccionInformeWord
        soloLectura={soloLectura}
        tituloSeccion="Condición de la carga"
        valorTexto={informe.condicionCargaTexto}
        onTextoChange={(v) => onInformeChange('condicionCargaTexto', v)}
        placeholderTexto="La operación de descargue y llenado de los contenedores inició con el descarpado de los vehículos..."
        minRowsTexto={5}
        imagenes={informe.imagenesCondicionCarga || []}
        onImagenesChange={(updater) => onInformeChange('imagenesCondicionCarga', updater)}
        maxFotos={6}
        columnas={3}
        descripcionesFoto={FOTOS_CONDICION_CARGA}
        datalistId="puertos-fotos-condicion-carga"
      />

      <PuertosCasoSeccionInformeWord
        soloLectura={soloLectura}
        tituloSeccion="Durante la inspección de arribo se observó"
        valorTexto={informe.inspeccionArriboIntro}
        onTextoChange={(v) => onInformeChange('inspeccionArriboIntro', v)}
        placeholderTexto="Durante la inspección de arribo se observó la carga en buen estado."
        minRowsTexto={2}
        usarListaPuntos
        puntos={informe.inspeccionArriboPuntos || []}
        onPuntosChange={(updater) => onInformeChange('inspeccionArriboPuntos', updater)}
        placeholderPunto="Ej: Todas las cajas en buen estado, sin rastro de contaminación..."
        imagenes={informe.imagenesInspeccionArribo || []}
        onImagenesChange={(updater) => onInformeChange('imagenesInspeccionArribo', updater)}
        maxFotos={3}
        columnas={3}
        descripcionesFoto={FOTOS_INSPECCION_ARRIBO}
        datalistId="puertos-fotos-inspeccion-arribo"
      />

      <PuertosCasoSeccionInformeWord
        soloLectura={soloLectura}
        tituloSeccion="Equipos usados en la operación de cargue/descargue"
        valorTexto={informe.equiposOperacionIntro}
        onTextoChange={(v) => onInformeChange('equiposOperacionIntro', v)}
        placeholderTexto="Para el descargue y manipulación de la mercancía se utilizaron los siguientes equipos:"
        minRowsTexto={2}
        usarListaPuntos
        puntos={informe.equiposOperacionPuntos || []}
        onPuntosChange={(updater) => onInformeChange('equiposOperacionPuntos', updater)}
        placeholderPunto="Ej: Estibas plásticas y de madera para el paletizado..."
        imagenes={informe.imagenesEquiposOperacion || []}
        onImagenesChange={(updater) => onInformeChange('imagenesEquiposOperacion', updater)}
        maxFotos={3}
        columnas={3}
        descripcionesFoto={FOTOS_EQUIPOS}
        datalistId="puertos-fotos-equipos"
      />

      <PuertosCasoSeccionInformeWord
        soloLectura={soloLectura}
        tituloSeccion="Condiciones meteorológicas durante el descargue"
        valorTexto={informe.condicionesMeteoTexto}
        onTextoChange={(v) => onInformeChange('condicionesMeteoTexto', v)}
        placeholderTexto="Apertura de los contenedores… Durante toda la mañana, se mantuvo en buenas condiciones meteorológicas."
        minRowsTexto={4}
        imagenes={informe.imagenesCondicionesMeteo || []}
        onImagenesChange={(updater) => onInformeChange('imagenesCondicionesMeteo', updater)}
        maxFotos={3}
        columnas={3}
        descripcionesFoto={FOTOS_METEO}
        datalistId="puertos-fotos-meteo"
      />
    </div>
  );
}
