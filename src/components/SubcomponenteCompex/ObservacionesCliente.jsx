import React from 'react';
import {
  complexHint,
  complexInfoPanel,
  complexPageWrap,
  complexSectionTitle,
  complexSubsectionTitle,
} from './complexFenixUi';
import { Campo, DropzoneFenix, InputFenix, SelectFenix, TextareaFenix } from './FacturacionHelpers';

export default function ObservacionesCliente({
  formData,
  handleChange,
  getRootPropsObservaciones,
  getInputPropsObservaciones,
  isDragActiveObservaciones,
}) {
  return (
    <div className={complexPageWrap}>
      <h2 className={complexSectionTitle}>Observaciones del Cliente</h2>

      <div className="space-y-6">
        <Campo label="Observaciones Generales del Cliente">
          <TextareaFenix
            name="observaciones_cliente"
            value={formData.observaciones_cliente || ''}
            onChange={handleChange}
            rows={6}
            placeholder="Registra aquí las observaciones, comentarios o feedback que el cliente ha proporcionado sobre el caso..."
          />
        </Campo>

        <Campo label="Comentarios sobre el Servicio">
          <TextareaFenix
            name="comentarios_servicio"
            value={formData.comentarios_servicio || ''}
            onChange={handleChange}
            rows={4}
            placeholder="Comentarios específicos sobre la calidad del servicio, atención recibida, etc..."
          />
        </Campo>

        <Campo label="Sugerencias de Mejora">
          <TextareaFenix
            name="sugerencias_mejora"
            value={formData.sugerencias_mejora || ''}
            onChange={handleChange}
            rows={4}
            placeholder="Sugerencias o recomendaciones que el cliente ha proporcionado para mejorar el servicio..."
          />
        </Campo>

        <Campo label="Nivel de Satisfacción">
          <SelectFenix
            name="nivel_satisfaccion"
            value={formData.nivel_satisfaccion || ''}
            onChange={handleChange}
          >
            <option value="">Selecciona el nivel de satisfacción...</option>
            <option value="Muy Satisfecho">Muy Satisfecho</option>
            <option value="Satisfecho">Satisfecho</option>
            <option value="Neutral">Neutral</option>
            <option value="Insatisfecho">Insatisfecho</option>
            <option value="Muy Insatisfecho">Muy Insatisfecho</option>
          </SelectFenix>
        </Campo>

        <Campo label="Documentos del Cliente">
          <DropzoneFenix
            getRootProps={getRootPropsObservaciones}
            getInputProps={getInputPropsObservaciones}
            isDragActive={isDragActiveObservaciones}
            hint="PDF, DOC, DOCX, imágenes (máx. 10MB)"
          >
            {isDragActiveObservaciones ? (
              <p className="font-body text-sm font-medium text-fenix-primario">
                Suelta los archivos aquí...
              </p>
            ) : (
              <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                Arrastra y suelta documentos del cliente aquí, o haz clic para seleccionar.
              </p>
            )}
          </DropzoneFenix>
          {formData.adjunto_observaciones_cliente && (
            <p className={`${complexHint} text-green-700 dark:text-green-400`}>
              Archivos seleccionados: {formData.adjunto_observaciones_cliente}
            </p>
          )}
        </Campo>

        <Campo label="Fecha de Registro">
          <InputFenix
            type="date"
            name="fecha_observaciones_cliente"
            value={formData.fecha_observaciones_cliente || ''}
            onChange={handleChange}
          />
        </Campo>

        <div className={complexInfoPanel}>
          <h3 className={complexSubsectionTitle}>Información sobre Observaciones del Cliente</h3>
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">
            Registra aquí todas las observaciones, comentarios, sugerencias y feedback que el cliente ha
            proporcionado sobre el caso y el servicio recibido. Esta información es valiosa para mejorar la
            calidad del servicio.
          </p>
        </div>
      </div>
    </div>
  );
}
