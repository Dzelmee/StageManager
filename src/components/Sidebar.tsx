import {
  CalendarDays,
  FileText,
  Guitar,
  LayoutDashboard,
  ListMusic,
  Music2,
  Radio,
  Users,
} from "lucide-react";

type SidebarProps = {
  page: string;
  setPage: (page: string) => void;
};

function Sidebar({
  page,
  setPage,
}: SidebarProps) {
  return (
    <aside className="sidebar">

      <div className="logo">
        <div className="logo-icon">
          S
        </div>

        <div className="logo-text">
          <strong>
            StageManager
          </strong>

          <span>
            Band Workspace
          </span>
        </div>
      </div>

      <div className="menu-title">
        WORKSPACE
      </div>

      <nav className="menu">

        <button
          className={
            page === "dashboard"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() =>
            setPage("dashboard")
          }
        >
          <LayoutDashboard size={19} />
          Dashboard
        </button>

        <button
          className={
            page === "shows"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() =>
            setPage("shows")
          }
        >
          <CalendarDays size={19} />
          Shows
        </button>

        <button
          className={
            page === "setlists"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() =>
            setPage("setlists")
          }
        >
          <ListMusic size={19} />
          Setlists
        </button>

        <button
          className={
            page === "repertoire"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() =>
            setPage("repertoire")
          }
        >
          <Music2 size={19} />
          Repertório
        </button>

        <button
          className={
            page === "members"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() =>
            setPage("members")
          }
        >
          <Users size={19} />
          Integrantes
        </button>

        <button
          className={
            page === "equipment"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() =>
            setPage("equipment")
          }
        >
          <Guitar size={19} />
          Equipamentos
        </button>

        <button
          className={
            page === "files"
              ? "menu-item active"
              : "menu-item"
          }
          onClick={() =>
            setPage("files")
          }
        >
          <FileText size={19} />
          Arquivos
        </button>

      </nav>

      <button
        className="stage-mode-button"
        onClick={() =>
          setPage("stage")
        }
      >
        <Radio size={18} />
        Modo Palco
      </button>

    </aside>
  );
}

export default Sidebar;