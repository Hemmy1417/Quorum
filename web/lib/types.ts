export interface AgentOutput {
  agent:      string;
  analysis:   string;
  vote:       "BUY" | "HOLD" | "SELL";
  confidence: number;
  reasoning:  string;
  sentiment?: string;
  regime?:    string;
  key_levels?: string;
}

export interface RiskReview {
  agent:                 string;
  risk_score:            number;
  veto:                  boolean;
  volatility_assessment: string;
  exposure_assessment:   string;
  reasoning:             string;
  recommendation:        string;
}

export interface ExecutionOutput {
  agent:          string;
  decision:       "BUY" | "HOLD" | "SELL";
  confidence:     number;
  summary:        string;
  dissent:        string;
  execution_note: string;
}

export interface Trade {
  action:      "BUY" | "SELL" | "HOLD";
  price:       number;
  size:        number;
  usdt_amount: number;
  pnl?:        number;
}

export interface Session {
  session_id:     string;
  owner:          string;
  asset:          string;
  market:         string;
  position_pct:   number;
  risk_level:     string;
  price:          number;
  change_24h:     number;
  volume_24h?:    number;
  agent_outputs:  AgentOutput[];
  risk_review:    RiskReview;
  execution?:     ExecutionOutput;
  decision:       "BUY" | "HOLD" | "SELL" | "VETOED";
  confidence:     number;
  summary:        string;
  dissent?:       string;
  execution_note?: string;
  vote_breakdown: { BUY: number; HOLD: number; SELL: number };
  trade?:         Trade;
  timestamp?:     string;
  status:         "complete" | "vetoed";
}

export interface Holding {
  qty:       number;
  avg_price: number;
}

export interface Portfolio {
  owner:             string;
  equity:            number;
  cash:              number;
  holdings?:         Record<string, Holding>;
  open_positions?:   Trade[];
  closed_positions?: Trade[];
  total_return_pct:  number;
  total_sessions:    number;
  wins:              number;
  losses:            number;
}

export interface LeaderboardEntry {
  owner:            string;
  equity:           number;
  total_return_pct: number;
  total_sessions:   number;
  wins:             number;
  losses:           number;
  win_rate:         number;
}

export interface Stats {
  total_sessions: number;
}
