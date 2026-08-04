
import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  BarChart3, 
  Cpu, 
  Layers, 
  Activity, 
  Settings, 
  Power, 
  Terminal as TerminalIcon, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Brain,
  Globe,
  Target,
  Users,
  Wallet,
  Coins,
  Eye,
  RefreshCw,
  Play,
  Square,
  Trash2,
  Copy,
  Plus,
  ChevronRight,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  YAxis, 
  XAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid
} from "recharts";
import { cn, formatCurrency, formatCompactNumber } from "./lib/utils";
import { BotInstance, MarketData, SentimentData } from "./types";

const TABS = [
  { id: "overview", label: "Dashboard", category: "Trading Engine", icon: BarChart3 },
  { id: "strategy", label: "Grid & DCA", category: "Trading Engine", icon: Layers },
  { id: "momentum", label: "Momentum/Trend", category: "Trading Engine", icon: TrendingUp },
  { id: "arbitrage", label: "CEX/DEX Arbitrage", category: "Trading Engine", icon: Globe },
  { id: "flashloan", label: "Flash Loan (PRO)", category: "Web3 Specialized", icon: Zap },
  { id: "sniper", label: "Sniper (Launch/NFT) (PRO)", category: "Web3 Specialized", icon: Target },
  { id: "ai", label: "Sentiment AI", category: "AI & Analysis", icon: Brain },
  { id: "copytrade", label: "Copy Trading", category: "AI & Analysis", icon: Users },
];

interface LiveTrade {
  time: string;
  botName: string;
  type: "BUY" | "SELL" | "ARBITRAGE" | "SNIPE" | "LIQUIDATE";
  asset: string;
  price: number;
  amount: number;
  profit: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [logs, setLogs] = useState<{msg: string, time: string, type: 'info'|'warn'|'success'}[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 1. Core Wallet & Portfolio Simulator State
  const [balance, setBalance] = useState<Record<string, number>>({
    USD: 100000.00,
    BTC: 0.15,
    ETH: 2.50,
    SOL: 25.00,
    BNB: 5.00,
    DOGE: 2500.00,
    XRP: 1000.00,
  });

  const [marketData, setMarketData] = useState<MarketData[]>([
    { symbol: "BTC", price: 63250.00, change24h: 1.45, volume: 28400000000 },
    { symbol: "ETH", price: 3120.50, change24h: -0.85, volume: 15200000000 },
    { symbol: "SOL", price: 145.20, change24h: 4.82, volume: 3800000000 },
    { symbol: "BNB", price: 580.40, change24h: 0.32, volume: 1200000000 },
    { symbol: "DOGE", price: 0.142, change24h: 12.45, volume: 950000000 },
    { symbol: "XRP", price: 0.525, change24h: -2.10, volume: 850000000 },
  ]);

  // Historical price tracking for technical charts (BTC focus by default)
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({
    BTC: Array.from({ length: 30 }, () => 62000 + Math.random() * 2500),
    ETH: Array.from({ length: 30 }, () => 3050 + Math.random() * 150),
    SOL: Array.from({ length: 30 }, () => 135 + Math.random() * 15),
    DOGE: Array.from({ length: 30 }, () => 0.12 + Math.random() * 0.03),
  });

  // 2. Active Bot Control States
  const [botsState, setBotsState] = useState<Record<string, {
    active: boolean;
    config: Record<string, any>;
    profit24h: number;
    tradesCount: number;
  }>>({
    "grid-1": { active: true, config: { lowerPrice: 60000, upperPrice: 65000, grids: 10, trailingDeviation: 1.5, priceActionConfirm: true }, profit24h: 8.4, tradesCount: 42 },
    "dca-1": { active: false, config: { intervalTicks: 5, buyAmountUSD: 200, asset: "ETH", stepScaleMultiplier: 1.2 }, profit24h: 12.1, tradesCount: 8 },
    "momentum-1": { active: false, config: { indicator: "RSI", rsiBuy: 35, rsiSell: 65, asset: "SOL" }, profit24h: 0.0, tradesCount: 0 },
    "arb-tri": { active: true, config: { minSpread: 0.15 }, profit24h: 4.2, tradesCount: 84 },
    "arb-cross": { active: false, config: { spreadThreshold: 0.4 }, profit24h: 15.6, tradesCount: 12 },
    "mev-sandwich": { active: false, config: { maxSlippage: 10, minGasPrice: 40 }, profit24h: 24.8, tradesCount: 5 },
    "mev-liq": { active: true, config: { healthThreshold: 1.00 }, profit24h: 6.2, tradesCount: 19 },
    "sniper-launch": { active: false, config: { buyAmountSOL: 1, minLiquidity: 10000, autoSellMultiplier: 2.0 }, profit24h: 0, tradesCount: 0 },
    "sniper-nft": { active: false, config: { maxPriceETH: 0.5, floorFloorTarget: 0.8 }, profit24h: 0, tradesCount: 0 },
  });

  const [simulatedTrades, setSimulatedTrades] = useState<LiveTrade[]>([]);
  const [totalProfitLoss, setTotalProfitLoss] = useState(0);

  // 3. Technical Chart Helpers
  const [selectedMomentumAsset, setSelectedMomentumAsset] = useState("BTC");

  // 4. Web3 Flash Loan State
  const [flashLoanAmount, setFlashLoanAmount] = useState(50000);
  const [flashLoanAsset, setFlashLoanAsset] = useState("USDT");
  const [flashLoanState, setFlashLoanState] = useState<"idle"|"borrowing"|"scanning"|"swap1"|"swap2"|"repaying"|"completed">("idle");
  const [flashLoanLogs, setFlashLoanLogs] = useState<string[]>([]);

  // 5. Launch Sniper & NFT Sniper State
  const [sniperAutoSnipe, setSniperAutoSnipe] = useState(false);
  const [sniperMempool, setSniperMempool] = useState<{ id: string, name: string, symbol: string, liquidity: number, priceUSD: number, slip: number, status: 'pending'|'sniped'|'rugged' }[]>([]);
  const [snipedTokens, setSnipedTokens] = useState<{ id: string, name: string, symbol: string, buyPrice: number, currentPrice: number, amount: number, isSold: boolean, profit: number }[]>([]);
  const [nftListings, setNftListings] = useState<{ id: string, collection: string, token: string, priceETH: number, floorETH: number, sniped: boolean }[]>([]);
  const [snipedNfts, setSnipedNfts] = useState<{ id: string, collection: string, token: string, buyPrice: number, floorETH: number }[]>([]);

  // 6. Copy Trading State
  const [copyTradedWhales, setCopyTradedWhales] = useState<Record<string, { active: boolean, size: number }>>({
    "whale-vc": { active: false, size: 500 },
    "whale-meme": { active: false, size: 200 },
  });
  const [whaleTransactions, setWhaleTransactions] = useState<{ id: string, whaleName: string, action: 'BUY'|'SELL', asset: string, amount: number, valUSD: number, time: string }[]>([]);

  // Helper log utility
  const addLog = useCallback((msg: string, type: 'info'|'warn'|'success' = 'info') => {
    setLogs(prev => [{ msg, time: new Date().toLocaleTimeString(), type }, ...prev].slice(0, 50));
  }, []);

  // TICK-BY-TICK SIMULATION ENGINE (Runs every 3.5 seconds)
  useEffect(() => {
    addLog("System initialized. Version 2.0.26", "info");
    addLog("Connecting to DEX aggregation nodes...", "info");
    addLog("Flashbot RPC connection secured.", "success");
    addLog("Real-time Trading Sandbox active.", "success");

    const tickInterval = setInterval(() => {
      // 1. Update Market Prices (Random Walk)
      setMarketData(prevData => {
        const nextData = prevData.map(asset => {
          const pct = (Math.random() - 0.49) * 1.8; // slightly bullish walk
          const newPrice = Math.max(0.001, asset.price * (1 + pct / 100));
          const change24 = asset.change24h + (Math.random() - 0.5) * 0.5;
          return {
            ...asset,
            price: newPrice,
            change24h: parseFloat(change24.toFixed(2)),
            volume: asset.volume * (1 + (Math.random() - 0.5) * 0.05)
          };
        });

        // Update Price Histories
        setPriceHistory(prevHistory => {
          const nextHistory = { ...prevHistory };
          nextData.forEach(asset => {
            if (nextHistory[asset.symbol]) {
              const hist = [...nextHistory[asset.symbol], asset.price].slice(-30);
              nextHistory[asset.symbol] = hist;
            }
          });
          return nextHistory;
        });

        // 2. RUN ACTIVE TRADING BOT RULES
        // We read nextData prices inside this scope to have fresh prices
        const priceMap = nextData.reduce((acc, curr) => ({ ...acc, [curr.symbol]: curr.price }), {} as Record<string, number>);

        // A. Grid Trading Bot Simulation
        if (botsState["grid-1"].active) {
          const btcPrice = priceMap["BTC"];
          const gridConfig = botsState["grid-1"].config;
          // Trigger a grid trade if price fluctuations hit threshold (simulated execution)
          if (Math.random() > 0.6) {
            const isBuy = Math.random() > 0.5;
            const amount = 0.005;
            const tradeVal = btcPrice * amount;

            if (isBuy && balance.USD >= tradeVal) {
              setBalance(b => ({ ...b, USD: b.USD - tradeVal, BTC: b.BTC + amount }));
              const profit = parseFloat((Math.random() * 15).toFixed(2));
              setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: "Sideways Grid", type: "BUY", asset: "BTC", price: btcPrice, amount, profit }, ...t]);
              addLog(`[Grid Bot] Buy order filled: ${amount} BTC at ${formatCurrency(btcPrice)}`, "success");
              setTotalProfitLoss(p => p + profit);
              setBotsState(s => ({
                ...s,
                "grid-1": { ...s["grid-1"], profit24h: s["grid-1"].profit24h + 0.15, tradesCount: s["grid-1"].tradesCount + 1 }
              }));
            } else if (!isBuy && balance.BTC >= amount) {
              setBalance(b => ({ ...b, USD: b.USD + tradeVal, BTC: b.BTC - amount }));
              const profit = parseFloat((Math.random() * 35).toFixed(2));
              setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: "Sideways Grid", type: "SELL", asset: "BTC", price: btcPrice, amount, profit }, ...t]);
              addLog(`[Grid Bot] Sell order filled: ${amount} BTC at ${formatCurrency(btcPrice)}`, "success");
              setTotalProfitLoss(p => p + profit);
              setBotsState(s => ({
                ...s,
                "grid-1": { ...s["grid-1"], profit24h: s["grid-1"].profit24h + 0.25, tradesCount: s["grid-1"].tradesCount + 1 }
              }));
            }
          }
        }

        // B. DCA Accumulator Simulation
        if (botsState["dca-1"].active) {
          const dcaConfig = botsState["dca-1"].config;
          const targetAsset = dcaConfig.asset;
          const targetPrice = priceMap[targetAsset];
          const buyAmount = dcaConfig.buyAmountUSD;

          // Buy every 5th tick
          setBotsState(s => {
            const currentTrades = s["dca-1"].tradesCount;
            if (currentTrades % dcaConfig.intervalTicks === 0 && balance.USD >= buyAmount) {
              const amount = buyAmount / targetPrice;
              setBalance(b => ({ ...b, USD: b.USD - buyAmount, [targetAsset]: (b[targetAsset] || 0) + amount }));
              setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: "Dip Hunter DCA", type: "BUY", asset: targetAsset, price: targetPrice, amount, profit: 0 }, ...t]);
              addLog(`[DCA Bot] Periodic Accumulation: ${amount.toFixed(4)} ${targetAsset} for $${buyAmount}`, "info");
              return {
                ...s,
                "dca-1": { ...s["dca-1"], tradesCount: currentTrades + 1 }
              };
            }
            return {
              ...s,
              "dca-1": { ...s["dca-1"], tradesCount: currentTrades + 1 }
            };
          });
        }

        // C. Technical Momentum/Trend Bot Simulation
        if (botsState["momentum-1"].active) {
          const momConfig = botsState["momentum-1"].config;
          const asset = momConfig.asset;
          const price = priceMap[asset];
          const hist = priceHistory[asset] || [];

          if (hist.length >= 10) {
            // Simple RSI estimation based on history
            let gains = 0, losses = 0;
            for (let i = hist.length - 10; i < hist.length; i++) {
              const diff = hist[i] - hist[i - 1];
              if (diff > 0) gains += diff;
              else losses -= diff;
            }
            const rs = gains / (losses || 1);
            const rsiVal = 100 - (100 / (1 + rs));

            if (rsiVal < momConfig.rsiBuy && balance.USD >= 1000) {
              // Buy signal
              const amount = 1000 / price;
              setBalance(b => ({ ...b, USD: b.USD - 1000, [asset]: (b[asset] || 0) + amount }));
              setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: "Trend Following", type: "BUY", asset, price, amount, profit: 0 }, ...t]);
              addLog(`[Momentum Bot] RSI Oversold Alert (${Math.round(rsiVal)}). Trigger BUY 1000 USD of ${asset}`, "success");
              setBotsState(s => ({
                ...s,
                "momentum-1": { ...s["momentum-1"], tradesCount: s["momentum-1"].tradesCount + 1 }
              }));
            } else if (rsiVal > momConfig.rsiSell && (balance[asset] || 0) > 0.5) {
              // Sell signal
              const sellAmount = (balance[asset] || 0) * 0.5;
              const returnUSD = sellAmount * price;
              setBalance(b => ({ ...b, USD: b.USD + returnUSD, [asset]: (b[asset] || 0) - sellAmount }));
              const profit = parseFloat((returnUSD * 0.05).toFixed(2));
              setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: "Trend Following", type: "SELL", asset, price, amount: sellAmount, profit }, ...t]);
              addLog(`[Momentum Bot] RSI Overbought Alert (${Math.round(rsiVal)}). Trigger SELL ${sellAmount.toFixed(2)} ${asset}`, "warn");
              setTotalProfitLoss(p => p + profit);
              setBotsState(s => ({
                ...s,
                "momentum-1": { ...s["momentum-1"], profit24h: s["momentum-1"].profit24h + 1.2, tradesCount: s["momentum-1"].tradesCount + 1 }
              }));
            }
          }
        }

        // D. Triangular Arbitrage Simulation
        if (botsState["arb-tri"].active) {
          if (Math.random() > 0.75) {
            // Synthetic BTC-ETH triangular arb opportunity on Binance
            const btcPrice = priceMap["BTC"];
            const ethPrice = priceMap["ETH"];
            const ethBtcSynthetic = ethPrice / btcPrice;
            const ethBtcActual = ethBtcSynthetic * (1 + (Math.random() - 0.5) * 0.008);
            const spread = Math.abs(ethBtcSynthetic - ethBtcActual) / ethBtcSynthetic * 100;

            if (spread > botsState["arb-tri"].config.minSpread) {
              const arbProfit = parseFloat((Math.random() * 45 + 10).toFixed(2));
              setBalance(b => ({ ...b, USD: b.USD + arbProfit }));
              setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: "Triangular CEX", type: "ARBITRAGE", asset: "BTC-ETH-USDT", price: ethPrice, amount: 1.5, profit: arbProfit }, ...t]);
              addLog(`[Triangular Bot] Executed BTC ➔ ETH ➔ USDT cycle. Captured spread: ${spread.toFixed(2)}%. Net Profit: +$${arbProfit}`, "success");
              setTotalProfitLoss(p => p + arbProfit);
              setBotsState(s => ({
                ...s,
                "arb-tri": { ...s["arb-tri"], profit24h: s["arb-tri"].profit24h + 0.8, tradesCount: s["arb-tri"].tradesCount + 1 }
              }));
            }
          }
        }

        // E. Liquidator Bot Simulation (Lending protocol monitor)
        if (botsState["mev-liq"].active) {
          if (Math.random() > 0.90) {
            const liqBonus = parseFloat((Math.random() * 120 + 30).toFixed(2));
            setBalance(b => ({ ...b, USD: b.USD + liqBonus }));
            setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: "Aave Liquidator", type: "LIQUIDATE", asset: "USDC-WETH", price: priceMap["ETH"], amount: 12.5, profit: liqBonus }, ...t]);
            addLog(`[Liquidator Bot] Health Factor < 1.00 on 0xbf3... liquidating. Captured 5% collateral bonus: +$${liqBonus}`, "success");
            setTotalProfitLoss(p => p + liqBonus);
            setBotsState(s => ({
              ...s,
              "mev-liq": { ...s["mev-liq"], profit24h: s["mev-liq"].profit24h + 0.45, tradesCount: s["mev-liq"].tradesCount + 1 }
            }));
          }
        }

        return nextData;
      });

      // 3. LAUNCH SNIPER MEMPOOL STREAM SIMULATION
      setSniperMempool(prevMempool => {
        // Randomly "rug pull" existing pending tokens in mempool, or pump them
        let nextMempool = prevMempool.map(tok => {
          if (tok.status === 'pending' && Math.random() > 0.85) {
            addLog(`[Mempool Sniper] 🚨 Security Alert: Token $${tok.symbol} Rug Pulled (-99%)!`, "warn");
            return { ...tok, status: 'rugged' as const, priceUSD: tok.priceUSD * 0.01 };
          }
          return tok;
        });

        // Add a brand new launch every 3rd tick
        if (Math.random() > 0.65) {
          const names = [
            { name: "Nexus Coin", symbol: "NEXUS" },
            { name: "Gemini AI", symbol: "GEMINI" },
            { name: "Pump Terminal", symbol: "PUMP" },
            { name: "Solana 10x Moon", symbol: "SOL10X" },
            { name: "DeFi Hyper Liquidity", symbol: "HYPER" }
          ];
          const chosen = names[Math.floor(Math.random() * names.length)];
          const coinSymbol = `${chosen.symbol}_${Math.floor(Math.random() * 900 + 100)}`;
          const liq = Math.floor(Math.random() * 35000 + 2000);
          const launchPrice = Math.random() * 0.05 + 0.001;

          const newLaunch = {
            id: Math.random().toString(),
            name: `${chosen.name} ${coinSymbol.split("_")[1]}`,
            symbol: coinSymbol,
            liquidity: liq,
            priceUSD: launchPrice,
            slip: Math.random() * 8,
            status: 'pending' as 'pending' | 'sniped' | 'rugged'
          };

          nextMempool = [newLaunch, ...nextMempool].slice(0, 10);
          addLog(`[Launch Streamer] New liquidity added to ${newLaunch.symbol} pool on DEX. Liquidity: $${liq}`, "info");

          // Auto-Snipe trigger!
          if (botsState["sniper-launch"].active && sniperAutoSnipe && liq >= botsState["sniper-launch"].config.minLiquidity) {
            const solPrice = 145.2; // approx SOL price
            const sniperSolAmount = botsState["sniper-launch"].config.buyAmountSOL;
            const costUSD = sniperSolAmount * solPrice;

            if (balance.USD >= costUSD) {
              setBalance(b => ({ ...b, USD: b.USD - costUSD }));
              const buyAmountTokens = costUSD / launchPrice;
              
              setSnipedTokens(prev => [{
                id: newLaunch.id,
                name: newLaunch.name,
                symbol: newLaunch.symbol,
                buyPrice: launchPrice,
                currentPrice: launchPrice,
                amount: buyAmountTokens,
                isSold: false,
                profit: 0
              }, ...prev]);

              newLaunch.status = 'sniped';
              addLog(`[Sniper Bot] 🎯 SNIPE SUCCESSFUL! Swapped ${sniperSolAmount} SOL for ${formatCompactNumber(buyAmountTokens)} $${newLaunch.symbol}. Tx: 0x${Math.random().toString(16).slice(2, 10)}...`, "success");
              setBotsState(s => ({
                ...s,
                "sniper-launch": { ...s["sniper-launch"], tradesCount: s["sniper-launch"].tradesCount + 1 }
              }));
            }
          }
        }
        return nextMempool;
      });

      // Update current prices of sniped active tokens (simulating volatile pump/dump)
      setSnipedTokens(prev => {
        return prev.map(tok => {
          if (tok.isSold) return tok;
          const roll = Math.random();
          let nextPrice = tok.currentPrice;
          
          if (roll > 0.85) {
            // Rugged!
            nextPrice = tok.buyPrice * 0.02;
            addLog(`[Sniper Warning] $${tok.symbol} rugged! Current price crashed -98%`, "warn");
          } else if (roll > 0.4) {
            // Pump!
            nextPrice = tok.currentPrice * (1 + Math.random() * 0.8);
          } else {
            // Dip
            nextPrice = tok.currentPrice * (1 - Math.random() * 0.3);
          }

          const currentVal = tok.amount * nextPrice;
          const costVal = tok.amount * tok.buyPrice;
          const profit = currentVal - costVal;

          return {
            ...tok,
            currentPrice: nextPrice,
            profit: parseFloat(profit.toFixed(2))
          };
        });
      });

      // 4. NFT LISTINGS STREAM
      setNftListings(prev => {
        // Add random listed NFT
        if (Math.random() > 0.70) {
          const collections = ["Nexus Punks", "Bored AI Apes", "Solana Shards"];
          const col = collections[Math.floor(Math.random() * collections.length)];
          const floor = col === "Nexus Punks" ? 0.8 : col === "Bored AI Apes" ? 1.4 : 0.25;
          // Random chance of listing below floor
          const listPrice = Math.random() > 0.75 ? floor * 0.6 : floor * (1 + Math.random() * 0.35);

          const listing = {
            id: Math.random().toString(),
            collection: col,
            token: `#${Math.floor(Math.random() * 9999)}`,
            priceETH: parseFloat(listPrice.toFixed(3)),
            floorETH: floor,
            sniped: false
          };

          const next = [listing, ...prev].slice(0, 10);
          addLog(`[NFT Feed] ${listing.collection} ${listing.token} listed for ${listing.priceETH} ETH`, "info");

          // NFT Auto-Snipe trigger
          if (botsState["sniper-nft"].active && listPrice <= botsState["sniper-nft"].config.maxPriceETH && balance.ETH >= listPrice) {
            setBalance(b => ({ ...b, ETH: b.ETH - listPrice }));
            listing.sniped = true;
            setSnipedNfts(sn => [...sn, { id: listing.id, collection: listing.collection, token: listing.token, buyPrice: listPrice, floorETH: floor }]);
            addLog(`[NFT Sniper] 🎨 SNIPED NFT! Bought ${listing.collection} ${listing.token} for ${listPrice} ETH. Est Profit: +${(floor - listPrice).toFixed(3)} ETH`, "success");
            setBotsState(s => ({
              ...s,
              "sniper-nft": { ...s["sniper-nft"], tradesCount: s["sniper-nft"].tradesCount + 1 }
            }));
          }

          return next;
        }
        return prev;
      });

      // 5. COPY TRADING WHALE TRANSACTIONS STREAM
      if (Math.random() > 0.7) {
        const whales = [
          { name: "Smart Money VC (0x71C...a291)", id: "whale-vc" },
          { name: "Meme Hunter SOL (0x3da...6e9f)", id: "whale-meme" }
        ];
        const chosenWhale = whales[Math.floor(Math.random() * whales.length)];
        const assetsList = ["BTC", "ETH", "SOL", "DOGE"];
        const tradeAsset = assetsList[Math.floor(Math.random() * assetsList.length)];
        const isBuy = Math.random() > 0.35;
        const amount = tradeAsset === "BTC" ? parseFloat((Math.random() * 2 + 0.1).toFixed(3)) : parseFloat((Math.random() * 40 + 5).toFixed(2));
        
        // Approximate valuation
        const mockPrice = tradeAsset === "BTC" ? 63000 : tradeAsset === "ETH" ? 3100 : tradeAsset === "SOL" ? 145 : 0.14;
        const valUSD = amount * mockPrice;

        const newWhaleTx = {
          id: Math.random().toString(),
          whaleName: chosenWhale.name,
          action: isBuy ? 'BUY' as const : 'SELL' as const,
          asset: tradeAsset,
          amount,
          valUSD: parseFloat(valUSD.toFixed(2)),
          time: new Date().toLocaleTimeString()
        };

        setWhaleTransactions(prev => [newWhaleTx, ...prev].slice(0, 15));
        addLog(`[Whale Watcher] ${chosenWhale.name} submitted transaction: ${newWhaleTx.action} ${amount} ${tradeAsset} ($${formatCompactNumber(valUSD)})`, "info");

        // Execute Copy Trading Replications
        const copyConfig = copyTradedWhales[chosenWhale.id];
        if (copyConfig && copyConfig.active) {
          const allocationUSD = copyConfig.size;
          const buyAmt = allocationUSD / mockPrice;

          if (isBuy && balance.USD >= allocationUSD) {
            setBalance(b => ({ ...b, USD: b.USD - allocationUSD, [tradeAsset]: (b[tradeAsset] || 0) + buyAmt }));
            setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: `CopyTrade (${chosenWhale.name.split(" ")[0]})`, type: "BUY", asset: tradeAsset, price: mockPrice, amount: buyAmt, profit: 0 }, ...t]);
            addLog(`[CopyTrade Engine] 👥 Replicating Whale BUY: Allocation $${allocationUSD} ➔ Bought ${buyAmt.toFixed(4)} ${tradeAsset}`, "success");
          } else if (!isBuy && (balance[tradeAsset] || 0) >= buyAmt) {
            const returnAmt = buyAmt * mockPrice;
            setBalance(b => ({ ...b, USD: b.USD + returnAmt, [tradeAsset]: (b[tradeAsset] || 0) - buyAmt }));
            setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: `CopyTrade (${chosenWhale.name.split(" ")[0]})`, type: "SELL", asset: tradeAsset, price: mockPrice, amount: buyAmt, profit: 0 }, ...t]);
            addLog(`[CopyTrade Engine] 👥 Replicating Whale SELL: Liquefied ${buyAmt.toFixed(4)} ${tradeAsset} ➔ Recieved $${formatCurrency(returnAmt)}`, "warn");
          }
        }
      }

    }, 3500);

    return () => clearInterval(tickInterval);
  }, [balance, botsState, sniperAutoSnipe, copyTradedWhales, priceHistory, addLog]);

  // Execute Dynamic Frontend Sell Trigger for Sniped Tokens
  const sellSnipedToken = (id: string) => {
    const token = snipedTokens.find(t => t.id === id);
    if (!token || token.isSold) return;

    const payoutUSD = token.amount * token.currentPrice;
    setBalance(b => ({ ...b, USD: b.USD + payoutUSD }));
    setSnipedTokens(prev => prev.map(t => t.id === id ? { ...t, isSold: true } : t));
    
    const profit = payoutUSD - (token.amount * token.buyPrice);
    setTotalProfitLoss(p => p + profit);
    addLog(`[Sniper Manual] Liquidated $${token.symbol} positions. Yield: ${formatCurrency(payoutUSD)}. Realized Profit: ${formatCurrency(profit)}`, profit >= 0 ? "success" : "warn");
  };

  // Run Flash Loan Simulation Routine
  const runFlashLoan = async () => {
    if (flashLoanState !== "idle") return;
    setFlashLoanState("borrowing");
    setFlashLoanLogs(["🚀 Initiating automated single-block Flash Loan contract pipeline..."]);
    
    await new Promise(r => setTimeout(r, 1000));
    setFlashLoanState("scanning");
    setFlashLoanLogs(prev => [...prev, `💸 Step 1: Borrowing ${formatCurrency(flashLoanAmount)} ${flashLoanAsset} from Aave V3 Liquidity Pool without collateral.`]);
    setFlashLoanLogs(prev => [...prev, `🔍 Step 2: Querying DEX pools for price inefficiencies...`]);

    await new Promise(r => setTimeout(r, 1200));
    setFlashLoanState("swap1");
    const intermediary = flashLoanAsset === "USDT" ? "DAI" : "USDT";
    setFlashLoanLogs(prev => [...prev, `♻️ Step 3: Spread Found! Swapping ${formatCurrency(flashLoanAmount)} ${flashLoanAsset} on Uniswap V3 for ${intermediary}. Rate: 1.0024`]);

    await new Promise(r => setTimeout(r, 1000));
    setFlashLoanState("swap2");
    const returnAmt = flashLoanAmount * 1.0062;
    setFlashLoanLogs(prev => [...prev, `♻️ Step 4: Swapping intermediary ${intermediary} back to ${flashLoanAsset} on Curve Optimizer. Captured spread: +$${(flashLoanAmount * 0.0062).toFixed(2)}.`]);

    await new Promise(r => setTimeout(r, 1100));
    setFlashLoanState("repaying");
    const fee = flashLoanAmount * 0.0009; // Aave 0.09% fee
    const repayAmt = flashLoanAmount + fee;
    const netProfit = returnAmt - repayAmt;
    setFlashLoanLogs(prev => [...prev, `🏦 Step 5: Repaying Aave V3. Principal: ${formatCurrency(flashLoanAmount)} + Fee: ${formatCurrency(fee)} ${flashLoanAsset}. Total repayment: ${formatCurrency(repayAmt)}`]);

    await new Promise(r => setTimeout(r, 900));
    setFlashLoanState("completed");
    setBalance(b => ({ ...b, [flashLoanAsset]: (b[flashLoanAsset] || 0) + netProfit }));
    setTotalProfitLoss(p => p + netProfit);
    setFlashLoanLogs(prev => [...prev, `🎉 Block transaction successfully finalized. Net Arbitrage Profit: +$${netProfit.toFixed(2)} ${flashLoanAsset} added to wallet.`]);
    addLog(`[Flash Loan Bot] Multi-hop contract execution succeeded! Net Profit: +$${netProfit.toFixed(2)} ${flashLoanAsset}. Gas: 55 Gwei`, "success");

    // Add to simulated trades
    setSimulatedTrades(t => [{ time: new Date().toLocaleTimeString(), botName: "Flash Loan Arbitrage", type: "ARBITRAGE", asset: flashLoanAsset, price: 1, amount: flashLoanAmount, profit: netProfit }, ...t]);

    await new Promise(r => setTimeout(r, 2000));
    setFlashLoanState("idle");
  };

  // Convert Balances to USD Valuation for Portfolio display
  const getPortfolioValuation = () => {
    const prices = marketData.reduce((acc, curr) => ({ ...acc, [curr.symbol]: curr.price }), {} as Record<string, number>);
    let totalVal = balance.USD;
    Object.entries(balance).forEach(([coin, qty]) => {
      const price = prices[coin];
      if (coin !== "USD" && price !== undefined) {
        totalVal += (qty as number) * price;
      }
    });
    return totalVal;
  };

  return (
    <div className="flex h-screen bg-[#0A0C10] text-slate-300 font-sans selection:bg-blue-500/30">
      
      {/* Sidebar Navigation */}
      <aside className={cn(
        "border-r border-slate-800 bg-[#0D1117] flex flex-col transition-all duration-300",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold transition-transform hover:rotate-12">
            Σ
          </div>
          {isSidebarOpen && (
            <span className="text-lg font-bold text-white tracking-tight">
              NEXUS<span className="text-blue-500">AI</span>
            </span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {["Trading Engine", "Web3 Specialized", "AI & Analysis"].map(category => (
            <React.Fragment key={category}>
              {isSidebarOpen && (
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold px-2 mb-2 mt-6">
                  {category}
                </div>
              )}
              {TABS.filter(t => t.category === category).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group relative",
                    activeTab === tab.id 
                      ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <tab.icon className={cn("w-4.5 h-4.5", activeTab === tab.id ? "text-blue-400" : "text-slate-600")} />
                  {isSidebarOpen && <span className="font-medium text-sm">{tab.label}</span>}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="tab-pill" 
                      className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full" 
                    />
                  )}
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Sidebar Wallet Profile */}
        {isSidebarOpen && (
          <div className="p-4 border-t border-slate-800 mt-auto">
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl cursor-help hover:bg-slate-800 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex-shrink-0 animate-pulse-slow"></div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate">0x71C...a291</div>
                <div className="text-[10px] text-emerald-400 font-bold">Simulated Sandbox</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-4 flex justify-center">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Upper Dashboard Metrics Header */}
        <header className="h-20 border-b border-slate-800 px-8 flex items-center justify-between bg-[#0A0C10]/50 backdrop-blur-xl z-20">
          <div className="flex gap-12">
            <div>
              <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1">Simulated Net Equity</div>
              <div className="text-xl font-bold text-white tabular-nums">
                {formatCurrency(getPortfolioValuation())}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1">Simulated Yield P&L</div>
              <div className={cn(
                "text-xl font-bold tabular-nums",
                totalProfitLoss >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {totalProfitLoss >= 0 ? "+" : ""}{formatCurrency(totalProfitLoss)}
              </div>
            </div>
            <div className="hidden md:block">
              <div className="text-[10px] uppercase text-slate-500 tracking-wider mb-1">Active Bots</div>
              <div className="text-xl font-bold text-white tabular-nums">
                {Object.values(botsState).filter((b: any) => b.active).length} <span className="text-xs font-normal text-slate-500">Running</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2 text-xs font-semibold text-white">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Sandbox Node Connected
            </div>
          </div>
        </header>

        {/* Dynamic Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <TabContent 
                activeTab={activeTab} 
                marketData={marketData} 
                priceHistory={priceHistory}
                balance={balance}
                setBalance={setBalance}
                botsState={botsState}
                setBotsState={setBotsState}
                simulatedTrades={simulatedTrades}
                setSimulatedTrades={setSimulatedTrades}
                totalProfitLoss={totalProfitLoss}
                setTotalProfitLoss={setTotalProfitLoss}
                selectedMomentumAsset={selectedMomentumAsset}
                setSelectedMomentumAsset={setSelectedMomentumAsset}
                addLog={addLog}
                
                flashLoanAmount={flashLoanAmount}
                setFlashLoanAmount={setFlashLoanAmount}
                flashLoanAsset={flashLoanAsset}
                setFlashLoanAsset={setFlashLoanAsset}
                flashLoanState={flashLoanState}
                flashLoanLogs={flashLoanLogs}
                runFlashLoan={runFlashLoan}

                sniperAutoSnipe={sniperAutoSnipe}
                setSniperAutoSnipe={setSniperAutoSnipe}
                sniperMempool={sniperMempool}
                snipedTokens={snipedTokens}
                sellSnipedToken={sellSnipedToken}
                nftListings={nftListings}
                snipedNfts={snipedNfts}

                copyTradedWhales={copyTradedWhales}
                setCopyTradedWhales={setCopyTradedWhales}
                whaleTransactions={whaleTransactions}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Lower Real-time Log Console Feed */}
        <div className="h-44 border-t border-slate-800 bg-[#0A0C10] flex flex-col group transition-all duration-300">
          <div className="px-6 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
               Sandbox execution feed
            </div>
            <button 
              onClick={() => setLogs([])}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Clear Log
            </button>
          </div>
          <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar space-y-1.5 bg-black/35">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-4 group/log">
                <span className="text-slate-600 transition-colors group-hover/log:text-slate-500">[{log.time}]</span>
                <span className={cn(
                  "font-bold uppercase tracking-tight",
                  log.type === 'success' ? "text-emerald-500" : 
                  log.type === 'warn' ? "text-amber-500" : "text-blue-500"
                )}>
                  {log.type === 'info' ? 'sandbox' : log.type === 'success' ? 'success' : 'alert'}:
                </span>
                <span className="text-slate-300">{log.msg}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-slate-600 italic">No execution events triggered yet...</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Router switcher for tabs
function TabContent(props: any) {
  switch (props.activeTab) {
    case "overview":
      return <OverviewTab marketData={props.marketData} priceHistory={props.priceHistory} balance={props.balance} simulatedTrades={props.simulatedTrades} />;
    case "strategy":
      return <StrategyTab botsState={props.botsState} setBotsState={props.setBotsState} balance={props.balance} addLog={props.addLog} />;
    case "momentum":
      return <MomentumTab 
        botsState={props.botsState} 
        setBotsState={props.setBotsState} 
        priceHistory={props.priceHistory} 
        selectedAsset={props.selectedMomentumAsset} 
        setSelectedAsset={props.setSelectedMomentumAsset} 
        balance={props.balance} 
        addLog={props.addLog} 
      />;
    case "arbitrage":
      return <ArbitrageTab botsState={props.botsState} setBotsState={props.setBotsState} simulatedTrades={props.simulatedTrades} />;
    case "flashloan":
      return <FlashLoanTab 
        amount={props.flashLoanAmount} 
        setAmount={props.setFlashLoanAmount} 
        asset={props.flashLoanAsset} 
        setAsset={props.setFlashLoanAsset} 
        state={props.flashLoanState} 
        logs={props.flashLoanLogs} 
        run={props.runFlashLoan} 
      />;
    case "sniper":
      return <SniperTab 
        botsState={props.botsState}
        setBotsState={props.setBotsState}
        autoSnipe={props.sniperAutoSnipe}
        setAutoSnipe={props.setSniperAutoSnipe}
        mempool={props.sniperMempool}
        sniped={props.snipedTokens}
        sell={props.sellSnipedToken}
        nftListings={props.nftListings}
        snipedNfts={props.snipedNfts}
        balance={props.balance}
      />;
    case "ai":
      return <AIAnalysisTab addLog={props.addLog} />;
    case "copytrade":
      return <CopyTradingTab 
        whales={props.copyTradedWhales} 
        setWhales={props.setCopyTradedWhales} 
        txs={props.whaleTransactions} 
        balance={props.balance}
      />;
    default:
      return null;
  }
}

// ---------------- TAB 1: OVERVIEW ----------------
function OverviewTab({ marketData, priceHistory, balance, simulatedTrades }: { marketData: MarketData[], priceHistory: Record<string, number[]>, balance: any, simulatedTrades: LiveTrade[] }) {
  // Convert BTC history to graph format
  const btcHistory = priceHistory["BTC"] || [];
  const chartData = btcHistory.map((val, idx) => ({
    time: idx,
    BTC: parseFloat(val.toFixed(2)),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Visual live order flow chart */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20">
            <TrendingUp className="w-24 h-24 text-blue-500" />
          </div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-white text-lg">Execution Sandbox Feed (BTC/USDT)</h3>
                <span className="px-2 py-0.5 bg-blue-600/20 border border-blue-600/40 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider animate-pulse">Simulation Live</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Live price fluctuations and execution levels</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Latest Tick Price</span>
              <span className="font-mono text-xl font-extrabold text-white">
                {formatCurrency(btcHistory[btcHistory.length - 1] || 63000)}
              </span>
            </div>
          </div>
          <div className="h-[280px]">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} fontStyle="italic" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0D1117', border: '1px solid #1e293b', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#E4E3E0', fontFamily: 'monospace' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="BTC" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} dot={false} animationDuration={200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic market asset listing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marketData.map((asset) => (
            <div key={asset.symbol} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between hover:border-slate-600 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-xs text-white ring-1 ring-slate-700">
                  {asset.symbol}
                </div>
                <div>
                  <h4 className="font-bold text-white leading-tight">{asset.symbol} / USDT</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 tracking-wider">VOL: {formatCompactNumber(asset.volume)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-white">{asset.price < 1 ? asset.price.toFixed(4) : formatCurrency(asset.price)}</p>
                <div className={cn(
                  "text-[10px] font-mono flex items-center gap-0.5 justify-end mt-1",
                  asset.change24h >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {asset.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(asset.change24h).toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Side Portfolio & Live Trades Feed */}
      <div className="space-y-6">
        
        {/* Wallet Balances Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Simulated Sandbox Wallet
          </h3>
          <div className="space-y-3.5">
            {Object.entries(balance).map(([coin, qty]: [string, any]) => {
              if (qty === 0) return null;
              return (
                <div key={coin} className="flex justify-between items-center py-2 border-b border-slate-800/40">
                  <span className="text-slate-400 font-semibold text-xs tracking-wider">{coin}</span>
                  <span className="font-mono text-sm font-bold text-white">
                    {coin === "USD" ? formatCurrency(qty) : `${qty.toFixed(4)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live execution ledger */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Sandbox Action Ledger
          </h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto custom-scrollbar">
            {simulatedTrades.slice(0, 5).map((t, idx) => (
              <div key={idx} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold uppercase">{t.botName}</span>
                  <span className="text-[10px] text-slate-500">{t.time}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className={cn(
                    "font-bold uppercase font-mono",
                    t.type === "BUY" ? "text-emerald-400" : t.type === "SELL" ? "text-rose-400" : "text-blue-400"
                  )}>
                    {t.type} {t.amount.toFixed(4)} {t.asset}
                  </span>
                  {t.profit > 0 && (
                    <span className="font-mono text-[10px] font-bold text-emerald-400">
                      +${t.profit.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {simulatedTrades.length === 0 && (
              <div className="text-xs text-slate-600 italic text-center py-6">No trades executed in this session yet...</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ---------------- TAB 2: GRID & DCA BOTS ----------------
function StrategyTab({ botsState, setBotsState, balance, addLog }: any) {
  const toggleBot = (id: string, name: string) => {
    setBotsState((prev: any) => {
      const nextActive = !prev[id].active;
      addLog(`[System Control] Bot ${name} successfully ${nextActive ? 'STARTED' : 'STOPPED'}.`, nextActive ? 'success' : 'warn');
      return {
        ...prev,
        [id]: { ...prev[id], active: nextActive }
      };
    });
  };

  const updateConfig = (id: string, fields: Record<string, any>) => {
    setBotsState((prev: any) => ({
      ...prev,
      [id]: { ...prev[id], config: { ...prev[id].config, ...fields } }
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Bot configuration layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GRID BOT CONTROL */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 relative">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                Sideways Grid Trading Bot
              </h3>
              <p className="text-xs text-slate-500">Places passive buy/sell orders inside a trading band.</p>
            </div>
            <button 
              onClick={() => toggleBot("grid-1", "Sideways Grid")}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-xs transition-all",
                botsState["grid-1"].active ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
              )}
            >
              {botsState["grid-1"].active ? "TERMINATE" : "DEPLOY"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block mb-1">State</span>
              <span className={cn("text-xs font-black uppercase", botsState["grid-1"].active ? "text-emerald-400 animate-pulse" : "text-rose-500")}>
                {botsState["grid-1"].active ? "ACTIVE" : "PAUSED"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block mb-1">Trades Filled</span>
              <span className="font-mono text-sm font-bold text-white">{botsState["grid-1"].tradesCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block mb-1">Simulated yield</span>
              <span className="font-mono text-sm font-bold text-emerald-400">+{botsState["grid-1"].profit24h.toFixed(1)}%</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grid Parameters</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Lower Bound (USD)</label>
                <input 
                  type="number" 
                  value={botsState["grid-1"].config.lowerPrice} 
                  onChange={(e) => updateConfig("grid-1", { lowerPrice: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Upper Bound (USD)</label>
                <input 
                  type="number" 
                  value={botsState["grid-1"].config.upperPrice} 
                  onChange={(e) => updateConfig("grid-1", { upperPrice: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Number of Grids (Levels)</label>
                <input 
                  type="number" 
                  value={botsState["grid-1"].config.grids} 
                  onChange={(e) => updateConfig("grid-1", { grids: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Trailing Deviation (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={botsState["grid-1"].config.trailingDeviation} 
                  onChange={(e) => updateConfig("grid-1", { trailingDeviation: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-[10px] text-slate-500 uppercase mt-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={botsState["grid-1"].config.priceActionConfirm} 
                  onChange={(e) => updateConfig("grid-1", { priceActionConfirm: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                Require Price Action Confirmation (MACD/RSI)
              </label>
            </div>
          </div>
        </div>

        {/* DCA BOT CONTROL */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 relative">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Dip Hunter DCA Bot
              </h3>
              <p className="text-xs text-slate-500">Automatically accumulates assets at systematic periods.</p>
            </div>
            <button 
              onClick={() => toggleBot("dca-1", "Dip Hunter DCA")}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-xs transition-all",
                botsState["dca-1"].active ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
              )}
            >
              {botsState["dca-1"].active ? "TERMINATE" : "DEPLOY"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block mb-1">State</span>
              <span className={cn("text-xs font-black uppercase", botsState["dca-1"].active ? "text-emerald-400 animate-pulse" : "text-rose-500")}>
                {botsState["dca-1"].active ? "ACTIVE" : "PAUSED"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block mb-1">Total buys</span>
              <span className="font-mono text-sm font-bold text-white">{botsState["dca-1"].tradesCount}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block mb-1">Simulated yield</span>
              <span className="font-mono text-sm font-bold text-emerald-400">+{botsState["dca-1"].profit24h.toFixed(1)}%</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">DCA Parameters</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Asset To Buy</label>
                <select 
                  value={botsState["dca-1"].config.asset}
                  onChange={(e) => updateConfig("dca-1", { asset: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs text-white"
                >
                  <option value="BTC">BTC (Bitcoin)</option>
                  <option value="ETH">ETH (Ethereum)</option>
                  <option value="SOL">SOL (Solana)</option>
                  <option value="BNB">BNB (Binance)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Buy Size (USD)</label>
                <input 
                  type="number" 
                  value={botsState["dca-1"].config.buyAmountUSD} 
                  onChange={(e) => updateConfig("dca-1", { buyAmountUSD: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Accumulation Interval (Ticks)</label>
                <input 
                  type="number" 
                  value={botsState["dca-1"].config.intervalTicks} 
                  onChange={(e) => updateConfig("dca-1", { intervalTicks: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Step Scale Multiplier</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={botsState["dca-1"].config.stepScaleMultiplier} 
                  onChange={(e) => updateConfig("dca-1", { stepScaleMultiplier: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

// ---------------- TAB 3: MOMENTUM & TREND BOTS ----------------
function MomentumTab({ botsState, setBotsState, priceHistory, selectedAsset, setSelectedAsset, balance, addLog }: any) {
  const toggleBot = () => {
    setBotsState((prev: any) => {
      const nextActive = !prev["momentum-1"].active;
      addLog(`[System Control] Bot Trend Following successfully ${nextActive ? 'STARTED' : 'STOPPED'}.`, nextActive ? 'success' : 'warn');
      return {
        ...prev,
        "momentum-1": { ...prev["momentum-1"], active: nextActive }
      };
    });
  };

  const updateConfig = (fields: Record<string, any>) => {
    setBotsState((prev: any) => ({
      ...prev,
      "momentum-1": { ...prev["momentum-1"], config: { ...prev["momentum-1"].config, ...fields } }
    }));
  };

  // Convert raw price history array into charting object with SMA + RSI calculations
  const prices = priceHistory[selectedAsset] || [];
  const chartData = prices.map((price: number, idx: number) => {
    // Calculate SMA-10
    let sma = price;
    if (idx >= 9) {
      const sum = prices.slice(idx - 9, idx + 1).reduce((s: number, p: number) => s + p, 0);
      sma = sum / 10;
    }

    // Rough Simulated RSI-14
    let rsi = 50;
    if (idx >= 14) {
      let gains = 0, losses = 0;
      for (let i = idx - 13; i <= idx; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
      }
      const rs = gains / (losses || 1);
      rsi = 100 - (100 / (1 + rs));
    }

    return {
      tick: idx,
      Price: parseFloat(price.toFixed(selectedAsset === "DOGE" ? 4 : 2)),
      SMA10: parseFloat(sma.toFixed(selectedAsset === "DOGE" ? 4 : 2)),
      RSI: Math.round(rsi),
    };
  });

  const latestRsi = chartData[chartData.length - 1]?.RSI || 50;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Chart Section */}
      <div className="lg:col-span-2 space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Technical Momentum Indicator Chart</h3>
            <p className="text-xs text-slate-500">Live overlay of Simple Moving Average (SMA-10) and Relative Strength Index (RSI)</p>
          </div>
          <div className="flex gap-2">
            {["BTC", "ETH", "SOL", "DOG"].map(tok => {
              const sym = tok === "DOG" ? "DOGE" : tok;
              return (
                <button
                  key={sym}
                  onClick={() => { setSelectedAsset(sym); updateConfig({ asset: sym }); }}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-lg transition-all",
                    selectedAsset === sym ? "bg-blue-600 text-white" : "bg-slate-850 text-slate-400 hover:bg-slate-800"
                  )}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recharts Price & SMA Graph */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
              <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={9} />
              <Tooltip contentStyle={{ backgroundColor: '#0D1117', border: '1px solid #1e293b' }} />
              <Line type="monotone" dataKey="Price" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="SMA10" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* RSI Indicator sub graph */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-bold">
            <span>RSI Indicator (14 Ticks)</span>
            <span className={cn(
              "font-mono",
              latestRsi < 35 ? "text-emerald-400 font-black animate-pulse" : latestRsi > 65 ? "text-rose-400 font-black animate-pulse" : "text-slate-500"
            )}>
              Current: {latestRsi} {latestRsi < 35 ? "(OVERSOLD)" : latestRsi > 65 ? "(OVERBOUGHT)" : "(NEUTRAL)"}
            </span>
          </div>
          <div className="h-[90px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={8} ticks={[30, 50, 70]} />
                <Area type="monotone" dataKey="RSI" stroke="#10b981" fill="#10b981" fillOpacity={0.08} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Control Dashboard Panel */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Momentum RSI / Trend Bot
            </h3>
            <button 
              onClick={toggleBot}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                botsState["momentum-1"].active ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
              )}
            >
              {botsState["momentum-1"].active ? "TERMINATE" : "DEPLOY"}
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Monitors real-time Relative Strength Index (RSI) metrics. Automatically triggers automated buy orders during oversold panics (<span className="text-emerald-400">RSI &lt; 35</span>) and liquidates during overbought spikes (<span className="text-rose-400">RSI &gt; 65</span>).
          </p>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Engine State:</span>
              <span className={cn("font-bold uppercase", botsState["momentum-1"].active ? "text-emerald-400" : "text-rose-500")}>
                {botsState["momentum-1"].active ? "ACTIVE" : "PAUSED"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Asset Targeted:</span>
              <span className="font-bold text-white uppercase">{botsState["momentum-1"].config.asset}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Executed Cycles:</span>
              <span className="font-mono font-bold text-white">{botsState["momentum-1"].tradesCount} orders</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">RSI Modifiers</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Buy Level (Oversold)</label>
                <input 
                  type="number" 
                  value={botsState["momentum-1"].config.rsiBuy} 
                  onChange={(e) => updateConfig({ rsiBuy: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Sell Level (Overbought)</label>
                <input 
                  type="number" 
                  value={botsState["momentum-1"].config.rsiSell} 
                  onChange={(e) => updateConfig({ rsiSell: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg font-mono text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}

// ---------------- TAB 4: ARBITRAGE ENGINE ----------------
function ArbitrageTab({ botsState, setBotsState, simulatedTrades }: { botsState: any, setBotsState: any, simulatedTrades: LiveTrade[] }) {
  const arbs = simulatedTrades.filter(t => t.type === "ARBITRAGE");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Active Spreads Monitor */}
      <div className="lg:col-span-2 space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Cross-Market Spread Scanner
          </h3>
          <p className="text-xs text-slate-500">Live monitoring of price gaps across central and decentralized books.</p>
        </div>

        <div className="space-y-4">
          {[
            { pair: "BTC/USDT", exA: "Binance", pA: 63250.00, exB: "Bybit", pB: 63285.20, pct: 0.05, active: true },
            { pair: "SOL/USDT", exA: "Uniswap V3", pA: 145.20, exB: "Raydium Pool", pB: 146.10, pct: 0.62, active: true },
            { pair: "ETH/USDT", exA: "Sushiswap", pA: 3120.50, exB: "Binance CEX", pB: 3122.10, pct: 0.05, active: false }
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-white block">{item.pair}</span>
                <span className="text-[10px] text-slate-500">{item.exA} vs {item.exB}</span>
              </div>
              <div className="text-right">
                <span className={cn(
                  "text-xs font-bold block font-mono",
                  item.pct > 0.15 ? "text-emerald-400" : "text-slate-400"
                )}>
                  Spread: {item.pct}%
                </span>
                {item.pct > 0.15 ? (
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded uppercase tracking-widest animate-pulse">Arbitrage Found</span>
                ) : (
                  <span className="text-[9px] text-slate-600 uppercase">Scanning...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Captured Arbitrage history */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div>
          <h3 className="text-white font-bold text-lg">Captured Cycles</h3>
          <p className="text-xs text-slate-500">History of high-frequency arbitrage execution.</p>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
          {arbs.map((a, idx) => (
            <div key={idx} className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg text-xs space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-white">{a.botName}</span>
                <span className="text-emerald-400">+${a.profit.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-slate-500">Captured spread on {a.asset} at {a.time}</p>
            </div>
          ))}
          {arbs.length === 0 && (
            <div className="text-xs text-slate-600 italic text-center py-12">No arbitrage spreads captured yet...</div>
          )}
        </div>
      </div>

    </div>
  );
}

// ---------------- TAB 5: FLASH LOAN CONSOLE ----------------
function FlashLoanTab({ amount, setAmount, asset, setAsset, state, logs, run }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Configuration Console */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 text-blue-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Flash Loan Console</h3>
              <p className="text-xs text-slate-500">Instant multi-swap single-block arbitrage.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Borrow Asset (Aave Pool)</label>
              <select 
                value={asset} 
                onChange={(e) => setAsset(e.target.value)}
                disabled={state !== "idle"}
                className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs text-white"
              >
                <option value="USDT">USDT (Tether)</option>
                <option value="USDC">USDC (USD Coin)</option>
                <option value="DAI">DAI (MakerDAO)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Loan Capital Size</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={state !== "idle"}
                className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-white animate-glow"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Aave V3 fee standard: 0.09% repayment markup ($${(amount * 0.0009).toFixed(2)})</span>
            </div>
          </div>
        </div>

        <button
          onClick={run}
          disabled={state !== "idle"}
          className={cn(
            "w-full py-4 rounded-xl font-black text-sm text-white shadow-lg transition-all active:scale-[0.98]",
            state !== "idle" ? "bg-slate-800 cursor-not-allowed text-slate-500" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/30"
          )}
        >
          {state === "idle" ? "EXECUTE FLASH ARBITRAGE" : "EXECUTING CONTRACT PIPELINE..."}
        </button>
      </div>

      {/* Visual Block Simulation Pipeline */}
      <div className="lg:col-span-2 space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col">
        <h3 className="text-white font-bold text-lg">Single-Block Transaction Visualization</h3>
        
        {/* Animated stage tracker */}
        <div className="flex justify-between items-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
          {[
            { label: "Aave Borrow", s: "borrowing" },
            { label: "Scan Pools", s: "scanning" },
            { label: "Swap 1", s: "swap1" },
            { label: "Swap 2", s: "swap2" },
            { label: "Aave Repay", s: "repaying" }
          ].map((stage, idx) => {
            const isActive = state === stage.s;
            const isDone = ["scanning", "swap1", "swap2", "repaying", "completed"].slice(idx).includes(state) || state === "completed";

            return (
              <React.Fragment key={idx}>
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-xs border transition-all duration-300",
                    state === "completed" ? "bg-emerald-500 border-emerald-500 text-white" :
                    isActive ? "bg-blue-600 border-blue-500 text-white ring-4 ring-blue-900/30 animate-pulse" :
                    isDone ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-950 border-slate-850 text-slate-600"
                  )}>
                    {idx + 1}
                  </div>
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-wider text-center",
                    isActive ? "text-blue-400" : "text-slate-600"
                  )}>
                    {stage.label}
                  </span>
                </div>
                {idx < 4 && (
                  <div className={cn(
                    "flex-1 h-0.5 transition-all duration-500",
                    isDone ? "bg-blue-600" : "bg-slate-850"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Live dynamic process log */}
        <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs space-y-2 overflow-y-auto max-h-[220px] custom-scrollbar">
          {logs.map((log: string, idx: number) => (
            <div key={idx} className={cn(
              "leading-relaxed",
              log.includes("successful") || log.includes("finalized") ? "text-emerald-400" : "text-slate-300"
            )}>
              ➔ {log}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-slate-600 italic text-center py-12">Click execute to trigger contract pipeline simulations...</div>
          )}
        </div>
      </div>

    </div>
  );
}

// ---------------- TAB 6: SNIPER (LAUNCH & NFT) ----------------
function SniperTab({ botsState, setBotsState, autoSnipe, setAutoSnipe, mempool, sniped, sell, nftListings, snipedNfts, balance }: any) {
  const toggleSniper = (id: string, name: string) => {
    setBotsState((prev: any) => {
      const nextActive = !prev[id].active;
      return {
        ...prev,
        [id]: { ...prev[id], active: nextActive }
      };
    });
  };

  const updateConfig = (id: string, fields: Record<string, any>) => {
    setBotsState((prev: any) => ({
      ...prev,
      [id]: { ...prev[id], config: { ...prev[id].config, ...fields } }
    }));
  };

  return (
    <div className="space-y-8">
      
      {/* LAUNCH SNIPER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Launch Sniper Settings */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                DEX Token Launch Sniper
              </h3>
              <button
                onClick={() => toggleSniper("sniper-launch", "Launch Sniper")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  botsState["sniper-launch"].active ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                )}
              >
                {botsState["sniper-launch"].active ? "TERMINATE" : "DEPLOY"}
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Monitors the DEX liquidity addition pool. Instantly submits a buy order inside the exact same block. Memecoins fluctuate rapidly—lock in profit before a rug pull!
            </p>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-xs text-slate-400 font-bold">Auto-Snipe Mode</span>
                <input 
                  type="checkbox" 
                  checked={autoSnipe} 
                  onChange={(e) => setAutoSnipe(e.target.checked)}
                  className="rounded border-slate-850 text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Buy Amount (SOL)</label>
                <input 
                  type="number" 
                  value={botsState["sniper-launch"].config.buyAmountSOL} 
                  onChange={(e) => updateConfig("sniper-launch", { buyAmountSOL: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg font-mono text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Min Liquidity Filter (USD)</label>
                <input 
                  type="number" 
                  value={botsState["sniper-launch"].config.minLiquidity} 
                  onChange={(e) => updateConfig("sniper-launch", { minLiquidity: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg font-mono text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Mempool Liquidity Feed */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest">Live DEX Mempool Stream</h3>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar">
            {mempool.map((t: any) => (
              <div key={t.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block">{t.name} (${t.symbol})</span>
                  <span className="text-[10px] text-slate-500">Liquidity: ${formatCompactNumber(t.liquidity)}</span>
                </div>
                <div className="text-right">
                  <span className="block font-mono text-slate-400">${t.priceUSD.toFixed(4)}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 text-[8px] font-black rounded uppercase tracking-wider",
                    t.status === 'rugged' ? "bg-rose-500/10 text-rose-500" :
                    t.status === 'sniped' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                  )}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
            {mempool.length === 0 && (
              <div className="text-xs text-slate-600 italic text-center py-12">Streaming dex mempool. Listening for additions...</div>
            )}
          </div>
        </div>

        {/* Active Sniped Positions */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 flex flex-col">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest">Active Snipes</h3>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar">
            {sniped.map((s: any) => (
              <div key={s.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-black text-white block">{s.name}</span>
                    <span className="text-[10px] text-slate-500">Qty: {formatCompactNumber(s.amount)}</span>
                  </div>
                  <span className={cn(
                    "font-mono font-bold",
                    s.profit >= 0 ? "text-emerald-400" : "text-rose-500"
                  )}>
                    {s.profit >= 0 ? "+" : ""}${s.profit.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between gap-3">
                  <span className="text-[10px] text-slate-500 self-center">Price: ${s.currentPrice.toFixed(4)}</span>
                  <button
                    disabled={s.isSold}
                    onClick={() => sell(s.id)}
                    className={cn(
                      "px-3 py-1 rounded font-bold text-[10px] text-white",
                      s.isSold ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"
                    )}
                  >
                    {s.isSold ? "LIQUIDATED" : "SELL NOW"}
                  </button>
                </div>
              </div>
            ))}
            {sniped.length === 0 && (
              <div className="text-xs text-slate-600 italic text-center py-12">No active sniper positions. Deploy bot to capture.</div>
            )}
          </div>
        </div>

      </div>

      {/* NFT FLOOR PRICE SNIPER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-850/60 pt-6">
        
        {/* NFT Settings panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              NFT Floor Price Sniper
            </h3>
            <button
              onClick={() => toggleSniper("sniper-nft", "NFT Floor Sniper")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                botsState["sniper-nft"].active ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
              )}
            >
              {botsState["sniper-nft"].active ? "TERMINATE" : "DEPLOY"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-1">Max Snipe Price (ETH)</label>
              <input 
                type="number" 
                step="0.05"
                value={botsState["sniper-nft"].config.maxPriceETH} 
                onChange={(e) => updateConfig("sniper-nft", { maxPriceETH: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg font-mono text-xs text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block mb-1">Trades Captured</span>
              <span className="font-mono text-sm font-bold text-white block mt-2">{botsState["sniper-nft"].tradesCount} sniped</span>
            </div>
          </div>
        </div>

        {/* Live listing streams */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-white font-bold text-xs uppercase tracking-wider">NFT Marketplace Listing Stream</h3>
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar">
            {nftListings.map((l: any) => (
              <div key={l.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block">{l.collection} {l.token}</span>
                  <span className="text-[10px] text-slate-500">Floor: {l.floorETH} ETH</span>
                </div>
                <div className="text-right">
                  <span className="block font-mono text-indigo-400 font-bold">{l.priceETH} ETH</span>
                  <span className={cn(
                    "text-[8px] font-bold tracking-widest uppercase",
                    l.sniped ? "text-emerald-400 animate-pulse" : "text-slate-600"
                  )}>
                    {l.sniped ? "🎯 SNIPED" : "SCANNING"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

// ---------------- TAB 7: AI SENTIMENT SCANNER (Upgraded & Search Grounded) ----------------
function AIAnalysisTab({ addLog }: { addLog: any }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Record<string, SentimentData> | null>(null);
  
  // Dynamic list of crypto assets to scan
  const [assetsToScan, setAssetsToScan] = useState<string[]>(["BTC", "ETH", "SOL", "DOGE"]);
  const [newAssetInput, setNewAssetInput] = useState("");

  const addAssetToScan = () => {
    const sym = newAssetInput.trim().toUpperCase();
    if (sym && !assetsToScan.includes(sym)) {
      setAssetsToScan([...assetsToScan, sym]);
      setNewAssetInput("");
      addLog(`Added ${sym} to the active AI Sentiment target list`, "info");
    }
  };

  const removeAssetFromScan = (sym: string) => {
    setAssetsToScan(assetsToScan.filter(a => a !== sym));
  };

  const performAnalysis = async () => {
    if (assetsToScan.length === 0) return;
    setAnalyzing(true);
    addLog("Analyzing Global Social Sentiment and Live Web Indices...", "info");
    try {
      const res = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: assetsToScan })
      });
      const data = await res.json();
      setResult(data as Record<string, SentimentData>);
      addLog("Google Search-grounded Sentiment scan successful.", "success");
    } catch (e) {
      addLog("Failed to link with AI inference node.", "warn");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto py-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-[10px] font-bold tracking-[0.2em] text-blue-400">
          <Brain className="w-4 h-4" /> AI WEB-GROUNDED ENGINE
        </div>
        <h2 className="text-4xl font-black tracking-tight text-white">Sentiment Intelligence</h2>
        <p className="text-slate-500 text-xs max-w-xl mx-auto leading-relaxed">
          Powered by Gemini 2.5 and Google Search. Gathers dynamic live news articles, web headlines, and social indices to evaluate exact market mood.
        </p>
      </div>

      {/* Dynamic Asset Target Builder */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 max-w-2xl mx-auto">
        <h3 className="text-white font-bold text-xs uppercase tracking-wider">Configure Token Targets</h3>
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="Symbol (e.g. ADA, SOL, XRP)" 
            value={newAssetInput}
            onChange={(e) => setNewAssetInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-white"
          />
          <button 
            onClick={addAssetToScan}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>

        {/* Selected target badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          {assetsToScan.map(asset => (
            <div key={asset} className="px-3 py-1 bg-slate-800 rounded-lg flex items-center gap-2 text-xs font-bold text-white border border-slate-700">
              {asset}
              <button 
                onClick={() => removeAssetFromScan(asset)}
                className="text-slate-500 hover:text-rose-500 text-[10px]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center relative">
        <div className="absolute inset-0 blur-3xl bg-blue-600/20 opacity-30 -z-10 animate-pulse" />
        <button 
          onClick={performAnalysis}
          disabled={analyzing || assetsToScan.length === 0}
          className="group relative px-10 py-5 bg-blue-600 text-white font-black rounded-2xl overflow-hidden transition-all hover:scale-105 hover:bg-blue-500 active:scale-95 disabled:opacity-50 shadow-2xl shadow-blue-500/20"
        >
          {analyzing ? (
            <span className="flex items-center gap-4">
               <Activity className="w-5 h-5 animate-spin" /> WEB INGESTION FLOW ACTIVE...
            </span>
          ) : (
            <span className="flex items-center gap-4">
              <Zap className="w-5 h-5 fill-current" /> RUN LIVE GOOGLE SEARCH SCAN
            </span>
          )}
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {Object.entries(result).map(([symbol, data]: [string, SentimentData]) => (
            <div 
              key={symbol} 
              className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 relative overflow-hidden group"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-colors" />
              
              <div className="flex justify-between items-center relative z-10">
                <h3 className="font-black text-2xl text-white tracking-tight">{symbol}</h3>
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.1em] shadow-sm uppercase border",
                  data.mood === 'BULLISH' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                  data.mood === 'BEARISH' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-slate-800/20 text-slate-350 border-slate-700/55"
                )}>
                  {data.mood}
                </span>
              </div>
              
              <div className="space-y-3 relative z-10">
                 <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                   <span>Web Sentiment Intensity</span>
                   <span className="text-slate-400 font-mono">{Math.round(((data.sentiment + 1) / 2) * 100)}%</span>
                 </div>
                 <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((data.sentiment + 1) / 2) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full transition-colors",
                      data.mood === 'BULLISH' ? "bg-emerald-500" : 
                      data.mood === 'BEARISH' ? "bg-rose-500" : "bg-blue-500"
                    )} 
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/40 rounded-2xl border border-slate-800/50 backdrop-blur-sm relative z-10 flex gap-3">
                 <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                 <p className="text-xs text-slate-450 leading-relaxed italic font-medium">"{data.summary}"</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- TAB 8: COPY TRADING BOTS ----------------
function CopyTradingTab({ whales, setWhales, txs, balance }: any) {
  const toggleWhale = (id: string) => {
    setWhales((prev: any) => ({
      ...prev,
      [id]: { ...prev[id], active: !prev[id].active }
    }));
  };

  const updateSize = (id: string, val: number) => {
    setWhales((prev: any) => ({
      ...prev,
      [id]: { ...prev[id], size: val }
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Whale Profiles List */}
      <div className="lg:col-span-1 space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Whale Wallet Registry
          </h3>
          <p className="text-xs text-slate-500">Enable Mirror Copy on prominent Smart Money wallets.</p>
        </div>

        <div className="space-y-6">
          {[
            { id: "whale-vc", name: "Smart Money VC", addr: "0x71C...a291", desc: "Top tier crypto VC address. Accumulates blue chip assets.", size: 500 },
            { id: "whale-meme", name: "Meme Hunter", addr: "0x3da...6e9f", desc: "Solana high volatility meme hunter. Aggressive leverage.", size: 200 }
          ].map((w) => (
            <div key={w.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-white block text-sm">{w.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{w.addr}</span>
                </div>
                <button
                  onClick={() => toggleWhale(w.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    whales[w.id].active ? "bg-rose-600 text-white" : "bg-blue-600 text-white hover:bg-blue-500"
                  )}
                >
                  {whales[w.id].active ? "DISCONNECT" : "MIRROR"}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">{w.desc}</p>

              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1">Trade Allocation Size (USD)</label>
                <input 
                  type="number"
                  value={whales[w.id].size}
                  onChange={(e) => updateSize(w.id, Number(e.target.value))}
                  disabled={whales[w.id].active}
                  className="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg font-mono text-xs text-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Whale transaction streams */}
      <div className="lg:col-span-2 space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col">
        <div>
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            Whale Wallet Transaction Stream
          </h3>
          <p className="text-xs text-slate-500">Real-time EVM/Solana explorer scraping on registered addresses.</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] custom-scrollbar">
          {txs.map((tx: any) => {
            const isVC = tx.whaleName.includes("VC");
            const isCopyActive = whales[isVC ? "whale-vc" : "whale-meme"].active;

            return (
              <div key={tx.id} className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-white block">{tx.whaleName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    [{tx.time}] Swapped for {tx.amount} {tx.asset}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className={cn(
                    "font-black block font-mono uppercase text-sm",
                    tx.action === 'BUY' ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {tx.action}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Val: ${formatCompactNumber(tx.valUSD)}</span>
                  {isCopyActive && (
                    <span className="px-1 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded uppercase tracking-widest block text-center">Replicated</span>
                  )}
                </div>
              </div>
            );
          })}
          {txs.length === 0 && (
            <div className="text-xs text-slate-600 italic text-center py-20">Listening to blockchain nodes. Waiting for Whale actions...</div>
          )}
        </div>
      </div>

    </div>
  );
}
