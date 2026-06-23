# Aegis

A small web dashboard that ranks KOSPI and NASDAQ stocks by momentum and wraps each call with a risk read, an entry-timing hint, and a short AI-written note. The web app lives in this repo. The model and the nightly pipeline that feeds it run somewhere else (privately) and just publish their results back here.

Deployed on Vercel.

## What it does

After the markets settle, a batch job scores the whole universe overnight and dumps a pile of JSON that this frontend reads. For each stock you get:

- **Buy / Wait / Sell** — where the stock sits in its own market's momentum ranking (top third, middle, bottom third). It's a *relative* standing, not a promise that the price goes up tomorrow.
- **Momentum score (0–100)** — the same idea as a number.
- **Risk grade** — how much the stock is likely to swing over the next few weeks.
- **Entry timing** — a rough "is this an okay moment" hint.
- **AI briefing** — a couple of sentences from a local LLM that ties the above together in plain language.

There's also a paper-trading "AI auto-trade" account you can watch live, and you can scroll back through earlier days to see how a stock was read at the time.

## The honest part

I set out to make a deep model *predict direction* — will this stock beat the market or not. I threw a lot at it: survival/hazard targets, cross-sectional return regression, a three-class setup classifier, barrier and horizon sweeps.

It didn't work. Out of sample, the fancy model never beat plain momentum at calling direction — a dumb gradient-boosted tree landed on the exact same ~0.55 AUC. That told me the ceiling wasn't the model, it was the inputs. Everything I was feeding it came from price (OHLCV and technical indicators), and you can't squeeze real direction edge out of that beyond what momentum already gives you. (This matches the literature — Gu, Kelly & Xiu found the actual signal lives in non-price characteristics.)

So I stopped pretending. **Direction comes from a momentum factor.** The deep model earns its keep where it's genuinely good: predicting *volatility / risk* (that part holds up, ~0.78 AUC out of sample) and drawing the forecast chart. The LLM just explains things in human words.

If I ever want real direction edge, the next step is non-price data — foreign and institutional flows, fundamentals — not a bigger network. That's a known to-do, not a solved problem.

## How it flows

```
   nightly batch  (private repo, runs on a free cloud GPU)
        │
        │   price + indicators ┐
        │   macro news → LLM ───┤→  model  →  momentum signal
        │                        │            risk grade
        │                        │            entry timing
        │                        │            forecast chart
        │                        └─────────→  LLM briefing
        │
        └→  writes JSON  →  pushes to this repo  →  Vercel rebuilds the site
```

The model code and weights stay in a separate private repo. This one only holds the web app and the data it publishes.

## Running the frontend

```bash
cd aegis-app
npm install
npm run dev
```

It's a Vite + React app. The two serverless functions under `aegis-app/api` proxy live quotes for the auto-trade page.

## Heads up

Everything here — the signals, the briefings, the paper account — is information, not advice. It is not a recommendation to buy or sell anything. Past patterns don't promise future returns, and the AI text can be wrong. If you act on any of it, that's on you.
