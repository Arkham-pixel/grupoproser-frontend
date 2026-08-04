import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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

const InformacionMatriz = ({ datos, onDatosChange, seccionActiva, modoReporte = false }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(seccionActiva || 'intro');

  const DESCRIPCIONES_CATEGORIAS = {
    estrategico: t('riskMatrix.informacion.categoryDescEstrategico'),
    cumplimiento: t('riskMatrix.informacion.categoryDescCumplimiento'),
    reputacional: t('riskMatrix.informacion.categoryDescReputacional'),
    operativo: t('riskMatrix.informacion.categoryDescOperativo'),
    financiero: t('riskMatrix.informacion.categoryDescFinanciero'),
    tecnologico: t('riskMatrix.informacion.categoryDescTecnologico'),
    corrupcion: t('riskMatrix.informacion.categoryDescCorrupcion'),
    ddhh: t('riskMatrix.informacion.categoryDescDdhh'),
  };

  const INFO_TABS = [
    { id: 'intro', label: t('riskMatrix.informacion.tabIntro'), icon: FaRocket },
    { id: 'process', label: t('riskMatrix.informacion.tabProcess'), icon: FaSyncAlt },
    { id: 'categories', label: t('riskMatrix.informacion.tabCategories'), icon: FaClipboardList },
    { id: 'criteria', label: t('riskMatrix.informacion.tabCriteria'), icon: FaChartBar },
    { id: 'heatmap', label: t('riskMatrix.informacion.tabHeatmap'), icon: FaFire },
    { id: 'gestion', label: t('riskMatrix.informacion.tabGestion'), icon: FaShieldAlt },
  ];

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

  // Guardar datos cuando cambien (ref estable evita bucles por callback nuevo en cada render)
  const onDatosChangeRef = useRef(onDatosChange);
  onDatosChangeRef.current = onDatosChange;
  const ultimoInformacionEnviadoRef = useRef('');

  useEffect(() => {
    let serializado = '';
    try {
      serializado = JSON.stringify(informacionGeneral);
    } catch {
      onDatosChangeRef.current?.(informacionGeneral);
      return;
    }
    if (serializado === ultimoInformacionEnviadoRef.current) return;
    ultimoInformacionEnviadoRef.current = serializado;
    onDatosChangeRef.current?.(informacionGeneral);
  }, [informacionGeneral]);

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
      {!modoReporte && (
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
            {t('riskMatrix.informacion.heroTitle')}
          </h1>
          <p className="mt-3 font-body text-sm leading-relaxed text-gray-300 sm:text-base">
            {t('riskMatrix.informacion.heroDescription')}
            <br />
            <strong className="text-white">{t('riskMatrix.informacion.heroHighlight')}</strong>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-8 sm:gap-12">
            <div className="text-center">
              <span className="block font-accent text-2xl font-bold text-amber-400 sm:text-3xl">
                3
              </span>
              <span className="font-body text-xs text-gray-400 sm:text-sm">{t('riskMatrix.informacion.heroStatSteps')}</span>
            </div>
            <div className="text-center">
              <span className="block font-accent text-2xl font-bold text-amber-400 sm:text-3xl">
                8
              </span>
              <span className="font-body text-xs text-gray-400 sm:text-sm">{t('riskMatrix.informacion.heroStatCategories')}</span>
            </div>
            <div className="text-center">
              <span className="block font-accent text-2xl font-bold text-amber-400 sm:text-3xl">
                100%
              </span>
              <span className="font-body text-xs text-gray-400 sm:text-sm">{t('riskMatrix.informacion.heroStatEffective')}</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Pestañas */}
      {!modoReporte && (
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
      )}

      {/* Tab Content */}
      <div className="tab-content">
        {(modoReporte || activeTab === 'intro') && (
          <div className="intro-tab">
            {!modoReporte && (
            <div className={`welcome-card ${matrizCard}`}>
              <h2 className={matrizCardTitle}>{t('riskMatrix.informacion.welcomeTitle')}</h2>
              <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                {t('riskMatrix.informacion.welcomeBodyPrefix')} <strong>90%</strong>{' '}
                {t('riskMatrix.informacion.welcomeBodySuffix')}
              </p>
            </div>
            )}

            <div className={`info-form-card ${matrizCard}`}>
              <h3 className={matrizCardTitle}>{t('riskMatrix.informacion.generalInfoTitle')}</h3>
              <div className="info-form-grid">
                <div className="form-group">
                  <label htmlFor="nombreEmpresa" className={matrizLabel}>
                    {t('riskMatrix.informacion.companyNameLabel')}
                  </label>
                  <input
                    type="text"
                    id="nombreEmpresa"
                    value={informacionGeneral.nombreEmpresa}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({ ...prev, nombreEmpresa: e.target.value }))
                    }
                    placeholder={t('riskMatrix.informacion.companyNamePlaceholder')}
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="responsable" className={matrizLabel}>
                    {t('riskMatrix.informacion.responsibleLabel')}
                  </label>
                  <input
                    type="text"
                    id="responsable"
                    value={informacionGeneral.responsable}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({ ...prev, responsable: e.target.value }))
                    }
                    placeholder={t('riskMatrix.informacion.responsiblePlaceholder')}
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="version" className={matrizLabel}>
                    {t('riskMatrix.informacion.versionLabel')}
                  </label>
                  <input
                    type="text"
                    id="version"
                    value={informacionGeneral.version}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({ ...prev, version: e.target.value }))
                    }
                    placeholder={t('riskMatrix.informacion.versionPlaceholder')}
                    className={matrizInput}
                  />
                </div>
                <div className="form-group full-width sm:col-span-2">
                  <label htmlFor="descripcion" className={matrizLabel}>
                    {t('riskMatrix.informacion.descriptionLabel')}
                  </label>
                  <textarea
                    id="descripcion"
                    value={informacionGeneral.descripcion}
                    onChange={(e) =>
                      setInformacionGeneral((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                    placeholder={t('riskMatrix.informacion.descriptionPlaceholder')}
                    className={matrizTextarea}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className={`info-form-card ${matrizCard}`}>
              <h3 className={matrizCardTitle}>{t('riskMatrix.informacion.engineerTitle')}</h3>
              <p className="mb-4 font-body text-sm text-gray-500 dark:text-gray-400">
                {t('riskMatrix.informacion.engineerSubtitle')}
              </p>
              <div className="info-form-grid">
                <div className="form-group">
                  <label htmlFor="ingenieroNombre" className={matrizLabel}>
                    {t('riskMatrix.informacion.engineerNameLabel')}
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
                    placeholder={t('riskMatrix.informacion.engineerNamePlaceholder')}
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ingenieroCargo" className={matrizLabel}>
                    {t('riskMatrix.informacion.engineerPositionLabel')}
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
                    placeholder={t('riskMatrix.informacion.engineerPositionPlaceholder')}
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ingenieroTelefono" className={matrizLabel}>
                    {t('riskMatrix.informacion.engineerPhoneLabel')}
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
                    placeholder={t('riskMatrix.informacion.engineerPhonePlaceholder')}
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ingenieroEmail" className={matrizLabel}>
                    {t('riskMatrix.informacion.engineerEmailLabel')}
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
                    placeholder={t('riskMatrix.informacion.engineerEmailPlaceholder')}
                    className={matrizInput}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ingenieroEmpresa" className={matrizLabel}>
                    {t('riskMatrix.informacion.engineerCompanyLabel')}
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
                    placeholder={t('riskMatrix.informacion.engineerCompanyPlaceholder')}
                    className={matrizInput}
                  />
                </div>
                <div className="form-group full-width sm:col-span-2">
                  <label htmlFor="ingenieroDireccion" className={matrizLabel}>
                    {t('riskMatrix.informacion.engineerAddressLabel')}
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
                    placeholder={t('riskMatrix.informacion.engineerAddressPlaceholder')}
                    className={matrizTextarea}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {!modoReporte && (
            <>
            <MatrizPasosGrid />
            <MatrizBeneficios />
            </>
            )}
          </div>
        )}

        {!modoReporte && activeTab === 'process' && (
          <div className="process-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaSyncAlt}
              title={t('riskMatrix.informacion.processHeaderTitle')}
              description={t('riskMatrix.informacion.processHeaderDescription')}
            />
            <div className="process-timeline space-y-3">
              <MatrizTimelineItem
                numero={1}
                icon={FaSearch}
                title={t('riskMatrix.informacion.step1Title')}
                description={t('riskMatrix.informacion.step1Description')}
                tips={[
                  t('riskMatrix.informacion.step1Tip1'),
                  t('riskMatrix.informacion.step1Tip2'),
                  t('riskMatrix.informacion.step1Tip3'),
                ]}
              />
              <MatrizTimelineItem
                numero={2}
                icon={FaChartBar}
                title={t('riskMatrix.informacion.step2Title')}
                description={t('riskMatrix.informacion.step2Description')}
                tips={[
                  t('riskMatrix.informacion.step2Tip1'),
                  t('riskMatrix.informacion.step2Tip2'),
                  t('riskMatrix.informacion.step2Tip3'),
                ]}
              />
              <MatrizTimelineItem
                numero={3}
                icon={FaFire}
                title={t('riskMatrix.informacion.step3Title')}
                description={t('riskMatrix.informacion.step3Description')}
                tips={[
                  t('riskMatrix.informacion.step3Tip1'),
                  t('riskMatrix.informacion.step3Tip2'),
                  t('riskMatrix.informacion.step3Tip3'),
                ]}
              />
            </div>
          </div>
        )}

        {!modoReporte && activeTab === 'categories' && (
          <div className="categories-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaClipboardList}
              title={t('riskMatrix.informacion.categoriesHeaderTitle')}
              description={t('riskMatrix.informacion.categoriesHeaderDescription')}
            />
            <MatrizCategoriasGrid descripciones={DESCRIPCIONES_CATEGORIAS} />
          </div>
        )}

        {!modoReporte && activeTab === 'criteria' && (
          <div className="criteria-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaChartBar}
              title={t('riskMatrix.informacion.criteriaHeaderTitle')}
              description={t('riskMatrix.informacion.criteriaHeaderDescription')}
            />

            <div className="criteria-sections">
              <div className="criteria-section">
                <h3 className={matrizSectionTitle}>{t('riskMatrix.informacion.probabilitySectionTitle')}</h3>
                <p>{t('riskMatrix.informacion.probabilitySectionSubtitle')}</p>
                
                <div className="probability-cards">
                  <div className="prob-card muy-baja">
                    <div className="prob-header">
                      <span className="prob-number">1</span>
                      <h4>{t('riskMatrix.informacion.prob1Title')}</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>{t('riskMatrix.informacion.prob1Frequency')}</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>{t('riskMatrix.informacion.prob1Percentage')}</span>
                      </div>
                    </div>
                    <p className="prob-description">{t('riskMatrix.informacion.prob1Description')}</p>
                  </div>

                  <div className="prob-card baja">
                    <div className="prob-header">
                      <span className="prob-number">2</span>
                      <h4>{t('riskMatrix.informacion.prob2Title')}</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>{t('riskMatrix.informacion.prob2Frequency')}</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>{t('riskMatrix.informacion.prob2Percentage')}</span>
                      </div>
                    </div>
                    <p className="prob-description">{t('riskMatrix.informacion.prob2Description')}</p>
                  </div>

                  <div className="prob-card media">
                    <div className="prob-header">
                      <span className="prob-number">3</span>
                      <h4>{t('riskMatrix.informacion.prob3Title')}</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>{t('riskMatrix.informacion.prob3Frequency')}</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>{t('riskMatrix.informacion.prob3Percentage')}</span>
                      </div>
                    </div>
                    <p className="prob-description">{t('riskMatrix.informacion.prob3Description')}</p>
                  </div>

                  <div className="prob-card alta">
                    <div className="prob-header">
                      <span className="prob-number">4</span>
                      <h4>{t('riskMatrix.informacion.prob4Title')}</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>{t('riskMatrix.informacion.prob4Frequency')}</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>{t('riskMatrix.informacion.prob4Percentage')}</span>
                      </div>
                    </div>
                    <p className="prob-description">{t('riskMatrix.informacion.prob4Description')}</p>
                  </div>

                  <div className="prob-card muy-alta">
                    <div className="prob-header">
                      <span className="prob-number">5</span>
                      <h4>{t('riskMatrix.informacion.prob5Title')}</h4>
                    </div>
                    <div className="prob-details">
                      <div className="prob-metric">
                        <span className="metric-icon">📅</span>
                        <span>{t('riskMatrix.informacion.prob5Frequency')}</span>
                      </div>
                      <div className="prob-metric">
                        <span className="metric-icon">📊</span>
                        <span>{t('riskMatrix.informacion.prob5Percentage')}</span>
                      </div>
                    </div>
                    <p className="prob-description">{t('riskMatrix.informacion.prob5Description')}</p>
                  </div>
                </div>
              </div>

              <div className="criteria-section">
                <h3 className={matrizSectionTitle}>{t('riskMatrix.informacion.impactSectionTitle')}</h3>
                <p>{t('riskMatrix.informacion.impactSectionSubtitle')}</p>
                
                <div className="impact-cards">
                  <div className="impact-card insignificante">
                    <div className="impact-header">
                      <span className="impact-number">1</span>
                      <h4>{t('riskMatrix.informacion.impact1Title')}</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>{t('riskMatrix.informacion.impactAreaEconomic')}</strong> {t('riskMatrix.informacion.impact1Economic')}</div>
                      <div className="area-item">⏰ <strong>{t('riskMatrix.informacion.impactAreaOperational')}</strong> {t('riskMatrix.informacion.impact1Operational')}</div>
                      <div className="area-item">📢 <strong>{t('riskMatrix.informacion.impactAreaReputational')}</strong> {t('riskMatrix.informacion.impact1Reputational')}</div>
                      <div className="area-item">⚖️ <strong>{t('riskMatrix.informacion.impactAreaLegal')}</strong> {t('riskMatrix.informacion.impact1Legal')}</div>
                    </div>
                    <p className="impact-description">{t('riskMatrix.informacion.impact1Description')}</p>
                  </div>

                  <div className="impact-card menor">
                    <div className="impact-header">
                      <span className="impact-number">2</span>
                      <h4>{t('riskMatrix.informacion.impact2Title')}</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>{t('riskMatrix.informacion.impactAreaEconomic')}</strong> {t('riskMatrix.informacion.impact2Economic')}</div>
                      <div className="area-item">⏰ <strong>{t('riskMatrix.informacion.impactAreaOperational')}</strong> {t('riskMatrix.informacion.impact2Operational')}</div>
                      <div className="area-item">📢 <strong>{t('riskMatrix.informacion.impactAreaReputational')}</strong> {t('riskMatrix.informacion.impact2Reputational')}</div>
                      <div className="area-item">⚖️ <strong>{t('riskMatrix.informacion.impactAreaLegal')}</strong> {t('riskMatrix.informacion.impact2Legal')}</div>
                    </div>
                    <p className="impact-description">{t('riskMatrix.informacion.impact2Description')}</p>
                  </div>

                  <div className="impact-card moderado">
                    <div className="impact-header">
                      <span className="impact-number">3</span>
                      <h4>{t('riskMatrix.informacion.impact3Title')}</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>{t('riskMatrix.informacion.impactAreaEconomic')}</strong> {t('riskMatrix.informacion.impact3Economic')}</div>
                      <div className="area-item">⏰ <strong>{t('riskMatrix.informacion.impactAreaOperational')}</strong> {t('riskMatrix.informacion.impact3Operational')}</div>
                      <div className="area-item">📢 <strong>{t('riskMatrix.informacion.impactAreaReputational')}</strong> {t('riskMatrix.informacion.impact3Reputational')}</div>
                      <div className="area-item">⚖️ <strong>{t('riskMatrix.informacion.impactAreaLegal')}</strong> {t('riskMatrix.informacion.impact3Legal')}</div>
                    </div>
                    <p className="impact-description">{t('riskMatrix.informacion.impact3Description')}</p>
                  </div>

                  <div className="impact-card mayor">
                    <div className="impact-header">
                      <span className="impact-number">4</span>
                      <h4>{t('riskMatrix.informacion.impact4Title')}</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>{t('riskMatrix.informacion.impactAreaEconomic')}</strong> {t('riskMatrix.informacion.impact4Economic')}</div>
                      <div className="area-item">⏰ <strong>{t('riskMatrix.informacion.impactAreaOperational')}</strong> {t('riskMatrix.informacion.impact4Operational')}</div>
                      <div className="area-item">📢 <strong>{t('riskMatrix.informacion.impactAreaReputational')}</strong> {t('riskMatrix.informacion.impact4Reputational')}</div>
                      <div className="area-item">⚖️ <strong>{t('riskMatrix.informacion.impactAreaLegal')}</strong> {t('riskMatrix.informacion.impact4Legal')}</div>
                    </div>
                    <p className="impact-description">{t('riskMatrix.informacion.impact4Description')}</p>
                  </div>

                  <div className="impact-card catastrofico">
                    <div className="impact-header">
                      <span className="impact-number">5</span>
                      <h4>{t('riskMatrix.informacion.impact5Title')}</h4>
                    </div>
                    <div className="impact-areas">
                      <div className="area-item">💰 <strong>{t('riskMatrix.informacion.impactAreaEconomic')}</strong> {t('riskMatrix.informacion.impact5Economic')}</div>
                      <div className="area-item">⏰ <strong>{t('riskMatrix.informacion.impactAreaOperational')}</strong> {t('riskMatrix.informacion.impact5Operational')}</div>
                      <div className="area-item">📢 <strong>{t('riskMatrix.informacion.impactAreaReputational')}</strong> {t('riskMatrix.informacion.impact5Reputational')}</div>
                      <div className="area-item">⚖️ <strong>{t('riskMatrix.informacion.impactAreaLegal')}</strong> {t('riskMatrix.informacion.impact5Legal')}</div>
                    </div>
                    <p className="impact-description">{t('riskMatrix.informacion.impact5Description')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="tips-section">
              <h3>{t('riskMatrix.informacion.expertTipsTitle')}</h3>
              <div className="tips-grid">
                <div className="tip-card">
                  <span className="tip-icon">📊</span>
                  <h4>{t('riskMatrix.informacion.tip1Title')}</h4>
                  <p>{t('riskMatrix.informacion.tip1Body')}</p>
                </div>
                <div className="tip-card">
                  <span className="tip-icon">👥</span>
                  <h4>{t('riskMatrix.informacion.tip2Title')}</h4>
                  <p>{t('riskMatrix.informacion.tip2Body')}</p>
                </div>
                <div className="tip-card">
                  <span className="tip-icon">🎯</span>
                  <h4>{t('riskMatrix.informacion.tip3Title')}</h4>
                  <p>{t('riskMatrix.informacion.tip3Body')}</p>
                </div>
                <div className="tip-card">
                  <span className="tip-icon">🔄</span>
                  <h4>{t('riskMatrix.informacion.tip4Title')}</h4>
                  <p>{t('riskMatrix.informacion.tip4Body')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!modoReporte && activeTab === 'heatmap' && (
          <div className="heatmap-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaFire}
              title={t('riskMatrix.informacion.heatmapHeaderTitle')}
              description={t('riskMatrix.informacion.heatmapHeaderDescription')}
            />

            <div className={`${matrizCard} heatmap-explanation`}>
              <h3 className={matrizSectionTitle}>{t('riskMatrix.informacion.heatmapWhatTitle')}</h3>
              <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                {t('riskMatrix.informacion.heatmapWhatPart1')} <strong>{t('riskMatrix.informacion.heatmapWhatProbability')}</strong>{' '}
                {t('riskMatrix.informacion.heatmapWhatPart2')}{' '}
                <strong>{t('riskMatrix.informacion.heatmapWhatImpact')}</strong>{' '}
                {t('riskMatrix.informacion.heatmapWhatPart3')}
              </p>
            </div>

            <MatrizMapaDemoEducativo />

            {/* Cómo Interpretar el Mapa */}
            <div className={`${matrizCard} heatmap-interpretation`}>
              <h3 className={matrizSectionTitle}>{t('riskMatrix.informacion.interpretationTitle')}</h3>
              <p className="interpretation-intro">
                {t('riskMatrix.informacion.interpretationIntro')}
              </p>
              
              <div className="interpretation-grid">
                <div className="interpretation-card critical">
                  <div className="interpretation-icon">🚨</div>
                  <h4>{t('riskMatrix.informacion.interpCriticalLabel')}</h4>
                  <p>{t('riskMatrix.informacion.interpCriticalBodyPlain')} <strong>{t('riskMatrix.informacion.interpCriticalBodyBold')}</strong></p>
                  <div className="action-required">
                    <span className="action-label">{t('riskMatrix.informacion.actionLabel')}</span>
                    <span className="action-text">{t('riskMatrix.informacion.interpCriticalActionText')}</span>
                  </div>
                </div>

                <div className="interpretation-card high">
                  <div className="interpretation-icon">🔴</div>
                  <h4>{t('riskMatrix.informacion.interpHighLabel')}</h4>
                  <p>{t('riskMatrix.informacion.interpHighBodyPlain')} <strong>{t('riskMatrix.informacion.interpHighBodyBold')}</strong></p>
                  <div className="action-required">
                    <span className="action-label">{t('riskMatrix.informacion.actionLabel')}</span>
                    <span className="action-text">{t('riskMatrix.informacion.interpHighActionText')}</span>
                  </div>
                </div>

                <div className="interpretation-card medium">
                  <div className="interpretation-icon">🟡</div>
                  <h4>{t('riskMatrix.informacion.interpMediumLabel')}</h4>
                  <p>{t('riskMatrix.informacion.interpMediumBodyPlain')} <strong>{t('riskMatrix.informacion.interpMediumBodyBold')}</strong></p>
                  <div className="action-required">
                    <span className="action-label">{t('riskMatrix.informacion.actionLabel')}</span>
                    <span className="action-text">{t('riskMatrix.informacion.interpMediumActionText')}</span>
                  </div>
                </div>

                <div className="interpretation-card low">
                  <div className="interpretation-icon">🟢</div>
                  <h4>{t('riskMatrix.informacion.interpLowLabel')}</h4>
                  <p>{t('riskMatrix.informacion.interpLowBodyPlain')} <strong>{t('riskMatrix.informacion.interpLowBodyBold')}</strong></p>
                  <div className="action-required">
                    <span className="action-label">{t('riskMatrix.informacion.actionLabel')}</span>
                    <span className="action-text">{t('riskMatrix.informacion.interpLowActionText')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Por qué es importante */}
            <div className={`${matrizCard} heatmap-importance`}>
              <h3 className={matrizSectionTitle}>{t('riskMatrix.informacion.importanceTitle')}</h3>
              <p className="importance-intro">
                {t('riskMatrix.informacion.importanceIntroPrefix')} <strong>{t('riskMatrix.informacion.importanceIntroBold')}</strong>{' '}
                {t('riskMatrix.informacion.importanceIntroSuffix')}
              </p>
              
              <div className="importance-grid">
                <div className="importance-card priority">
                  <div className="importance-icon">🎯</div>
                  <h4>{t('riskMatrix.informacion.importancePriorityTitle')}</h4>
                  <p>{t('riskMatrix.informacion.importancePriorityBodyPrefix')} <span className="highlight red">{t('riskMatrix.informacion.importancePriorityRed')}</span>, <span className="highlight yellow">{t('riskMatrix.informacion.importancePriorityYellow')}</span>, <span className="highlight green">{t('riskMatrix.informacion.importancePriorityGreen')}</span></p>
                </div>

                <div className="importance-card decision">
                  <div className="importance-icon">📈</div>
                  <h4>{t('riskMatrix.informacion.importanceDecisionTitle')}</h4>
                  <p>{t('riskMatrix.informacion.importanceDecisionBody')}</p>
                </div>

                <div className="importance-card communication">
                  <div className="importance-icon">💬</div>
                  <h4>{t('riskMatrix.informacion.importanceCommunicationTitle')}</h4>
                  <p>{t('riskMatrix.informacion.importanceCommunicationBody')}</p>
                </div>

                <div className="importance-card resource">
                  <div className="importance-icon">💰</div>
                  <h4>{t('riskMatrix.informacion.importanceResourceTitle')}</h4>
                  <p>{t('riskMatrix.informacion.importanceResourceBody')}</p>
                </div>

                <div className="importance-card compliance">
                  <div className="importance-icon">⚖️</div>
                  <h4>{t('riskMatrix.informacion.importanceComplianceTitle')}</h4>
                  <p>{t('riskMatrix.informacion.importanceComplianceBody')}</p>
                </div>

                <div className="importance-card competitive">
                  <div className="importance-icon">🏆</div>
                  <h4>{t('riskMatrix.informacion.importanceCompetitiveTitle')}</h4>
                  <p>{t('riskMatrix.informacion.importanceCompetitiveBody')}</p>
                </div>
              </div>

              <div className="impact-stats">
                <h4>{t('riskMatrix.informacion.impactStatsTitle')}</h4>
                <div className="stats-grid">
                  <div className="stat-highlight">
                    <span className="stat-number">{t('riskMatrix.informacion.stat1Number')}</span>
                    <span className="stat-text">{t('riskMatrix.informacion.stat1Text')}</span>
                  </div>
                  <div className="stat-highlight">
                    <span className="stat-number">{t('riskMatrix.informacion.stat2Number')}</span>
                    <span className="stat-text">{t('riskMatrix.informacion.stat2Text')}</span>
                  </div>
                  <div className="stat-highlight">
                    <span className="stat-number">{t('riskMatrix.informacion.stat3Number')}</span>
                    <span className="stat-text">{t('riskMatrix.informacion.stat3Text')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cómo Usar el Mapa */}
            <div className="heatmap-usage">
              <h3>{t('riskMatrix.informacion.usageTitle')}</h3>
              
              <div className="usage-steps">
                <div className="usage-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>{t('riskMatrix.informacion.usageStep1Title')}</h4>
                    <p>{t('riskMatrix.informacion.usageStep1Body')}</p>
                  </div>
                </div>

                <div className="usage-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>{t('riskMatrix.informacion.usageStep2Title')}</h4>
                    <p>{t('riskMatrix.informacion.usageStep2Body')}</p>
                  </div>
                </div>

                <div className="usage-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>{t('riskMatrix.informacion.usageStep3Title')}</h4>
                    <p>{t('riskMatrix.informacion.usageStep3Body')}</p>
                  </div>
                </div>

                <div className="usage-step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>{t('riskMatrix.informacion.usageStep4Title')}</h4>
                    <p>{t('riskMatrix.informacion.usageStep4Body')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action específico */}
            <div className="heatmap-cta">
              <h3>{t('riskMatrix.informacion.heatmapCtaTitle')}</h3>
              <p>{t('riskMatrix.informacion.heatmapCtaBody')}</p>
              <div className="heatmap-cta-buttons">
                <button className="cta-button primary">
                  {t('riskMatrix.informacion.heatmapCtaButtonIdentification')}
                </button>
                <button className="cta-button secondary">
                  {t('riskMatrix.informacion.heatmapCtaButtonAssessment')}
                </button>
              </div>
            </div>
          </div>
        )}

        {!modoReporte && activeTab === 'gestion' && (
          <div className="gestion-tab space-y-4">
            <MatrizTabEncabezado
              icon={FaShieldAlt}
              title={t('riskMatrix.informacion.gestionHeaderTitle')}
              description={t('riskMatrix.informacion.gestionHeaderDescription')}
            />

            {/* ¿Por qué son importantes las recomendaciones? */}
            <div className={`${matrizCard} gestion-explanation`}>
              <h3 className={matrizSectionTitle}>{t('riskMatrix.informacion.gestionWhyTitle')}</h3>
              <p className="explanation-text">
                {t('riskMatrix.informacion.gestionWhyBodyPrefix')} <strong>{t('riskMatrix.informacion.gestionWhyBodyBold')}</strong>. 
                {' '}{t('riskMatrix.informacion.gestionWhyBodySuffix')}
              </p>
            </div>

            {/* Beneficios de las Recomendaciones */}
            <div className={`${matrizCard} beneficios-section`}>
              <h3 className={matrizSectionTitle}>{t('riskMatrix.informacion.benefitsTitle')}</h3>
              <p className="beneficios-intro">{t('riskMatrix.informacion.benefitsIntro')}</p>
              
              <div className="beneficios-grid">
                <div className="beneficio-card">
                  <div className="beneficio-icon">🎯</div>
                  <h4>{t('riskMatrix.informacion.benefit1Title')}</h4>
                  <p>{t('riskMatrix.informacion.benefit1Body')}</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">📈</div>
                  <h4>{t('riskMatrix.informacion.benefit2Title')}</h4>
                  <p>{t('riskMatrix.informacion.benefit2Body')}</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">🛡️</div>
                  <h4>{t('riskMatrix.informacion.benefit3Title')}</h4>
                  <p>{t('riskMatrix.informacion.benefit3Body')}</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">💰</div>
                  <h4>{t('riskMatrix.informacion.benefit4Title')}</h4>
                  <p>{t('riskMatrix.informacion.benefit4Body')}</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">👥</div>
                  <h4>{t('riskMatrix.informacion.benefit5Title')}</h4>
                  <p>{t('riskMatrix.informacion.benefit5Body')}</p>
                </div>

                <div className="beneficio-card">
                  <div className="beneficio-icon">📊</div>
                  <h4>{t('riskMatrix.informacion.benefit6Title')}</h4>
                  <p>{t('riskMatrix.informacion.benefit6Body')}</p>
                </div>
              </div>
            </div>

            {/* Proceso de Recomendaciones */}
            <div className={`${matrizCard} proceso-section`}>
              <h3 className={matrizSectionTitle}>{t('riskMatrix.informacion.recProcessTitle')}</h3>
              <p className="proceso-intro">{t('riskMatrix.informacion.recProcessIntro')}</p>
              
              <div className="proceso-timeline">
                <div className="proceso-item">
                  <div className="proceso-number">1</div>
                  <div className="proceso-content">
                    <h4>{t('riskMatrix.informacion.recProcess1Title')}</h4>
                    <p>{t('riskMatrix.informacion.recProcess1Body')}</p>
                  </div>
                </div>

                <div className="proceso-item">
                  <div className="proceso-number">2</div>
                  <div className="proceso-content">
                    <h4>{t('riskMatrix.informacion.recProcess2Title')}</h4>
                    <p>{t('riskMatrix.informacion.recProcess2Body')}</p>
                  </div>
                </div>

                <div className="proceso-item">
                  <div className="proceso-number">3</div>
                  <div className="proceso-content">
                    <h4>{t('riskMatrix.informacion.recProcess3Title')}</h4>
                    <p>{t('riskMatrix.informacion.recProcess3Body')}</p>
                  </div>
                </div>

                <div className="proceso-item">
                  <div className="proceso-number">4</div>
                  <div className="proceso-content">
                    <h4>{t('riskMatrix.informacion.recProcess4Title')}</h4>
                    <p>{t('riskMatrix.informacion.recProcess4Body')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="gestion-cta">
              <h3>{t('riskMatrix.informacion.gestionCta1Title')}</h3>
              <p>{t('riskMatrix.informacion.gestionCta1Body')}</p>
              <div className="gestion-cta-buttons">
                <button className="cta-button primary" onClick={() => window.location.hash = '#gestion-riesgos'}>
                  {t('riskMatrix.informacion.gestionCta1Button')}
                </button>
              </div>
            </div>

            {/* ¿Qué es la Gestión de Riesgos? */}
            <div className="gestion-explanation">
              <h3>{t('riskMatrix.informacion.whatIsTitle')}</h3>
              <p className="explanation-text">
                {t('riskMatrix.informacion.whatIsBodyPrefix')} <strong>{t('riskMatrix.informacion.whatIsBodyBold1')}</strong>{' '}
                {t('riskMatrix.informacion.whatIsBodyMiddle')} <strong>{t('riskMatrix.informacion.whatIsBodyBold2')}</strong>{' '}
                {t('riskMatrix.informacion.whatIsBodySuffix')}
              </p>
            </div>

            {/* Estrategias de Gestión */}
            <div className="estrategias-section">
              <h3>{t('riskMatrix.informacion.strategiesTitle')}</h3>
              <p className="estrategias-intro">{t('riskMatrix.informacion.strategiesIntro')}</p>
              
              <div className="estrategias-grid">
                <div className="estrategia-card evitar">
                  <div className="estrategia-header">
                    <span className="estrategia-icon">🚫</span>
                    <h4>{t('riskMatrix.informacion.strategyAvoidTitle')}</h4>
                  </div>
                  <p className="estrategia-description">
                    <strong>{t('riskMatrix.informacion.strategyAvoidDescBold')}</strong> {t('riskMatrix.informacion.strategyAvoidDescSuffix')}
                  </p>
                  <div className="estrategia-ejemplos">
                    <h5>{t('riskMatrix.informacion.examplesLabel')}</h5>
                    <ul>
                      <li>{t('riskMatrix.informacion.strategyAvoidEx1')}</li>
                      <li>{t('riskMatrix.informacion.strategyAvoidEx2')}</li>
                      <li>{t('riskMatrix.informacion.strategyAvoidEx3')}</li>
                    </ul>
                  </div>
                  <div className="estrategia-cuando">
                    <strong>{t('riskMatrix.informacion.whenToUseLabel')}</strong> {t('riskMatrix.informacion.strategyAvoidWhen')}
                  </div>
                </div>

                <div className="estrategia-card mitigar">
                  <div className="estrategia-header">
                    <span className="estrategia-icon">🛡️</span>
                    <h4>{t('riskMatrix.informacion.strategyMitigateTitle')}</h4>
                  </div>
                  <p className="estrategia-description">
                    <strong>{t('riskMatrix.informacion.strategyMitigateDescBold')}</strong> {t('riskMatrix.informacion.strategyMitigateDescSuffix')}
                  </p>
                  <div className="estrategia-ejemplos">
                    <h5>{t('riskMatrix.informacion.examplesLabel')}</h5>
                    <ul>
                      <li>{t('riskMatrix.informacion.strategyMitigateEx1')}</li>
                      <li>{t('riskMatrix.informacion.strategyMitigateEx2')}</li>
                      <li>{t('riskMatrix.informacion.strategyMitigateEx3')}</li>
                    </ul>
                  </div>
                  <div className="estrategia-cuando">
                    <strong>{t('riskMatrix.informacion.whenToUseLabel')}</strong> {t('riskMatrix.informacion.strategyMitigateWhen')}
                  </div>
                </div>

                <div className="estrategia-card transferir">
                  <div className="estrategia-header">
                    <span className="estrategia-icon">🔄</span>
                    <h4>{t('riskMatrix.informacion.strategyTransferTitle')}</h4>
                  </div>
                  <p className="estrategia-description">
                    <strong>{t('riskMatrix.informacion.strategyTransferDescBold')}</strong> {t('riskMatrix.informacion.strategyTransferDescSuffix')}
                  </p>
                  <div className="estrategia-ejemplos">
                    <h5>{t('riskMatrix.informacion.examplesLabel')}</h5>
                    <ul>
                      <li>{t('riskMatrix.informacion.strategyTransferEx1')}</li>
                      <li>{t('riskMatrix.informacion.strategyTransferEx2')}</li>
                      <li>{t('riskMatrix.informacion.strategyTransferEx3')}</li>
                    </ul>
                  </div>
                  <div className="estrategia-cuando">
                    <strong>{t('riskMatrix.informacion.whenToUseLabel')}</strong> {t('riskMatrix.informacion.strategyTransferWhen')}
                  </div>
                </div>

                <div className="estrategia-card aceptar">
                  <div className="estrategia-header">
                    <span className="estrategia-icon">✅</span>
                    <h4>{t('riskMatrix.informacion.strategyAcceptTitle')}</h4>
                  </div>
                  <p className="estrategia-description">
                    <strong>{t('riskMatrix.informacion.strategyAcceptDescBold')}</strong> {t('riskMatrix.informacion.strategyAcceptDescSuffix')}
                  </p>
                  <div className="estrategia-ejemplos">
                    <h5>{t('riskMatrix.informacion.examplesLabel')}</h5>
                    <ul>
                      <li>{t('riskMatrix.informacion.strategyAcceptEx1')}</li>
                      <li>{t('riskMatrix.informacion.strategyAcceptEx2')}</li>
                      <li>{t('riskMatrix.informacion.strategyAcceptEx3')}</li>
                    </ul>
                  </div>
                  <div className="estrategia-cuando">
                    <strong>{t('riskMatrix.informacion.whenToUseLabel')}</strong> {t('riskMatrix.informacion.strategyAcceptWhen')}
                  </div>
                </div>
              </div>
            </div>

            {/* Plan de Acción */}
            <div className="plan-accion-section">
              <h3>{t('riskMatrix.informacion.actionPlanTitle')}</h3>
              <p className="plan-intro">{t('riskMatrix.informacion.actionPlanIntro')}</p>
              
              <div className="plan-grid">
                <div className="plan-card critico">
                  <div className="plan-header">
                    <span className="plan-icon">🚨</span>
                    <h4>{t('riskMatrix.informacion.planCriticalTitle')}</h4>
                    <span className="plan-color red"></span>
                  </div>
                  <div className="plan-acciones">
                    <h5>{t('riskMatrix.informacion.planCriticalActionsLabel')}</h5>
                    <ul>
                      <li>{t('riskMatrix.informacion.planCriticalAction1')}</li>
                      <li>{t('riskMatrix.informacion.planCriticalAction2')}</li>
                      <li>{t('riskMatrix.informacion.planCriticalAction3')}</li>
                      <li>{t('riskMatrix.informacion.planCriticalAction4')}</li>
                    </ul>
                    <div className="plan-tiempo">
                      <strong>{t('riskMatrix.informacion.timeLabel')}</strong> {t('riskMatrix.informacion.planCriticalTime')}
                    </div>
                  </div>
                </div>

                <div className="plan-card alto">
                  <div className="plan-header">
                    <span className="plan-icon">🔴</span>
                    <h4>{t('riskMatrix.informacion.planHighTitle')}</h4>
                    <span className="plan-color orange"></span>
                  </div>
                  <div className="plan-acciones">
                    <h5>{t('riskMatrix.informacion.planHighActionsLabel')}</h5>
                    <ul>
                      <li>{t('riskMatrix.informacion.planHighAction1')}</li>
                      <li>{t('riskMatrix.informacion.planHighAction2')}</li>
                      <li>{t('riskMatrix.informacion.planHighAction3')}</li>
                      <li>{t('riskMatrix.informacion.planHighAction4')}</li>
                    </ul>
                    <div className="plan-tiempo">
                      <strong>{t('riskMatrix.informacion.timeLabel')}</strong> {t('riskMatrix.informacion.planHighTime')}
                    </div>
                  </div>
                </div>

                <div className="plan-card medio">
                  <div className="plan-header">
                    <span className="plan-icon">🟡</span>
                    <h4>{t('riskMatrix.informacion.planMediumTitle')}</h4>
                    <span className="plan-color yellow"></span>
                  </div>
                  <div className="plan-acciones">
                    <h5>{t('riskMatrix.informacion.planMediumActionsLabel')}</h5>
                    <ul>
                      <li>{t('riskMatrix.informacion.planMediumAction1')}</li>
                      <li>{t('riskMatrix.informacion.planMediumAction2')}</li>
                      <li>{t('riskMatrix.informacion.planMediumAction3')}</li>
                      <li>{t('riskMatrix.informacion.planMediumAction4')}</li>
                    </ul>
                    <div className="plan-tiempo">
                      <strong>{t('riskMatrix.informacion.timeLabel')}</strong> {t('riskMatrix.informacion.planMediumTime')}
                    </div>
                  </div>
                </div>

                <div className="plan-card bajo">
                  <div className="plan-header">
                    <span className="plan-icon">🟢</span>
                    <h4>{t('riskMatrix.informacion.planLowTitle')}</h4>
                    <span className="plan-color green"></span>
                  </div>
                  <div className="plan-acciones">
                    <h5>{t('riskMatrix.informacion.planLowActionsLabel')}</h5>
                    <ul>
                      <li>{t('riskMatrix.informacion.planLowAction1')}</li>
                      <li>{t('riskMatrix.informacion.planLowAction2')}</li>
                      <li>{t('riskMatrix.informacion.planLowAction3')}</li>
                      <li>{t('riskMatrix.informacion.planLowAction4')}</li>
                    </ul>
                    <div className="plan-tiempo">
                      <strong>{t('riskMatrix.informacion.timeLabel')}</strong> {t('riskMatrix.informacion.planLowTime')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Herramientas de Gestión */}
            <div className="herramientas-section">
              <h3>{t('riskMatrix.informacion.toolsTitle')}</h3>
              <p className="herramientas-intro">{t('riskMatrix.informacion.toolsIntro')}</p>
              
              <div className="herramientas-grid">
                <div className="herramienta-card">
                  <div className="herramienta-icon">📊</div>
                  <h4>{t('riskMatrix.informacion.tool1Title')}</h4>
                  <p>{t('riskMatrix.informacion.tool1Body')}</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">📋</div>
                  <h4>{t('riskMatrix.informacion.tool2Title')}</h4>
                  <p>{t('riskMatrix.informacion.tool2Body')}</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">👥</div>
                  <h4>{t('riskMatrix.informacion.tool3Title')}</h4>
                  <p>{t('riskMatrix.informacion.tool3Body')}</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">📅</div>
                  <h4>{t('riskMatrix.informacion.tool4Title')}</h4>
                  <p>{t('riskMatrix.informacion.tool4Body')}</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">💰</div>
                  <h4>{t('riskMatrix.informacion.tool5Title')}</h4>
                  <p>{t('riskMatrix.informacion.tool5Body')}</p>
                </div>
                
                <div className="herramienta-card">
                  <div className="herramienta-icon">📈</div>
                  <h4>{t('riskMatrix.informacion.tool6Title')}</h4>
                  <p>{t('riskMatrix.informacion.tool6Body')}</p>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="gestion-cta">
              <h3>{t('riskMatrix.informacion.gestionCta2Title')}</h3>
              <p>{t('riskMatrix.informacion.gestionCta2Body')}</p>
              <div className="gestion-cta-buttons">
                <button className="cta-button primary">
                  {t('riskMatrix.informacion.gestionCta2ButtonView')}
                </button>
                <button className="cta-button secondary">
                  {t('riskMatrix.informacion.gestionCta2ButtonPlan')}
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
