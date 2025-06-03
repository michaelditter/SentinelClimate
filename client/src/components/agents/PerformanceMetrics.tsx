import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceMetricsProps {
  isActive: boolean;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ isActive }) => {
  const [metrics, setMetrics] = useState({
    accuracy: 94.3,
    responseTime: 2.1,
    decisionsPerHour: 47,
    successRate: 96.8
  });

  const [performanceData, setPerformanceData] = useState([
    { time: '10:00', accuracy: 92, responseTime: 2.5 },
    { time: '11:00', accuracy: 94, responseTime: 2.3 },
    { time: '12:00', accuracy: 93, responseTime: 2.4 },
    { time: '13:00', accuracy: 95, responseTime: 2.1 },
    { time: '14:00', accuracy: 94, responseTime: 2.2 }
  ]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        accuracy: Math.max(85, Math.min(99, prev.accuracy + (Math.random() - 0.5) * 2)),
        responseTime: Math.max(1.5, Math.min(5, prev.responseTime + (Math.random() - 0.5) * 0.3)),
        decisionsPerHour: Math.max(30, Math.min(80, prev.decisionsPerHour + Math.floor((Math.random() - 0.5) * 6))),
        successRate: Math.max(90, Math.min(99, prev.successRate + (Math.random() - 0.5) * 1))
      }));

      // Update chart data
      setPerformanceData(prev => {
        const newTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const newData = {
          time: newTime,
          accuracy: metrics.accuracy,
          responseTime: metrics.responseTime
        };
        return [...prev.slice(-4), newData];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive, metrics.accuracy, metrics.responseTime]);

  const MetricCard = ({ icon: Icon, title, value, unit, trend, color }: any) => (
    <motion.div 
      className={`bg-gray-700 p-4 rounded-lg border-l-4 ${color}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-6 w-6 text-gray-400" />
        <TrendingUp className={`h-4 w-4 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`} />
      </div>
      <div className="text-2xl font-bold">{value}{unit}</div>
      <div className="text-sm text-gray-400">{title}</div>
      <div className={`text-xs mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {trend > 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}% from last hour
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Shield}
          title="System Accuracy"
          value={metrics.accuracy.toFixed(1)}
          unit="%"
          trend={2.3}
          color="border-green-500"
        />
        <MetricCard
          icon={Clock}
          title="Avg Response Time"
          value={metrics.responseTime.toFixed(1)}
          unit="h"
          trend={-0.4}
          color="border-blue-500"
        />
        <MetricCard
          icon={BarChart3}
          title="Decisions/Hour"
          value={metrics.decisionsPerHour}
          unit=""
          trend={1.8}
          color="border-orange-500"
        />
        <MetricCard
          icon={TrendingUp}
          title="Success Rate"
          value={metrics.successRate.toFixed(1)}
          unit="%"
          trend={0.9}
          color="border-purple-500"
        />
      </div>

      {/* Performance Chart */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h4 className="font-bold text-lg mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          24-Hour Performance Trend
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F9FAFB' }}
              />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="responseTime" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h4 className="font-bold text-lg mb-4">Agent Efficiency</h4>
          <div className="space-y-3">
            {[
              { name: 'SENTINEL', efficiency: 94, color: 'bg-blue-500' },
              { name: 'MEDIC', efficiency: 89, color: 'bg-red-500' },
              { name: 'DISPATCHER', efficiency: 97, color: 'bg-orange-500' },
              { name: 'COMMANDER', efficiency: 92, color: 'bg-purple-500' }
            ].map(agent => (
              <div key={agent.name} className="flex items-center justify-between">
                <span className="text-sm font-medium">{agent.name}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-600 rounded-full h-2">
                    <motion.div 
                      className={`h-2 rounded-full ${agent.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.efficiency}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                  <span className="text-sm font-bold">{agent.efficiency}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h4 className="font-bold text-lg mb-4">Decision Quality</h4>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">96.8%</div>
              <div className="text-sm text-gray-400">Overall Success Rate</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-lg font-bold text-blue-400">2,847</div>
                <div className="text-xs text-gray-400">Total Decisions</div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-lg font-bold text-red-400">91</div>
                <div className="text-xs text-gray-400">Failed Actions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
