import React, { useEffect, useMemo, useState } from 'react';
import {
  FaBuilding,
  FaClipboardList,
  FaMapMarkerAlt,
  FaSave,
  FaUndo,
  FaUser,
} from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  crearCasoPropiedades,
  actualizarCasoPropiedades,
} from '../../services/propiedadesService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressCardHeader,
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
import { PropiedadesPageHeader } from './PropiedadesUiBlocks.jsx';
import {
  CLASES_INMUEBLE,
  CLASES_TIPOS_INMUEBLE,
  fechaParaInput,
} from './propiedadesHelpers.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

const FORM_VACIO = {
  nombreCliente: '',
  documento: '',
  celular: '',
  email: '',
  direccion: '',
  localizacion: '',
  ciudad: '',
  departamento: '',
  claseInmueble: '',
  tipoInmueble: '',
  destinacion: '',
  aseguradora: '',
  poliza: '',
  numeroSiniestro: '',
  numeroCaso: '',
  responsable: '',
  fechaSolicitud: '',
  observaciones: '',
};

const ordenarPorLabel = (lista) =>
  [...lista].sort((a, b) =>
    String(a.label || '').localeCompare(String(b.label || ''), 'es', { sensitivity: 'base' })
  );

const construirFormDesdeCaso = (caso = {}) => ({
  ...FORM_VACIO,
  ...Object.fromEntries(
    Object.keys(FORM_VACIO).map((clave) => {
      const valor = caso[clave];
      if (valor === null || valor === undefined) return [clave, ''];
      if (clave === 'fechaSolicitud') return [clave, fechaParaInput(valor)];
      return [clave, String(valor)];
    })
  ),
});

function SeccionCard({ icon: Icon, title, children, hint }) {
  return (
    <section className={expressCard}>
      <div className={`${expressCardHeader} !py-4`}>
        <h3 className={`${expressSectionTitle} !mb-0`}>
          {Icon && <Icon className="text-base text-fenix-primario" aria-hidden />}
          {title}
        </h3>
        {hint && <p className="mt-1 pl-4 font-body text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      <div className={expressCardBody}>{children}</div>
    </section>
  );
}

/**
 * Alta / edición de ficha del cliente (datos básicos).
 * El formulario de inspección se abre desde el reporte.
 */
const FormularioCasoPropiedades = ({ initialData = null, embed = false, onClose, onSaved }) => {
  const { t } = useTranslation();
  const esEdicion = Boolean(initialData?._id);
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO }
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [ciudadesRaw, setCiudadesRaw] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);

  useEffect(() => {
    setForm(initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO });
    setError(null);
    setExito(null);
    // Solo al cambiar de caso: si el padre re-crea el objeto, no se borra lo escrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?._id]);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargandoCatalogos(true);
      try {
        const [resCiudades, resResponsables, resAseguradoras] = await Promise.all([
          fetch(`${BASE_URL}/api/ciudades`),
          fetch(`${BASE_URL}/api/responsables`),
          fetch(`${BASE_URL}/api/clientes`),
        ]);

        const dataCiudades = await resCiudades.json().catch(() => ({}));
        const dataResponsables = await resResponsables.json().catch(() => ({}));
        const dataAseguradoras = await resAseguradoras.json().catch(() => ({}));
        if (cancelado) return;

        const listaCiudades = Array.isArray(dataCiudades?.data)
          ? dataCiudades.data
          : Array.isArray(dataCiudades)
            ? dataCiudades
            : [];
        setCiudadesRaw(
          listaCiudades
            .map((c) => ({
              ciudad: String(c.descMunicipio || c.label || c.nombre || '').trim(),
              departamento: String(c.descDepto || c.departamento || '').trim(),
            }))
            .filter((c) => c.ciudad)
        );

        const listaResp = Array.isArray(dataResponsables?.data)
          ? dataResponsables.data
          : Array.isArray(dataResponsables)
            ? dataResponsables
            : [];
        setResponsables(
          ordenarPorLabel(
            listaResp
              .map((r) => {
                const label = String(r.nmbrRespnsble || r.nombre || r.label || '').trim();
                if (!label) return null;
                return { value: label, label };
              })
              .filter(Boolean)
          )
        );

        const listaAseg = Array.isArray(dataAseguradoras?.data)
          ? dataAseguradoras.data
          : Array.isArray(dataAseguradoras)
            ? dataAseguradoras
            : [];
        setAseguradoras(
          ordenarPorLabel(
            listaAseg
              .map((a) => {
                const label = String(a.rzonSocial || a.nombre || a.label || '').trim();
                if (!label) return null;
                return { value: label, label };
              })
              .filter(Boolean)
          )
        );
      } catch (err) {
        if (!cancelado) {
          console.error('Error cargando catálogos Propiedades:', err);
        }
      } finally {
        if (!cancelado) setCargandoCatalogos(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  const departamentos = useMemo(() => {
    const set = new Map();
    for (const c of ciudadesRaw) {
      if (!c.departamento) continue;
      const key = c.departamento.toUpperCase();
      if (!set.has(key)) set.set(key, c.departamento);
    }
    return [...set.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [ciudadesRaw]);

  const ciudadesFiltradas = useMemo(() => {
    const depto = String(form.departamento || '').trim().toUpperCase();
    const lista = depto
      ? ciudadesRaw.filter((c) => c.departamento.toUpperCase() === depto)
      : ciudadesRaw;
    const unicas = new Map();
    for (const c of lista) {
      const key = c.ciudad.toUpperCase();
      if (!unicas.has(key)) unicas.set(key, c.ciudad);
    }
    return [...unicas.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [ciudadesRaw, form.departamento]);

  const setCampo = (clave) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => {
      const siguiente = { ...prev, [clave]: valor };

      if (clave === 'claseInmueble') {
        const tipos = CLASES_TIPOS_INMUEBLE[valor] || [];
        if (!tipos.includes(siguiente.tipoInmueble)) siguiente.tipoInmueble = '';
      }

      if (clave === 'departamento') {
        const deptoNorm = String(valor || '').trim().toUpperCase();
        const ciudadActual = ciudadesRaw.find(
          (c) =>
            c.ciudad.toUpperCase() === String(prev.ciudad || '').toUpperCase() &&
            c.departamento.toUpperCase() === deptoNorm
        );
        if (!ciudadActual) siguiente.ciudad = '';
      }

      if (clave === 'ciudad') {
        const match = ciudadesRaw.find(
          (c) => c.ciudad.toUpperCase() === String(valor || '').toUpperCase()
        );
        if (match?.departamento) siguiente.departamento = match.departamento;
      }

      return siguiente;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!form.nombreCliente.trim()) {
      setError(t('properties.validation.clientNameRequired'));
      return;
    }

    setGuardando(true);
    try {
      let guardado;
      if (esEdicion) {
        guardado = await actualizarCasoPropiedades(initialData._id, form);
      } else {
        guardado = await crearCasoPropiedades(form);
      }
      setExito(
        esEdicion
          ? t('properties.messages.caseUpdated', { caseNumber: guardado.consecutivo || '' })
          : t('properties.messages.caseCreated', { caseNumber: guardado.consecutivo || '' })
      );
      if (!esEdicion) setForm({ ...FORM_VACIO });
      if (onSaved) await onSaved(guardado);
    } catch (err) {
      console.error('Error guardando caso Propiedades:', err);
      setError(err.message || t('properties.messages.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setForm(initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO });
    setError(null);
    setExito(null);
  };

  const tiposDisponibles = form.claseInmueble
    ? CLASES_TIPOS_INMUEBLE[form.claseInmueble] || []
    : [];

  const opcionHuerfana = (valor, opciones) => {
    if (!valor) return null;
    const existe = opciones.some(
      (o) => String(o).toUpperCase() === String(valor).toUpperCase() ||
        String(o.value || o).toUpperCase() === String(valor).toUpperCase()
    );
    return existe ? null : valor;
  };

  const contenido = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      {(esEdicion && initialData?.consecutivo) || cargandoCatalogos ? (
        <div className="flex flex-wrap items-center gap-3">
          {esEdicion && initialData?.consecutivo && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 font-body text-xs font-semibold text-fenix-primario dark:bg-red-950/40">
              {initialData.consecutivo}
            </span>
          )}
          {cargandoCatalogos && (
            <span className="font-body text-xs text-gray-500">{t('properties.loadingLists')}</span>
          )}
        </div>
      ) : null}

      <SeccionCard
        icon={FaUser}
        title={t('properties.sections.clientData')}
        hint={t('properties.hints.clientData')}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Campo label={t('properties.fields.clientOrPropertyName')} required className="md:col-span-2 xl:col-span-1">
            <InputFenix
              value={form.nombreCliente}
              onChange={setCampo('nombreCliente')}
              placeholder={t('properties.placeholders.clientName')}
              autoComplete="organization"
            />
          </Campo>
          <Campo label={t('properties.fields.document')}>
            <InputFenix
              value={form.documento}
              onChange={setCampo('documento')}
              placeholder={t('properties.placeholders.document')}
            />
          </Campo>
          <Campo label={t('properties.fields.mobile')}>
            <InputFenix
              value={form.celular}
              onChange={setCampo('celular')}
              placeholder="300 000 0000"
              inputMode="tel"
            />
          </Campo>
          <Campo label={t('properties.fields.email')}>
            <InputFenix
              type="email"
              value={form.email}
              onChange={setCampo('email')}
              placeholder={t('properties.placeholders.email')}
            />
          </Campo>
          <Campo label={t('properties.fields.visitRecipient')}>
            <InputFenix
              value={form.destinacion}
              onChange={setCampo('destinacion')}
              placeholder={t('properties.placeholders.visitRecipient')}
            />
          </Campo>
          <Campo label={t('properties.fields.responsibleAdjuster')}>
            <SelectFenix
              value={form.responsable}
              onChange={setCampo('responsable')}
              disabled={cargandoCatalogos && responsables.length === 0}
            >
              <option value="">{t('common.select')}</option>
              {opcionHuerfana(form.responsable, responsables) && (
                <option value={form.responsable}>{form.responsable}</option>
              )}
              {responsables.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </SelectFenix>
          </Campo>
        </div>
      </SeccionCard>

      <SeccionCard
        icon={FaMapMarkerAlt}
        title={t('properties.sections.location')}
        hint={t('properties.hints.location')}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Campo label={t('properties.fields.address')} className="md:col-span-2">
            <InputFenix
              value={form.direccion}
              onChange={setCampo('direccion')}
              placeholder={t('properties.placeholders.address')}
            />
          </Campo>
          <Campo label={t('properties.fields.location')}>
            <InputFenix
              value={form.localizacion}
              onChange={setCampo('localizacion')}
              placeholder={t('properties.placeholders.location')}
            />
          </Campo>
          <Campo label={t('properties.fields.department')}>
            <SelectFenix
              value={form.departamento}
              onChange={setCampo('departamento')}
              disabled={cargandoCatalogos && departamentos.length === 0}
            >
              <option value="">{t('common.select')}</option>
              {opcionHuerfana(form.departamento, departamentos) && (
                <option value={form.departamento}>{form.departamento}</option>
              )}
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('properties.fields.city')}>
            <SelectFenix
              value={form.ciudad}
              onChange={setCampo('ciudad')}
              disabled={cargandoCatalogos && ciudadesFiltradas.length === 0}
            >
              <option value="">
                {form.departamento ? t('properties.placeholders.selectCity') : t('properties.placeholders.allOrSelectCity')}
              </option>
              {opcionHuerfana(form.ciudad, ciudadesFiltradas) && (
                <option value={form.ciudad}>{form.ciudad}</option>
              )}
              {ciudadesFiltradas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('properties.fields.propertyClass')}>
            <SelectFenix value={form.claseInmueble} onChange={setCampo('claseInmueble')}>
              <option value="">{t('common.select')}</option>
              {CLASES_INMUEBLE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('properties.fields.propertyType')}>
            <SelectFenix
              value={form.tipoInmueble}
              onChange={setCampo('tipoInmueble')}
              disabled={!form.claseInmueble}
            >
              <option value="">
                {form.claseInmueble ? t('common.select') : t('properties.placeholders.selectClassFirst')}
              </option>
              {tiposDisponibles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </SelectFenix>
          </Campo>
        </div>
      </SeccionCard>

      <SeccionCard
        icon={FaBuilding}
        title={t('properties.sections.policyReference')}
        hint={t('properties.hints.policyReference')}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Campo label={t('properties.fields.insurer')}>
            <SelectFenix
              value={form.aseguradora}
              onChange={setCampo('aseguradora')}
              disabled={cargandoCatalogos && aseguradoras.length === 0}
            >
              <option value="">{t('common.select')}</option>
              {opcionHuerfana(form.aseguradora, aseguradoras) && (
                <option value={form.aseguradora}>{form.aseguradora}</option>
              )}
              {aseguradoras.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('properties.fields.policy')}>
            <InputFenix value={form.poliza} onChange={setCampo('poliza')} placeholder={t('properties.placeholders.policyNumber')} />
          </Campo>
          <Campo label={t('properties.fields.claimNumber')}>
            <InputFenix
              value={form.numeroSiniestro}
              onChange={setCampo('numeroSiniestro')}
              placeholder={t('properties.placeholders.claimNumber')}
            />
          </Campo>
          <Campo label={t('properties.fields.caseNumber')}>
            <InputFenix
              value={form.numeroCaso}
              onChange={setCampo('numeroCaso')}
              placeholder={t('properties.placeholders.caseNumber')}
            />
          </Campo>
          <Campo label={t('properties.fields.requestDate')}>
            <InputFenix
              type="date"
              value={form.fechaSolicitud}
              onChange={setCampo('fechaSolicitud')}
            />
          </Campo>
        </div>
      </SeccionCard>

      <SeccionCard icon={FaClipboardList} title={t('properties.sections.observations')}>
        <Campo label={t('properties.fields.caseNotes')}>
          <TextareaFenix
            value={form.observaciones}
            onChange={setCampo('observaciones')}
            rows={4}
            placeholder={t('properties.placeholders.caseNotes')}
          />
        </Campo>
      </SeccionCard>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave className="mr-2" />
          {guardando ? t('properties.actions.saving') : esEdicion ? t('properties.actions.updateCase') : t('properties.actions.createCase')}
        </button>
        <button type="button" className={expressBtnGhost} onClick={limpiar} disabled={guardando}>
          <FaUndo className="mr-2" />
          {t('properties.actions.clear')}
        </button>
        {embed && onClose && (
          <button type="button" className={expressBtnGhost} onClick={onClose} disabled={guardando}>
          {t('common.close')}
          </button>
        )}
      </div>
    </form>
  );

  if (embed) return <div className="p-2 sm:p-4">{contenido}</div>;

  return (
    <div className={`${expressScope} ${root}`}>
      <div className={`${expressPageWrap} space-y-6`}>
        <PropiedadesPageHeader
          title={esEdicion ? t('properties.page.editCase') : t('properties.page.newCase')}
          subtitle={t('properties.page.subtitle')}
          activePath="/propiedades/carga"
        />
        {contenido}
      </div>
    </div>
  );
};

export default FormularioCasoPropiedades;
