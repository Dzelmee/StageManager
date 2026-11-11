import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  MapPin,
  PackageCheck,
  RotateCcw,
} from "lucide-react";

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

type EquipmentItem = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  responsibleId: number | null;
  status: string;
  notes: string;
};

type Member = {
  id: number;
  name: string;
  role: string;
};

type ChecklistState = {
  [equipmentId: string]: boolean;
};

type ShowChecklistProps = {
  showId: number;
  onBack: () => void;
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

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function loadEquipment(): EquipmentItem[] {
  try {
    const saved = localStorage.getItem(
      "stagemanager-equipment"
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function loadMembers(): Member[] {
  try {
    const saved = localStorage.getItem(
      "stagemanager-members"
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function loadChecklist(
  showId: number
): ChecklistState {
  try {
    const saved = localStorage.getItem(
      `stagemanager-checklist-${showId}`
    );

    if (!saved) {
      return {};
    }

    const parsed = JSON.parse(saved);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function formatDate(date: string) {
  if (!date) {
    return "";
  }

  const [year, month, day] =
    date.split("-");

  return `${day}/${month}/${year}`;
}

function ShowChecklistContent({
  showId,
  onBack,
}: ShowChecklistProps) {
  const [shows] =
    useState<Show[]>(loadShows);

  const [equipment] =
    useState<EquipmentItem[]>(
      loadEquipment
    );

  const [members] =
    useState<Member[]>(loadMembers);

  const [checklist, setChecklist] =
    useState<ChecklistState>(() =>
      loadChecklist(showId)
    );

  const selectedShow =
    shows.find(
      (show) => show.id === showId
    ) ?? null;

  useEffect(() => {
    localStorage.setItem(
      `stagemanager-checklist-${showId}`,
      JSON.stringify(checklist)
    );
  }, [checklist, showId]);

  const completedCount =
    equipment.filter(
      (item) =>
        checklist[String(item.id)] ===
        true
    ).length;

  const progress =
    equipment.length > 0
      ? Math.round(
          (completedCount /
            equipment.length) *
            100
        )
      : 0;

  const categories = useMemo(() => {
    const values = equipment.map(
      (item) => item.category
    );

    return [...new Set(values)].sort();
  }, [equipment]);

  function toggleItem(
    equipmentId: number
  ) {
    const key =
      String(equipmentId);

    setChecklist((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function markAll() {
    const updated: ChecklistState =
      {};

    equipment.forEach((item) => {
      updated[String(item.id)] =
        true;
    });

    setChecklist(updated);
  }

  function resetChecklist() {
    if (
      !window.confirm(
        "Deseja desmarcar todo o checklist deste show?"
      )
    ) {
      return;
    }

    setChecklist({});
  }

  function getResponsible(
    responsibleId: number | null
  ) {
    if (responsibleId === null) {
      return "Sem responsável";
    }

    const member = members.find(
      (item) =>
        item.id === responsibleId
    );

    return (
      member?.name ??
      "Integrante removido"
    );
  }

  if (!selectedShow) {
    return (
      <div className="checklist-empty-page">

        <PackageCheck size={40} />

        <h1>
          Show não encontrado
        </h1>

        <button
          className="secondary-button"
          onClick={onBack}
        >
          <ArrowLeft size={15} />
          Voltar
        </button>

      </div>
    );
  }

  return (
    <div>

      <header className="page-header">

        <div>

          <button
            className="checklist-back"
            onClick={onBack}
          >
            <ArrowLeft size={14} />
            Shows
          </button>

          <span className="eyebrow">
            PRODUÇÃO
          </span>

          <h1>
            Checklist Técnico
          </h1>

          <p>
            {selectedShow.name}
          </p>

        </div>

        <div className="checklist-header-actions">

          <button
            className="secondary-button"
            onClick={resetChecklist}
          >
            <RotateCcw size={14} />
            Resetar
          </button>

          <button
            className="primary-button"
            onClick={markAll}
          >
            <Check size={15} />
            Marcar tudo
          </button>

        </div>

      </header>

      {/* SHOW */}

      <section className="checklist-show-info">

        <div>
          <CalendarDays size={15} />

          <span>DATA</span>

          <strong>
            {formatDate(
              selectedShow.date
            )}
          </strong>
        </div>

        <div>
          <MapPin size={15} />

          <span>LOCAL</span>

          <strong>
            {selectedShow.venue}
          </strong>
        </div>

        <div>
          <span>CIDADE</span>

          <strong>
            {selectedShow.city}
          </strong>
        </div>

        <div>
          <span>SHOW</span>

          <strong>
            {selectedShow.showTime}
          </strong>
        </div>

      </section>

      {/* PROGRESSO */}

      <section className="checklist-progress-card">

        <div className="checklist-progress-info">

          <div>
            <span>
              PREPARAÇÃO DO SHOW
            </span>

            <strong>
              {completedCount} de{" "}
              {equipment.length} itens
            </strong>
          </div>

          <strong className="checklist-percent">
            {progress}%
          </strong>

        </div>

        <div className="checklist-progress-track">

          <div
            className="checklist-progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

        {progress === 100 &&
          equipment.length > 0 && (

          <div className="checklist-ready">

            <CheckCircle2
              size={15}
            />

            Equipamentos preparados
            para o show

          </div>

        )}

      </section>

      {/* LISTA */}

      <section className="checklist-content">

        {categories.map(
          (category) => {

            const categoryItems =
              equipment.filter(
                (item) =>
                  item.category ===
                  category
              );

            const categoryDone =
              categoryItems.filter(
                (item) =>
                  checklist[
                    String(item.id)
                  ]
              ).length;

            return (
              <div
                className="checklist-category"
                key={category}
              >

                <div className="checklist-category-header">

                  <div>
                    <span>
                      CATEGORIA
                    </span>

                    <h2>
                      {category}
                    </h2>
                  </div>

                  <span className="checklist-category-count">
                    {categoryDone}/
                    {categoryItems.length}
                  </span>

                </div>

                <div className="checklist-items">

                  {categoryItems.map(
                    (item) => {

                      const checked =
                        checklist[
                          String(
                            item.id
                          )
                        ] === true;

                      return (
                        <button
                          key={item.id}
                          className={`checklist-item ${
                            checked
                              ? "checked"
                              : ""
                          }`}
                          onClick={() =>
                            toggleItem(
                              item.id
                            )
                          }
                        >

                          <div className="checklist-checkbox">

                            {checked ? (
                              <CheckCircle2
                                size={22}
                              />
                            ) : (
                              <Circle
                                size={22}
                              />
                            )}

                          </div>

                          <div className="checklist-item-main">

                            <strong>
                              {item.name}
                            </strong>

                            <span>
                              Responsável:{" "}
                              {getResponsible(
                                item.responsibleId
                              )}
                            </span>

                          </div>

                          <div className="checklist-item-meta">

                            <span>
                              QTD
                            </span>

                            <strong>
                              {item.quantity}
                            </strong>

                          </div>

                          <div
                            className={`checklist-equipment-status ${
                              item.status ===
                              "OK"
                                ? "ok"
                                : item.status ===
                                  "Manutenção"
                                ? "maintenance"
                                : "unavailable"
                            }`}
                          >
                            {item.status}
                          </div>

                        </button>
                      );
                    }
                  )}

                </div>

              </div>
            );
          }
        )}

        {equipment.length === 0 && (

          <div className="checklist-no-equipment">

            <PackageCheck
              size={38}
            />

            <strong>
              Inventário vazio
            </strong>

            <span>
              Cadastre equipamentos
              antes de montar o
              checklist do show.
            </span>

          </div>

        )}

      </section>

    </div>
  );
}

function ShowChecklist(props: ShowChecklistProps) {
  return <ShowChecklistContent key={props.showId} {...props} />;
}

export default ShowChecklist;