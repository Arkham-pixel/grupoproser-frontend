import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaHome, FaRedo, FaSearch, FaWifi } from 'react-icons/fa';
import { arnaldIcon } from '../config/brandAssets.js';
import './PaginaError.css';

const IMAGEN_404 = '/error404-arnald.png';

export default function PaginaError({ tipoForzado }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const tipoParam = searchParams.get('tipo');
  const contenidoPorTipo = {
    '404': {
      mensaje: <>{t('error.sorry')}<br />{t('error.notFoundMessageStart')} <strong>{t('error.notFoundMessageEmphasis')}</strong>.</>,
      placeholder: t('error.notFoundPlaceholder'),
      mostrarReintentar: false,
    },
    'sin-conexion': {
      mensaje: <>{t('error.sorry')}<br />{t('error.offlineMessageStart')} <strong>{t('error.offlineMessageEmphasis')}</strong> {t('error.offlineMessageEnd')}.</>,
      placeholder: t('error.offlinePlaceholder'),
      mostrarReintentar: true,
    },
    servicio: {
      mensaje: <>{t('error.sorry')}<br />{t('error.serviceMessageStart')} <strong>{t('error.serviceMessageEmphasis')}</strong> {t('error.serviceMessageEnd')}.</>,
      placeholder: t('error.servicePlaceholder'),
      mostrarReintentar: true,
    },
  };
  const tipo =
    tipoForzado ||
    (tipoParam && contenidoPorTipo[tipoParam] ? tipoParam : null) ||
    (tipoParam === 'servicio' ? 'servicio' : '404');

  const contenido = contenidoPorTipo[tipo] || contenidoPorTipo['404'];
  const autenticado = !!localStorage.getItem('token');
  const destinoInicio = autenticado ? '/inicio' : '/login';

  useEffect(() => {
    const titulos = {
      '404': t('error.notFoundTitle'),
      'sin-conexion': t('error.offlineTitle'),
      servicio: t('error.serviceTitle'),
    };
    document.title = `Arnald DataFlow - ${titulos[tipo] || t('common.error')}`;
  }, [tipo, t]);

  const handleReintentar = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  const handleBusqueda = (e) => {
    e.preventDefault();
    const termino = busqueda.trim().toLowerCase();
    if (!termino || termino.includes('inicio') || termino.includes('home') || termino.includes('panel')) {
      navigate(destinoInicio);
      return;
    }
    if (termino.includes('login') || termino.includes('iniciar') || termino.includes('acceder')) {
      navigate('/login');
      return;
    }
    navigate(destinoInicio);
  };

  return (
    <div className="pagina-error-espacial">
      {/* Fondo a pantalla completa */}
      <div className="pagina-error-fondo" aria-hidden="true">
        <img src={IMAGEN_404} alt="" className="pagina-error-fondo-img" />
        <div className="pagina-error-fondo-velo" />
      </div>

      {/* UI encima del fondo */}
      <div className="pagina-error-contenido">
        <header className="pagina-error-header">
          <Link to={destinoInicio} className="pagina-error-logo">
            <img src={arnaldIcon} alt="" className="pagina-error-logo-icon" />
            <div className="pagina-error-logo-text">
              Arnald DataFlow
              <span>Grupo Proser</span>
            </div>
          </Link>

          <nav className="pagina-error-nav">
            <Link to={destinoInicio}>{t('nav.home')}</Link>
            {autenticado ? (
              <Link to="/complex/excel">Complex</Link>
            ) : (
              <Link to="/login">{t('auth.access')}</Link>
            )}
            <button type="button" className="nav-link" onClick={() => navigate(destinoInicio)}>
              {t('error.contact')}
            </button>
          </nav>
        </header>

        <main className="pagina-error-centro">
          <p className="pagina-error-mensaje">{contenido.mensaje}</p>

          <form className="pagina-error-busqueda" onSubmit={handleBusqueda}>
            <FaSearch size={15} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={contenido.placeholder}
              aria-label={t('error.searchOrNavigate')}
            />
          </form>

          <div className="pagina-error-acciones">
            <button type="button" className="btn-espacial-primario" onClick={() => navigate(destinoInicio)}>
              <FaHome />
              {t('error.backToHome')}
            </button>

            {contenido.mostrarReintentar && (
              <button type="button" className="btn-espacial-secundario" onClick={handleReintentar}>
                {tipo === 'sin-conexion' ? <FaWifi /> : <FaRedo />}
                {t('error.retry')}
              </button>
            )}
          </div>
        </main>

        <footer className="pagina-error-footer">
          <p>© {new Date().getFullYear()} Grupo Proser · Arnald DataFlow</p>
        </footer>
      </div>
    </div>
  );
}
