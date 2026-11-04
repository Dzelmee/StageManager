# StageManager

Workspace para gestão de banda: repertório, setlists, shows, integrantes, equipamentos, arquivos técnicos, modo palco e checklist.

O projeto é dividido em duas partes:

- **`/` (raiz):** SPA em React + TypeScript + Vite.
- **`/server`:** API REST em Express + Prisma + PostgreSQL.

## Funcionalidades

| Módulo | Persistência | Situação |
| --- | --- | --- |
| Repertório (músicas) | PostgreSQL | CRUD completo |
| Shows | PostgreSQL | Criar, listar e editar (sem excluir) |
| Setlists | PostgreSQL | Listar, adicionar/remover/reordenar músicas |
| Dashboard | API (health) | Status do servidor; demais números são fixos |
| Integrantes | localStorage | CRUD local no navegador |
| Equipamentos | localStorage | CRUD local no navegador |
| Arquivos técnicos | localStorage | Cadastro local (sem upload real) |
| Checklist do show | localStorage | Implementado, ainda não acessível pelo menu |
| Modo palco | localStorage | Navegação da setlist no palco |

## Stack

- React 19, TypeScript, Vite 8, `lucide-react`
- Express 5, Prisma 7 (`@prisma/adapter-pg`), PostgreSQL
- Sem roteador: a navegação é feita por estado em `src/App.tsx`

## Estrutura

```
src/
  App.tsx              troca de páginas
  components/Sidebar   menu lateral
  pages/               Dashboard, Repertoire, Shows, Setlists,
                       Members, Equipment, TechnicalFiles,
                       StageMode, ShowChecklist
  services/api.ts      cliente HTTP (health)
  services/storage.ts  camada de localStorage
server/
  src/index.ts         rotas da API
  src/lib/prisma.ts    cliente Prisma
  prisma/schema.prisma modelos
  prisma/seed.ts       banda 1 + setlist geral
```

## Pré-requisitos

- Node.js 22 ou superior
- PostgreSQL 17 (local ou via Docker)
- Git

## Setup

```bash
# 1. dependências
npm install
npm install --prefix server

# 2. banco de dados
#    crie o banco `stagemanager` no PostgreSQL e configure a conexão:
cp server/.env.example server/.env

# 3. migrations e dados iniciais
npm run db:migrate
npm run db:seed
```

O seed é idempotente e cria:

- a banda `#1` (usada pelo frontend em todas as chamadas);
- a setlist geral (`showId = null`) usada pelo repertório do dia a dia.

## Rodando

Em dois terminais:

```bash
# API em http://localhost:3333
npm run dev:server

# SPA em http://localhost:5173
npm run dev
```

## API

Base: `http://localhost:3333`

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | status do servidor |
| GET/POST | `/api/bands` | listar/criar banda |
| GET/POST | `/api/songs` | listar (`?bandId=1`) / criar música |
| PUT/DELETE | `/api/songs/:id` | editar/excluir música |
| GET/POST | `/api/setlists` | listar (`?bandId=1`) / criar setlist |
| POST | `/api/setlists/:id/songs` | adicionar música |
| DELETE | `/api/setlists/:id/songs/:itemId` | remover música |
| PUT | `/api/setlists/:id/reorder` | reordenar |
| GET | `/api/setlists/:id/duration` | duração total |
| GET/POST | `/api/shows` | listar (`?bandId=1`) / criar show |
| PUT | `/api/shows/:id` | editar show |

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | SPA em modo desenvolvimento |
| `npm run dev:server` | API em modo desenvolvimento |
| `npm run build` | build de produção do SPA |
| `npm run lint` | ESLint |
| `npm run db:migrate` | aplica migrations pendentes |
| `npm run db:seed` | popula o banco (idempotente) |

No `server`, também há `npm run db:studio` para abrir o Prisma Studio.

## Limitações conhecidas

- `bandId` está fixo em `1` no frontend; não há seleção/criação de banda na interface.
- Integrantes, equipamentos, arquivos e checklist ainda usam `localStorage`.
- Excluir show remove apenas da tela: não existe `DELETE /api/shows/:id`.
- A tela de checklist (`ShowChecklist`) ainda não está ligada ao `App.tsx`.
- "Upload" de arquivo técnico salva somente o nome do arquivo.
- Várias páginas repetem a URL `http://localhost:3333` e a lógica de `fetch`.
