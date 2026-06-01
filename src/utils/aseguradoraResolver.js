/** Resuelve código de aseguradora → razón social usando catálogo de clientes. */
export function crearResolverNombreAseguradora(clientes = []) {
  const lista = Array.isArray(clientes) ? clientes : [];

  return (codigoAseguradora, nombreDesdeApi) => {
    const cod = String(codigoAseguradora ?? '').trim();
    const api = String(nombreDesdeApi ?? '').trim();
    const apiPareceNombre = api && api !== cod && !/^\d+$/.test(api);
    if (apiPareceNombre) return api;

    if (!cod) return '—';

    const match = lista.find((c) => {
      const c1 = String(c.codiAsgrdra ?? '').trim();
      const c2 = String(c.cod1Asgrdra ?? '').trim();
      const rz = String(c.rzonSocial ?? '').trim();
      return c1 === cod || c2 === cod || rz === cod;
    });

    if (match?.rzonSocial) return String(match.rzonSocial).trim();

    if (!/^\d+$/.test(cod)) return cod;

    return '—';
  };
}
