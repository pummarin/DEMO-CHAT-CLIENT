import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface Agent {
  id: string;
  name: string;
  api_provider: 'gemini' | 'openai' | 'custom' | 'mock';
  api_endpoint?: string;
  api_key?: string;
  model_name?: string;
  system_instruction?: string;
  created_at?: string;
}

export interface Chat {
  id: string;
  title: string;
  active_agent_id?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender: 'user' | 'agent';
  agent_id?: string;
  agent_name?: string;
  content: string;
  created_at?: string;
}

// Default Mock Agent to use when the database/localStorage is empty
const DEFAULT_MOCK_AGENT: Agent = {
  id: 'mock-agent-id-default',
  name: 'Mock Assistant',
  api_provider: 'mock',
  model_name: 'mock-v1',
  system_instruction: 'You are a helpful Mock Agent that simulates responses to help test the UI.',
};

// Helper for generating UUIDs in localStorage fallback mode
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// --- LOCAL STORAGE PROVIDER ---
const localStorageDb = {
  getAgents: (): Agent[] => {
    const data = localStorage.getItem('chat_client_agents');
    if (!data) {
      localStorage.setItem('chat_client_agents', JSON.stringify([DEFAULT_MOCK_AGENT]));
      return [DEFAULT_MOCK_AGENT];
    }
    return JSON.parse(data);
  },

  saveAgent: (agent: Omit<Agent, 'id'> & { id?: string }): Agent => {
    const agents = localStorageDb.getAgents();
    const newAgent: Agent = {
      ...agent,
      id: agent.id || generateUUID(),
      created_at: agent.created_at || new Date().toISOString(),
    };

    const index = agents.findIndex((a) => a.id === newAgent.id);
    if (index >= 0) {
      agents[index] = newAgent;
    } else {
      agents.push(newAgent);
    }

    localStorage.setItem('chat_client_agents', JSON.stringify(agents));
    return newAgent;
  },

  deleteAgent: (id: string): void => {
    let agents = localStorageDb.getAgents();
    agents = agents.filter((a) => a.id !== id);
    localStorage.setItem('chat_client_agents', JSON.stringify(agents));

    // Cleanup: Set active_agent_id to null in chats using this agent
    const chats = localStorageDb.getChats();
    const updatedChats = chats.map(c => c.active_agent_id === id ? { ...c, active_agent_id: undefined } : c);
    localStorage.setItem('chat_client_chats', JSON.stringify(updatedChats));
  },

  getChats: (): Chat[] => {
    const data = localStorage.getItem('chat_client_chats');
    return data ? JSON.parse(data) : [];
  },

  createChat: (title: string, activeAgentId?: string): Chat => {
    const chats = localStorageDb.getChats();
    const newChat: Chat = {
      id: generateUUID(),
      title,
      active_agent_id: activeAgentId,
      created_at: new Date().toISOString(),
    };
    chats.unshift(newChat); // Put new chat at top
    localStorage.setItem('chat_client_chats', JSON.stringify(chats));
    return newChat;
  },

  updateChatAgent: (chatId: string, agentId: string | undefined): void => {
    const chats = localStorageDb.getChats();
    const index = chats.findIndex((c) => c.id === chatId);
    if (index >= 0) {
      chats[index].active_agent_id = agentId;
      localStorage.setItem('chat_client_chats', JSON.stringify(chats));
    }
  },

  deleteChat: (id: string): void => {
    let chats = localStorageDb.getChats();
    chats = chats.filter((c) => c.id !== id);
    localStorage.setItem('chat_client_chats', JSON.stringify(chats));

    // Cascading delete messages
    const messages = localStorageDb.getAllMessages();
    const filteredMessages = messages.filter((m) => m.chat_id !== id);
    localStorage.setItem('chat_client_messages', JSON.stringify(filteredMessages));
  },

  getAllMessages: (): Message[] => {
    const data = localStorage.getItem('chat_client_messages');
    return data ? JSON.parse(data) : [];
  },

  getMessages: (chatId: string): Message[] => {
    const messages = localStorageDb.getAllMessages();
    return messages
      .filter((m) => m.chat_id === chatId)
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  },

  saveMessage: (message: Omit<Message, 'id'>): Message => {
    const messages = localStorageDb.getAllMessages();
    const newMessage: Message = {
      ...message,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    messages.push(newMessage);
    localStorage.setItem('chat_client_messages', JSON.stringify(messages));
    return newMessage;
  },
};

// --- UNIFIED DATABASE SERVICE ---
export const dbService = {
  isSupabase: (): boolean => {
    return isSupabaseConfigured;
  },

  // AGENTS
  getAgents: async (): Promise<Agent[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        return localStorageDb.getAgents();
      }
      return data || [];
    }
    return localStorageDb.getAgents();
  },

  saveAgent: async (agent: Omit<Agent, 'id'> & { id?: string }): Promise<Agent> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('agents')
        .upsert({
          id: agent.id || undefined,
          name: agent.name,
          api_provider: agent.api_provider,
          api_endpoint: agent.api_endpoint,
          api_key: agent.api_key,
          model_name: agent.model_name,
          system_instruction: agent.system_instruction,
        })
        .select()
        .single();
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        return localStorageDb.saveAgent(agent);
      }
      return data;
    }
    return localStorageDb.saveAgent(agent);
  },

  deleteAgent: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('agents').delete().eq('id', id);
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        localStorageDb.deleteAgent(id);
      }
      return;
    }
    localStorageDb.deleteAgent(id);
  },

  // CHATS
  getChats: async (): Promise<Chat[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        return localStorageDb.getChats();
      }
      return data || [];
    }
    return localStorageDb.getChats();
  },

  createChat: async (title: string, activeAgentId?: string): Promise<Chat> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('chats')
        .insert({ title, active_agent_id: activeAgentId || null })
        .select()
        .single();
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        return localStorageDb.createChat(title, activeAgentId);
      }
      return data;
    }
    return localStorageDb.createChat(title, activeAgentId);
  },

  updateChatAgent: async (chatId: string, agentId: string | undefined): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('chats')
        .update({ active_agent_id: agentId || null })
        .eq('id', chatId);
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        localStorageDb.updateChatAgent(chatId, agentId);
      }
      return;
    }
    localStorageDb.updateChatAgent(chatId, agentId);
  },

  deleteChat: async (id: string): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('chats').delete().eq('id', id);
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        localStorageDb.deleteChat(id);
      }
      return;
    }
    localStorageDb.deleteChat(id);
  },

  // MESSAGES
  getMessages: async (chatId: string): Promise<Message[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        return localStorageDb.getMessages(chatId);
      }
      return data || [];
    }
    return localStorageDb.getMessages(chatId);
  },

  saveMessage: async (message: Omit<Message, 'id'>): Promise<Message> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: message.chat_id,
          sender: message.sender,
          agent_id: message.agent_id || null,
          agent_name: message.agent_name || null,
          content: message.content,
        })
        .select()
        .single();
      if (error) {
        console.error('Supabase error, falling back to LocalStorage:', error);
        return localStorageDb.saveMessage(message);
      }
      return data;
    }
    return localStorageDb.saveMessage(message);
  },
};
