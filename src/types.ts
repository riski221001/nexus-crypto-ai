export type BotType = "STRATEGY" | "ARBITRAGE" | "WEB3" | "AI";

export interface BotInstance {
  id: string;
  name: string;
  type: BotType;
  status: "ACTIVE" | "INACTIVE" | "ERROR";
  profit: number;
  runtime: string;
  config: Record<string, any>;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
}

export interface SentimentData {
  sentiment: number;
  mood: "BULLISH" | "BEARISH" | "NEUTRAL";
  summary: string;
}
