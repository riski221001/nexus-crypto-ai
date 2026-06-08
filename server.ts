import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Sentiment Analysis API
app.post("/api/sentiment", async (req, res) => {
  try {
    const { assets } = req.body;
    if (!assets || !Array.isArray(assets)) {
      return res.status(400).json({ error: "Invalid assets list" });
    }

    const prompt = `Perform a sentiment analysis for the following crypto assets: ${assets.join(", ")}. 
    Search the web for the most recent news, market developments, and social sentiments for each asset today (May 2026).
    Return a JSON object where keys are asset symbols and values are objects with:
    - 'sentiment': a score from -1 (very bearish) to 1 (very bullish)
    - 'mood': 'BULLISH', 'BEARISH', or 'NEUTRAL'
    - 'summary': a short summary of the latest web findings (max 20 words).`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    res.status(500).json({ error: "Failed to analyze sentiment" });
  }
});

// Mock Market Data Proxy (In a real app, this would hit CoinGecko/Binance etc.)
app.get("/api/market-data", (req, res) => {
  const assets = ["BTC", "ETH", "SOL", "BNB", "XRP"];
  const data = assets.map(symbol => ({
    symbol,
    price: Math.random() * (symbol === "BTC" ? 60000 : 3000),
    change24h: (Math.random() - 0.5) * 5,
    volume: Math.random() * 1000000000,
  }));
  res.json(data);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
