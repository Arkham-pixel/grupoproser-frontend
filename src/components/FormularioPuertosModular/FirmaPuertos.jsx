import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash, FaUpload } from 'react-icons/fa';
import { getImageUrl, createImageErrorHandler } from '../../utils/imageUtils';

const BANCO_FIRMAS_KEY = 'bancoFirmasPuertos';

function urlFirmaParaMostrar(imagenFirma) {
  if (!imagenFirma) return null;
  return getImageUrl(imagenFirma) || getImageUrl({ ruta: imagenFirma });
}

export default function FirmaPuertos({ formData, onInputChange, onMultipleChange, cargando }) {
  const { theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const fileInputRef = useRef(null);
  const [bancoFirmas, setBancoFirmas] = useState([]);
  const [firmaSeleccionadaId, setFirmaSeleccionadaId] = useState('');

  useEffect(() => {
    try {
      const bancoGuardado = localStorage.getItem(BANCO_FIRMAS_KEY);
      if (bancoGuardado) {
        setBancoFirmas(JSON.parse(bancoGuardado));
      }
    } catch (error) {
      console.error('Error al cargar banco de firmas:', error);
    }
  }, []);

  const guardarEnBanco = (nuevoBanco) => {
    setBancoFirmas(nuevoBanco);
    localStorage.setItem(BANCO_FIRMAS_KEY, JSON.stringify(nuevoBanco));
  };

  const handleCargarFirma = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onMultipleChange({
        imagenFirma: reader.result,
        archivoFirma: file,
      });
      setFirmaSeleccionadaId('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSeleccionFirma = (e) => {
    const id = e.target.value;
    setFirmaSeleccionadaId(id);
    if (!id) return;
    const firma = bancoFirmas.find((f) => String(f.id) === id);
    if (firma) {
      onMultipleChange({
        nombreFirmante: firma.nombre,
        cargoFirmante: firma.cargo || '',
        emailFirmante: firma.email || '',
        celularFirmante: firma.celular || '',
        imagenFirma: firma.firma,
      });
    }
  };

  const handleGuardarEnBanco = () => {
    const { nombreFirmante, cargoFirmante, emailFirmante, celularFirmante, imagenFirma } = formData;

    if (!nombreFirmante?.trim() || !imagenFirma) {
      alert('Complete el nombre y suba la imagen de firma antes de guardar en el banco.');
      return;
    }

    const firmaExistente = bancoFirmas.find(
      (f) => f.nombre?.toLowerCase() === nombreFirmante.trim().toLowerCase()
    );

    if (firmaExistente) {
      if (!confirm(`Ya existe una firma para "${nombreFirmante}". ¿Desea reemplazarla?`)) return;
      const bancoActualizado = bancoFirmas.map((f) =>
        f.id === firmaExistente.id
          ? {
              ...f,
              nombre: nombreFirmante.trim(),
              cargo: cargoFirmante || '',
              email: emailFirmante || '',
              celular: celularFirmante || '',
              firma: imagenFirma,
            }
          : f
      );
      guardarEnBanco(bancoActualizado);
      setFirmaSeleccionadaId(String(firmaExistente.id));
      alert('Firma actualizada en el banco.');
      return;
    }

    const nuevaFirma = {
      id: Date.now(),
      nombre: nombreFirmante.trim(),
      cargo: cargoFirmante || '',
      email: emailFirmante || '',
      celular: celularFirmante || '',
      firma: imagenFirma,
    };

    guardarEnBanco([...bancoFirmas, nuevaFirma]);
    setFirmaSeleccionadaId(String(nuevaFirma.id));
    alert(`Firma de "${nombreFirmante}" guardada en el banco.`);
  };

  const handleEliminarSeleccionada = () => {
    if (!firmaSeleccionadaId) {
      alert('Seleccione una firma del listado para eliminar.');
      return;
    }
    const firma = bancoFirmas.find((f) => String(f.id) === firmaSeleccionadaId);
    if (!firma) return;
    if (!confirm(`¿Eliminar del banco la firma de "${firma.nombre}"?`)) return;
    guardarEnBanco(bancoFirmas.filter((f) => String(f.id) !== firmaSeleccionadaId));
    setFirmaSeleccionadaId('');
  };

  const firmaPreview = firmaSeleccionadaId
    ? bancoFirmas.find((f) => String(f.id) === firmaSeleccionadaId)
    : null;

  const firmaDisplayUrl = useMemo(
    () => urlFirmaParaMostrar(formData.imagenFirma),
    [formData.imagenFirma]
  );

  const firmaBancoDisplayUrl = useMemo(
    () => (firmaPreview?.firma ? urlFirmaParaMostrar(firmaPreview.firma) : null),
    [firmaPreview?.firma]
  );

  const handleErrorFirma = useMemo(
    () => createImageErrorHandler(formData.imagenFirma || { ruta: formData.imagenFirma }),
    [formData.imagenFirma]
  );

  return (
    <div
      className="p-4 rounded mb-6"
      style={{ backgroundColor: cardBg, border: `2px solid ${borderColor}` }}
    >
      <h3 className="text-xl font-bold mb-4" style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}>
        ✍️ FIRMA Y DATOS DEL INSPECTOR
      </h3>

      {/* Banco de firmas — lista desplegable */}
      <div
        className="mb-6 p-4 rounded"
        style={{
          backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
          border: `2px dashed ${theme === 'dark' ? '#2563EB' : '#3B82F6'}`,
        }}
      >
        <label className="block text-sm font-bold mb-2" style={{ color: textPrimary }}>
          💾 Banco de firmas {bancoFirmas.length > 0 && `(${bancoFirmas.length})`}
        </label>
        <p className="text-xs mb-3" style={{ color: textSecondary }}>
          Elija una firma guardada o complete los datos abajo y guárdela en el banco.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={firmaSeleccionadaId}
            onChange={handleSeleccionFirma}
            className="flex-1 rounded px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`,
            }}
            disabled={cargando || bancoFirmas.length === 0}
          >
            <option value="">
              {bancoFirmas.length === 0
                ? '— No hay firmas en el banco —'
                : '— Seleccionar firma del banco —'}
            </option>
            {bancoFirmas.map((firma) => (
              <option key={firma.id} value={String(firma.id)}>
                {firma.nombre}
                {firma.cargo ? ` — ${firma.cargo}` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleEliminarSeleccionada}
            className="px-3 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium text-white shrink-0"
            style={{ backgroundColor: '#EF4444' }}
            disabled={cargando || !firmaSeleccionadaId}
            title="Eliminar firma seleccionada del banco"
          >
            <FaTrash size={12} />
            Eliminar del banco
          </button>
        </div>

        {firmaBancoDisplayUrl && (
          <div
            className="mt-3 p-2 rounded inline-block"
            style={{ backgroundColor: '#FFFFFF', border: `1px solid ${borderColor}` }}
          >
            <img
              src={firmaBancoDisplayUrl}
              alt="Vista previa firma"
              className="h-12 object-contain"
              onError={createImageErrorHandler(firmaPreview?.firma)}
            />
          </div>
        )}
      </div>

      {/* Datos del firmante */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: textPrimary }}>
            Nombre completo *
          </label>
          <input
            type="text"
            value={formData.nombreFirmante || ''}
            onChange={(e) => {
              onInputChange('nombreFirmante', e.target.value);
              setFirmaSeleccionadaId('');
            }}
            className="w-full rounded px-3 py-2 text-sm"
            style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
            placeholder="Ej: Jimmy Grueso"
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: textPrimary }}>
            Cargo
          </label>
          <input
            type="text"
            value={formData.cargoFirmante || ''}
            onChange={(e) => onInputChange('cargoFirmante', e.target.value)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
            placeholder="Ej: Director Operativo"
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: textPrimary }}>
            E-Mail
          </label>
          <input
            type="email"
            value={formData.emailFirmante || ''}
            onChange={(e) => onInputChange('emailFirmante', e.target.value)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
            placeholder="ejemplo@proserpuertos.com.co"
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: textPrimary }}>
            Celular
          </label>
          <input
            type="text"
            value={formData.celularFirmante || ''}
            onChange={(e) => onInputChange('celularFirmante', e.target.value)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
            placeholder="3168345216"
            disabled={cargando}
          />
        </div>
      </div>

      {/* Imagen de firma */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
          Imagen de la firma *
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCargarFirma}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded flex items-center gap-2 font-medium text-white"
          style={{ backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6' }}
          disabled={cargando}
        >
          <FaUpload />
          Subir firma
        </button>
        {firmaDisplayUrl && (
          <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${borderColor}` }}>
            <p className="text-xs mb-2" style={{ color: textSecondary }}>
              Vista previa:
            </p>
            <img
              src={firmaDisplayUrl}
              alt="Firma"
              className="max-w-full h-24 object-contain"
              onError={handleErrorFirma}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleGuardarEnBanco}
        className="px-4 py-2 rounded flex items-center gap-2 font-medium text-white"
        style={{ backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E' }}
        disabled={cargando || !formData.nombreFirmante || !formData.imagenFirma}
      >
        <FaPlus />
        Guardar en banco de firmas
      </button>

      {/* Vista previa del bloque en el documento */}
      {(formData.nombreFirmante || formData.imagenFirma) && (
        <div
          className="mt-6 p-4 rounded"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
            border: `2px solid ${borderColor}`,
          }}
        >
          <h4 className="text-sm font-bold mb-3" style={{ color: textPrimary }}>
            Vista previa en el documento
          </h4>
          <div className="p-4 rounded bg-white" style={{ border: `1px solid ${borderColor}` }}>
            <p className="text-sm mb-2 text-gray-900">Atentamente,</p>
            {firmaDisplayUrl && (
              <img
                src={firmaDisplayUrl}
                alt="Firma"
                className="h-16 object-contain mb-3"
                onError={handleErrorFirma}
              />
            )}
            {formData.nombreFirmante && (
              <p className="text-sm font-bold text-gray-900">{formData.nombreFirmante}</p>
            )}
            {formData.cargoFirmante && <p className="text-xs text-gray-600">{formData.cargoFirmante}</p>}
            {formData.emailFirmante && <p className="text-xs text-blue-600 mt-2">{formData.emailFirmante}</p>}
            {formData.celularFirmante && <p className="text-xs text-blue-600">Cel: {formData.celularFirmante}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
