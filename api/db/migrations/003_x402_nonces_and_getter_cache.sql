-- Migration 003: durable x402 replay protection and Casper getter cache.
-- Run this in the Supabase SQL editor before enabling production-like x402.

create table if not exists x402_used_nonces (
  nonce text primary key,
  payer_account text not null,
  receiver_account text not null,
  amount_cspr text not null,
  network text not null,
  payment_reference text,
  consumed_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null
);

create index if not exists x402_used_nonces_expires_at_idx
  on x402_used_nonces (expires_at);

create table if not exists casper_getter_cache (
  cache_key text primary key,
  value jsonb,
  deploy_hash text,
  updated_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null
);

create index if not exists casper_getter_cache_expires_at_idx
  on casper_getter_cache (expires_at);
