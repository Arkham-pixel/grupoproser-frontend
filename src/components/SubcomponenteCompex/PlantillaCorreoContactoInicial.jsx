import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCopy, FaEnvelope, FaSave } from 'react-icons/fa';
import {
  detectarRamoContactoInicial,
  documentosSugeridosPorRamo,
  documentosSeleccionadosOrdenados,
  idsDocumentosPorDefecto,
  RAMOS_CONTACTO_INICIAL,
} from '../../config/contactoInicialDocumentosPorRamo.js';
import {
  firmaEstadoPlantillaContactoInicial,
  generarAsuntoContactoInicial,
  generarPlantillaContactoInicial,
  generarPlantillaContactoInicialHtml,
  normalizarPlantillaContactoInicial,
  serializarPlantillaContactoInicial,
} from '../../utils/contactoInicialPlantillaCorreo.js';
import { complexBtnPrimary, complexCard, complexHint, complexSubsectionTitle } from './complexFenixUi';
import { trazabilidadInputClass, trazabilidadLabelClass } from './trazabilidadFenixUi';

function firmaPlantillaGuardada(guardada, ramoDetectado) {
  if (!guardada) return 'vacío';
  const estado = normalizarPlantillaContactoInicial(guardada, ramoDetectado);
  return firmaEstadoPlantillaContactoInicial({
    ...estado,
    documentosSeleccionados: estado.documentosSeleccionados,
  });
}

export default function PlantillaCorreoContactoInicial({ formData, onPlantillaChange }) {
  const ramoDetectado = useMemo(
    () => detectarRamoContactoInicial(formData?.tipoPoliza, formData?.amprAfctdo),
    [formData?.tipoPoliza, formData?.amprAfctdo]
  );

  const casoId = formData?._id || formData?.id || 'nuevo';
  const restauradoRef = useRef('');
  const origenLocalRef = useRef(false);
  const omitirPersistenciaRef = useRef(true);
  const ultimaFirmaEditableRef = useRef('');
  const onPlantillaChangeRef = useRef(onPlantillaChange);

  useEffect(() => {
    onPlantillaChangeRef.current = onPlantillaChange;
  }, [onPlantillaChange]);

  const [tipoDestinatario, setTipoDestinatario] = useState('intermediario');
  const [ramoManual, setRamoManual] = useState(ramoDetectado);
  const [opcionesInspeccion, setOpcionesInspeccion] = useState([
    { fecha: '', hora: '' },
    { fecha: '', hora: '' },
    { fecha: '', hora: '' },
  ]);
  const [seleccionados, setSeleccionados] = useState(() => new Set(idsDocumentosPorDefecto(ramoDetectado)));
  const [copiado, setCopiado] = useState(false);
  const [copiadoAsunto, setCopiadoAsunto] = useState(false);
  const [abierto, setAbierto] = useState(true);

  const documentosKey = useMemo(
    () => Array.from(seleccionados).sort().join('|'),
    [seleccionados]
  );

  const opcionesKey = useMemo(
    () => JSON.stringify(opcionesInspeccion),
    [opcionesInspeccion]
  );

  const aplicarEstado = (estado) => {
    setTipoDestinatario(estado.tipoDestinatario);
    setRamoManual(estado.ramoManual);
    setOpcionesInspeccion(estado.opcionesInspeccion);
    setSeleccionados(new Set(estado.documentosSeleccionados));
    ultimaFirmaEditableRef.current = firmaEstadoPlantillaContactoInicial({
      ...estado,
      documentosSeleccionados: estado.documentosSeleccionados,
    });
  };

  const firmaEditableGuardada = useMemo(() => {
    const guardada = formData?.plantillaContactoInicial;
    if (!guardada) return `${casoId}|vacío`;
    return `${casoId}|${firmaPlantillaGuardada(guardada, ramoDetectado)}`;
  }, [
    casoId,
    ramoDetectado,
    formData?.plantillaContactoInicial?.tipoDestinatario,
    formData?.plantillaContactoInicial?.ramoManual,
    formData?.plantillaContactoInicial?.opcionesInspeccion,
    formData?.plantillaContactoInicial?.documentosSeleccionados,
  ]);

  useEffect(() => {
    if (origenLocalRef.current) {
      origenLocalRef.current = false;
      return;
    }

    if (restauradoRef.current === firmaEditableGuardada) return;
    restauradoRef.current = firmaEditableGuardada;

    const guardada = formData?.plantillaContactoInicial;
    if (guardada) {
      aplicarEstado(normalizarPlantillaContactoInicial(guardada, ramoDetectado));
    } else {
      aplicarEstado(normalizarPlantillaContactoInicial(null, ramoDetectado));
    }
    omitirPersistenciaRef.current = true;
  }, [firmaEditableGuardada, ramoDetectado]);

  useEffect(() => {
    if (formData?.plantillaContactoInicial?.ramoManual) return;
    setRamoManual(ramoDetectado);
    setSeleccionados(new Set(idsDocumentosPorDefecto(ramoDetectado)));
  }, [ramoDetectado, formData?.plantillaContactoInicial?.ramoManual]);

  useEffect(() => {
    if (!formData?.fchaProgInspeccion || formData?.plantillaContactoInicial?.opcionesInspeccion?.[0]?.fecha) {
      return;
    }
    setOpcionesInspeccion((prev) => {
      const next = [...prev];
      next[0] = {
        ...next[0],
        fecha: formData.fchaProgInspeccion.slice(0, 10),
        hora: next[0].hora || '09:00',
      };
      return next;
    });
  }, [formData?.fchaProgInspeccion, formData?.plantillaContactoInicial?.opcionesInspeccion]);

  const docsRamo = useMemo(() => documentosSugeridosPorRamo(ramoManual), [ramoManual]);

  const nombreDestinatario = useMemo(() => {
    if (tipoDestinatario === 'asegurado') return formData?.asgrBenfcro || '';
    if (tipoDestinatario === 'reclamante') return formData?.asgrBenfcro || formData?.nombIntermediario || '';
    return formData?.nombIntermediario || '';
  }, [tipoDestinatario, formData?.asgrBenfcro, formData?.nombIntermediario]);

  const nombreAjustador = localStorage.getItem('nombre') || localStorage.getItem('login') || '';

  const etiquetasSeleccionadas = useMemo(
    () => documentosSeleccionadosOrdenados(ramoManual, seleccionados),
    [seleccionados, ramoManual]
  );

  const nombreAseguradora = useMemo(
    () => formData?.nombreCliente || formData?.codiAsgrdra || '',
    [formData?.nombreCliente, formData?.codiAsgrdra]
  );

  const asunto = useMemo(
    () =>
      generarAsuntoContactoInicial({
        numeroSiniestro: formData?.nmroSinstro,
        numeroPoliza: formData?.nmroPolza,
        nombreAsegurado: formData?.asgrBenfcro,
        nombreAseguradora,
      }),
    [formData?.nmroSinstro, formData?.nmroPolza, formData?.asgrBenfcro, nombreAseguradora]
  );

  const plantilla = useMemo(
    () =>
      generarPlantillaContactoInicial({
        nombreDestinatario,
        tipoDestinatario,
        numeroSiniestro: formData?.nmroSinstro,
        numeroAjuste: formData?.nmroAjste,
        opcionesInspeccion,
        documentosSeleccionados: etiquetasSeleccionadas,
        nombreAjustador,
        preambuloRamo: docsRamo.preambuloRamo,
        incluirNotasGenerales: docsRamo.incluirNotasGenerales,
      }),
    [
      nombreDestinatario,
      tipoDestinatario,
      formData?.nmroSinstro,
      formData?.nmroAjste,
      opcionesInspeccion,
      etiquetasSeleccionadas,
      nombreAjustador,
      docsRamo.preambuloRamo,
      docsRamo.incluirNotasGenerales,
    ]
  );

  const plantillaHtml = useMemo(
    () =>
      generarPlantillaContactoInicialHtml({
        nombreDestinatario,
        tipoDestinatario,
        numeroSiniestro: formData?.nmroSinstro,
        numeroAjuste: formData?.nmroAjste,
        opcionesInspeccion,
        documentosSeleccionados: etiquetasSeleccionadas,
        nombreAjustador,
        preambuloRamo: docsRamo.preambuloRamo,
        incluirNotasGenerales: docsRamo.incluirNotasGenerales,
      }),
    [
      nombreDestinatario,
      tipoDestinatario,
      formData?.nmroSinstro,
      formData?.nmroAjste,
      opcionesInspeccion,
      etiquetasSeleccionadas,
      nombreAjustador,
      docsRamo.preambuloRamo,
      docsRamo.incluirNotasGenerales,
    ]
  );

  useEffect(() => {
    const sync = onPlantillaChangeRef.current;
    if (!sync) return;

    if (omitirPersistenciaRef.current) {
      omitirPersistenciaRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const firmaEditable = firmaEstadoPlantillaContactoInicial({
        tipoDestinatario,
        ramoManual,
        opcionesInspeccion,
        documentosSeleccionados: seleccionados,
      });

      if (firmaEditable === ultimaFirmaEditableRef.current) {
        return;
      }

      ultimaFirmaEditableRef.current = firmaEditable;

      const payload = serializarPlantillaContactoInicial({
        tipoDestinatario,
        ramoManual,
        opcionesInspeccion,
        documentosSeleccionados: seleccionados,
      });

      origenLocalRef.current = true;
      sync(payload);
    }, 400);

    return () => clearTimeout(timer);
  }, [tipoDestinatario, ramoManual, opcionesKey, documentosKey]);

  const toggleDoc = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const actualizarOpcion = (index, campo, valor) => {
    setOpcionesInspeccion((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [campo]: valor };
      return next;
    });
  };

  const copiarAsunto = async () => {
    try {
      await navigator.clipboard.writeText(asunto);
      setCopiadoAsunto(true);
      setTimeout(() => setCopiadoAsunto(false), 2500);
    } catch {
      /* fallback silencioso */
    }
  };

  const copiar = async () => {
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        const blobHtml = new Blob([plantillaHtml], { type: 'text/html' });
        const blobText = new Blob([plantilla], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plantilla);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(plantilla);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      } catch {
        /* fallback silencioso */
      }
    }
  };

  const renderChecklist = (items) =>
    items.map((doc) => (
      <label
        key={doc.id}
        className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/40"
      >
        <input
          type="checkbox"
          className="mt-0.5"
          checked={seleccionados.has(doc.id)}
          onChange={() => toggleDoc(doc.id)}
        />
        <span className="text-gray-700 dark:text-gray-300">{doc.label}</span>
      </label>
    ));

  const tienePlantillaGuardada = Boolean(formData?.plantillaContactoInicial?.actualizadoEn);

  return (
    <div className={`${complexCard} mt-4 border border-fenix-primario/20`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className={`${complexSubsectionTitle} flex items-center gap-2`}>
          <FaEnvelope className="text-fenix-primario" />{t("complex.ui.plantilla_correo_contacto_inicial.plantilla_de_correo_contacto_inicial")}</span>
        <span className="text-xs text-gray-500">{abierto ? 'Ocultar' : 'Mostrar'}</span>
      </button>

      {abierto && (
        <div className="mt-4 space-y-4">
          <p className={complexHint}>{t("complex.ui.plantilla_correo_contacto_inicial.texto_del_correo_de_contacto_inicial_segun_la_plantilla_")}</p>

          {formData?.plantillaContactoInicial && (
            <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <FaSave />
              {tienePlantillaGuardada
                ? t('complex.ui.plantilla_correo_contacto_inicial.plantilla_en_caso', {
                    fecha: new Date(formData.plantillaContactoInicial.actualizadoEn).toLocaleString(),
                  })
                : t('complex.ui.plantilla_correo_contacto_inicial.plantilla_asociada')}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={trazabilidadLabelClass}>{t("complex.ui.plantilla_correo_contacto_inicial.destinatario_del_saludo")}</label>
              <select
                value={tipoDestinatario}
                onChange={(e) => setTipoDestinatario(e.target.value)}
                className={trazabilidadInputClass}
              >
                <option value="intermediario">{t("complex.ui.plantilla_correo_contacto_inicial.intermediario")}</option>
                <option value="asegurado">{t("complex.ui.plantilla_correo_contacto_inicial.asegurado_beneficiario")}</option>
                <option value="reclamante">{t("complex.ui.plantilla_correo_contacto_inicial.reclamante")}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">{t("complex.ui.plantilla_correo_contacto_inicial.nombre_en_plantilla")}<strong>{nombreDestinatario || '—'}</strong>
              </p>
            </div>
            <div>
              <label className={trazabilidadLabelClass}>{t("complex.ui.plantilla_correo_contacto_inicial.tipo_de_siniestro_solicitud_basica")}</label>
              <select
                value={ramoManual}
                onChange={(e) => {
                  const key = e.target.value;
                  setRamoManual(key);
                  setSeleccionados(new Set(idsDocumentosPorDefecto(key)));
                }}
                className={trazabilidadInputClass}
              >
                {Object.entries(RAMOS_CONTACTO_INICIAL).map(([key, { etiqueta }]) => (
                  <option key={key} value={key}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.plantilla_correo_contacto_inicial.tres_fechas_propuestas_de_inspeccion")}</p>
            <div className="grid gap-3 md:grid-cols-3">
              {opcionesInspeccion.map((op, index) => (
                <div key={index} className="space-y-2 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                  <p className="text-xs font-semibold text-gray-600">{t("complex.ui.plantilla_correo_contacto_inicial.opcion")}{index + 1}</p>
                  <input
                    type="date"
                    value={op.fecha}
                    onChange={(e) => actualizarOpcion(index, 'fecha', e.target.value)}
                    className={trazabilidadInputClass}
                  />
                  <input
                    type="time"
                    value={op.hora}
                    onChange={(e) => actualizarOpcion(index, 'hora', e.target.value)}
                    className={trazabilidadInputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.plantilla_correo_contacto_inicial.documentos_del_protocolo")}{docsRamo.etiquetaRamo}{t("complex.ui.plantilla_correo_contacto_inicial.texto")}</p>
              <div className="space-y-2">{renderChecklist(docsRamo.especificos)}</div>
            </div>
            <div>
              <p className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.plantilla_correo_contacto_inicial.documentos_opcionales_administrativos")}</p>
              <div className="space-y-2">{renderChecklist(docsRamo.comunes)}</div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className={trazabilidadLabelClass}>{t("complex.ui.plantilla_correo_contacto_inicial.asunto_del_correo")}</p>
              <button
                type="button"
                onClick={copiarAsunto}
                className={`${complexBtnPrimary} inline-flex items-center gap-2 text-sm`}
              >
                <FaCopy />
                {copiadoAsunto ? 'Asunto copiado' : 'Copiar asunto'}
              </button>
            </div>
            <input
              readOnly
              value={asunto}
              className={`${trazabilidadInputClass} text-sm font-medium`}
            />
            <p className="mt-1 text-xs text-gray-500">{t("complex.ui.plantilla_correo_contacto_inicial.incluye_siniestro_poliza_asegurado_y_aseguradora_del_cas")}</p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className={trazabilidadLabelClass}>{t("complex.ui.plantilla_correo_contacto_inicial.cuerpo_del_correo")}</p>
              <button type="button" onClick={copiar} className={`${complexBtnPrimary} inline-flex items-center gap-2 text-sm`}>
                <FaCopy />
                {copiado ? 'Cuerpo copiado' : 'Copiar cuerpo'}
              </button>
            </div>
            <pre
              className={`${trazabilidadInputClass} h-96 max-h-96 resize-none overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed`}
            >
              {plantilla}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
