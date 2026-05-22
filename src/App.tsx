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
  const [currentRole, setCurrentRole] = useState<'staff' | 'manager' | 'director'>('staff');

  // Load initial data
  useEffect(() => {
    const initData = async () => {
      const loadedAgents = await dbService.getAgents();
      setAgents(loadedAgents);

      const loadedChats = await dbService.getChats();
      setChats(loadedChats);

      if (loadedChats.length > 0) {
        // Find first chat of the default role (staff)
        const defaultRoleChats = loadedChats.filter((c) => c.role === 'staff' || !c.role);
        if (defaultRoleChats.length > 0) {
          setCurrentChatId(defaultRoleChats[0].id);
        } else {
          setCurrentChatId(null);
        }
      }
    };
    initData();
  }, []);

  // Load messages whenever current chat changes
  useEffect(() => {
    let isCurrent = true;
    setMessages([]); // Clear messages immediately to avoid showing old chat history

    if (currentChatId) {
      const loadMessages = async () => {
        const loadedMessages = await dbService.getMessages(currentChatId);
        if (isCurrent) {
          setMessages(loadedMessages);
        }
      };
      loadMessages();
    }

    return () => {
      isCurrent = false;
    };
  }, [currentChatId]);

  // Find active chat and active agent details
  const currentChat = chats.find((c) => c.id === currentChatId) || null;
  const roleAgents = agents.filter((a) => a.role === currentRole || (!a.role && currentRole === 'staff'));
  const activeAgent =
    roleAgents.find((a) => a.id === currentChat?.active_agent_id) ||
    roleAgents[0] ||
    null;

  // Sync active agent in chat record if it was null or defaulted
  useEffect(() => {
    if (currentChat && !currentChat.active_agent_id && activeAgent) {
      handleSelectAgent(activeAgent.id);
    }
  }, [currentChatId, activeAgent]);

  // Handle role switching
  const handleRoleChange = (role: 'staff' | 'manager' | 'director') => {
    setCurrentRole(role);

    // Auto-select the first conversation of the new role (if exists)
    const roleChats = chats.filter((c) => c.role === role || (!c.role && role === 'staff'));
    if (roleChats.length > 0) {
      setCurrentChatId(roleChats[0].id);
    } else {
      setCurrentChatId(null);
    }

    // Role-specific theme colors for the confetti burst
    const colors =
      role === 'staff' ? ['#06b6d4', '#3b82f6'] :
        role === 'manager' ? ['#10b981', '#84cc16'] :
          ['#d946ef', '#f43f5e'];

    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.9, x: 0.15 }, // Trigger near the role switcher
      colors: colors,
    });
  };

  // Create a new conversation
  const handleCreateChat = async () => {
    const defaultAgent = roleAgents[0] || null;
    const currentRoleChats = chats.filter((c) => c.role === currentRole || (!c.role && currentRole === 'staff'));
    const title = `New Session ${currentRoleChats.length + 1}`;
    const newChat = await dbService.createChat(title, defaultAgent?.id, currentRole);

    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);

    // Dynamic confetti colors based on role
    const colors =
      currentRole === 'staff' ? ['#06b6d4', '#3b82f6'] :
        currentRole === 'manager' ? ['#10b981', '#84cc16'] :
          ['#d946ef', '#f43f5e'];

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: colors,
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

    setChats((prev) => {
      const updatedChats = prev.filter((c) => c.id !== id);
      if (currentChatId === id) {
        const remainingChats = updatedChats.filter(
          (c) => c.role === currentRole || (!c.role && currentRole === 'staff')
        );
        setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
      return updatedChats;
    });
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

      const newChat = await dbService.createChat(title, agentId, currentRole);
      setChats((prev) => prev.map((c) => (c.id === currentChatId ? newChat : c)));
      setCurrentChatId(newChat.id);
    }
  };

  // Save or edit Agent configuration
  const handleSaveAgent = async (agentData: Omit<Agent, 'id'> & { id?: string }) => {
    const dataWithRole = {
      ...agentData,
      role: agentData.role || currentRole,
    };
    await dbService.saveAgent(dataWithRole);
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
    userMessageText: string,
    onChunk?: (text: string) => void
  ): Promise<string> => {
    const { api_provider, api_endpoint, api_key, model_name, system_instruction } = agent;

    if (api_provider === 'mock') {
      // Mock Simulation response
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockResponses = [
        `I am **${agent.name}** (API Provider: Mock). I received your message: "${userMessageText}".\n\nHere is a list of things we can test:\n* Chat persistence\n* Switching agents mid-chat (try picking another agent in the header!)\n* Custom system prompts\n\n\`\`\`javascript\nconsole.log("Mock Response Executed Successfully!");\n\`\`\``,
        `Hello there! This is a mock response simulated locally inside your browser.\n\nTo query a live AI model, click the **Edit** icon next to this agent in the sidebar, input a valid **Gemini** or **OpenAI** API key, and click save.`,
        `Understood! My system prompt is: \`"${system_instruction || 'None'}"\`.\n\nLet me know if there's anything else you would like to mock!`,
      ];
      const text = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      if (onChunk) {
        const words = text.split(' ');
        let accumulated = '';
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i] + (i === words.length - 1 ? '' : ' ');
          accumulated += chunk;
          onChunk(chunk);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        return accumulated;
      }
      return text;
    }

    if (!api_key) {
      throw new Error('API Key is missing for this agent.');
    }

    // 1. GEMINI API CALL
    if (api_provider === 'gemini') {
      const endpointUrl = `${api_endpoint || 'https://generativelanguage.googleapis.com/v1beta'
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
      const endpointUrl = `${api_endpoint || 'https://api.openai.com/v1'
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
      let endpointUrl = api_endpoint || 'https://genai.softnix.ai/external/api/chat-messages';

      // Proxy default Softnix URLs to avoid CORS errors in browser/Netlify
      if (endpointUrl.startsWith('https://genai.softnix.ai/external/api')) {
        endpointUrl = endpointUrl.replace('https://genai.softnix.ai/external/api', '/api/softnix');
      }

      // Toggle this flag to switch between streaming and blocking modes
      const useStreaming = false;

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
          response_mode: useStreaming ? 'streaming' : 'blocking',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `HTTP ${response.status} Error`);
      }

      if (useStreaming && onChunk && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === '[DONE]') continue;

              try {
                const data = JSON.parse(dataStr);
                if (data.event === 'message' && data.answer) {
                  fullText += data.answer;
                  onChunk(data.answer);
                }
              } catch (e) {
                // Ignore parsing errors for partial/incomplete lines
              }
            }
          }
        }

        if (!fullText) {
          throw new Error('Received empty response from Softnix API.');
        }
        return fullText;
      } else {
        const resJson = await response.json();
        const text = resJson.answer || resJson.text || resJson.message;
        if (!text) {
          throw new Error('Received empty response from Softnix API.');
        }
        return text;
      }
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

    // Create a temporary message placeholder for the streaming response
    const tempAgentMsgId = 'temp-' + Date.now();
    const placeholderMsg: Message = {
      id: tempAgentMsgId,
      chat_id: currentChatId,
      sender: 'agent',
      agent_id: activeAgent.id,
      agent_name: activeAgent.name,
      content: '',
      created_at: new Date().toISOString(),
    };

    // Render the placeholder message
    setMessages((prev) => [...prev, placeholderMsg]);

    try {
      // 2. Query Agent API with chunk callback
      let streamedContent = '';
      const replyText = await queryAgentAPI(activeAgent, messages, text, (chunk) => {
        streamedContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAgentMsgId ? { ...msg, content: streamedContent } : msg
          )
        );
      });

      // 3. Save Agent response
      const agentMsg = await dbService.saveMessage({
        chat_id: currentChatId,
        sender: 'agent',
        agent_id: activeAgent.id,
        agent_name: activeAgent.name,
        content: replyText,
      });

      // Update message list, replacing the temp placeholder with the saved message
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempAgentMsgId ? agentMsg : msg))
      );

      // If this was the first message in the conversation, rename the chat title!
      if (messages.length === 0 && currentChat) {
        const shortTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
        const updatedChat = { ...currentChat, title: shortTitle };
        setChats((prev) =>
          prev.map((c) => (c.id === currentChatId ? updatedChat : c))
        );
        // Rename in database (update existing chat title, don't create a new one)
        dbService.updateChatTitle(currentChatId, shortTitle);
      }
    } catch (err: any) {
      console.error(err);

      // Remove the temporary message placeholder on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempAgentMsgId));

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
    <div className={`app-container theme-${currentRole}`}>
      <Sidebar
        chats={chats.filter((c) => c.role === currentRole || (!c.role && currentRole === 'staff'))}
        agents={agents.filter((a) => a.role === currentRole || (!a.role && currentRole === 'staff'))}
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
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
      />

      <ChatArea
        chat={currentChat}
        messages={messages}
        agents={agents.filter((a) => a.role === currentRole || (!a.role && currentRole === 'staff'))}
        activeAgent={activeAgent}
        isGenerating={isGenerating}
        onSendMessage={handleSendMessage}
        onChangeAgent={handleSelectAgent}
        onClearHistory={handleClearHistory}
        currentRole={currentRole}
      />


      <AgentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgent(null);
        }}
        onSave={handleSaveAgent}
        editingAgent={editingAgent}
        currentRole={currentRole}
      />
    </div>
  );
}
