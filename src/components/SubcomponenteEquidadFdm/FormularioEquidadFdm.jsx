import React, { useEffect, useMemo, useState } from 'react';
import { FaSave, FaUndo } from 'react-icons/fa';
import { crearCasoFdm, actualizarCasoFdm } from '../../services/equidadFdmService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressCardHeader,
  expressFormSection,
  expressPageWrap,
  expressScope,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  InputFenix,
  SelectFenix,
  TextareaFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { FdmPageHeader } from './EquidadFdmUiBlocks.jsx';
import { ESTADOS_FDM, fechaParaInput } from './equidadFdmHelpers.js';

const fdmRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

const OPCIONES_SI_NO = ['SI', 'NO'];
const OPCIONES_APLICA = ['APLICA', 'NO APLICA'];

const FORM_VACIO = {
  nombre: '',
  cedula: '',
  celular: '',
  direccionAfectada: '',
  municipio: '',
  tipoNegocio: '',
  polizaDanosVigente: '',
  polizaAfectar: '',
  orden: '',
  vigenciaPoliza: '',
  afectacionesAnteriores: '',
  siniestroIndemnizado: '',
  primas: '',
  subsidioEmpresarial: '',
  cobertura: '',
  ajustador: '',
  aif: '',
  caso: '',
  siniestro: '',
  estado: 'PENDIENTE',
  fechaAviso: '',
  fechaLiquidacion: '',
  fechaCausacion: '',
  fechaGiro: '',
  valorEdificio: '',
  valorContenido: '',
  valoresIndemnizables: '',
  perdidaContenidos: '',
  perdidaEdificio: '',
  totalPerdida: '',
  deducible: '',
  totalLiquidado: '',
  subsidio: '',
  valorIndemnizadoAjustador: '',
  valorIndemnizado: '',
  valorObjecion: '',
  observaciones: '',
  detalle: '',
};

const construirFormDesdeCaso = (caso = {}) => ({
  ...FORM_VACIO,
  ...Object.fromEntries(
    Object.keys(FORM_VACIO).map((clave) => {
      const valor = caso[clave];
      if (valor === null || valor === undefined) return [clave, ''];
      if (clave.startsWith('fecha')) return [clave, fechaParaInput(valor)];
      return [clave, String(valor)];
    })
  ),
});

const aNumero = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(String(valor).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? null : n;
};

const FormularioEquidadFdm = ({ initialData = null, embed = false, onClose, onSaved }) => {
  const esEdicion = Boolean(initialData?._id);
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO }
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    setForm(initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO });
    setError(null);
    setExito(null);
  }, [initialData]);

  const setCampo = (clave) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => {
      const siguiente = { ...prev, [clave]: valor };

      // Recalcula totales de pérdida y liquidación al cambiar sus componentes
      if (['perdidaContenidos', 'perdidaEdificio', 'deducible', 'subsidio'].includes(clave)) {
        const contenidos = aNumero(siguiente.perdidaContenidos) ?? 0;
        const edificio = aNumero(siguiente.perdidaEdificio) ?? 0;
        const deducible = aNumero(siguiente.deducible) ?? 0;
        const subsidio = aNumero(siguiente.subsidio) ?? 0;
        const totalPerdida = contenidos + edificio;
        siguiente.totalPerdida = totalPerdida ? String(totalPerdida) : '';
        const totalLiquidado = totalPerdida - deducible + subsidio;
        siguiente.totalLiquidado = totalPerdida ? String(Math.max(0, totalLiquidado)) : '';
      }

      return siguiente;
    });
  };

  const camposNumericos = useMemo(
    () => [
      'valorEdificio',
      'valorContenido',
      'valoresIndemnizables',
      'perdidaContenidos',
      'perdidaEdificio',
      'totalPerdida',
      'deducible',
      'totalLiquidado',
      'subsidio',
      'valorIndemnizadoAjustador',
      'valorIndemnizado',
    ],
    []
  );

  const construirPayload = () => {
    const payload = { ...form };
    camposNumericos.forEach((clave) => {
      payload[clave] = aNumero(payload[clave]);
    });
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!form.nombre.trim()) {
      setError('El nombre del asegurado es obligatorio.');
      return;
    }
    if (!form.estado.trim()) {
      setError('El estado del caso es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      const payload = construirPayload();
      let guardado;
      if (esEdicion) {
        guardado = await actualizarCasoFdm(initialData._id, payload);
      } else {
        guardado = await crearCasoFdm(payload);
      }
      setExito(
        esEdicion
          ? `Caso ${guardado.consecutivo || ''} actualizado correctamente.`
          : `Caso ${guardado.consecutivo || ''} creado correctamente.`
      );
      if (!esEdicion) {
        setForm({ ...FORM_VACIO });
      }
      if (onSaved) await onSaved(guardado);
    } catch (err) {
      console.error('Error guardando caso Equidad FDM:', err);
      setError(err.message || 'No fue posible guardar el caso.');
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setForm(initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO });
    setError(null);
    setExito(null);
  };

  const selectSimple = (clave, opciones, placeholder = 'Seleccione…') => (
    <SelectFenix value={form[clave]} onChange={setCampo(clave)}>
      <option value="">{placeholder}</option>
      {opciones.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
      {form[clave] && !opciones.includes(form[clave]) && (
        <option value={form[clave]}>{form[clave]}</option>
      )}
    </SelectFenix>
  );

  const contenidoFormulario = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>Datos del asegurado</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label="Nombre" required>
            <InputFenix value={form.nombre} onChange={setCampo('nombre')} placeholder="Nombre completo" />
          </Campo>
          <Campo label="Cédula">
            <InputFenix value={form.cedula} onChange={setCampo('cedula')} placeholder="Número de cédula" />
          </Campo>
          <Campo label="Celular">
            <InputFenix value={form.celular} onChange={setCampo('celular')} placeholder="Celular de contacto" />
          </Campo>
          <Campo label="Dirección afectada">
            <InputFenix value={form.direccionAfectada} onChange={setCampo('direccionAfectada')} />
          </Campo>
          <Campo label="Municipio">
            <InputFenix value={form.municipio} onChange={setCampo('municipio')} placeholder="Ej: LORICA" />
          </Campo>
          <Campo label="Tipo de negocio">
            <InputFenix value={form.tipoNegocio} onChange={setCampo('tipoNegocio')} placeholder="Ej: TIENDA DE VÍVERES" />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>Póliza y cobertura</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label="Póliza daños vigente">
            {selectSimple('polizaDanosVigente', OPCIONES_SI_NO)}
          </Campo>
          <Campo label="Póliza a afectar">
            <InputFenix value={form.polizaAfectar} onChange={setCampo('polizaAfectar')} placeholder="Ej: AB003005" />
          </Campo>
          <Campo label="Orden">
            <InputFenix value={form.orden} onChange={setCampo('orden')} />
          </Campo>
          <Campo label="Vigencia póliza">
            <InputFenix
              value={form.vigenciaPoliza}
              onChange={setCampo('vigenciaPoliza')}
              placeholder="dd/mm/aaaa-dd/mm/aaaa"
            />
          </Campo>
          <Campo label="Afectaciones anteriores">
            {selectSimple('afectacionesAnteriores', OPCIONES_SI_NO)}
          </Campo>
          <Campo label="Siniestro indemnizado">
            {selectSimple('siniestroIndemnizado', [...OPCIONES_SI_NO, 'NO APLICA'])}
          </Campo>
          <Campo label="Primas al día">
            {selectSimple('primas', OPCIONES_SI_NO)}
          </Campo>
          <Campo label="Subsidio empresarial">
            {selectSimple('subsidioEmpresarial', OPCIONES_APLICA)}
          </Campo>
          <Campo label="Cobertura">
            <InputFenix value={form.cobertura} onChange={setCampo('cobertura')} placeholder="Ej: ANEGACION" />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>Gestión del caso</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label="Ajustador">
            <InputFenix value={form.ajustador} onChange={setCampo('ajustador')} />
          </Campo>
          <Campo label="AIF (Asesor Integral)">
            <InputFenix value={form.aif} onChange={setCampo('aif')} />
          </Campo>
          <Campo label="Caso">
            <InputFenix value={form.caso} onChange={setCampo('caso')} placeholder="Número de caso" />
          </Campo>
          <Campo label="Siniestro">
            <InputFenix value={form.siniestro} onChange={setCampo('siniestro')} placeholder="Número de siniestro" />
          </Campo>
          <Campo label="Estado" required>
            {selectSimple('estado', ESTADOS_FDM)}
          </Campo>
          <Campo label="Fecha de aviso">
            <InputFenix type="date" value={form.fechaAviso} onChange={setCampo('fechaAviso')} />
          </Campo>
          <Campo label="Fecha de liquidación">
            <InputFenix type="date" value={form.fechaLiquidacion} onChange={setCampo('fechaLiquidacion')} />
          </Campo>
          <Campo label="Fecha de causación">
            <InputFenix type="date" value={form.fechaCausacion} onChange={setCampo('fechaCausacion')} />
          </Campo>
          <Campo label="Fecha de giro">
            <InputFenix type="date" value={form.fechaGiro} onChange={setCampo('fechaGiro')} />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>Valores asegurados y pérdidas</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label="Valor edificio (COP)">
            <InputFenix type="number" min="0" value={form.valorEdificio} onChange={setCampo('valorEdificio')} />
          </Campo>
          <Campo label="Valor contenido (COP)">
            <InputFenix type="number" min="0" value={form.valorContenido} onChange={setCampo('valorContenido')} />
          </Campo>
          <Campo label="Valores indemnizables (COP)">
            <InputFenix
              type="number"
              min="0"
              value={form.valoresIndemnizables}
              onChange={setCampo('valoresIndemnizables')}
            />
          </Campo>
          <Campo label="Pérdida por contenidos (COP)">
            <InputFenix
              type="number"
              min="0"
              value={form.perdidaContenidos}
              onChange={setCampo('perdidaContenidos')}
            />
          </Campo>
          <Campo label="Pérdida por edificio (COP)">
            <InputFenix type="number" min="0" value={form.perdidaEdificio} onChange={setCampo('perdidaEdificio')} />
          </Campo>
          <Campo label="Total pérdida (COP)">
            <InputFenix type="number" min="0" value={form.totalPerdida} onChange={setCampo('totalPerdida')} />
          </Campo>
          <Campo label="Deducible (COP)">
            <InputFenix type="number" min="0" value={form.deducible} onChange={setCampo('deducible')} />
          </Campo>
          <Campo label="Subsidio (COP)">
            <InputFenix type="number" min="0" value={form.subsidio} onChange={setCampo('subsidio')} />
          </Campo>
          <Campo label="Total liquidado (COP)">
            <InputFenix type="number" min="0" value={form.totalLiquidado} onChange={setCampo('totalLiquidado')} />
          </Campo>
          <Campo label="Valor indemnizado ajustador (COP)">
            <InputFenix
              type="number"
              min="0"
              value={form.valorIndemnizadoAjustador}
              onChange={setCampo('valorIndemnizadoAjustador')}
            />
          </Campo>
          <Campo label="Valor indemnizado (COP)">
            <InputFenix
              type="number"
              min="0"
              value={form.valorIndemnizado}
              onChange={setCampo('valorIndemnizado')}
            />
          </Campo>
          <Campo label="Valor / motivo de objeción">
            <InputFenix
              value={form.valorObjecion}
              onChange={setCampo('valorObjecion')}
              placeholder="Valor u observación de la objeción"
            />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>Observaciones</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Campo label="Observaciones">
            <TextareaFenix value={form.observaciones} onChange={setCampo('observaciones')} />
          </Campo>
          <Campo label="Detalle">
            <TextareaFenix value={form.detalle} onChange={setCampo('detalle')} />
          </Campo>
        </div>
      </section>

      <div className="flex flex-col justify-end gap-2 sm:flex-row">
        {embed && onClose && (
          <button type="button" className={expressBtnGhost} onClick={onClose} disabled={guardando}>
            Cerrar
          </button>
        )}
        <button type="button" className={expressBtnGhost} onClick={limpiar} disabled={guardando}>
          <FaUndo />
          {esEdicion ? 'Restablecer' : 'Limpiar'}
        </button>
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave />
          {guardando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Guardar caso'}
        </button>
      </div>
    </form>
  );

  if (embed) {
    return <div className={`${expressScope}`}>{contenidoFormulario}</div>;
  }

  return (
    <div className={`${fdmRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <FdmPageHeader
          title="Agregar caso Equidad FDM"
          subtitle="Registra los casos de Fundación de la Mujer con los datos de póliza, pérdidas y liquidación."
          activePath="/equidad-fdm/carga"
        />
        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {esEdicion ? `Editar caso ${initialData?.consecutivo || ''}` : 'Nuevo caso'}
            </h2>
          </div>
          <div className={expressCardBody}>{contenidoFormulario}</div>
        </section>
      </div>
    </div>
  );
};

export default FormularioEquidadFdm;
