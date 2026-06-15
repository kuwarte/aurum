create table assessments (
  id uuid default gen_random_uuid() primary key,
  wallet_address text not null,
  credit_score integer,
  risk_tier text,
  default_prob_30d float,
  sub_scores jsonb,
  shap_breakdown jsonb,
  fraud_score float,
  fraud_flags jsonb,
  tx_hash text,
  attestation_hash text,
  loan_offers jsonb,
  created_at timestamp with time zone default now()
);
