-- Migration 002: add credential_active flag to assessments
-- Run this in Supabase SQL editor if the column doesn't exist yet.

alter table assessments
  add column if not exists credential_active boolean default true;
