import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { type Agent } from '../dbService';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Omit<Agent, 'id'> & { id?: string }) => void;
  editingAgent: Agent | null;
  currentRole: 'staff' | 'manager' | 'director';
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAgent,
  currentRole,
}) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<Agent['api_provider']>('gemini');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [instruction, setInstruction] = useState('');
  const [role, setRole] = useState<Agent['role']>('staff');
  const [error, setError] = useState('');

  // Pre-fill defaults based on provider
  useEffect(() => {
    if (editingAgent) return; // Don't overwrite if editing

    if (provider === 'gemini') {
      setEndpoint('https://generativelanguage.googleapis.com/v1beta');
      setModel('gemini-1.5-flash');
    } else if (provider === 'openai') {
      setEndpoint('https://api.openai.com/v1');
      setModel('gpt-4o-mini');
    } else if (provider === 'softnix') {
      setEndpoint('https://genai.softnix.ai/external/api/chat-messages');
      setModel('');
    } else if (provider === 'mock') {
      setEndpoint('');
      setModel('mock-model-v1');
    } else {
      setEndpoint('');
      setModel('');
    }
  }, [provider, editingAgent]);

  // Load editing agent details
  useEffect(() => {
    if (editingAgent) {
      setName(editingAgent.name);
      setProvider(editingAgent.api_provider);
      setEndpoint(editingAgent.api_endpoint || '');
      setApiKey(editingAgent.api_key || '');
      setModel(editingAgent.model_name || '');
      setInstruction(editingAgent.system_instruction || '');
      setRole(editingAgent.role || 'staff');
    } else {
      setName('');
      setProvider('gemini');
      setEndpoint('https://generativelanguage.googleapis.com/v1beta');
      setApiKey('');
      setModel('gemini-1.5-flash');
      setInstruction('');
      setRole(currentRole);
    }
    setError('');
  }, [editingAgent, isOpen, currentRole]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide an Agent Name.');
      return;
    }
    if ((provider as string) !== 'mock' && !apiKey.trim()) {
      setError('API Key is required for live API agents.');
      return;
    }

    onSave({
      id: editingAgent?.id,
      name: name.trim(),
      api_provider: provider,
      api_endpoint: endpoint.trim() || undefined,
      api_key: apiKey.trim() || undefined,
      model_name: model.trim() || undefined,
      system_instruction: instruction.trim() || undefined,
      role: role,
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <div className="title-area">
            <Sparkles className="icon-pink" size={20} />
            <h2>{editingAgent ? 'Edit Agent Profile' : 'Configure New Agent'}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="form-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label>Agent Name</label>
            <input
              type="text"
              placeholder="e.g. Creative Writer, Code Assistant..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Workspace Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Agent['role'])}
            >
              <option value="staff">Staff Workspace</option>
              <option value="manager">Manager Workspace</option>
              <option value="director">Director Workspace</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>API Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Agent['api_provider'])}
              >
                <option value="gemini">Gemini API</option>
                <option value="openai">OpenAI API</option>
                <option value="softnix">Softnix AI (genai.softnix.ai)</option>
                <option value="custom">Custom Endpoint (OpenAI Compatible)</option>
                <option value="mock">Local Simulation (Mock)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Model Name</label>
              <input
                type="text"
                placeholder={
                  provider === 'gemini' ? 'gemini-1.5-flash' :
                  provider === 'softnix' ? 'N/A' :
                  'gpt-4o-mini'
                }
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={provider === 'softnix'}
              />
            </div>
          </div>

          {(provider as string) !== 'mock' && (
            <div className="form-group">
              <label>API Endpoint Base URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>
          )}

          {(provider as string) !== 'mock' && (
            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                placeholder="Enter API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required={(provider as string) !== 'mock'}
              />
            </div>
          )}

          <div className="form-group">
            <label>System Instructions (Prompt)</label>
            <textarea
              rows={4}
              placeholder="System prompt to shape the agent's behavior (e.g. Speak like a pirate...)"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingAgent ? 'Save Changes' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 5, 8, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: overlayFade 0.2s ease-out;
        }

        .modal-content {
          width: 500px;
          max-width: 95vw;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          animation: modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--glass-border);
        }

        .title-area {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .title-area h2 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 600;
        }

        .icon-pink {
          color: var(--secondary);
        }

        .close-btn {
          background: transparent;
          color: var(--text-secondary);
          padding: 8px;
          border-radius: 50%;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .modal-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 75vh;
          overflow-y: auto;
        }

        .form-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid var(--accent-rose);
          color: #fda4af;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 0.9rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          align-items: end;
        }

        @media (max-width: 480px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
          border-top: 1px solid var(--glass-border);
          padding-top: 16px;
        }

        @keyframes overlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
