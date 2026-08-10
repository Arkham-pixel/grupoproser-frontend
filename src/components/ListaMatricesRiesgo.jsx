import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaBuilding,
  FaChartBar,
  FaEye,
  FaPlus,
  FaSyncAlt,
  FaTrashAlt,
  FaUser,
} from 'react-icons/fa';
import { MatrizRiesgoService } from '../services/matrizRiesgoService';
import { autoSaveService } from '../services/autoSaveService';
import { buildFormAutoSaveKey } from '../hooks/useFormAutoSave';
import {
  matrizBtnDanger,
  matrizBtnPrimary,
  matrizBtnSecondary,
  matrizCard,
  matrizInput,
  matrizLabel,
} from './MatrizRiesgoAvanzada/matrizFenixUi';

const BADGE_CLASS = {
  inicial: 'bg-gray-100 text-gray-700',
  en_proceso: 'bg-amber-100 text-amber-800',
  final: 'bg-blue-100 text-blue-800',
  completado: 'bg-emerald-100 text-emerald-800',
};

const ListaMatricesRiesgo = () => {
  const { t, i18n } = useTranslation();
  const [matrices, setMatrices] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({ estado: '', empresa: '' });
  const navigate = useNavigate();

  const cargarMatrices = useCallback(async () => {
    try {
      setCargando(true);
      setError('');
      const resultado = await MatrizRiesgoService.obtenerMatricesRiesgo(filtros);
      setMatrices(resultado.data || []);
    } catch (err) {
      console.error('Error cargando matrices:', err);
      setError(err.message || t('riskMatrix.loadError'));
      setMatrices([]);
    } finally {
      setCargando(false);
    }
  }, [filtros, t]);

  useEffect(() => {
    cargarMatrices();
  }, [cargarMatrices]);

  const handleEliminar = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm(t('riskMatrix.deleteConfirmation'))) {
      return;
    }
    try {
      await MatrizRiesgoService.eliminarMatrizRiesgo(id);
      cargarMatrices();
    } catch (err) {
      alert(t('riskMatrix.deleteError', { error: err.message }));
    }
  };

  const handleVer = (id) => {
    navigate(`/matriz-riesgo-avanzada/${id}`);
  };

  const handleNuevaMatriz = () => {
    autoSaveService.clear(buildFormAutoSaveKey('matriz-riesgo', null));
    localStorage.removeItem('matrizRiesgos');
    navigate('/matriz-riesgo-avanzada', { state: { nuevaMatriz: true } });
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fecha;
    }
  };

  const getEstadoBadge = (estado) => {
    const map = {
      inicial: t('riskMatrix.statusInitial'),
      en_proceso: t('riskMatrix.statusInProgress'),
      final: t('riskMatrix.statusFinal'),
      completado: t('riskMatrix.statusCompleted'),
    };
    const texto = map[estado] || estado;
    const clase = BADGE_CLASS[estado] || 'bg-gray-100 text-gray-600';
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${clase}`}>{texto}</span>
    );
  };

  return (
    <div className="min-h-full bg-fenix-fondo p-4 dark:bg-[#0F0F0F] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 border-l-4 border-fenix-primario pl-3 font-heading text-xl font-bold text-gray-800 dark:text-white sm:text-2xl">
            <FaChartBar className="text-fenix-primario" />
            {t('riskMatrix.savedMatrices')}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={matrizBtnPrimary} onClick={handleNuevaMatriz}>
              <FaPlus />
              {t('riskMatrix.newMatrix')}
            </button>
            <button
              type="button"
              className={matrizBtnSecondary}
              onClick={cargarMatrices}
              disabled={cargando}
            >
              <FaSyncAlt className={cargando ? 'animate-spin' : ''} />
              {t('riskMatrix.refresh')}
            </button>
          </div>
        </div>

        <div className={`${matrizCard} flex flex-wrap gap-4`}>
          <div className="min-w-[160px] flex-1">
            <label htmlFor="filtro-estado" className={matrizLabel}>
              {t('riskMatrix.status')}
            </label>
            <select
              id="filtro-estado"
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className={matrizInput}
            >
              <option value="">{t('riskMatrix.all')}</option>
              <option value="inicial">{t('riskMatrix.statusInitial')}</option>
              <option value="en_proceso">{t('riskMatrix.statusInProgress')}</option>
              <option value="final">{t('riskMatrix.statusFinal')}</option>
              <option value="completado">{t('riskMatrix.statusCompleted')}</option>
            </select>
          </div>
          <div className="min-w-[200px] flex-[2]">
            <label htmlFor="filtro-empresa" className={matrizLabel}>
              {t('riskMatrix.company')}
            </label>
            <input
              id="filtro-empresa"
              type="text"
              placeholder={t('riskMatrix.searchCompany')}
              value={filtros.empresa}
              onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}
              className={matrizInput}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        {cargando ? (
          <div className={`${matrizCard} flex items-center justify-center gap-2 py-12`}>
            <FaSyncAlt className="animate-spin text-fenix-primario" />
            <p className="font-body text-gray-600 dark:text-gray-400">{t('riskMatrix.loadingMatrices')}</p>
          </div>
        ) : matrices.length === 0 ? (
          <div className={`${matrizCard} py-12 text-center`}>
            <p className="font-body text-gray-600 dark:text-gray-400">{t('riskMatrix.noMatrices')}</p>
            <button
              type="button"
              className={`${matrizBtnPrimary} mt-4`}
              onClick={handleNuevaMatriz}
            >
              <FaPlus />
              {t('riskMatrix.createMatrix')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matrices.map((matriz) => (
              <div
                key={matriz._id}
                role="button"
                tabIndex={0}
                className={`${matrizCard} cursor-pointer transition hover:border-fenix-primario/30 hover:shadow-md`}
                onClick={() => handleVer(matriz._id)}
                onKeyDown={(e) => e.key === 'Enter' && handleVer(matriz._id)}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base font-bold text-gray-800 dark:text-white">
                    {matriz.titulo || t('riskMatrix.untitled')}
                  </h3>
                  {getEstadoBadge(matriz.estado)}
                </div>
                <div className="space-y-2 font-body text-sm text-gray-600 dark:text-gray-300">
                  <p className="flex items-center gap-2">
                    <FaBuilding className="shrink-0 text-fenix-primario" />
                    {matriz.nombreEmpresa || t('riskMatrix.na')}
                  </p>
                  {matriz.ajustador && (
                    <p className="flex items-center gap-2">
                      <FaUser className="shrink-0 text-gray-400" />
                      {matriz.ajustador.nombre || t('riskMatrix.na')}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{t('riskMatrix.created')}: {formatearFecha(matriz.fechaCreacion)}</p>
                  {matriz.fechaModificacion && (
                    <p className="text-xs text-gray-500">
                      {t('riskMatrix.modified')}: {formatearFecha(matriz.fechaModificacion)}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                  <button
                    type="button"
                    className={matrizBtnSecondary}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVer(matriz._id);
                    }}
                  >
                    <FaEye />
                    {t('riskMatrix.view')}
                  </button>
                  <button
                    type="button"
                    className={matrizBtnDanger}
                    onClick={(e) => handleEliminar(matriz._id, e)}
                  >
                    <FaTrashAlt />
                    {t('riskMatrix.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaMatricesRiesgo;
