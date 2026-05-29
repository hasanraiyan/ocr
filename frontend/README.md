# DocuSense Frontend

Next.js 16 frontend for the DocuSense AI document extraction platform.

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4**
- **shadcn/ui** — UI components
- **Lucide React** — icons
- **Sonner** — toast notifications

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

The frontend expects the backend running at `http://localhost:8000`. Configure in `src/lib/api.js` if your backend runs elsewhere.

## Key Components

| File | Purpose |
|---|---|
| `src/app/page.js` | Main dashboard — upload, history sidebar, status polling |
| `src/components/DocPreviewOverlay.js` | Document preview (PDF embed or image) |
| `src/components/ResultsViewer.js` | Extracted JSON cards with confidence scores and copy/export |
| `src/lib/api.js` | API client — upload, poll result, list history |

## Build

```bash
npm run build
npm start
```
