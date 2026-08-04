import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
import React from 'react';
import {
  complexHint,
  complexInfoPanel,
  complexPageWrap,
  complexSectionTitle,
  complexSubsectionTitle,
} from './complexFenixUi';
import { Campo, DropzoneFenix, TextareaFenix } from './FacturacionHelpers';

export default function Honorarios({
  formData,
  handleChange,
  getRootPropsHonorarios,
  getInputPropsHonorarios,
  isDragActiveHonorarios,
}) {
  return (
    <div className={complexPageWrap}>
      <h2 className={complexSectionTitle}>{t("complex.ui.honorarios.honorarios")}</h2>

      <div className="space-y-6">
        <Campo label={t("complex.ui.honorarios.documento_de_honorarios")}>
          <DropzoneFenix
            getRootProps={getRootPropsHonorarios}
            getInputProps={getInputPropsHonorarios}
            isDragActive={isDragActiveHonorarios}
            hint={t("complex.ui.honorarios.pdf_doc_docx_xls_xlsx_max_10mb")}
          >
            {isDragActiveHonorarios ? (
              <p className="font-body text-sm font-medium text-fenix-primario">{t("complex.ui.honorarios.suelta_el_archivo_aqui")}</p>
            ) : (
              <>
                <p className="font-body text-sm font-medium text-gray-800 dark:text-gray-200">{t("complex.ui.honorarios.arrastra_y_suelta_el_documento_aqui")}</p>
                <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">{t("complex.ui.honorarios.o_haz_clic_para_seleccionar_el_archivo")}</p>
              </>
            )}
          </DropzoneFenix>
          {formData.adjunto_honorarios && (
            <p className={`${complexHint} text-green-700 dark:text-green-400`}>{t("complex.ui.honorarios.archivo_seleccionado")}{formData.adjunto_honorarios}
            </p>
          )}
        </Campo>

        <Campo label={t("complex.ui.honorarios.comentarios_sobre_honorarios")}>
          <TextareaFenix
            name="observacion_honorarios"
            value={formData.observacion_honorarios || ''}
            onChange={handleChange}
            rows={4}
            placeholder={t("complex.ui.honorarios.agregar_comentarios_sobre_los_honorarios")}
          />
        </Campo>

        <div className={complexInfoPanel}>
          <h3 className={complexSubsectionTitle}>{t("complex.ui.honorarios.informacion_sobre_honorarios")}</h3>
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.honorarios.sube_aqui_los_documentos_relacionados_con_honorarios_tar")}</p>
        </div>
      </div>
    </div>
  );
}
