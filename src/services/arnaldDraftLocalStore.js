const PREFIX = 'arnald_draft_v1_';

function loginClave() {
  try {
    return localStorage.getItem('login') || 'anon';
  } catch {
    return 'anon';
  }
}

function storageKey(formKey) {
  return `${PREFIX}${loginClave()}__${formKey}`;
}

export function escribirBorradorLocal(formKey, payload) {
  if (!formKey) return false;
  const registro = {
    formKey,
    payload,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(storageKey(formKey), JSON.stringify(registro));
    return true;
  } catch {
    try {
      limpiarBorradoresLocalesAntiguos();
      localStorage.setItem(storageKey(formKey), JSON.stringify(registro));
      return true;
    } catch {
      return false;
    }
  }
}

export function leerBorradorLocal(formKey) {
  if (!formKey) return null;
  try {
    const raw = localStorage.getItem(storageKey(formKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.payload) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listarBorradoresLocales() {
  const login = loginClave();
  const prefijo = `${PREFIX}${login}__`;
  const items = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefijo)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '{}');
        if (!parsed?.formKey || !parsed?.payload) continue;
        items.push({
          formKey: parsed.formKey,
          savedAt: parsed.savedAt,
          titulo: parsed.titulo || '',
          modulo: parsed.modulo || '',
          source: 'local',
        });
      } catch {
        // ignore
      }
    }
  } catch {
    return [];
  }
  return items.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
}

export function borrarBorradorLocal(formKey) {
  if (!formKey) return;
  try {
    localStorage.removeItem(storageKey(formKey));
  } catch {
    // ignore
  }
}

function limpiarBorradoresLocalesAntiguos() {
  const ahora = Date.now();
  const maxAge = 90 * 24 * 60 * 60 * 1000;
  const claves = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) claves.push(k);
  }
  claves.forEach((k) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(k) || '{}');
      const saved = new Date(parsed.savedAt || 0).getTime();
      if (!saved || ahora - saved > maxAge) localStorage.removeItem(k);
    } catch {
      localStorage.removeItem(k);
    }
  });
}
