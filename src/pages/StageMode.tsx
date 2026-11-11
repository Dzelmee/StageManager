import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Expand,
  MapPin,
  Music2,
  RotateCcw,
} from "lucide-react";

import {
  getShowSetlist,
  getStagePosition,
  saveStagePosition,
} from "../services/storage";

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

function loadShowSetlist(
  showId: number
): Song[] {
  return getShowSetlist<Song[]>(
    showId
  );
}

function durationToSeconds(
  duration: string
) {
  const [minutes, seconds] =
    duration
      .split(":")
      .map(Number);

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
  const safe =
    Math.max(
      0,
      Math.floor(totalSeconds)
    );

  const hours =
    Math.floor(
      safe / 3600
    );

  const minutes =
    Math.floor(
      (safe % 3600) / 60
    );

  const seconds =
    safe % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      seconds
    ).padStart(
      2,
      "0"
    )}`;
  }

  return `${minutes}:${String(
    seconds
  ).padStart(
    2,
    "0"
  )}`;
}

function formatDate(
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

function StageMode() {
  const [shows] =
    useState<Show[]>(
      loadShows
    );

  const [
    selectedShowId,
    setSelectedShowId,
  ] = useState<number | null>(
    null
  );

  const [songs, setSongs] =
    useState<Song[]>([]);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const selectedShow =
    shows.find(
      (show) =>
        show.id ===
        selectedShowId
    ) ?? null;

  function selectShow(showId: number) {
    const loadedSongs = loadShowSetlist(showId);
    const savedPosition = getStagePosition(showId);
    const parsedPosition = savedPosition ? Number(savedPosition) : 0;
    const validPosition = Number.isInteger(parsedPosition) &&
      parsedPosition >= 0 && parsedPosition < loadedSongs.length;

    setSongs(loadedSongs);
    setCurrentIndex(validPosition ? parsedPosition : 0);
    setSelectedShowId(showId);
  }

  function backToShows() {
    setSelectedShowId(null);
    setSongs([]);
    setCurrentIndex(0);
  }

  /*
    Salva a posição atual.
  */

  useEffect(() => {
    if (
      selectedShowId === null ||
      songs.length === 0
    ) {
      return;
    }

    saveStagePosition(
      selectedShowId,
      currentIndex
    );
  }, [
    currentIndex,
    selectedShowId,
    songs.length,
  ]);

  const currentSong =
    songs[currentIndex] ??
    null;

  const nextSong =
    songs[currentIndex + 1] ??
    null;

  const previousSong =
    songs[currentIndex - 1] ??
    null;

  const remainingSeconds =
    useMemo(() => {
      if (
        songs.length === 0
      ) {
        return 0;
      }

      return songs
        .slice(currentIndex)
        .reduce(
          (total, song) =>
            total +
            durationToSeconds(
              song.duration
            ),
          0
        );
    }, [
      songs,
      currentIndex,
    ]);

  const completedPercent =
    songs.length > 0
      ? ((currentIndex + 1) /
          songs.length) *
        100
      : 0;

  function next() {
    setCurrentIndex((current) => Math.min(current + 1, songs.length - 1));
  }

  function previous() {
    setCurrentIndex(
      (current) =>
        Math.max(
          current - 1,
          0
        )
    );
  }

  function restart() {
    setCurrentIndex(0);
  }

  async function enterFullscreen() {
    try {
      if (
        !document.fullscreenElement
      ) {
        await document.documentElement
          .requestFullscreen();
      } else {
        await document
          .exitFullscreen();
      }
    } catch {
      // Alguns navegadores podem
      // bloquear tela cheia.
    }
  }

  /*
    Atalhos de teclado.
  */

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        selectedShowId === null ||
        songs.length === 0
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        setCurrentIndex((current) => Math.min(current + 1, songs.length - 1));
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        previous();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    selectedShowId,
    songs.length,
  ]);

  /*
    Tela inicial:
    escolha do show.
  */

  if (
    selectedShowId === null
  ) {
    return (
      <div>

        <header className="page-header">

          <div>

            <span className="eyebrow">
              LIVE PERFORMANCE
            </span>

            <h1>
              Modo Palco
            </h1>

            <p>
              Escolha um show para
              abrir o setlist em modo
              de apresentação.
            </p>

          </div>

        </header>

        <section className="stage-show-selector">

          {shows.map(
            (show) => {

              const showSongs =
                loadShowSetlist(
                  show.id
                );

              return (
                <button
                  key={show.id}
                  className="stage-show-card"
                  onClick={() => selectShow(show.id)}
                >

                  <div className="stage-show-card-top">

                    <span>
                      {show.status}
                    </span>

                    <strong>
                      {
                        showSongs.length
                      }{" "}
                      músicas
                    </strong>

                  </div>

                  <h2>
                    {show.name}
                  </h2>

                  <div className="stage-show-location">

                    <MapPin
                      size={14}
                    />

                    {show.venue}

                    <span>•</span>

                    {show.city}

                  </div>

                  <div className="stage-show-details">

                    <div>

                      <CalendarDays
                        size={14}
                      />

                      <span>
                        {formatDate(
                          show.date
                        )}
                      </span>

                    </div>

                    <div>

                      <Clock3
                        size={14}
                      />

                      <span>
                        {
                          show.showTime
                        }
                      </span>

                    </div>

                  </div>

                  <div className="stage-open">

                    Abrir Modo Palco

                    <ArrowRight
                      size={15}
                    />

                  </div>

                </button>
              );
            }
          )}

          {shows.length === 0 && (

            <div className="stage-no-shows">

              <Music2
                size={35}
              />

              <strong>
                Nenhum show
                cadastrado
              </strong>

              <span>
                Cadastre um show e
                monte seu setlist
                primeiro.
              </span>

            </div>

          )}

        </section>

      </div>
    );
  }

  /*
    Existe show, mas ele ainda
    não possui setlist.
  */

  if (
    selectedShow &&
    songs.length === 0
  ) {
    return (
      <div className="stage-empty-screen">

        <button
          className="stage-back-button"
          onClick={backToShows}
        >
          <ArrowLeft
            size={16}
          />

          Shows
        </button>

        <Music2
          size={42}
        />

        <span className="eyebrow">
          MODO PALCO
        </span>

        <h1>
          {selectedShow.name}
        </h1>

        <p>
          Este show ainda não
          possui músicas no
          setlist.
        </p>

      </div>
    );
  }

  if (
    !selectedShow ||
    !currentSong
  ) {
    return null;
  }

  return (
    <div className="stage-mode">

      {/* TOPO */}

      <header className="stage-topbar">

        <button
          className="stage-back-button"
          onClick={backToShows}
        >
          <ArrowLeft
            size={16}
          />

          Shows
        </button>

        <div className="stage-show-title">

          <span>
            MODO PALCO
          </span>

          <strong>
            {selectedShow.name}
          </strong>

        </div>

        <div className="stage-top-actions">

          <button
            title="Reiniciar setlist"
            onClick={
              restart
            }
          >
            <RotateCcw
              size={17}
            />
          </button>

          <button
            title="Tela cheia"
            onClick={
              enterFullscreen
            }
          >
            <Expand
              size={17}
            />
          </button>

        </div>

      </header>

      {/* PROGRESSO */}

      <div className="stage-progress">

        <div
          className="stage-progress-bar"
          style={{
            width:
              `${completedPercent}%`,
          }}
        />

      </div>

      {/* CONTEÚDO */}

      <main className="stage-current">

        <div className="stage-position">

          <span>
            MÚSICA
          </span>

          <strong>
            {String(
              currentIndex + 1
            ).padStart(
              2,
              "0"
            )}

            <small>
              /
              {String(
                songs.length
              ).padStart(
                2,
                "0"
              )}
            </small>

          </strong>

        </div>

        <div className="stage-song-main">

          <span className="stage-artist">
            {currentSong.artist}
          </span>

          <h1>
            {currentSong.title}
          </h1>

          <div className="stage-song-data">

            <div>

              <span>
                TOM
              </span>

              <strong>
                {currentSong.key ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                BPM
              </span>

              <strong>
                {currentSong.bpm ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                AFINAÇÃO
              </span>

              <strong>
                {currentSong.tuning ||
                  "—"}
              </strong>

            </div>

            <div>

              <span>
                DURAÇÃO
              </span>

              <strong>
                {currentSong.duration}
              </strong>

            </div>

          </div>

        </div>

        {/* PRÓXIMA */}

        <div className="stage-next">

          <span>
            PRÓXIMA
          </span>

          {nextSong ? (
            <>

              <strong>
                {nextSong.title}
              </strong>

              <small>
                {nextSong.key}
                {" • "}
                {nextSong.bpm} BPM
                {" • "}
                {nextSong.tuning}
              </small>

            </>
          ) : (
            <strong>
              Fim do set
            </strong>
          )}

        </div>

      </main>

      {/* INFORMAÇÕES INFERIORES */}

      <section className="stage-footer-info">

        <div>

          <span>
            RESTANTE
          </span>

          <strong>
            {formatSeconds(
              remainingSeconds
            )}
          </strong>

        </div>

        <div>

          <span>
            LOCAL
          </span>

          <strong>
            {selectedShow.venue}
          </strong>

        </div>

        <div>

          <span>
            HORÁRIO
          </span>

          <strong>
            {
              selectedShow.showTime
            }
          </strong>

        </div>

      </section>

      {/* CONTROLES */}

      <footer className="stage-controls">

        <button
          onClick={
            previous
          }
          disabled={
            !previousSong
          }
        >

          <ChevronLeft
            size={22}
          />

          <span>
            ANTERIOR
          </span>

        </button>

        <div className="stage-keyboard-hint">
          ← / → teclado
        </div>

        <button
          className="stage-next-button"
          onClick={
            next
          }
          disabled={
            !nextSong
          }
        >

          <span>
            PRÓXIMA
          </span>

          <ChevronRight
            size={22}
          />

        </button>

      </footer>

    </div>
  );
}

export default StageMode;