const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

/**
 * Base da API. Configurável por `VITE_API_URL` para permitir rodar o SPA
 * apontando para outro host/porta sem editar código.
 */
export const API_URL = (
  configuredApiUrl || "http://localhost:3333"
).replace(/\/+$/, "");

