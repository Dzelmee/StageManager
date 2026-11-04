const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

/**
 * Base da API. Configurável por `VITE_API_URL` para permitir rodar o SPA
 * apontando para outro host/porta sem editar código.
 */
export const API_URL = (
  configuredApiUrl || "http://localhost:3333"
).replace(/\/+$/, "");

const configuredBandId = Number(import.meta.env.VITE_BAND_ID);

/**
 * Banda usada em todas as chamadas enquanto não existe autenticação.
 * O padrão é `1`, a banda criada pelo seed de desenvolvimento.
 */
export const BAND_ID =
  Number.isInteger(configuredBandId) && configuredBandId > 0
    ? configuredBandId
    : 1;
