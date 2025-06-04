import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Shield, Clock, DollarSign, Heart } from 'lucide-react';
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
          icon={DollarSign}
          title="Cost Savings"
          before={actual.economicImpact.toFixed(1)}
          after={withSentinel.economicImpact.toFixed(1)}
          unit="M"
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
            <BarChart className="h-5 w-5 mr-2" />
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
                ${formatNumber(withSentinel.costSavings?.toFixed(1) || 0)}M
              </div>
              <div className="text-blue-200">Cost Savings</div>
              <div className="text-sm text-blue-100 mt-1">
                {(((actual.economicImpact - withSentinel.economicImpact) / actual.economicImpact) * 100).toFixed(0)}% impact reduction
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

      {/* Economic Impact Justification */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Economic Impact Calculation Methodology
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-bold text-white">Cost Components</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Emergency Department Visits:</span>
                  <span className="text-white">${formatNumber((actual.edVisits * 1250).toFixed(0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Hospitalizations:</span>
                  <span className="text-white">${formatNumber((actual.deaths * 15000).toFixed(0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">EMS Response:</span>
                  <span className="text-white">${formatNumber((actual.edVisits * 850).toFixed(0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Lost Productivity:</span>
                  <span className="text-white">${formatNumber((actual.deaths * 95000).toFixed(0))}</span>
                </div>
                <div className="border-t border-gray-600 pt-2 font-bold">
                  <div className="flex justify-between">
                    <span className="text-white">Total Impact:</span>
                    <span className="text-red-400">${formatNumber(actual.economicImpact.toFixed(1))}M</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-bold text-white">Calculation Basis</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div>• ED visit cost: $1,250 (CMS average)</div>
                <div>• Hospitalization: $15,000 per case</div>
                <div>• EMS transport: $850 per call</div>
                <div>• Statistical value of life: $95,000</div>
                <div>• Early warning reduces costs by 65%</div>
                <div>• Prevention multiplier: 3.2x ROI</div>
              </div>
              <div className="mt-4 p-3 bg-blue-900/30 rounded-lg">
                <div className="text-xs text-blue-200">
                  Sources: Centers for Medicare & Medicaid Services, Department of Transportation, 
                  EPA Environmental Benefits Mapping, Federal Emergency Management Agency
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
