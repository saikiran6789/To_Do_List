# To‑Do — Minimal & Fast (Vanilla JS)

A lightweight, offline‑first To‑Do app with localStorage persistence, drag‑and‑drop reordering, due dates, filters, and JSON import/export.

## Features
- Add, edit, duplicate, delete tasks
- Mark complete / filter (All, Active, Completed, Due Today)
- Search by title
- Due dates with **Overdue** / **Today** badges
- Drag & drop reordering
- Persists in `localStorage`
- Export/Import tasks as JSON
- No frameworks, deploy anywhere as static files

## Run locally
Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000

## Deploy (get a shareable URL in ~1 minute)
- **Netlify**: Drag‑and‑drop this folder at app.netlify.com → you’ll get a URL.
- **Vercel**: `vercel deploy` (or import the repo/folder) → instant URL.
- **GitHub Pages**: Push to a repo → Settings → Pages → set branch to `main` and root.

That's it!
