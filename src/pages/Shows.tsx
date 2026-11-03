import { useEffect, useState } from "react";

import type {
  FormEvent,
} from "react";

import {
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Edit3,
  ListMusic,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type ShowStatus =
  | "Confirmado"
  | "Pendente"
  | "Realizado"
  | "Cancelado";

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
  status: ShowStatus;
  notes: string;
};

const emptyForm = {
  name: "",
  venue: "",
  city: "",
  date: "",
  showTime: "",
  loadIn: "",
  soundcheck: "",
  duration: "60",
  status: "Confirmado" as ShowStatus,
  notes: "",
};

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

type ShowsProps = {
  onOpenSetlist: (showId: number) => void;
  onOpenChecklist: (showId: number) => void;
};

function Shows({
  onOpenSetlist,
  onOpenChecklist,
}: ShowsProps) {
  
  const [shows, setShows] = useState<Show[]>([]);
  const [showsLoading, setShowsLoading] = useState(true);
  const [showsError, setShowsError] = useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const controller = new AbortController();
  
    async function loadShowsFromApi() {
      try {
        setShowsLoading(true);
        setShowsError("");
  
        const response = await fetch(
          "http://localhost:3333/api/shows?bandId=1",
          { signal: controller.signal }
        );
  
        if (!response.ok) {
          throw new Error(
            `Erro ao carregar shows. HTTP ${response.status}`
          );
        }
  
        const data = await response.json();
  
        if (!Array.isArray(data)) {
          throw new Error("Resposta inválida da API.");
        }
  
        const convertedShows: Show[] = data.map((show) => ({
          id: show.id,
          name: show.name,
          venue: show.venue,
          city: show.city ?? "",
          date: show.date.slice(0, 10),
          showTime: show.showTime ?? "",
          loadIn: "",
          soundcheck: "",
          duration: show.duration ?? 60,
          status: show.status,
          notes: show.notes ?? "",
        }));
  
        setShows(convertedShows);
      } catch (error) {
        if (controller.signal.aborted) return;
  
        console.error("Erro ao carregar shows:", error);
  
        setShowsError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os shows."
        );
      } finally {
        if (!controller.signal.aborted) {
          setShowsLoading(false);
        }
      }
    }
  
    loadShowsFromApi();
  
    return () => controller.abort();
  }, []);
  function openNewShow() {
    setEditingId(null);

    setForm(emptyForm);

    setModalOpen(true);
  }

  function openEditShow(
    show: Show
  ) {
    setEditingId(show.id);

    setForm({
      name: show.name,
      venue: show.venue,
      city: show.city,
      date: show.date,
      showTime: show.showTime,
      loadIn: show.loadIn,
      soundcheck: show.soundcheck,
      duration:
        String(show.duration),
      status: show.status,
      notes: show.notes,
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
  
    if (
      !form.name.trim() ||
      !form.venue.trim() ||
      !form.city.trim() ||
      !form.date ||
      !form.showTime
    ) {
      alert("Preencha os campos obrigatórios.");
      return;
    }
  
    const duration = Number(form.duration);
  
    if (!Number.isFinite(duration) || duration <= 0) {
      alert("Informe uma duração válida.");
      return;
    }
  
    if (editingId !== null) {
      try {
        const response = await fetch(
          `http://localhost:3333/api/shows/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: form.name.trim(),
              venue: form.venue.trim(),
              city: form.city.trim(),
              date: `${form.date}T12:00:00.000Z`,
              showTime: form.showTime,
              duration,
              status: form.status,
              notes: form.notes.trim(),
            }),
          }
        );
    
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
    
          throw new Error(
            errorData?.error ??
              `Erro ao editar show. HTTP ${response.status}`
          );
        }
    
        const savedShow = await response.json();
    
        setShows((currentShows) =>
          currentShows.map((show) =>
            show.id === editingId
              ? {
                  ...show,
                  name: savedShow.name,
                  venue: savedShow.venue,
                  city: savedShow.city ?? "",
                  date: savedShow.date.slice(0, 10),
                  showTime: savedShow.showTime ?? "",
                  duration: savedShow.duration ?? 60,
                  status: savedShow.status as ShowStatus,
                  notes: savedShow.notes ?? "",
                }
              : show
          )
        );
    
        closeModal();
    
        console.log("Show atualizado no PostgreSQL:", savedShow);
      } catch (error) {
        console.error("Erro ao editar show:", error);
    
        alert(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o show."
        );
      }
    
      return;
    }
  
    try {
      const response = await fetch(
        "http://localhost:3333/api/shows",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            venue: form.venue.trim(),
            city: form.city.trim(),
            date: `${form.date}T12:00:00.000Z`,
            showTime: form.showTime,
            duration,
            status: form.status,
            notes: form.notes.trim(),
            bandId: 1,
          }),
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
  
        throw new Error(
          errorData?.error ??
            `Erro ao criar show. HTTP ${response.status}`
        );
      }
  
      const savedShow = await response.json();
  
      const newShow: Show = {
        id: savedShow.id,
        name: savedShow.name,
        venue: savedShow.venue,
        city: savedShow.city ?? "",
        date: savedShow.date.slice(0, 10),
        showTime: savedShow.showTime ?? "",
        loadIn: "",
        soundcheck: "",
        duration: savedShow.duration ?? 60,
        status: savedShow.status as ShowStatus,
        notes: savedShow.notes ?? "",
      };
  
      setShows((currentShows) => [
        ...currentShows,
        newShow,
      ]);
  
      closeModal();
  
      console.log("Show salvo no PostgreSQL:", savedShow);
    } catch (error) {
      console.error("Erro ao criar show:", error);
  
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o show."
      );
    }
  }

  function confirmDelete() {
    if (deleteId === null) {
      return;
    }

    setShows(
      (currentShows) =>
        currentShows.filter(
          (show) =>
            show.id !==
            deleteId
        )
    );

    setDeleteId(null);
  }

  const sortedShows = [
    ...shows,
  ].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );

  return (
    <div>

      {/* HEADER */}

      <header className="page-header">

        <div>

          <span className="eyebrow">
            AGENDA
          </span>

          <h1>
            Shows
          </h1>

          <p>
            Organize apresentações,
            horários e informações
            de produção.
          </p>

        </div>

        <button
          className="primary-button"
          onClick={
            openNewShow
          }
        >
          <Plus size={16} />

          Novo Show
        </button>

      </header>

      {/* RESUMO */}

      <section className="shows-summary">

        <div>

          <span>
            TOTAL
          </span>

          <strong>
            {shows.length}
          </strong>

        </div>

        <div>

          <span>
            CONFIRMADOS
          </span>

          <strong>
            {
              shows.filter(
                (show) =>
                  show.status ===
                  "Confirmado"
              ).length
            }
          </strong>

        </div>

        <div>

          <span>
            PENDENTES
          </span>

          <strong>
            {
              shows.filter(
                (show) =>
                  show.status ===
                  "Pendente"
              ).length
            }
          </strong>

        </div>

        <div>

          <span>
            REALIZADOS
          </span>

          <strong>
            {
              shows.filter(
                (show) =>
                  show.status ===
                  "Realizado"
              ).length
            }
          </strong>

        </div>

      </section>

      {/* LISTA */}

      {showsLoading && (
  <p role="status">Carregando shows...</p>
)}

{showsError && (
  <p role="alert" style={{ color: "#ef4444" }}>
    {showsError}
  </p>
)}

      <section className="shows-list">

        {sortedShows.map(
          (show) => (

            <article
              className="show-item"
              key={show.id}
            >

              <div className="show-main">

                <div className="show-title-row">

                  <div>

                    <span
                      className={`show-badge ${show.status.toLowerCase()}`}
                    >
                      {show.status}
                    </span>

                    <h2>
                      {show.name}
                    </h2>

                    <div className="show-place">

                      <MapPin
                        size={13}
                      />

                      {show.venue}

                      <span>•</span>

                      {show.city}

                    </div>

                  </div>

                  <div className="show-card-actions">

<button
  className="setlist-link-button"
  title="Abrir setlist"
  onClick={() => onOpenSetlist(show.id)}
>
  <ListMusic size={15} />
  <span>Setlist</span>
</button>

<button
  className="checklist-link-button"
  title="Checklist técnico"
  onClick={() => onOpenChecklist(show.id)}
>
  <ClipboardCheck size={15} />
  <span>Checklist</span>
</button>

<button
  title="Editar show"
  onClick={() => openEditShow(show)}
>
  <Edit3 size={15} />
</button>

<button
  className="danger"
  title="Excluir show"
  onClick={() => setDeleteId(show.id)}
>
  <Trash2 size={15} />
</button>

</div>

                </div>

                <div className="show-schedule">

                  <div>

                    <CalendarDays
                      size={15}
                    />

                    <span>
                      DATA
                    </span>

                    <strong>
                      {formatDate(
                        show.date
                      )}
                    </strong>

                  </div>

                  <div>

                    <Clock3
                      size={15}
                    />

                    <span>
                      LOAD-IN
                    </span>

                    <strong>
                      {show.loadIn ||
                        "--:--"}
                    </strong>

                  </div>

                  <div>

                    <Clock3
                      size={15}
                    />

                    <span>
                      PASSAGEM
                    </span>

                    <strong>
                      {show.soundcheck ||
                        "--:--"}
                    </strong>

                  </div>

                  <div>

                    <Clock3
                      size={15}
                    />

                    <span>
                      SHOW
                    </span>

                    <strong>
                      {show.showTime}
                    </strong>

                  </div>

                  <div>

                    <Clock3
                      size={15}
                    />

                    <span>
                      LIMITE
                    </span>

                    <strong>
                      {show.duration} min
                    </strong>

                  </div>

                </div>

                {show.notes && (
                  <div className="show-notes">

                    <span>
                      OBSERVAÇÕES
                    </span>

                    <p>
                      {show.notes}
                    </p>

                  </div>
                )}

              </div>

            </article>

          )
        )}

{!showsLoading && !showsError && shows.length === 0 && (

          <div className="shows-empty">

            <CalendarDays
              size={34}
            />

            <strong>
              Nenhum show cadastrado
            </strong>

            <span>
              Cadastre a próxima
              apresentação da banda.
            </span>

            <button
              className="primary-button"
              onClick={
                openNewShow
              }
            >
              <Plus size={15} />

              Criar primeiro show
            </button>

          </div>

        )}

      </section>

      {/* MODAL */}

      {modalOpen && (

        <div
          className="modal-overlay"
          onMouseDown={
            closeModal
          }
        >

          <div
            className="modal show-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <span className="eyebrow">
                  AGENDA
                </span>

                <h2>
                  {editingId !== null
                    ? "Editar Show"
                    : "Novo Show"}
                </h2>

                <p>
                  Informações da
                  apresentação.
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

              <div className="form-group">

                <label>
                  Nome / Evento
                </label>

                <input
                  type="text"
                  placeholder="Ex: Rock Festival"
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      name:
                        event.target
                          .value,
                    })
                  }
                  required
                />

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Casa / Local
                  </label>

                  <input
                    type="text"
                    placeholder="Ex: Rock'n Beer"
                    value={
                      form.venue
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        venue:
                          event.target
                            .value,
                      })
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Cidade
                  </label>

                  <input
                    type="text"
                    placeholder="Ex: Rio de Janeiro"
                    value={
                      form.city
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        city:
                          event.target
                            .value,
                      })
                    }
                    required
                  />

                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Data
                  </label>

                  <input
                    type="date"
                    value={
                      form.date
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        date:
                          event.target
                            .value,
                      })
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Horário do show
                  </label>

                  <input
                    type="time"
                    value={
                      form.showTime
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        showTime:
                          event.target
                            .value,
                      })
                    }
                    required
                  />

                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Load-in
                  </label>

                  <input
                    type="time"
                    value={
                      form.loadIn
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        loadIn:
                          event.target
                            .value,
                      })
                    }
                  />

                </div>

                <div className="form-group">

                  <label>
                    Passagem de som
                  </label>

                  <input
                    type="time"
                    value={
                      form.soundcheck
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        soundcheck:
                          event.target
                            .value,
                      })
                    }
                  />

                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Duração máxima
                  </label>

                  <input
                    type="number"
                    min="1"
                    placeholder="60"
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

                <div className="form-group">

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
                            .value as ShowStatus,
                      })
                    }
                  >

                    <option value="Confirmado">
                      Confirmado
                    </option>

                    <option value="Pendente">
                      Pendente
                    </option>

                    <option value="Realizado">
                      Realizado
                    </option>

                    <option value="Cancelado">
                      Cancelado
                    </option>

                  </select>

                </div>

              </div>

              <div className="form-group">

                <label>
                  Observações
                </label>

                <textarea
                  className="form-textarea"
                  placeholder="Informações de produção, contato, estacionamento..."
                  value={
                    form.notes
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      notes:
                        event.target
                          .value,
                    })
                  }
                />

              </div>

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
                    : "Criar Show"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* EXCLUSÃO */}

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
              Excluir show?
            </h2>

            <p>
              As informações desta
              apresentação serão
              removidas.
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
                Excluir Show
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Shows;