import { http } from "./http";

export type ApiHealth = {
  status: string;
  application: string;
  timestamp: string;
};

export async function getApiHealth(): Promise<ApiHealth> {
  return http.get<ApiHealth>("/api/health");
}

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
  bandId: number;
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
  bandId: number;
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
  bandId: number;
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
  list: (bandId: number) =>
    http.get<ApiSong[]>(`/api/songs?bandId=${bandId}`),

  create: (input: SongInput) =>
    http.post<ApiSong>("/api/songs", input),

  update: (id: number, input: Partial<SongInput>) =>
    http.put<ApiSong>(`/api/songs/${id}`, input),

  remove: (id: number, bandId: number) =>
    http.delete(`/api/songs/${id}?bandId=${bandId}`),
};

export const showsApi = {
  list: (bandId: number, signal?: AbortSignal) =>
    http.get<ApiShow[]>(`/api/shows?bandId=${bandId}`, signal),

  create: (input: ShowInput) =>
    http.post<ApiShow>("/api/shows", input),

  update: (id: number, input: Partial<ShowInput>) =>
    http.put<ApiShow>(`/api/shows/${id}`, input),
};

export const setlistsApi = {
  list: (bandId: number, signal?: AbortSignal) =>
    http.get<ApiSetlist[]>(`/api/setlists?bandId=${bandId}`, signal),

  create: (input: SetlistInput) =>
    http.post<ApiSetlist>("/api/setlists", input),

  addSong: (setlistId: number, songId: number) =>
    http.post<ApiSetlistItem>(`/api/setlists/${setlistId}/songs`, {
      songId,
    }),

  removeSong: (setlistId: number, itemId: number) =>
    http.delete(`/api/setlists/${setlistId}/songs/${itemId}`),

  reorder: (setlistId: number, itemIds: number[], bandId?: number) =>
    http.put<ApiSetlistItem[]>(`/api/setlists/${setlistId}/reorder`, {
      itemIds,
      ...(bandId ? { bandId } : {}),
    }),

  duration: (setlistId: number) =>
    http.get<SetlistDuration>(`/api/setlists/${setlistId}/duration`),
};
