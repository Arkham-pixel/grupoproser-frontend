import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaArrowUp,
  FaCalendarAlt,
  FaChartLine,
  FaChevronLeft,
  FaChevronRight,
  FaPrint,
} from 'react-icons/fa';
import Loader from '../Loader.jsx';
import { fetchAllCasosAlfa } from '../../services/segurosAlfaService.js';
import { filtrarCasosPorAsignacionUsuario } from '../../utils/permisosCasoPorRol.js';
import { calcularBoletinDiarioAlfa, diaBogotaDesdeOffset } from './boletinDiarioAlfaHelpers.js';
import { isoDateBogota } from './boletinSemanalAlfaHelpers.js';
import { imprimirBoletinDiarioAlfa } from './imprimirBoletinDiarioAlfa.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';

function AvanceCell({ valor }) {
  if (valor === 0) {
    return <span className="font-semibold text-gray-500">0</span>;
  }
  const positivo = valor > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${
        positivo ? 'text-fenix-primario' : 'text-fenix-error'
      }`}
    >
      {positivo ? <FaArrowUp className="text-[10px]" /> : null}
      {positivo ? `+${valor}` : valor}
    </span>
  );
}

function TablaSimple({ titulo, subtitulo, columnas, filas, colCantidad = 'cantidad' }) {
  return (
    <section className="rounded-2xl border border-fenix-borde bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-950 print:break-inside-avoid">
      <h2 className="font-display text-lg font-bold text-gray-900 dark:text-gray-100">{titulo}</h2>
      {subtitulo ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitulo}</p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-left dark:bg-gray-900">
              {columnas.map((c) => (
                <th
                  key={c.key}
                  className={`border border-fenix-borde px-3 py-2 font-semibold dark:border-gray-700 ${
                    c.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="dark:text-gray-200">
                {columnas.map((c) => {
                  if (c.key === 'label') {
                    return (
                      <td
                        key={c.key}
                        className="border border-fenix-borde px-3 py-2 dark:border-gray-700"
                      >
                        {f.label}
                      </td>
                    );
                  }
                  if (c.key === 'avance') {
                    return (
                      <td
                        key={c.key}
                        className="border border-fenix-borde px-3 py-2 text-center dark:border-gray-700"
                      >
                        <AvanceCell valor={f.avance} />
                      </td>
                    );
                  }
                  const val = f[c.key] ?? f[colCantidad] ?? 0;
                  return (
                    <td
                      key={c.key}
                      className={`border border-fenix-borde px-3 py-2 tabular-nums dark:border-gray-700 ${
                        c.align === 'center' || c.key !== 'label' ? 'text-center font-semibold' : ''
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function BoletinDiarioSegurosAlfa() {
  const { t } = useTranslation();
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offsetDias, setOffsetDias] = useState(0);

  const fechaCorte = useMemo(() => diaBogotaDesdeOffset(offsetDias), [offsetDias]);
  const isoCorte = useMemo(() => isoDateBogota(fechaCorte), [fechaCorte]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const lista = await fetchAllCasosAlfa();
        if (!cancelado) {
          setCasos(filtrarCasosPorAsignacionUsuario(lista, { modulo: 'alfa' }));
        }
      } catch (err) {
        console.error('Error cargando boletín diario Alfa:', err);
        if (!cancelado) {
          setError(err.message || t('segurosAlfa.boletinDiario.loadError'));
          setCasos([]);
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [t]);

  const boletin = useMemo(
    () =>
      calcularBoletinDiarioAlfa(casos, {
        fechaCorte,
        persistirCorte: offsetDias <= 0,
      }),
    [casos, fechaCorte, offsetDias]
  );

  const { resumen, gestion, siniestro, cierresDia, perdidas } = boletin;

  const handleImprimirPdf = () => {
    imprimirBoletinDiarioAlfa(boletin, {
      docTitle: `${t('segurosAlfa.boletinDiario.title')} · ${boletin.etiquetaHoyCorta}`,
      title: t('segurosAlfa.boletinDiario.title'),
      subtitle: t('segurosAlfa.boletinDiario.subtitle', { fecha: boletin.etiquetaHoy }),
      cutOff: t('segurosAlfa.boletinDiario.cutOff'),
      ayer: t('segurosAlfa.boletinDiario.comparativo.yesterday', { defaultValue: 'Día anterior' }),
      hoy: t('segurosAlfa.boletinDiario.comparativo.today', { defaultValue: 'Hoy' }),
      avance: t('segurosAlfa.boletinDiario.unificado.avance', { defaultValue: 'Avance' }),
      movimiento: t('segurosAlfa.boletinDiario.unificado.movimiento', {
        defaultValue: 'Movimiento',
      }),
      indicador: t('segurosAlfa.boletinDiario.unificado.indicador', {
        defaultValue: 'Indicador',
      }),
      totalCasos: t('segurosAlfa.boletinDiario.unificado.totalCasos', {
        defaultValue: 'Total casos',
      }),
      estadoGestion: t('segurosAlfa.boletinDiario.unificado.estadoGestion', {
        defaultValue: 'Estado de gestión',
      }),
      estadoSiniestro: t('segurosAlfa.boletinDiario.unificado.estadoSiniestro', {
        defaultValue: 'Estado del siniestro',
      }),
      resultado: t('segurosAlfa.boletinDiario.unificado.resultado', {
        defaultValue: 'Resultado',
      }),
      cantidad: t('segurosAlfa.boletinDiario.unificado.cantidad', {
        defaultValue: 'Cantidad',
      }),
      tipoPerdida: t('segurosAlfa.boletinDiario.unificado.tipoPerdida', {
        defaultValue: 'Tipo de pérdida',
      }),
      s1: t('segurosAlfa.boletinDiario.unificado.s1', {
        defaultValue: '1. Resumen general de cartera',
      }),
      s2: t('segurosAlfa.boletinDiario.unificado.s2', {
        defaultValue: '2. Estado de gestión actual',
      }),
      s3: t('segurosAlfa.boletinDiario.unificado.s3', {
        defaultValue: '3. Estado del siniestro',
      }),
      s4: t('segurosAlfa.boletinDiario.unificado.s4', {
        defaultValue: '4. Cierres del día',
      }),
      s5: t('segurosAlfa.boletinDiario.unificado.s5', {
        defaultValue: '5. Clasificación de pérdidas',
      }),
      cutLabel: t('segurosAlfa.boletinDiario.comparativo.cutLabel', {
        ayer: boletin.etiquetaAyer,
        hoy: boletin.etiquetaHoy,
      }),
    });
  };

  if (loading) {
    return (
      <div className={`${expressScope} ${expressPageWrap}`}>
        <Loader />
      </div>
    );
  }

  return (
    <div className={`${expressScope} ${expressPageWrap} space-y-6 print:space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fenix-primario">
            {t('segurosAlfa.boletinDiario.eyebrow', { defaultValue: 'Seguros Alfa' })}
          </p>
          <h1 className={expressPageTitle}>{t('segurosAlfa.boletinDiario.title')}</h1>
          <p className={expressPageSubtitle}>
            {t('segurosAlfa.boletinDiario.subtitle', { fecha: boletin.etiquetaHoy })}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('segurosAlfa.boletinDiario.cutOff')} · {isoCorte}
            {boletin.fuenteAyer === 'reconstruido' ? (
              <span className="ml-2 text-amber-600">
                ({t('segurosAlfa.boletinDiario.comparativo.reconstructedNote', {
                  defaultValue: 'Día anterior reconstruido',
                })}
                )
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/seguros-alfa/reporte" className={expressBtnGhost}>
            {t('segurosAlfa.boletinDiario.backReport', { defaultValue: 'Reporte' })}
          </Link>
          <button type="button" className={expressBtnPrimary} onClick={handleImprimirPdf}>
            <FaPrint /> {t('segurosAlfa.boletinDiario.print', { defaultValue: 'Imprimir / PDF' })}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          type="button"
          className={expressBtnGhost}
          disabled={offsetDias <= -30}
          onClick={() => setOffsetDias((n) => n - 1)}
        >
          <FaChevronLeft /> {t('segurosAlfa.boletinDiario.prevDay', { defaultValue: 'Día anterior' })}
        </button>
        <span className="inline-flex items-center gap-2 rounded-full border border-fenix-borde px-3 py-1.5 text-sm font-semibold dark:border-gray-700">
          <FaCalendarAlt className="text-fenix-primario" />
          {boletin.etiquetaHoy}
        </span>
        <button
          type="button"
          className={expressBtnGhost}
          disabled={offsetDias >= 0}
          onClick={() => setOffsetDias((n) => Math.min(0, n + 1))}
        >
          {t('segurosAlfa.boletinDiario.nextDay', { defaultValue: 'Día siguiente' })}{' '}
          <FaChevronRight />
        </button>
        {offsetDias !== 0 ? (
          <button type="button" className={expressBtnGhost} onClick={() => setOffsetDias(0)}>
            <FaChartLine /> {t('segurosAlfa.boletinDiario.today', { defaultValue: 'Hoy' })}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <TablaSimple
        titulo={t('segurosAlfa.boletinDiario.unificado.s1', {
          defaultValue: '1. Resumen general de cartera (Estado actual)',
        })}
        subtitulo={t('segurosAlfa.boletinDiario.unificado.s1Sub', {
          defaultValue: 'Indicadores consolidados de la cartera asignada.',
        })}
        columnas={[
          {
            key: 'label',
            label: t('segurosAlfa.boletinDiario.unificado.indicador', {
              defaultValue: 'Indicador',
            }),
          },
          {
            key: 'cantidad',
            label: t('segurosAlfa.boletinDiario.unificado.totalCasos', {
              defaultValue: 'Total casos',
            }),
            align: 'center',
          },
        ]}
        filas={resumen?.filas || []}
      />

      <TablaSimple
        titulo={t('segurosAlfa.boletinDiario.unificado.s2', {
          defaultValue: '2. Estado de gestión actual',
        })}
        subtitulo={t('segurosAlfa.boletinDiario.comparativo.cutLabel', {
          ayer: boletin.etiquetaAyer,
          hoy: boletin.etiquetaHoy,
        })}
        columnas={[
          {
            key: 'label',
            label: t('segurosAlfa.boletinDiario.unificado.estadoGestion', {
              defaultValue: 'Estado de gestión',
            }),
          },
          {
            key: 'ayer',
            label: t('segurosAlfa.boletinDiario.comparativo.yesterday', {
              defaultValue: 'Día anterior',
            }),
            align: 'center',
          },
          {
            key: 'hoy',
            label: t('segurosAlfa.boletinDiario.comparativo.today', { defaultValue: 'Hoy' }),
            align: 'center',
          },
          {
            key: 'avance',
            label: t('segurosAlfa.boletinDiario.unificado.avance', { defaultValue: 'Avance' }),
            align: 'center',
          },
        ]}
        filas={gestion?.filas || []}
      />

      <TablaSimple
        titulo={t('segurosAlfa.boletinDiario.unificado.s3', {
          defaultValue: '3. Estado del siniestro',
        })}
        columnas={[
          {
            key: 'label',
            label: t('segurosAlfa.boletinDiario.unificado.estadoSiniestro', {
              defaultValue: 'Estado del siniestro',
            }),
          },
          {
            key: 'ayer',
            label: t('segurosAlfa.boletinDiario.comparativo.yesterday', {
              defaultValue: 'Día anterior',
            }),
            align: 'center',
          },
          {
            key: 'hoy',
            label: t('segurosAlfa.boletinDiario.comparativo.today', { defaultValue: 'Hoy' }),
            align: 'center',
          },
          {
            key: 'avance',
            label: t('segurosAlfa.boletinDiario.unificado.movimiento', {
              defaultValue: 'Movimiento',
            }),
            align: 'center',
          },
        ]}
        filas={siniestro?.filas || []}
      />

      <TablaSimple
        titulo={t('segurosAlfa.boletinDiario.unificado.s4', {
          defaultValue: '4. Cierres del día',
        })}
        subtitulo={t('segurosAlfa.boletinDiario.unificado.s4Sub', {
          defaultValue: 'Durante el día seleccionado (corte Bogotá).',
        })}
        columnas={[
          {
            key: 'label',
            label: t('segurosAlfa.boletinDiario.unificado.resultado', {
              defaultValue: 'Resultado',
            }),
          },
          {
            key: 'cantidad',
            label: t('segurosAlfa.boletinDiario.unificado.cantidad', {
              defaultValue: 'Cantidad',
            }),
            align: 'center',
          },
        ]}
        filas={cierresDia?.filas || []}
      />

      <TablaSimple
        titulo={t('segurosAlfa.boletinDiario.unificado.s5', {
          defaultValue: '5. Clasificación de pérdidas',
        })}
        columnas={[
          {
            key: 'label',
            label: t('segurosAlfa.boletinDiario.unificado.tipoPerdida', {
              defaultValue: 'Tipo de pérdida',
            }),
          },
          {
            key: 'cantidad',
            label: t('segurosAlfa.boletinDiario.unificado.cantidad', {
              defaultValue: 'Cantidad',
            }),
            align: 'center',
          },
        ]}
        filas={perdidas?.filas || []}
      />
    </div>
  );
}
