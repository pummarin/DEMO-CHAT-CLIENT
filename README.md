# Antigravity Chat Client 🚀

A modern, high-fidelity chat client built with **React**, **TypeScript**, and **Vite**, styled with custom **Vanilla CSS** to deliver a premium glassmorphic dark interface. 

It connects directly to external agent APIs (Gemini, OpenAI, or compatible custom JSON endpoints), allows you to **switch agents mid-conversation**, start **new chat sessions**, and sync data seamlessly with **Supabase** (with a secure **LocalStorage fallback** for out-of-the-box operation).

---

## Key Features

*   🔄 **Switch Agents Mid-Conversation**: Change the responding agent on the fly. Each message bubble stores the identity of the agent that generated it.
*   ☁️ **Supabase Sync + Local Fallback**: Real-time cloud sync when configured, or auto-fallback to browser `localStorage` if environment variables are empty.
*   💎 **Premium Glassmorphic UI**: High-fidelity dark mode with neon gradients, smooth micro-interactions, floating bubbles, and custom scrollbars.
*   📝 **Rich Markdown Rendering**: Clean display of bold text, bullet points, headers, lists, and formatted code blocks with a **Copy Code** button.
*   ⚡ **API Presets**: Easy configurations for **Gemini API** and **OpenAI API** with automatic base URL and model name populating.
*   💥 **Celebration Animations**: Dynamic confetti animations when starting a new conversation session.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Database Configuration (Supabase)

To enable cloud synchronization:

1.  Run the SQL script inside [`supabase_schema.sql`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/supabase_schema.sql) in your Supabase SQL editor.
2.  Copy [`.env.example`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/.env.example) to `.env`:
    ```bash
    cp .env.example .env
    ```
3.  Add your Supabase Project URL and Anon API Key:
    ```env
    VITE_SUPABASE_URL=https://your-project-id.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key-here
    ```
4.  Restart the development server. The database indicator in the bottom-left sidebar will change to **Supabase Active**.

---

## File Structure

*   [`supabase_schema.sql`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/supabase_schema.sql) - Database Schema Setup script.
*   [`src/supabaseClient.ts`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/src/supabaseClient.ts) - Supabase initialization check.
*   [`src/dbService.ts`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/src/dbService.ts) - Unified database operations adapter.
*   [`src/components/Sidebar.tsx`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/src/components/Sidebar.tsx) - Left sidebar listing chats, agents, and cloud sync indicators.
*   [`src/components/ChatArea.tsx`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/src/components/ChatArea.tsx) - Active chat feed, active agent selector, and message input.
*   [`src/components/AgentModal.tsx`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/src/components/AgentModal.tsx) - Dialog form to manage agent profiles and keys.
*   [`src/App.tsx`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/src/App.tsx) - Main entry point and LLM REST fetch routing.
*   [`src/index.css`](file:///home/pummain/Documents/DEMO%20CHAT%20CLIENT/src/index.css) - Custom design system tokens and glassmorphism styling.
