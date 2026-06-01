import React, { useState, useEffect } from 'react';
import {
  FaBullseye,
  FaChartBar,
  FaClipboardList,
  FaFire,
  FaRocket,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
} from 'react-icons/fa';
import {
  matrizCard,
  matrizCardTitle,
  matrizInput,
  matrizLabel,
  matrizSectionTitle,
  matrizTextarea,
} from './matrizFenixUi';
import {
  MatrizBeneficios,
  MatrizCategoriasGrid,
  MatrizPasosGrid,
  MatrizTabEncabezado,
  MatrizTimelineItem,
} from './MatrizUiBlocks';
import MatrizMapaDemoEducativo from './MatrizMapaDemoEducativo';
import './InformacionMatriz.css';
import './matrizFenixTheme.css';

const DESCRIPCIONES_CATEGORIAS = {
  estrategico: 'Riesgos de decisiones importantes: cambios de mercado, competencia o dirección.',
  cumplimiento: 'Riesgos por no cumplir reglas, contratos o regulaciones.',
  reputacional: 'Riesgos que afectan la imagen y la confianza de la organización.',
  operativo: 'Riesgos del día a día: equipos, personal y procesos.',
  financiero: 'Riesgos económicos: pérdidas, flujo de caja o inversiones.',
  tecnologico: 'Riesgos de sistemas, datos y ciberseguridad.',
  corrupcion: 'Riesgos de conductas indebidas, fraude o abuso de poder.',
  ddhh: 'Riesgos relacionados con derechos humanos y trato digno.',
};

const INFO_TABS = [
  { id: 'intro', label: 'Inicio Rápido', icon: FaRocket },
  { id: 'process', label: 'Proceso', icon: FaSyncAlt },
  { id: 'categories', label: 'Categorías', icon: FaClipboardList },
  { id: 'criteria', label: 'Criterios', icon: FaChartBar },
  { id: 'heatmap', label: 'Mapa de Calor', icon: FaFire },
  { id: 'gestion', label: 'Gestión de Riesgos', icon: FaShieldAlt },
];

const InformacionMatriz = ({ datos, onDatosChange, seccionActiva }) => {
  const [activeTab, setActiveTab] = useState(seccionActiva || 'intro');
  const [informacionGeneral, setInformacionGeneral] = useState(() => {
    const defaultData = {
    nombreEmpresa: '',
    fechaCreacion: new Date().toLocaleDateString('es-ES'),
    responsable: '',
    version: '1.0',
      descripcion: '',
      // Información del ingeniero que recibe la visita
      ingeniero: {
        nombre: '',
        cargo: '',
        telefono: '',
        email: '',
        empresa: '',
        direccion: ''
      },
      // Recomendaciones de gestión de riesgos
      recomendaciones: [
        {
          id: 1,
          recomendacion: '',
          fechaInicial: '',
          fechaImplementacion1: '',
          comentariosImplementacion1: '',
          fechaImplementacion2: '',
          comentariosImplementacion2: ''
        }
      ]
    };

    // Si hay datos existentes, los fusionamos con los valores por defecto
    if (datos) {
      return {
        ...defaultData,
        ...datos,
        // Asegurar que el objeto ingeniero existe y tiene todos los campos
        ingeniero: {
          nombre: '',
          cargo: '',
          telefono: '',
          email: '',
          empresa: '',
          direccion: '',
          ...(datos.ingeniero || {})
        },
        // Asegurar que las recomendaciones existen
        recomendaciones: datos.recomendaciones && datos.recomendaciones.length > 0 
          ? datos.recomendaciones 
          : defaultData.recomendaciones
      };
    }

    return defaultData;
  });

  // Cambiar pestaña activa cuando cambie la prop seccionActiva
  useEffect(() => {
    if (seccionActiva) {
      setActiveTab(seccionActiva);
    }
  }, [seccionActiva]);

  // Guardar datos cuando cambien
  useEffect(() => {
    if (onDatosChange) {
      onDatosChange(informacionGeneral);
    }
  }, [informacionGeneral, onDatosChange]);

  // Funciones para manejar recomendaciones
  const agregarRecomendacion = () => {
    const nuevaRecomendacion = {
      id: Date.now(), // ID único basado en timestamp
      recomendacion: '',
      fechaInicial: '',
      fechaImplementacion1: '',
      comentariosImplementacion1: '',
      fechaImplementacion2: '',
      comentariosImplementacion2: ''
    };

    setInformacionGeneral(prev => ({
      ...prev,
      recomendaciones: [...prev.recomendaciones, nuevaRecomendacion]
    }));
  };

  const eliminarRecomendacion = (id) => {
    setInformacionGeneral(prev => ({
      ...prev,
      recomendaciones: prev.recomendaciones.filter(rec => rec.id !== id)
    }));
  };

  const actualizarRecomendacion = (id, campo, valor) => {
    setInformacionGeneral(prev => ({
      ...prev,
      recomendaciones: prev.recomendaciones.map(rec => 
        rec.id === id ? { ...rec, [campo]: valor } : rec
      )
    }));
  };

  return (
    <div className="informacion-matriz space-y-4">
      {/* Hero — estilo mockup Fenix */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-[#1F1F1F] to-red-950/60 px-6 py-10 text-center text-white sm:py-12">
        <div
          className="pointer-events-none absolute -right-8 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-fenix-primario/20 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fenix-primario/20 text-fenix-primario">
            <FaBullseye className="text-2xl" />
          </div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            ¡Domina la Gestión de Riesgos!
          </h1>
          <p className="mt-3 font-body text-sm leading-relaxed text-gray-300 sm:text-base">
            Aprende a identificar, evaluar y gestionar riesgos como un profesional.
            <br />
            <strong className="text-white">¡En solo 3 pasos simples!</strong>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <span className="block font-accent text-2xl font-bold text-amber-400 sm:text-3xl">
                3
              </span>
              <span className="font-body text-xs text-gray-400 sm:text-sm">Pasos Simples</span>
            </div>
            <div className="text-center">
              <span className="block font-accent text-2xl font-bold text-amber-400 sm:text-3xl">
                8
              </span>
              <span className="font-body text-xs text-gray-400 sm:text-sm">Categorías</span>
            </div>
            <div className="text-center">
              <span className="block font-accent text-2xl font-bold text-amber-400 sm:text-3xl">
                100%
              </span>
              <span className="font-body text-xs text-gray-400 sm:text-sm">Efectivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
        <div className="flex min-w-max justify-center gap-0 px-2">
          {INFO_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const activo = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 font-body text-sm font-semibold transition sm:px-5 ${
                  activo
                    ? 'border-fenix-primario text-fenix-primario'
                    : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <TabIcon className="text-base shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'intro' && (
          <div className="intro-tab">
            <div className={`welcome-card ${matrizCard}`}>
              <h2 className={matrizCardTitle}>Bienvenido a la gestión de riesgos</h2>
              <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                El <strong>90%</strong> de las empresas que gestionan riesgos correctamente
                sobreviven a las crisis con mayor solidez operativa.
              </p>
            </div>

            <div className={`info-form-card ${matrizCard}`}>
              <h3 className={matrizCardTitle}>Información general de la matriz</h3>
              <div className="info-form-grid">
                <div className="form-group">
                  <label htmlFor="nombreEmpresa" className={matrizLabel}>
                    Nombre de la empresa
                  </label>
                  <input
                    type="text"
                    id="nombreEmpresa"
                    value={informacionGeneral.nombreEmpresa}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({ ...prev, nombreEmpresa: e.target.value }))
                    }
                    placeholder="Ej: Empresa ABC S.A.S."
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="responsable" className={matrizLabel}>
                    Responsable
                  </label>
                  <input
                    type="text"
                    id="responsable"
                    value={informacionGeneral.responsable}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({ ...prev, responsable: e.target.value }))
                    }
                    placeholder="Ej: Juan Pérez"
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="version" className={matrizLabel}>
                    Versión
                  </label>
                  <input
                    type="text"
                    id="version"
                    value={informacionGeneral.version}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({ ...prev, version: e.target.value }))
                    }
                    placeholder="Ej: 1.0"
                    className={matrizInput}
                  />
                </div>
                <div className="form-group full-width sm:col-span-2">
                  <label htmlFor="descripcion" className={matrizLabel}>
                    Descripción
                  </label>
                  <textarea
                    id="descripcion"
                    value={informacionGeneral.descripcion}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                    placeholder="Describe el propósito de esta matriz de riesgos..."
                    className={matrizTextarea}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className={`info-form-card ${matrizCard}`}>
              <h3 className={matrizCardTitle}>Información del ingeniero (visita)</h3>
              <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
                Datos de contacto del profesional responsable de recibir la inspección
              </p>
              <div className="info-form-grid">
                <div className="form-group">
                  <label htmlFor="ingenieroNombre" className={matrizLabel}>
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="ingenieroNombre"
                    value={informacionGeneral.ingeniero.nombre}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({
                        ...prev,
                        ingeniero: { ...prev.ingeniero, nombre: e.target.value },
                      }))
                    }
                    placeholder="Ej: Carlos Alberto Rodríguez"
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ingenieroCargo" className={matrizLabel}>
                    Cargo
                  </label>
                  <input
                    type="text"
                    id="ingenieroCargo"
                    value={informacionGeneral.ingeniero.cargo}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({
                        ...prev,
                        ingeniero: { ...prev.ingeniero, cargo: e.target.value },
                      }))
                    }
                    placeholder="Ej: Ingeniero de Seguridad"
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ingenieroTelefono" className={matrizLabel}>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="ingenieroTelefono"
                    value={informacionGeneral.ingeniero.telefono}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({
                        ...prev,
                        ingeniero: { ...prev.ingeniero, telefono: e.target.value },
                      }))
                    }
                    placeholder="Ej: +57 300 123 4567"
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ingenieroEmail" className={matrizLabel}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="ingenieroEmail"
                    value={informacionGeneral.ingeniero.email}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({
                        ...prev,
                        ingeniero: { ...prev.ingeniero, email: e.target.value },
                      }))
                    }
                    placeholder="Ej: carlos.rodriguez@empresa.com"
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ingenieroEmpresa" className={matrizLabel}>
                    Empresa
                  </label>
                  <input
                    type="text"
                    id="ingenieroEmpresa"
                    value={informacionGeneral.ingeniero.empresa}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({
                        ...prev,
                        ingeniero: { ...prev.ingeniero, empresa: e.target.value },
                      }))
                    }
                    placeholder="Ej: Constructora ABC S.A.S."
                    className={matrizInput}
                  />
                </div>
                <div className="form-group full-width sm:col-span-2">
                  <label htmlFor="ingenieroDireccion" className={matrizLabel}>
                    Dirección
                  </label>
                  <textarea
                    id="ingenieroDireccion"
                    value={informacionGeneral.ingeniero.direccion}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({
                        ...prev,
                        ingeniero: { ...prev.ingeniero, direccion: e.target.value },
                      }))
                    }
                    placeholder="Dirección completa de la empresa o lugar de la visita..."
                    className={matrizTextarea}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <MatrizPasosGrid />
            <MatrizBeneficios />
          </div>
        )}

        {activeTab === 'process' && (
          <div className="process-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaSyncAlt}
              title="El proceso paso a paso"
              description="Sigue el flujo de la matriz: identificar, valorar y visualizar."
            />
            <div className="process-timeline space-y-3">
              <MatrizTimelineItem
                numero={1}
                icon={FaSearch}
                title="Identificación de riesgos"
                description="Registra procesos, riesgos identificados y categorías en la tabla de identificación."
                tips={[
                  'Piensa en todo lo que puede salir mal',
                  'Anota todo, aunque parezca menor',
                  'Consulta con tu equipo',
                ]}
              />
              <MatrizTimelineItem
                numero={2}
                icon={FaChartBar}
                title="Valoración y análisis"
                description="Asigna probabilidad, impacto, controles y riesgo residual a cada riesgo."
                tips={[
                  'Probabilidad: ¿qué tan probable es que ocurra?',
                  'Impacto: ¿qué tan grave sería?',
                  'Usa los criterios de la pestaña Criterios',
                ]}
              />
              <MatrizTimelineItem
                numero={3}
                icon={FaFire}
                title="Mapa de calor"
                description="Visualiza inherentes y residuales en la matriz 5×5 con códigos de color."
                tips={[
                  'Rojo = prioridad alta, actuar pronto',
                  'Amarillo = vigilar de cerca',
                  'Verde = riesgo bajo por ahora',
                ]}
              />
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="categories-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaClipboardList}
              title="Las 8 categorías de riesgo"
              description="Marca la categoría que aplique en la tabla de identificación."
            />
            <MatrizCategoriasGrid descripciones={DESCRIPCIONES_CATEGORIAS} />
          </div>
        )}

        {activeTab === 'criteria' && (
          <div className="criteria-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaChartBar}
              title="Criterios de valoración"
              description="Escala de probabilidad e impacto para calificar cada riesgo."
            />

            <div className="criteria-sections">
              <div className="criteria-section">
                <h3 className={matrizSectionTitle}>Probabilidad: ¿qué tan probable es?</h3>
                <p>Es como predecir el clima, pero de riesgos</p>
                
                <div className="probability-cards">
                  <div className="prob-card muy-baja">
                    <div className="prob-header">
                      <span className="prob-number">1</span>
                      <h4>Muy Baja (Remoto)</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>Máximo 1 vez al año</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>0% - 20% de probabilidad</span>
                      </div>
                    </div>
                    <p className="prob-description">Como que te caiga un meteorito</p>
                  </div>

                  <div className="prob-card baja">
                    <div className="prob-header">
                      <span className="prob-number">2</span>
                      <h4>Baja (Poco probable)</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>1 vez al año</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>21% - 40% de probabilidad</span>
                      </div>
                    </div>
                    <p className="prob-description">Como que llueva en el desierto</p>
                  </div>

                  <div className="prob-card media">
                    <div className="prob-header">
                      <span className="prob-number">3</span>
                      <h4>Media (Posible)</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>1 vez cada 6 meses</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>41% - 60% de probabilidad</span>
                      </div>
                    </div>
                    <p className="prob-description">Como que llueva en primavera</p>
                  </div>

                  <div className="prob-card alta">
                    <div className="prob-header">
                      <span className="prob-number">4</span>
                      <h4>Alta (Probable)</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>1 vez cada 3 meses</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>61% - 80% de probabilidad</span>
                      </div>
                    </div>
                    <p className="prob-description">Como que llueva en invierno</p>
                  </div>

                  <div className="prob-card muy-alta">
                    <div className="prob-header">
                      <span className="prob-number">5</span>
                      <h4>Muy Alta (Casi seguro)</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>1 vez al mes</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>81% - 100% de probabilidad</span>
                      </div>
                    </div>
                    <p className="prob-description">Como que salga el sol cada día</p>
                  </div>
                </div>
              </div>

              <div className="criteria-section">
                <h3 className={matrizSectionTitle}>Impacto: ¿qué tan grave sería?</h3>
                <p>Es como medir qué tan grande es el problema</p>
                
                <div className="impact-cards">
                  <div className="impact-card insignificante">
                    <div className="impact-header">
                      <span className="impact-number">1</span>
                      <h4>Insignificante</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>Económico:</strong> Hasta $50 millones</div>
                      <div className="area-item">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos administrativos, sin detenerlos</div>
                      <div className="area-item">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad del personal administrativo de la empresa</div>
                      <div className="area-item">⚖️ <strong>Legal:</strong> Quejas, reclamos u observaciones de miembros de la comunidad empresarial</div>
                    </div>
                    <p className="impact-description">Como un rasguño pequeño</p>
                  </div>

                  <div className="impact-card menor">
                    <div className="impact-header">
                      <span className="impact-number">2</span>
                      <h4>Menor</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>Económico:</strong> Hasta $100 millones</div>
                      <div className="area-item">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos administrativos, llevando a su detención</div>
                      <div className="area-item">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad de los empleados de la empresa</div>
                      <div className="area-item">⚖️ <strong>Legal:</strong> Incumplimiento de políticas internas, lineamientos, regulaciones y procedimientos</div>
                    </div>
                    <p className="impact-description">Como un golpe en el brazo</p>
                  </div>

                  <div className="impact-card moderado">
                    <div className="impact-header">
                      <span className="impact-number">3</span>
                      <h4>Moderado</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>Económico:</strong> Hasta $250 millones</div>
                      <div className="area-item">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos misionales críticos, sin detenerlos</div>
                      <div className="area-item">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad de los empleados de la empresa y se despliega en redes sociales</div>
                      <div className="area-item">⚖️ <strong>Legal:</strong> Quejas, reclamos u observaciones de entidades de control o judiciales con plazo para cumplimiento de acciones</div>
                    </div>
                    <p className="impact-description">Como una herida que duele</p>
                  </div>

                  <div className="impact-card mayor">
                    <div className="impact-header">
                      <span className="impact-number">4</span>
                      <h4>Mayor</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>Económico:</strong> Hasta $500 millones</div>
                      <div className="area-item">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos misionales críticos, hasta su detención</div>
                      <div className="area-item">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad del público externo de la empresa (comunidad, proveedores, usuarios, empresas, asociaciones, entre otros) y se despliega en medios de comunicación regionales</div>
                      <div className="area-item">⚖️ <strong>Legal:</strong> Quejas, reclamos u observaciones de entidades de control o judiciales que impliquen multas o sanciones</div>
                    </div>
                    <p className="impact-description">Como una fractura</p>
                  </div>

                  <div className="impact-card catastrofico">
                    <div className="impact-header">
                      <span className="impact-number">5</span>
                      <h4>Catastrófico</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>Económico:</strong> Más de $501 millones</div>
                      <div className="area-item">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos misionales críticos y administrativos, llevando a su detención total</div>
                      <div className="area-item">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad del público externo de la empresa y se despliega en medios de comunicación nacionales o internacionales</div>
                      <div className="area-item">⚖️ <strong>Legal:</strong> Intervenciones de entidades de control o judiciales</div>
                    </div>
                    <p className="impact-description">Como un accidente grave</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="tips-section">
              <h3>💡 Consejos de Experto</h3>
              <div className="tips-grid">
                <div className="tip-card">
                  <span className="tip-icon">📊</span>
                  <h4>Usa Datos Históricos</h4>
                  <p>Mira el pasado para predecir el futuro. ¡Es como leer el horóscopo pero con datos reales!</p>
                </div>
                <div className="tip-card">
                  <span className="tip-icon">👥</span>
                  <h4>Consulta a Expertos</h4>
                  <p>Pregunta a quienes saben. ¡No seas tímido, todos tienen algo que aportar!</p>
                </div>
                <div className="tip-card">
                  <span className="tip-icon">🎯</span>
                  <h4>Sé Consistente</h4>
                  <p>Usa los mismos criterios para todo. ¡Como seguir una receta de cocina!</p>
                </div>
                <div className="tip-card">
                  <span className="tip-icon">🔄</span>
                  <h4>Revisa Regularmente</h4>
                  <p>Las cosas cambian. ¡Como actualizar tu teléfono, pero de riesgos!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'heatmap' && (
          <div className="heatmap-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaFire}
              title="Mapa de calor de riesgos"
              description="Tu brújula visual para priorizar riesgos inherentes y residuales."
            />

            <div className={`${matrizCard} heatmap-explanation`}>
              <h3 className={matrizSectionTitle}>¿Qué es un mapa de calor?</h3>
              <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                Es una visualización que combina la <strong>probabilidad</strong> y el{' '}
                <strong>impacto</strong> de cada riesgo en una matriz de colores, como un semáforo
                para priorizar acciones.
              </p>
            </div>

            <MatrizMapaDemoEducativo />

            {/* Cómo Interpretar el Mapa */}
            <div className={`${matrizCard} heatmap-interpretation`}>
              <h3 className={matrizSectionTitle}>¿Cómo interpretar el mapa?</h3>
              <p className="interpretation-intro">
                Cada color tiene un significado específico y te dice exactamente qué acción tomar:
              </p>
              
              <div className="interpretation-grid">
                <div className="interpretation-card critical">
                  <div className="interpretation-icon">🚨</div>
                  <h4>CRÍTICO</h4>
                  <p>Riesgos que amenazan la supervivencia de la organización. <strong>Acción inmediata requerida.</strong></p>
                  <div className="action-required">
                    <span className="action-label">Acción:</span>
                    <span className="action-text">Detener operaciones si es necesario</span>
                  </div>
                </div>

                <div className="interpretation-card high">
                  <div className="interpretation-icon">🔴</div>
                  <h4>ALTO</h4>
                  <p>Riesgos significativos que requieren atención prioritaria. <strong>Plan de acción urgente.</strong></p>
                  <div className="action-required">
                    <span className="action-label">Acción:</span>
                    <span className="action-text">Implementar controles inmediatamente</span>
                  </div>
                </div>

                <div className="interpretation-card medium">
                  <div className="interpretation-icon">🟡</div>
                  <h4>MEDIO</h4>
                  <p>Riesgos moderados que necesitan monitoreo y planificación. <strong>Vigilancia activa.</strong></p>
                  <div className="action-required">
                    <span className="action-label">Acción:</span>
                    <span className="action-text">Desarrollar plan de mitigación</span>
                  </div>
                </div>

                <div className="interpretation-card low">
                  <div className="interpretation-icon">🟢</div>
                  <h4>BAJO</h4>
                  <p>Riesgos menores que pueden ser aceptados o manejados con controles básicos. <strong>Monitoreo rutinario.</strong></p>
                  <div className="action-required">
                    <span className="action-label">Acción:</span>
                    <span className="action-text">Monitorear periódicamente</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Por qué es importante */}
            <div className={`${matrizCard} heatmap-importance`}>
              <h3 className={matrizSectionTitle}>¿Por qué es importante el mapa de calor?</h3>
              <p className="importance-intro">
                El Mapa de Calor no es solo una visualización bonita, es tu <strong>brújula estratégica</strong> para tomar decisiones inteligentes.
              </p>
              
              <div className="importance-grid">
                <div className="importance-card priority">
                  <div className="importance-icon">🎯</div>
                  <h4>Priorización Inteligente</h4>
                  <p>Identifica instantáneamente qué riesgos necesitan atención inmediata. Los colores te dicen todo: <span className="highlight red">🔴 Rojos = ¡Acción YA!</span>, <span className="highlight yellow">🟡 Amarillos = Vigila</span>, <span className="highlight green">🟢 Verdes = Todo bien</span></p>
                </div>

                <div className="importance-card decision">
                  <div className="importance-icon">📈</div>
                  <h4>Decisiones Basadas en Datos</h4>
                  <p>No más decisiones a ciegas. El mapa te muestra exactamente dónde invertir tu tiempo y recursos para obtener el mayor impacto en la reducción de riesgos.</p>
                </div>

                <div className="importance-card communication">
                  <div className="importance-icon">💬</div>
                  <h4>Comunicación Efectiva</h4>
                  <p>Explica riesgos complejos a cualquier audiencia. Un mapa visual es universal: ejecutivos, equipos técnicos y stakeholders entienden inmediatamente la situación.</p>
                </div>

                <div className="importance-card resource">
                  <div className="importance-icon">💰</div>
                  <h4>Optimización de Recursos</h4>
                  <p>Maximiza tu presupuesto asignando recursos donde realmente importan. Evita desperdiciar dinero en riesgos menores cuando hay problemas mayores.</p>
                </div>

                <div className="importance-card compliance">
                  <div className="importance-icon">⚖️</div>
                  <h4>Cumplimiento Regulatorio</h4>
                  <p>Demuestra a auditores y reguladores que tienes un proceso estructurado de gestión de riesgos. Es tu evidencia de que estás siendo proactivo.</p>
                </div>

                <div className="importance-card competitive">
                  <div className="importance-icon">🏆</div>
                  <h4>Ventaja Competitiva</h4>
                  <p>Las empresas que gestionan riesgos bien sobreviven mejor a las crisis. Es tu seguro de supervivencia empresarial en tiempos turbulentos.</p>
                </div>
              </div>

              <div className="impact-stats">
                <h4>📊 El Impacto Real del Mapa de Calor:</h4>
                <div className="stats-grid">
                  <div className="stat-highlight">
                    <span className="stat-number">85%</span>
                    <span className="stat-text">de las empresas que usan mapas de calor toman mejores decisiones</span>
                  </div>
                  <div className="stat-highlight">
                    <span className="stat-number">60%</span>
                    <span className="stat-text">reducción en tiempo de análisis de riesgos</span>
                  </div>
                  <div className="stat-highlight">
                    <span className="stat-number">90%</span>
                    <span className="stat-text">mejora en comunicación con stakeholders</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cómo Usar el Mapa */}
            <div className="heatmap-usage">
              <h3>🚀 ¿Cómo Usar el Mapa de Calor?</h3>
              
              <div className="usage-steps">
                <div className="usage-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Identifica Riesgos</h4>
                    <p>Primero necesitas tener riesgos identificados y categorizados. Usa la pestaña de Identificación.</p>
                  </div>
                </div>

                <div className="usage-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Evalúa Probabilidad e Impacto</h4>
                    <p>Asigna valores de probabilidad e impacto a cada riesgo usando los criterios establecidos.</p>
                  </div>
                </div>

                <div className="usage-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Visualiza en el Mapa</h4>
                    <p>El mapa se genera automáticamente mostrando cada riesgo en su posición correspondiente.</p>
                  </div>
                </div>

                <div className="usage-step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Toma Acciones</h4>
                    <p>Enfócate en los riesgos rojos primero, luego amarillos, y mantén vigilancia en los verdes.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action específico */}
            <div className="heatmap-cta">
              <h3>🎯 ¿Listo para Crear tu Mapa de Calor?</h3>
              <p>Ahora que entiendes la importancia y el funcionamiento del Mapa de Calor, es hora de ponerlo en práctica.</p>
              <div className="heatmap-cta-buttons">
                <button className="cta-button primary">
                  🔍 Ir a Identificación
                </button>
                <button className="cta-button secondary">
                  📊 Ir a Valoración
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gestion' && (
          <div className="gestion-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaShieldAlt}
              title="Gestión de riesgos y recomendaciones"
              description="Documenta recomendaciones, fechas de implementación y seguimiento."
            />

            {/* ¿Por qué son importantes las recomendaciones? */}
            <div className={`${matrizCard} gestion-explanation`}>
              <h3 className={matrizSectionTitle}>¿Por qué son importantes las recomendaciones?</h3>
              <p className="explanation-text">
                Las recomendaciones son el <strong>puente entre la identificación de riesgos y la acción</strong>. 
                Sin recomendaciones claras y específicas, los riesgos identificados se quedan como simples 
                observaciones sin seguimiento ni resolución.
              </p>
            </div>

            {/* Beneficios de las Recomendaciones */}
            <div className={`${matrizCard} beneficios-section`}>
              <h3 className={matrizSectionTitle}>Beneficios de implementar recomendaciones</h3>
              <p className="beneficios-intro">Las recomendaciones bien implementadas transforman tu organización:</p>
              
              <div className="beneficios-grid">
                <div className="beneficio-card">
                  <div className="beneficio-icon">🎯</div>
                  <h4>Acción Dirigida</h4>
                  <p>Conviertes problemas identificados en soluciones específicas y medibles</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">📈</div>
                  <h4>Mejora Continua</h4>
                  <p>Cada recomendación implementada fortalece tu organización</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">🛡️</div>
                  <h4>Protección Proactiva</h4>
                  <p>Previenes problemas antes de que se conviertan en crisis</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">💰</div>
                  <h4>Ahorro de Costos</h4>
                  <p>Es más barato prevenir que corregir después</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">👥</div>
                  <h4>Compromiso del Equipo</h4>
                  <p>Involucra a todos en la mejora de procesos</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">📊</div>
                  <h4>Medición de Progreso</h4>
                  <p>Puedes medir el impacto de tus acciones</p>
                </div>
              </div>
            </div>

            {/* Proceso de Recomendaciones */}
            <div className={`${matrizCard} proceso-section`}>
              <h3 className={matrizSectionTitle}>Proceso de recomendaciones</h3>
              <p className="proceso-intro">Sigue estos pasos para maximizar el impacto de tus recomendaciones:</p>
              
              <div className="proceso-timeline">
                <div className="proceso-item">
                  <div className="proceso-number">1</div>
                  <div className="proceso-content">
                    <h4>📝 Identificar</h4>
                    <p>Detecta oportunidades de mejora basadas en los riesgos encontrados</p>
                  </div>
                </div>

                <div className="proceso-item">
                  <div className="proceso-number">2</div>
                  <div className="proceso-content">
                    <h4>📋 Documentar</h4>
                    <p>Registra la recomendación con fechas y responsables claros</p>
                  </div>
                </div>

                <div className="proceso-item">
                  <div className="proceso-number">3</div>
                  <div className="proceso-content">
                    <h4>🎯 Implementar</h4>
                    <p>Ejecuta la recomendación con seguimiento detallado</p>
                  </div>
                </div>

                <div className="proceso-item">
                  <div className="proceso-number">4</div>
                  <div className="proceso-content">
                    <h4>📊 Medir</h4>
                    <p>Evalúa el impacto y documenta los resultados</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="gestion-cta">
              <h3>🚀 ¿Listo para Crear tus Recomendaciones?</h3>
              <p>Ve a la sección "Gestión de Riesgos" para comenzar a registrar y dar seguimiento a tus recomendaciones.</p>
              <div className="gestion-cta-buttons">
                <button className="cta-button primary" onClick={() => window.location.hash = '#gestion-riesgos'}>
                  🛡️ Ir a Gestión de Riesgos
                </button>
              </div>
            </div>

            {/* ¿Qué es la Gestión de Riesgos? */}
            <div className="gestion-explanation">
              <h3>🎯 ¿Qué es la Gestión de Riesgos?</h3>
              <p className="explanation-text">
                La Gestión de Riesgos es el proceso de <strong>identificar, evaluar y controlar</strong> 
                amenazas que podrían afectar tu organización. Es como tener un <strong>plan de defensa</strong> 
                que te prepara para cualquier situación.
              </p>
            </div>

            {/* Estrategias de Gestión */}
            <div className="estrategias-section">
              <h3>🚀 Estrategias de Gestión</h3>
              <p className="estrategias-intro">Cada riesgo requiere un enfoque diferente. Aquí tienes las estrategias más efectivas:</p>
              
              <div className="estrategias-grid">
                <div className="estrategia-card evitar">
                  <div className="estrategia-header">
                    <span className="estrategia-icon">🚫</span>
                    <h4>Evitar</h4>
                  </div>
                  <p className="estrategia-description">
                    <strong>Eliminar completamente el riesgo</strong> cambiando la actividad o proceso que lo genera.
                  </p>
                  <div className="estrategia-ejemplos">
                    <h5>Ejemplos:</h5>
                    <ul>
                      <li>No realizar actividades peligrosas</li>
                      <li>Cambiar de proveedor problemático</li>
                      <li>Eliminar procesos obsoletos</li>
                    </ul>
                  </div>
                  <div className="estrategia-cuando">
                    <strong>Cuándo usar:</strong> Riesgos críticos que no se pueden controlar
                  </div>
                </div>

                <div className="estrategia-card mitigar">
                  <div className="estrategia-header">
                    <span className="estrategia-icon">🛡️</span>
                    <h4>Mitigar</h4>
                  </div>
                  <p className="estrategia-description">
                    <strong>Reducir la probabilidad o impacto</strong> del riesgo implementando controles.
                  </p>
                  <div className="estrategia-ejemplos">
                    <h5>Ejemplos:</h5>
                    <ul>
                      <li>Capacitación del personal</li>
                      <li>Implementar sistemas de seguridad</li>
                      <li>Establecer procedimientos</li>
                    </ul>
                  </div>
                  <div className="estrategia-cuando">
                    <strong>Cuándo usar:</strong> Riesgos altos que se pueden controlar
                  </div>
                </div>

                <div className="estrategia-card transferir">
                  <div className="estrategia-header">
                    <span className="estrategia-icon">🔄</span>
                    <h4>Transferir</h4>
                  </div>
                  <p className="estrategia-description">
                    <strong>Pasar el riesgo a un tercero</strong> como una aseguradora o socio.
                  </p>
                  <div className="estrategia-ejemplos">
                    <h5>Ejemplos:</h5>
                    <ul>
                      <li>Contratar seguros</li>
                      <li>Subcontratar servicios</li>
                      <li>Crear alianzas estratégicas</li>
                    </ul>
                  </div>
                  <div className="estrategia-cuando">
                    <strong>Cuándo usar:</strong> Riesgos especializados o costosos de manejar
                  </div>
                </div>

                <div className="estrategia-card aceptar">
                  <div className="estrategia-header">
                    <span className="estrategia-icon">✅</span>
                    <h4>Aceptar</h4>
                  </div>
                  <p className="estrategia-description">
                    <strong>Asumir el riesgo</strong> cuando el costo de controlarlo es mayor que el impacto.
                  </p>
                  <div className="estrategia-ejemplos">
                    <h5>Ejemplos:</h5>
                    <ul>
                      <li>Riesgos menores con bajo impacto</li>
                      <li>Riesgos inevitables del negocio</li>
                      <li>Riesgos con costos de control muy altos</li>
                    </ul>
                  </div>
                  <div className="estrategia-cuando">
                    <strong>Cuándo usar:</strong> Riesgos bajos o cuando el control es muy costoso
                  </div>
                </div>
              </div>
            </div>

            {/* Plan de Acción */}
            <div className="plan-accion-section">
              <h3>📋 Plan de Acción por Nivel de Riesgo</h3>
              <p className="plan-intro">Cada nivel de riesgo requiere acciones específicas:</p>
              
              <div className="plan-grid">
                <div className="plan-card critico">
                  <div className="plan-header">
                    <span className="plan-icon">🚨</span>
                    <h4>Riesgos Críticos</h4>
                    <span className="plan-color red"></span>
                  </div>
                  <div className="plan-acciones">
                    <h5>Acciones Inmediatas:</h5>
                    <ul>
                      <li>Detener la actividad si es posible</li>
                      <li>Implementar controles de emergencia</li>
                      <li>Asignar recursos prioritarios</li>
                      <li>Revisión diaria del estado</li>
                    </ul>
                    <div className="plan-tiempo">
                      <strong>⏰ Tiempo:</strong> Inmediato (0-24 horas)
                    </div>
                  </div>
                </div>

                <div className="plan-card alto">
                  <div className="plan-header">
                    <span className="plan-icon">🔴</span>
                    <h4>Riesgos Altos</h4>
                    <span className="plan-color orange"></span>
                  </div>
                  <div className="plan-acciones">
                    <h5>Acciones Urgentes:</h5>
                    <ul>
                      <li>Desarrollar plan de mitigación</li>
                      <li>Asignar responsable específico</li>
                      <li>Implementar controles preventivos</li>
                      <li>Revisión semanal</li>
                    </ul>
                    <div className="plan-tiempo">
                      <strong>⏰ Tiempo:</strong> Urgente (1-7 días)
                    </div>
                  </div>
                </div>

                <div className="plan-card medio">
                  <div className="plan-header">
                    <span className="plan-icon">🟡</span>
                    <h4>Riesgos Medios</h4>
                    <span className="plan-color yellow"></span>
                  </div>
                  <div className="plan-acciones">
                    <h5>Acciones Planificadas:</h5>
                    <ul>
                      <li>Evaluar opciones de control</li>
                      <li>Desarrollar cronograma</li>
                      <li>Asignar recursos moderados</li>
                      <li>Revisión mensual</li>
                    </ul>
                    <div className="plan-tiempo">
                      <strong>⏰ Tiempo:</strong> Planificado (1-4 semanas)
                    </div>
                  </div>
                </div>

                <div className="plan-card bajo">
                  <div className="plan-header">
                    <span className="plan-icon">🟢</span>
                    <h4>Riesgos Bajos</h4>
                    <span className="plan-color green"></span>
                  </div>
                  <div className="plan-acciones">
                    <h5>Acciones de Monitoreo:</h5>
                    <ul>
                      <li>Monitoreo rutinario</li>
                      <li>Documentar estado</li>
                      <li>Revisión periódica</li>
                      <li>Mantener controles básicos</li>
                    </ul>
                    <div className="plan-tiempo">
                      <strong>⏰ Tiempo:</strong> Continuo (revisión trimestral)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Herramientas de Gestión */}
            <div className="herramientas-section">
              <h3>🔧 Herramientas de Gestión</h3>
              <p className="herramientas-intro">Utiliza estas herramientas para implementar tu plan de gestión:</p>
              
              <div className="herramientas-grid">
                <div className="herramienta-card">
                  <div className="herramienta-icon">📊</div>
                  <h4>Matriz de Riesgos</h4>
                  <p>Visualiza y prioriza tus riesgos de forma clara y profesional</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">📋</div>
                  <h4>Planes de Acción</h4>
                  <p>Desarrolla estrategias específicas para cada riesgo identificado</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">👥</div>
                  <h4>Asignación de Responsables</h4>
                  <p>Define quién se encarga de cada acción y cuándo</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">📅</div>
                  <h4>Cronogramas</h4>
                  <p>Establece fechas límite y seguimiento de progreso</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">💰</div>
                  <h4>Presupuestos</h4>
                  <p>Asigna recursos financieros para implementar controles</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">📈</div>
                  <h4>Indicadores</h4>
                  <p>Mide la efectividad de tus acciones de gestión</p>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="gestion-cta">
              <h3>🎯 ¿Listo para Gestionar tus Riesgos?</h3>
              <p>Ahora que conoces las estrategias, es hora de implementarlas en tu organización.</p>
              <div className="gestion-cta-buttons">
                <button className="cta-button primary">
                  🔍 Ver Mis Riesgos
                </button>
                <button className="cta-button secondary">
                  📊 Crear Plan de Acción
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>

    </div>
  );
};

export default InformacionMatriz;