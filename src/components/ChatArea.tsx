import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, CornerDownLeft, Sparkles, Trash2, Copy, Check, MessageSquare, AlertCircle } from 'lucide-react';
import { type Chat, type Agent, type Message } from '../dbService';

interface ChatAreaProps {
  chat: Chat | null;
  messages: Message[];
  agents: Agent[];
  activeAgent: Agent | null;
  isGenerating: boolean;
  onSendMessage: (text: string) => void;
  onChangeAgent: (agentId: string) => void;
  onClearHistory: () => void;
  currentRole: 'staff' | 'manager' | 'director';
}

// A simple Markdown component to render LLM responses nicely
const Markdown: React.FC<{ content: string }> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Render text with simple markdown parsing (headers, lists, bold, inline code, paragraphs)
  const renderTextWithFormatting = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let parsedLine = line;

      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="md-h4">{line.substring(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="md-h3">{line.substring(3)}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="md-h2">{line.substring(2)}</h2>;
      }

      // Bullet points
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const cleanContent = line.trim().substring(2);
        return <li key={idx} className="md-li" dangerouslySetInnerHTML={{ __html: parseInline(cleanContent) }} />;
      }

      // Numbered lists
      const numListMatch = line.trim().match(/^(\d+)\.\s(.*)/);
      if (numListMatch) {
        return (
          <li key={idx} className="md-ol-li">
            <span className="md-ol-number">{numListMatch[1]}.</span>
            <span className="md-ol-content" dangerouslySetInnerHTML={{ __html: parseInline(numListMatch[2]) }} />
          </li>
        );
      }

      // Empty line -> break/spacing
      if (!line.trim()) {
        return <div key={idx} className="md-space" />;
      }

      // Standard paragraph
      return (
        <p
          key={idx}
          className="md-p"
          dangerouslySetInnerHTML={{ __html: parseInline(parsedLine) }}
        />
      );
    });
  };

  const parseInline = (text: string): string => {
    let html = text;
    // Escape simple HTML characters first to avoid injection
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold text **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic text *text* or _text_
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Inline code `code`
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    return html;
  };

  // Split by code blocks
  const parts = content.split(/```/g);
  return (
    <div className="message-content">
      {parts.map((part, index) => {
        // Odd indices are code blocks
        if (index % 2 === 1) {
          const firstLineBreak = part.indexOf('\n');
          let language = 'code';
          let code = part;

          if (firstLineBreak !== -1) {
            language = part.substring(0, firstLineBreak).trim() || 'code';
            code = part.substring(firstLineBreak + 1);
          }

          // Strip final newline if any
          if (code.endsWith('\n')) {
            code = code.slice(0, -1);
          }

          const isCopied = copiedIndex === index;

          return (
            <div key={index} className="code-block-wrapper">
              <div className="code-block-header">
                <span className="code-lang">{language}</span>
                <button
                  className="copy-code-btn"
                  onClick={() => handleCopyCode(code, index)}
                >
                  {isCopied ? <Check size={12} className="green" /> : <Copy size={12} />}
                  <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre>
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Even indices are standard text
        return <div key={index}>{renderTextWithFormatting(part)}</div>;
      })}
    </div>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  messages,
  agents,
  activeAgent,
  isGenerating,
  onSendMessage,
  onChangeAgent,
  onClearHistory,
  currentRole,
}) => {
  const [input, setInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastChatIdRef = useRef<string | null>(null);

  // Auto-scroll messages list to bottom without shifting the browser window/viewport
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const chatChanged = lastChatIdRef.current !== (chat?.id || null);
    lastChatIdRef.current = chat?.id || null;

    if (chatChanged) {
      // Scroll instantly when switching chats
      container.scrollTop = container.scrollHeight;
    } else {
      // Scroll smoothly for new messages or when generating responses
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isGenerating, chat?.id]);

  // Auto resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  if (!chat) {
    const emptyStateDetails = {
      staff: {
        title: 'Staff Workspace',
        desc: 'Collaborate with your Staff Assistant on operational tasks, software engineering, technical documentation, and daily duties.',
      },
      manager: {
        title: 'Manager Workspace',
        desc: 'Coordinate with your Manager Assistant on project timelines, resource scheduling, task delegation, and progress reporting.',
      },
      director: {
        title: 'Director Workspace',
        desc: 'Consult with your Director Assistant on business strategy, organizational vision, financial forecasting, and leadership planning.',
      },
    };

    const details = emptyStateDetails[currentRole];

    return (
      <div className="chat-empty-container">
        <div className="chat-empty-card glass-card">
          <Bot className="bot-huge-icon" size={48} />
          <h2>Welcome to {details.title}</h2>
          <p>{details.desc}</p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-area-container">
      {/* HEADER */}
      <header className="chat-header glass-panel">
        <div className="chat-header-info">
          <MessageSquare className="chat-icon" size={20} />
          <div className="chat-meta">
            <h3>{chat.title}</h3>
            <span className="chat-agent-desc">
              Active Agent:{' '}
              <strong className="glow-text">{activeAgent?.name || 'None'}</strong>
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          {/* Switch Agent Dropdown */}
          <div className="agent-select-wrapper">
            <Bot size={14} className="select-icon" />
            <select
              value={chat.active_agent_id || ''}
              onChange={(e) => onChangeAgent(e.target.value)}
              className="agent-select"
            >
              <option value="" disabled>
                -- Switch Agent --
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id} style={{ color: 'black' }}>
                  {agent.name} ({agent.api_provider.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {messages.length > 0 && (
            <button
              className="btn-secondary delete-history-btn"
              onClick={onClearHistory}
              title="Clear Conversation History"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </header>

      {/* MESSAGES LIST */}
      <div ref={messagesContainerRef} className="chat-messages-container">
        {messages.length === 0 ? (
          <div className="chat-conversation-empty">
            <Sparkles className="spark-icon" size={32} />
            <p>The conversation has started.</p>
            <p className="subtext">
              Type a message below to query <strong>{activeAgent?.name || 'No agent selected'}</strong>.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.id.startsWith('temp-') && !msg.content && !msg.statusText) {
              return null;
            }

            return (
              <div
                key={msg.id}
                className={`message-bubble-wrapper ${msg.sender === 'user' ? 'user-wrapper' : 'agent-wrapper'
                  }`}
              >
                <div className="sender-avatar">
                  {msg.sender === 'user' ? (
                    <User size={14} />
                  ) : (
                    <Bot size={14} className="agent-avatar-icon" />
                  )}
                </div>

                <div className="message-bubble-content">
                  <div className="message-header-info">
                    <span className="sender-name">
                      {msg.sender === 'user' ? 'You' : msg.agent_name || 'Agent'}
                    </span>
                    <span className="timestamp">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        : ''}
                    </span>
                    {msg.statusText && (
                      <span className="thinking-status">
                        <span className="status-pulse-dot"></span>
                        <span>{msg.statusText}</span>
                      </span>
                    )}
                  </div>

                  <div className={`message-bubble ${!msg.content ? 'loading-bubble' : ''}`}>
                    {msg.content ? (
                      <Markdown content={msg.content} />
                    ) : (
                      <>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isGenerating && !messages.some((m) => m.id.startsWith('temp-')) && (
          <div className="message-bubble-wrapper agent-wrapper generating">
            <div className="sender-avatar">
              <Bot size={14} className="agent-avatar-icon rotate-anim" />
            </div>
            <div className="message-bubble-content">
              <div className="message-header-info">
                <span className="sender-name">{activeAgent?.name || 'Agent'} is thinking</span>
              </div>
              <div className="message-bubble loading-bubble">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT PANEL */}
      <div className="chat-input-panel glass-panel">
        {!activeAgent ? (
          <div className="input-warning">
            <AlertCircle size={16} />
            <span>Configure or assign an Agent to this chat to start writing messages.</span>
          </div>
        ) : (
          <div className="input-container">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeAgent.name}... (Press Enter to send, Shift+Enter for newline)`}
              disabled={isGenerating}
            />
            <button
              className="send-btn btn-primary"
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
            >
              <Send size={16} />
              <CornerDownLeft size={10} className="shortcut-icon" />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .chat-empty-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .chat-empty-card {
          padding: 40px;
          border-radius: 24px;
          text-align: center;
          max-width: 450px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .bot-huge-icon {
          color: var(--primary);
          filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4));
        }

        .chat-empty-card h2 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 700;
        }

        .chat-empty-card p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .chat-area-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background: rgba(10, 11, 16, 0.3);
        }

        .chat-header {
          height: var(--header-height);
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--glass-border);
          flex-shrink: 0;
        }

        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chat-icon {
          color: var(--primary);
        }

        .chat-meta h3 {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 600;
        }

        .chat-agent-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .glow-text {
          color: var(--secondary);
          text-shadow: 0 0 8px var(--secondary-glow);
        }

        .chat-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .agent-select-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .select-icon {
          position: absolute;
          left: 12px;
          color: var(--text-secondary);
          pointer-events: none;
        }

        .agent-select {
          padding: 8px 12px 8px 32px;
          font-size: 0.85rem;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          cursor: pointer;
        }

        .delete-history-btn {
          padding: 8px;
          border-radius: 8px;
          color: var(--text-secondary);
        }

        .delete-history-btn:hover {
          color: var(--accent-rose);
          background: rgba(244, 63, 94, 0.1);
        }

        .chat-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chat-conversation-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-secondary);
          gap: 8px;
        }

        .spark-icon {
          color: var(--accent-cyan);
          filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.3));
          margin-bottom: 8px;
        }

        .chat-conversation-empty p {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 500;
        }

        .chat-conversation-empty .subtext {
          font-family: var(--font-body);
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        /* Message Bubbles layout */
        .message-bubble-wrapper {
          display: flex;
          gap: 16px;
          max-width: 80%;
          animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .user-wrapper {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .agent-wrapper {
          align-self: flex-start;
        }

        .sender-avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
        }

        .user-wrapper .sender-avatar {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.2);
          color: var(--primary);
        }

        .agent-avatar-icon {
          color: var(--secondary);
        }

        .message-bubble-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .user-wrapper .message-bubble-content {
          align-items: flex-end;
        }

        .message-header-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sender-name {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .timestamp {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .thinking-status {
          font-size: 0.72rem;
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 99px;
          margin-left: 6px;
          font-weight: 500;
          letter-spacing: 0.02em;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.05);
          animation: pulse-glow 2s infinite ease-in-out;
        }

        .status-pulse-dot {
          width: 6px;
          height: 6px;
          background-color: var(--primary);
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 6px var(--primary);
        }

        .message-bubble {
          padding: 14px 18px;
          border-radius: 18px;
          font-size: 0.92rem;
          line-height: 1.5;
          word-break: break-word;
        }

        .user-wrapper .message-bubble {
          background: linear-gradient(135deg, var(--primary), #4f46e5);
          color: #ffffff;
          border-top-right-radius: 2px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
        }

        .agent-wrapper .message-bubble {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          color: #e2e8f0;
          border-top-left-radius: 2px;
        }

        .loading-bubble {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px 22px;
        }

        .rotate-anim {
          animation: spin 3s infinite linear;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Input Panel */
        .chat-input-panel {
          padding: 16px 24px 24px 24px;
          border-top: 1px solid var(--glass-border);
          background: rgba(10, 11, 16, 0.5);
          flex-shrink: 0;
        }

        .input-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent-amber);
          font-size: 0.85rem;
          background: rgba(245, 158, 11, 0.05);
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: flex-end;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 6px 6px 6px 16px;
          transition: all 0.2s ease;
        }

        .input-container:focus-within {
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 3px var(--primary-glow);
        }

        .input-container textarea {
          flex: 1;
          background: transparent;
          border: none;
          padding: 10px 0;
          resize: none;
          max-height: 200px;
          font-size: 0.92rem;
          line-height: 1.5;
        }

        .input-container textarea:focus {
          box-shadow: none;
        }

        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          width: 40px;
          padding: 0;
          border-radius: 12px;
          position: relative;
        }

        .shortcut-icon {
          position: absolute;
          bottom: 3px;
          right: 3px;
          color: rgba(255, 255, 255, 0.4);
          opacity: 0.7;
        }

        /* Markdown Styling overrides inside message bubble */
        .md-h2 {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 700;
          margin: 16px 0 8px 0;
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 4px;
        }
        .md-h3 {
          font-family: var(--font-display);
          font-size: 1.15rem;
          font-weight: 600;
          margin: 12px 0 6px 0;
        }
        .md-h4 {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 600;
          margin: 10px 0 4px 0;
        }
        .md-li {
          margin-left: 20px;
          list-style-type: disc;
          margin-bottom: 4px;
        }
        .md-ol-li {
          display: flex;
          align-items: flex-start;
          gap: 0.25rem;
          margin-left: 0;
          margin-bottom: 4px;
          list-style-type: none;
        }
        .md-ol-number {
          font-weight: 600;
          color: var(--text-primary);
          flex-shrink: 0;
          min-width: 1.25rem;
        }
        .md-ol-content {
          flex: 1;
        }
        .md-space {
          height: 8px;
        }
        .md-p {
          margin-bottom: 8px;
        }
        .md-p:last-child {
          margin-bottom: 0;
        }

        /* Code Block Copy Panel */
        .code-block-wrapper {
          margin: 12px 0;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          overflow: hidden;
          background: rgba(0, 0, 0, 0.25);
        }

        .code-block-header {
          background: rgba(0, 0, 0, 0.3);
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .code-lang {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .copy-code-btn {
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .copy-code-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .copy-code-btn .green {
          color: var(--accent-emerald);
        }

        .code-block-wrapper pre {
          margin: 0;
          border: none;
          border-radius: 0;
        }

        @media (max-width: 768px) {
          .message-bubble-wrapper {
            max-width: 90%;
          }
          .chat-input-panel {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};
