# Reverse Video Challenge — deployment guide

This folder contains:
- `public/index.html` — the quiz app (frontend)
- `server.js` — a small Express server that serves the frontend AND proxies
  scoring requests to the Anthropic API, so your API key stays on the server
  and never touches the browser (avoids the CORS error you hit earlier).
- `package.json` — dependencies

## Run it locally

```
npm install
ANTHROPIC_API_KEY=sk-ant-your-key-here node server.js
```

(On Windows PowerShell, set the env var first: `$env:ANTHROPIC_API_KEY="sk-ant-..."` then run `node server.js`.)

Then open `http://localhost:3000` in your browser.

## Deploy to Render

1. Push this folder to a GitHub repo (or use Render's manual upload if you're
   not using GitHub).
2. In Render, create a **New Web Service** and point it at the repo.
3. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. In the service's **Environment** tab, add an environment variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your actual Anthropic API key (get one at console.anthropic.com)
5. Deploy. Render will give you a public URL like `https://your-app.onrender.com`
   — open that instead of any local file, and both video embedding and AI
   scoring will work correctly since it's now a real HTTPS origin.

## Notes

- The frontend never sees or sends the API key — it only calls `/api/score`
  on your own server, which is what makes this different from the earlier
  direct-fetch approach.
- If the Anthropic call ever fails (bad key, rate limit, network issue), the
  app automatically falls back to simple keyword-overlap scoring instead of
  breaking the round.
- To change the model used for scoring, set an optional `ANTHROPIC_MODEL`
  environment variable (defaults to `claude-sonnet-5`).
