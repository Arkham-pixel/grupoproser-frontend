import React, { useEffect, useMemo, useState } from 'react';
import {
  FaBuilding,
  FaClipboardList,
  FaMapMarkerAlt,
  FaSave,
  FaUndo,
  FaUser,
} from 'react-icons/fa';
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
  }, [initialData]);

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
      setError('El nombre del cliente es obligatorio.');
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
          ? `Caso ${guardado.consecutivo || ''} actualizado correctamente.`
          : `Caso ${guardado.consecutivo || ''} creado correctamente.`
      );
      if (!esEdicion) setForm({ ...FORM_VACIO });
      if (onSaved) await onSaved(guardado);
    } catch (err) {
      console.error('Error guardando caso Propiedades:', err);
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
            <span className="font-body text-xs text-gray-500">Cargando listas…</span>
          )}
        </div>
      ) : null}

      <SeccionCard
        icon={FaUser}
        title="Datos del cliente"
        hint="Información de contacto y quien atiende la visita."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Campo label="Nombre del cliente / inmueble" required className="md:col-span-2 xl:col-span-1">
            <InputFenix
              value={form.nombreCliente}
              onChange={setCampo('nombreCliente')}
              placeholder="Nombre completo o razón social"
              autoComplete="organization"
            />
          </Campo>
          <Campo label="Documento / NIT">
            <InputFenix
              value={form.documento}
              onChange={setCampo('documento')}
              placeholder="Cédula o NIT"
            />
          </Campo>
          <Campo label="Celular">
            <InputFenix
              value={form.celular}
              onChange={setCampo('celular')}
              placeholder="300 000 0000"
              inputMode="tel"
            />
          </Campo>
          <Campo label="Email">
            <InputFenix
              type="email"
              value={form.email}
              onChange={setCampo('email')}
              placeholder="correo@ejemplo.com"
            />
          </Campo>
          <Campo label="Quién recibe la visita">
            <InputFenix
              value={form.destinacion}
              onChange={setCampo('destinacion')}
              placeholder="Nombre de quien recibe"
            />
          </Campo>
          <Campo label="Responsable / ajustador">
            <SelectFenix
              value={form.responsable}
              onChange={setCampo('responsable')}
              disabled={cargandoCatalogos && responsables.length === 0}
            >
              <option value="">Seleccione…</option>
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
        title="Ubicación del inmueble"
        hint="Al elegir la ciudad se completa el departamento automáticamente."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Campo label="Dirección" className="md:col-span-2">
            <InputFenix
              value={form.direccion}
              onChange={setCampo('direccion')}
              placeholder="Calle, carrera, número…"
            />
          </Campo>
          <Campo label="Localización">
            <InputFenix
              value={form.localizacion}
              onChange={setCampo('localizacion')}
              placeholder="Barrio / zona"
            />
          </Campo>
          <Campo label="Departamento">
            <SelectFenix
              value={form.departamento}
              onChange={setCampo('departamento')}
              disabled={cargandoCatalogos && departamentos.length === 0}
            >
              <option value="">Seleccione…</option>
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
          <Campo label="Ciudad">
            <SelectFenix
              value={form.ciudad}
              onChange={setCampo('ciudad')}
              disabled={cargandoCatalogos && ciudadesFiltradas.length === 0}
            >
              <option value="">
                {form.departamento ? 'Seleccione ciudad…' : 'Todas / seleccione ciudad…'}
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
          <Campo label="Clase de inmueble">
            <SelectFenix value={form.claseInmueble} onChange={setCampo('claseInmueble')}>
              <option value="">Seleccione…</option>
              {CLASES_INMUEBLE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label="Tipo de inmueble">
            <SelectFenix
              value={form.tipoInmueble}
              onChange={setCampo('tipoInmueble')}
              disabled={!form.claseInmueble}
            >
              <option value="">
                {form.claseInmueble ? 'Seleccione…' : 'Seleccione primero una clase'}
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
        title="Póliza / referencia"
        hint="Datos de la compañía y referencias del caso."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Campo label="Aseguradora">
            <SelectFenix
              value={form.aseguradora}
              onChange={setCampo('aseguradora')}
              disabled={cargandoCatalogos && aseguradoras.length === 0}
            >
              <option value="">Seleccione…</option>
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
          <Campo label="Póliza">
            <InputFenix value={form.poliza} onChange={setCampo('poliza')} placeholder="Número de póliza" />
          </Campo>
          <Campo label="N° siniestro">
            <InputFenix
              value={form.numeroSiniestro}
              onChange={setCampo('numeroSiniestro')}
              placeholder="Número de siniestro"
            />
          </Campo>
          <Campo label="N° caso">
            <InputFenix
              value={form.numeroCaso}
              onChange={setCampo('numeroCaso')}
              placeholder="Número de caso interno"
            />
          </Campo>
          <Campo label="Fecha de solicitud">
            <InputFenix
              type="date"
              value={form.fechaSolicitud}
              onChange={setCampo('fechaSolicitud')}
            />
          </Campo>
        </div>
      </SeccionCard>

      <SeccionCard icon={FaClipboardList} title="Observaciones">
        <Campo label="Notas del caso">
          <TextareaFenix
            value={form.observaciones}
            onChange={setCampo('observaciones')}
            rows={4}
            placeholder="Observaciones generales del caso…"
          />
        </Campo>
      </SeccionCard>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave className="mr-2" />
          {guardando ? 'Guardando…' : esEdicion ? 'Actualizar caso' : 'Crear caso'}
        </button>
        <button type="button" className={expressBtnGhost} onClick={limpiar} disabled={guardando}>
          <FaUndo className="mr-2" />
          Limpiar
        </button>
        {embed && onClose && (
          <button type="button" className={expressBtnGhost} onClick={onClose} disabled={guardando}>
            Cerrar
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
          title={esEdicion ? 'Editar caso' : 'Nuevo caso'}
          subtitle="Registre los datos del cliente. El formulario de inspección se diligencia desde el reporte."
          activePath="/propiedades/carga"
        />
        {contenido}
      </div>
    </div>
  );
};

export default FormularioCasoPropiedades;
