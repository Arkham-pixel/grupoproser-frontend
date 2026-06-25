import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { Seccion, Campo, inputCls, attrsTextarea } from './PuertosCasoDatosGenerales';
import PuertosCasoListaPuntos from './PuertosCasoListaPuntos';
import PuertosCasoRegistroFotograficoContenedor from './PuertosCasoRegistroFotograficoContenedor';
import { nuevoRegistroFotograficoContenedor } from './puertosCasoExportacionState';
import {
  puertosBlockHeader,
  puertosBtnPrimary,
  puertosCard,
  puertosCardBody,
  puertosSectionSubtitle,
} from './puertosFenixUi';

export default function PuertosCasoPagina5({ formData, onInformeChange, soloLectura = false }) {
  const informe = formData.informeExportacion || {};
  const registros = informe.registrosFotograficosContenedores || [];

  const setRegistros = (updater) => {
    onInformeChange('registrosFotograficosContenedores', updater);
  };

  const agregarRegistroContenedor = () => {
    setRegistros((prev) => [...(prev || []), nuevoRegistroFotograficoContenedor()]);
  };

  const actualizarRegistro = (id, registroActualizado) => {
    setRegistros((prev) => prev.map((r) => (r.id === id ? registroActualizado : r)));
  };

  const eliminarRegistro = (id) => {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  };

  const importarContenedoresDesdeSeguimiento = () => {
    const numeros = new Set();
    (informe.seguimiento || []).forEach((fila) => {
      (fila.contenedores || []).forEach((c) => {
        const n = String(c.numeroContenedor || '').trim();
        if (n) numeros.add(n);
      });
    });
    if (!numeros.size) {
      alert('No hay números de contenedor en el seguimiento de la sección 4.');
      return;
    }
    const existentes = new Set(registros.map((r) => String(r.numeroContenedor || '').trim()));
    const nuevos = [...numeros]
      .filter((n) => !existentes.has(n))
      .map((n) => nuevoRegistroFotograficoContenedor(n));
    if (!nuevos.length) {
      alert('Los contenedores del seguimiento ya tienen registro fotográfico.');
      return;
    }
    setRegistros((prev) => [...(prev || []), ...nuevos]);
  };

  return (
    <div className="space-y-5">
      <Seccion titulo="5. Conclusiones y comentarios" cols={1}>
        <Campo label="Párrafo principal">
          <textarea
            {...attrsTextarea(soloLectura, {
              className: inputCls,
              style: { minHeight: '100px' },
              value: informe.conclusionesTexto || '',
              onChange: (e) => onInformeChange('conclusionesTexto', e.target.value),
              placeholder:
                'La mercancía de exportación fue estibada y asegurada de acuerdo con las imperantes costumbres del comercio...',
            })}
          />
        </Campo>
        <PuertosCasoListaPuntos
          titulo="Puntos de conclusión (orden del informe)"
          puntos={informe.conclusionesPuntos || []}
          onChange={(updater) => onInformeChange('conclusionesPuntos', updater)}
          placeholder="Ej: Cajas cargadas en contenedores TRITON, CIA y MAERSK..."
          soloLectura={soloLectura}
        />
      </Seccion>

      <section className={puertosCard}>
        <div className={puertosCardBody}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className={puertosBlockHeader}>Registro fotográfico por contenedor</h3>
              <p className={puertosSectionSubtitle}>
                Cada bloque corresponde a un contenedor con sus sellos, como en el Word (TIIU, CAAU, MRSU…).
              </p>
            </div>
            {!soloLectura && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={importarContenedoresDesdeSeguimiento} className={puertosBtnPrimary}>
                Desde seguimiento (§4)
              </button>
              <button type="button" onClick={agregarRegistroContenedor} className={puertosBtnPrimary}>
                <FaPlus /> Registro fotográfico del contenedor
              </button>
            </div>
            )}
          </div>

          {registros.length === 0 && (
            <p className="py-8 text-center font-body text-sm text-gray-500">
              Sin registros. Use el botón para agregar el primer contenedor o importe los N° del seguimiento.
            </p>
          )}

          <div className="space-y-6">
            {registros.map((registro, idx) => (
              <PuertosCasoRegistroFotograficoContenedor
                key={registro.id}
                registro={registro}
                indice={idx}
                onChange={(actualizado) => actualizarRegistro(registro.id, actualizado)}
                onEliminar={() => eliminarRegistro(registro.id)}
                soloLectura={soloLectura}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
