import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  Edit3,
  Mail,
  Mic2,
  Plus,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  getMembers,
  saveMembers,
} from "../services/storage";

type MemberStatus = "Ativo" | "Convidado" | "Inativo";

type Member = {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  equipment: string;
  status: MemberStatus;
  notes: string;
};

const emptyForm = {
  name: "",
  role: "",
  email: "",
  phone: "",
  equipment: "",
  status: "Ativo" as MemberStatus,
  notes: "",
};


function Members() {
  const [members, setMembers] =
  useState<Member[]>(() =>
    getMembers<Member[]>()
  );

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [deleteId, setDeleteId] =
    useState<number | null>(null);

  const [form, setForm] =
    useState(emptyForm);

    useEffect(() => {
      saveMembers(members);
    }, [members]);

  function openNewMember() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditMember(
    member: Member
  ) {
    setEditingId(member.id);

    setForm({
      name: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone,
      equipment: member.equipment,
      status: member.status,
      notes: member.notes,
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

    if (
      !form.name.trim() ||
      !form.role.trim()
    ) {
      return;
    }

    if (editingId !== null) {
      setMembers((current) =>
        current.map((member) =>
          member.id === editingId
            ? {
                ...member,
                name: form.name.trim(),
                role: form.role.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                equipment:
                  form.equipment.trim(),
                status: form.status,
                notes: form.notes.trim(),
              }
            : member
        )
      );

      closeModal();
      return;
    }

    const newMember: Member = {
      id: Date.now(),
      name: form.name.trim(),
      role: form.role.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      equipment:
        form.equipment.trim(),
      status: form.status,
      notes: form.notes.trim(),
    };

    setMembers((current) => [
      ...current,
      newMember,
    ]);

    closeModal();
  }

  function confirmDelete() {
    if (deleteId === null) {
      return;
    }

    setMembers((current) =>
      current.filter(
        (member) =>
          member.id !== deleteId
      )
    );

    setDeleteId(null);
  }

  return (
    <div>

      {/* HEADER */}

      <header className="page-header">

        <div>
          <span className="eyebrow">
            BANDA
          </span>

          <h1>Integrantes</h1>

          <p>
            Gerencie músicos, funções e
            informações da equipe.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openNewMember}
        >
          <Plus size={16} />
          Novo Integrante
        </button>

      </header>

      {/* RESUMO */}

      <section className="members-summary">

        <div>
          <span>INTEGRANTES</span>
          <strong>
            {members.length}
          </strong>
        </div>

        <div>
          <span>ATIVOS</span>
          <strong>
            {
              members.filter(
                (member) =>
                  member.status === "Ativo"
              ).length
            }
          </strong>
        </div>

        <div>
          <span>CONVIDADOS</span>
          <strong>
            {
              members.filter(
                (member) =>
                  member.status ===
                  "Convidado"
              ).length
            }
          </strong>
        </div>

      </section>

      {/* CARDS */}

      <section className="members-grid">

        {members.map((member) => (

          <article
            className="member-card"
            key={member.id}
          >

            <div className="member-card-top">

              <div className="member-avatar">
                {member.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="member-actions">

                <button
                  title="Editar integrante"
                  onClick={() =>
                    openEditMember(member)
                  }
                >
                  <Edit3 size={14} />
                </button>

                <button
                  className="danger"
                  title="Excluir integrante"
                  onClick={() =>
                    setDeleteId(member.id)
                  }
                >
                  <Trash2 size={14} />
                </button>

              </div>

            </div>

            <span
              className={`member-status ${member.status.toLowerCase()}`}
            >
              {member.status}
            </span>

            <h2>{member.name}</h2>

            <div className="member-role">
              <Mic2 size={13} />
              {member.role}
            </div>

            <div className="member-details">

              {member.email && (
                <div>
                  <Mail size={13} />
                  <span>
                    {member.email}
                  </span>
                </div>
              )}

              {member.equipment && (
                <div>
                  <span className="member-detail-label">
                    EQUIP.
                  </span>

                  <span>
                    {member.equipment}
                  </span>
                </div>
              )}

            </div>

            {member.notes && (
              <p className="member-notes">
                {member.notes}
              </p>
            )}

          </article>

        ))}

        {members.length === 0 && (

          <div className="members-empty">

            <Users size={35} />

            <strong>
              Nenhum integrante cadastrado
            </strong>

            <span>
              Adicione os membros da banda
              para começar.
            </span>

            <button
              className="primary-button"
              onClick={openNewMember}
            >
              <Plus size={15} />
              Adicionar integrante
            </button>

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
                  BANDA
                </span>

                <h2>
                  {editingId !== null
                    ? "Editar Integrante"
                    : "Novo Integrante"}
                </h2>

                <p>
                  Informações do membro
                  da banda.
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
                  <label>Nome</label>

                  <input
                    type="text"
                    placeholder="Ex: Jonas"
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
                  <label>Função</label>

                  <input
                    type="text"
                    placeholder="Ex: Vocal"
                    value={form.role}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        role:
                          event.target.value,
                      })
                    }
                    required
                  />
                </div>

              </div>

              <div className="form-row">

                <div className="form-group">
                  <label>E-mail</label>

                  <input
                    type="email"
                    placeholder="email@banda.com"
                    value={form.email}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        email:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Telefone</label>

                  <input
                    type="text"
                    placeholder="(21) 99999-9999"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        phone:
                          event.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <div className="form-group">
                <label>
                  Equipamento principal
                </label>

                <input
                  type="text"
                  placeholder="Ex: Shure SM58 + IEM"
                  value={form.equipment}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      equipment:
                        event.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">

                <label>Status</label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status:
                        event.target
                          .value as MemberStatus,
                    })
                  }
                >
                  <option value="Ativo">
                    Ativo
                  </option>

                  <option value="Convidado">
                    Convidado
                  </option>

                  <option value="Inativo">
                    Inativo
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>
                  Observações
                </label>

                <textarea
                  className="form-textarea"
                  placeholder="Informações adicionais..."
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
                    : "Adicionar Integrante"}
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
              <UserRound size={22} />
            </div>

            <h2>
              Excluir integrante?
            </h2>

            <p>
              O integrante será removido
              da banda.
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


export default Members;