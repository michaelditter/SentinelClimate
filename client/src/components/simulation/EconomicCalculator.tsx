import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, Calculator, PieChart, Building, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { SimulationResult, CostBreakdown, ROIProjection } from '@/types/simulation.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EconomicCalculatorProps {
  simulationResult: SimulationResult | null;
  isActive: boolean;
}

const EconomicCalculator: React.FC<EconomicCalculatorProps> = ({ simulationResult, isActive }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1year' | '5year' | '10year'>('5year');
  const [roiProjections, setROIProjections] = useState<ROIProjection[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [animateValues, setAnimateValues] = useState(false);

  // Calculate cost breakdown and ROI projections
  useEffect(() => {
    if (!simulationResult) return;

    const { outcomes } = simulationResult;
    const { actual, withSentinel } = outcomes;

    // Cost breakdown calculation
    const breakdown: CostBreakdown[] = [
      {
        category: 'Emergency Department Costs',
        withoutAI: actual.economicImpact * 0.35,
        withAI: withSentinel.economicImpact * 0.35,
        savings: (actual.economicImpact - withSentinel.economicImpact) * 0.35,
        description: 'Surge in ED visits, average $2,500 per visit',
        icon: '🏥'
      },
      {
        category: 'Hospitalization Costs',
        withoutAI: actual.economicImpact * 0.45,
        withAI: withSentinel.economicImpact * 0.45,
        savings: (actual.economicImpact - withSentinel.economicImpact) * 0.45,
        description: 'Heat-related admissions, average $18,000 per stay',
        icon: '🛏️'
      },
      {
        category: 'EMS & Emergency Response',
        withoutAI: actual.economicImpact * 0.15,
        withAI: withSentinel.economicImpact * 0.15,
        savings: (actual.economicImpact - withSentinel.economicImpact) * 0.15,
        description: 'Increased ambulance calls and emergency services',
        icon: '🚑'
      },
      {
        category: 'Lost Productivity',
        withoutAI: actual.economicImpact * 0.05,
        withAI: withSentinel.economicImpact * 0.05,
        savings: (actual.economicImpact - withSentinel.economicImpact) * 0.05,
        description: 'Work absences and reduced economic output',
        icon: '💼'
      }
    ];

    setCostBreakdown(breakdown);

    // ROI projections
    const totalSavingsPerEvent = withSentinel.costSavings || 0;
    const systemCostPerYear = 2.5; // $2.5M per year for system operation
    const eventsPerYear = 3; // Assume 3 major heat events per year

    const projections: ROIProjection[] = [];
    let cumulativeInvestment = 0;
    let cumulativeSavings = 0;

    for (let year = 1; year <= 10; year++) {
      const yearlyInvestment = year === 1 ? 5.0 : systemCostPerYear; // $5M initial, $2.5M ongoing
      const yearlySavings = totalSavingsPerEvent * eventsPerYear * (1 + year * 0.05); // Growing 5% per year
      
      cumulativeInvestment += yearlyInvestment;
      cumulativeSavings += yearlySavings;
      
      projections.push({
        year,
        investment: yearlyInvestment,
        savings: yearlySavings,
        cumulativeSavings: cumulativeSavings - cumulativeInvestment,
        roi: ((cumulativeSavings - cumulativeInvestment) / cumulativeInvestment) * 100
      });
    }

    setROIProjections(projections);
    
    // Trigger animation
    setAnimateValues(true);
    const timer = setTimeout(() => setAnimateValues(false), 2000);
    return () => clearTimeout(timer);
  }, [simulationResult]);

  if (!simulationResult) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <CardTitle className="text-xl mb-2">Economic Impact Calculator</CardTitle>
          <p className="text-gray-400">Run a crisis simulation to see detailed economic analysis</p>
        </CardContent>
      </Card>
    );
  }

  const totalSavings = costBreakdown.reduce((sum, item) => sum + item.savings, 0);
  const totalCostWithoutAI = costBreakdown.reduce((sum, item) => sum + item.withoutAI, 0);
  const savingsPercentage = (totalSavings / totalCostWithoutAI) * 100;

  const getProjectionData = () => {
    const years = selectedTimeframe === '1year' ? 1 : selectedTimeframe === '5year' ? 5 : 10;
    return roiProjections.slice(0, years);
  };

  const AnimatedNumber: React.FC<{ value: number; decimals?: number; prefix?: string; suffix?: string }> = ({ 
    value, decimals = 1, prefix = '', suffix = '' 
  }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      if (animateValues) {
        let start = 0;
        const end = value;
        const duration = 1500;
        const startTime = Date.now();

        const updateValue = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);
          
          setDisplayValue(start + (end - start) * easeOutCubic);

          if (progress < 1) {
            requestAnimationFrame(updateValue);
          }
        };

        updateValue();
      }
    }, [value, animateValues]);

    return (
      <span>
        {prefix}{displayValue.toFixed(decimals)}{suffix}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-800 to-blue-800 border-none">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl flex items-center text-white">
                <DollarSign className="h-6 w-6 mr-3" />
                Economic Impact Analysis
              </CardTitle>
              <p className="text-green-100 mt-1">Comprehensive cost-benefit analysis of Sentinel AI deployment</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                $<AnimatedNumber value={totalSavings} decimals={1} />M
              </div>
              <div className="text-sm text-green-100">Total Savings per Event</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          className="bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-green-500"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="flex justify-between items-start mb-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-100 mb-1">
            <AnimatedNumber value={savingsPercentage} decimals={0} suffix="%" />
          </div>
          <div className="text-sm text-gray-400 mb-2">Cost Reduction</div>
          <div className="text-xs text-green-400 font-medium">
            ${totalSavings.toFixed(1)}M saved per crisis
          </div>
        </motion.div>

        <motion.div 
          className="bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-blue-500"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="flex justify-between items-start mb-3">
            <Building className="h-8 w-8 text-blue-500" />
            <CheckCircle className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-100 mb-1">
            <AnimatedNumber value={roiProjections[4]?.roi || 0} decimals={0} suffix="%" />
          </div>
          <div className="text-sm text-gray-400 mb-2">5-Year ROI</div>
          <div className="text-xs text-blue-400 font-medium">
            Return on investment
          </div>
        </motion.div>

        <motion.div 
          className="bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-purple-500"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="flex justify-between items-start mb-3">
            <Users className="h-8 w-8 text-purple-500" />
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-100 mb-1">
            $<AnimatedNumber value={totalSavings * 1000000 / (simulationResult.outcomes.withSentinel.preventedDeaths || 1)} decimals={0} />
          </div>
          <div className="text-sm text-gray-400 mb-2">Cost per Life Saved</div>
          <div className="text-xs text-purple-400 font-medium">
            Statistical value comparison
          </div>
        </motion.div>

        <motion.div 
          className="bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-orange-500"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <div className="flex justify-between items-start mb-3">
            <Calculator className="h-8 w-8 text-orange-500" />
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-100 mb-1">
            <AnimatedNumber value={totalSavings / 2.5} decimals={1} suffix=":1" />
          </div>
          <div className="text-sm text-gray-400 mb-2">ROI Ratio</div>
          <div className="text-xs text-orange-400 font-medium">
            Annual operating cost ratio
          </div>
        </motion.div>
      </div>

      {/* Cost Breakdown Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Cost Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Category</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Without AI</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">With AI</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Savings</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">% Reduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {costBreakdown.map((item, index) => (
                  <motion.tr 
                    key={item.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-gray-700"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{item.icon}</span>
                        <div>
                          <div className="font-medium text-gray-100">{item.category}</div>
                          <div className="text-sm text-gray-400">{item.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-red-400">
                      $<AnimatedNumber value={item.withoutAI} />M
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-orange-400">
                      $<AnimatedNumber value={item.withAI} />M
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-bold text-green-400">
                      $<AnimatedNumber value={item.savings} />M
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-blue-400">
                      <AnimatedNumber value={(item.savings / item.withoutAI) * 100} decimals={0} suffix="%" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ROI Projection Chart */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              ROI Projection Timeline
            </CardTitle>
            <div className="flex space-x-2">
              {(['1year', '5year', '10year'] as const).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedTimeframe === timeframe
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {timeframe === '1year' ? '1 Year' : timeframe === '5year' ? '5 Years' : '10 Years'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getProjectionData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F9FAFB' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativeSavings" 
                  stroke="#10B981" 
                  fill="#10B981"
                  fillOpacity={0.3}
                  name="Net Savings ($M)"
                />
                <Area 
                  type="monotone" 
                  dataKey="roi" 
                  stroke="#3B82F6" 
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="ROI %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EconomicCalculator;
