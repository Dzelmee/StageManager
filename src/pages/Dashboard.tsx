import {
  CalendarDays,
  Clock3,
  MapPin,
  Music2,
  Users,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  getApiHealth,
  type ApiHealth,
} from "../services/api";

function Dashboard() {

  const [apiHealth, setApiHealth] =
  useState<ApiHealth | null>(null);

const [apiError, setApiError] =
  useState(false);

useEffect(() => {
  async function checkApi() {
    try {
      const health = await getApiHealth();

      setApiHealth(health);
      setApiError(false);
    } catch (error) {
      console.error(
        "Erro ao conectar com a API:",
        error
      );

      setApiHealth(null);
      setApiError(true);
    }
  }

  checkApi();
}, []);

      return (
  <div className="dashboard">

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "18px",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: apiError
            ? "#ef4444"
            : apiHealth
              ? "#22c55e"
              : "#f59e0b",
        }}
      />

      {apiError
        ? "Servidor offline"
        : apiHealth
          ? "Servidor online"
          : "Conectando ao servidor..."}
    </div>

    <header className="page-header"></header>
      <header className="page-header">
        <div>
          <span className="eyebrow">VISÃO GERAL</span>

          <h1>Dashboard</h1>

          <p>
            Acompanhe shows, repertório e preparação da banda.
          </p>
        </div>

        <button className="primary-button">
          + Novo Show
        </button>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Music2 size={20} />
          </div>

          <span>Repertório</span>

          <strong>47</strong>

          <small>músicas cadastradas</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CalendarDays size={20} />
          </div>

          <span>Shows</span>

          <strong>12</strong>

          <small>realizados em 2026</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock3 size={20} />
          </div>

          <span>Repertório total</span>

          <strong>4h 03m</strong>

          <small>tempo disponível</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users size={20} />
          </div>

          <span>Integrantes</span>

          <strong>6</strong>

          <small>membros ativos</small>
        </div>
      </section>

      <section className="dashboard-content">
        <div className="panel next-show">
          <div className="panel-header">
            <div>
              <span className="eyebrow">PRÓXIMO SHOW</span>

              <h2>Rock Festival</h2>

              <div className="show-location">
                <MapPin size={14} />
                Rio de Janeiro
              </div>
            </div>

            <span className="show-status">
              CONFIRMADO
            </span>
          </div>

          <div className="show-details">
            <div>
              <span>DATA</span>
              <strong>28 SET 2026</strong>
            </div>

            <div>
              <span>SHOW</span>
              <strong>21:00</strong>
            </div>

            <div>
              <span>SETLIST</span>
              <strong>18 músicas</strong>
            </div>

            <div>
              <span>DURAÇÃO</span>
              <strong>1h 12min</strong>
            </div>
          </div>

          <div className="show-actions">
            <button className="primary-button">
              Abrir Show
            </button>

            <button className="secondary-button">
              Modo Palco
            </button>
          </div>
        </div>

        <div className="panel preparation">
          <span className="eyebrow">
            PREPARAÇÃO
          </span>

          <h2>Status do show</h2>

          <div className="checklist">
            <div className="check-item">
              <span className="check success">✓</span>

              <div>
                <strong>Setlist</strong>
                <small>Pronto</small>
              </div>
            </div>

            <div className="check-item">
              <span className="check success">✓</span>

              <div>
                <strong>Rider técnico</strong>
                <small>Enviado</small>
              </div>
            </div>

            <div className="check-item">
              <span className="check success">✓</span>

              <div>
                <strong>Backline</strong>
                <small>Confirmado</small>
              </div>
            </div>

            <div className="check-item">
              <span className="check warning">!</span>

              <div>
                <strong>Playbacks</strong>
                <small>Pendente</small>
              </div>
            </div>

            <div className="check-item">
              <span className="check success">✓</span>

              <div>
                <strong>Integrantes</strong>
                <small>Confirmados</small>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;