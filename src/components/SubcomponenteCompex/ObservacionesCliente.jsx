import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
import React, { useState } from 'react';
import {
  complexHint,
  complexInfoPanel,
  complexPageWrap,
  complexSectionTitle,
  complexSubsectionTitle,
} from './complexFenixUi';
import { Campo, DropzoneFenix, InputFenix, SelectFenix, TextareaFenix } from './FacturacionHelpers';
import TranslatedTextArea from '../TranslatedTextArea.jsx';

export default function ObservacionesCliente({
  formData,
  handleChange,
  getRootPropsObservaciones,
  getInputPropsObservaciones,
  isDragActiveObservaciones,
}) {
  const [observacionesClienteEn, setObservacionesClienteEn] = useState('');

  return (
    <div className={complexPageWrap}>
      <h2 className={complexSectionTitle}>{t("complex.ui.observaciones_cliente.observaciones_del_cliente")}</h2>

      <div className="space-y-6">
        <Campo label={t("complex.ui.observaciones_cliente.observaciones_generales_del_cliente")}>
          <TranslatedTextArea
            name="observaciones_cliente"
            value={formData.observaciones_cliente || ''}
            onChange={(value) => handleChange({ target: { name: 'observaciones_cliente', value } })}
            translation={observacionesClienteEn}
            onTranslationChange={setObservacionesClienteEn}
            rows={6}
            placeholder={t("complex.ui.observaciones_cliente.registra_aqui_las_observaciones_comentarios_o_feedback_q")}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
        </Campo>

        <Campo label={t("complex.ui.observaciones_cliente.comentarios_sobre_el_servicio")}>
          <TextareaFenix
            name="comentarios_servicio"
            value={formData.comentarios_servicio || ''}
            onChange={handleChange}
            rows={4}
            placeholder={t("complex.ui.observaciones_cliente.comentarios_especificos_sobre_la_calidad_del_servicio_at")}
          />
        </Campo>

        <Campo label={t("complex.ui.observaciones_cliente.sugerencias_de_mejora")}>
          <TextareaFenix
            name="sugerencias_mejora"
            value={formData.sugerencias_mejora || ''}
            onChange={handleChange}
            rows={4}
            placeholder={t("complex.ui.observaciones_cliente.sugerencias_o_recomendaciones_que_el_cliente_ha_proporci")}
          />
        </Campo>

        <Campo label={t("complex.ui.observaciones_cliente.nivel_de_satisfaccion")}>
          <SelectFenix
            name="nivel_satisfaccion"
            value={formData.nivel_satisfaccion || ''}
            onChange={handleChange}
          >
            <option value="">{t("complex.ui.observaciones_cliente.selecciona_el_nivel_de_satisfaccion")}</option>
            <option value="Muy Satisfecho">{t("complex.ui.observaciones_cliente.muy_satisfecho")}</option>
            <option value="Satisfecho">{t("complex.ui.observaciones_cliente.satisfecho")}</option>
            <option value="Neutral">{t("complex.ui.observaciones_cliente.neutral")}</option>
            <option value="Insatisfecho">{t("complex.ui.observaciones_cliente.insatisfecho")}</option>
            <option value="Muy Insatisfecho">{t("complex.ui.observaciones_cliente.muy_insatisfecho")}</option>
          </SelectFenix>
        </Campo>

        <Campo label={t("complex.ui.observaciones_cliente.documentos_del_cliente")}>
          <DropzoneFenix
            getRootProps={getRootPropsObservaciones}
            getInputProps={getInputPropsObservaciones}
            isDragActive={isDragActiveObservaciones}
            hint={t("complex.ui.observaciones_cliente.pdf_doc_docx_imagenes_max_10mb")}
          >
            {isDragActiveObservaciones ? (
              <p className="font-body text-sm font-medium text-fenix-primario">{t("complex.ui.observaciones_cliente.suelta_los_archivos_aqui")}</p>
            ) : (
              <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.observaciones_cliente.arrastra_y_suelta_documentos_del_cliente_aqui_o_haz_clic")}</p>
            )}
          </DropzoneFenix>
          {formData.adjunto_observaciones_cliente && (
            <p className={`${complexHint} text-green-700 dark:text-green-400`}>{t("complex.ui.observaciones_cliente.archivos_seleccionados")}{formData.adjunto_observaciones_cliente}
            </p>
          )}
        </Campo>

        <Campo label={t("complex.ui.observaciones_cliente.fecha_de_registro")}>
          <InputFenix
            type="date"
            name="fecha_observaciones_cliente"
            value={formData.fecha_observaciones_cliente || ''}
            onChange={handleChange}
          />
        </Campo>

        <div className={complexInfoPanel}>
          <h3 className={complexSubsectionTitle}>{t("complex.ui.observaciones_cliente.informacion_sobre_observaciones_del_cliente")}</h3>
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.observaciones_cliente.registra_aqui_todas_las_observaciones_comentarios_sugere")}</p>
        </div>
      </div>
    </div>
  );
}
