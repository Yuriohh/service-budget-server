# CLAUDE.md

## Contexto do projeto

**FechaOrçamento** (`fechaorcamento.com.br`) é um app mobile para prestadores de serviço autônomos brasileiros gerenciarem e enviarem orçamentos para clientes. O objetivo é substituir orçamentos feitos em papel, WhatsApp ou planilha por um fluxo profissional: criar orçamento → adicionar itens/serviços → compartilhar com o cliente.

Este repositório é o **backend** (`service-budget-server`). O frontend é um app React Native + Expo em repositório separado.

**Desenvolvedor:** Júnior 2 em transição para Pleno. O projeto é usado como laboratório de aprendizado além de produto real.

**Status atual:** Em produção local. Em processo de deploy na Railway + publicação na Play Store.

---

## Stack

| Camada          | Tecnologia                          |
| --------------- | ----------------------------------- |
| Runtime         | Node.js + TypeScript (ESM)          |
| Framework       | Fastify 5                           |
| ORM             | Prisma                              |
| Banco           | PostgreSQL                          |
| Validação       | Zod via `fastify-type-provider-zod` |
| Auth            | JWT (`@fastify/jwt`) + bcrypt       |
| Package manager | Yarn 4 (Corepack)                   |
| CI              | GitHub Actions                      |

---

## Comandos essenciais

```bash
# Desenvolvimento
yarn dev                     # Hot-reload via tsx watch, porta 3333

# Qualidade de código
yarn lint                    # ESLint
yarn format                  # Prettier (escreve no arquivo)

# Banco de dados (local)
make up                      # Sobe PostgreSQL via Docker Compose
make down                    # Derruba PostgreSQL
yarn prisma migrate dev      # Roda migrations + regenera client
yarn prisma validate         # Valida schema (exige DATABASE_URL)
yarn prisma studio           # Abre GUI do Prisma

# Produção
yarn build                   # Compila TypeScript → dist/
yarn start                   # node dist/server.js (usado no Railway)
```

> **Nunca usar `npm`.** Sempre `yarn`. O `yarn.lock` não deve ser alterado manualmente.

---

## Variáveis de ambiente

Arquivo `.env` na raiz (nunca commitar):

```env
# Banco
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auth
JWT_SECRET=sua_chave_secreta
SALT=10

# Docker local
PG_PASSWORD=
PG_USER=
PG_DATABASE=

# Recuperação de senha
RESET_PASSWORD_URL=http://localhost:3333/reset-password
APP_SCHEME=myapp
```

Em produção (Railway), todas as variáveis são injetadas via painel. `DATABASE_URL` é injetada automaticamente pelo serviço PostgreSQL do Railway.

---

## Arquitetura

### Estrutura de pastas

```
src/
├── @types/
│   └── fastify-jwt.d.ts      # Augmenta request.user com { id: string }
├── lib/
│   └── prisma.ts             # Singleton do Prisma client
├── middleware/
│   └── auth.ts               # authMiddleware: chama request.jwtVerify()
├── routes/
│   ├── auth.routes.ts        # POST /user/login, /user/register, /user/forgot-password
│   ├── budget.routes.ts      # CRUD de orçamentos (protegido por auth)
│   ├── reset-password.routes.ts  # GET /reset-password → redirect deeplink
│   └── user.routes.ts        # Rotas de perfil de usuário
├── schemas/
│   ├── auth.schemas.ts       # Zod schemas de autenticação
│   └── budget.schema.ts      # Zod schemas de orçamentos
└── server.ts                 # Bootstrap do Fastify, registro de plugins e rotas
```

### Ciclo de uma requisição

1. Request chega → Zod valida body/params via schema do `src/schemas/`
2. Se rota protegida → `authMiddleware` (`preHandler`) chama `request.jwtVerify()`
3. Handler executa lógica via Prisma client singleton (`src/lib/prisma.ts`)
4. Erros de validação → `setErrorHandler` global → resposta `400` estruturada
5. Erros de serialização → `500` com detalhes do Zod issue

### Auth

- JWT emitido em `POST /user/login` com payload `{ id: string }`
- `request.user.id` é tipado via augmentation em `src/@types/fastify-jwt.d.ts`
- `authMiddleware` é aplicado via `fastify.addHook('preHandler', ...)` no plugin de budgets — todas as rotas do plugin herdam

### Modelo de dados

```
User 1 ──→ N Budget 1 ──→ N ServiceItem (cascade delete)
```

- `Budget.status` padrão: `"draft"`
- Toda mutação de budget verifica `{ userId, id }` antes de agir — usuário só modifica o próprio

### Padrão de rotas com Zod

```typescript
// COM schema Zod — obrigatório usar withTypeProvider
fastify.withTypeProvider<ZodTypeProvider>().post(
  '/rota',
  {
    schema: { body: MinhaSchema },
  },
  handler,
);

// SEM schema — omitir withTypeProvider
fastify.get('/rota', handler);
```

---

## CI/CD

GitHub Actions em `.github/workflows/ci.yml`:

- Dispara em push/PR para `main`
- Roda: ESLint → Prettier check → `prisma validate`
- Usa `yarn --immutable` (não altera lockfile)

**Próximo passo planejado:** adicionar step de deploy automático no Railway após CI verde.

---

## Estado atual do projeto

### Implementado ✅

- Cadastro, login, logout
- Recuperação de senha com email + deeplink para o app mobile
- CRUD completo de orçamentos
- CRUD de itens de serviço por orçamento
- Auth middleware em todas as rotas de budget
- Validação com Zod em todas as rotas
- CI com lint + prettier + prisma validate
- Pre-commit hook (Husky + lint-staged)

### Pendente / próximas entregas 🔜

- [ ] Deploy no Railway (backend + PostgreSQL em nuvem)
- [ ] Domínio `fechaorcamento.com.br` apontando para Railway
- [ ] Email transacional real (Resend) em produção
- [ ] Testes de integração nos endpoints
- [ ] Observabilidade: Sentry para erros em produção
- [ ] Export de orçamento em PDF
- [ ] Pipeline CI/CD com deploy automático no Railway

---

## Convenções e regras de código

- **Package manager:** sempre `yarn`, nunca `npm` ou `npx` direto
- **Schemas:** um arquivo por domínio em `src/schemas/` — não criar schemas inline nas rotas
- **Tipagem:** usar `withTypeProvider<ZodTypeProvider>()` apenas quando há schema Zod anexado
- **Rota nova:** sempre criar schema Zod em `src/schemas/` antes de implementar o handler
- **Ownership:** toda query de mutação deve incluir `userId` no where — nunca confiar só no `id` da rota
- **Imports:** ESM — usar `import`/`export`, sem `require()`
- **Erros:** não lançar erros genéricos — usar `fastify.httpErrors` ou resposta estruturada com status code correto

---

## Regras para o Claude Code

### Pode fazer autonomamente

- Adicionar/editar schemas Zod em `src/schemas/`
- Criar novas rotas seguindo o padrão existente
- Adicionar campos no Prisma schema e gerar migration
- Corrigir erros de tipagem TypeScript
- Rodar `yarn lint` e `yarn format` para verificar qualidade
- Melhorar mensagens de erro ou validações existentes

### Sempre perguntar antes

- Instalar novas dependências — justificar o porquê e se não há alternativa nativa
- Alterar o modelo de dados do Prisma de forma destrutiva (renomear campos, remover colunas)
- Mudar a estrutura de pastas ou mover arquivos
- Alterar o comportamento do `authMiddleware`
- Modificar o `docker-compose.yaml` ou o `Makefile`
- Qualquer mudança que afete o contrato de API (campos, status codes, formatos de resposta) — pode quebrar o app mobile

### Nunca fazer

- Usar `npm` ou `npm install`
- Commitar arquivos `.env`
- Remover o `yarn --immutable` do CI
- Criar lógica de negócio diretamente nas rotas — manter handlers enxutos
