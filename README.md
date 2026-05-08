# golgana-backend

Backend de contenidos para Golgana. Sirve la **API pública read-only** que consume el front Nuxt (`golgana-public`) y la **API admin CRUD** que consumirá la futura app Angular de gestión.

Fase 1: persistencia en JSON files. Fase 2: DynamoDB (mismo contrato vía repository pattern).

## Stack

- Node 20 + TypeScript
- [Hono](https://hono.dev) — runtime-agnostic (corre local en Node, deploy a AWS Lambda)
- Zod — validación + inferencia de tipos
- Vitest — tests
- dotenv — config

## Setup local

```bash
npm install
cp .env.example .env
# editar .env si quieres cambiar puerto/keys
npm run dev      # http://localhost:3001
```

Endpoints clave:

```bash
curl http://localhost:3001/healthz
curl http://localhost:3001/selecciones/ecuador
curl http://localhost:3001/torneos/mundial/2026/grupos
curl -H "Authorization: Bearer devkey-change-me" -X PUT \
  http://localhost:3001/admin/jugadores/test \
  -d '{...}' -H "Content-Type: application/json"
```

## Comandos

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor con hot reload (tsx watch) |
| `npm run build` | Compila TS a `dist/` |
| `npm start` | Corre `dist/server.js` (post-build) |
| `npm test` | Vitest run |
| `npm run typecheck` | tsc --noEmit |

## Variables de entorno

| Var | Default | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del server local |
| `NODE_ENV` | `development` | `development` / `test` / `production` |
| `ADMIN_API_KEY` | (requerido) | Bearer token para `/admin/**`. En prod se reemplaza por validador JWT Cognito. |
| `PUBLIC_API_KEY` | `''` | Si está definido, exige Bearer también en lectura pública. Vacío = abierto. |
| `CORS_ORIGINS` | `http://localhost:4200` | Coma-separado. Dominio de la app Angular admin. |
| `STORAGE_DRIVER` | `json` | `json` o `dynamo` (fase 2) |
| `DATA_DIR` | `./data` | Carpeta donde viven los JSON cuando driver=json |

## Estructura

```
src/
├── server.ts           # entry local
├── app.ts              # Hono app + wiring
├── env.ts              # config zod-validated
├── auth.ts             # bearer middleware (JWT-ready)
├── types.ts            # contrato — espejo de golgana-public/types/api.ts
├── routes/
│   ├── public/         # GET (Nuxt consume)
│   └── admin/          # POST/PUT/DELETE (Angular consumirá)
├── repos/
│   ├── interfaces.ts   # IRepo<T>, IPlantillaRepo, IGrupoRepo, ISubresourceRepo
│   ├── factory.ts      # DI: switch por STORAGE_DRIVER
│   └── json/           # impl fase 1 — JsonStore + factory
├── schemas/            # zod por dominio
data/                   # seed copiado desde golgana-public/content
tests/                  # vitest (público + admin)
docs/API.md             # tabla completa de endpoints
```

## Cablear con el front

En `golgana-public/.env`:

```
NUXT_USE_BACKEND=true
NUXT_CMS_API_URL=http://localhost:3001
NUXT_CMS_API_KEY=devkey-change-me
```

Reinicia el `nuxt dev` y los endpoints `/api/**` del front pasan a hablar con este backend en lugar de leer JSON local.

## Roadmap

- **Fase 1 (actual):** JSON storage, Bearer auth.
- **Fase 1b:** Cognito User Pool para admin (Angular app login). Backend valida JWT en `/admin/**`.
- **Fase 1c:** Deploy a AWS Lambda + API Gateway (cuenta separada de polla).
- **Fase 2:** DynamoRepo. Swap del factory, cero cambios en handlers.
- **Fase 3:** App Angular `golgana-admin` para gestión visual de torneos/equipos/jugadores (incluye campeonatos barriales, no solo Mundial).

## Auth en producción

Cuando se haga deploy:
1. Cognito User Pool emite JWTs para usuarios admin.
2. El middleware `requireAdmin` se reemplaza por uno que valide el JWT contra las JWKs públicas de Cognito (sin tocar handlers).
3. La app Angular guarda el JWT y lo envía en `Authorization: Bearer <jwt>`.
4. El header sigue siendo el mismo, así que ningún consumidor cambia.
