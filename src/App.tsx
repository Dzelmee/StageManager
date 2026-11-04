import { useState } from "react";

import { useAuth } from "./auth/AuthContext";
import Sidebar from "./components/Sidebar";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Equipment from "./pages/Equipment";
import Members from "./pages/Members";
import Profile from "./pages/Profile";
import Repertoire from "./pages/Repertoire";
import Setlists from "./pages/Setlists";
import Shows from "./pages/Shows";
import StageMode from "./pages/StageMode";
import TechnicalFiles from "./pages/TechnicalFiles";

function App() {
  const { user, loading } = useAuth();

  const [page, setPage] = useState("dashboard");

  const [selectedShowId, setSelectedShowId] = useState<number | null>(
    null
  );

  function openShowSetlist(showId: number) {
    setSelectedShowId(showId);
    setPage("setlists");
  }

  function openShowChecklist(showId: number) {
    setSelectedShowId(showId);
    setPage("checklist");
  }

  function openGeneralSetlist() {
    setSelectedShowId(null);
    setPage("setlists");
  }

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-card auth-card-loading">
          <div className="logo-icon">S</div>
          <p>Carregando seu workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  function renderPage() {
    switch (page) {
      case "dashboard":
        return <Dashboard />;

      case "repertoire":
        return <Repertoire />;

      case "shows":
        return (
          <Shows
            onOpenSetlist={openShowSetlist}
            onOpenChecklist={openShowChecklist}
          />
        );

      case "setlists":
        return <Setlists showId={selectedShowId} />;

      case "members":
        return <Members />;

      case "equipment":
        return <Equipment />;

      case "files":
        return <TechnicalFiles />;

      case "profile":
        return <Profile />;

      case "stage":
        return <StageMode />;

      default:
        return <Dashboard />;
    }
  }

  return (
    <div className="app">
      <Sidebar
        page={page}
        setPage={(newPage) => {
          if (newPage === "setlists") {
            openGeneralSetlist();
            return;
          }

          setPage(newPage);
        }}
      />

      <main className="main-content">{renderPage()}</main>
    </div>
  );
}

export default App;
