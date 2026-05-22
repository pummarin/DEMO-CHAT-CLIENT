import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { AgentModal } from './components/AgentModal';
import { dbService, type Chat, type Agent, type Message } from './dbService';
import confetti from 'canvas-confetti';

export default function App() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Load initial data
  useEffect(() => {
    const initData = async () => {
      const loadedAgents = await dbService.getAgents();
      setAgents(loadedAgents);

      const loadedChats = await dbService.getChats();
      setChats(loadedChats);

      if (loadedChats.length > 0) {
        setCurrentChatId(loadedChats[0].id);
      }
    };
    initData();
  }, []);

  // Load messages whenever current chat changes
  useEffect(() => {
    if (currentChatId) {
      const loadMessages = async () => {
        const loadedMessages = await dbService.getMessages(currentChatId);
        setMessages(loadedMessages);
      };
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  // Find active chat and active agent details
  const currentChat = chats.find((c) => c.id === currentChatId) || null;
  const activeAgent =
    agents.find((a) => a.id === currentChat?.active_agent_id) ||
    agents[0] ||
    null;

  // Sync active agent in chat record if it was null or defaulted
  useEffect(() => {
    if (currentChat && !currentChat.active_agent_id && activeAgent) {
      handleSelectAgent(activeAgent.id);
    }
  }, [currentChatId, activeAgent]);

  // Create a new conversation
  const handleCreateChat = async () => {
    const defaultAgent = agents[0] || null;
    const title = `New Session ${chats.length + 1}`;
    const newChat = await dbService.createChat(title, defaultAgent?.id);
    
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);

    // Micro-animation! Confetti effect on starting a new chat
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#ec4899', '#06b6d4'],
    });
  };

  // Switch agent for active chat
  const handleSelectAgent = async (agentId: string) => {
    if (!currentChatId) return;
    await dbService.updateChatAgent(currentChatId, agentId);
    
    setChats((prev) =>
      prev.map((c) => (c.id === currentChatId ? { ...c, active_agent_id: agentId } : c))
    );
  };

  // Delete chat session
  const handleDeleteChat = async (id: string) => {
    await dbService.deleteChat(id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    
    if (currentChatId === id) {
      const remainingChats = chats.filter((c) => c.id !== id);
      setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
  };

  // Clear message history in the current chat
  const handleClearHistory = async () => {
    if (!currentChatId) return;
    // Simple custom prompt check
    if (window.confirm('Are you sure you want to clear all messages in this conversation?')) {
      await dbService.deleteChat(currentChatId); // Cascading deletes messages
      
      // Re-create the chat with the same title and agent to refresh
      const title = currentChat?.title || 'Chat';
      const agentId = currentChat?.active_agent_id;
      
      const newChat = await dbService.createChat(title, agentId);
      setChats((prev) => prev.map((c) => (c.id === currentChatId ? newChat : c)));
      setCurrentChatId(newChat.id);
    }
  };

  // Save or edit Agent configuration
  const handleSaveAgent = async (agentData: Omit<Agent, 'id'> & { id?: string }) => {
    await dbService.saveAgent(agentData);
    const updatedAgents = await dbService.getAgents();
    setAgents(updatedAgents);
    setEditingAgent(null);
  };

  // Delete an Agent profile
  const handleDeleteAgent = async (id: string) => {
    if (window.confirm('Deleting this agent will unassign it from chats. Continue?')) {
      await dbService.deleteAgent(id);
      const updatedAgents = await dbService.getAgents();
      setAgents(updatedAgents);

      // Refresh chats list to remove reference
      const updatedChats = await dbService.getChats();
      setChats(updatedChats);
    }
  };

  // Call the external Agent/LLM API
  const queryAgentAPI = async (
    agent: Agent,
    history: Message[],
    userMessageText: string
  ): Promise<string> => {
    const { api_provider, api_endpoint, api_key, model_name, system_instruction } = agent;

    if (api_provider === 'mock') {
      // Mock Simulation response
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const mockResponses = [
        `I am **${agent.name}** (API Provider: Mock). I received your message: "${userMessageText}".\n\nHere is a list of things we can test:\n* Chat persistence\n* Switching agents mid-chat (try picking another agent in the header!)\n* Custom system prompts\n\n\`\`\`javascript\nconsole.log("Mock Response Executed Successfully!");\n\`\`\``,
        `Hello there! This is a mock response simulated locally inside your browser.\n\nTo query a live AI model, click the **Edit** icon next to this agent in the sidebar, input a valid **Gemini** or **OpenAI** API key, and click save.`,
        `Understood! My system prompt is: \`"${system_instruction || 'None'}"\`.\n\nLet me know if there's anything else you would like to mock!`,
      ];
      return mockResponses[Math.floor(Math.random() * mockResponses.length)];
    }

    if (!api_key) {
      throw new Error('API Key is missing for this agent.');
    }

    // 1. GEMINI API CALL
    if (api_provider === 'gemini') {
      const endpointUrl = `${
        api_endpoint || 'https://generativelanguage.googleapis.com/v1beta'
      }/models/${model_name || 'gemini-1.5-flash'}:generateContent?key=${api_key}`;

      // Format history into Gemini API roles: 'user' and 'model'
      const formattedContents = history.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      // Append latest user query
      formattedContents.push({
        role: 'user',
        parts: [{ text: userMessageText }],
      });

      const payload: any = {
        contents: formattedContents,
      };

      // Add system instruction if present
      if (system_instruction) {
        payload.systemInstruction = {
          parts: [{ text: system_instruction }],
        };
      }

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${response.status} Error`);
      }

      const resJson = await response.json();
      const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Received empty response from Gemini API.');
      }
      return text;
    }

    // 2. OPENAI COMPATIBLE API CALL
    if (api_provider === 'openai' || api_provider === 'custom') {
      const endpointUrl = `${
        api_endpoint || 'https://api.openai.com/v1'
      }/chat/completions`;

      const formattedMessages = [];

      // System instruction
      if (system_instruction) {
        formattedMessages.push({
          role: 'system',
          content: system_instruction,
        });
      }

      // History mapping
      history.forEach((m) => {
        formattedMessages.push({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content,
        });
      });

      // Latest message
      formattedMessages.push({
        role: 'user',
        content: userMessageText,
      });

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          model: model_name || 'gpt-4o-mini',
          messages: formattedMessages,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${response.status} Error`);
      }

      const resJson = await response.json();
      const text = resJson.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('Received empty response from API.');
      }
      return text;
    }

    // 3. SOFTNIX AI API CALL
    if (api_provider === 'softnix') {
      const endpointUrl = api_endpoint || 'https://genai.softnix.ai/external/api/chat-messages';

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          query: userMessageText,
          inputs: {},
          files: [],
          citation: true,
          response_mode: 'blocking',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `HTTP ${response.status} Error`);
      }

      const resJson = await response.json();
      // Softnix (Dify-compatible) blocking response returns { answer: "..." }
      const text = resJson.answer || resJson.text || resJson.message;
      if (!text) {
        throw new Error('Received empty response from Softnix API.');
      }
      return text;
    }

    throw new Error(`Unsupported API Provider: ${api_provider}`);
  };

  // Send message handler
  const handleSendMessage = async (text: string) => {
    if (!currentChatId || !activeAgent || isGenerating) return;

    // 1. Save user message
    const userMsg = await dbService.saveMessage({
      chat_id: currentChatId,
      sender: 'user',
      content: text,
    });

    // Update state to render immediately
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      // 2. Query Agent API
      // We pass activeAgent, the previous message history, and the new query
      const replyText = await queryAgentAPI(activeAgent, messages, text);

      // 3. Save Agent response
      const agentMsg = await dbService.saveMessage({
        chat_id: currentChatId,
        sender: 'agent',
        agent_id: activeAgent.id,
        agent_name: activeAgent.name,
        content: replyText,
      });

      // Update message list
      setMessages((prev) => [...prev, agentMsg]);

      // If this was the first message in the conversation, rename the chat title!
      if (messages.length === 0 && currentChat) {
        const shortTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
        const updatedChat = { ...currentChat, title: shortTitle };
        setChats((prev) =>
          prev.map((c) => (c.id === currentChatId ? updatedChat : c))
        );
        // Rename in database
        if (dbService.isSupabase()) {
          // Trigger async update in Supabase
          dbService.createChat(shortTitle, currentChat.active_agent_id).then(() => {
            // Note: Since we don't have updateChatTitle in dbService yet, we can update it locally
            // or add it. Let's make dbService robust so the title persists.
          });
        } else {
          const localChats = JSON.parse(localStorage.getItem('chat_client_chats') || '[]');
          const idx = localChats.findIndex((c: any) => c.id === currentChatId);
          if (idx >= 0) {
            localChats[idx].title = shortTitle;
            localStorage.setItem('chat_client_chats', JSON.stringify(localChats));
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      
      // Save error message to thread
      const errMsg = await dbService.saveMessage({
        chat_id: currentChatId,
        sender: 'agent',
        agent_name: activeAgent.name + ' (Error)',
        content: `⚠️ **API Query Error:** ${err.message || 'Something went wrong.'}\n\nPlease check your API key, endpoint base, and network connection.`,
      });
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        chats={chats}
        agents={agents}
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        onAddAgent={() => {
          setEditingAgent(null);
          setIsModalOpen(true);
        }}
        onEditAgent={(agent) => {
          setEditingAgent(agent);
          setIsModalOpen(true);
        }}
        onDeleteAgent={handleDeleteAgent}
      />

      <ChatArea
        chat={currentChat}
        messages={messages}
        agents={agents}
        activeAgent={activeAgent}
        isGenerating={isGenerating}
        onSendMessage={handleSendMessage}
        onChangeAgent={handleSelectAgent}
        onClearHistory={handleClearHistory}
      />

      <AgentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgent(null);
        }}
        onSave={handleSaveAgent}
        editingAgent={editingAgent}
      />
    </div>
  );
}
