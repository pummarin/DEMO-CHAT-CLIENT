-- Supabase Schema for Multi-Agent Chat Client
-- Copy and paste this script into your Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AGENTS TABLE
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_provider TEXT NOT NULL CHECK (api_provider IN ('gemini', 'openai', 'custom', 'mock')),
    api_endpoint TEXT,
    api_key TEXT,
    model_name TEXT,
    system_instruction TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHATS TABLE
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    active_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
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

-- Insertion of a default Mock Agent so the database is not empty
INSERT INTO public.agents (name, api_provider, model_name, system_instruction)
VALUES (
    'Mock Assistant',
    'mock',
    'mock-v1',
    'You are a helpful Mock Agent that simulates responses to help test the UI.'
) ON CONFLICT DO NOTHING;
