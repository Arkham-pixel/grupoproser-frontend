/**
 * Sincronización entre pestañas/ventanas del mismo formulario.
 * Avisa cuando otra ventana guardó en servidor para recargar el mismo caso.
 */

const CHANNEL_NAME = 'proser-form-sync';

let channel = null;

function getChannel() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

/**
 * @param {string} formKey - clave del autoguardado (ej. formulario-complex-{id})
 * @param {string} recordId - _id del registro
 */
export function notifyFormServerSaved(formKey, recordId) {
  const payload = {
    formKey,
    recordId,
    savedAt: Date.now(),
  };

  try {
    getChannel()?.postMessage(payload);
  } catch {
    /* ignore */
  }

  try {
    localStorage.setItem(
      `proser_sync_${formKey}`,
      JSON.stringify(payload)
    );
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} formKey
 * @param {(info: { recordId: string, savedAt: number }) => void} handler
 */
export function subscribeFormServerSaved(formKey, handler) {
  if (!formKey || typeof handler !== 'function') {
    return () => {};
  }

  const bc = getChannel();
  const onMessage = (event) => {
    const data = event?.data;
    if (!data || data.formKey !== formKey) return;
    handler({ recordId: data.recordId, savedAt: data.savedAt });
  };

  const onStorage = (event) => {
    if (event.key !== `proser_sync_${formKey}` || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue);
      if (data?.formKey === formKey) {
        handler({ recordId: data.recordId, savedAt: data.savedAt });
      }
    } catch {
      /* ignore */
    }
  };

  bc?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);

  return () => {
    bc?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}
