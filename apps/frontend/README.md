# Emotion Classification Frontend

Next.js 14 frontend for the Emotion Classification application.

## Prerequisites

- Node.js 18+
- npm 9+

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set the appropriate API URLs if your backend runs on a different address.

3. Start the development server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

## Docker

Build and run with Docker:

```bash
docker build -t emotion-frontend .
docker run -p 3000:3000 --env-file .env.local emotion-frontend
```

## Project Structure

```
src/
  app/          # Next.js App Router pages and layouts
  components/   # Reusable React components
  styles/       # Global CSS styles
```
