import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../config/apiConfig';
import { FaPlus, FaEdit, FaTrash, FaUserTie, FaSave, FaTimes } from 'react-icons/fa';
import SelectBuscable from './SelectBuscable.jsx';

const vacioForm = () => ({
  codigo: '',
  nombre: '',
  email: '',
  telefono: '',
  ciudad: '',
});

/**
 * CRUD admin genérico para catálogos catastróficos con ciudad.
 * @param {{ apiPath: string, i18nNs: string, permitirImportarResponsables?: boolean }} props
 */
export default function GestionCatalogoCatastrofico({
  apiPath,
  i18nNs,
  permitirImportarResponsables = false,
}) {
  const { t } = useTranslation();
  const tr = (key, opts) => t(`${i18nNs}.${key}`, opts);

  const [items, setItems] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vacioForm());
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [mostrarImport, setMostrarImport] = useState(false);
  const [ciudadImport, setCiudadImport] = useState('');
  const [importando, setImportando] = useState(false);

  const usuarioActual = {
    rol: localStorage.getItem('rol'),
  };
  const esAdminOSoporte = usuarioActual.rol === 'admin' || usuarioActual.rol === 'soporte';

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const [resItems, resCiudades] = await Promise.all([
        fetch(`${BASE_URL}${apiPath}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/ciudades`),
      ]);

      if (!resItems.ok) throw new Error(t(`${i18nNs}.loadError`));
      const dataItems = await resItems.json().catch(() => ({}));
      const lista = Array.isArray(dataItems?.data)
        ? dataItems.data
        : Array.isArray(dataItems)
          ? dataItems
          : [];
      setItems(lista);

      const dataCiudades = await resCiudades.json().catch(() => ({}));
      const raw = Array.isArray(dataCiudades?.data)
        ? dataCiudades.data
        : Array.isArray(dataCiudades)
          ? dataCiudades
          : [];
      const unicas = new Map();
      for (const c of raw) {
        const nombre = String(c.descMunicipio || c.label || c.nombre || c.ciudad || '').trim();
        if (!nombre) continue;
        const key = nombre.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
        if (!unicas.has(key)) unicas.set(key, nombre);
      }
      setCiudades(['Todas', ...[...unicas.values()].sort((a, b) => a.localeCompare(b, 'es'))]);
    } catch (err) {
      console.error('Error cargando catálogo catastrófico:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiPath, i18nNs, t]);

  useEffect(() => {
    if (esAdminOSoporte) cargarDatos();
  }, [esAdminOSoporte, cargarDatos]);

  const itemsFiltrados = useMemo(() => {
    if (!filtroCiudad) return items;
    const target = filtroCiudad
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toUpperCase();
    return items.filter((it) => {
      const c = String(it.ciudad || '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toUpperCase()
        .trim();
      if (!c || c === 'TODAS' || c === 'TODOS') return true;
      return c === target;
    });
  }, [items, filtroCiudad]);

  const opcionesCiudad = useMemo(() => {
    const base = ciudades.map((c) => ({ value: c, label: c }));
    const extras = [];
    for (const valor of [form.ciudad, filtroCiudad, ciudadImport]) {
      const v = String(valor || '').trim();
      if (!v) continue;
      if (!ciudades.includes(v) && !extras.some((e) => e.value === v)) {
        extras.push({ value: v, label: v });
      }
    }
    return [...extras, ...base];
  }, [ciudades, form.ciudad, filtroCiudad, ciudadImport]);

  const abrirForm = (item = null) => {
    if (item) {
      setEditando(item);
      setForm({
        codigo: item.codigo || '',
        nombre: item.nombre || '',
        email: item.email || '',
        telefono: item.telefono || '',
        ciudad: item.ciudad || '',
      });
    } else {
      setEditando(null);
      setForm(vacioForm());
    }
    setMostrarForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.codigo || !form.nombre || !form.ciudad) {
      alert(tr('requiredFields'));
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const url = editando ? `${BASE_URL}${apiPath}/${editando._id}` : `${BASE_URL}${apiPath}`;
      const method = editando ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || tr('saveError'));
      }
      alert(editando ? tr('updated') : tr('created'));
      setMostrarForm(false);
      setEditando(null);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando:', err);
      setError(err.message);
      alert(tr('errorPrefix', { message: err.message }));
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm(tr('confirmDelete'))) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}${apiPath}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || tr('deleteError'));
      }
      alert(tr('deleted'));
      cargarDatos();
    } catch (err) {
      console.error('Error eliminando:', err);
      alert(tr('errorPrefix', { message: err.message }));
    }
  };

  const importarDesdeResponsables = async () => {
    if (!ciudadImport.trim()) {
      alert(tr('importCityRequired', { defaultValue: 'Seleccione la ciudad para la copia.' }));
      return;
    }
    setImportando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/responsables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const lista = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const ciudad = ciudadImport.trim();
      const slug = ciudad
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24);
      let creados = 0;
      let omitidos = 0;
      for (const r of lista) {
        const codigoBase = String(r.codiRespnsble ?? r.codigo ?? '').trim() || String(r._id || '').slice(-6);
        const nombre = String(r.nmbrRespnsble || r.nombre || '').trim();
        if (!codigoBase || !nombre) {
          omitidos += 1;
          continue;
        }
        const codigo = `${codigoBase}-${slug}`;
        const yaExiste = items.some(
          (it) =>
            String(it.codigo) === codigo ||
            (String(it.nombre).toLowerCase() === nombre.toLowerCase() &&
              String(it.ciudad).toLowerCase() === ciudad.toLowerCase())
        );
        if (yaExiste) {
          omitidos += 1;
          continue;
        }
        const response = await fetch(`${BASE_URL}${apiPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            codigo,
            nombre,
            email: r.email || '',
            telefono: r.telefono || '',
            ciudad,
          }),
        });
        if (response.ok) creados += 1;
        else omitidos += 1;
      }
      alert(
        tr('importResult', {
          defaultValue: `Copia desde Responsables: ${creados} creados, ${omitidos} omitidos (ciudad: ${ciudad}).`,
          created: creados,
          skipped: omitidos,
          city: ciudad,
        })
      );
      setMostrarImport(false);
      setCiudadImport('');
      cargarDatos();
    } catch (err) {
      console.error('Error importando responsables:', err);
      alert(tr('errorPrefix', { message: err.message }));
    } finally {
      setImportando(false);
    }
  };

  if (!esAdminOSoporte) {
    return (
      <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F5F5F7' }}>
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-fenix shadow-lg border p-6"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}
          >
            <h2 className="text-xl font-bold mb-2 font-heading" style={{ color: '#DC2626' }}>
              {tr('accessDeniedTitle')}
            </h2>
            <p className="font-body" style={{ color: '#1C1C1C' }}>
              {tr('accessDeniedMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="min-h-screen p-4 sm:p-6 flex items-center justify-center"
        style={{ backgroundColor: '#fbf3e6' }}
      >
        <div className="text-2xl font-heading" style={{ color: '#1C1C1C' }}>
          {tr('loading')}
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full border rounded-fenix shadow-sm p-2.5 focus:outline-none focus:ring-2 font-body';
  const selectCiudadBtnCls =
    'w-full border rounded-fenix shadow-sm p-2.5 bg-white text-sm font-body focus:outline-none focus:ring-2';

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#fbf3e6' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-heading" style={{ color: '#1C1C1C' }}>
              {tr('title')}
            </h1>
            <p className="mt-1 font-body text-sm" style={{ color: '#6B7280' }}>
              {tr('subtitle', {
                defaultValue:
                  'Catálogo exclusivo catastrófico. Asigne ciudad (Cali, Pereira, etc.) para filtrar en Alfa/Sura.',
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {permitirImportarResponsables ? (
              <button
                type="button"
                onClick={() => setMostrarImport(true)}
                className="px-4 py-2.5 rounded-fenix hover:shadow-md transition-all duration-200 flex items-center gap-2 font-body font-medium"
                style={{
                  background: '#FFFFFF',
                  color: '#1E1E1E',
                  border: '1px solid #DDDDDD',
                }}
              >
                {tr('importFromResponsables', { defaultValue: 'Copiar desde Responsables' })}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => abrirForm()}
              className="px-4 py-2.5 rounded-fenix hover:shadow-md transition-all duration-200 flex items-center gap-2 font-body font-medium"
              style={{
                background: 'rgba(220, 38, 38, 0.1)',
                color: '#1E1E1E',
                border: '1px solid rgba(220, 38, 38, 0.3)',
              }}
            >
              <FaPlus /> {tr('newItem')}
            </button>
          </div>
        </div>

        <div className="mb-4 max-w-xs">
          <label className="block text-sm font-semibold mb-1 font-heading" style={{ color: '#1C1C1C' }}>
            {tr('filterCity')}
          </label>
          <SelectBuscable
            options={opcionesCiudad}
            value={filtroCiudad}
            onChange={setFiltroCiudad}
            placeholder={tr('allCities')}
            emptyLabel={tr('allCities')}
            searchPlaceholder={t('common.searchEllipsis', { defaultValue: 'Buscar…' })}
            buttonClassName={selectCiudadBtnCls}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-fenix p-4 mb-4">
            <p className="text-red-700 font-body">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {itemsFiltrados.length === 0 ? (
            <div className="col-span-full">
              <div
                className="rounded-fenix shadow-lg border p-8 text-center"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}
              >
                <p className="font-body" style={{ color: '#1C1C1C' }}>
                  {tr('empty')}
                </p>
              </div>
            </div>
          ) : (
            itemsFiltrados.map((item) => (
              <div
                key={item._id}
                className="border rounded-fenix shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}
              >
                <div className="flex flex-col items-center mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-md mb-3"
                    style={{
                      borderWidth: '3px',
                      borderColor: '#DC2626',
                      background: 'rgba(220, 38, 38, 0.1)',
                    }}
                  >
                    <FaUserTie className="text-2xl" style={{ color: '#DC2626' }} />
                  </div>
                  <h2 className="text-xl font-bold mb-1 font-heading text-center" style={{ color: '#1C1C1C' }}>
                    {item.nombre}
                  </h2>
                  <span className="text-sm font-body" style={{ color: '#6B7280' }}>
                    ({item.codigo})
                  </span>
                  <div className="w-full space-y-2 mt-3 text-sm font-body" style={{ color: '#1C1C1C' }}>
                    <div>
                      <span style={{ color: '#DC2626' }}>📍 </span>
                      {item.ciudad}
                    </div>
                    {item.email ? (
                      <div className="truncate">
                        <span style={{ color: '#DC2626' }}>📧 </span>
                        {item.email}
                      </div>
                    ) : null}
                    {item.telefono ? (
                      <div>
                        <span style={{ color: '#DC2626' }}>📞 </span>
                        {item.telefono}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#DDDDDD' }}>
                  <button
                    type="button"
                    onClick={() => abrirForm(item)}
                    className="flex-1 px-3 py-2 rounded-fenix flex items-center justify-center gap-2 font-body"
                    style={{
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#1E1E1E',
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                    }}
                  >
                    <FaEdit /> {tr('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(item._id)}
                    className="px-3 py-2 rounded-fenix flex items-center justify-center font-body"
                    style={{
                      backgroundColor: 'rgba(220, 38, 38, 0.1)',
                      color: '#1E1E1E',
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {mostrarForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="rounded-fenix shadow-2xl p-6 w-full max-w-md relative border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}
            >
              <h2 className="text-2xl font-bold mb-6 font-heading" style={{ color: '#1C1C1C' }}>
                {editando ? tr('editTitle') : tr('newTitle')}
              </h2>
              <form onSubmit={guardar} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 font-heading" style={{ color: '#1C1C1C' }}>
                    {tr('codeRequired')}
                  </label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    className={inputCls}
                    style={{ borderColor: '#DDDDDD' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 font-heading" style={{ color: '#1C1C1C' }}>
                    {tr('nameRequired')}
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className={inputCls}
                    style={{ borderColor: '#DDDDDD' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 font-heading" style={{ color: '#1C1C1C' }}>
                    {tr('cityRequired')}
                  </label>
                  <SelectBuscable
                    options={opcionesCiudad}
                    value={form.ciudad}
                    onChange={(val) => setForm({ ...form, ciudad: val })}
                    placeholder={t('common.select')}
                    searchPlaceholder={t('common.searchEllipsis', { defaultValue: 'Buscar ciudad…' })}
                    buttonClassName={selectCiudadBtnCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 font-heading" style={{ color: '#1C1C1C' }}>
                    {tr('email')}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputCls}
                    style={{ borderColor: '#DDDDDD' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 font-heading" style={{ color: '#1C1C1C' }}>
                    {tr('phone')}
                  </label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className={inputCls}
                    style={{ borderColor: '#DDDDDD' }}
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarForm(false);
                      setEditando(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border rounded-fenix text-sm font-medium font-body"
                    style={{ borderColor: '#DDDDDD', color: '#1C1C1C' }}
                  >
                    <FaTimes /> {tr('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 rounded-fenix text-sm font-medium font-body"
                    style={{
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#1E1E1E',
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                    }}
                  >
                    <FaSave /> {editando ? tr('update') : tr('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mostrarImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className="rounded-fenix shadow-2xl p-6 w-full max-w-md relative border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}
            >
              <h2 className="text-2xl font-bold mb-3 font-heading" style={{ color: '#1C1C1C' }}>
                {tr('importTitle', { defaultValue: 'Copiar desde Responsables' })}
              </h2>
              <p className="mb-4 font-body text-sm" style={{ color: '#6B7280' }}>
                {tr('importHint', {
                  defaultValue:
                    'Copia la base actual de Responsables a este catálogo catastrófico. Debe indicar la ciudad de cobertura (ej. Cali o Pereira).',
                })}
              </p>
              <label className="block text-sm font-semibold mb-2 font-heading" style={{ color: '#1C1C1C' }}>
                {tr('cityRequired')}
              </label>
              <SelectBuscable
                options={opcionesCiudad}
                value={ciudadImport}
                onChange={setCiudadImport}
                placeholder={t('common.select')}
                searchPlaceholder={t('common.searchEllipsis', { defaultValue: 'Buscar ciudad…' })}
                buttonClassName={selectCiudadBtnCls}
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarImport(false);
                    setCiudadImport('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 border rounded-fenix text-sm font-medium font-body"
                  style={{ borderColor: '#DDDDDD', color: '#1C1C1C' }}
                  disabled={importando}
                >
                  <FaTimes /> {tr('cancel')}
                </button>
                <button
                  type="button"
                  onClick={importarDesdeResponsables}
                  disabled={importando}
                  className="flex items-center gap-2 px-4 py-2 rounded-fenix text-sm font-medium font-body"
                  style={{
                    background: 'rgba(220, 38, 38, 0.1)',
                    color: '#1E1E1E',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                  }}
                >
                  <FaSave />{' '}
                  {importando
                    ? tr('importing', { defaultValue: 'Copiando…' })
                    : tr('importConfirm', { defaultValue: 'Copiar' })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
