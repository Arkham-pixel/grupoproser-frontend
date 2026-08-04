import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaBullseye,
  FaChartBar,
  FaChartLine,
  FaClipboardList,
  FaDownload,
  FaExclamationTriangle,
  FaFileAlt,
  FaFire,
  FaGraduationCap,
  FaLightbulb,
  FaSearch,
  FaShieldAlt,
  FaTachometerAlt,
  FaTrafficLight,
  FaUpload,
} from 'react-icons/fa';
import { ReporteService } from '../../services/reporteService';
import { calcularAnaliticaMatriz } from '../../services/matrizAnaliticaService';
import DashboardEjecutivo from './reporteEjecutivo/DashboardEjecutivo';
import Top10Riesgos from './reporteEjecutivo/Top10Riesgos';
import SemaforoGerencial, { HallazgosAutomaticos } from './reporteEjecutivo/SemaforoHallazgos';
import ComparativoInhRes from './reporteEjecutivo/ComparativoInhRes';
import GraficosEjecutivos from './reporteEjecutivo/GraficosEjecutivos';
import RecomendacionesPriorizadas from './reporteEjecutivo/RecomendacionesPriorizadas';
import ResumenEjecutivo from './reporteEjecutivo/ResumenEjecutivo';
import IndicadorMadurez from './reporteEjecutivo/IndicadorMadurez';
import ExportacionReporte from './reporteEjecutivo/ExportacionReporte';
import { cargarHistoricoMatricesEmpresa } from '../../services/exportMatrizReporteService';
import InformacionMatriz from './InformacionMatriz';
import IdentificacionRiesgos from './IdentificacionRiesgos';
import ValoracionRiesgos from './ValoracionRiesgos';
import MapaCalorRiesgos from './MapaCalorRiesgos';
import GestionRiesgos from './GestionRiesgos';
import { leerDatosReporteMatriz } from './matrizReporteStorage';
import { useTablasArrastrables } from './useTablasArrastrables';
import ReporteAvisoTablaAncha from './ReporteAvisoTablaAncha';
import { arnaldLogo } from '../../config/brandAssets';
import logoProser from '../../img/Logo.png';
import './matrizFenixTheme.css';
import './VistaReporteMatriz.css';
import './reporteEjecutivo/reporteEjecutivo.css';

const RIESGOS_IDENTIFICACION_VACIOS = [];
const FILAS_IDENTIFICACION_VACIAS = [];

const SECCION_INFORMACION_GENERAL = {
  id: 'informacion',
  titleKey: 'riskMatrix.reportView.infoTitle',
  descriptionKey: 'riskMatrix.reportView.infoDesc',
  icon: FaBullseye,
};

const SECCIONES_EJECUTIVAS = [
  {
    id: 'dashboard',
    titleKey: 'riskMatrix.reportView.dashTitle',
    descriptionKey: 'riskMatrix.reportView.dashDesc',
    icon: FaTachometerAlt,
  },
  {
    id: 'top10',
    titleKey: 'riskMatrix.reportView.top10Title',
    descriptionKey: 'riskMatrix.reportView.top10Desc',
    icon: FaExclamationTriangle,
  },
  {
    id: 'semaforo',
    titleKey: 'riskMatrix.reportView.trafficTitle',
    descriptionKey: 'riskMatrix.reportView.trafficDesc',
    icon: FaTrafficLight,
  },
  {
    id: 'hallazgos',
    titleKey: 'riskMatrix.reportView.findingsTitle',
    descriptionKey: 'riskMatrix.reportView.findingsDesc',
    icon: FaLightbulb,
  },
  {
    id: 'comparativo',
    titleKey: 'riskMatrix.reportView.compareTitle',
    descriptionKey: 'riskMatrix.reportView.compareDesc',
    icon: FaChartLine,
  },
  {
    id: 'graficos',
    titleKey: 'riskMatrix.reportView.chartsTitle',
    descriptionKey: 'riskMatrix.reportView.chartsDesc',
    icon: FaChartBar,
  },
  {
    id: 'recomendaciones-priorizadas',
    titleKey: 'riskMatrix.reportView.recTitle',
    descriptionKey: 'riskMatrix.reportView.recDesc',
    icon: FaClipboardList,
  },
  {
    id: 'resumen-ejecutivo',
    titleKey: 'riskMatrix.reportView.summaryTitle',
    descriptionKey: 'riskMatrix.reportView.summaryDesc',
    icon: FaFileAlt,
  },
  {
    id: 'madurez',
    titleKey: 'riskMatrix.reportView.maturityTitle',
    descriptionKey: 'riskMatrix.reportView.maturityDesc',
    icon: FaGraduationCap,
  },
  {
    id: 'exportacion',
    titleKey: 'riskMatrix.reportView.exportTitle',
    descriptionKey: 'riskMatrix.reportView.exportDesc',
    icon: FaUpload,
  },
];

const SECCIONES_TECNICAS = [
  {
    id: 'identificacion',
    titleKey: 'riskMatrix.reportView.techIdentTitle',
    descriptionKey: 'riskMatrix.reportView.techIdentDesc',
    icon: FaSearch,
  },
  {
    id: 'valoracion',
    titleKey: 'riskMatrix.reportView.techAssessTitle',
    descriptionKey: 'riskMatrix.reportView.techAssessDesc',
    icon: FaChartBar,
  },
  {
    id: 'mapa-calor',
    titleKey: 'riskMatrix.reportView.techHeatTitle',
    descriptionKey: 'riskMatrix.reportView.techHeatDesc',
    icon: FaFire,
  },
  {
    id: 'gestion-riesgos',
    titleKey: 'riskMatrix.reportView.techMgmtTitle',
    descriptionKey: 'riskMatrix.reportView.techMgmtDesc',
    icon: FaShieldAlt,
  },
];

const noop = () => {};

function scrollASeccion(id) {
  const el = document.getElementById(`reporte-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function VistaReporteMatriz() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [payload] = useState(() => leerDatosReporteMatriz());
  const [listoParaImprimir, setListoParaImprimir] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [analitica, setAnalitica] = useState(null);
  const contenidoRef = useRef(null);

  useTablasArrastrables(contenidoRef, [payload, listoParaImprimir]);

  useEffect(() => {
    document.documentElement.classList.add('reporte-matriz-impresion');
    document.documentElement.style.setProperty('print-color-adjust', 'exact');
    document.documentElement.style.setProperty('-webkit-print-color-adjust', 'exact');
    return () => {
      document.documentElement.classList.remove('reporte-matriz-impresion');
      document.documentElement.style.removeProperty('print-color-adjust');
      document.documentElement.style.removeProperty('-webkit-print-color-adjust');
    };
  }, []);

  useEffect(() => {
    if (!payload) return undefined;
    const timer = setTimeout(() => setListoParaImprimir(true), 900);
    return () => clearTimeout(timer);
  }, [payload]);

  useEffect(() => {
    if (!analitica) return undefined;
    const params = new URLSearchParams(window.location.search);
    const seccion = params.get('seccion');
    if (!seccion) return undefined;
    const timer = setTimeout(() => scrollASeccion(seccion), 700);
    return () => clearTimeout(timer);
  }, [analitica]);

  const datosMatriz = payload?.datosMatriz;
  const tipoReporte = payload?.tipoReporte || 'inicial';

  const descargarHtml = useCallback(async () => {
    if (!datosMatriz) return;
    setDescargando(true);
    try {
      await ReporteService.exportarReporteHTML(datosMatriz, 'reporte_matriz_riesgos', tipoReporte);
    } finally {
      setDescargando(false);
    }
  }, [datosMatriz, tipoReporte]);

  const informacion = datosMatriz?.informacion || {};
  const matrizId = payload?.matrizId || null;

  useEffect(() => {
    if (!datosMatriz) {
      setAnalitica(null);
      return undefined;
    }

    let cancelado = false;

    async function construirAnalitica() {
      const historico = await cargarHistoricoMatricesEmpresa(
        informacion.nombreEmpresa,
        matrizId
      );
      if (!cancelado) {
        setAnalitica(calcularAnaliticaMatriz(datosMatriz, { historicoMatrices: historico }));
      }
    }

    construirAnalitica();
    return () => {
      cancelado = true;
    };
  }, [datosMatriz, informacion.nombreEmpresa, matrizId, i18n.language]);

  const navegarSeccion = useCallback((id) => {
    const destino = {
      recomendaciones: 'recomendaciones-priorizadas',
    }[id] || id;
    scrollASeccion(destino);
  }, []);

  const fechaTexto = useMemo(() => {
    const fecha = new Date();
    const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
    return `${fecha.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })} · ${fecha.toLocaleTimeString(locale)}`;
  }, [i18n.language]);

  if (!payload || !datosMatriz) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fenix-fondo p-6 text-center">
        <p className="font-body text-gray-600">
          {t('riskMatrix.reportView.empty')}
        </p>
        <button
          type="button"
          className="reporte-print-btn matriz-btn-primary"
          onClick={() => navigate('/matrices-riesgo')}
        >
          {t('riskMatrix.reportView.goToMatrices')}
        </button>
      </div>
    );
  }

  return (
    <div className="vista-reporte-matriz bg-fenix-fondo">
      <div className="reporte-barra-acciones no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="reporte-print-btn inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft />
            {t('riskMatrix.reportView.back')}
          </button>
          <p>{t('riskMatrix.reportView.barHint')}</p>
        </div>
        <button
          type="button"
          className="reporte-print-btn matriz-btn-primary"
          onClick={descargarHtml}
          disabled={descargando}
          title={t('riskMatrix.reportView.downloadHtmlTitle')}
        >
          <FaDownload />
          {descargando
            ? t('riskMatrix.reportView.generating')
            : t('riskMatrix.reportView.downloadHtml')}
        </button>
      </div>

      <div className="reporte-layout-grid">
        <aside className="reporte-sidebar no-print" aria-label={t('riskMatrix.reportView.navAria')}>
          <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('riskMatrix.reportView.generalReport')}
          </p>
          {(() => {
            const IconInfo = SECCION_INFORMACION_GENERAL.icon;
            return (
              <button
                type="button"
                className="reporte-nav-link"
                onClick={() => scrollASeccion(SECCION_INFORMACION_GENERAL.id)}
              >
                <span className="reporte-nav-icon">
                  <IconInfo />
                </span>
                <span>
                  <span className="reporte-nav-texto-titulo">
                    {t(SECCION_INFORMACION_GENERAL.titleKey)}
                  </span>
                  <span className="reporte-nav-texto-desc">
                    {t(SECCION_INFORMACION_GENERAL.descriptionKey)}
                  </span>
                </span>
              </button>
            );
          })()}
          <p className="mb-3 mt-4 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('riskMatrix.reportView.executiveReading')}
          </p>
          {SECCIONES_EJECUTIVAS.map((seccion) => {
            const Icon = seccion.icon;
            return (
              <button
                key={seccion.id}
                type="button"
                className="reporte-nav-link"
                onClick={() => scrollASeccion(seccion.id)}
              >
                <span className="reporte-nav-icon">
                  <Icon />
                </span>
                <span>
                  <span className="reporte-nav-texto-titulo">{t(seccion.titleKey)}</span>
                  <span className="reporte-nav-texto-desc">{t(seccion.descriptionKey)}</span>
                </span>
              </button>
            );
          })}
          <p className="mb-3 mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t('riskMatrix.reportView.technicalDetail')}
          </p>
          {SECCIONES_TECNICAS.map((seccion) => {
            const Icon = seccion.icon;
            return (
              <button
                key={seccion.id}
                type="button"
                className="reporte-nav-link"
                onClick={() => scrollASeccion(seccion.id)}
              >
                <span className="reporte-nav-icon">
                  <Icon />
                </span>
                <span>
                  <span className="reporte-nav-texto-titulo">{t(seccion.titleKey)}</span>
                  <span className="reporte-nav-texto-desc">{t(seccion.descriptionKey)}</span>
                </span>
              </button>
            );
          })}
        </aside>

        <main ref={contenidoRef} className="reporte-contenido matriz-fenix-scope">
          <header className="reporte-cabecera-marcas">
            <div className="reporte-cabecera-logos">
              <img
                src={arnaldLogo}
                alt="ARNALD Data Flow"
                className="reporte-logo-arnald reporte-logo-arnald--pantalla"
              />
              <img
                src={arnaldLogo}
                alt="ARNALD Data Flow"
                className="reporte-logo-arnald reporte-logo-arnald--impresion"
              />
              <img src={logoProser} alt="Grupo Proser" className="reporte-logo-proser" />
            </div>
            <div className="reporte-cabecera-titulo">
              <h1>{t('riskMatrix.reportView.title')}</h1>
              <p>
                {informacion.nombreEmpresa || t('riskMatrix.reportView.companyFallback')} ·{' '}
                {tipoReporte === 'anual'
                  ? t('riskMatrix.annualAssessment')
                  : t('riskMatrix.initialAssessment')}
              </p>
              <p>{t('riskMatrix.reportView.generatedOn', { date: fechaTexto })}</p>
              {informacion.responsable ? (
                <p>{t('riskMatrix.reportView.responsible', { name: informacion.responsable })}</p>
              ) : null}
            </div>
          </header>

          <section id="reporte-informacion" className="reporte-seccion-bloque">
            <InformacionMatriz datos={datosMatriz.informacion} onDatosChange={noop} modoReporte />
          </section>

          {analitica ? (
            <>
              <section id="reporte-dashboard" className="reporte-seccion-bloque">
                <DashboardEjecutivo analitica={analitica} onNavegar={navegarSeccion} />
              </section>

              <section id="reporte-top10" className="reporte-seccion-bloque">
                <Top10Riesgos analitica={analitica} />
              </section>

              <section id="reporte-semaforo" className="reporte-seccion-bloque">
                <SemaforoGerencial analitica={analitica} />
              </section>

              <section id="reporte-hallazgos" className="reporte-seccion-bloque">
                <HallazgosAutomaticos analitica={analitica} />
              </section>

              <section id="reporte-comparativo" className="reporte-seccion-bloque">
                <ComparativoInhRes analitica={analitica} />
              </section>

              <section id="reporte-graficos" className="reporte-seccion-bloque">
                <GraficosEjecutivos analitica={analitica} />
              </section>

              <section id="reporte-recomendaciones-priorizadas" className="reporte-seccion-bloque">
                <RecomendacionesPriorizadas analitica={analitica} />
              </section>

              <section id="reporte-resumen-ejecutivo" className="reporte-seccion-bloque">
                <ResumenEjecutivo analitica={analitica} />
              </section>

              <section id="reporte-madurez" className="reporte-seccion-bloque">
                <IndicadorMadurez analitica={analitica} />
              </section>

              <section id="reporte-exportacion" className="reporte-seccion-bloque">
                <ExportacionReporte
                  datosMatriz={datosMatriz}
                  tipoReporte={tipoReporte}
                  analitica={analitica}
                  matrizId={matrizId}
                />
              </section>
            </>
          ) : (
            <div className="reporte-seccion-bloque p-6 text-center text-gray-500">
              {t('riskMatrix.reportView.loadingAnalytics')}
            </div>
          )}

          <section id="reporte-identificacion" className="reporte-seccion-bloque">
            <ReporteAvisoTablaAncha titulo={t('riskMatrix.reportView.identificationNotice')} />
            <IdentificacionRiesgos datos={datosMatriz.identificacion} onDatosChange={noop} modoReporte />
          </section>

          <section id="reporte-valoracion" className="reporte-seccion-bloque">
            <ReporteAvisoTablaAncha titulo={t('riskMatrix.reportView.assessmentNotice')} />
            <ValoracionRiesgos
              datos={datosMatriz.valoracion}
              onDatosChange={noop}
              modoReporte
              riesgosIdentificacion={datosMatriz.identificacion?.riesgos ?? RIESGOS_IDENTIFICACION_VACIOS}
              filasIdentificacionFormulario={
                datosMatriz.identificacion?.filasFormulario ?? FILAS_IDENTIFICACION_VACIAS
              }
            />
          </section>

          <section id="reporte-mapa-calor" className="reporte-seccion-bloque">
            <MapaCalorRiesgos datos={datosMatriz} onDatosChange={noop} tipoReporte={tipoReporte} />
          </section>

          <section id="reporte-gestion-riesgos" className="reporte-seccion-bloque">
            <GestionRiesgos datos={datosMatriz.gestionRiesgos} onDatosChange={noop} modoReporte />
          </section>

          <footer className="reporte-pie-pagina rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-500">
            <p className="font-semibold text-gray-700">{t('riskMatrix.reportView.footerBrand')}</p>
            <p className="mt-1">{t('riskMatrix.reportView.footerConfidential')}</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
