import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Activity } from 'lucide-react';
import { DecisionNode } from '@/types/agent.types';

interface DecisionFlowProps {
  isActive: boolean;
}

const DecisionFlow: React.FC<DecisionFlowProps> = ({ isActive }) => {
  const [nodes, setNodes] = useState<DecisionNode[]>([
    {
      id: 'sentinel',
      agent: 'SENTINEL',
      icon: '🔍',
      label: 'Heat Risk Detection',
      metric: 'Risk: 87/100',
      status: 'complete',
      confidence: 94
    },
    {
      id: 'medic',
      agent: 'MEDIC',
      icon: '🏥',
      label: 'Surge Prediction',
      metric: '137% ED Surge',
      status: 'complete',
      confidence: 89
    },
    {
      id: 'dispatcher',
      agent: 'DISPATCHER',
      icon: '🚀',
      label: 'Resource Deployment',
      metric: '15 Mobile Units',
      status: 'processing',
      confidence: 97
    },
    {
      id: 'commander',
      agent: 'COMMANDER',
      icon: '⚡',
      label: 'Emergency Authorization',
      metric: 'EXTREME Alert',
      status: 'pending',
      confidence: 95
    }
  ]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => {
        if (node.status === 'processing' && Math.random() > 0.7) {
          return { ...node, status: 'complete' as const };
        }
        if (node.status === 'pending' && Math.random() > 0.8) {
          return { ...node, status: 'processing' as const };
        }
        return node;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive]);

  const getNodeColor = (agent: string) => {
    switch (agent) {
      case 'SENTINEL': return 'bg-blue-500';
      case 'MEDIC': return 'bg-red-500';
      case 'DISPATCHER': return 'bg-orange-500';
      case 'COMMANDER': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-400';
      case 'processing': return 'text-orange-400';
      case 'pending': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return '✅';
      case 'processing': return '⚡';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-bold mb-6 flex items-center">
        <Activity className="h-5 w-5 mr-2" />
        Real-Time Decision Flow
      </h3>
      
      <div className="flex items-center justify-between bg-gray-700 p-6 rounded-lg overflow-x-auto">
        <div className="flex items-center space-x-8 min-w-max">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <motion.div 
                className="text-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <motion.div 
                  className={`${getNodeColor(node.agent)} text-white p-4 rounded-full text-2xl mb-3 relative ${
                    node.status === 'processing' ? 'animate-pulse-fast' : ''
                  }`}
                  animate={node.status === 'processing' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {node.icon}
                  <div className="absolute -top-1 -right-1 text-sm">
                    {getStatusIcon(node.status)}
                  </div>
                </motion.div>
                <div className="font-medium text-sm mb-1">{node.agent}</div>
                <div className="text-xs text-gray-400 mb-1">{node.label}</div>
                <div className={`text-xs font-bold ${getStatusColor(node.status)}`}>
                  {node.metric}
                </div>
                {node.confidence && (
                  <div className="text-xs text-gray-500 mt-1">
                    {node.confidence}% confidence
                  </div>
                )}
              </motion.div>
              
              {index < nodes.length - 1 && (
                <motion.div 
                  className="text-3xl text-gray-400"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowRight className="h-6 w-6" />
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Flow Status */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-lg font-bold text-green-400">
            {nodes.filter(n => n.status === 'complete').length}
          </div>
          <div className="text-xs text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-lg font-bold text-orange-400">
            {nodes.filter(n => n.status === 'processing').length}
          </div>
          <div className="text-xs text-gray-400">Processing</div>
        </div>
        <div className="bg-gray-700 p-3 rounded">
          <div className="text-lg font-bold text-blue-400">
            {nodes.reduce((sum, n) => sum + (n.confidence || 0), 0) / nodes.length}%
          </div>
          <div className="text-xs text-gray-400">Avg Confidence</div>
        </div>
      </div>
    </div>
  );
};

export default DecisionFlow;
