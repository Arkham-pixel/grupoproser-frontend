import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaHome, FaRedo, FaSearch, FaWifi } from 'react-icons/fa';
import { arnaldIcon } from '../config/brandAssets.js';
import './PaginaError.css';

const IMAGEN_404 = '/error404-arnald.png';

const CONTENIDO = {
  '404': {
    mensaje: (
      <>
        Lo sentimos,
        <br />
        la página que solicitaste <strong>no fue encontrada</strong>.
      </>
    ),
    placeholder: 'Buscar en Arnald DataFlow o volver al inicio…',
    mostrarReintentar: false,
  },
  'sin-conexion': {
    mensaje: (
      <>
        Lo sentimos,
        <br />
        parece que <strong>no hay conexión a internet</strong> en este momento.
      </>
    ),
    placeholder: 'Revisa tu red e intenta de nuevo…',
    mostrarReintentar: true,
  },
  servicio: {
    mensaje: (
      <>
        Lo sentimos,
        <br />
        el <strong>servicio no está disponible</strong> temporalmente.
      </>
    ),
    placeholder: 'Vuelve a intentarlo en unos minutos…',
    mostrarReintentar: true,
  },
};

export default function PaginaError({ tipoForzado }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const tipoParam = searchParams.get('tipo');
  const tipo =
    tipoForzado ||
    (tipoParam && CONTENIDO[tipoParam] ? tipoParam : null) ||
    (tipoParam === 'servicio' ? 'servicio' : '404');

  const contenido = CONTENIDO[tipo] || CONTENIDO['404'];
  const autenticado = !!localStorage.getItem('token');
  const destinoInicio = autenticado ? '/inicio' : '/login';

  useEffect(() => {
    const titulos = {
      '404': 'Página no encontrada',
      'sin-conexion': 'Sin conexión',
      servicio: 'Servicio no disponible',
    };
    document.title = `Arnald DataFlow - ${titulos[tipo] || 'Error'}`;
  }, [tipo]);

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
            <Link to={destinoInicio}>Inicio</Link>
            {autenticado ? (
              <Link to="/complex/excel">Complex</Link>
            ) : (
              <Link to="/login">Acceder</Link>
            )}
            <button type="button" className="nav-link" onClick={() => navigate(destinoInicio)}>
              Contacto
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
              aria-label="Buscar o navegar"
            />
          </form>

          <div className="pagina-error-acciones">
            <button type="button" className="btn-espacial-primario" onClick={() => navigate(destinoInicio)}>
              <FaHome />
              Volver al inicio
            </button>

            {contenido.mostrarReintentar && (
              <button type="button" className="btn-espacial-secundario" onClick={handleReintentar}>
                {tipo === 'sin-conexion' ? <FaWifi /> : <FaRedo />}
                Reintentar
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
