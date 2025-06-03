import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Clock } from 'lucide-react';
import { AgentCommunication as AgentCommunicationType } from '@/types/agent.types';
import { agentCommunications } from '@/data/agentData';

interface AgentCommunicationProps {
  isActive: boolean;
}

const AgentCommunication: React.FC<AgentCommunicationProps> = ({ isActive }) => {
  const [communications, setCommunications] = useState<AgentCommunicationType[]>(agentCommunications);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const agents = ['SENTINEL', 'MEDIC', 'DISPATCHER', 'COMMANDER'];
      const messages = [
        'Processing new weather data streams',
        'Updating risk assessment calculations',
        'Coordinating resource deployment',
        'Analyzing population vulnerability metrics',
        'Optimizing response protocols',
        'Monitoring hospital capacity levels'
      ];
      const types: AgentCommunicationType['type'][] = ['alert', 'warning', 'action', 'decision', 'info'];
      const priorities: AgentCommunicationType['priority'][] = ['low', 'medium', 'high', 'critical'];

      if (Math.random() > 0.7) {
        const newComm: AgentCommunicationType = {
          id: Date.now().toString(),
          agent: agents[Math.floor(Math.random() * agents.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: new Date().toLocaleTimeString(),
          type: types[Math.floor(Math.random() * types.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)]
        };

        setCommunications(prev => [newComm, ...prev.slice(0, 19)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive]);

  const filteredCommunications = communications.filter(comm => {
    if (filter === 'all') return true;
    return comm.priority === filter;
  });

  const getAgentColor = (agent: string) => {
    switch (agent) {
      case 'SENTINEL': return 'border-blue-500 text-blue-400';
      case 'MEDIC': return 'border-red-500 text-red-400';
      case 'DISPATCHER': return 'border-orange-500 text-orange-400';
      case 'COMMANDER': return 'border-purple-500 text-purple-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'alert': return 'text-red-400';
      case 'warning': return 'text-orange-400';
      case 'action': return 'text-blue-400';
      case 'decision': return 'text-green-400';
      case 'info': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📢';
      case 'low': return 'ℹ️';
      default: return '📝';
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center">
          <span className="text-2xl mr-2">💬</span>
          Agent Communication
        </h3>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Priority</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-auto">
        <AnimatePresence>
          {filteredCommunications.map((comm, index) => (
            <motion.div
              key={comm.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3 bg-gray-700 rounded-lg border-l-4 ${getAgentColor(comm.agent)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getPriorityIcon(comm.priority)}</span>
                  <span className={`font-bold ${getAgentColor(comm.agent).split(' ')[1]}`}>
                    {comm.agent}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${getTypeColor(comm.type)} bg-gray-600`}>
                    {comm.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{comm.timestamp}</span>
                </div>
              </div>
              <div className="text-sm text-gray-300">{comm.message}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {filteredCommunications.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No communications matching the selected filter
        </div>
      )}
    </div>
  );
};

export default AgentCommunication;
