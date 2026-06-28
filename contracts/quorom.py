# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *

COINGECKO_IDS = {
    "BTCUSDT":   "bitcoin",
    "ETHUSDT":   "ethereum",
    "BNBUSDT":   "binancecoin",
    "SOLUSDT":   "solana",
    "ADAUSDT":   "cardano",
    "AVAXUSDT":  "avalanche-2",
    "DOTUSDT":   "polkadot",
    "LINKUSDT":  "chainlink",
    "MATICUSDT": "matic-network",
    "UNIUSDT":   "uniswap",
}

STARTING_EQUITY = 100_000.0

VETO_RULES = {
    "conservative": {"max_position": 15.0, "min_confidence": 40},
    "moderate":     {"max_position": 30.0, "min_confidence": 25},
    "aggressive":   {"max_position": 50.0, "min_confidence": 15},
}


class Quorum(gl.Contract):
    total_sessions:  u256
    sessions:        TreeMap[str, str]
    portfolios:      TreeMap[str, str]
    owner_sessions:  TreeMap[str, str]
    owner_index:     TreeMap[str, str]
    owners_by_index: TreeMap[str, str]
    owner_count:     u256

    def __init__(self):
        self.total_sessions = 0
        self.owner_count    = 0

    # ── helpers ──────────────────────────────────────────────────────────────────

    def _get_portfolio(self, address):
        if address in self.portfolios:
            return json.loads(self.portfolios[address])
        return {
            "owner":            address,
            "equity":           STARTING_EQUITY,
            "cash":             STARTING_EQUITY,
            "open_positions":   [],
            "closed_positions": [],
            "total_return_pct": 0.0,
            "total_sessions":   0,
            "wins":             0,
            "losses":           0,
        }

    def _save_portfolio(self, address, p):
        self.portfolios[address] = json.dumps(p)

    def _owner_sessions(self, address):
        if address in self.owner_sessions:
            return json.loads(self.owner_sessions[address])
        return []

    def _all_owners(self):
        result = []
        for i in range(int(self.owner_count)):
            addr = self.owners_by_index.get(str(i), "")
            if addr:
                result.append(addr)
        return result

    def _track_owner(self, address):
        if address not in self.owner_index:
            idx = str(int(self.owner_count))
            self.owner_index[address]  = idx
            self.owners_by_index[idx]  = address
            self.owner_count          += 1

    def _parse_json(self, raw):
        text = raw.strip()
        if "```" in text:
            parts = text.split("```")
            text  = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())

    # ── market data ──────────────────────────────────────────────────────────────

    def _fetch_market_data(self, asset):
        coin_id = COINGECKO_IDS.get(asset, "bitcoin")
        url = (
            f"https://api.coingecko.com/api/v3/simple/price"
            f"?ids={coin_id}"
            f"&vs_currencies=usd"
            f"&include_24hr_change=true"
            f"&include_24hr_vol=true"
            f"&include_market_cap=true"
        )

        def fetch():
            # mode="text" returns raw JSON; default (html) would render via browser and fail on JSON endpoints
            return gl.nondet.web.render(url, mode="text")

        # gl.nondet.web.render MUST be wrapped in an eq_principle scope from a @gl.public.write method.
        # Comparative principle tolerates small price drift between validators.
        raw = gl.eq_principle.prompt_comparative(
            fetch,
            "Responses contain the same coin price within 2% tolerance",
        )

        try:
            data = json.loads(raw)
            c    = data.get(coin_id, {})
            return {
                "asset":      asset,
                "price":      float(c.get("usd", 0)),
                "change_24h": float(c.get("usd_24h_change", 0)),
                "volume_24h": float(c.get("usd_24h_vol", 0)),
                "market_cap": float(c.get("usd_market_cap", 0)),
            }
        except Exception:
            return {"asset": asset, "price": 0.0,
                    "change_24h": 0.0, "volume_24h": 0.0, "market_cap": 0.0}

    # ── agents ────────────────────────────────────────────────────────────────────

    def _run_technical_analyst(self, md, risk_level):
        def call():
            prompt = f"""You are the Technical Analyst on the QUORUM on-chain investment committee.

Market snapshot:
  Asset:      {md['asset']}
  Price:      ${md['price']:,.4f}
  24h change: {md['change_24h']:+.2f}%
  24h volume: ${md['volume_24h']:,.0f}
  Market cap: ${md['market_cap']:,.0f}
Risk level: {risk_level}

Analyse price structure, trend, momentum, volume, and key support/resistance.
Respond ONLY with this JSON (no markdown):
{{
  "agent": "Technical Analyst",
  "analysis": "<2-3 sentence technical read>",
  "vote": "<BUY|HOLD|SELL>",
  "confidence": <0-100>,
  "key_levels": "<brief S/R comment>",
  "reasoning": "<one sentence vote rationale>"
}}"""
            result = gl.nondet.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "")
            return result

        raw = gl.eq_principle.prompt_comparative(
            call,
            "Responses agree on vote (BUY/HOLD/SELL) and confidence within 15 points",
        )
        return self._parse_json(raw)

    def _run_news_analyst(self, md, risk_level):
        def call():
            prompt = f"""You are the News Analyst on the QUORUM on-chain investment committee.

Market snapshot:
  Asset:      {md['asset']}
  Price:      ${md['price']:,.4f}
  24h change: {md['change_24h']:+.2f}%
  24h volume: ${md['volume_24h']:,.0f}
Risk level: {risk_level}

Assess macro environment, sentiment, institutional flows, and narrative momentum.
Respond ONLY with this JSON (no markdown):
{{
  "agent": "News Analyst",
  "analysis": "<2-3 sentence sentiment/macro read>",
  "vote": "<BUY|HOLD|SELL>",
  "confidence": <0-100>,
  "sentiment": "<BULLISH|NEUTRAL|BEARISH>",
  "reasoning": "<one sentence vote rationale>"
}}"""
            result = gl.nondet.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "")
            return result

        raw = gl.eq_principle.prompt_comparative(
            call,
            "Responses agree on vote (BUY/HOLD/SELL) and overall sentiment",
        )
        return self._parse_json(raw)

    def _run_quant_analyst(self, md, risk_level):
        def call():
            prompt = f"""You are the Quant Analyst on the QUORUM on-chain investment committee.

Market snapshot:
  Asset:      {md['asset']}
  Price:      ${md['price']:,.4f}
  24h change: {md['change_24h']:+.2f}%
  24h volume: ${md['volume_24h']:,.0f}
  Market cap: ${md['market_cap']:,.0f}
Risk level: {risk_level}

Apply statistical reasoning. Is price stretched or at fair value?
Momentum-continuation or mean-reversion regime?
Respond ONLY with this JSON (no markdown):
{{
  "agent": "Quant Analyst",
  "analysis": "<2-3 sentence quantitative read>",
  "vote": "<BUY|HOLD|SELL>",
  "confidence": <0-100>,
  "regime": "<TRENDING|RANGING|STRETCHED>",
  "reasoning": "<one sentence vote rationale>"
}}"""
            result = gl.nondet.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "")
            return result

        raw = gl.eq_principle.prompt_comparative(
            call,
            "Responses agree on vote (BUY/HOLD/SELL) and market regime",
        )
        return self._parse_json(raw)

    def _run_risk_manager(self, md, agent_outputs, position_pct, risk_level):
        rules    = VETO_RULES.get(risk_level, VETO_RULES["moderate"])
        avg_conf = (
            sum(a.get("confidence", 50) for a in agent_outputs) / len(agent_outputs)
            if agent_outputs else 0
        )
        debate = "\n".join(
            f"  {a['agent']}: {a['vote']} ({a.get('confidence', 0)}%) — {a.get('reasoning', '')}"
            for a in agent_outputs
        )

        def call():
            prompt = f"""You are the Risk Manager on the QUORUM on-chain investment committee.
You hold the VETO. Protect capital above all else.

Market snapshot:
  Asset:      {md['asset']}
  Price:      ${md['price']:,.4f}
  24h change: {md['change_24h']:+.2f}%

Committee debate:
{debate}

  Position size:          {position_pct:.1f}% of portfolio
  Risk level:             {risk_level}
  Avg committee confidence: {avg_conf:.0f}%

Veto rules for {risk_level}:
  Veto if position > {rules['max_position']}% OR avg confidence < {rules['min_confidence']}%

Respond ONLY with this JSON (no markdown):
{{
  "agent": "Risk Manager",
  "risk_score": <0-100>,
  "veto": <true|false>,
  "volatility_assessment": "<LOW|MEDIUM|HIGH|EXTREME>",
  "exposure_assessment": "<SAFE|ELEVATED|EXCESSIVE>",
  "reasoning": "<one sentence>",
  "recommendation": "<brief guidance>"
}}"""
            result = gl.nondet.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "")
            return result

        raw    = gl.eq_principle.prompt_comparative(
            call,
            "Responses must agree on veto (true/false) and risk_score within 20 points",
        )
        output = self._parse_json(raw)
        output["veto"]       = bool(output.get("veto", False))
        output["risk_score"] = max(0, min(100, int(output.get("risk_score", 50))))
        return output

    def _run_execution_agent(self, md, agent_outputs, risk_review, market, risk_level):
        vote_counts = {"BUY": 0, "HOLD": 0, "SELL": 0}
        for a in agent_outputs:
            v = a.get("vote", "HOLD")
            if v in vote_counts:
                vote_counts[v] += 1
        debate = "\n".join(
            f"  {a['agent']}: {a['vote']} ({a.get('confidence', 0)}%) — {a.get('reasoning', '')}"
            for a in agent_outputs
        )

        def call():
            prompt = f"""You are the Execution Agent and Chair of the QUORUM on-chain investment committee.

Market snapshot:
  Asset:  {md['asset']}
  Price:  ${md['price']:,.4f}
  Market: {market}

Committee debate:
{debate}

Vote tally: BUY={vote_counts['BUY']}  HOLD={vote_counts['HOLD']}  SELL={vote_counts['SELL']}

Risk Manager CLEARED — Risk Score {risk_review['risk_score']}/100
  Volatility: {risk_review['volatility_assessment']}
  Exposure:   {risk_review['exposure_assessment']}

Risk level: {risk_level}

Synthesise the debate and call the final binding verdict.
Respond ONLY with this JSON (no markdown):
{{
  "agent": "Execution Agent",
  "decision": "<BUY|HOLD|SELL>",
  "confidence": <0-100>,
  "summary": "<2-3 sentence rationale>",
  "dissent": "<notable dissent or None>",
  "execution_note": "<brief sizing/timing note>"
}}"""
            result = gl.nondet.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "")
            return result

        raw    = gl.eq_principle.prompt_comparative(
            call,
            "Responses must agree on decision (BUY/HOLD/SELL) and confidence within 15 points",
        )
        output = self._parse_json(raw)
        d = output.get("decision", "HOLD").upper()
        output["decision"]   = d if d in ("BUY", "HOLD", "SELL") else "HOLD"
        output["confidence"] = max(0, min(100, int(output.get("confidence", 50))))
        return output

    # ── paper trade ──────────────────────────────────────────────────────────────

    def _execute_paper_trade(self, portfolio, decision, asset, market, position_pct, price):
        trade = {}
        if decision == "BUY" and price > 0:
            allocation = portfolio["cash"] * (position_pct / 100.0)
            allocation = min(allocation, portfolio["cash"])
            if allocation > 0:
                trade = {
                    "pair":        asset,
                    "direction":   "BUY",
                    "market":      market,
                    "entry_price": price,
                    "quantity":    allocation / price,
                    "allocation":  allocation,
                    "status":      "open",
                    "pnl":         0.0,
                }
                portfolio["cash"] -= allocation
                portfolio["open_positions"].append(trade)

        elif decision == "SELL":
            remaining = []
            for pos in portfolio["open_positions"]:
                if pos["pair"] == asset and pos["direction"] == "BUY" and price > 0:
                    pnl = (price - pos["entry_price"]) * pos["quantity"]
                    pos.update({"pnl": pnl, "exit_price": price, "status": "closed"})
                    portfolio["cash"] += pos["allocation"] + pnl
                    portfolio["closed_positions"].append(pos)
                    portfolio["wins" if pnl >= 0 else "losses"] += 1
                    trade = pos
                else:
                    remaining.append(pos)
            portfolio["open_positions"] = remaining

        open_val = sum(p["allocation"] for p in portfolio["open_positions"])
        portfolio["equity"]           = portfolio["cash"] + open_val
        portfolio["total_return_pct"] = (
            (portfolio["equity"] - STARTING_EQUITY) / STARTING_EQUITY * 100
        )
        return trade

    # ── public write ─────────────────────────────────────────────────────────────

    @gl.public.write
    def convene(self, asset: str, market: str,
                position_pct: str, risk_level: str) -> None:
        sender = str(gl.message.sender_address)  # fixed: was sender_account

        asset      = asset.upper()
        market     = market.lower()     if market.lower()     in ("spot", "futures")                          else "spot"
        risk_level = risk_level.lower() if risk_level.lower() in ("conservative", "moderate", "aggressive")   else "moderate"
        pos_pct    = max(1.0, min(100.0, float(position_pct)))
        if asset not in COINGECKO_IDS:
            asset = "BTCUSDT"

        self._track_owner(sender)
        session_id = f"{sender}_{int(self.total_sessions)}"

        md             = self._fetch_market_data(asset)
        technical      = self._run_technical_analyst(md, risk_level)
        news           = self._run_news_analyst(md, risk_level)
        quant          = self._run_quant_analyst(md, risk_level)
        agent_outputs  = [technical, news, quant]
        risk_review    = self._run_risk_manager(md, agent_outputs, pos_pct, risk_level)

        vote_counts = {"BUY": 0, "HOLD": 0, "SELL": 0}
        for a in agent_outputs:
            v = a.get("vote", "HOLD")
            if v in vote_counts:
                vote_counts[v] += 1

        if risk_review.get("veto", False):
            session = {
                "session_id":     session_id,
                "owner":          sender,
                "asset":          asset,
                "market":         market,
                "position_pct":   pos_pct,
                "risk_level":     risk_level,
                "price":          md["price"],
                "change_24h":     md["change_24h"],
                "agent_outputs":  agent_outputs,
                "risk_review":    risk_review,
                "decision":       "VETOED",
                "confidence":     0,
                "summary":        f"Risk Manager veto: {risk_review.get('reasoning', '')}",
                "dissent":        "",
                "vote_breakdown": vote_counts,
                "paper_trade":    {},
                "status":         "vetoed",
            }
            self.sessions[session_id]   = json.dumps(session)
            self.total_sessions        += 1
            ow = self._owner_sessions(sender)
            ow.append(session_id)
            self.owner_sessions[sender] = json.dumps(ow)
            return

        execution = self._run_execution_agent(md, agent_outputs, risk_review, market, risk_level)
        decision  = execution.get("decision", "HOLD")

        portfolio = self._get_portfolio(sender)
        portfolio["total_sessions"] += 1
        trade = self._execute_paper_trade(portfolio, decision, asset, market, pos_pct, md["price"])
        self._save_portfolio(sender, portfolio)

        session = {
            "session_id":     session_id,
            "owner":          sender,
            "asset":          asset,
            "market":         market,
            "position_pct":   pos_pct,
            "risk_level":     risk_level,
            "price":          md["price"],
            "change_24h":     md["change_24h"],
            "volume_24h":     md["volume_24h"],
            "agent_outputs":  agent_outputs,
            "risk_review":    risk_review,
            "execution":      execution,
            "decision":       decision,
            "confidence":     execution.get("confidence", 0),
            "summary":        execution.get("summary", ""),
            "dissent":        execution.get("dissent", ""),
            "execution_note": execution.get("execution_note", ""),
            "vote_breakdown": vote_counts,
            "paper_trade":    trade,
            "status":         "complete",
        }
        self.sessions[session_id]   = json.dumps(session)
        self.total_sessions        += 1
        ow = self._owner_sessions(sender)
        ow.append(session_id)
        self.owner_sessions[sender] = json.dumps(ow)

    # ── public views ─────────────────────────────────────────────────────────────

    @gl.public.view
    def get_session(self, session_id: str) -> str:
        if session_id in self.sessions:
            return self.sessions[session_id]
        return json.dumps(None)

    @gl.public.view
    def get_portfolio(self, address: str) -> str:
        return json.dumps(self._get_portfolio(address))

    @gl.public.view
    def get_history(self, address: str, n: u256) -> str:
        ids    = self._owner_sessions(address)
        result = []
        for sid in reversed(ids):
            if sid in self.sessions:
                result.append(json.loads(self.sessions[sid]))
            if len(result) >= int(n):
                break
        return json.dumps(result)

    @gl.public.view
    def get_leaderboard(self, n: u256) -> str:
        entries = []
        for addr in self._all_owners():
            p = self._get_portfolio(addr)
            entries.append({
                "owner":            addr,
                "equity":           p["equity"],
                "total_return_pct": p["total_return_pct"],
                "total_sessions":   p["total_sessions"],
                "wins":             p["wins"],
                "losses":           p["losses"],
                "win_rate": (
                    p["wins"] / p["total_sessions"] * 100
                    if p["total_sessions"] > 0 else 0.0
                ),
            })
        entries.sort(key=lambda x: x["total_return_pct"], reverse=True)
        return json.dumps(entries[:int(n)])

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({"total_sessions": int(self.total_sessions)})
