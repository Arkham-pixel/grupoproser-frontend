import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import ciudadesData from '../../data/colombia.json';
import { BASE_URL } from '../../config/apiConfig.js';
import SelectorDepartamentoCiudad from '../shared/SelectorDepartamentoCiudad.jsx';
import {
  mapearCiudadesDesdeColombiaJson,
  mapearCiudadesDesdeApi,
  extraerListaCiudadesApi,
  aplicarCambioDepartamento,
  coincidirCiudadExacta,
} from '../../utils/ciudadesColombia.js';

function textoCiudadSiniestro(valor) {
  if (!valor) return '';
  if (typeof valor === 'object') return String(valor.value || valor.label || '').trim();
  return String(valor).trim();
}

export default function DatosGeneralesPuertos({ formData, onInputChange, onMultipleChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [ciudadesRaw, setCiudadesRaw] = useState(() =>
    mapearCiudadesDesdeColombiaJson(ciudadesData)
  );
  const [cargandoCiudades, setCargandoCiudades] = useState(false);

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  useEffect(() => {
    let cancelado = false;
    const fallback = () => mapearCiudadesDesdeColombiaJson(ciudadesData);
    const cargar = async () => {
      setCargandoCiudades(true);
      try {
        if (!BASE_URL) throw new Error('sin BASE_URL');
        const res = await fetch(`${BASE_URL}/api/ciudades`);
        if (!res.ok) throw new Error('ciudades');
        const data = await res.json();
        const lista = mapearCiudadesDesdeApi(extraerListaCiudadesApi(data));
        if (!cancelado) setCiudadesRaw(lista.length ? lista : fallback());
      } catch {
        if (!cancelado) setCiudadesRaw(fallback());
      } finally {
        if (!cancelado) setCargandoCiudades(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const ciudad = textoCiudadSiniestro(formData.ciudad_siniestro);
    if (!ciudad || !ciudadesRaw.length) return;
    const depto = formData.departamento_siniestro || '';
    const match = coincidirCiudadExacta(ciudadesRaw, ciudad, depto);
    if (!match) return;
    const needsDepto = !depto && match.departamento;
    const needsNormalize =
      typeof formData.ciudad_siniestro === 'string' ||
      (typeof formData.ciudad_siniestro === 'object' &&
        formData.ciudad_siniestro?.value !== match.ciudad);
    if (!needsDepto && !needsNormalize) return;
    onMultipleChange({
      ciudad_siniestro: { value: match.ciudad, label: match.ciudad },
      departamento_siniestro: match.departamento || depto,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudadesRaw]);

  const ciudadActual = textoCiudadSiniestro(formData.ciudad_siniestro);

  const handleDepartamentoChange = (valor) => {
    const next = aplicarCambioDepartamento(
      {
        departamento_siniestro: formData.departamento_siniestro || '',
        ciudad_siniestro: ciudadActual,
      },
      valor,
      ciudadesRaw,
      {
        departamentoKey: 'departamento_siniestro',
        departamentoCiudadKey: null,
        ciudadKey: 'ciudad_siniestro',
      }
    );
    onMultipleChange({
      departamento_siniestro: next.departamento_siniestro,
      ciudad_siniestro: next.ciudad_siniestro
        ? { value: next.ciudad_siniestro, label: next.ciudad_siniestro }
        : '',
    });
  };

  const handleCiudadChange = (val, meta) => {
    if (!val) {
      onMultipleChange({
        ciudad_siniestro: '',
        departamento_siniestro: formData.departamento_siniestro || '',
      });
      return;
    }
    const ciudad = meta?.ciudad || val;
    onMultipleChange({
      ciudad_siniestro: { value: ciudad, label: meta?.label || ciudad },
      departamento_siniestro: meta?.departamento || formData.departamento_siniestro || '',
    });
  };

  return (
    <div
      className="mt-10 p-6 rounded shadow-sm"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <h2
        className="text-xl font-bold mb-4"
        style={{ color: textPrimary }}
      >
        {t('ports.ui.formulario.datosGenerales.titulo')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.datosGenerales.nombreBuque')}
          </label>
          <input
            type="text"
            placeholder={t('ports.ui.formulario.datosGenerales.nombreBuquePlaceholder')}
            value={formData.nombreMotonave || ''}
            onChange={(e) => onInputChange('nombreMotonave', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.datosGenerales.nombrePuertoEmpresa')}
          </label>
          <input
            type="text"
            placeholder={t('ports.ui.formulario.datosGenerales.nombrePuertoEmpresaPlaceholder')}
            value={formData.nombreEmpresa || ''}
            onChange={(e) => onInputChange('nombreEmpresa', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.datosGenerales.direccion')}
          </label>
          <input
            type="text"
            placeholder={t('ports.ui.formulario.datosGenerales.direccionPlaceholder')}
            value={formData.direccion || ''}
            onChange={(e) => onInputChange('direccion', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectorDepartamentoCiudad
            ciudadesRaw={ciudadesRaw}
            departamento={formData.departamento_siniestro || ''}
            ciudad={ciudadActual}
            onDepartamentoChange={handleDepartamentoChange}
            onCiudadChange={handleCiudadChange}
            cargando={cargandoCiudades}
            disabled={cargando}
            labelDepartamento={t('ports.ui.formulario.datosGenerales.departamento', {
              defaultValue: 'Departamento',
            })}
            labelCiudad={t('ports.ui.formulario.datosGenerales.ciudad')}
            i18nNs="common"
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.datosGenerales.personaEntrevistada')}
          </label>
          <input
            type="text"
            placeholder={t('ports.ui.formulario.datosGenerales.personaEntrevistadaPlaceholder')}
            value={formData.personaEntrevistada || ''}
            onChange={(e) => onInputChange('personaEntrevistada', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.datosGenerales.cargo')}
          </label>
          <input
            type="text"
            placeholder={t('ports.ui.formulario.datosGenerales.cargoPlaceholder')}
            value={formData.cargo || ''}
            onChange={(e) => onInputChange('cargo', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.datosGenerales.horarioLaboral')}
          </label>
          <input
            type="text"
            placeholder={t('ports.ui.formulario.datosGenerales.horarioLaboralPlaceholder')}
            value={formData.horarioLaboral || ''}
            onChange={(e) => onInputChange('horarioLaboral', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.datosGenerales.numeroColaboradores')}
          </label>
          <input
            type="text"
            placeholder={t('ports.ui.formulario.datosGenerales.numeroColaboradoresPlaceholder')}
            value={formData.colaboladores || ''}
            onChange={(e) => onInputChange('colaboladores', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.datosGenerales.aseguradora')}
          </label>
          <input
            type="text"
            placeholder={t('ports.ui.formulario.datosGenerales.aseguradoraPlaceholder')}
            value={formData.aseguradora || ''}
            onChange={(e) => onInputChange('aseguradora', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>
      </div>

      <div className="mt-6">
        <label
          className="block text-sm font-semibold mb-2"
          style={{ color: textPrimary }}
        >
          {t('ports.ui.formulario.datosGenerales.descripcionGeneral')}
        </label>
        <textarea
          rows={6}
          placeholder={t('ports.ui.formulario.datosGenerales.descripcionGeneralPlaceholder')}
          value={formData.descripcionEmpresa || ''}
          onChange={(e) => onInputChange('descripcionEmpresa', e.target.value)}
          className="w-full rounded px-3 py-2"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          disabled={cargando}
        />
      </div>
    </div>
  );
}
