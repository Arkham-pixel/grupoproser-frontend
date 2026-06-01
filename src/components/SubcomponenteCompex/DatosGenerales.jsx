import React, { useMemo } from 'react';
import Select from 'react-select';
import { useTheme } from '../../context/ThemeContext';
import {
  complexAlertError,
  complexAlertWarn,
  complexHint,
  complexLink,
  complexPageWrap,
  complexSectionTitle,
} from './complexFenixUi';
import {
  Campo,
  getComplexSelectStyles,
  InputFenix,
  SelectFenix,
  TextareaFenix,
  ValorFijo,
} from './FacturacionHelpers';

function resolverEstadoSelect(formData, estados = []) {
  const seleccionUsuario = String(formData?.estado ?? '').trim();
  if (seleccionUsuario) {
    if (estados.length === 0 || estados.some((e) => String(e.value) === seleccionUsuario)) {
      return seleccionUsuario;
    }
  }

  const raw =
    formData?.codiEstdo ??
    formData?.codi_estado ??
    formData?.codi_estdo ??
    formData?.estado;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '';
  }
  const valorStr = String(raw).trim();

  if (estados.length > 0) {
    const porCodigo = estados.find((e) => String(e.value) === valorStr);
    if (porCodigo) return String(porCodigo.value);

    const porLabel = estados.find(
      (e) => String(e.label || '').trim().toUpperCase() === valorStr.toUpperCase()
    );
    if (porLabel) return String(porLabel.value);
  }

  return valorStr;
}

function normalizarTipoDocumento(valor) {
  if (!valor) return '';
  const upper = String(valor).trim().toUpperCase();
  const tipos = ['CC', 'CE', 'NIT', 'PASAPORTE', 'PEP', 'RC', 'TI', 'OTRO'];
  if (tipos.includes(upper)) return upper;
  if (upper === 'NIT' || upper === 'NIT.') return 'NIT';
  return upper;
}

function resolverCiudadSelect(formData, municipios) {
  if (!formData.ciudadSiniestro || !municipios.length) return null;
  let ciudadEncontrada = municipios.find(
    (opt) => String(opt.value) === String(formData.ciudadSiniestro)
  );
  if (!ciudadEncontrada) {
    ciudadEncontrada = municipios.find(
      (opt) =>
        String(opt.label) === String(formData.ciudadSiniestro) ||
        (opt.label && String(opt.label).includes(String(formData.ciudadSiniestro)))
    );
  }
  if (!ciudadEncontrada) {
    const ciudadGuardada = String(formData.ciudadSiniestro).toLowerCase().trim();
    ciudadEncontrada = municipios.find(
      (opt) => opt.label && String(opt.label).toLowerCase().trim() === ciudadGuardada
    );
  }
  return ciudadEncontrada || null;
}

export default function DatosGenerales({
  formData,
  handleChange,
  handleAseguradoraChange,
  handleCiudadChange,
  municipios,
  cargandoMunicipios = false,
  aseguradoraOptions,
  funcionarios,
  cargandoFuncionarios = false,
  responsables,
  hayResponsables,
  intermediarios,
  estados,
  onResponsableChange,
  onFuncionarioChange,
  camposFijos = false,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const selectStyles = useMemo(() => getComplexSelectStyles(isDark), [isDark]);

  const labelResponsable =
    responsables?.find(
      (r) =>
        String(r.value) === String(formData.codiRespnsble) ||
        String(r.codiRespnsble) === String(formData.codiRespnsble)
    )?.label ||
    formData.nombreResponsable ||
    formData.codiRespnsble ||
    'Sin asignar';

  const labelCliente =
    aseguradoraOptions?.find(
      (a) =>
        String(a.value) === String(formData.codiAsgrdra) ||
        String(a.codiAsgrdra) === String(formData.codiAsgrdra)
    )?.label ||
    formData.nombreAseguradora ||
    formData.codiAsgrdra ||
    'Sin asignar';

  const ciudadNoEnLista =
    formData.ciudadSiniestro &&
    municipios.length > 0 &&
    !municipios.find(
      (opt) =>
        String(opt.value) === String(formData.ciudadSiniestro) ||
        String(opt.label) === String(formData.ciudadSiniestro)
    );

  const aseguradorasOrdenadas = [...(aseguradoraOptions || [])].sort((a, b) => {
    const labelA = (a.label || a || '').toString().toUpperCase();
    const labelB = (b.label || b || '').toUpperCase();
    return labelA.localeCompare(labelB);
  });

  const valorEstadoSelect = useMemo(
    () => resolverEstadoSelect(formData, estados),
    [formData.codiEstdo, formData.codi_estado, formData.codi_estdo, formData.estado, estados]
  );

  const tipoDocumentoSelect = useMemo(
    () => normalizarTipoDocumento(formData.tipoDucumento),
    [formData.tipoDucumento]
  );

  const intermediariosSelect = useMemo(() => {
    const base = [...(intermediarios || [])];
    const actual = String(formData.nombIntermediario || '').trim();
    if (actual && !base.some((nombre) => String(nombre).trim() === actual)) {
      base.unshift(actual);
    }
    return base;
  }, [intermediarios, formData.nombIntermediario]);

  return (
    <div className={complexPageWrap}>
      <h2 className={complexSectionTitle}>Datos Generales del Caso</h2>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Campo label="Responsable *">
          {camposFijos ? (
            <ValorFijo>{labelResponsable}</ValorFijo>
          ) : (
            <>
              <SelectFenix
                name="codiRespnsble"
                value={formData.codiRespnsble || ''}
                onChange={(e) => {
                  handleChange(e);
                  onResponsableChange?.(e.target.value);
                }}
                required
                disabled={!hayResponsables}
              >
                <option value="">Seleccionar...</option>
                {(responsables || []).map((responsable) => (
                  <option key={responsable.value} value={responsable.value}>
                    {responsable.label}
                  </option>
                ))}
              </SelectFenix>
              {!hayResponsables && (
                <p className={complexAlertError}>No hay responsables disponibles.</p>
              )}
            </>
          )}
        </Campo>

        <Campo label="Cliente *">
          {camposFijos ? (
            <ValorFijo>{labelCliente}</ValorFijo>
          ) : (
            <SelectFenix
              name="codiAsgrdra"
              value={formData.codiAsgrdra || ''}
              onChange={handleAseguradoraChange}
              required
            >
              <option value="">Seleccione un Cliente</option>
              {aseguradorasOrdenadas.map((aseg) => (
                <option key={aseg.value || aseg} value={aseg.value || aseg}>
                  {aseg.label || aseg}
                </option>
              ))}
            </SelectFenix>
          )}
        </Campo>

        {formData.codiAsgrdra && (
          <Campo
            label={
              <>
                Funcionario Aseguradora
                {cargandoFuncionarios && (
                  <span className="ml-2 inline-block align-middle">
                    <svg
                      className="h-4 w-4 animate-spin text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                )}
              </>
            }
          >
            <SelectFenix
              name="funcAsgrdra"
              value={formData.funcAsgrdra || ''}
              onChange={(e) => {
                if (onFuncionarioChange) onFuncionarioChange(e);
                else handleChange(e);
              }}
              disabled={cargandoFuncionarios}
              className={cargandoFuncionarios ? 'cursor-wait' : ''}
            >
              <option value="">
                {cargandoFuncionarios
                  ? 'Cargando funcionarios...'
                  : funcionarios.length === 0
                    ? 'No hay funcionarios disponibles'
                    : 'Seleccione un funcionario'}
              </option>
              {(funcionarios || []).map((func) => (
                <option key={func.value} value={func.value}>
                  {func.label}
                </option>
              ))}
            </SelectFenix>
            {!cargandoFuncionarios && funcionarios.length === 0 && formData.codiAsgrdra && (
              <p className={complexHint}>No hay funcionarios disponibles para este cliente.</p>
            )}
          </Campo>
        )}

        <Campo label="Número de Siniestro *">
          <InputFenix
            type="text"
            name="nmroSinstro"
            value={formData.nmroSinstro || ''}
            onChange={handleChange}
            required
          />
        </Campo>

        <Campo label="Código Workflow">
          <InputFenix
            type="text"
            name="codWorkflow"
            value={formData.codWorkflow || ''}
            onChange={handleChange}
          />
        </Campo>

        <Campo label="Intermediario" className="md:col-span-2">
          <SelectFenix
            name="nombIntermediario"
            value={formData.nombIntermediario || ''}
            onChange={handleChange}
          >
            <option value="">Selecciona un intermediario</option>
            {intermediariosSelect.map((nombre, index) => (
              <option key={index} value={nombre}>
                {nombre}
              </option>
            ))}
          </SelectFenix>
          <p className={complexHint}>
            Para agregar un nuevo intermediario, ve a{' '}
            <a
              href="/admin/intermediarios"
              className={complexLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Administración → Intermediarios
            </a>
          </p>
        </Campo>

        <Campo label="Número de Póliza">
          <InputFenix type="text" name="nmroPolza" value={formData.nmroPolza || ''} onChange={handleChange} />
        </Campo>

        <Campo label="Asegurado o Beneficiario *">
          <InputFenix
            type="text"
            name="asgrBenfcro"
            value={formData.asgrBenfcro || ''}
            onChange={handleChange}
            required
          />
        </Campo>

        <Campo label="Tipo de Documento">
          <SelectFenix
            name="tipoDucumento"
            value={tipoDocumentoSelect}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona un tipo</option>
            <option value="CC">Cédula de Ciudadanía (CC)</option>
            <option value="CE">Cédula de Extranjería (CE)</option>
            <option value="NIT">NIT</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="PEP">Permiso Especial de Permanencia (PEP)</option>
            <option value="RC">Registro Civil (RC)</option>
            <option value="TI">Tarjeta de Identidad (TI)</option>
            <option value="OTRO">Otro</option>
          </SelectFenix>
        </Campo>

        <Campo label="Número de Documento">
          <InputFenix
            type="text"
            name="numDocumento"
            value={formData.numDocumento || ''}
            onChange={handleChange}
            required
          />
        </Campo>

        <Campo label="Fecha de Asignación">
          <InputFenix
            type="date"
            name="fchaAsgncion"
            value={formData.fchaAsgncion || ''}
            onChange={handleChange}
          />
        </Campo>

        <Campo label="Fecha del Siniestro">
          <InputFenix
            type="date"
            name="fchaSinstro"
            value={formData.fchaSinstro || ''}
            onChange={handleChange}
          />
        </Campo>

        <Campo label="Ciudad del Siniestro" className="md:col-span-2">
          <Select
            options={municipios}
            value={resolverCiudadSelect(formData, municipios)}
            onChange={handleCiudadChange}
            placeholder="Selecciona una ciudad..."
            isSearchable
            isLoading={cargandoMunicipios && municipios.length === 0}
            isDisabled={cargandoMunicipios && municipios.length === 0}
            className="w-full"
            styles={selectStyles}
          />
          {cargandoMunicipios && municipios.length === 0 && (
            <p className={complexHint}>Cargando ciudades...</p>
          )}
          {ciudadNoEnLista && (
            <p className={complexAlertWarn}>
              Ciudad guardada: &quot;{formData.ciudadSiniestro}&quot; — verifica que coincida con las
              opciones disponibles
            </p>
          )}
        </Campo>

        <Campo label="Tipo de Póliza">
          <InputFenix type="text" name="tipoPoliza" value={formData.tipoPoliza || ''} onChange={handleChange} />
        </Campo>

        <Campo label="Causa del Siniestro">
          <InputFenix
            type="text"
            name="causa_siniestro"
            value={formData.causa_siniestro || ''}
            onChange={handleChange}
          />
        </Campo>

        <Campo label="Estado *">
          <SelectFenix name="estado" value={valorEstadoSelect} onChange={handleChange} required>
            <option value="">Selecciona un estado</option>
            {(estados || [])
              .filter((e) => e.value !== undefined && e.value !== null)
              .map((estado) => (
                <option key={`estado-${estado.value}`} value={estado.value}>
                  {estado.label}
                </option>
              ))}
          </SelectFenix>
          {(!estados || estados.length === 0) && (
            <p className={complexAlertError}>No hay estados disponibles.</p>
          )}
        </Campo>

        <Campo label="Descripción del Estado" className="md:col-span-2">
          <TextareaFenix
            name="descripcionEstado"
            value={formData.descripcionEstado || ''}
            onChange={handleChange}
            rows={3}
            placeholder="Describe el estado del caso..."
          />
        </Campo>

        <Campo label="Descripción del Siniestro" className="md:col-span-2">
          <TextareaFenix
            name="descSinstro"
            value={formData.descSinstro || ''}
            onChange={handleChange}
            rows={4}
            placeholder="Describe brevemente el siniestro"
          />
        </Campo>
      </div>
    </div>
  );
}
