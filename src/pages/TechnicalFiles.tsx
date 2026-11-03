import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  getTechnicalFiles,
  saveTechnicalFiles,
} from "../services/storage";

import "./TechnicalFiles.css";

import {
  Edit3,
  File,
  FileText,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type FileCategory =
  | "Rider Técnico"
  | "Stage Plot"
  | "Input List"
  | "Patch List"
  | "Playback"
  | "Iluminação"
  | "Outro";

type TechnicalFile = {
  id: number;
  name: string;
  category: FileCategory;
  fileName: string;
  showId: number | null;
  notes: string;
  updatedAt: string;
};

type Show = {
  id: number;
  name: string;
  venue: string;
  date: string;
};

const emptyForm = {
  name: "",
  category: "Rider Técnico" as FileCategory,
  fileName: "",
  showId: "",
  notes: "",
};

function loadShows(): Show[] {
  try {
    const saved = localStorage.getItem(
      "stagemanager-shows"
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function TechnicalFiles() {
  const [files, setFiles] =
  useState<TechnicalFile[]>(() =>
    getTechnicalFiles<TechnicalFile[]>()
  );

  const [shows] =
    useState<Show[]>(loadShows);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [deleteId, setDeleteId] =
    useState<number | null>(null);

  const [filter, setFilter] =
    useState("Todos");

  const [form, setForm] =
    useState(emptyForm);

    useEffect(() => {
      saveTechnicalFiles(files);
    }, [files]);

  const categories: FileCategory[] = [
    "Rider Técnico",
    "Stage Plot",
    "Input List",
    "Patch List",
    "Playback",
    "Iluminação",
    "Outro",
  ];

  const filteredFiles =
    useMemo(() => {
      if (filter === "Todos") {
        return files;
      }

      return files.filter(
        (file) =>
          file.category === filter
      );
    }, [files, filter]);

  function openNewFile() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditFile(
    file: TechnicalFile
  ) {
    setEditingId(file.id);

    setForm({
      name: file.name,
      category: file.category,
      fileName: file.fileName,
      showId:
        file.showId === null
          ? ""
          : String(file.showId),
      notes: file.notes,
    });

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    const showId =
      form.showId === ""
        ? null
        : Number(form.showId);

    if (editingId !== null) {
      setFiles((current) =>
        current.map((file) =>
          file.id === editingId
            ? {
                ...file,
                name: form.name.trim(),
                category: form.category,
                fileName:
                  form.fileName.trim(),
                showId,
                notes:
                  form.notes.trim(),
                updatedAt:
                  new Date()
                    .toISOString(),
              }
            : file
        )
      );

      closeModal();
      return;
    }

    const newFile: TechnicalFile = {
      id: Date.now(),
      name: form.name.trim(),
      category: form.category,
      fileName:
        form.fileName.trim(),
      showId,
      notes: form.notes.trim(),
      updatedAt:
        new Date().toISOString(),
    };

    setFiles((current) => [
      ...current,
      newFile,
    ]);

    closeModal();
  }

  function confirmDelete() {
    if (deleteId === null) {
      return;
    }

    setFiles((current) =>
      current.filter(
        (file) =>
          file.id !== deleteId
      )
    );

    setDeleteId(null);
  }

  function getShowName(
    showId: number | null
  ) {
    if (showId === null) {
      return "Arquivo geral";
    }

    const show = shows.find(
      (item) =>
        item.id === showId
    );

    return (
      show?.name ??
      "Show removido"
    );
  }

  function formatUpdatedAt(
    value: string
  ) {
    try {
      return new Intl.DateTimeFormat(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      ).format(new Date(value));
    } catch {
      return "—";
    }
  }

  return (
<div className="technical-files-page">

<header className="technical-files-header">

        <div>
        <span className="technical-files-eyebrow">
            PRODUÇÃO
          </span>

          <h1>
            Arquivos Técnicos
          </h1>

          <p className="technical-files-subtitle">
  Organize riders, stage plots, input lists e documentos da banda.
</p>
        </div>

        <button
          className="technical-primary-button"
          onClick={openNewFile}
        >
          <Plus size={16} />

          Novo Arquivo
        </button>

      </header>

      {/* RESUMO */}

      <section className="technical-summary">

      <div className="technical-stat-card">
  <span className="technical-stat-label">
    ARQUIVOS
  </span>

  <strong className="technical-stat-value">
    {files.length}
  </strong>
</div>

<div className="technical-stat-card">
  <span className="technical-stat-label">
    RIDERS
  </span>

  <strong className="technical-stat-value">
    {
      files.filter(
        (file) =>
          file.category ===
          "Rider Técnico"
      ).length
    }
  </strong>
</div>

<div className="technical-stat-card">
  <span className="technical-stat-label">
    STAGE PLOTS
  </span>

  <strong className="technical-stat-value">
    {
      files.filter(
        (file) =>
          file.category ===
          "Stage Plot"
      ).length
    }
  </strong>
</div>

<div className="technical-stat-card">
  <span className="technical-stat-label">
    SHOWS VINCULADOS
  </span>

  <strong className="technical-stat-value">
    {
      new Set(
        files
          .filter(
            (file) =>
              file.showId !== null
          )
          .map(
            (file) =>
              file.showId
          )
      ).size
    }
  </strong>
</div>

      </section>

      {/* FILTROS */}

      <section className="technical-filters">

        {[
          "Todos",
          ...categories,
        ].map((category) => (

<button
  key={category}
  className={`technical-filter-button ${
    filter === category
      ? "active"
      : ""
  }`}
  onClick={() =>
    setFilter(category)
  }
>
  {category}
</button>

        ))}

      </section>

      {/* ARQUIVOS */}

      <section className="technical-files-grid">

        {filteredFiles.map(
          (file) => (

            <article
              className="technical-file-card"
              key={file.id}
            >

              <div className="technical-file-top">

                <div className="technical-file-icon">
                  <FileText
                    size={20}
                  />
                </div>

                <div className="technical-file-actions">

                  <button
                    title="Editar"
                    onClick={() =>
                      openEditFile(
                        file
                      )
                    }
                  >
                    <Edit3
                      size={14}
                    />
                  </button>

                  <button
                    className="danger"
                    title="Excluir"
                    onClick={() =>
                      setDeleteId(
                        file.id
                      )
                    }
                  >
                    <Trash2
                      size={14}
                    />
                  </button>

                </div>

              </div>

              <span className="technical-file-category">
                {file.category}
              </span>

              <h2>
                {file.name}
              </h2>

              <div className="technical-file-name">

                <File size={12} />

                {file.fileName ||
                  "Nenhum arquivo selecionado"}

              </div>

              <div className="technical-file-info">

                <div>
                  <span>
                    VINCULADO A
                  </span>

                  <strong>
                    {getShowName(
                      file.showId
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    ATUALIZADO
                  </span>

                  <strong>
                    {formatUpdatedAt(
                      file.updatedAt
                    )}
                  </strong>
                </div>

              </div>

              {file.notes && (

                <p className="technical-file-notes">
                  {file.notes}
                </p>

              )}

            </article>

          )
        )}

{filteredFiles.length === 0 && (
  <div className="technical-empty">
    <div className="technical-empty-content">
      <FolderOpen
        className="technical-empty-icon"
        size={38}
      />

      <h3>
        Nenhum arquivo encontrado
      </h3>

      <p>
        Adicione documentos técnicos da banda.
      </p>

      <button
        className="technical-primary-button"
        onClick={openNewFile}
      >
        <Plus size={15} />
        Novo arquivo
      </button>
    </div>
  </div>
)}

      </section>

      {/* MODAL */}

      {modalOpen && (

        <div
          className="modal-overlay"
          onMouseDown={closeModal}
        >

          <div
            className="modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>

                <span className="eyebrow">
                  PRODUÇÃO
                </span>

                <h2>
                  {editingId !== null
                    ? "Editar Arquivo"
                    : "Novo Arquivo"}
                </h2>

                <p>
                  Cadastre um documento
                  técnico.
                </p>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={closeModal}
              >
                <X size={20} />
              </button>

            </div>

            <form
              className="song-form"
              onSubmit={handleSubmit}
            >

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Nome
                  </label>

                  <input
                    type="text"
                    placeholder="Ex: Rider Técnico 2026"
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name:
                          event.target.value,
                      })
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Categoria
                  </label>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category:
                          event.target
                            .value as FileCategory,
                      })
                    }
                  >

                    {categories.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

              <div className="form-group">

                <label>
                  Arquivo
                </label>

                <label className="technical-upload">

                  <Upload
                    size={18}
                  />

                  <div>

                    <strong>
                      {form.fileName ||
                        "Selecionar arquivo"}
                    </strong>

                    <span>
                      PDF, imagem,
                      planilha ou
                      documento
                    </span>

                  </div>

                  <input
                    type="file"
                    onChange={(event) => {

                      const selected =
                        event.target
                          .files?.[0];

                      if (!selected) {
                        return;
                      }

                      setForm({
                        ...form,
                        fileName:
                          selected.name,
                      });
                    }}
                  />

                </label>

              </div>

              <div className="form-group">

                <label>
                  Vincular ao show
                </label>

                <select
                  value={form.showId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      showId:
                        event.target.value,
                    })
                  }
                >

                  <option value="">
                    Arquivo geral
                  </option>

                  {shows.map(
                    (show) => (

                      <option
                        key={show.id}
                        value={show.id}
                      >
                        {show.name}
                      </option>

                    )
                  )}

                </select>

              </div>

              <div className="form-group">

                <label>
                  Observações
                </label>

                <textarea
                  className="form-textarea"
                  placeholder="Ex: versão atual enviada para produção..."
                  value={form.notes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      notes:
                        event.target.value,
                    })
                  }
                />

              </div>

              <div className="form-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingId !== null
                    ? "Salvar Alterações"
                    : "Adicionar Arquivo"}
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
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="delete-icon">
              <Trash2 size={22} />
            </div>

            <h2>
              Excluir arquivo?
            </h2>

            <p>
              O registro será removido
              dos arquivos técnicos.
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
                onClick={confirmDelete}
              >
                Excluir
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default TechnicalFiles;