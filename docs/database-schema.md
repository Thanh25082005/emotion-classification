# Database Schema

## Overview

The system uses **PostgreSQL 15** as its primary data store. The `uuid-ossp` extension is enabled to generate UUID primary keys server-side.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Tables

### `users`

Stores registered user accounts.

| Column         | Type                        | Constraints                              | Notes                                      |
|----------------|-----------------------------|------------------------------------------|--------------------------------------------|
| `id`           | `UUID`                      | PRIMARY KEY, DEFAULT uuid_generate_v4()  | Surrogate primary key                      |
| `email`        | `VARCHAR(255)`              | NOT NULL, UNIQUE                         | Used as login identifier                   |
| `hashed_password` | `TEXT`                   | NOT NULL                                 | bcrypt hash (cost 12)                      |
| `full_name`    | `VARCHAR(255)`              | NULL                                     | Optional display name                      |
| `is_active`    | `BOOLEAN`                   | NOT NULL, DEFAULT TRUE                   | Soft disable without deleting account      |
| `is_verified`  | `BOOLEAN`                   | NOT NULL, DEFAULT FALSE                  | Email verification flag (future feature)   |
| `created_at`   | `TIMESTAMPTZ`               | NOT NULL, DEFAULT NOW()                  | Account creation timestamp                 |
| `updated_at`   | `TIMESTAMPTZ`               | NOT NULL, DEFAULT NOW()                  | Last profile update; updated via trigger   |

**Indexes:**

```sql
CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_created_at ON users (created_at DESC);
```

---

### `emotion_results`

Stores the output of each emotion inference request (both image uploads and realtime frames).

| Column              | Type           | Constraints                             | Notes                                                         |
|---------------------|----------------|-----------------------------------------|---------------------------------------------------------------|
| `id`                | `UUID`         | PRIMARY KEY, DEFAULT uuid_generate_v4() | Surrogate primary key                                         |
| `user_id`           | `UUID`         | NOT NULL, FK -> users(id) ON DELETE CASCADE | Owner of this result                                     |
| `source`            | `VARCHAR(20)`  | NOT NULL                                | `'upload'` or `'realtime'`                                    |
| `dominant_emotion`  | `VARCHAR(50)`  | NULL                                    | Top emotion label across all detected faces                   |
| `face_count`        | `INTEGER`      | NOT NULL, DEFAULT 0                     | Number of faces detected in the image/frame                   |
| `faces`             | `JSONB`        | NOT NULL, DEFAULT '[]'                  | Array of `FaceResult` objects (see structure below)           |
| `processing_time_ms`| `INTEGER`      | NULL                                    | Inference latency in milliseconds, reported by AI Service     |
| `image_url`         | `TEXT`         | NULL                                    | S3/storage URL of the source image (upload path only)         |
| `session_id`        | `UUID`         | NULL, FK -> realtime_sessions(id)       | Set for realtime frames; NULL for uploads                     |
| `created_at`        | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                 | When this result was persisted                                |

**`faces` JSONB column structure:**

Each element in the `faces` array is a `FaceResult` object:

```json
[
  {
    "face_id": 0,
    "bounding_box": {
      "x": 120,
      "y": 45,
      "width": 180,
      "height": 200
    },
    "confidence": 0.98,
    "dominant_emotion": "happy",
    "emotions": {
      "happy":    0.85,
      "neutral":  0.08,
      "sad":      0.03,
      "angry":    0.02,
      "surprised":0.01,
      "fearful":  0.005,
      "disgusted":0.005
    }
  }
]
```

| Field                       | Type    | Description                                           |
|-----------------------------|---------|-------------------------------------------------------|
| `face_id`                   | integer | Zero-based index of this face in the image            |
| `bounding_box.x`            | integer | Left edge of the face bounding box in pixels          |
| `bounding_box.y`            | integer | Top edge of the face bounding box in pixels           |
| `bounding_box.width`        | integer | Width of the bounding box in pixels                   |
| `bounding_box.height`       | integer | Height of the bounding box in pixels                  |
| `confidence`                | float   | Face detector confidence score (0.0 – 1.0)           |
| `dominant_emotion`          | string  | Emotion label with the highest probability            |
| `emotions`                  | object  | Map of emotion label -> probability (all sum to 1.0) |

**Indexes:**

```sql
CREATE INDEX idx_emotion_results_user_id ON emotion_results (user_id);
CREATE INDEX idx_emotion_results_created_at ON emotion_results (created_at DESC);
CREATE INDEX idx_emotion_results_user_created ON emotion_results (user_id, created_at DESC);
CREATE INDEX idx_emotion_results_source ON emotion_results (source);
CREATE INDEX idx_emotion_results_faces ON emotion_results USING GIN (faces);
```

---

### `realtime_sessions`

Tracks the lifecycle of each WebSocket connection used for realtime emotion detection.

| Column        | Type           | Constraints                              | Notes                                                  |
|---------------|----------------|------------------------------------------|--------------------------------------------------------|
| `id`          | `UUID`         | PRIMARY KEY, DEFAULT uuid_generate_v4()  | Surrogate primary key                                  |
| `user_id`     | `UUID`         | NOT NULL, FK -> users(id) ON DELETE CASCADE | Session owner                                       |
| `status`      | `VARCHAR(20)`  | NOT NULL, DEFAULT 'active'               | Session lifecycle state (see enum values below)        |
| `frame_count` | `INTEGER`      | NOT NULL, DEFAULT 0                      | Total frames processed during this session             |
| `started_at`  | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  | When the WebSocket connection was established          |
| `ended_at`    | `TIMESTAMPTZ`  | NULL                                     | When the session was closed; NULL while active         |
| `metadata`    | `JSONB`        | NULL                                     | Optional client info (browser, resolution, etc.)       |

**Status enum values:**

| Value       | Description                                                        |
|-------------|--------------------------------------------------------------------|
| `active`    | WebSocket connection is open and frames are being processed        |
| `closed`    | Client disconnected gracefully                                     |
| `error`     | Session terminated due to an error (e.g., auth failure, timeout)  |

**Indexes:**

```sql
CREATE INDEX idx_realtime_sessions_user_id ON realtime_sessions (user_id);
CREATE INDEX idx_realtime_sessions_status ON realtime_sessions (status);
CREATE INDEX idx_realtime_sessions_started_at ON realtime_sessions (started_at DESC);
```

---

### `refresh_tokens`

Stores hashed refresh tokens for JWT token rotation.

| Column        | Type           | Constraints                              | Notes                                                        |
|---------------|----------------|------------------------------------------|--------------------------------------------------------------|
| `id`          | `UUID`         | PRIMARY KEY, DEFAULT uuid_generate_v4()  | Surrogate primary key                                        |
| `user_id`     | `UUID`         | NOT NULL, FK -> users(id) ON DELETE CASCADE | Token owner                                               |
| `token_hash`  | `TEXT`         | NOT NULL, UNIQUE                         | SHA-256 hash of the raw refresh token value                  |
| `expires_at`  | `TIMESTAMPTZ`  | NOT NULL                                 | Absolute expiry timestamp                                    |
| `revoked`     | `BOOLEAN`      | NOT NULL, DEFAULT FALSE                  | Set to TRUE when the token has been used or explicitly revoked |
| `created_at`  | `TIMESTAMPTZ`  | NOT NULL, DEFAULT NOW()                  | When this token was issued                                   |

**Validation logic:**

A refresh token is valid if and only if all of the following are true:
1. A row with the matching `token_hash` exists.
2. `revoked = FALSE`.
3. `expires_at > NOW()`.

On successful use, the token is immediately revoked (`revoked = TRUE`) and a new token is issued (rotation). This prevents replay attacks.

**Indexes:**

```sql
CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
```

---

## Entity Relationship

```
users (1) ----< emotion_results (N)
  |                   |
  |                   +---- session_id (FK, nullable) ----> realtime_sessions
  |
  +----------< realtime_sessions (N)
  |
  +----------< refresh_tokens (N)
```

- One user has many emotion results.
- One user has many realtime sessions.
- One realtime session has many emotion results (those captured during that session).
- One user has many refresh tokens (one per active device/login; old tokens are revoked on rotation).

---

## Migration Commands

The project uses **Alembic** for database migrations. Run all migration commands from the `apps/backend/` directory with the virtual environment active.

```bash
# Apply all pending migrations (bring schema to latest)
alembic upgrade head

# Roll back the most recent migration
alembic downgrade -1

# Roll back to a specific revision
alembic downgrade <revision_id>

# Show current applied revision
alembic current

# Show migration history
alembic history --verbose

# Auto-generate a new migration from ORM model changes
alembic revision --autogenerate -m "describe your change here"

# Create a blank migration file (for manual SQL)
alembic revision -m "describe your change here"
```

After running `alembic revision --autogenerate`, always review the generated file in `src/db/migrations/versions/` before applying it. Alembic does not detect all changes automatically (e.g., check constraints, certain index types).
