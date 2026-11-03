import { useState } from "react";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Repertoire from "./pages/Repertoire";
import Setlists from "./pages/Setlists";
import Shows from "./pages/Shows";
import StageMode from "./pages/StageMode";
import Members from "./pages/Members";
import Equipment from "./pages/Equipment";
import TechnicalFiles from "./pages/TechnicalFiles";

function App() {
  const [page, setPage] =
    useState("dashboard");

  const [
    selectedShowId,
    setSelectedShowId,
  ] = useState<number | null>(null);
  function openShowSetlist(
    showId: number
  ) {
    setSelectedShowId(showId);
    setPage("setlists");
  }
  
  function openShowChecklist(
    showId: number
  ) {
    setSelectedShowId(showId);
    setPage("checklist");
  }
  
  function openGeneralSetlist() {
    setSelectedShowId(null);
    setPage("setlists");
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
              onOpenSetlist={
                openShowSetlist
              }
              onOpenChecklist={
                openShowChecklist
              }
            />
          );

          

      case "setlists":
        return (
          <Setlists
            showId={
              selectedShowId
            }
          />
        );

        case "members":
          return <Members />;

          case "equipment":
            return <Equipment />;

            case "files":
              return <TechnicalFiles />;

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
          if (
            newPage === "setlists"
          ) {
            openGeneralSetlist();
            return;
          }

          setPage(newPage);
        }}
      />

      <main className="main-content">
        {renderPage()}
      </main>

    </div>
  );
}

export default App;