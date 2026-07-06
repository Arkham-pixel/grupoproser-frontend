import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBullseye,
  FaChartBar,
  FaDownload,
  FaFire,
  FaSearch,
  FaShieldAlt,
} from 'react-icons/fa';
import { ReporteService } from '../../services/reporteService';
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

const RIESGOS_IDENTIFICACION_VACIOS = [];
const FILAS_IDENTIFICACION_VACIAS = [];

const SECCIONES = [
  {
    id: 'informacion',
    titulo: 'Información',
    descripcion: 'Datos de la empresa y responsables',
    icon: FaBullseye,
  },
  {
    id: 'identificacion',
    titulo: 'Identificación',
    descripcion: 'Riesgos identificados por proceso',
    icon: FaSearch,
  },
  {
    id: 'valoracion',
    titulo: 'Valoración',
    descripcion: 'Probabilidad, impacto y controles',
    icon: FaChartBar,
  },
  {
    id: 'mapa-calor',
    titulo: 'Mapa de calor',
    descripcion: 'Visualización inherente y residual',
    icon: FaFire,
  },
  {
    id: 'gestion-riesgos',
    titulo: 'Recomendaciones',
    descripcion: 'Gestión y seguimiento',
    icon: FaShieldAlt,
  },
];

const noop = () => {};

function scrollASeccion(id) {
  const el = document.getElementById(`reporte-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function VistaReporteMatriz() {
  const navigate = useNavigate();
  const [payload] = useState(() => leerDatosReporteMatriz());
  const [listoParaImprimir, setListoParaImprimir] = useState(false);
  const [descargando, setDescargando] = useState(false);
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

  const fechaTexto = useMemo(() => {
    const fecha = new Date();
    return `${fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })} · ${fecha.toLocaleTimeString('es-ES')}`;
  }, []);

  if (!payload || !datosMatriz) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-fenix-fondo p-6 text-center">
        <p className="font-body text-gray-600">
          No hay datos de reporte. Genere el reporte desde la matriz de riesgos.
        </p>
        <button
          type="button"
          className="reporte-print-btn matriz-btn-primary"
          onClick={() => navigate('/matrices-riesgo')}
        >
          Ir a matrices de riesgo
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
            Volver
          </button>
          <p>
            <strong>Vista interactiva</strong> — clic sostenido y arrastre sobre las tablas anchas.
            No use PDF: es una captura fija.
          </p>
        </div>
        <button
          type="button"
          className="reporte-print-btn matriz-btn-primary"
          onClick={descargarHtml}
          disabled={descargando}
        >
          <FaDownload />
          {descargando ? 'Generando…' : 'Descargar .html'}
        </button>
      </div>

      <div className="reporte-layout-grid">
        <aside className="reporte-sidebar no-print" aria-label="Navegación del reporte">
          <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Secciones</p>
          {SECCIONES.map((seccion) => {
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
                  <span className="reporte-nav-texto-titulo">{seccion.titulo}</span>
                  <span className="reporte-nav-texto-desc">{seccion.descripcion}</span>
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
              <h1>Matriz de Riesgos</h1>
              <p>
                {informacion.nombreEmpresa || 'Empresa'} · Reporte{' '}
                {tipoReporte === 'anual' ? 'de valoración anual' : 'de valoración inicial'}
              </p>
              <p>Generado el {fechaTexto}</p>
              {informacion.responsable ? <p>Responsable: {informacion.responsable}</p> : null}
            </div>
          </header>

          <section id="reporte-informacion" className="reporte-seccion-bloque">
            <InformacionMatriz datos={datosMatriz.informacion} onDatosChange={noop} modoReporte />
          </section>

          <section id="reporte-identificacion" className="reporte-seccion-bloque">
            <ReporteAvisoTablaAncha titulo="Identificación de riesgos" />
            <IdentificacionRiesgos datos={datosMatriz.identificacion} onDatosChange={noop} modoReporte />
          </section>

          <section id="reporte-valoracion" className="reporte-seccion-bloque">
            <ReporteAvisoTablaAncha titulo="Valoración de riesgos (tabla tipo Excel)" />
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
            <p className="font-semibold text-gray-700">ARNALD Data Flow · Grupo Proser</p>
            <p className="mt-1">Documento confidencial generado desde la plataforma de matriz de riesgos.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
