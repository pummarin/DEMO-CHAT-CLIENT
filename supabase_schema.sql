-- Supabase Schema for Multi-Agent Chat Client
-- Copy and paste this script into your Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AGENTS TABLE
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_provider TEXT NOT NULL CHECK (api_provider IN ('gemini', 'openai', 'custom', 'mock', 'softnix')),
    api_endpoint TEXT,
    api_key TEXT,
    model_name TEXT,
    system_instruction TEXT,
    role TEXT CHECK (role IN ('staff', 'manager', 'director')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHATS TABLE
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    active_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    role TEXT CHECK (role IN ('staff', 'manager', 'director')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'agent')),
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    agent_name TEXT, -- Stores the name of the agent at the time of sending
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_active_agent_id ON public.chats(active_agent_id);

-- Disable Row Level Security (RLS) for testing simplicity,
-- or you can enable it and configure policies if building an authenticated app.
ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Insertion of default Mock Agents for each role
INSERT INTO public.agents (id, name, api_provider, model_name, role, system_instruction)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Staff Assistant', 'mock', 'mock-v1', 'staff', 'You are the Staff Assistant. You help staff members with daily operations, coding, documentation, and technical support. Keep answers detail-oriented, helpful, and highly practical.'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Manager Assistant', 'mock', 'mock-v1', 'manager', 'You are the Manager Assistant. You assist managers in project coordination, scheduling, reviewing team updates, managing risk, and streamlining workflows.'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'Director Assistant', 'mock', 'mock-v1', 'director', 'You are the Director Assistant. You advise directors on high-level strategy, business growth, organizational changes, executive communication, and strategic investments. Keep responses concise, leadership-focused, and highly professional.')
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  system_instruction = EXCLUDED.system_instruction;

-- ============================================================
-- MIGRATION: Run these commands if tables already exist
-- ============================================================

-- Step 1: Add role column to agents table if it doesn't exist
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('staff', 'manager', 'director'));

-- Step 2: Add role column to chats table if it doesn't exist
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('staff', 'manager', 'director'));

-- Step 3: Insert/update the default agents
INSERT INTO public.agents (id, name, api_provider, model_name, role, system_instruction)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Staff Assistant', 'mock', 'mock-v1', 'staff', 'You are the Staff Assistant. You help staff members with daily operations, coding, documentation, and technical support. Keep answers detail-oriented, helpful, and highly practical.'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Manager Assistant', 'mock', 'mock-v1', 'manager', 'You are the Manager Assistant. You assist managers in project coordination, scheduling, reviewing team updates, managing risk, and streamlining workflows.'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'Director Assistant', 'mock', 'mock-v1', 'director', 'You are the Director Assistant. You advise directors on high-level strategy, business growth, organizational changes, executive communication, and strategic investments. Keep responses concise, leadership-focused, and highly professional.')
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  system_instruction = EXCLUDED.system_instruction;
