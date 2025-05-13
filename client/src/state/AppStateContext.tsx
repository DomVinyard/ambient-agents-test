import React, { createContext, useContext } from 'react';
import useLocalStorage from 'use-local-storage';

export type AppState = {
  actions: any[];
  setActions: (actions: any[]) => void;
  connections: any[];
  setConnections: (connections: any[]) => void;
  agentsActive: any[];
  setAgentsActive: (agents: any[]) => void;
  agentSuggestions: any[];
  setAgentSuggestions: (agents: any[]) => void;
  settings: Record<string, any>;
  setSettings: (settings: Record<string, any>) => void;
  resetDemo: () => void;
};

const AppStateContext = createContext<AppState | undefined>(undefined);

const DEFAULT_ACTIONS = [
  { type: 'question', text: 'Do you use Gmail?' }
];

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [actions, setActions] = useLocalStorage<any[]>('actions', DEFAULT_ACTIONS);
  const [connections, setConnections] = useLocalStorage<any[]>('connections', []);
  const [agentsActive, setAgentsActive] = useLocalStorage<any[]>('agentsActive', []);
  const [agentSuggestions, setAgentSuggestions] = useLocalStorage<any[]>('agentSuggestions', []);
  const [settings, setSettings] = useLocalStorage<Record<string, any>>('settings', {});

  const resetDemo = () => {
    setActions(DEFAULT_ACTIONS);
    setConnections([]);
    setAgentsActive([]);
    setAgentSuggestions([]);
    setSettings({});
    localStorage.clear();
    window.location.reload();
  };

  return (
    <AppStateContext.Provider value={{ actions, setActions, connections, setConnections, agentsActive, setAgentsActive, agentSuggestions, setAgentSuggestions, settings, setSettings, resetDemo }}>
      {children}
    </AppStateContext.Provider>
  );
};

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within AppStateProvider');
  return context;
} 