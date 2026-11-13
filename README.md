# URL Shortener

A lightweight URL shortener service built with **Bun**, **Hono**, and **SQLite**.

## Features

- **Automated & Custom Codes**: Generates random 7-character alphanumeric codes or accepts custom aliases.
- **Expiration Support (TTL)**: Optional time-to-live (`ttlSeconds`) to automatically expire links.
- **Click Tracking**: Increments visit counter upon successful redirection (`302`).
- **Validation**: Strict URL format checking (`http`/`https`, up to 2048 characters) and alias regex constraints.
- **Embedded Persistence**: Backed by SQLite in WAL mode for low latency and zero external service dependencies.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)

### Installation & Run

```sh
# Install dependencies
bun install

# Start development server with hot-reload (http://localhost:3000)
bun run dev

# Start production server
bun run start
```

### Testing & Verification

```sh
# Run test suite
bun test

# Run TypeScript type check
bun run typecheck
```

## Environment Configuration

Configuration via environment variables:

| Variable  | Default    | Description                           |
| --------- | ---------- | ------------------------------------- |
| `PORT`    | `3000`     | HTTP server port                      |
| `DB_PATH` | `links.db` | File path for persistent SQLite database |

## API Endpoints

| Method   | Path                  | Description                               |
| -------- | --------------------- | ----------------------------------------- |
| `GET`    | `/api/health`         | Service health check                      |
| `POST`   | `/api/links`          | Create a new short link                   |
| `GET`    | `/:code`              | Redirect (302) to original target URL     |
| `GET`    | `/api/links/:code`    | Retrieve metadata and click statistics    |
| `DELETE` | `/api/links/:code`    | Remove short link                         |

Full request/response schemas and status code contracts are documented in [docs/API.md](docs/API.md).

## Project Structure

```
src/
  index.ts         # Server entry point and environment loader
  app.ts           # Hono application routing and error handling
  db.ts            # SQLite connection and table schema definition
  routes/
    links.ts       # CRUD link endpoints (/api/links)
    redirect.ts    # Redirection endpoint (/:code)
  lib/
    validate.ts    # Request payload and parameter validators
    code.ts        # Random short-code generator
tests/
  links.test.ts    # Comprehensive API integration test suite
docs/
  API.md           # API specification and contract details
```
