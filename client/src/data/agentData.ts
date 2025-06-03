import { Agent, AgentCommunication } from '@/types/agent.types';

export const agents: Agent[] = [
  {
    id: 'sentinel',
    name: 'SENTINEL',
    type: 'SENTINEL',
    icon: '🔍',
    color: 'blue',
    description: 'Heat risk detection and early warning system',
    status: {
      status: 'ACTIVE',
      lastUpdate: '2 min ago',
      metrics: {
        confidence: 94,
        processing: '47 data streams',
        detectionRate: '98.7%',
        lastAlert: '2 min ago'
      }
    }
  },
  {
    id: 'medic',
    name: 'MEDIC',
    type: 'MEDIC',
    icon: '🏥',
    color: 'red',
    description: 'Healthcare impact prediction and surge modeling',
    status: {
      status: 'ACTIVE',
      lastUpdate: '30 sec ago',
      metrics: {
        accuracy: 89,
        analyzing: '12 hospitals',
        surgePrediction: '+137%',
        lastUpdate: '30 sec ago'
      }
    }
  },
  {
    id: 'dispatcher',
    name: 'DISPATCHER',
    type: 'DISPATCHER',
    icon: '🚀',
    color: 'orange',
    description: 'Resource deployment and logistics coordination',
    status: {
      status: 'DEPLOYING',
      lastUpdate: '1 min ago',
      metrics: {
        efficiency: 97,
        unitsStaged: '47 teams',
        roi: '12.4:1',
        responseTime: '2.1h avg'
      }
    }
  },
  {
    id: 'commander',
    name: 'COMMANDER',
    type: 'COMMANDER',
    icon: '⚡',
    color: 'purple',
    description: 'Strategic decision making and emergency authorization',
    status: {
      status: 'ACTIVE',
      lastUpdate: '1 min ago',
      metrics: {
        decisions: 156,
        authority: 'EXTREME',
        lastDecision: '1 min ago',
        successRate: '94.8%'
      }
    }
  }
];

export const agentCommunications: AgentCommunication[] = [
  {
    id: '1',
    agent: 'SENTINEL',
    message: 'Heat dome detected over Harris County. Risk level: EXTREME',
    timestamp: '2 min ago',
    type: 'alert',
    priority: 'critical'
  },
  {
    id: '2',
    agent: 'MEDIC',
    message: 'Hospital capacity at 89%. Recommend surge protocol activation',
    timestamp: '1 min ago',
    type: 'warning',
    priority: 'high'
  },
  {
    id: '3',
    agent: 'DISPATCHER',
    message: 'Mobile units 47-52 deploying to high-risk zones',
    timestamp: '30 sec ago',
    type: 'action',
    priority: 'medium'
  },
  {
    id: '4',
    agent: 'COMMANDER',
    message: 'Authorization granted for emergency cooling center activation',
    timestamp: '15 sec ago',
    type: 'decision',
    priority: 'high'
  }
];
