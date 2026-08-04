import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus } from 'react-icons/fa';
import PuertosCasoRegistroFotograficoContenedor from './PuertosCasoRegistroFotograficoContenedor';
import { nuevoRegistroFotograficoContenedor } from './puertosCasoExportacionState';
import {
  puertosBlockHeader,
  puertosBtnPrimary,
  puertosCard,
  puertosCardBody,
  puertosSectionSubtitle,
} from './puertosFenixUi';

/**
 * Bloque «Registro fotográfico por contenedor». El prop `campo` indica qué
 * lista del informe edita, de modo que la sección 4 (supervisión) y la
 * sección 5 (conclusiones) manejan registros independientes.
 */
export default function PuertosCasoRegistrosFotograficosContenedores({
  informe,
  onInformeChange,
  campo = 'registrosFotograficosContenedores',
  soloLectura = false,
}) {
  const { t } = useTranslation();
  const registros = informe[campo] || [];

  const setRegistros = (updater) => {
    onInformeChange(campo, updater);
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
      alert(t('ports.ui.casoExportacion.photos.alerts.sinContenedoresSeguimiento'));
      return;
    }
    const existentes = new Set(registros.map((r) => String(r.numeroContenedor || '').trim()));
    const nuevos = [...numeros]
      .filter((n) => !existentes.has(n))
      .map((n) => nuevoRegistroFotograficoContenedor(n));
    if (!nuevos.length) {
      alert(t('ports.ui.casoExportacion.photos.alerts.contenedoresYaRegistrados'));
      return;
    }
    setRegistros((prev) => [...(prev || []), ...nuevos]);
  };

  return (
    <section className={puertosCard}>
      <div className={puertosCardBody}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className={puertosBlockHeader}>{t('ports.ui.casoExportacion.photos.registroPorContenedorTitle')}</h3>
            <p className={puertosSectionSubtitle}>
              {t('ports.ui.casoExportacion.photos.registroPorContenedorSubtitle')}
            </p>
          </div>
          {!soloLectura && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={importarContenedoresDesdeSeguimiento} className={puertosBtnPrimary}>
              {t('ports.ui.casoExportacion.photos.desdeSeguimiento')}
            </button>
            <button type="button" onClick={agregarRegistroContenedor} className={puertosBtnPrimary}>
              <FaPlus /> {t('ports.ui.casoExportacion.photos.agregarRegistro')}
            </button>
          </div>
          )}
        </div>

        {registros.length === 0 && (
          <p className="py-8 text-center font-body text-sm text-gray-500">
            {t('ports.ui.casoExportacion.photos.sinRegistros')}
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
  );
}
