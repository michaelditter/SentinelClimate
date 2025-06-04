import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Shield, Clock, DollarSign, Heart, Users, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SimulationResult } from '@/types/simulation.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BeforeAfterComparisonProps {
  result: SimulationResult | null;
}

const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({ result }) => {
  if (!result) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="h-5 w-5 mr-2" />
            Before/After Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-400">
          Run a crisis simulation to see detailed impact analysis
        </CardContent>
      </Card>
    );
  }

  const { outcomes } = result;
  const { actual, withSentinel } = outcomes;

  const comparisonData = [
    {
      name: 'Deaths',
      withoutAI: actual.deaths,
      withAI: withSentinel.deaths,
      unit: ''
    },
    {
      name: 'ED Visits',
      withoutAI: actual.edVisits,
      withAI: withSentinel.edVisits,
      unit: ''
    },
    {
      name: 'Economic Impact',
      withoutAI: actual.economicImpact,
      withAI: withSentinel.economicImpact,
      unit: 'M'
    },
    {
      name: 'Response Time',
      withoutAI: actual.responseTime,
      withAI: withSentinel.responseTime,
      unit: 'h'
    }
  ];

  const formatNumber = (num: number | string): string => {
    const number = typeof num === 'string' ? parseFloat(num) : num;
    return number.toLocaleString();
  };

  const ImpactCard = ({ icon: Icon, title, before, after, unit, color }: any) => {
    const reduction = ((before - after) / before) * 100;
    
    return (
      <motion.div 
        className={`p-4 rounded-lg border-l-4 ${color} bg-gray-700`}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="flex items-center justify-between mb-3">
          <Icon className="h-6 w-6 text-gray-400" />
          <div className="flex items-center space-x-1">
            <TrendingDown className="h-4 w-4 text-green-400" />
            <span className="text-green-400 font-bold text-sm">-{reduction.toFixed(0)}%</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-lg font-bold text-white">{title}</div>
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-red-400">Before: </span>
              <span className="font-medium">{formatNumber(before)}{unit}</span>
            </div>
            <div>
              <span className="text-green-400">After: </span>
              <span className="font-medium">{formatNumber(after)}{unit}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Key Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ImpactCard
          icon={Heart}
          title="Lives Saved"
          before={actual.deaths}
          after={withSentinel.deaths}
          unit=""
          color="border-green-500"
        />
        <ImpactCard
          icon={Users}
          title="People Protected"
          before={actual.edVisits}
          after={withSentinel.edVisits}
          unit=""
          color="border-blue-500"
        />
        <ImpactCard
          icon={Clock}
          title="Response Time"
          before={actual.responseTime}
          after={withSentinel.responseTime}
          unit="h"
          color="border-purple-500"
        />
        <ImpactCard
          icon={Shield}
          title="Effectiveness"
          before="100"
          after={result.confidence.toString()}
          unit="%"
          color="border-orange-500"
        />
      </div>

      {/* Detailed Comparison Chart */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Impact Comparison Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Bar dataKey="withoutAI" name="Without Sentinel AI" fill="#EF4444" />
                <Bar dataKey="withAI" name="With Sentinel AI" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card className="bg-gradient-to-r from-green-800 to-blue-800 border-none">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-white">
                {formatNumber(withSentinel.preventedDeaths || 0)}
              </div>
              <div className="text-green-200">Lives Saved</div>
              <div className="text-sm text-green-100 mt-1">
                {(((actual.deaths - withSentinel.deaths) / actual.deaths) * 100).toFixed(0)}% mortality reduction
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">
                {formatNumber(actual.edVisits - withSentinel.edVisits)}
              </div>
              <div className="text-blue-200">ED Visits Prevented</div>
              <div className="text-sm text-blue-100 mt-1">
                {(((actual.edVisits - withSentinel.edVisits) / actual.edVisits) * 100).toFixed(0)}% reduction in hospitalizations
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">
                {formatNumber(actual.responseTime - withSentinel.responseTime)}h
              </div>
              <div className="text-purple-200">Time Saved</div>
              <div className="text-sm text-purple-100 mt-1">
                Early warning advantage
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Effectiveness */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Emergency Response Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-bold text-white">Health Outcomes</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Emergency Department Visits:</span>
                  <span className="text-white">{formatNumber(actual.edVisits - withSentinel.edVisits)} prevented</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Lives Protected:</span>
                  <span className="text-white">{formatNumber(actual.deaths - withSentinel.deaths)} lives saved</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Response Improvement:</span>
                  <span className="text-white">{formatNumber(actual.responseTime - withSentinel.responseTime)}h faster</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">System Effectiveness:</span>
                  <span className="text-white">{result.confidence}% improvement</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-bold text-white">Prevention Metrics</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>• Early warning system activation</div>
                <div>• Proactive resource deployment</div>
                <div>• Vulnerable population protection</div>
                <div>• Multi-agent coordination</div>
                <div>• Real-time monitoring and response</div>
                <div>• Healthcare system load balancing</div>
              </div>
              <div className="mt-4 p-3 bg-green-900/30 rounded-lg">
                <div className="text-xs text-green-200">
                  Sources: National Weather Service, CMS Hospital System, 
                  ERCOT Grid Operations, HRSA Provider Data
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BeforeAfterComparison;
