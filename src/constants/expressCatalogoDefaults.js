export {
  AMPAROS_EXPRESS_DEFAULT as AMPAROS_EXPRESS,
} from './expressCatalogoDefaults.js';

import { AMPAROS_EXPRESS_DEFAULT } from './expressCatalogoDefaults.js';

const norm = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

/** Fallback local si el catálogo API aún no cargó. */
export const normalizarAmparoExpress = (value) => {
  if (!value) return null;
  return AMPAROS_EXPRESS_DEFAULT.find((item) => norm(item) === norm(value)) ?? null;
};
