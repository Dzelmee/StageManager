import {
  useEffect,
  useState,
} from "react";

import {
  saveShowSetlist,
} from "../services/storage";

import {
  setlistsApi,
  showsApi,
  songsApi,
} from "../services/api";

import type {
  ApiSetlist,
  ApiSetlistItem,
  ApiShow,
  ApiSong,
} from "../services/api";

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

type SetlistEntry = Song & {
  itemId: number;
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

function convertSong(song: ApiSong): Song {
  return {
    id: song.id,
    title: song.title,
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
    status: song.status,
  };
}

function convertSetlistEntry(
  item: ApiSetlistItem
): SetlistEntry {
  return {
    ...convertSong(item.song),
    itemId: item.id,
  };
}

function convertShow(show: ApiShow): Show {
  return {
    id: show.id,
    name: show.name,
    venue: show.venue,
    city: show.city ?? "",
    date: show.date.slice(0, 10),
    showTime: show.showTime ?? "",
    loadIn: show.loadIn ?? "",
    soundcheck: show.soundcheck ?? "",
    duration: show.duration ?? 60,
    status: show.status,
    notes: show.notes ?? "",
  };
}

/**
 * Regra única para localizar a setlist de um show.
 * `showId === null` significa a setlist geral da banda.
 * Havendo mais de uma, escolhe a de menor ID (a mais antiga).
 */
function findSetlistForShow(
  setlists: ApiSetlist[],
  showId: number | null
): ApiSetlist | null {
  const candidates = setlists.filter((item) =>
    showId === null
      ? item.showId === null
      : item.showId === showId
  );

  return (
    candidates.sort((a, b) => a.id - b.id)[0] ??
    null
  );
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
        const data = await songsApi.list();

        if (active) {
          setRepertoire(data.map(convertSong));
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

  const [shows, setShows] = useState<Show[]>([]);

  const [setlist, setSetlist] = useState<SetlistEntry[]>([]);
  const [setlistId, setSetlistId] = useState<number | null>(null);
  const [setlistLoading, setSetlistLoading] = useState(true);
  const [setlistError, setSetlistError] = useState("");
    
    useEffect(() => {
      let active = true;

      async function loadSetlistFromApi() {
        setSetlistLoading(true);
        setSetlistError("");

        try {
          const [lists, showsData] = await Promise.all([
            setlistsApi.list(),
            showsApi.list(),
          ]);

          const selectedSetlist = findSetlistForShow(
            lists,
            showId
          );

          if (active) {
            setShows(showsData.map(convertShow));
            setShowLimit(showsData.find((show) => show.id === showId)?.duration ?? 60);
            setSetlistId(selectedSetlist?.id ?? null);
            setSetlist(
              selectedSetlist
                ? selectedSetlist.songs.map(
                    convertSetlistEntry
                  )
                : []
            );
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
    // O backend também recusa duplicata (409), mas evitamos a viagem.
    if (setlist.some((item) => item.id === song.id)) {
      alert("Esta música já está na setlist.");
      return;
    }

    try {
      let targetSetlistId = setlistId;

      // Cria a setlist do show (ou a geral) na primeira música.
      if (targetSetlistId === null) {
        const created = await setlistsApi.create({
          name: selectedShow
            ? `Setlist — ${selectedShow.name}`
            : "Setlist geral",
          showId,
        });

        targetSetlistId = created.id;
        setSetlistId(created.id);
      }

      const savedItem = await setlistsApi.addSong(
        targetSetlistId,
        song.id
      );

      setSetlist((current) => [
        ...current,
        {
          ...song,
          itemId: savedItem.id,
        },
      ]);
    } catch (error) {
      console.error("Erro ao adicionar música:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível adicionar a música."
      );
    }
  }


  async function removeSong(entry: SetlistEntry) {
    if (setlistId === null) {
      return;
    }

    const confirmed = window.confirm(
      "Deseja remover esta música da setlist? Ela continuará no Repertório."
    );

    if (!confirmed) return;

    try {
      await setlistsApi.removeSong(
        setlistId,
        entry.itemId
      );

      setSetlist((current) =>
        current.filter(
          (song) => song.itemId !== entry.itemId
        )
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
      if (setlistId !== null) {
        await setlistsApi.reorder(
          setlistId,
          updated.map((entry) => entry.itemId)
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
      if (setlistId !== null) {
        // Sequencial de propósito: o backend reorganiza as posições
        // restantes a cada remoção.
        for (const entry of setlist) {
          await setlistsApi.removeSong(
            setlistId,
            entry.itemId
          );
        }
      }

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
                  key={song.itemId}
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
                          song
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