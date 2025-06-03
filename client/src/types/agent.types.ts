export interface AgentStatus {
  status: 'ACTIVE' | 'DEPLOYING' | 'STANDBY' | 'ERROR';
  lastUpdate: string;
  metrics: Record<string, string | number>;
}

export interface Agent {
  id: string;
  name: string;
  type: 'SENTINEL' | 'MEDIC' | 'DISPATCHER' | 'COMMANDER';
  icon: string;
  color: string;
  status: AgentStatus;
  description: string;
}

export interface AgentCommunication {
  id: string;
  agent: string;
  message: string;
  timestamp: string;
  type: 'alert' | 'warning' | 'action' | 'decision' | 'info';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DecisionNode {
  id: string;
  agent: string;
  icon: string;
  label: string;
  metric: string;
  status: 'processing' | 'complete' | 'pending';
  confidence?: number;
}
