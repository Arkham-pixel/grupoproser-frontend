import React from 'react';
import CampoFranjaCoordinacion from '../AgendaCatastrofico/CampoFranjaCoordinacion.jsx';
import { InputFechaHoraProtocolo } from '../SubcomponenteCompex/ComplexUiBlocks.jsx';
import {
  complexCard,
  complexHint,
  complexPageWrap,
  complexSectionTitle,
} from '../SubcomponenteCompex/complexFenixUi.js';
import { trazabilidadInputClass, trazabilidadLabelClass } from '../SubcomponenteCompex/trazabilidadFenixUi.jsx';

const FECHAS_SURA_ANTES = [
  { name: 'fchaAsgncion', label: 'Asignación' },
  { name: 'fchaContIni', label: 'Contacto inicial' },
  { name: 'fchaCoordInspeccion', label: 'Llamada / coordinación de inspección' },
];

const FECHAS_SURA_DESPUES = [
  { name: 'fchaInspccion', label: 'Inspección (realizada)' },
  { name: 'fchaSoliDocu', label: 'Solicitud de documentos' },
  { name: 'fchaInfoPrelm', label: 'Informe preliminar' },
  { name: 'fchaRepoActi', label: 'Actualización / último documento' },
  { name: 'fchaInfoFnal', label: 'Informe final' },
  { name: 'fchaPresentacionCifras', label: 'Presentación de cifras' },
  { name: 'fchaAceptacionCifrasAseguradora', label: 'Cifras aceptadas' },
  { name: 'fchaReconsideracion', label: 'Fecha de reconsideración' },
  { name: 'fchaEnvioFiniquito', label: 'Envío de finiquito' },
];

function soloFecha(valor) {
  if (!valor) return '';
  const s = String(valor).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

/**
 * Fechas de hitos SURA: misma data que Complex, sin bandejas ni adjuntos.
 * Incluye franja de agenda (ajustador/inspector) para la inspección programada.
 */
export default function FechasTrazabilidadSura({ formData = {}, handleChange }) {
  const setNamed = (name) => (eOrVal) => {
    const value = eOrVal?.target ? eOrVal.target.value : eOrVal;
    handleChange({ target: { name, value: value ?? '' } });
  };

  const fechaProg =
    soloFecha(formData.fchaProgInspeccion) ||
    soloFecha(formData.fechaInspeccion) ||
    soloFecha(formData.fchaInspccion);

  const onFechaProgramada = (eOrVal) => {
    const value = soloFecha(eOrVal?.target ? eOrVal.target.value : eOrVal);
    handleChange({ target: { name: 'fchaProgInspeccion', value } });
    handleChange({ target: { name: 'fechaInspeccion', value } });
    if (!value) {
      handleChange({ target: { name: 'horaInicioCoordinacion', value: '' } });
      handleChange({ target: { name: 'horaFinCoordinacion', value: '' } });
    }
  };

  return (
    <div className={complexPageWrap}>
      <div>
        <h2 className={complexSectionTitle}>Fechas del caso</h2>
        <p className={complexHint}>
          En la inspección programada puede elegir la franja del ajustador o inspector (agenda
          catastrófica). Asigne primero el equipo en Datos generales. El resto de hitos solo
          registra la fecha; los archivos van en el archivero del caso.
        </p>
      </div>
      <div className={`${complexCard} grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6`}>
        {FECHAS_SURA_ANTES.map((campo) => (
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

        <div className="col-span-full">
          <CampoFranjaCoordinacion
            labelFecha="Inspección programada (franja agenda)"
            fecha={fechaProg}
            horaInicio={formData.horaInicioCoordinacion || ''}
            horaFin={formData.horaFinCoordinacion || ''}
            onFecha={onFechaProgramada}
            onHoraInicio={setNamed('horaInicioCoordinacion')}
            onHoraFin={setNamed('horaFinCoordinacion')}
            ajustador={formData.ajustador || formData.codiRespnsble || ''}
            inspector={formData.inspector || ''}
            casoId={formData._id || ''}
          />
        </div>

        {FECHAS_SURA_DESPUES.map((campo) => (
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
