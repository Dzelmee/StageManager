import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  Boxes,
  Edit3,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  getEquipment,
  getMembers,
  saveEquipment,
} from "../services/storage";



type EquipmentStatus =
  | "OK"
  | "Manutenção"
  | "Indisponível";

type Member = {
  id: number;
  name: string;
  role: string;
};

type EquipmentItem = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  responsibleId: number | null;
  status: EquipmentStatus;
  notes: string;
};

const emptyForm = {
  name: "",
  category: "",
  quantity: "1",
  responsibleId: "",
  status: "OK" as EquipmentStatus,
  notes: "",
};


function Equipment() {
  const [equipment, setEquipment] =
  useState<EquipmentItem[]>(() =>
    getEquipment<EquipmentItem[]>()
  );

  const [members] =
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
      saveEquipment(equipment);
    }, [equipment]);

  function openNewEquipment() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditEquipment(
    item: EquipmentItem
  ) {
    setEditingId(item.id);

    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      responsibleId:
        item.responsibleId === null
          ? ""
          : String(item.responsibleId),
      status: item.status,
      notes: item.notes,
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
      !form.category.trim()
    ) {
      return;
    }

    const quantity = Number(form.quantity);

    if (
      Number.isNaN(quantity) ||
      quantity < 1
    ) {
      return;
    }

    const responsibleId =
      form.responsibleId === ""
        ? null
        : Number(form.responsibleId);

    if (editingId !== null) {
      setEquipment((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: form.name.trim(),
                category:
                  form.category.trim(),
                quantity,
                responsibleId,
                status: form.status,
                notes: form.notes.trim(),
              }
            : item
        )
      );

      closeModal();
      return;
    }

    const newEquipment: EquipmentItem = {
      id: Date.now(),
      name: form.name.trim(),
      category: form.category.trim(),
      quantity,
      responsibleId,
      status: form.status,
      notes: form.notes.trim(),
    };

    setEquipment((current) => [
      ...current,
      newEquipment,
    ]);

    closeModal();
  }

  function confirmDelete() {
    if (deleteId === null) {
      return;
    }

    setEquipment((current) =>
      current.filter(
        (item) =>
          item.id !== deleteId
      )
    );

    setDeleteId(null);
  }

  function getResponsibleName(
    responsibleId: number | null
  ) {
    if (responsibleId === null) {
      return "Sem responsável";
    }

    const member = members.find(
      (item) =>
        item.id === responsibleId
    );

    return member
      ? member.name
      : "Integrante removido";
  }

  const totalUnits =
    equipment.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  const okCount =
    equipment.filter(
      (item) =>
        item.status === "OK"
    ).length;

  const maintenanceCount =
    equipment.filter(
      (item) =>
        item.status === "Manutenção"
    ).length;

  return (
    <div>

      {/* HEADER */}

      <header className="page-header">

        <div>
          <span className="eyebrow">
            INVENTÁRIO
          </span>

          <h1>Equipamentos</h1>

          <p>
            Controle equipamentos,
            responsáveis e condições
            de uso.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openNewEquipment}
        >
          <Plus size={16} />
          Novo Equipamento
        </button>

      </header>

      {/* RESUMO */}

      <section className="equipment-summary">

        <div>
          <span>ITENS</span>
          <strong>
            {equipment.length}
          </strong>
        </div>

        <div>
          <span>UNIDADES</span>
          <strong>
            {totalUnits}
          </strong>
        </div>

        <div>
          <span>OK</span>
          <strong>
            {okCount}
          </strong>
        </div>

        <div>
          <span>MANUTENÇÃO</span>
          <strong>
            {maintenanceCount}
          </strong>
        </div>

      </section>

      {/* EQUIPAMENTOS */}

      <section className="equipment-grid">

        {equipment.map((item) => (

          <article
            className="equipment-card"
            key={item.id}
          >

            <div className="equipment-card-header">

              <div className="equipment-icon">
                <Boxes size={19} />
              </div>

              <div className="equipment-actions">

                <button
                  title="Editar equipamento"
                  onClick={() =>
                    openEditEquipment(item)
                  }
                >
                  <Edit3 size={14} />
                </button>

                <button
                  className="danger"
                  title="Excluir equipamento"
                  onClick={() =>
                    setDeleteId(item.id)
                  }
                >
                  <Trash2 size={14} />
                </button>

              </div>

            </div>

            <span
              className={`equipment-status ${
                item.status === "OK"
                  ? "ok"
                  : item.status ===
                    "Manutenção"
                  ? "maintenance"
                  : "unavailable"
              }`}
            >
              {item.status}
            </span>

            <h2>
              {item.name}
            </h2>

            <span className="equipment-category">
              {item.category}
            </span>

            <div className="equipment-information">

              <div>
                <span>QUANTIDADE</span>

                <strong>
                  {item.quantity}
                </strong>
              </div>

              <div>
                <span>RESPONSÁVEL</span>

                <strong>
                  {getResponsibleName(
                    item.responsibleId
                  )}
                </strong>
              </div>

            </div>

            {item.notes && (
              <p className="equipment-notes">
                {item.notes}
              </p>
            )}

          </article>

        ))}

        {equipment.length === 0 && (

          <div className="equipment-empty">

            <Boxes size={36} />

            <strong>
              Nenhum equipamento cadastrado
            </strong>

            <span>
              Monte o inventário técnico
              da banda.
            </span>

            <button
              className="primary-button"
              onClick={openNewEquipment}
            >
              <Plus size={15} />
              Adicionar equipamento
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
                  INVENTÁRIO
                </span>

                <h2>
                  {editingId !== null
                    ? "Editar Equipamento"
                    : "Novo Equipamento"}
                </h2>

                <p>
                  Informações do item
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
                    Equipamento
                  </label>

                  <input
                    type="text"
                    placeholder="Ex: Shure SM58"
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

                  <input
                    type="text"
                    placeholder="Ex: Microfone"
                    value={form.category}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category:
                          event.target.value,
                      })
                    }
                    required
                  />

                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Quantidade
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        quantity:
                          event.target.value,
                      })
                    }
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    Responsável
                  </label>

                  <select
                    value={
                      form.responsibleId
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        responsibleId:
                          event.target.value,
                      })
                    }
                  >
                    <option value="">
                      Sem responsável
                    </option>

                    {members.map(
                      (member) => (
                        <option
                          key={member.id}
                          value={member.id}
                        >
                          {member.name}
                          {" — "}
                          {member.role}
                        </option>
                      )
                    )}

                  </select>

                </div>

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
                          .value as EquipmentStatus,
                    })
                  }
                >
                  <option value="OK">
                    OK
                  </option>

                  <option value="Manutenção">
                    Manutenção
                  </option>

                  <option value="Indisponível">
                    Indisponível
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>
                  Observações
                </label>

                <textarea
                  className="form-textarea"
                  placeholder="Modelo, patrimônio, case, cabos necessários..."
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
                    : "Adicionar Equipamento"}
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
              Excluir equipamento?
            </h2>

            <p>
              O item será removido do
              inventário da banda.
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

export default Equipment;