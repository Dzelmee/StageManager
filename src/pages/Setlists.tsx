import {
  useEffect,
  useState,
} from "react";

import {
  saveShowSetlist,
} from "../services/storage";

import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Clock3,
  Music2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

type Song = {
  id: number;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  tuning: string;
  duration: string;
  status: string;
};

type Show = {
  id: number;
  name: string;
  venue: string;
  city: string;
  date: string;
  showTime: string;
  loadIn: string;
  soundcheck: string;
  duration: number;
  status: string;
  notes: string;
};

type SetlistsProps = {
  showId: number | null;
};

function loadShows(): Show[] {
  try {
    const saved =
      localStorage.getItem(
        "stagemanager-shows"
      );

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function getStorageKey(
  showId: number | null
) {
  if (showId === null) {
    return "stagemanager-setlist-general";
  }

  return `stagemanager-setlist-${showId}`;
}

function durationToSeconds(
  duration: string
) {
  const parts =
    duration.split(":");

  if (parts.length !== 2) {
    return 0;
  }

  const minutes =
    Number(parts[0]);

  const seconds =
    Number(parts[1]);

  if (
    Number.isNaN(minutes) ||
    Number.isNaN(seconds)
  ) {
    return 0;
  }

  return (
    minutes * 60 +
    seconds
  );
}

function formatSeconds(
  totalSeconds: number
) {
  const safeSeconds =
    Math.max(
      0,
      Math.floor(totalSeconds)
    );

  const hours =
    Math.floor(
      safeSeconds / 3600
    );

  const minutes =
    Math.floor(
      (safeSeconds % 3600) /
        60
    );

  const seconds =
    safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(
      minutes
    ).padStart(
      2,
      "0"
    )}m ${String(
      seconds
    ).padStart(
      2,
      "0"
    )}s`;
  }

  return `${minutes}:${String(
    seconds
  ).padStart(
    2,
    "0"
  )}`;
}

function formatShowDate(
  date: string
) {
  if (!date) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = date.split("-");

  return `${day}/${month}/${year}`;
}

function Setlists({
  showId,
}: SetlistsProps) {
  const [repertoire, setRepertoire] = useState<Song[]>([]);
  const [repertoireError, setRepertoireError] = useState("");
  
  useEffect(() => {
    let active = true;
  
    async function loadSongsFromApi() {
      try {
        const response = await fetch(
          "http://localhost:3333/api/songs?bandId=1"
        );
  
        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}`);
        }
  
        const data = await response.json();
  
        if (!Array.isArray(data)) {
          throw new Error("Resposta inválida da API.");
        }
  
        if (active) {
          setRepertoire(
            data.map((song) => ({
              ...song,
              artist: song.artist ?? "",
              bpm: song.bpm ?? 0,
              key: song.key ?? "",
              tuning: song.tuning ?? "",
              duration:
                song.duration == null
                  ? "0:00"
                  : `${Math.floor(song.duration / 60)}:${String(
                      song.duration % 60
                    ).padStart(2, "0")}`,
            }))
          );
  
          setRepertoireError("");
        }
      } catch (error) {
        console.error("Erro ao carregar repertório:", error);
  
        if (active) {
          setRepertoireError(
            "Não foi possível carregar as músicas do servidor."
          );
        }
      }
    }
  
    void loadSongsFromApi();
  
    return () => {
      active = false;
    };
  }, []);

  const [shows] =
    useState<Show[]>(
      loadShows
    );

    const [setlist, setSetlist] = useState<Song[]>([]);
    const [setlistLoading, setSetlistLoading] = useState(true);
    const [setlistError, setSetlistError] = useState("");
    
    useEffect(() => {
      let active = true;
    
      async function loadSetlistFromApi() {
        setSetlistLoading(true);
        setSetlistError("");
    
        try {
          const response = await fetch(
            "http://localhost:3333/api/setlists?bandId=1"
          );
    
          if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
          }
    
          const data = await response.json();
    
          if (!Array.isArray(data)) {
            throw new Error("Resposta inválida da API.");
          }
    
          const selectedSetlist = data.find(
            (item) =>
              showId === null
                ? item.showId === null
                : item.showId === showId
          );

          
    
          const songs: Song[] = selectedSetlist
            ? selectedSetlist.songs.map(
                (item: {
                  song: {
                    id: number;
                    title: string;
                    artist: string | null;
                    bpm: number | null;
                    key: string | null;
                    tuning: string | null;
                    duration: number | null;
                    status: string;
                  };
                }) => ({
                  ...item.song,
                  artist: item.song.artist ?? "",
                  bpm: item.song.bpm ?? 0,
                  key: item.song.key ?? "",
                  tuning: item.song.tuning ?? "",
                  duration:
                    item.song.duration == null
                      ? "0:00"
                      : `${Math.floor(item.song.duration / 60)}:${String(
                          item.song.duration % 60
                        ).padStart(2, "0")}`,
                })
              )
            : [];
    
          if (active) {
            setSetlist(songs);
          }
        } catch (error) {
          console.error("Erro ao carregar setlist:", error);
    
          if (active) {
            setSetlistError(
              "Não foi possível carregar a setlist do servidor."
            );
          }
        } finally {
          if (active) {
            setSetlistLoading(false);
          }
        }
      }
    
      void loadSetlistFromApi();
    
      return () => {
        active = false;
      };
    }, [showId]);

  const [search, setSearch] =
    useState("");

  const [
    extraMinutes,
    setExtraMinutes,
  ] = useState(5);

  const selectedShow =
    showId === null
      ? null
      : shows.find(
          (show) =>
            show.id === showId
        ) ?? null;

  const [
    showLimit,
    setShowLimit,
  ] = useState(
    selectedShow?.duration ??
      60
  );

  /*
    IMPORTANTE:

    Quando mudamos de um show
    para outro, carregamos o
    setlist daquele show.
  */

    useEffect(() => {
      if (showId === null) {
        return;
      }
    
      saveShowSetlist(
        showId,
        setlist
      );
    }, [setlist, showId]);

  /*
    Se o show possuir duração
    cadastrada, usamos como
    limite automaticamente.
  */

  useEffect(() => {
    setShowLimit(
      selectedShow?.duration ??
        60
    );
  }, [
    showId,
    selectedShow?.duration,
  ]);

  /*
    Salva o setlist utilizando
    uma chave específica
    para cada show.
  */

  useEffect(() => {
    localStorage.setItem(
      getStorageKey(showId),
      JSON.stringify(setlist)
    );
  }, [setlist, showId]);

  const availableSongs =
    repertoire.filter(
      (song) => {
        const alreadyAdded =
          setlist.some(
            (item) =>
              item.id ===
              song.id
          );

        const term =
          search.toLowerCase();

        const matchesSearch =
          song.title
            .toLowerCase()
            .includes(term) ||
          song.artist
            .toLowerCase()
            .includes(term);

        return (
          !alreadyAdded &&
          matchesSearch
        );
      }
    );

  const musicSeconds =
    setlist.reduce(
      (total, song) =>
        total +
        durationToSeconds(
          song.duration
        ),
      0
    );

  const extraSeconds =
    extraMinutes * 60;

  const totalSeconds =
    musicSeconds +
    extraSeconds;

  const limitSeconds =
    showLimit * 60;

  const difference =
    limitSeconds -
    totalSeconds;

  const isOverLimit =
    difference < 0;

      async function addSong(song: Song) {
        try {
          // Consulta as setlists cadastradas no PostgreSQL.
          const listResponse = await fetch(
            "http://localhost:3333/api/setlists?bandId=1"
          );
      
          if (!listResponse.ok) {
            throw new Error("Não foi possível consultar as setlists.");
          }
      
          const lists = await listResponse.json();
      
          if (!Array.isArray(lists)) {
            throw new Error("Resposta inválida da API.");
          }
      
          // Identifica a setlist correspondente ao show.
          const selectedList = lists.find(
            (item: { id: number; showId: number | null }) =>
              showId === null
                ? item.id === 1
                : item.showId === showId
          );
      
          if (!selectedList) {
            throw new Error(
              "Nenhuma setlist encontrada para este show."
            );
          }
      
          // Evita adicionar a mesma música duas vezes.
          const alreadyAdded = selectedList.songs?.some(
            (item: { songId: number }) => item.songId === song.id
          );
      
          if (alreadyAdded) {
            alert("Esta música já está na setlist.");
            return;
          }
      
          // Adiciona à setlist correta.
          const response = await fetch(
            `http://localhost:3333/api/setlists/${selectedList.id}/songs`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                songId: song.id,
              }),
            }
          );
      
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
      
            throw new Error(
              errorData?.error ??
                `Erro ao adicionar música. HTTP ${response.status}`
            );
          }
      
          // Confirma o salvamento no PostgreSQL.
          const savedItem = await response.json();
      
          setSetlist((current) => [...current, song]);
      
          console.log("Música adicionada:", savedItem);
          console.log("Setlist utilizada:", selectedList.id);
        } catch (error) {
          console.error("Erro ao adicionar música:", error);
      
          alert(
            error instanceof Error
              ? error.message
              : "Não foi possível adicionar a música."
          );
        }
      }


    async function removeSong(songId: number) {
    
      const confirmed = window.confirm(
        "Deseja remover esta música da setlist? Ela continuará no Repertório."
      );
    
      if (!confirmed) return;
    
      try {
        // Busca a setlist atual para encontrar o ID
        // do vínculo entre música e setlist.
        const listResponse = await fetch(
          "http://localhost:3333/api/setlists?bandId=1"
        );
    
        if (!listResponse.ok) {
          throw new Error("Não foi possível consultar a setlist.");
        }
    
        const lists = await listResponse.json();
    
        const selectedList = lists.find(
          (item: { id: number; showId: number | null }) =>
            showId === null
              ? item.id === 1
              : item.showId === showId
        );
    
        if (!selectedList) {
          throw new Error("Setlist não encontrada.");
        }
    
        const linkedSong = selectedList.songs.find(
          (item: { id: number; songId: number }) =>
            item.songId === songId
        );
    
        if (!linkedSong) {
          throw new Error("Música não encontrada na setlist.");
        }
    
        const response = await fetch(
          `http://localhost:3333/api/setlists/${selectedList.id}/songs/${linkedSong.id}`,
          {
            method: "DELETE",
          }
        );
    
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
    
          throw new Error(
            errorData?.error ??
              `Erro ao remover música. HTTP ${response.status}`
          );
        }
    
        // Atualiza a interface somente após confirmar
        // que a música foi removida do banco.
        setSetlist((current) =>
          current.filter((song) => song.id !== songId)
        );
      } catch (error) {
        console.error("Erro ao remover música:", error);
    
        alert(
          error instanceof Error
            ? error.message
            : "Não foi possível remover a música."
        );
      }
    }

    async function moveSong(
      index: number,
      direction: "up" | "down"
    ) {
      const newIndex =
        direction === "up" ? index - 1 : index + 1;
    
      if (newIndex < 0 || newIndex >= setlist.length) {
        return;
      }
    
      const updated = [...setlist];
    
      [updated[index], updated[newIndex]] = [
        updated[newIndex],
        updated[index],
      ];
    
      try {
        // Consulta os IDs reais dos itens da setlist.
        const listResponse = await fetch(
          "http://localhost:3333/api/setlists?bandId=1"
        );
    
        if (!listResponse.ok) {
          throw new Error("Não foi possível consultar a setlist.");
        }
    
        const lists = await listResponse.json();
    
        const selectedList = lists.find(
          (item: { id: number; showId: number | null }) =>
            showId === null
              ? item.id === 1
              : item.showId === showId
        );
    
        if (!selectedList) {
          throw new Error("Setlist não encontrada.");
        }
    
        // Relaciona os itens do banco às músicas da interface.
        const usedItemIds = new Set<number>();
    
        const itemIds = updated.map((song) => {
          const linkedItem = selectedList.songs.find(
            (item: { id: number; songId: number }) =>
              item.songId === song.id &&
              !usedItemIds.has(item.id)
          );
    
          if (!linkedItem) {
            throw new Error(
              `Não foi possível localizar "${song.title}" na setlist.`
            );
          }
    
          usedItemIds.add(linkedItem.id);
          return linkedItem.id;
        });
    
        console.log("DEBUG REORDER:", {
          showId,
          setlistId: selectedList.id,
          idsDoBanco: selectedList.songs.map(
            (item: { id: number }) => item.id
          ),
          idsEnviados: itemIds,
        });
        // Envia a nova ordem para o PostgreSQL.
        const response = await fetch(
          `http://localhost:3333/api/setlists/${selectedList.id}/reorder`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              songIds: itemIds,
            }),
          }
        );
    
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
    
          throw new Error(
            errorData?.error ??
              `Erro ao reorganizar setlist. HTTP ${response.status}`
          );
        }
    
        // Atualiza a interface após o banco confirmar.
        setSetlist(updated);
      } catch (error) {
        console.error("Erro ao reorganizar músicas:", error);
    
        alert(
          error instanceof Error
            ? error.message
            : "Não foi possível reorganizar as músicas."
        );
      }
    }

    async function clearSetlist() {
      if (setlist.length === 0) {
        return;
      }
    
      const confirmed = window.confirm(
        "Deseja remover todas as músicas desta setlist? As músicas continuarão no Repertório."
      );
    
      if (!confirmed) {
        return;
      }
    
      try {
        // Consulta as setlists existentes.
        const listResponse = await fetch(
          "http://localhost:3333/api/setlists?bandId=1"
        );
    
        if (!listResponse.ok) {
          throw new Error("Não foi possível consultar as setlists.");
        }
    
        const lists = await listResponse.json();
    
        if (!Array.isArray(lists)) {
          throw new Error("Resposta inválida da API.");
        }
    
        // Identifica a setlist correta.
        const selectedList = lists.find(
          (item: { id: number; showId: number | null }) =>
            showId === null
              ? item.id === 1
              : item.showId === showId
        );
    
        if (!selectedList) {
          throw new Error("Setlist não encontrada.");
        }
    
        const items = selectedList.songs as Array<{
          id: number;
          songId: number;
        }>;
    
        if (!Array.isArray(items)) {
          throw new Error("Não foi possível consultar as músicas da setlist.");
        }
    
        // Remove os vínculos, sem excluir músicas do Repertório.
        for (const item of items) {
          const response = await fetch(
            `http://localhost:3333/api/setlists/${selectedList.id}/songs/${item.id}`,
            {
              method: "DELETE",
            }
          );
    
          if (!response.ok) {
            throw new Error(
              `Falha ao remover uma música. HTTP ${response.status}`
            );
          }
        }
    
        // Atualiza a interface somente após a confirmação da API.
        setSetlist([]);
    
        alert("Setlist limpa com sucesso!");
      } catch (error) {
        console.error("Erro ao limpar setlist:", error);
    
        alert(
          "Não foi possível concluir a limpeza. Atualize a página para conferir o estado salvo no banco."
        );
      }
    }

  return (
    <div>

      {/* ERRO AO CARREGAR REPERTÓRIO */}
      {repertoireError && (
        <p
          role="alert"
          style={{
            color: "#ef4444",
            marginBottom: 16,
          }}
        >
          {repertoireError}
        </p>
      )}

{setlistLoading && (
  <p role="status">
    Carregando setlist do servidor...
  </p>
)}

{setlistError && (
  <p
    role="alert"
    style={{
      color: "#ef4444",
      marginBottom: 16,
    }}
  >
    {setlistError}
  </p>
)}

      {/* HEADER */}

      <header className="page-header">

        <div>

          <span className="eyebrow">
            {selectedShow
              ? "SETLIST DO SHOW"
              : "SHOW BUILDER"}
          </span>

          <h1>
            {selectedShow
              ? selectedShow.name
              : "Setlist"}
          </h1>

          <p>
            {selectedShow
              ? `${selectedShow.venue} • ${selectedShow.city}`
              : "Monte a ordem do show usando seu repertório."}
          </p>

        </div>

        <button
          className="secondary-button"
          onClick={
            clearSetlist
          }
        >
          <Trash2 size={14} />

          Limpar Setlist
        </button>

      </header>

      {/* INFORMAÇÕES DO SHOW */}

      {selectedShow && (

        <section className="setlist-show-context">

          <div>

            <CalendarDays
              size={16}
            />

            <span>
              DATA
            </span>

            <strong>
              {formatShowDate(
                selectedShow.date
              )}
            </strong>

          </div>

          <div>

            <Clock3
              size={16}
            />

            <span>
              SHOW
            </span>

            <strong>
              {
                selectedShow.showTime
              }
            </strong>

          </div>

          <div>

            <Clock3
              size={16}
            />

            <span>
              LIMITE
            </span>

            <strong>
              {
                selectedShow.duration
              }{" "}
              min
            </strong>

          </div>

          <div className="setlist-context-name">

            <span>
              LOCAL
            </span>

            <strong>
              {
                selectedShow.venue
              }
            </strong>

          </div>

        </section>

      )}

      {/* RESUMO */}

      <section className="setlist-summary">

        <div className="setlist-stat">

          <span>
            MÚSICAS
          </span>

          <strong>
            {setlist.length}
          </strong>

        </div>

        <div className="setlist-stat">

          <span>
            TEMPO DE MÚSICA
          </span>

          <strong>
            {formatSeconds(
              musicSeconds
            )}
          </strong>

        </div>

        <div className="setlist-stat">

          <span>
            TEMPO EXTRA
          </span>

          <strong>
            {extraMinutes} min
          </strong>

        </div>

        <div className="setlist-stat highlight">

          <span>
            DURAÇÃO DO SHOW
          </span>

          <strong>
            {formatSeconds(
              totalSeconds
            )}
          </strong>

        </div>

      </section>

      {/* BUILDER */}

      <section className="setlist-builder">

        {/* REPERTÓRIO */}

        <div className="setlist-panel">

          <div className="setlist-panel-header">

            <div>

              <span className="eyebrow">
                REPERTÓRIO
              </span>

              <h2>
                Adicionar músicas
              </h2>

            </div>

            <span className="setlist-count">
              {
                availableSongs.length
              }
            </span>

          </div>

          <div className="setlist-search">

            <Search size={16} />

            <input
              type="text"
              placeholder="Buscar música..."
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

          <div className="available-songs">

            {availableSongs.map(
              (song) => (

                <div
                  className="available-song"
                  key={song.id}
                >

                  <div className="available-song-info">

                    <strong>
                      {song.title}
                    </strong>

                    <span>
                      {song.artist}
                    </span>

                    <small>
                      {song.bpm} BPM
                      {" • "}
                      {song.key}
                      {" • "}
                      {song.duration}
                    </small>

                  </div>

                  <button
                    className="add-setlist-button"
                    title="Adicionar ao setlist"
                    onClick={() =>
                      addSong(song)
                    }
                  >
                    <Plus
                      size={16}
                    />
                  </button>

                </div>

              )
            )}

            {availableSongs.length ===
              0 && (

              <div className="setlist-empty-small">

                <Music2
                  size={25}
                />

                <span>
                  Nenhuma música
                  disponível.
                </span>

              </div>

            )}

          </div>

        </div>

        {/* SETLIST */}

        <div className="setlist-panel main-setlist">

          <div className="setlist-panel-header">

            <div>

              <span className="eyebrow">
                ORDEM DO SHOW
              </span>

              <h2>
                {selectedShow
                  ? selectedShow.name
                  : "Setlist atual"}
              </h2>

            </div>

            <span className="setlist-count">
              {setlist.length}
            </span>

          </div>

          <div className="current-setlist">

            {setlist.map(
              (
                song,
                index
              ) => (

                <div
                  className="setlist-song"
                  key={song.id}
                >

                  <div className="setlist-position">

                    {String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}

                  </div>

                  <div className="setlist-song-info">

                    <strong>
                      {song.title}
                    </strong>

                    <span>
                      {song.artist}
                    </span>

                    <small>
                      {song.key}
                      {" • "}
                      {song.bpm} BPM
                      {" • "}
                      {song.tuning}
                    </small>

                  </div>

                  <div className="setlist-duration">
                    {song.duration}
                  </div>

                  <div className="setlist-actions">

                    <button
                      title="Mover para cima"
                      disabled={
                        index === 0
                      }
                      onClick={() =>
                        moveSong(
                          index,
                          "up"
                        )
                      }
                    >
                      <ArrowUp
                        size={14}
                      />
                    </button>

                    <button
                      title="Mover para baixo"
                      disabled={
                        index ===
                        setlist.length -
                          1
                      }
                      onClick={() =>
                        moveSong(
                          index,
                          "down"
                        )
                      }
                    >
                      <ArrowDown
                        size={14}
                      />
                    </button>

                    <button
                      className="remove"
                      title="Remover"
                      onClick={() =>
                        removeSong(
                          song.id
                        )
                      }
                    >
                      <Trash2
                        size={14}
                      />
                    </button>

                  </div>

                </div>

              )
            )}

            {setlist.length ===
              0 && (

              <div className="setlist-empty">

                <Music2
                  size={32}
                />

                <strong>
                  Seu setlist está
                  vazio
                </strong>

                <span>
                  Adicione músicas
                  usando o repertório.
                </span>

              </div>

            )}

          </div>

        </div>

        {/* TEMPO */}

        <aside className="setlist-panel time-panel">

          <div className="setlist-panel-header">

            <div>

              <span className="eyebrow">
                TEMPO
              </span>

              <h2>
                Show
              </h2>

            </div>

            <Clock3 size={18} />

          </div>

          <div className="time-form">

            <label>
              Limite do show
            </label>

            <div className="time-input">

              <input
                type="number"
                min="1"
                value={
                  showLimit
                }
                onChange={(
                  event
                ) =>
                  setShowLimit(
                    Math.max(
                      1,
                      Number(
                        event.target
                          .value
                      )
                    )
                  )
                }
              />

              <span>
                min
              </span>

            </div>

            <label>
              Falas / pausas /
              trocas
            </label>

            <div className="time-input">

              <input
                type="number"
                min="0"
                value={
                  extraMinutes
                }
                onChange={(
                  event
                ) =>
                  setExtraMinutes(
                    Math.max(
                      0,
                      Number(
                        event.target
                          .value
                      )
                    )
                  )
                }
              />

              <span>
                min
              </span>

            </div>

          </div>

          <div className="time-breakdown">

            <div>

              <span>
                Músicas
              </span>

              <strong>
                {formatSeconds(
                  musicSeconds
                )}
              </strong>

            </div>

            <div>

              <span>
                Extras
              </span>

              <strong>
                {extraMinutes} min
              </strong>

            </div>

            <div className="time-total">

              <span>
                TOTAL
              </span>

              <strong>
                {formatSeconds(
                  totalSeconds
                )}
              </strong>

            </div>

          </div>

          <div
            className={
              isOverLimit
                ? "time-status over"
                : "time-status good"
            }
          >

            {isOverLimit ? (
              <>

                <strong>
                  Limite ultrapassado
                </strong>

                <span>
                  +
                  {formatSeconds(
                    Math.abs(
                      difference
                    )
                  )}
                </span>

              </>
            ) : (
              <>

                <strong>
                  Dentro do limite
                </strong>

                <span>
                  {formatSeconds(
                    difference
                  )}{" "}
                  disponíveis
                </span>

              </>
            )}

          </div>

        </aside>

      </section>

    </div>
  );
}

export default Setlists;