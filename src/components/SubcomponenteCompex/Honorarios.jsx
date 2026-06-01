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
      <h2 className={complexSectionTitle}>Honorarios</h2>

      <div className="space-y-6">
        <Campo label="Documento de Honorarios">
          <DropzoneFenix
            getRootProps={getRootPropsHonorarios}
            getInputProps={getInputPropsHonorarios}
            isDragActive={isDragActiveHonorarios}
            hint="PDF, DOC, DOCX, XLS, XLSX (máx. 10MB)"
          >
            {isDragActiveHonorarios ? (
              <p className="font-body text-sm font-medium text-fenix-primario">
                Suelta el archivo aquí...
              </p>
            ) : (
              <>
                <p className="font-body text-sm font-medium text-gray-800 dark:text-gray-200">
                  Arrastra y suelta el documento aquí
                </p>
                <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
                  O haz clic para seleccionar el archivo
                </p>
              </>
            )}
          </DropzoneFenix>
          {formData.adjunto_honorarios && (
            <p className={`${complexHint} text-green-700 dark:text-green-400`}>
              Archivo seleccionado: {formData.adjunto_honorarios}
            </p>
          )}
        </Campo>

        <Campo label="Comentarios sobre Honorarios">
          <TextareaFenix
            name="observacion_honorarios"
            value={formData.observacion_honorarios || ''}
            onChange={handleChange}
            rows={4}
            placeholder="Agregar comentarios sobre los honorarios..."
          />
        </Campo>

        <div className={complexInfoPanel}>
          <h3 className={complexSubsectionTitle}>Información sobre Honorarios</h3>
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">
            Sube aquí los documentos relacionados con honorarios, tarifas, acuerdos de pago o cualquier
            documentación financiera relevante para el caso.
          </p>
        </div>
      </div>
    </div>
  );
}
