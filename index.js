const express = require('express');
const fetch = require('node-fetch');

class AlpacaClient {
  constructor(keyId, secretKey, paper = true) {
    this.keyId = keyId;
    this.secretKey = secretKey;
    this.baseUrl = paper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets';
    this.dataUrl = 'https://data.alpaca.markets';
  }
  get headers() {
    return { 'APCA-API-KEY-ID': this.keyId, 'APCA-API-SECRET-KEY': this.secretKey, 'Content-Type': 'application/json' };
  }
  async req(url, opts = {}) {
    const r = await fetch(url, { headers: this.headers, ...opts });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || `HTTP ${r.status}`);
    return d;
  }
  getAccount() { return this.req(`${this.baseUrl}/v2/account`); }
  getPositions() { return this.req(`${this.baseUrl}/v2/positions`); }
  closePosition(s) { return this.req(`${this.baseUrl}/v2/positions/${encodeURIComponent(s)}`, { method: 'DELETE' }); }
  placeOrder({ symbol, side, notional, time_in_force = 'gtc' }) {
    return this.req(`${this.baseUrl}/v2/orders`, {
      method: 'POST',
      body: JSON.stringify({ symbol, side, type: 'market', time_in_force, notional: notional.toFixed(2) })
    });
  }
  getStockBars(s, tf = '1Day', limit = 50) {
    return this.req(`${this.dataUrl}/v2/stocks/${s}/bars?timeframe=${tf}&limit=${limit}&adjustment=raw`);
  }
  async getCryptoBars(s, tf = '1Hour', limit = 48) {
    const slug = s.replace('/', '');
    const d = await this.req(`${this.dataUrl}/v1beta3/crypto/us/bars?symbols=${slug}&timeframe=${tf}&limit=${limit}`);
    return d?.bars?.[slug] || [];
  }
  getClock() { return this.req(`${this.baseUrl}/v2/clock`); }
}

function calcRSI(c, p = 14) {
  if (c.length < p + 1) return 50;
  let g = 0, l = 0;
  for (let i = c.length - p; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    if (d > 0) g += d; else l -= d;
  }
  return 100 - 100 / (1 + g / (l || 0.0001));
}
function calcEMA(c, p) {
  if (!c.length) return 0;
  const k = 2 / (p + 1);
  let e = c[0];
  for (let i = 1; i < c.length; i++) e = c[i] * k + e * (1 - k);
  return e;
}
function calcMACD(c) {
  if (c.length < 26) return { hist: 0 };
  return { hist: calcEMA(c.slice(-12), 12) - calcEMA(c.slice(-26), 26) };
}

function scoreOpportunity(bars, isCrypto) {
  if (bars.length < 26) return { score: 0, signals: [], worthy: false };
  const closes = bars.map(b => b.c);
  const cur = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const rsi = calcRSI(closes);
  const ema9 = calcEMA(closes.slice(-9), 9);
  const ema21 = calcEMA(closes.slice(-21), 21);
  const macd = calcMACD(closes);
  const vols = bars.map(b => b.v || 0);
  const avgV = vols.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, vols.length);
  const volR = avgV > 0 ? cur.v / avgV : 1;
  const chg = prev.c > 0 ? ((cur.c - prev.c) / prev.c) * 100 : 0;
  let score = 0;
  const sigs = [];
  if (rsi >= 42 && rsi <= 68) { score += 30; sigs.push(`RSI ${rsi.toFixed(0)} prime`); }
  else if (rsi < 35) { score += 15; sigs.push(`RSI ${rsi.toFixed(0)} oversold`); }
  else if (rsi > 72) score -= 20;
  if (cur.c > ema9 && ema9 > ema21) { score += 25; sigs.push('EMA bullish'); }
  if (macd.hist > 0) { score += 20; sigs.push('MACD bullish'); }
  if (volR >= 2.0) { score += 22; sigs.push(`Vol x${volR.toFixed(1)}`); }
  else if (volR >= 1.4) { score += 12; }
  if (chg >= 1.5 && chg <= 6) { score += 25; sigs.push(`+${chg.toFixed(1)}%`); }
  else if (chg > 10) score -= 15;
  let mult = 1.0;
  if (!isCrypto) {
    const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const t = et.getHours() + et.getMinutes() / 60;
    if (t < 10.0 || t > 15.75) mult = 0;
    else if (t < 10.5) mult = 0.5;
  }
  const final = score * mult;
  return { score: Math.round(final), signals: sigs, rsi, volR, chg, worthy: final >= 62 && mult > 0 };
}

function evaluateExit(trade, price) {
  const { entryPrice, highestPrice, slPct, tpPct } = trade;
  const pnl = ((price - entryPrice) / entryPrice) * 100;
  const peak = Math.max(highestPrice || entryPrice, price);
  let trailPct, tier;
  if (pnl >= 5.0)      { trailPct = 0.6; tier = 3; }
  else if (pnl >= 2.5) { trailPct = 1.0; tier = 2; }
  else if (pnl >= 0.8) { trailPct = 1.4; tier = 1; }
  else                 { trailPct = slPct; tier = 0; }
  const trailStop = peak * (1 - trailPct / 100);
  if (pnl >= tpPct) return { action: 'EXIT', reason: `TP ${tpPct}%`, pnl, trailStop };
  if (pnl <= -slPct) return { action: 'EXIT', reason: `SL -${slPct}%`, pnl, trailStop };
  if (tier >= 1 && price <= trailStop) return { action: 'EXIT', reason: `Trail tier ${tier}`, pnl, trailStop };
  return { action: 'HOLD', pnl, trailStop };
}

const CRYPTO = [
  { sym: 'BTCUSD', display: 'BTC/USD' },
  { sym: 'ETHUSD', display: 'ETH/USD' },
  { sym: 'SOLUSD', display: 'SOL/USD' },
  { sym: 'XRPUSD', display: 'XRP/USD' }
];
const STOCKS = [
  { sym: 'NVDA' }, { sym: 'AMD' }, { sym: 'TSLA' }, { sym: 'PLTR' }, { sym: 'COIN' }
];

const bot = {
  client: null, isRunning: false, scanTimer: null, monitorTimer: null,
  trades: [], closedTrades: [], signals: [], log: [], account: null,
  consecutiveLosses: 0, dailyLoss: 0, paper: true,

  addLog(type, msg, level = 'info') {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.log.unshift({ type, msg, level, time, ts: Date.now() });
    if (this.log.length > 200) this.log = this.log.slice(0, 200);
    console.log(`[${time}] [${type}] ${msg}`);
  },

  async init(keyId, secretKey, paper = true) {
    this.client = new AlpacaClient(keyId, secretKey, paper);
    this.paper = paper;
    try {
      this.account = await this.client.getAccount();
      this.addLog('CONNECTED', `${paper ? 'PAPER' : 'LIVE'} | $${parseFloat(this.account.equity).toFixed(2)}`, 'success');
      return { ok: true, account: this.account };
    } catch (e) {
      this.addLog('ERROR', `${e.message}`, 'error');
      return { ok: false, error: e.message };
    }
  },

  async start() {
    if (!this.client) return { ok: false, error: 'Not connected' };
    if (this.isRunning) return { ok: false, error: 'Already running' };
    this.isRunning = true;
    this.addLog('BOT', 'Auto-trading ACTIVATED', 'success');
    this.runScanCycle();
    this.scanTimer = setInterval(() => this.isRunning && this.runScanCycle(), 60000);
    this.monitorTimer = setInterval(() => this.isRunning && this.monitorTrades(), 15000);
    return { ok: true };
  },

  stop() {
    this.isRunning = false;
    clearInterval(this.scanTimer);
    clearInterval(this.monitorTimer);
    this.addLog('BOT', 'PAUSED', 'warning');
    return { ok: true };
  },

  async runScanCycle() {
    try {
      this.account = await this.client.getAccount();
      const bal = parseFloat(this.account.equity);
      const positions = await this.client.getPositions();
      const openCount = Array.isArray(positions) ? positions.length : 0;
      this.addLog('SCAN', `$${bal.toFixed(2)} | Open: ${openCount}`, 'info');
      const sigs = [];
      for (const a of CRYPTO) {
        try {
          const bars = await this.client.getCryptoBars(a.sym, '1Hour', 48);
          if (!bars || bars.length < 26) continue;
          const n = bars.map(b => ({ o: +b.o, h: +b.h, l: +b.l, c: +b.c, v: +(b.v || 0) }));
          const s = scoreOpportunity(n, true);
          if (s.worthy) sigs.push({ sym: a.sym, display: a.display, type: 'CRYPTO', price: n[n.length - 1].c, ...s });
        } catch (e) {}
      }
      try {
        const clock = await this.client.getClock();
        if (clock.is_open) {
          for (const a of STOCKS) {
            try {
              const data = await this.client.getStockBars(a.sym, '1Day', 50);
              const bars = data?.bars || [];
              if (bars.length < 20) continue;
              const n = bars.map(b => ({ o: +b.o, h: +b.h, l: +b.l, c: +b.c, v: +(b.v || 0) }));
              const s = scoreOpportunity(n, false);
              if (s.worthy) sigs.push({ sym: a.sym, display: a.sym, type: 'STOCK', price: n[n.length - 1].c, ...s });
            } catch (e) {}
          }
        }
      } catch (e) {}
      sigs.sort((a, b) => b.score - a.score);
      this.signals = sigs;
      if (sigs.length > 0) {
        this.addLog('SIGNALS', `${sigs.length} opps | top: ${sigs[0].display} ${sigs[0].score}`, 'success');
        const top = sigs[0];
        if (openCount < 3 && this.consecutiveLosses < 3 && bal >= 5) {
          const holding = Array.isArray(positions) && positions.some(p => p.symbol === top.sym);
          if (!holding) {
            const size = Math.max(1, Math.min(bal * 0.02, bal * 0.20));
            await this.placeBuy(top, size);
          }
        }
      } else {
        this.addLog('SCAN', 'No setups', 'info');
      }
    } catch (e) {
      this.addLog('ERROR', `${e.message}`, 'error');
    }
  },

  async placeBuy(signal, notional) {
    try {
      const slPct = signal.type === 'CRYPTO' ? 2.0 : 1.5;
      const tpPct = slPct * 2.8;
      this.addLog('ORDER', `BUY ${signal.display} $${notional.toFixed(2)}`, 'info');
      const order = await this.client.placeOrder({ symbol: signal.sym, side: 'buy', notional, time_in_force: signal.type === 'CRYPTO' ? 'gtc' : 'day' });
      this.trades.push({
        id: order.id, sym: signal.sym, display: signal.display, type: signal.type,
        entryPrice: signal.price, currentPrice: signal.price, highestPrice: signal.price,
        positionSize: notional, slPct, tpPct, score: signal.score,
        openedAt: new Date().toISOString(), pnlPct: 0,
        trailStop: signal.price * (1 - slPct / 100)
      });
      this.addLog('FILLED', `✓ ${signal.display} @ ~$${signal.price.toFixed(2)}`, 'success');
    } catch (e) {
      this.addLog('ERROR', `Order: ${e.message}`, 'error');
    }
  },

  async monitorTrades() {
    if (!this.trades.length) return;
    try {
      const positions = await this.client.getPositions();
      const m = {};
      if (Array.isArray(positions)) positions.forEach(p => m[p.symbol] = p);
      for (const t of [...this.trades]) {
        const live = m[t.sym];
        if (!live) { this.trades = this.trades.filter(x => x.id !== t.id); continue; }
        const price = parseFloat(live.current_price);
        t.currentPrice = price;
        t.highestPrice = Math.max(t.highestPrice, price);
        const ex = evaluateExit(t, price);
        t.pnlPct = ex.pnl;
        t.trailStop = ex.trailStop;
        if (ex.action === 'EXIT') {
          this.addLog('EXIT', `${t.display} ${ex.reason} | ${ex.pnl.toFixed(2)}%`, ex.pnl >= 0 ? 'success' : 'error');
          try {
            await this.client.closePosition(t.sym);
            const dollar = t.positionSize * (ex.pnl / 100);
            if (dollar < 0) { this.consecutiveLosses++; this.dailyLoss += Math.abs(dollar); }
            else this.consecutiveLosses = 0;
            this.closedTrades.unshift({ ...t, exitPrice: price, exitReason: ex.reason, pnlPct: ex.pnl, pnlDollar: dollar, closedAt: new Date().toISOString() });
            this.trades = this.trades.filter(x => x.id !== t.id);
          } catch (e) { this.addLog('ERROR', `Close: ${e.message}`, 'error'); }
        }
      }
    } catch (e) {}
  },

  getStatus() {
    return {
      isRunning: this.isRunning,
      account: this.account,
      openTrades: this.trades,
      closedTrades: this.closedTrades.slice(0, 50),
      signals: this.signals,
      log: this.log.slice(0, 50),
      consecutiveLosses: this.consecutiveLosses,
      dailyLoss: this.dailyLoss,
      paper: this.paper
    };
  }
};

const DASHBOARD = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>EliteTrader Bot</title><link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&family=Exo+2&display=swap" rel="stylesheet"/><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#030810;color:#c0dce8;font-family:'Exo 2',sans-serif;min-height:100vh}body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:0;background-image:linear-gradient(rgba(0,255,245,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,245,.06) 1px,transparent 1px);background-size:40px 40px}@keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}@keyframes flicker{0%,100%{opacity:1}93%{opacity:.5}95%{opacity:1}}@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}#app{position:relative;z-index:1;padding:14px;max-width:1200px;margin:0 auto}header{padding:12px;border:1px solid rgba(0,255,245,.2);background:rgba(2,6,16,.95);margin-bottom:12px}.logo{font-family:'Orbitron',monospace;font-size:18px;font-weight:900;color:#00fff5;text-shadow:0 0 18px #00fff5;letter-spacing:.1em;animation:flicker 10s linear infinite}.logo span{color:#ff2d6b}.sub{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(140,185,210,.4);letter-spacing:.15em;margin-top:3px}.panel{background:rgba(3,8,18,.95);border:1px solid rgba(0,255,245,.15);padding:12px;margin-bottom:10px;position:relative}.panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(to right,transparent,#00fff588,transparent)}.title{font-family:'Orbitron',monospace;font-size:10px;font-weight:700;color:#00fff5;letter-spacing:.15em;margin-bottom:10px}input{width:100%;background:rgba(0,255,245,.05);border:1px solid rgba(0,255,245,.3);padding:9px 11px;color:#e0f0f8;font-family:'Share Tech Mono',monospace;font-size:11px;outline:none;margin-bottom:8px}.lbl{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(140,185,210,.5);letter-spacing:.1em;margin-bottom:4px;display:block}.btn{padding:10px 14px;font-family:'Orbitron',monospace;font-size:10px;font-weight:700;letter-spacing:.12em;cursor:pointer;border:1px solid;width:100%}.btn-cyan{background:rgba(0,255,245,.12);border-color:#00fff588;color:#00fff5}.modes{display:flex;gap:6px;margin:8px 0 12px}.mode{flex:1;padding:8px;font-family:'Orbitron',monospace;font-size:9px;font-weight:700;border:1px solid;cursor:pointer}.mode.on-p{background:rgba(255,165,0,.15);border-color:#ffa50088;color:#ffa500}.mode.on-l{background:rgba(0,230,118,.15);border-color:#00e67688;color:#00e676}.mode.off{background:transparent;border-color:rgba(140,185,210,.2);color:rgba(140,185,210,.4)}.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px}.stat{background:rgba(3,8,18,.95);border:1px solid rgba(0,255,245,.15);padding:10px 12px;position:relative}.stat::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(to right,transparent,var(--c,#00fff5),transparent)}.slbl{font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(140,185,210,.5);letter-spacing:.15em;margin-bottom:5px}.sval{font-family:'Orbitron',monospace;font-size:18px;font-weight:900;line-height:1;color:var(--c,#00fff5);text-shadow:0 0 14px var(--c,#00fff5)}.ssub{font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(140,185,210,.4);margin-top:3px}.dot{width:7px;height:7px;border-radius:50%;display:inline-block;position:relative}.dot.on{background:#00fff5;box-shadow:0 0 10px #00fff5}.dot.on::after{content:'';position:absolute;top:-4px;left:-4px;width:15px;height:15px;border-radius:50%;border:1px solid #00fff566;animation:ping 1.5s ease-out infinite}.dot.off{background:#ff2d6b}.tabs{display:flex;gap:3px;background:rgba(0,255,245,.04);padding:3px;border:1px solid rgba(0,255,245,.1);margin-bottom:10px;overflow-x:auto}.tabs button{padding:6px 12px;font-family:'Orbitron',monospace;font-size:9px;font-weight:700;letter-spacing:.1em;border:none;cursor:pointer;background:transparent;color:rgba(140,185,210,.45);white-space:nowrap}.tabs button.active{background:rgba(0,255,245,.12);color:#00fff5}.trade{padding:10px 12px;border-bottom:1px solid rgba(0,255,245,.06);display:flex;justify-content:space-between;align-items:center}.sym{font-family:'Orbitron',monospace;font-size:12px;font-weight:700;color:#e0f0f8}.meta{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(140,185,210,.4);margin-top:3px}.pnl{font-family:'Orbitron',monospace;font-size:13px;font-weight:900}.lg{font-family:'Share Tech Mono',monospace;font-size:9px;line-height:1.5;padding:4px 0 4px 8px;border-left:2px solid;margin-bottom:3px}.lg-success{border-color:#00e67688;color:#00e676}.lg-error{border-color:#ff2d6b88;color:#ff2d6b}.lg-warning{border-color:#ffa50088;color:#ffa500}.lg-info{border-color:rgba(0,255,245,.3);color:rgba(140,185,210,.6)}.err{padding:8px;background:rgba(255,45,107,.1);border:1px solid rgba(255,45,107,.4);color:#ff2d6b;font-family:'Share Tech Mono',monospace;font-size:10px;margin-bottom:10px}.scs{padding:8px;background:rgba(0,230,118,.1);border:1px solid rgba(0,230,118,.4);color:#00e676;font-family:'Share Tech Mono',monospace;font-size:10px;margin-bottom:10px}.hidden{display:none}.empty{padding:20px;text-align:center;font-family:'Share Tech Mono',monospace;font-size:10px;color:rgba(140,185,210,.3)}footer{padding:8px;text-align:center;font-family:'Share Tech Mono',monospace;font-size:8px;color:rgba(140,185,210,.3);margin-top:12px}footer span{color:#00e676;animation:blink 1s linear infinite}</style></head><body><div id="app"><header><div class="logo">ELITE<span>TRADER</span> $100</div><div class="sub">LIVE ALPACA ENGINE // CRYPTO 24/7 + STOCKS PDT-SAFE</div></header><div id="cp"><div class="panel"><div class="title">⚡ CONNECT ALPACA</div><div id="msg"></div><label class="lbl">KEY ID</label><input type="text" id="k" placeholder="PKxxxxxxxxxxxx"/><label class="lbl">SECRET KEY</label><input type="password" id="s" placeholder="••••••••••••••"/><div class="modes"><button class="mode on-p" id="mp" onclick="setMode(true)">📋 PAPER</button><button class="mode off" id="ml" onclick="setMode(false)">💰 LIVE</button></div><button class="btn btn-cyan" onclick="conn()" id="cb">[ CONNECT ]</button></div><div class="panel"><div class="title" style="color:#ffa500">🚀 GUIDE</div><div style="font-family:'Share Tech Mono',monospace;font-size:10px;line-height:1.8;color:rgba(140,185,210,.6)">1. Get keys at <span style="color:#e0f0f8">alpaca.markets</span><br>2. Paste above<br>3. Select PAPER first<br>4. Tap CONNECT<br>5. Tap START BOT</div></div></div><div id="db" class="hidden"><div class="stats"><div class="stat" style="--c:#00fff5"><div class="slbl">EQUITY</div><div class="sval" id="se">$0</div><div class="ssub">Balance</div></div><div class="stat" style="--c:#a0ff60"><div class="slbl">BUYING PWR</div><div class="sval" id="sb">$0</div><div class="ssub">Available</div></div><div class="stat" id="pp" style="--c:#00fff5"><div class="slbl">OPEN P&L</div><div class="sval" id="sp">+$0</div><div class="ssub" id="sps">0 open</div></div><div class="stat" id="bs" style="--c:#ff2d6b"><div class="slbl">BOT</div><div class="sval" id="sbt" style="font-size:14px">OFF</div><div class="ssub" id="sbs">Tap start</div></div></div><div style="display:flex;gap:8px;margin:10px 0"><button class="btn btn-cyan" id="bb" onclick="tog()" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px"><span class="dot off" id="bd"></span><span id="bl">START BOT</span></button></div><div class="tabs"><button class="active" onclick="tb('p')">POSITIONS</button><button onclick="tb('g')">SIGNALS</button><button onclick="tb('c')">CLOSED</button><button onclick="tb('l')">LOG</button></div><div id="tp" class="panel"><div class="title">◈ POSITIONS</div><div id="pl"><div class="empty">No open positions</div></div></div><div id="tg" class="panel hidden"><div class="title">⚡ SIGNALS</div><div id="gl"><div class="empty">Awaiting scan...</div></div></div><div id="tc" class="panel hidden"><div class="title">📋 CLOSED</div><div id="cl"><div class="empty">No closed trades</div></div></div><div id="tl" class="panel hidden"><div class="title">📡 LOG</div><div id="ll" style="max-height:400px;overflow-y:auto"></div></div></div><footer>ELITETRADER $100 // ALPACA // NOT FINANCIAL ADVICE // <span>■ LIVE</span></footer></div><script>let isP=true,ba=false,pi=null;function setMode(p){isP=p;document.getElementById('mp').className='mode '+(p?'on-p':'off');document.getElementById('ml').className='mode '+(p?'off':'on-l')}function sm(t,ty){document.getElementById('msg').innerHTML='<div class="'+(ty||'err')+'">'+t+'</div>'}async function conn(){const k=document.getElementById('k').value.trim(),s=document.getElementById('s').value.trim();if(!k||!s)return sm('⚠ Enter both keys');const b=document.getElementById('cb');b.textContent='[ CONNECTING... ]';b.disabled=true;try{const r=await fetch('/api/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyId:k,secretKey:s,paper:isP})});const d=await r.json();if(!d.ok){sm('⚠ '+(d.error||'Failed'));b.textContent='[ CONNECT ]';b.disabled=false;return}sm('✓ Connected!','scs');setTimeout(()=>{document.getElementById('cp').classList.add('hidden');document.getElementById('db').classList.remove('hidden');rf();pi=setInterval(rf,12000)},800)}catch(e){sm('⚠ '+e.message);b.textContent='[ CONNECT ]';b.disabled=false}}async function tog(){await fetch(ba?'/api/bot/stop':'/api/bot/start',{method:'POST'});ba=!ba;ub()}function ub(){const d=document.getElementById('bd'),l=document.getElementById('bl'),sb=document.getElementById('sbt'),ss=document.getElementById('sbs'),bs=document.getElementById('bs');if(ba){d.className='dot on';l.textContent='BOT: LIVE';sb.textContent='SCANNING';sb.style.color='#00fff5';ss.textContent='Auto-executing';bs.style.setProperty('--c','#00fff5')}else{d.className='dot off';l.textContent='START BOT';sb.textContent='OFF';sb.style.color='#ff2d6b';ss.textContent='Tap start';bs.style.setProperty('--c','#ff2d6b')}}function tb(n){['p','g','c','l'].forEach(t=>document.getElementById('t'+t).classList.add('hidden'));document.getElementById('t'+n).classList.remove('hidden');document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));event.target.classList.add('active')}async function rf(){try{const r=await fetch('/api/status'),d=await r.json();rs(d)}catch(e){}}function rs(d){if(!d.account)return;const eq=parseFloat(d.account.equity||0),bp=parseFloat(d.account.buying_power||0);document.getElementById('se').textContent='$'+eq.toFixed(2);document.getElementById('sb').textContent='$'+bp.toFixed(2);const op=d.openTrades||[],pnl=op.reduce((s,t)=>s+(t.positionSize*(t.pnlPct||0)/100),0);const sp=document.getElementById('sp');sp.textContent=(pnl>=0?'+':'')+'$'+pnl.toFixed(2);sp.style.color=pnl>=0?'#00e676':'#ff2d6b';document.getElementById('pp').style.setProperty('--c',pnl>=0?'#00e676':'#ff2d6b');document.getElementById('sps').textContent=op.length+' open';ba=d.isRunning;ub();const pl=document.getElementById('pl');pl.innerHTML=op.length===0?'<div class="empty">No open positions</div>':op.map(t=>{const u=(t.pnlPct||0)>=0;return'<div class="trade"><div><div class="sym">'+(t.display||t.sym)+'</div><div class="meta">$'+(t.entryPrice||0).toFixed(2)+' → $'+(t.currentPrice||0).toFixed(2)+'</div></div><div class="pnl" style="color:'+(u?'#00e676':'#ff2d6b')+'">'+(u?'+':'')+(t.pnlPct||0).toFixed(2)+'%</div></div>'}).join('');const gl=document.getElementById('gl');gl.innerHTML=(d.signals||[]).length===0?'<div class="empty">'+(ba?'Scanning...':'Start bot to scan')+'</div>':d.signals.map(s=>'<div class="trade"><div><div class="sym">'+(s.display||s.sym)+'</div><div class="meta">'+(s.signals||[]).slice(0,2).join(' · ')+'</div></div><div class="pnl" style="color:#00fff5">'+s.score+'</div></div>').join('');const cl=document.getElementById('cl');cl.innerHTML=(d.closedTrades||[]).length===0?'<div class="empty">No closed trades</div>':d.closedTrades.slice(0,20).map(t=>{const u=(t.pnlDollar||0)>=0;return'<div class="trade"><div><div class="sym">'+(t.display||t.sym)+'</div><div class="meta">'+(t.exitReason||'')+'</div></div><div class="pnl" style="color:'+(u?'#00e676':'#ff2d6b')+'">'+(u?'+':'')+(t.pnlPct||0).toFixed(2)+'%</div></div>'}).join('');document.getElementById('ll').innerHTML=(d.log||[]).slice(0,50).map(e=>'<div class="lg lg-'+(e.level||'info')+'"><span style="opacity:.5">['+e.type+' '+e.time+']</span> '+e.msg+'</div>').join('')}</script></body></html>`;

const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));
app.post('/api/connect', async (req, res) => {
  const { keyId, secretKey, paper } = req.body;
  if (!keyId || !secretKey) return res.status(400).json({ ok: false, error: 'Keys required' });
  res.json(await bot.init(keyId, secretKey, paper !== false));
});
app.post('/api/bot/start', async (req, res) => res.json(await bot.start()));
app.post('/api/bot/stop', (req, res) => res.json(bot.stop()));
app.get('/api/status', (req, res) => res.json(bot.getStatus()));
app.post('/api/scan', async (req, res) => { await bot.runScanCycle(); res.json({ ok: true, signals: bot.signals }); });
app.delete('/api/positions/:symbol', async (req, res) => {
  try { await bot.client.closePosition(req.params.symbol); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.get('*', (req, res) => res.type('html').send(DASHBOARD));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`⚡ EliteTrader Bot live on port ${PORT}`));
