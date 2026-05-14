# AGENTS.md

Instruções para agentes de IA que trabalham neste repositório.

## Comandos

```bash
# Desenvolvimento
yarn dev                        # Inicia o servidor com hot-reload (tsx watch) na porta 3333

# Qualidade de código
yarn lint                       # ESLint
yarn format                     # Prettier (sobrescreve os arquivos)

# Banco de dados
make up                         # Sobe o PostgreSQL via Docker Compose
make down                       # Para o PostgreSQL
yarn prisma migrate dev         # Executa migrações e regenera o Prisma client
yarn prisma validate            # Valida o schema (requer DATABASE_URL)
yarn prisma studio              # Abre a GUI do Prisma
```

Não há suite de testes ainda.

## Variáveis de Ambiente

Necessárias no `.env`:
- `DATABASE_URL` — string de conexão com o PostgreSQL
- `JWT_SECRET` — segredo para assinatura do JWT
- `PG_PASSWORD`, `PG_USER`, `PG_DATABASE` — usadas pelo `docker-compose.yaml`
- `SALT` — rounds do bcrypt (padrão: 10)

## Arquitetura

**Stack:** Fastify 5 + TypeScript (ESM) + Prisma ORM + PostgreSQL + validação Zod via `fastify-type-provider-zod`.

**Ciclo de uma requisição:**
1. Schemas Zod em `src/schemas/` definem e validam bodies/params.
2. Rotas em `src/routes/` registram handlers com prefixos (`/user`, `/budgets`).
3. `src/middleware/auth.ts` — `authMiddleware` chama `request.jwtVerify()` e é aplicado a todo o plugin `budgetRoutes` via `fastify.addHook('preHandler', ...)`.
4. `src/lib/prisma.ts` — instância singleton do Prisma usada por todas as rotas.

**Fluxo de autenticação:** JWT emitido em `POST /user/login` com payload `{ id: string }`. O type augmentation em `src/@types/fastify-jwt.d.ts` torna `request.user.id` tipado em todo o app.

**Modelo de dados:**
- `User` possui muitos `Budget`s (1-para-muitos).
- `Budget` contém muitos `ServiceItem`s (1-para-muitos, cascade delete).
- O campo `status` do Budget tem valor padrão `"draft"`.

**Isolamento por usuário:** Todas as mutações de budget (`PATCH /budgets/update/:id`, `DELETE /budgets/budgets/:id`) consultam com `{ userId, id }` antes de agir — usuários só modificam seus próprios orçamentos.

**Erros de validação** são capturados pelo `setErrorHandler` global e retornados como respostas `400` estruturadas. Erros de serialização de resposta retornam `500` com detalhes dos issues do Zod.

## CI

GitHub Actions (`.github/workflows/ci.yml`) executa em push/PR para `main`: ESLint, verificação do Prettier e `prisma validate`. Usa `yarn --immutable` — não altere o `yarn.lock` sem rodar `yarn install` localmente antes.

## Convenções

- Gerenciador de pacotes: **Yarn 4** (via Corepack). Use `yarn`, não `npm`.
- Rotas usam `fastify.withTypeProvider<ZodTypeProvider>()` quando um schema Zod é anexado; omitir em rotas sem tipagem (ex.: `GET /budgets/`).
- Schemas ficam em `src/schemas/`, um arquivo por domínio (`auth.schemas.ts`, `budget.schema.ts`).
- Hook de pre-commit (Husky + lint-staged) executa ESLint + Prettier nos arquivos `src/**/*.ts` staged automaticamente.
