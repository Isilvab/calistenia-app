# Calistenia App

Tracker de entrenamientos de calistenia. Persistencia local (localStorage) en v1; Supabase en v2.

## Stack

- Vite + React + TypeScript
- React Router
- Tailwind CSS

## Local

```bash
npm install
cp .env.example .env   # completar vars si se usan
npm run dev
```

## Build

```bash
npm run build
# output → dist/
```

## Variables de entorno

Copiar `.env.example` → `.env` y completar los valores. Ver comentarios en el archivo para instrucciones por bloque.

## Deploy

Netlify — configuración en `netlify.toml`. El redirect `/*` → `/index.html` es necesario para React Router.
