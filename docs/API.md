# API Reference

Base URL: `http://localhost:3001` (local) — futuro: `https://api.golgana.net` (TBD).

## Auth

- **Public reads:** abierto si `PUBLIC_API_KEY` no está definido. Si lo está, se exige `Authorization: Bearer <PUBLIC_API_KEY>`.
- **Admin:** siempre `Authorization: Bearer <ADMIN_API_KEY>`. En prod se sustituye por JWT Cognito.

## Salud

| Método | Path | Descripción |
|---|---|---|
| GET | `/healthz` | `{ ok: true, version }` |

## Selecciones (públicas)

| Método | Path | Devuelve |
|---|---|---|
| GET | `/selecciones` | `Equipo[]` |
| GET | `/selecciones/:slug` | `Equipo` |
| GET | `/selecciones/:slug/plantilla` | `Plantilla` |
| GET | `/selecciones/:slug/historia` | objeto editorial |
| GET | `/selecciones/:slug/idolos` | objeto editorial |
| GET | `/selecciones/:slug/titulos` | objeto editorial |
| GET | `/selecciones/:slug/partidos` | listado de partidos próximos/pasados |
| GET | `/selecciones/:slug/clasicos` | rivalidades |
| GET | `/selecciones/:slug/estadio` | sede principal + secundarias |

## Jugadores

| Método | Path | Devuelve |
|---|---|---|
| GET | `/jugadores` | `Jugador[]` |
| GET | `/jugadores/:slug` | `Jugador` |

## Partidos

| Método | Path | Devuelve |
|---|---|---|
| GET | `/partidos` | `Partido[]` |
| GET | `/partidos/:slug` | `Partido` |

## Torneos / Mundial

| Método | Path | Devuelve |
|---|---|---|
| GET | `/torneos/:slug` | `Torneo` (evergreen) |
| GET | `/torneos/mundial` | `Torneo` (evergreen mundial) |
| GET | `/torneos/mundial/:edicion` | `Edicion` |
| GET | `/torneos/mundial/:edicion/grupos` | `Grupo[]` ordenado A..L |
| GET | `/torneos/mundial/:edicion/grupos/:slug` | `Grupo` |
| GET | `/torneos/mundial/:edicion/calendario` | `Partido[]` ordenado por fecha |
| GET | `/torneos/mundial/:edicion/sedes` | `Sede[]` |
| GET | `/torneos/mundial/:edicion/goleadores` | tabla derivada de partidos finalizados |

## Temas / Noticias

| Método | Path | Devuelve |
|---|---|---|
| GET | `/temas` | `Tema[]` |
| GET | `/temas/:slug` | `Tema` |
| GET | `/noticias` | `Articulo[]` ordenado por fecha desc |
| GET | `/noticias/:slug` | `Articulo` |

---

## Admin (Bearer requerido)

Todas bajo `/admin/**`. CRUD valida con Zod; respuestas 400 con `{ error, details }` cuando falla validación. 401 si falta/incorrect bearer. 404 si recurso no existe. 409 cuando un POST intenta crear con slug ya tomado.

### Selecciones

| Método | Path |
|---|---|
| POST | `/admin/selecciones` |
| PUT | `/admin/selecciones/:slug` |
| DELETE | `/admin/selecciones/:slug` |
| PUT | `/admin/selecciones/:slug/plantilla` |
| DELETE | `/admin/selecciones/:slug/plantilla` |
| PUT | `/admin/selecciones/:slug/{historia\|idolos\|titulos\|partidos\|clasicos\|estadio}` |

### Jugadores / Partidos / Temas / Noticias

Patrón uniforme:

| Método | Path |
|---|---|
| POST | `/admin/{recurso}` |
| PUT | `/admin/{recurso}/:slug` |
| DELETE | `/admin/{recurso}/:slug` |

Recursos: `jugadores`, `partidos`, `temas`, `noticias`.

### Torneos / Mundial

| Método | Path |
|---|---|
| PUT | `/admin/torneos/:slug` |
| DELETE | `/admin/torneos/:slug` |
| PUT | `/admin/torneos/mundial/:edicion` |
| DELETE | `/admin/torneos/mundial/:edicion` |
| PUT | `/admin/torneos/mundial/:edicion/grupos/:slug` |
| DELETE | `/admin/torneos/mundial/:edicion/grupos/:slug` |

---

## Ejemplo: crear un jugador

```bash
curl -X POST http://localhost:3001/admin/jugadores \
  -H "Authorization: Bearer devkey-change-me" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "kendry-paez",
    "nombre": "Kendry Páez",
    "nombreCompleto": "Kendry Anderson Páez Lalangui",
    "fechaNacimiento": "2007-05-04",
    "nacionalidad": "Ecuador",
    "posicion": "MED",
    "clubActual": { "type": "equipo", "slug": "chelsea", "nombre": "Chelsea FC" },
    "seleccion": { "type": "equipo", "slug": "ecuador", "nombre": "Ecuador" },
    "trayectoria": [],
    "redes": {},
    "seo": { "title": "Kendry Páez", "description": "Perfil de Kendry Páez" },
    "faq": []
  }'
```

## Errores

```json
// 401
{ "error": "Unauthorized" }

// 400 (validación zod)
{ "error": "ValidationError", "details": { "fieldErrors": { ... } } }

// 404
{ "error": "Not Found" }

// 409
{ "error": "Selección ya existe: ecuador" }

// 500
{ "error": "InternalServerError" }
```
