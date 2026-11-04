import { API_URL, http } from "./http";

export type ApiHealth = {
  status: string;
  application: string;
  timestamp: string;
};

export async function getApiHealth(): Promise<ApiHealth> {
  return http.get<ApiHealth>("/api/health");
}

/* =====================================
   CONTA E AUTENTICAÇÃO
   ===================================== */

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  instrument: string | null;
  consentVersion: string | null;
  consentedAt: string | null;
  marketingOptIn: boolean;
  createdAt: string;
  bandId: number;
};

export type AuthProviders = {
  password: boolean;
  google: boolean;
  apple: boolean;
  consentVersion: string;
  termsVersion: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  name: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingOptIn?: boolean;
};

export type ProfileInput = {
  name?: string;
  instrument?: string | null;
  avatarUrl?: string | null;
  marketingOptIn?: boolean;
};

export type ApiSession = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
};

export type DeleteAccountInput = {
  confirmation: string;
  email: string;
  password: string;
};

export const authApi = {
  providers: () => http.get<AuthProviders>("/api/auth/providers"),

  me: () => http.get<{ user: PublicUser }>("/api/auth/me"),

  login: (input: LoginInput) =>
    http.post<{ user: PublicUser }>("/api/auth/login", input),

  register: (input: RegisterInput) =>
    http.post<{ user: PublicUser; verificationToken?: string }>(
      "/api/auth/register",
      input
    ),

  logout: () => http.post<void>("/api/auth/logout"),

  updateProfile: (input: ProfileInput) =>
    http.put<{ user: PublicUser }>("/api/auth/me", input),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.post<void>("/api/auth/me/password", {
      currentPassword,
      newPassword,
    }),

  sessions: () =>
    http.get<{ sessions: ApiSession[] }>("/api/auth/me/sessions"),

  revokeSession: (id: string) =>
    http.delete(`/api/auth/me/sessions/${id}`),

  logoutAll: () => http.post<void>("/api/auth/logout-all"),

  forgotPassword: (email: string) =>
    http.post<{ message: string }>("/api/auth/forgot-password", {
      email,
    }),

  resetPassword: (token: string, newPassword: string) =>
    http.post<void>("/api/auth/reset-password", {
      token,
      newPassword,
    }),

  deleteAccount: (input: DeleteAccountInput) =>
    http.delete<void>("/api/auth/me", input),

  /**
   * Baixa o arquivo JSON de portabilidade (LGPD).
   * Usa `fetch` direto porque o conteúdo é um download, não JSON
   * de resposta para a interface.
   */
  async exportData(): Promise<void> {
    const response = await fetch(`${API_URL}/api/auth/me/export`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(
        "Não foi possível gerar o arquivo dos seus dados."
      );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "stagemanager-meus-dados.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

/* =====================================
   DADOS DO WORKSPACE
   ===================================== */

export type SongStatus = "Pronta" | "Ensaiando" | "Nova" | "Pausada";

export type ApiSong = {
  id: number;
  title: string;
  artist: string | null;
  bpm: number | null;
  key: string | null;
  tuning: string | null;
  duration: number | null;
  status: SongStatus;
  bandId: number;
  createdAt: string;
  updatedAt: string;
};

export type SongInput = {
  title: string;
  artist?: string | null;
  bpm?: number | null;
  key?: string | null;
  tuning?: string | null;
  duration?: number | null;
  status?: SongStatus;
};

export type ShowStatus =
  | "Confirmado"
  | "Pendente"
  | "Realizado"
  | "Cancelado";

export type ApiShow = {
  id: number;
  name: string;
  venue: string;
  city: string | null;
  date: string;
  showTime: string | null;
  loadIn: string | null;
  soundcheck: string | null;
  duration: number | null;
  status: ShowStatus;
  notes: string | null;
  bandId: number;
  createdAt: string;
  updatedAt: string;
  setlists?: ApiSetlist[];
};

export type ShowInput = {
  name: string;
  venue: string;
  city?: string | null;
  date: string;
  showTime?: string | null;
  loadIn?: string | null;
  soundcheck?: string | null;
  duration?: number | null;
  status?: ShowStatus;
  notes?: string | null;
};

export type ApiSetlistItem = {
  id: number;
  position: number;
  setlistId: number;
  songId: number;
  song: ApiSong;
};

export type ApiSetlist = {
  id: number;
  name: string;
  bandId: number;
  showId: number | null;
  createdAt: string;
  updatedAt: string;
  songs: ApiSetlistItem[];
  show?: ApiShow | null;
};

export type SetlistInput = {
  name: string;
  showId?: number | null;
};

export type SetlistDuration = {
  setlistId: number;
  name: string;
  totalSongs: number;
  totalSeconds: number;
  formattedDuration: string;
};

export const songsApi = {
  list: (signal?: AbortSignal) =>
    http.get<ApiSong[]>("/api/songs", signal),

  create: (input: SongInput) =>
    http.post<ApiSong>("/api/songs", input),

  update: (id: number, input: Partial<SongInput>) =>
    http.put<ApiSong>(`/api/songs/${id}`, input),

  remove: (id: number) => http.delete(`/api/songs/${id}`),
};

export const showsApi = {
  list: (signal?: AbortSignal) =>
    http.get<ApiShow[]>("/api/shows", signal),

  create: (input: ShowInput) =>
    http.post<ApiShow>("/api/shows", input),

  update: (id: number, input: Partial<ShowInput>) =>
    http.put<ApiShow>(`/api/shows/${id}`, input),
};

export const setlistsApi = {
  list: (signal?: AbortSignal) =>
    http.get<ApiSetlist[]>("/api/setlists", signal),

  create: (input: SetlistInput) =>
    http.post<ApiSetlist>("/api/setlists", input),

  addSong: (setlistId: number, songId: number) =>
    http.post<ApiSetlistItem>(`/api/setlists/${setlistId}/songs`, {
      songId,
    }),

  removeSong: (setlistId: number, itemId: number) =>
    http.delete(`/api/setlists/${setlistId}/songs/${itemId}`),

  reorder: (setlistId: number, itemIds: number[]) =>
    http.put<ApiSetlistItem[]>(`/api/setlists/${setlistId}/reorder`, {
      itemIds,
    }),

  duration: (setlistId: number) =>
    http.get<SetlistDuration>(`/api/setlists/${setlistId}/duration`),
};
