import React from 'react';
import { InputFechaHoraProtocolo } from '../SubcomponenteCompex/ComplexUiBlocks.jsx';
import {
  complexCard,
  complexHint,
  complexPageWrap,
  complexSectionTitle,
} from '../SubcomponenteCompex/complexFenixUi.js';
import { trazabilidadInputClass, trazabilidadLabelClass } from '../SubcomponenteCompex/trazabilidadFenixUi.jsx';

const FECHAS_SURA = [
  { name: 'fchaAsgncion', label: 'Asignación' },
  { name: 'fchaContIni', label: 'Contacto inicial' },
  { name: 'fchaCoordInspeccion', label: 'Llamada / coordinación de inspección' },
  { name: 'fchaProgInspeccion', label: 'Inspección programada' },
  { name: 'fchaInspccion', label: 'Inspección' },
  { name: 'fchaSoliDocu', label: 'Solicitud de documentos' },
  { name: 'fchaInfoPrelm', label: 'Informe preliminar' },
  { name: 'fchaRepoActi', label: 'Actualización / último documento' },
  { name: 'fchaInfoFnal', label: 'Informe final' },
  { name: 'fchaPresentacionCifras', label: 'Presentación de cifras' },
  { name: 'fchaAceptacionCifrasAseguradora', label: 'Cifras aceptadas' },
  { name: 'fchaReconsideracion', label: 'Fecha de reconsideración' },
  { name: 'fchaEnvioFiniquito', label: 'Envío de finiquito' },
];

/** Fechas de hitos SURA: misma data que Complex, sin bandejas ni adjuntos. */
export default function FechasTrazabilidadSura({ formData = {}, handleChange }) {
  return (
    <div className={complexPageWrap}>
      <div>
        <h2 className={complexSectionTitle}>Fechas del caso</h2>
        <p className={complexHint}>
          Solo se registra la fecha; la hora queda en texto pequeño y se guarda al elegir el día.
          Los archivos se suben en el archivero del caso.
        </p>
      </div>
      <div className={`${complexCard} grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6`}>
        {FECHAS_SURA.map((campo) => (
          <div key={campo.name}>
            <label className={`${trazabilidadLabelClass} mb-1`} htmlFor={campo.name}>
              {campo.label}
            </label>
            <InputFechaHoraProtocolo
              id={campo.name}
              name={campo.name}
              value={formData[campo.name] || ''}
              onChange={handleChange}
              className={trazabilidadInputClass}
              hint={false}
              compacto
            />
          </div>
        ))}
      </div>
    </div>
  );
}
