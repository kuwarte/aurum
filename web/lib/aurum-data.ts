export const scoreSnapshot = {
  score: 782,
  tier: "Aurum Prime",
  delta: 26,
};

export const agentStatuses = [
  {
    name: "Wallet Behavior Agent",
    summary: "Tracking balance stability and payment rhythm",
    state: "Healthy",
    confidence: 96,
    updatedAt: "18s ago",
  },
  {
    name: "Oracle Integrity Agent",
    summary: "Watching collateral feeds and freshness thresholds",
    state: "Stable",
    confidence: 93,
    updatedAt: "12s ago",
  },
  {
    name: "Exposure Monitor Agent",
    summary: "Reviewing leverage, utilization, and drawdown posture",
    state: "Reviewing",
    confidence: 78,
    updatedAt: "27s ago",
  },
  {
    name: "RWA Quality Agent",
    summary: "Scanning asset backing, yield, and liquidity windows",
    state: "Healthy",
    confidence: 91,
    updatedAt: "42s ago",
  },
];

export const scoreHistory = [
  { label: "Feb", score: 648 },
  { label: "Mar", score: 681 },
  { label: "Apr", score: 719 },
  { label: "May", score: 756 },
  { label: "Jun", score: 782 },
];

export const shapFactors = [
  {
    label: "Repayment consistency",
    impact: 34,
    reason: "Recurring obligations were met on time with stable wallet liquidity.",
  },
  {
    label: "Collateral diversity",
    impact: 21,
    reason: "The portfolio mixes liquid tokens with treasury-style RWA exposure.",
  },
  {
    label: "Oracle stress",
    impact: -14,
    reason: "Recent volatility in one collateral feed slightly reduced confidence.",
  },
  {
    label: "Utilization ratio",
    impact: -9,
    reason: "Borrow utilization is still elevated compared with ideal range.",
  },
  {
    label: "Wallet longevity",
    impact: 17,
    reason: "A longer transaction history gave the agents more stable evidence.",
  },
];

export const loanOffers = [
  {
    lender: "Aurum Flow Desk",
    tag: "Featured match",
    summary:
      "Best blended offer for a high-confidence wallet with explainable collateral backing.",
    apr: "7.1%",
    tenor: "12 months",
    amount: "$24,000",
    collateral: "1.4x",
    featured: true,
    highlights: ["Fast settlement", "Oracle protected", "Flexible prepay"],
  },
  {
    lender: "Casper Yield Pool",
    tag: "Stable capital",
    summary:
      "Lower ceiling with stronger protection bands for conservative treasury-backed lending.",
    apr: "6.4%",
    tenor: "9 months",
    amount: "$16,500",
    collateral: "1.6x",
    featured: false,
    highlights: ["Treasury weighted", "Lower volatility", "Covenant alerts"],
  },
  {
    lender: "Greenline Credit Vault",
    tag: "Growth option",
    summary:
      "A higher-flex offer designed for wallets showing accelerating score momentum.",
    apr: "8.3%",
    tenor: "18 months",
    amount: "$31,000",
    collateral: "1.8x",
    featured: false,
    highlights: ["Longer tenor", "Score-linked repricing", "Agent monitoring"],
  },
  {
    lender: "Pistachio RWA Syndicate",
    tag: "RWA boosted",
    summary:
      "Optimized for borrowers whose portfolio includes tokenized real-world assets.",
    apr: "6.9%",
    tenor: "10 months",
    amount: "$22,400",
    collateral: "1.5x",
    featured: false,
    highlights: ["RWA aware", "Invoice collateral", "Yield-sensitive"],
  },
];

export const portfolioAllocations = [
  { label: "Tokenized treasuries", value: 42 },
  { label: "Invoice receivables", value: 24 },
  { label: "Commodity notes", value: 18 },
  { label: "Cash equivalents", value: 16 },
];

export const portfolioHoldings = [
  {
    name: "Atlas Treasury Series",
    type: "Government debt",
    summary: "Short-duration tokenized treasuries providing defensive yield and high monitor confidence.",
    value: "$49,700",
    yield: "5.3%",
  },
  {
    name: "Northstar Invoice Pool",
    type: "Receivables",
    summary: "Diversified invoice-backed notes adding predictable cash flow to collateral quality.",
    value: "$28,400",
    yield: "8.6%",
  },
  {
    name: "Helio Metals Basket",
    type: "Commodities",
    summary: "Gold-linked reserve exposure supporting downside resilience during market stress.",
    value: "$21,900",
    yield: "4.7%",
  },
  {
    name: "Emerald Cash Reserve",
    type: "Cash management",
    summary: "High-liquidity instruments reserved for quick coverage and smoother loan posture.",
    value: "$18,400",
    yield: "3.1%",
  },
];
