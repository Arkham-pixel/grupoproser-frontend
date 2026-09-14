/** Claves pequeñas de sesión/preferencia que no se deben borrar al liberar cuota. */
const CLAVES_PROTEGER = new Set([
  'token',
  'rol',
  'login',
  'nombre',
  'cedula',
  'tipoUsuario',
  'sessionStartTime',
  'sessionStart',
  'tokenNeedsRenewal',
  'subtareaExternaReturn',
  'appLocale',
  'theme',
]);

/** Borradores y bancos que suelen llenar los ~5 MB de localStorage. */
const CLAVES_VOLUMINOSAS = [
  'formularioInspeccion',
  'formularioPropiedades',
  'formularioAjuste',
  'formularioSura',
  'formularioComplex',
  'bancoRecomendaciones',
  'bancoRecomendacionesPuertos',
  'proser_funcionarios',
  'proser_firma_isharly',
  'proser_cargos',
];

export function esErrorCuotaStorage(error) {
  if (!error) return false;
  const nombre = String(error.name || '');
  const mensaje = String(error.message || '');
  return (
    nombre === 'QuotaExceededError' ||
    nombre === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014 ||
    /quota/i.test(mensaje)
  );
}

function tamañoValor(valor) {
  try {
    return String(valor ?? '').length;
  } catch {
    return 0;
  }
}

function clavesLocalStorage() {
  const claves = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const clave = localStorage.key(i);
    if (clave) claves.push(clave);
  }
  return claves;
}

/** Elimina borradores y, si hace falta, las claves más grandes (salvo sesión). */
export function liberarEspacioLocalStorage() {
  CLAVES_VOLUMINOSAS.forEach((clave) => {
    try {
      localStorage.removeItem(clave);
    } catch {
      // ignore
    }
  });

  const restantes = clavesLocalStorage()
    .filter((clave) => !CLAVES_PROTEGER.has(clave))
    .map((clave) => ({ clave, bytes: tamañoValor(localStorage.getItem(clave)) }))
    .sort((a, b) => b.bytes - a.bytes);

  restantes.forEach(({ clave, bytes }) => {
    if (bytes < 8 * 1024) return;
    try {
      localStorage.removeItem(clave);
    } catch {
      // ignore
    }
  });
}

export function setItemConEspacio(clave, valor) {
  const texto = valor == null ? '' : String(valor);
  try {
    localStorage.setItem(clave, texto);
    return;
  } catch (error) {
    if (!esErrorCuotaStorage(error)) throw error;
  }

  liberarEspacioLocalStorage();
  try {
    localStorage.setItem(clave, texto);
    return;
  } catch (error) {
    if (!esErrorCuotaStorage(error)) throw error;
  }

  clavesLocalStorage()
    .filter((k) => !CLAVES_PROTEGER.has(k) && k !== clave)
    .forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });

  localStorage.setItem(clave, texto);
}

export function persistirSesionUsuario(usuario = {}) {
  if (usuario.role) setItemConEspacio('rol', usuario.role);
  if (usuario.login) setItemConEspacio('login', usuario.login);
  if (usuario.name) setItemConEspacio('nombre', usuario.name);
  if (usuario.cedula) setItemConEspacio('cedula', String(usuario.cedula));
}

export function persistirSesionLogin({ token, usuario, extras = {} }) {
  if (token) setItemConEspacio('token', token);
  setItemConEspacio('tipoUsuario', 'secur');
  persistirSesionUsuario(usuario);
  Object.entries(extras).forEach(([clave, valor]) => {
    if (valor != null && valor !== '') setItemConEspacio(clave, String(valor));
  });
}
