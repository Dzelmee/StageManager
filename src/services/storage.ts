const STORAGE_KEYS = {
  songs: "stagemanager-songs",
  shows: "stagemanager-shows",
  members: "stagemanager-members",
  equipment: "stagemanager-equipment",
  technicalFiles: "stagemanager-technical-files",
} as const;

/*
========================================
FUNÇÕES GENÉRICAS
========================================
*/

export function getStorageItem<T>(
  key: string,
  fallback: T
): T {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    return JSON.parse(saved) as T;
  } catch (error) {
    console.error(
      `Erro ao carregar "${key}" do storage:`,
      error
    );

    return fallback;
  }
}

export function setStorageItem<T>(
  key: string,
  value: T
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error(
      `Erro ao salvar "${key}" no storage:`,
      error
    );
  }
}

export function removeStorageItem(
  key: string
) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(
      `Erro ao remover "${key}" do storage:`,
      error
    );
  }
}

/*
========================================
MÚSICAS
========================================
*/

export function getSongs<T>() {
  return getStorageItem<T>(
    STORAGE_KEYS.songs,
    [] as T
  );
}

export function saveSongs<T>(
  songs: T
) {
  setStorageItem(
    STORAGE_KEYS.songs,
    songs
  );
}

/*
========================================
SHOWS
========================================
*/

export function getShows<T>() {
  return getStorageItem<T>(
    STORAGE_KEYS.shows,
    [] as T
  );
}

export function saveShows<T>(
  shows: T
) {
  setStorageItem(
    STORAGE_KEYS.shows,
    shows
  );
}

/*
========================================
INTEGRANTES
========================================
*/

export function getMembers<T>() {
  return getStorageItem<T>(
    STORAGE_KEYS.members,
    [] as T
  );
}

export function saveMembers<T>(
  members: T
) {
  setStorageItem(
    STORAGE_KEYS.members,
    members
  );
}

/*
========================================
EQUIPAMENTOS
========================================
*/

export function getEquipment<T>() {
  return getStorageItem<T>(
    STORAGE_KEYS.equipment,
    [] as T
  );
}

export function saveEquipment<T>(
  equipment: T
) {
  setStorageItem(
    STORAGE_KEYS.equipment,
    equipment
  );
}

/*
========================================
ARQUIVOS TÉCNICOS
========================================
*/

export function getTechnicalFiles<T>() {
  return getStorageItem<T>(
    STORAGE_KEYS.technicalFiles,
    [] as T
  );
}

export function saveTechnicalFiles<T>(
  files: T
) {
  setStorageItem(
    STORAGE_KEYS.technicalFiles,
    files
  );
}

/*
========================================
SETLIST POR SHOW
========================================
*/

export function getShowSetlist<T>(
  showId: number
) {
  return getStorageItem<T>(
    `stagemanager-setlist-${showId}`,
    [] as T
  );
}

export function saveShowSetlist<T>(
  showId: number,
  setlist: T
) {
  setStorageItem(
    `stagemanager-setlist-${showId}`,
    setlist
  );
}

/*
========================================
CHECKLIST POR SHOW
========================================
*/

export function getShowChecklist<T>(
  showId: number
) {
  return getStorageItem<T>(
    `stagemanager-checklist-${showId}`,
    {} as T
  );
}

export function saveShowChecklist<T>(
  showId: number,
  checklist: T
) {
  setStorageItem(
    `stagemanager-checklist-${showId}`,
    checklist
  );
}

/*
========================================
POSIÇÃO DO MODO PALCO
========================================
*/

export function getStagePosition(
  showId: number
) {
  return getStorageItem<number>(
    `stagemanager-stage-position-${showId}`,
    0
  );
}

export function saveStagePosition(
  showId: number,
  position: number
) {
  setStorageItem(
    `stagemanager-stage-position-${showId}`,
    position
  );
}