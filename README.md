# StageManager

Workspace para bandas organizarem repertório, setlists, shows, equipamentos e
arquivos técnicos. O acesso é por conta própria: cada cadastro cria um workspace
isolado e todas as rotas de dados usam a banda vinculada à sessão.

## Stack

- **Web:** React 19 + TypeScript + Vite
- **API:** Node.js + Express 5 + Prisma 7
- **Banco:** PostgreSQL
- **Autenticação:** sessão opaca em cookie `HttpOnly`, senha com `scrypt`,
  OAuth 2.0 (Google e Apple) opcional

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 15 ou superior

## Como rodar

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
```

Edite `server/.env` com a string de conexão do seu PostgreSQL. Depois aplique as
migrações e suba a API:

```bash
npx prisma migrate deploy
npm run dev
```

A API responde em `http://localhost:3333`. O health check fica em
`GET /api/health`.

> O cliente do Prisma é gerado em `server/src/generated/prisma`. Se você mudar o
> schema, rode `npx prisma generate` antes de compilar.

### 2. Frontend

Na raiz do projeto:

```bash
npm install
cp .env.example .env
npm run dev
```

O SPA abre em `http://localhost:5173` e conversa com a API definida em
`VITE_API_URL`.

## Variáveis de ambiente

### Frontend (`.env`)

| Variável       | Padrão                  | Descrição                          |
| -------------- | ----------------------- | ---------------------------------- |
| `VITE_API_URL` | `http://localhost:3333` | URL base da API, sem barra no final |

### Backend (`server/.env`)

| Variável            | Obrigatória | Descrição                                                       |
| ------------------- | ----------- | --------------------------------------------------------------- |
| `DATABASE_URL`      | sim         | Conexão PostgreSQL usada pelo Prisma                            |
| `FRONTEND_URL`      | não         | Origem do SPA; usada em redirecionamentos de OAuth e e-mails    |
| `API_PUBLIC_URL`    | não         | URL pública da API; usada nos links de verificação de e-mail    |
| `SESSION_SECRET`    | em produção | Segredo para assinar/derivar tokens. Use 32+ bytes aleatórios   |
| `COOKIE_SECURE`     | não         | `true` força cookie `Secure`; padrão é `true` em produção       |
| `GOOGLE_CLIENT_ID`  | não         | Habilita o botão de login com Google                            |
| `GOOGLE_CLIENT_SECRET` | não      | Segredo do cliente Google                                       |
| `APPLE_CLIENT_ID`   | não         | Service ID da Apple                                             |
| `APPLE_TEAM_ID`     | não         | Team ID da Apple Developer                                      |
| `APPLE_KEY_ID`      | não         | Key ID da chave `.p8`                                           |
| `APPLE_PRIVATE_KEY` | não         | Conteúdo da chave `.p8` (com `\n` escapados)                    |

Gere o segredo de sessão com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Sem SMTP configurado, os links de confirmação de e-mail e redefinição de senha
são impressos no console da API em ambiente de desenvolvimento.

## Autenticação e segurança

- Cadastro exige aceite dos Termos de Uso e da Política de Privacidade
  (versão `2026-11-04`), registrado na conta com data e versão.
- A senha nunca é armazenada: usamos `scrypt` com salt individual e comparação
  em tempo constante.
- A sessão é um token opaco enviado em cookie `HttpOnly` + `SameSite=Lax`
  (`sm_session`), válido por 30 dias. No banco fica apenas o hash SHA-256.
- Trocar ou redefinir a senha encerra as outras sessões ativas.
- Login, cadastro e recuperação de senha têm limite de tentativas por IP.
- O IP e o navegador são gravados apenas como hash nos eventos de auditoria.
- Nenhum token de sessão é guardado no `localStorage`.

### Login social

Os botões de Google e Apple só aparecem quando o provedor correspondente está
configurado. O fluxo usa Authorization Code com validação do `id_token` via
`jose`. Para a Apple, o client secret é assinado em tempo de execução com a
chave `.p8`.

## LGPD

A página **Perfil** concentra os controles de privacidade:

- exportação dos dados da conta e do workspace em JSON;
- alteração de senha e encerramento de sessões;
- revogação do consentimento de marketing;
- exclusão definitiva da conta.

Ao excluir a conta, o workspace é apagado se você for o único integrante; caso
contrário, apenas o seu vínculo é removido. Os documentos legais ficam em
`public/termos.html` e `public/privacidade.html`.

## Scripts

### Raiz

```bash
npm run dev      # SPA em modo desenvolvimento
npm run build    # type-check + build de produção
npm run preview  # serve o build
npm run lint     # ESLint
```

### `server/`

```bash
npm run dev    # API com reload automático
npm run build  # compila TypeScript para dist/
npm start      # executa o build (via Node + Prisma/ESM)
npm test       # testes de integração (usa stagemanager_test)
```

## Testes

Os testes de integração criam e migram automaticamente o banco
`stagemanager_test`, criam contas reais via `/api/auth/register` e reaproveitam o
cookie de sessão. Eles limpam os dados ao final.

```bash
cd server
npm test
```

Defina `TEST_DATABASE_URL` se quiser usar outro banco de teste.

## Problemas comuns no ambiente local

Alguns pontos que vale conferir quando o projeto não inicia corretamente:

- **A interface abre, mas não carrega dados:** confirme que a API está rodando
  na porta 3333 e que `VITE_API_URL` aponta para o endereço correto.
  Abra `http://localhost:3333/api/health` para conferir a resposta da API.
- **Erro de conexão com o banco:** verifique se o PostgreSQL está ativo e se
  `DATABASE_URL` no `server/.env` corresponde ao banco local. Depois execute
  `npx prisma migrate deploy` dentro de `server/`.
- **Erro de tipos ou cliente Prisma após mudar o schema:** execute
  `npx prisma generate` dentro de `server/` antes de tentar compilar novamente.
- **Falha ao executar testes:** os testes usam um banco separado
  (`stagemanager_test`). Confira as permissões do PostgreSQL e, se necessário,
  configure `TEST_DATABASE_URL` para apontar para um banco exclusivo de testes.

Antes de abrir um PR, costumo conferir pelo menos `npm run lint` e
`npm run build` na raiz. Mudanças na API também precisam passar por
`npm run build` dentro de `server/`.
