import { API_URL } from "../config";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);

    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const hasBody = options.body !== undefined;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: hasBody
      ? { "Content-Type": "application/json" }
      : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    // A sessão vive em cookie HttpOnly: o navegador só o envia
    // quando pedimos credenciais explicitamente.
    credentials: "include",
    signal: options.signal,
  });

  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => null)) as { error?: string } | null;

    // Sessão expirada em qualquer chamada: a aplicação volta
    // para a tela de login.
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("sm:unauthorized"));
    }

    throw new ApiError(
      response.status,
      payload?.error ?? `Erro da API (HTTP ${response.status}).`
    );
  }

  // O DELETE de música responde 204, sem corpo.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Cliente HTTP fino: um único lugar para URL base, headers e erros.
 * As páginas devem falar com `api.ts`, nunca com `fetch` diretamente.
 */
export const http = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { signal }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body }),

  delete: <T = void>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body }),
};

export { API_URL };
