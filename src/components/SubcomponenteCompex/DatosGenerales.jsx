import { useTranslation } from 'react-i18next';
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
import { InputFechaHoraProtocolo } from './ComplexUiBlocks.jsx';

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
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const selectStyles = useMemo(() => getComplexSelectStyles(isDark), [isDark]);
  const sinAsignar = t('complex.ui.datos_generales.sin_asignar');

  const labelResponsable =
    responsables?.find(
      (r) =>
        String(r.value) === String(formData.codiRespnsble) ||
        String(r.codiRespnsble) === String(formData.codiRespnsble)
    )?.label ||
    formData.nombreResponsable ||
    formData.codiRespnsble ||
    sinAsignar;

  const labelCliente =
    aseguradoraOptions?.find(
      (a) =>
        String(a.value) === String(formData.codiAsgrdra) ||
        String(a.codiAsgrdra) === String(formData.codiAsgrdra)
    )?.label ||
    formData.nombreAseguradora ||
    formData.codiAsgrdra ||
    sinAsignar;

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
    [formData, estados]
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
      <h2 className={complexSectionTitle}>{t("complex.ui.datos_generales.datos_generales_del_caso")}</h2>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Campo label={t("complex.ui.datos_generales.responsable")}>
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
                <option value="">{t("complex.ui.datos_generales.seleccionar")}</option>
                {(responsables || []).map((responsable) => (
                  <option key={responsable.value} value={responsable.value}>
                    {responsable.label}
                  </option>
                ))}
              </SelectFenix>
              {!hayResponsables && (
                <p className={complexAlertError}>{t("complex.ui.datos_generales.no_hay_responsables_disponibles")}</p>
              )}
            </>
          )}
        </Campo>

        <Campo label={t("complex.ui.datos_generales.cliente")}>
          {camposFijos ? (
            <ValorFijo>{labelCliente}</ValorFijo>
          ) : (
            <SelectFenix
              name="codiAsgrdra"
              value={formData.codiAsgrdra || ''}
              onChange={handleAseguradoraChange}
              required
            >
              <option value="">{t("complex.ui.datos_generales.seleccione_un_cliente")}</option>
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
              <>{t("complex.ui.datos_generales.funcionario_aseguradora")}{cargandoFuncionarios && (
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
                  ? t('complex.ui.datos_generales.cargando_funcionarios')
                  : funcionarios.length === 0
                    ? t('complex.ui.datos_generales.no_hay_funcionarios_disponibles_para_este_cliente')
                    : t('complex.ui.datos_generales.seleccione_un_funcionario')}
              </option>
              {(funcionarios || []).map((func) => (
                <option key={func.value} value={func.value}>
                  {func.label}
                </option>
              ))}
            </SelectFenix>
            {!cargandoFuncionarios && funcionarios.length === 0 && formData.codiAsgrdra && (
              <p className={complexHint}>{t("complex.ui.datos_generales.no_hay_funcionarios_disponibles_para_este_cliente")}</p>
            )}
          </Campo>
        )}

        <Campo label={t("complex.ui.datos_generales.numero_de_siniestro")}>
          <InputFenix
            type="text"
            name="nmroSinstro"
            value={formData.nmroSinstro || ''}
            onChange={handleChange}
            required
          />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.codigo_workflow")}>
          <InputFenix
            type="text"
            name="codWorkflow"
            value={formData.codWorkflow || ''}
            onChange={handleChange}
          />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.intermediario")} className="md:col-span-2">
          <SelectFenix
            name="nombIntermediario"
            value={formData.nombIntermediario || ''}
            onChange={handleChange}
          >
            <option value="">{t("complex.ui.datos_generales.selecciona_un_intermediario")}</option>
            {intermediariosSelect.map((nombre, index) => (
              <option key={index} value={nombre}>
                {nombre}
              </option>
            ))}
          </SelectFenix>
          <p className={complexHint}>{t("complex.ui.datos_generales.para_agregar_un_nuevo_intermediario_ve_a")}{' '}
            <a
              href="/admin/intermediarios"
              className={complexLink}
              target="_blank"
              rel="noopener noreferrer"
            >{t("complex.ui.datos_generales.administracion_intermediarios")}</a>
          </p>
        </Campo>

        <Campo label={t("complex.ui.datos_generales.numero_de_poliza")}>
          <InputFenix type="text" name="nmroPolza" value={formData.nmroPolza || ''} onChange={handleChange} />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.asegurado_o_beneficiario")}>
          <InputFenix
            type="text"
            name="asgrBenfcro"
            value={formData.asgrBenfcro || ''}
            onChange={handleChange}
            required
          />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.tipo_de_documento")}>
          <SelectFenix
            name="tipoDucumento"
            value={tipoDocumentoSelect}
            onChange={handleChange}
            required
          >
            <option value="">{t("complex.ui.datos_generales.selecciona_un_tipo")}</option>
            <option value="CC">{t("complex.ui.datos_generales.cedula_de_ciudadania_cc")}</option>
            <option value="CE">{t("complex.ui.datos_generales.cedula_de_extranjeria_ce")}</option>
            <option value="NIT">{t("complex.ui.datos_generales.nit")}</option>
            <option value="PASAPORTE">{t("complex.ui.datos_generales.pasaporte")}</option>
            <option value="PEP">{t("complex.ui.datos_generales.permiso_especial_de_permanencia_pep")}</option>
            <option value="RC">{t("complex.ui.datos_generales.registro_civil_rc")}</option>
            <option value="TI">{t("complex.ui.datos_generales.tarjeta_de_identidad_ti")}</option>
            <option value="OTRO">{t("complex.ui.datos_generales.otro")}</option>
          </SelectFenix>
        </Campo>

        <Campo label={t("complex.ui.datos_generales.numero_de_documento")}>
          <InputFenix
            type="text"
            name="numDocumento"
            value={formData.numDocumento || ''}
            onChange={handleChange}
            required
          />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.fecha_y_hora_de_asignacion")}>
          <InputFechaHoraProtocolo
            name="fchaAsgncion"
            value={formData.fchaAsgncion || ''}
            onChange={handleChange}
            hint={t("complex.ui.datos_generales.incluya_la_hora_de_recepcion_para_medir_plazos_del_proto")}
          />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.fecha_del_siniestro")}>
          <InputFenix
            type="date"
            name="fchaSinstro"
            value={formData.fchaSinstro || ''}
            onChange={handleChange}
          />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.ciudad_del_siniestro")} className="md:col-span-2">
          <Select
            options={municipios}
            value={resolverCiudadSelect(formData, municipios)}
            onChange={handleCiudadChange}
            placeholder={t("complex.ui.datos_generales.selecciona_una_ciudad")}
            isSearchable
            isLoading={cargandoMunicipios && municipios.length === 0}
            isDisabled={cargandoMunicipios && municipios.length === 0}
            className="w-full"
            styles={selectStyles}
          />
          {cargandoMunicipios && municipios.length === 0 && (
            <p className={complexHint}>{t("complex.ui.datos_generales.cargando_ciudades")}</p>
          )}
          {ciudadNoEnLista && (
            <p className={complexAlertWarn}>{t("complex.ui.datos_generales.ciudad_guardada")}{formData.ciudadSiniestro}{t("complex.ui.datos_generales.verifica_que_coincida_con_las_opciones_disponibles")}</p>
          )}
        </Campo>

        <Campo label={t("complex.ui.datos_generales.tipo_de_poliza")}>
          <InputFenix type="text" name="tipoPoliza" value={formData.tipoPoliza || ''} onChange={handleChange} />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.causa_del_siniestro")}>
          <InputFenix
            type="text"
            name="causa_siniestro"
            value={formData.causa_siniestro || ''}
            onChange={handleChange}
          />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.estado")}>
          <SelectFenix name="estado" value={valorEstadoSelect} onChange={handleChange} required>
            <option value="">{t("complex.ui.datos_generales.selecciona_un_estado")}</option>
            {(estados || [])
              .filter((e) => e.value !== undefined && e.value !== null)
              .map((estado) => (
                <option key={`estado-${estado.value}`} value={estado.value}>
                  {estado.label}
                </option>
              ))}
          </SelectFenix>
          {(!estados || estados.length === 0) && (
            <p className={complexAlertError}>{t("complex.ui.datos_generales.no_hay_estados_disponibles")}</p>
          )}
        </Campo>

        <Campo label={t("complex.ui.datos_generales.descripcion_del_estado")} className="md:col-span-2">
          <TextareaFenix
            name="descripcionEstado"
            value={formData.descripcionEstado || ''}
            onChange={handleChange}
            rows={3}
            placeholder={t("complex.ui.datos_generales.describe_el_estado_del_caso")}
          />
        </Campo>

        <Campo label={t("complex.ui.datos_generales.descripcion_del_siniestro")} className="md:col-span-2">
          <TextareaFenix
            name="descSinstro"
            value={formData.descSinstro || ''}
            onChange={handleChange}
            rows={4}
            placeholder={t("complex.ui.datos_generales.describe_brevemente_el_siniestro")}
          />
        </Campo>
      </div>
    </div>
  );
}
