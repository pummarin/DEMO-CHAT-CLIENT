import {
  MessageSquare,
  Plus,
  Trash2,
  Bot,
  Edit2,
  Database,
  Cloud,
  Briefcase,
  Users,
  Award,
} from 'lucide-react';
import { type Chat, type Agent, dbService } from '../dbService';

interface SidebarProps {
  chats: Chat[];
  agents: Agent[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onCreateChat: () => void;
  onDeleteChat: (id: string) => void;
  onAddAgent: () => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  currentRole: 'staff' | 'manager' | 'director';
  onRoleChange: (role: 'staff' | 'manager' | 'director') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  agents,
  currentChatId,
  onSelectChat,
  onCreateChat,
  onDeleteChat,
  onAddAgent,
  onEditAgent,
  onDeleteAgent,
  currentRole,
  onRoleChange,
}) => {
  const isSupabase = dbService.isSupabase();

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="logo-area">
          <div className="logo-glow"></div>
          <Bot className="logo-icon" size={24} />
          <h1>Demo Chat</h1>
        </div>

        {/* Premium Role Switcher */}
        <div className="role-switcher-container">
          <div className={`role-slider active-${currentRole}`} />
          <button
            className={`role-tab ${currentRole === 'staff' ? 'active' : ''}`}
            onClick={() => onRoleChange('staff')}
          >
            <Briefcase size={14} />
            <span>Staff</span>
          </button>
          <button
            className={`role-tab ${currentRole === 'manager' ? 'active' : ''}`}
            onClick={() => onRoleChange('manager')}
          >
            <Users size={14} />
            <span>Manager</span>
          </button>
          <button
            className={`role-tab ${currentRole === 'director' ? 'active' : ''}`}
            onClick={() => onRoleChange('director')}
          >
            <Award size={14} />
            <span>Director</span>
          </button>
        </div>

        <button className="btn-primary new-chat-btn" onClick={onCreateChat}>
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="sidebar-content">
        {/* CHATS SECTION */}
        <div className="section-container">
          <div className="section-header">
            <MessageSquare size={14} className="section-icon" />
            <h2>Conversations</h2>
            <span className="badge">{chats.length}</span>
          </div>

          <div className="list-container chats-list">
            {chats.length === 0 ? (
              <div className="empty-state">No conversations yet</div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`list-item chat-item ${currentChatId === chat.id ? 'active' : ''
                    }`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <MessageSquare size={16} className="item-icon" />
                  <span className="item-title">{chat.title}</span>
                  <button
                    className="item-action delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AGENTS SECTION */}
        <div className="section-container">
          <div className="section-header">
            <Bot size={14} className="section-icon" />
            <h2>Agents</h2>
            <span className="badge">{agents.length}</span>
            <button
              className="add-agent-inline-btn"
              onClick={onAddAgent}
              title="Add New Agent"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="list-container agents-list">
            {agents.map((agent) => (
              <div key={agent.id} className="list-item agent-item">
                <div className="agent-avatar-placeholder">
                  {agent.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="agent-info">
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-provider-tag" data-provider={agent.api_provider}>
                    {agent.api_provider.toUpperCase()}
                  </span>
                </div>
                <div className="agent-actions">
                  <button
                    className="item-action edit-btn"
                    onClick={() => onEditAgent(agent)}
                    title="Edit Agent"
                  >
                    <Edit2 size={13} />
                  </button>
                  {agents.length > 1 && (
                    <button
                      className="item-action delete-btn"
                      onClick={() => onDeleteAgent(agent.id)}
                      title="Delete Agent"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DATABASE STATUS FOOTER */}
      <div className="sidebar-footer">
        <div className="db-status-container">
          {isSupabase ? (
            <>
              <Cloud className="status-icon green" size={16} />
              <div className="status-text">
                <span className="status-label">Supabase Active</span>
                <span className="status-desc">Synchronized to Cloud</span>
              </div>
            </>
          ) : (
            <>
              <Database className="status-icon amber" size={16} />
              <div className="status-text">
                <span className="status-label">Local Mode</span>
                <span className="status-desc">Saved in Browser</span>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100%;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--glass-border);
          position: relative;
          z-index: 10;
        }

        .sidebar-header {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-bottom: 1px solid var(--glass-border);
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
        }

        .logo-glow {
          position: absolute;
          width: 32px;
          height: 32px;
          background: var(--primary);
          filter: blur(12px);
          opacity: 0.4;
          border-radius: 50%;
          left: -4px;
        }

        .logo-icon {
          color: var(--primary);
          z-index: 1;
        }

        .logo-area h1 {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #ffffff, var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .new-chat-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          font-size: 0.9rem;
        }

        /* Premium Role Switcher */
        .role-switcher-container {
          position: relative;
          display: flex;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 3px;
          gap: 2px;
        }

        .role-slider {
          position: absolute;
          top: 3px;
          bottom: 3px;
          width: calc((100% - 10px) / 3);
          border-radius: 9px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .role-slider.active-staff {
          transform: translateX(0);
        }

        .role-slider.active-manager {
          transform: translateX(calc(100% + 2px));
        }

        .role-slider.active-director {
          transform: translateX(calc(200% + 4px));
        }

        .role-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 0;
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: transparent;
          border-radius: 9px;
          cursor: pointer;
          z-index: 2;
          transition: color 0.2s ease;
          font-weight: 600;
        }

        .role-tab:hover {
          color: var(--text-primary);
        }

        .role-tab.active {
          color: #ffffff;
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .section-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-header {
          display: flex;
          align-items: center;
          padding: 0 8px;
        }

        .section-icon {
          color: var(--text-muted);
          margin-right: 8px;
        }

        .section-header h2 {
          font-family: var(--font-display);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          flex: 1;
        }

        .badge {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 600;
        }

        .add-agent-inline-btn {
          background: transparent;
          color: var(--text-muted);
          padding: 4px;
          border-radius: 4px;
          margin-left: 8px;
        }

        .add-agent-inline-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .list-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .empty-state {
          padding: 12px 16px;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-style: italic;
          text-align: center;
        }

        .list-item {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .list-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .chat-item.active {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.15);
          color: #ffffff;
        }

        .chat-item.active .item-icon {
          color: var(--primary);
        }

        .item-icon {
          color: var(--text-secondary);
          margin-right: 10px;
          flex-shrink: 0;
        }

        .item-title {
          flex: 1;
          font-size: 0.88rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-action {
          background: transparent;
          color: var(--text-muted);
          opacity: 0;
          padding: 4px;
          border-radius: 4px;
          transition: opacity 0.2s, color 0.2s;
        }

        .list-item:hover .item-action {
          opacity: 1;
        }

        .item-action:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .item-action.delete-btn:hover {
          color: var(--accent-rose);
        }

        .item-action.edit-btn:hover {
          color: var(--accent-cyan);
        }

        /* Agent Items */
        .agent-item {
          cursor: default;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .agent-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--bg-tertiary), rgba(255,255,255,0.05));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          border: 1px solid var(--glass-border);
        }

        .agent-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }

        .agent-name {
          font-size: 0.88rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .agent-provider-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0px 4px;
          border-radius: 4px;
          width: max-content;
          margin-top: 2px;
        }

        .agent-provider-tag[data-provider='gemini'] {
          background: rgba(6, 182, 212, 0.1);
          color: var(--accent-cyan);
        }

        .agent-provider-tag[data-provider='openai'] {
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent-emerald);
        }

        .agent-provider-tag[data-provider='custom'] {
          background: rgba(245, 158, 11, 0.1);
          color: var(--accent-amber);
        }

        .agent-provider-tag[data-provider='mock'] {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
        }

        .agent-actions {
          display: flex;
          gap: 2px;
        }

        .sidebar-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--glass-border);
          background: rgba(0, 0, 0, 0.15);
        }

        .db-status-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-icon {
          flex-shrink: 0;
        }

        .status-icon.green {
          color: var(--accent-emerald);
          filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.3));
        }

        .status-icon.amber {
          color: var(--accent-amber);
          filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.3));
        }

        .status-text {
          display: flex;
          flex-direction: column;
        }

        .status-label {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .status-desc {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid var(--glass-border);
          }
        }
      `}</style>
    </aside>
  );
};
