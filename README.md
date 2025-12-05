## Wedding RSVP Site

Single-use web application that allows guests to confirm attendance for a wedding. A lightweight landing page collects responses, sends them to a NestJS API, and stores them inside MongoDB.

### Architecture

- **Domain** — `src/domain` contains the RSVP entity and repository contracts.
- **Application layer** — `src/application` exposes orchestrating use cases.
- **Infrastructure** — MongoDB adapter plus HTTP controllers under `src/infrastructure` and `src/interfaces`.
- **Presentation** — static UI inside `public/`, served via `@nestjs/serve-static`.

### Prerequisites

- Node.js 20+
- MongoDB instance (local or managed)

Set the connection details through environment variables before starting the server:

```bash
export MONGODB_URI="mongodb://127.0.0.1:27017"
export MONGODB_DB="wedding_site"
export PORT=3000 # optional
```

### Getting started

```bash
npm install
npm run start:dev
```

Open [http://localhost:3000](http://localhost:3000) to view the invitation page. The form submits to `/api/rsvp` and persists every answer in the `rsvps` collection of the configured MongoDB database.

### Docker

The project ships with a production-ready image and a `docker-compose.yaml` that spins up MongoDB alongside the NestJS app.

```bash
docker compose up --build
```

The compose file exposes the UI at [http://localhost:3000](http://localhost:3000) and MongoDB at `mongodb://localhost:27017`. Override database names, ports, or add credentials by editing the `environment` block of the `wedding-app` service.

### CI

GitHub Actions (`.github/workflows/ci.yaml`) runs linting, unit tests, build, and a Docker image build on every push/PR to ensure the site stays production-ready.

### API

`POST /api/rsvp`

```json
{
  "fullName": "Анна Иванова",
  "attending": true,
  "phone": "+7 999 888 77 66",
  "guestsCount": 2,
  "message": "Нужен трансфер"
}
```

`GET /api/rsvp` returns the most recent answers (useful for quick operator checks or integrations).

### Testing

Run `npm run test` to execute unit tests (none are provided beyond Nest defaults, but the command is wired and ready for extension).
