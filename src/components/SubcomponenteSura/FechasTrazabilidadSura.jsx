import React, { useState } from 'react';
import CampoFranjaCoordinacion from '../AgendaCatastrofico/CampoFranjaCoordinacion.jsx';
import { InputFechaHoraProtocolo } from '../SubcomponenteCompex/ComplexUiBlocks.jsx';
import {
  complexCard,
  complexHint,
  complexPageWrap,
  complexSectionTitle,
} from '../SubcomponenteCompex/complexFenixUi.js';
import { trazabilidadInputClass, trazabilidadLabelClass } from '../SubcomponenteCompex/trazabilidadFenixUi.jsx';
import { ExpressAvisoModal } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

/** Orden de hitos. Se pueden dejar vacíos intermedios; las llenas deben ir en secuencia. */
const CADENA_FECHAS_SURA = [
  { name: 'fchaAsgncion', label: 'Asignación' },
  { name: 'fchaContIni', label: 'Contacto inicial' },
  { name: 'fchaCoordInspeccion', label: 'Llamada / coordinación de inspección' },
  { name: 'fchaProgInspeccion', label: 'Inspección programada (franja agenda)' },
  { name: 'fchaInspccion', label: 'Inspección (realizada)' },
  { name: 'fchaSoliDocu', label: 'Solicitud de documentos' },
  { name: 'fchaInfoPrelm', label: 'Informe preliminar' },
  { name: 'fchaRepoActi', label: 'Actualización / último documento' },
  { name: 'fchaInfoFnal', label: 'Informe final' },
  { name: 'fchaPresentacionCifras', label: 'Presentación de cifras' },
  { name: 'fchaAceptacionCifrasAseguradora', label: 'Cifras aceptadas' },
  { name: 'fchaReconsideracion', label: 'Fecha de reconsideración' },
  { name: 'fchaEnvioFiniquito', label: 'Envío de finiquito' },
  { name: 'fchaEnProcesoFacturacion', label: 'En proceso de facturación' },
  { name: 'fchaFacturado', label: 'Facturado' },
];

const FECHAS_SURA_ANTES = CADENA_FECHAS_SURA.filter((c) =>
  ['fchaAsgncion', 'fchaContIni', 'fchaCoordInspeccion'].includes(c.name)
);

const FECHAS_SURA_DESPUES = CADENA_FECHAS_SURA.filter(
  (c) => !['fchaAsgncion', 'fchaContIni', 'fchaCoordInspeccion', 'fchaProgInspeccion'].includes(c.name)
);

function soloFecha(valor) {
  if (!valor) return '';
  const s = String(valor).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

function valorFechaCampo(formData, name) {
  if (name === 'fchaProgInspeccion') {
    return (
      soloFecha(formData.fchaProgInspeccion) ||
      soloFecha(formData.fechaInspeccion) ||
      ''
    );
  }
  return soloFecha(formData[name]);
}

/**
 * Comprueba si la fecha nueva rompe la secuencia (día estrictamente posterior
 * a la anterior llena y estrictamente anterior a la siguiente llena).
 * Saltar hitos vacíos está permitido.
 */
function evaluarSaltoFecha({ formData, name, nuevaFechaIso }) {
  const idx = CADENA_FECHAS_SURA.findIndex((c) => c.name === name);
  if (idx < 0) return { ok: true };

  const nueva = soloFecha(nuevaFechaIso);
  if (!nueva) return { ok: true };

  let prev = null;
  for (let i = idx - 1; i >= 0; i -= 1) {
    const f = valorFechaCampo(formData, CADENA_FECHAS_SURA[i].name);
    if (f) {
      prev = { ...CADENA_FECHAS_SURA[i], fecha: f };
      break;
    }
  }

  let next = null;
  for (let i = idx + 1; i < CADENA_FECHAS_SURA.length; i += 1) {
    const f = valorFechaCampo(formData, CADENA_FECHAS_SURA[i].name);
    if (f) {
      next = { ...CADENA_FECHAS_SURA[i], fecha: f };
      break;
    }
  }

  const motivos = [];
  if (prev && !(nueva > prev.fecha)) {
    motivos.push(
      `debe ser un día estrictamente posterior a «${prev.label}» (${prev.fecha.split('-').reverse().join('/')})`
    );
  }
  if (next && !(nueva < next.fecha)) {
    motivos.push(
      `debe ser un día estrictamente anterior a «${next.label}» (${next.fecha.split('-').reverse().join('/')})`
    );
  }

  if (!motivos.length) return { ok: true };

  const labelActual = CADENA_FECHAS_SURA[idx]?.label || name;
  return {
    ok: false,
    mensaje: `La fecha de «${labelActual}» no sigue la secuencia: ${motivos.join('; ')}. Ajuste la fecha para que respete el orden del caso.`,
  };
}

/**
 * Fechas de hitos SURA: misma data que Complex, sin bandejas ni adjuntos.
 * Incluye franja de agenda (ajustador/inspector) para la inspección programada.
 * Se pueden dejar hitos vacíos (brincar); si la fecha no es secuencial, se pregunta.
 */
export default function FechasTrazabilidadSura({ formData = {}, handleChange }) {
  const [pendiente, setPendiente] = useState(null);

  const aplicarCambio = (name, value) => {
    handleChange({ target: { name, value: value ?? '' } });
  };

  const intentarCambioFecha = (name, valueCompleto, extras = []) => {
    const nuevaIso = soloFecha(valueCompleto);
    // Borrar siempre permitido.
    if (!nuevaIso) {
      aplicarCambio(name, valueCompleto ?? '');
      for (const ex of extras) aplicarCambio(ex.name, ex.value);
      return;
    }

    const eval_ = evaluarSaltoFecha({
      formData,
      name,
      nuevaFechaIso: nuevaIso,
    });

    const aplicarTodo = () => {
      aplicarCambio(name, valueCompleto);
      for (const ex of extras) aplicarCambio(ex.name, ex.value);
    };

    if (eval_.ok) {
      aplicarTodo();
      return;
    }

    setPendiente({
      mensaje: eval_.mensaje,
    });
  };

  const setNamed = (name) => (eOrVal) => {
    const value = eOrVal?.target ? eOrVal.target.value : eOrVal;
    handleChange({ target: { name, value: value ?? '' } });
  };

  const onChangeFechaHito = (name) => (e) => {
    const value = e?.target ? e.target.value : e;
    intentarCambioFecha(name, value ?? '');
  };

  const fechaProg =
    soloFecha(formData.fchaProgInspeccion) ||
    soloFecha(formData.fechaInspeccion) ||
    '';

  const onFechaProgramada = (eOrVal) => {
    const value = soloFecha(eOrVal?.target ? eOrVal.target.value : eOrVal);
    const extras = [{ name: 'fechaInspeccion', value }];
    if (!value) {
      extras.push({ name: 'horaInicioCoordinacion', value: '' });
      extras.push({ name: 'horaFinCoordinacion', value: '' });
    }
    intentarCambioFecha('fchaProgInspeccion', value, extras);
  };

  return (
    <div className={complexPageWrap}>
      <div>
        <h2 className={complexSectionTitle}>Fechas del caso</h2>
        <p className={complexHint}>
          Puede dejar hitos vacíos (por ejemplo pasar de Asignación a Inspección programada).
          Las fechas que sí complete deben ir en orden y en un día estrictamente posterior a la
          anterior llena. Si alguna no encaja en la secuencia, se mostrará un aviso y no se
          aplicará el cambio. En la inspección programada elija la franja del ajustador o
          inspector (asigne primero el equipo en Datos generales).
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
              onChange={onChangeFechaHito(campo.name)}
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
              onChange={onChangeFechaHito(campo.name)}
              className={trazabilidadInputClass}
              hint={false}
              compacto
            />
          </div>
        ))}
      </div>

      {pendiente && (
        <ExpressAvisoModal
          open
          tipo="warning"
          titulo="Fecha fuera de secuencia"
          mensaje={pendiente.mensaje}
          botonTexto="OK"
          onClose={() => setPendiente(null)}
        />
      )}
    </div>
  );
}
