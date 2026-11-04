import {

  getSongs,

  saveSongs,

} from "../services/storage";

import { songsApi } from "../services/api";

import type {

  ApiSong,

  SongStatus,

} from "../services/api";



import {

  useEffect,

  useState,

} from "react";



import type {

  FormEvent,

} from "react";



import {

  Edit3,

  Music2,

  Plus,

  Search,

  Trash2,

  X,

} from "lucide-react";



type Song = {

  id: number;

  title: string;

  artist: string;

  bpm: number;

  key: string;

  tuning: string;

  duration: string;

  status: SongStatus;

};



function convertApiSong(song: ApiSong): Song {

  const seconds = song.duration ?? 0;



  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = seconds % 60;



  return {

    id: song.id,

    title: song.title,

    artist: song.artist ?? "",

    bpm: song.bpm ?? 0,

    key: song.key ?? "",

    tuning: song.tuning ?? "Standard",

    duration: `${minutes}:${String(remainingSeconds).padStart(2, "0")}`,

    status: song.status,

  };

}



function durationToSeconds(duration: string): number {

  const parts = duration.trim().split(":").map(Number);



  if (

    parts.length !== 2 ||

    parts.some((part) => !Number.isInteger(part) || part < 0) ||

    parts[1] >= 60

  ) {

    throw new Error("Duração inválida. Use o formato minutos:segundos.");

  }



  return parts[0] * 60 + parts[1];

}



async function saveSongToApi(
  form: typeof emptyForm,
  editingId: number | null
): Promise<ApiSong> {
  const payload = {
    title: form.title.trim(),
    artist: form.artist.trim(),
    bpm: Number(form.bpm),
    key: form.key.trim(),
    tuning: form.tuning,
    duration: durationToSeconds(form.duration),
    status: form.status,
  };

  return editingId !== null
    ? songsApi.update(editingId, payload)
    : songsApi.create(payload);
}



async function deleteSongFromApi(id: number): Promise<void> {
  await songsApi.remove(id);
}



async function fetchSongsFromApi(): Promise<Song[]> {
  const data = await songsApi.list();

  return data.map(convertApiSong);
}



const emptyForm = {

  title: "",

  artist: "",

  bpm: "",

  key: "",

  tuning: "Standard",

  duration: "",

  status: "Nova" as SongStatus,

};



function Repertoire() {

  const [songs, setSongs] =

  useState<Song[]>(() =>

    getSongs<Song[]>()

  );

  const [search, setSearch] =

    useState("");



  const [modalOpen, setModalOpen] =

    useState(false);



  const [editingId, setEditingId] =

    useState<number | null>(null);



  const [deleteId, setDeleteId] =

    useState<number | null>(null);



  const [form, setForm] =

    useState(emptyForm);



    const [apiLoading, setApiLoading] = useState(true);

const [apiError, setApiError] = useState("");



useEffect(() => {

  let active = true;



  async function loadSongs() {

    try {

      const apiSongs = await fetchSongsFromApi();



      if (active) {

        setSongs(apiSongs);

        setApiError("");

      }

    } catch (error) {

      console.error("Erro ao carregar repertório:", error);



      if (active) {

        setApiError("Não foi possível carregar o repertório da API.");

      }

    } finally {

      if (active) {

        setApiLoading(false);

      }

    }

  }



  loadSongs();



  return () => {

    active = false;

  };

}, []);



  /*

    Toda vez que songs mudar,

    salvamos automaticamente

    no navegador.

  */



    useEffect(() => {

      saveSongs(songs);

    }, [songs]);



  const filteredSongs =

    songs.filter((song) => {

      const term =

        search.toLowerCase();



      return (

        song.title

          .toLowerCase()

          .includes(term) ||

        song.artist

          .toLowerCase()

          .includes(term) ||

        song.key

          .toLowerCase()

          .includes(term) ||

        song.tuning

          .toLowerCase()

          .includes(term)

      );

    });



  function openNewSong() {

    setEditingId(null);



    setForm(emptyForm);



    setModalOpen(true);

  }



  function openEditSong(

    song: Song

  ) {

    setEditingId(song.id);



    setForm({

      title: song.title,

      artist: song.artist,

      bpm: String(song.bpm),

      key: song.key,

      tuning: song.tuning,

      duration: song.duration,

      status: song.status,

    });



    setModalOpen(true);

  }



  function closeModal() {

    setModalOpen(false);



    setEditingId(null);



    setForm(emptyForm);

  }



  async function handleSubmit(

    event: FormEvent<HTMLFormElement>

  ) {

    event.preventDefault();



    console.log("SALVAR CLICADO", {

      editingId,

      status: form.status,

      title: form.title,

    });



    if (

      !form.title.trim() ||

      !form.artist.trim() ||

      !form.bpm ||

      !form.key.trim() ||

      !form.duration.trim()

    ) {

      return;

    }



    const bpm = Number(form.bpm);



    if (

      !Number.isFinite(bpm) ||

      bpm < 1 ||

      bpm > 400

    ) {

      return;

    }



    try {

      const savedSong = await saveSongToApi(form, editingId);

      const convertedSong = convertApiSong(savedSong);



      setSongs((currentSongs) => {

        if (editingId !== null) {

          return currentSongs.map((song) =>

            song.id === editingId ? convertedSong : song

          );

        }



        return [...currentSongs, convertedSong];

      });



      closeModal();

    } catch (error) {

      console.error("Erro ao salvar música:", error);



      alert(

        error instanceof Error

          ? error.message

          : "Não foi possível salvar a música."

      );

    }

  }



  async function confirmDelete() {

    if (deleteId === null) {

      return;

    }



    try {

      await deleteSongFromApi(deleteId);



      setSongs((currentSongs) =>

        currentSongs.filter((song) => song.id !== deleteId)

      );



      setDeleteId(null);

    } catch (error) {

      console.error("Erro ao excluir música:", error);



      alert(

        error instanceof Error

          ? error.message

          : "Não foi possível excluir a música."

      );

    }

  }



  return (

    <div>



{apiLoading && (

  <p role="status">

    Carregando repertório do servidor...

  </p>

)}



{apiError && (

  <p role="alert" style={{ color: "#ef4444" }}>

    {apiError}

  </p>

)}



      {/* HEADER */}



      <header className="page-header">



        <div>

          <span className="eyebrow">

            BIBLIOTECA

          </span>



          <h1>

            Repertório

          </h1>



          <p>

            Gerencie todas as músicas

            da banda.

          </p>

        </div>



        <button

          className="primary-button"

          onClick={openNewSong}

        >

          <Plus size={16} />



          Nova Música

        </button>



      </header>



      {/* BUSCA */}



      <div className="repertoire-toolbar">



        <div className="search-box">



          <Search size={17} />



          <input

            type="text"

            placeholder="Buscar música, artista, tom..."

            value={search}

            onChange={(event) =>

              setSearch(

                event.target.value

              )

            }

          />



        </div>



        <div className="song-counter">



          {filteredSongs.length}



          {filteredSongs.length === 1

            ? " música"

            : " músicas"}



        </div>



      </div>



      {/* TABELA */}



      <div className="songs-table-container">



        <table className="songs-table">



          <thead>



            <tr>

              <th>MÚSICA</th>

              <th>BPM</th>

              <th>TOM</th>

              <th>AFINAÇÃO</th>

              <th>DURAÇÃO</th>

              <th>STATUS</th>

              <th>AÇÕES</th>

            </tr>



          </thead>



          <tbody>



            {filteredSongs.map(

              (song) => (

                <tr key={song.id}>



                  <td>

                    <div className="song-name">



                      <strong>

                        {song.title}

                      </strong>



                      <span>

                        {song.artist}

                      </span>



                    </div>

                  </td>



                  <td>

                    <span className="bpm">

                      {song.bpm}

                    </span>

                  </td>



                  <td>

                    {song.key}

                  </td>



                  <td>

                    {song.tuning}

                  </td>



                  <td>

                    {song.duration}

                  </td>



                  <td>



                    <span

                      className={`song-status ${

                        song.status ===

                        "Pronta"

                          ? "ready"

                          : song.status ===

                            "Ensaiando"

                          ? "rehearsal"

                          : song.status ===

                            "Nova"

                          ? "new"

                          : "paused"

                      }`}

                    >

                      {song.status}

                    </span>



                  </td>



                  <td>



                    <div className="song-actions">



                      <button

                        className="icon-button"

                        title="Editar música"

                        onClick={() =>

                          openEditSong(

                            song

                          )

                        }

                      >

                        <Edit3

                          size={15}

                        />

                      </button>



                      <button

                        className="icon-button danger"

                        title="Excluir música"

                        onClick={() =>

                          setDeleteId(

                            song.id

                          )

                        }

                      >

                        <Trash2

                          size={15}

                        />

                      </button>



                    </div>



                  </td>



                </tr>

              )

            )}



          </tbody>



        </table>



        {filteredSongs.length ===

          0 && (

          <div className="no-results">



            <Music2 size={30} />



            <strong>

              Nenhuma música

              encontrada

            </strong>



            <span>

              Tente buscar outro nome,

              artista, tom ou afinação.

            </span>



          </div>

        )}



      </div>



      {/* MODAL CRIAR / EDITAR */}



      {modalOpen && (

        <div

          className="modal-overlay"

          onMouseDown={

            closeModal

          }

        >



          <div

            className="modal"

            onMouseDown={(

              event

            ) =>

              event.stopPropagation()

            }

          >



            <div className="modal-header">



              <div>



                <span className="eyebrow">

                  REPERTÓRIO

                </span>



                <h2>

                  {editingId !== null

                    ? "Editar Música"

                    : "Nova Música"}

                </h2>



                <p>

                  {editingId !== null

                    ? "Atualize as informações da música."

                    : "Adicione uma música ao repertório."}

                </p>



              </div>



              <button

                type="button"

                className="close-button"

                onClick={

                  closeModal

                }

              >

                <X size={20} />

              </button>



            </div>



            <form

              className="song-form"

              onSubmit={

                handleSubmit

              }

            >



              {/* NOME */}



              <div className="form-group full">



                <label>

                  Nome da música

                </label>



                <input

                  type="text"

                  placeholder="Ex: Faint"

                  value={

                    form.title

                  }

                  onChange={(

                    event

                  ) =>

                    setForm({

                      ...form,

                      title:

                        event.target

                          .value,

                    })

                  }

                  required

                />



              </div>



              {/* ARTISTA */}



              <div className="form-group full">



                <label>

                  Artista

                </label>



                <input

                  type="text"

                  placeholder="Ex: Linkin Park"

                  value={

                    form.artist

                  }

                  onChange={(

                    event

                  ) =>

                    setForm({

                      ...form,

                      artist:

                        event.target

                          .value,

                    })

                  }

                  required

                />



              </div>



              {/* BPM + TOM */}



              <div className="form-row">



                <div className="form-group">



                  <label>

                    BPM

                  </label>



                  <input

                    type="number"

                    min="1"

                    max="400"

                    placeholder="135"

                    value={

                      form.bpm

                    }

                    onChange={(

                      event

                    ) =>

                      setForm({

                        ...form,

                        bpm:

                          event.target

                            .value,

                      })

                    }

                    required

                  />



                </div>



                <div className="form-group">



                  <label>

                    Tom

                  </label>



                  <input

                    type="text"

                    placeholder="Ex: C#m"

                    value={

                      form.key

                    }

                    onChange={(

                      event

                    ) =>

                      setForm({

                        ...form,

                        key:

                          event.target

                            .value,

                      })

                    }

                    required

                  />



                </div>



              </div>



              {/* AFINAÇÃO + DURAÇÃO */}



              <div className="form-row">



                <div className="form-group">



                  <label>

                    Afinação

                  </label>



                  <select

                    value={

                      form.tuning

                    }

                    onChange={(

                      event

                    ) =>

                      setForm({

                        ...form,

                        tuning:

                          event.target

                            .value,

                      })

                    }

                  >



                    <option>

                      Standard

                    </option>



                    <option>

                      Drop D

                    </option>



                    <option>

                      Drop C#

                    </option>



                    <option>

                      Drop C

                    </option>



                    <option>

                      Drop B

                    </option>



                    <option>

                      Drop A

                    </option>



                    <option>

                      Outra

                    </option>



                  </select>



                </div>



                <div className="form-group">



                  <label>

                    Duração

                  </label>



                  <input

                    type="text"

                    placeholder="Ex: 3:45"

                    value={

                      form.duration

                    }

                    onChange={(

                      event

                    ) =>

                      setForm({

                        ...form,

                        duration:

                          event.target

                            .value,

                      })

                    }

                    required

                  />



                </div>



              </div>



              {/* STATUS */}



              <div className="form-group full">



                <label>

                  Status

                </label>



                <select

                  value={

                    form.status

                  }

                  onChange={(

                    event

                  ) =>

                    setForm({

                      ...form,



                      status:

                        event.target

                          .value as SongStatus,

                    })

                  }

                >



                  <option value="Pronta">

                    Pronta

                  </option>



                  <option value="Ensaiando">

                    Ensaiando

                  </option>



                  <option value="Nova">

                    Nova

                  </option>



                  <option value="Pausada">

                    Pausada

                  </option>



                </select>



              </div>



              {/* BOTÕES */}



              <div className="form-actions">



                <button

                  type="button"

                  className="secondary-button"

                  onClick={

                    closeModal

                  }

                >

                  Cancelar

                </button>



                <button

                  type="submit"

                  className="primary-button"

                >



                  {editingId !== null

                    ? "Salvar Alterações"

                    : "Adicionar Música"}



                </button>



              </div>



            </form>



          </div>



        </div>

      )}



      {/* CONFIRMAÇÃO EXCLUSÃO */}



      {deleteId !== null && (

        <div

          className="modal-overlay"

          onMouseDown={() =>

            setDeleteId(null)

          }

        >



          <div

            className="delete-modal"

            onMouseDown={(

              event

            ) =>

              event.stopPropagation()

            }

          >



            <div className="delete-icon">

              <Trash2 size={22} />

            </div>



            <h2>

              Excluir música?

            </h2>



            <p>

              Essa ação removerá a música

              do repertório.

            </p>



            <div className="delete-actions">



              <button

                className="secondary-button"

                onClick={() =>

                  setDeleteId(null)

                }

              >

                Cancelar

              </button>



              <button

                className="delete-button"

                onClick={

                  confirmDelete

                }

              >

                Excluir Música

              </button>



            </div>



          </div>



        </div>

      )}



    </div>

  );

}



export default Repertoire;