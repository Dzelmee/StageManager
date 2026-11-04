import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  authApi,
  type AuthProviders,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
} from "../services/api";
import { ApiError } from "../services/http";

type AuthContextValue = {
  user: PublicUser | null;
  providers: AuthProviders | null;
  loading: boolean;
  error: string;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: PublicUser) => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFrom(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await authApi.me();
      setUser(result.user);
    } catch (currentError) {
      if (
        currentError instanceof ApiError &&
        currentError.status === 401
      ) {
        setUser(null);
        return;
      }

      setError(messageFrom(currentError));
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const result = await authApi.me();

        if (active) {
          setUser(result.user);
        }
      } catch (currentError) {
        if (
          active &&
          (!(currentError instanceof ApiError) ||
            currentError.status !== 401)
        ) {
          setError(messageFrom(currentError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    async function loadProviders() {
      try {
        const result = await authApi.providers();

        if (active) {
          setProviders(result);
        }
      } catch {
        // Se o endpoint falhar, o login por senha continua disponível.
      }
    }

    void Promise.all([bootstrap(), loadProviders()]);

    function handleUnauthorized() {
      setUser(null);
    }

    window.addEventListener("sm:unauthorized", handleUnauthorized);

    return () => {
      active = false;
      window.removeEventListener("sm:unauthorized", handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    setError("");

    try {
      const result = await authApi.login(input);
      setUser(result.user);
    } catch (currentError) {
      const message = messageFrom(currentError);
      setError(message);
      throw new Error(message, { cause: currentError });
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    setError("");

    try {
      const result = await authApi.register(input);
      setUser(result.user);
    } catch (currentError) {
      const message = messageFrom(currentError);
      setError(message);
      throw new Error(message, { cause: currentError });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Mesmo que a chamada falhe, a interface deve sair.
    } finally {
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updated: PublicUser) => {
    setUser(updated);
  }, []);

  const clearError = useCallback(() => setError(""), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      providers,
      loading,
      error,
      login,
      register,
      logout,
      refresh,
      updateUser,
      clearError,
    }),
    [
      user,
      providers,
      loading,
      error,
      login,
      register,
      logout,
      refresh,
      updateUser,
      clearError,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
