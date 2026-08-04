import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaInbox, FaSearch, FaSync, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import {
  obtenerBandejaFacturacion,
  corregirEnvioBandejaFacturacion,
  eliminarEnvioBandejaFacturacion,
  solicitarCorreccionControlHoras,
} from '../../services/complexService';
import { getEstados } from '../../services/estadosService';
import { BASE_URL } from '../../config/apiConfig';
import { crearResolverNombreAseguradora } from '../../utils/aseguradoraResolver';
import { formatearFechaUI } from '../../utils/fechaUtils';
import {
  GERENTES_FACTURACION_OPCIONES,
  labelTipoEnvio,
  esUsuarioGerenteFacturacion,
  puedeElegirGerenteEnBandeja,
  puedeAdministrarBandejaFacturacion,
  gerenteDesdeLogin,
  nombreGerente,
  resolverNombreEstadoDesdeCatalogo,
} from '../../config/gerentesFacturacion';
import {
  complexPageWrapWide,
  complexCard,
  complexPageTitle,
  complexPageSubtitle,
  complexBtnPrimary,
  complexBtnSecondary,
  complexInput,
  complexSelect,
  complexTableGrid,
  complexTableThDivider,
  complexTableTdDivider,
  complexTableBtnGestionar,
  complexInfoPanel,
  complexTextarea,
} from './complexFenixUi';
import { ComplexNavTabs } from './ComplexUiBlocks';

export default function BandejaFacturacion() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = localStorage.getItem('login') || '';
  const esSupervisor = puedeElegirGerenteEnBandeja(login);
  const puedeAdministrar = puedeAdministrarBandejaFacturacion(login);
  const gerentePropio = gerenteDesdeLogin(login);

  const [gerenteFiltro, setGerenteFiltro] = useState(gerentePropio || (esSupervisor ? 'elkin' : ''));
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [items, setItems] = useState([]);
  const [estadosCatalogo, setEstadosCatalogo] = useState([]);
  const [clientesCatalogo, setClientesCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filaEditando, setFilaEditando] = useState(null);
  const [nuevoGerenteCorreccion, setNuevoGerenteCorreccion] = useState('');
  const [guardandoAdmin, setGuardandoAdmin] = useState(false);
  const [filaCorreccionAjustador, setFilaCorreccionAjustador] = useState(null);
  const [mensajeCorreccion, setMensajeCorreccion] = useState('');
  const [enviandoCorreccion, setEnviandoCorreccion] = useState(false);

  const puedeAcceder = esUsuarioGerenteFacturacion(login);

  const cargar = useCallback(async () => {
    if (!puedeAcceder) return;
    if (!gerenteFiltro && esSupervisor) {
      setError(t('complex.ui.bandeja_facturacion.seleccione_jefe'));
      setItems([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const data = await obtenerBandejaFacturacion({
        gerente: gerenteFiltro,
        tipo: tipoFiltro,
        desde: desde || undefined,
        hasta: hasta || undefined,
        q: busqueda.trim() || undefined,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e.message || t('complex.ui.bandeja_facturacion.error_cargar'));
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [puedeAcceder, gerenteFiltro, tipoFiltro, desde, hasta, busqueda, esSupervisor, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    getEstados()
      .then((data) => {
        const lista = Array.isArray(data) ? data : data?.data || [];
        setEstadosCatalogo(lista);
      })
      .catch(() => setEstadosCatalogo([]));
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}/api/clientes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setClientesCatalogo(Array.isArray(data) ? data : []))
      .catch(() => setClientesCatalogo([]));
  }, []);

  const resolverNombreAseguradora = useMemo(
    () => crearResolverNombreAseguradora(clientesCatalogo),
    [clientesCatalogo]
  );

  const tituloGerente = useMemo(() => nombreGerente(gerenteFiltro), [gerenteFiltro]);

  const abrirCaso = (casoId) => {
    if (!casoId) return;
    navigate(`/editar-caso/${casoId}`, {
      state: { returnPath: '/complex/bandeja-facturacion' },
    });
  };

  const payloadEnvio = (fila) => ({
    casoId: fila.casoId,
    envioId: fila.envioId,
    envioIndice: fila.envioIndice,
    fechaEnvio: fila.fechaEnvio,
    gerente: fila.gerente,
    tipoEnvio: fila.tipoEnvio,
    enviadoPor: fila.enviadoPor,
  });

  const abrirCorreccion = (fila) => {
    setFilaEditando(fila);
    setNuevoGerenteCorreccion(fila.gerente || 'elkin');
  };

  const abrirSolicitudCorreccionAjustador = (fila) => {
    setFilaCorreccionAjustador(fila);
    setMensajeCorreccion(
      t('complex.ui.bandeja_facturacion.error_control_horas')
    );
  };

  const enviarSolicitudCorreccionAjustador = async () => {
    if (!filaCorreccionAjustador?.casoId) return;
    const mensaje = String(mensajeCorreccion || '').trim();
    if (!mensaje) {
      alert(t('complex.ui.bandeja_facturacion.escriba_observacion_ajustador'));
      return;
    }
    setEnviandoCorreccion(true);
    try {
      const data = await solicitarCorreccionControlHoras({
        casoId: filaCorreccionAjustador.casoId,
        numeroCaso: filaCorreccionAjustador.nmroAjste,
        mensaje,
      });
      alert(
        t('complex.ui.bandeja_facturacion.solicitud_enviada_ajustador', {
          ajustador: data.ajustador || t('complex.ui.bandeja_facturacion.el_ajustador'),
          email: data.emailEnviado || '',
        })
      );
      setFilaCorreccionAjustador(null);
      setMensajeCorreccion('');
    } catch (e) {
      alert(e.message || t('complex.ui.bandeja_facturacion.error_enviar'));
    } finally {
      setEnviandoCorreccion(false);
    }
  };

  const guardarCorreccion = async () => {
    if (!filaEditando || !nuevoGerenteCorreccion) return;
    if (nuevoGerenteCorreccion === filaEditando.gerente) {
      setFilaEditando(null);
      return;
    }
    setGuardandoAdmin(true);
    try {
      await corregirEnvioBandejaFacturacion({
        ...payloadEnvio(filaEditando),
        nuevoGerente: nuevoGerenteCorreccion,
      });
      setFilaEditando(null);
      alert(
        t('complex.ui.bandeja_facturacion.destinatario_actualizado', {
          nombre: nombreGerente(nuevoGerenteCorreccion),
        })
      );
      await cargar();
    } catch (e) {
      alert(e.message || t('complex.ui.bandeja_facturacion.error_corregir'));
    } finally {
      setGuardandoAdmin(false);
    }
  };

  const quitarEnvio = async (fila) => {
    const nombre = fila.nombreGerente || nombreGerente(fila.gerente);
    const msg = t('complex.ui.bandeja_facturacion.confirmar_quitar', {
      nombre,
      caso: fila.nmroAjste || fila.casoId,
    });
    if (!window.confirm(msg)) return;

    setGuardandoAdmin(true);
    try {
      await eliminarEnvioBandejaFacturacion(payloadEnvio(fila));
      await cargar();
    } catch (e) {
      alert(e.message || t('complex.ui.bandeja_facturacion.error_quitar'));
    } finally {
      setGuardandoAdmin(false);
    }
  };

  if (!puedeAcceder) {
    return (
      <div className={complexPageWrapWide}>
        <div className={complexCard}>
          <p className="text-gray-600 dark:text-gray-300">{t("complex.ui.bandeja_facturacion.esta_vista_esta_disponible_solo_para_los_jefes_de_factur")}</p>
        </div>
      </div>
    );
  }

  const thClase = `${complexTableThDivider} px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap`;
  const tdClase = `${complexTableTdDivider} px-3 py-3 text-sm align-top`;

  return (
    <div className={complexPageWrapWide}>
      <header className="mb-6 space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-fenix-primario/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fenix-primario">
          <FaInbox />{t("complex.ui.bandeja_facturacion.facturacion")}</span>
        <h1 className={complexPageTitle}>{t("complex.ui.bandeja_facturacion.bandeja_de_casos_para_facturar")}</h1>
        <p className={complexPageSubtitle}>{t("complex.ui.bandeja_facturacion.casos_que_los_ajustadores_enviaron_a")}{tituloGerente}{t("complex.ui.bandeja_facturacion.abra_cada_caso_sin_buscarlo_en_el_reporte_completo")}</p>
        {/* PRUEBA DE SICRONIZACION CON CO0LIFY */}
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{t("complex.ui.bandeja_facturacion.prueba_de_sicronizacion_con_co0lify")}</p>
        <ComplexNavTabs activePath="/complex/bandeja-facturacion" />
      </header>

      <div className={`${complexCard} mb-6 space-y-4`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {esSupervisor && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">{t("complex.ui.bandeja_facturacion.jefe_gerente")}</span>
              <select
                className={complexSelect}
                value={gerenteFiltro}
                onChange={(e) => setGerenteFiltro(e.target.value)}
              >
                <option value="">{t("complex.ui.bandeja_facturacion.seleccione")}</option>
                {GERENTES_FACTURACION_OPCIONES.map((g) => (
                  <option key={g.clave} value={g.clave}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">{t("complex.ui.bandeja_facturacion.tipo_de_envio")}</span>
            <select
              className={complexSelect}
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              <option value="todos">{t("complex.ui.bandeja_facturacion.todos")}</option>
              <option value="control_horas">{t("complex.ui.bandeja_facturacion.control_de_horas")}</option>
              <option value="gerencia">{t("complex.ui.bandeja_facturacion.gerencia_facturacion")}</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">{t("complex.ui.bandeja_facturacion.desde")}</span>
            <input type="date" className={complexInput} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">{t("complex.ui.bandeja_facturacion.hasta")}</span>
            <input type="date" className={complexInput} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">{t("complex.ui.bandeja_facturacion.buscar")}</span>
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                className={`${complexInput} pl-9`}
                placeholder={t("complex.ui.bandeja_facturacion.no_ajuste_siniestro_aseguradora_asegurado")}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cargar()}
              />
            </div>
          </label>
          <button type="button" className={complexBtnPrimary} onClick={cargar} disabled={cargando}>
            <FaSearch className="inline mr-2" />{t("complex.ui.bandeja_facturacion.buscar")}</button>
          <button type="button" className={complexBtnSecondary} onClick={cargar} disabled={cargando}>
            <FaSync className={`inline mr-2 ${cargando ? 'animate-spin' : ''}`} />{t("complex.ui.bandeja_facturacion.actualizar")}</button>
        </div>

        <div className={complexInfoPanel}>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {cargando
              ? t('complex.ui.bandeja_facturacion.cargando')
              : t('complex.ui.bandeja_facturacion.envios_registrados', {
                  count: items.length,
                  plural: items.length === 1 ? '' : 's',
                })}
          </p>
          {puedeAdministrar && (
            <p className="mt-2 text-sm font-medium text-fenix-primario">{t("complex.ui.bandeja_facturacion.como_supervisor_puede_corregir_el_jefe_destinatario_o_qu")}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className={`${complexCard} p-0 sm:p-0 overflow-hidden`}>
        <div className="w-full overflow-x-auto">
          <table className={`${complexTableGrid} w-full min-w-[1320px] table-auto`}>
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className={thClase}>{t("complex.ui.bandeja_facturacion.no_ajuste")}</th>
                <th className={thClase}>{t("complex.ui.bandeja_facturacion.siniestro")}</th>
                <th className={`${thClase} min-w-[140px]`}>{t("complex.ui.bandeja_facturacion.aseguradora")}</th>
                <th className={`${thClase} min-w-[140px]`}>{t("complex.ui.bandeja_facturacion.asegurado")}</th>
                <th className={`${thClase} min-w-[120px]`}>{t("complex.ui.bandeja_facturacion.responsable")}</th>
                <th className={`${thClase} min-w-[130px]`}>{t("complex.ui.bandeja_facturacion.tipo_envio")}</th>
                <th className={`${thClase} min-w-[160px]`}>{t("complex.ui.bandeja_facturacion.jefe_destino")}</th>
                <th className={`${thClase} min-w-[200px]`}>{t("complex.ui.bandeja_facturacion.correo")}</th>
                <th className={thClase}>{t("complex.ui.bandeja_facturacion.fecha_envio")}</th>
                <th className={thClase}>{t("complex.ui.bandeja_facturacion.enviado_por")}</th>
                <th className={`${thClase} min-w-[180px]`}>{t("complex.ui.bandeja_facturacion.estado")}</th>
                <th className={`${thClase} text-center`}>{t("complex.ui.bandeja_facturacion.accion")}</th>
                {puedeAdministrar && (
                  <th className={`${thClase} text-center min-w-[140px]`}>{t("complex.ui.bandeja_facturacion.corregir")}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {!cargando && items.length === 0 && (
                <tr>
                  <td
                    colSpan={puedeAdministrar ? 13 : 12}
                    className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                  >{t("complex.ui.bandeja_facturacion.no_hay_casos_en_la_bandeja_con_los_filtros_actuales")}</td>
                </tr>
              )}
              {items.map((fila, idx) => (
                <tr
                  key={`${fila.casoId}-${fila.fechaEnvio}-${idx}`}
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                >
                  <td className={`${tdClase} font-medium whitespace-nowrap`}>{fila.nmroAjste || '—'}</td>
                  <td className={`${tdClase} whitespace-nowrap`}>{fila.nmroSinstro || '—'}</td>
                  <td className={tdClase}>
                    {resolverNombreAseguradora(fila.codiAsgrdra, fila.nombreAseguradora)}
                  </td>
                  <td className={tdClase}>{fila.asgrBenfcro || '—'}</td>
                  <td className={tdClase}>{fila.nombreResponsable || '—'}</td>
                  <td className={`${tdClase} whitespace-nowrap`}>
                    {labelTipoEnvio(fila.tipoEnvio, t)}
                    {fila.rolEnvio === 'copia' ? t('complex.ui.bandeja_facturacion.copia') : ''}
                  </td>
                  <td className={tdClase}>{fila.nombreGerente || nombreGerente(fila.gerente)}</td>
                  <td className={`${tdClase} break-all text-xs sm:text-sm`}>{fila.emailDestinatario || '—'}</td>
                  <td className={`${tdClase} whitespace-nowrap`}>
                    {formatearFechaUI(fila.fechaEnvio) || '—'}
                  </td>
                  <td className={`${tdClase} whitespace-nowrap`}>{fila.enviadoPor || '—'}</td>
                  <td className={tdClase}>
                    {resolverNombreEstadoDesdeCatalogo(fila, estadosCatalogo)}
                  </td>
                  <td className={`${tdClase} text-center whitespace-nowrap`}>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        className={complexTableBtnGestionar}
                        onClick={() => abrirCaso(fila.casoId)}
                      >{t("complex.ui.bandeja_facturacion.ver_caso")}</button>
                      {(fila.tipoEnvio === 'control_horas' || fila.tipo === 'control_horas') && (
                        <button
                          type="button"
                          className={`${complexBtnSecondary} !px-2 !py-1 text-xs`}
                          title={t("complex.ui.bandeja_facturacion.avisar_al_ajustador_para_que_corrija_el_control_de_horas")}
                          onClick={() => abrirSolicitudCorreccionAjustador(fila)}
                        >
                          <FaExclamationTriangle className="inline text-amber-600" />{t("complex.ui.bandeja_facturacion.corregir")}</button>
                      )}
                    </div>
                  </td>
                  {puedeAdministrar && (
                    <td className={`${tdClase} text-center whitespace-nowrap`}>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          className={`${complexBtnSecondary} !px-2 !py-1 text-xs`}
                          disabled={guardandoAdmin}
                          onClick={() => abrirCorreccion(fila)}
                          title={t("complex.ui.bandeja_facturacion.cambiar_jefe_destinatario")}
                        >
                          <FaEdit className="inline" />{t("complex.ui.bandeja_facturacion.jefe")}</button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                          disabled={guardandoAdmin}
                          onClick={() => quitarEnvio(fila)}
                          title={t("complex.ui.bandeja_facturacion.quitar_registro_de_envio")}
                        >
                          <FaTrash className="inline" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filaEditando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className={`${complexCard} w-full max-w-md space-y-4`}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("complex.ui.bandeja_facturacion.corregir_jefe_destinatario")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.bandeja_facturacion.caso")}<strong>{filaEditando.nmroAjste}</strong>{t("complex.ui.bandeja_facturacion.envio_del")}{' '}
              {formatearFechaUI(filaEditando.fechaEnvio)}{t("complex.ui.bandeja_facturacion.actualmente_a")}{' '}
              <strong>{nombreGerente(filaEditando.gerente)}</strong>{t("complex.ui.bandeja_facturacion.texto")}</p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("complex.ui.bandeja_facturacion.nuevo_jefe_destinatario")}</span>
              <select
                className={complexSelect}
                value={nuevoGerenteCorreccion}
                onChange={(e) => setNuevoGerenteCorreccion(e.target.value)}
              >
                {GERENTES_FACTURACION_OPCIONES.map((g) => (
                  <option key={g.clave} value={g.clave}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-gray-500">{t("complex.ui.bandeja_facturacion.no_se_crea_un_envio_nuevo_ni_se_borra_el_caso_solo_se_ac")}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={complexBtnSecondary}
                disabled={guardandoAdmin}
                onClick={() => setFilaEditando(null)}
              >{t("complex.ui.bandeja_facturacion.cancelar")}</button>
              <button
                type="button"
                className={complexBtnPrimary}
                disabled={guardandoAdmin}
                onClick={guardarCorreccion}
              >
                {guardandoAdmin
                  ? t('complex.ui.bandeja_facturacion.guardando')
                  : t('complex.ui.bandeja_facturacion.guardar_correccion')}
              </button>
            </div>
          </div>
        </div>
      )}

      {filaCorreccionAjustador && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className={`${complexCard} w-full max-w-lg space-y-4`}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("complex.ui.bandeja_facturacion.solicitar_correccion_al_ajustador")}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.bandeja_facturacion.caso")}<strong>{filaCorreccionAjustador.nmroAjste}</strong>{t("complex.ui.bandeja_facturacion.responsable_2")}{' '}
              <strong>{filaCorreccionAjustador.nombreResponsable || '—'}</strong>{t("complex.ui.bandeja_facturacion.se_le_pedira_corregir_el_control_de_horas_en_arnald_o_ca")}</p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("complex.ui.bandeja_facturacion.observacion_error_detectado")}</span>
              <textarea
                className={complexTextarea}
                rows={4}
                value={mensajeCorreccion}
                onChange={(e) => setMensajeCorreccion(e.target.value)}
                placeholder={t("complex.ui.bandeja_facturacion.describa_el_error_encontrado")}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={complexBtnSecondary}
                disabled={enviandoCorreccion}
                onClick={() => setFilaCorreccionAjustador(null)}
              >{t("complex.ui.bandeja_facturacion.cancelar")}</button>
              <button
                type="button"
                className={complexBtnPrimary}
                disabled={enviandoCorreccion}
                onClick={enviarSolicitudCorreccionAjustador}
              >
                {enviandoCorreccion
                  ? t('complex.ui.bandeja_facturacion.enviando')
                  : t('complex.ui.bandeja_facturacion.enviar_aviso_ajustador')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
