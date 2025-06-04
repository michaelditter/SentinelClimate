import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Activity, 
  MapPin, 
  Users, 
  TrendingUp, 
  Clock, 
  Shield, 
  Zap, 
  Heart, 
  DollarSign, 
  Building, 
  Timer, 
  Settings, 
  BarChart3, 
  Calculator,
  Target,
  Map,
  Bot,
  Flame,
  Banknote,
  Phone,
  MessageSquare
} from 'lucide-react';

// Component imports
import InteractiveMap from './map/InteractiveMap';
import CountyDetails from './map/CountyDetails';
import ResourceMarkers from './map/ResourceMarkers';
import AgentCommunication from './agents/AgentCommunication';
import DecisionFlow from './agents/DecisionFlow';
import PerformanceMetrics from './agents/PerformanceMetrics';
import ScenarioGenerator from './simulation/ScenarioGenerator';
import BeforeAfterComparison from './simulation/BeforeAfterComparison';
import EconomicCalculator from './simulation/EconomicCalculator';
import EnhancedCountyDeepDive from './EnhancedCountyDeepDive';
import RealTimeKPIs from './RealTimeKPIs';
import CountyProjections from './CountyProjections';
import TriggerOutreach from './TriggerOutreach';
import WeatherSentinelMCP from './WeatherSentinelMCP';

// Data and hooks
import { counties, resourceDeployments } from '@/data/geoData';
import { agents } from '@/data/agentData';
import { scenarios } from '@/data/scenarioData';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { useSimulation } from '@/hooks/useSimulation';
import { County } from '@/types/geo.types';
import { SimulationScenario } from '@/types/simulation.types';

type ViewType = 'weather-sentinel-mcp' | 'mission-control' | 'risk-assessment' | 'agent-coordination' | 'crisis-simulation' | 'economic-analysis' | 'county-analysis' | 'trigger-outreach';

const SentinelAI: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedView, setSelectedView] = useState<ViewType>('weather-sentinel-mcp');
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [analysisSteps, setAnalysisSteps] = useState<any[]>([]);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [callTarget, setCallTarget] = useState({ name: '', phoneNumber: '' });
  const [selectedAgent, setSelectedAgent] = useState<'SENTINEL' | 'MEDIC' | 'DISPATCHER' | 'COMMANDER'>('COMMANDER');
  const [phoneNumber, setPhoneNumber] = useState('+15551234567');
  
  // Custom hooks
  const { data: realTimeData } = useRealTimeData(simulationRunning);
  const { isRunning: isSimulationRunning, currentResult, runSimulation } = useSimulation();

  // Activity feed state
  const [activityFeed, setActivityFeed] = useState([
    { time: '13:45:32', agent: 'SENTINEL', message: 'Detected heat spike in Harris County +8°F', icon: '🔍' },
    { time: '13:45:30', agent: 'MEDIC', message: 'Updated surge prediction: 24% increase', icon: '🏥' },
    { time: '13:45:28', agent: 'DISPATCHER', message: 'Deploying 8 mobile units to Zone Alpha', icon: '🚀' },
    { time: '13:45:25', agent: 'COMMANDER', message: 'Authorized cooling center activation', icon: '⚡' }
  ]);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      
      // Add new activity occasionally
      if (Math.random() > 0.95) {
        const newActivity = {
          time: new Date().toLocaleTimeString(),
          agent: ['SENTINEL', 'MEDIC', 'DISPATCHER', 'COMMANDER'][Math.floor(Math.random() * 4)],
          message: [
            'Processing new weather data',
            'Updating risk calculations',
            'Resource deployment in progress',
            'Strategic assessment complete'
          ][Math.floor(Math.random() * 4)],
          icon: ['🔍', '🏥', '🚀', '⚡'][Math.floor(Math.random() * 4)]
        };
        
        setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSimulationRun = async (scenario: SimulationScenario) => {
    try {
      await runSimulation(scenario);
    } catch (error) {
      console.error('Simulation failed:', error);
    }
  };

  const handleEmergencyCall = async (agentType: string, message: string) => {
    try {
      const response = await fetch('/api/emergency-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: message,
          agentType: agentType,
          severity: 'CRITICAL'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate emergency call');
      }

      const result = await response.json();
      console.log('Emergency call initiated:', result);
      
      // Add to activity feed
      const newActivity = {
        time: new Date().toLocaleTimeString(),
        agent: agentType,
        message: `Emergency call initiated: ${message}`,
        icon: '📞'
      };
      setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);

    } catch (error) {
      console.error('Emergency call error:', error);
    }
  };

  const handleEmergencySMS = async (agentType: string, message: string) => {
    try {
      const response = await fetch('/api/emergency-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          message: message,
          agentType: agentType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send emergency SMS');
      }

      const result = await response.json();
      console.log('Emergency SMS sent:', result);
      
      // Add to activity feed
      const newActivity = {
        time: new Date().toLocaleTimeString(),
        agent: agentType,
        message: `SMS alert sent: ${message}`,
        icon: '📱'
      };
      setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);

    } catch (error) {
      console.error('Emergency SMS error:', error);
    }
  };

  const handleEmergencyAlert = () => {
    const alertMessage = 'CRITICAL: Multi-county heat emergency detected. Immediate response required.';
    handleEmergencyCall('COMMANDER', alertMessage);
    
    const newActivity = {
      time: new Date().toLocaleTimeString(),
      agent: 'SYSTEM',
      message: 'Emergency alert broadcast initiated',
      icon: '🚨'
    };
    setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);
  };

  const handleGenerateReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      criticalCounties: counties.filter(c => c.alertLevel === 'EXTREME').length,
      totalPopulationAtRisk: counties.reduce((sum, c) => sum + c.vulnerablePopulation, 0),
      systemLoad: realTimeData?.powerGrid?.systemLoad || 0,
      recommendations: [
        'Deploy additional cooling centers in Harris County',
        'Increase hospital staffing for surge capacity',
        'Activate emergency power reserves'
      ]
    };

    console.log('Generated Report:', reportData);
    
    const newActivity = {
      time: new Date().toLocaleTimeString(),
      agent: 'ANALYST',
      message: `Crisis report generated - ${reportData.criticalCounties} counties at extreme risk`,
      icon: '📊'
    };
    setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);
  };

  const handleDeployResources = () => {
    const resourceCount = Math.floor(Math.random() * 5) + 3;
    const targetCounties = counties.filter(c => c.alertLevel === 'EXTREME' || c.alertLevel === 'HIGH');
    
    const newActivity = {
      time: new Date().toLocaleTimeString(),
      agent: 'DISPATCHER',
      message: `Deploying ${resourceCount} mobile units to ${targetCounties.length} high-risk counties`,
      icon: '🚛'
    };
    setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);
  };

  const handleRunSimulation = () => {
    if (scenarios.length > 0) {
      const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      handleSimulationRun(randomScenario);
      
      const newActivity = {
        time: new Date().toLocaleTimeString(),
        agent: 'SIMULATOR',
        message: `Running simulation: ${randomScenario.name}`,
        icon: '🔬'
      };
      setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);
    }
  };

  const handleCrisisCall = async (agentType: string, severity: string) => {
    const crisisMessage = `CRISIS ALERT: ${agentType} agent detecting ${severity} grid-health cascade failure risk in Harris County. Immediate cooling center activation and EMS coordination required.`;
    await handleEmergencyCall(agentType, crisisMessage);
  };

  const handleSendSMS = async (agentType: string, severity: string) => {
    const smsMessage = `SENTINEL AI ALERT: ${severity} priority - Grid instability detected during heat emergency. Deploy mobile cooling units to vulnerable populations immediately.`;
    await handleEmergencySMS(agentType, smsMessage);
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'EXTREME': return 'bg-red-600 border-red-400';
      case 'HIGH': return 'bg-orange-500 border-orange-400';
      case 'MODERATE': return 'bg-yellow-500 border-yellow-400';
      default: return 'bg-green-500 border-green-400';
    }
  };

  const AlertCard: React.FC<{ county: County }> = ({ county }) => (
    <motion.div 
      className={`${getAlertColor(county.alertLevel)} text-white p-4 rounded-lg border-2 shadow-lg`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex justify-between items-center">
        <div>
          <span className="font-bold text-lg">{county.alertLevel}</span>
          <div className="text-sm opacity-90">{county.name}, {county.state}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{Math.round(county.temperature)}°F</div>
          <div className="text-sm">{county.vulnerablePopulation.toLocaleString()} at risk</div>
        </div>
      </div>
      <div className="mt-2">
        <div className="text-sm mb-1">Risk Score: {county.riskScore}/100</div>
        <div className="w-full bg-black bg-opacity-20 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full" 
            style={{ width: `${county.riskScore}%` }}
          />
        </div>
      </div>
    </motion.div>
  );

  const AgentCard: React.FC<{ agent: any }> = ({ agent }) => (
    <motion.div 
      className="bg-gray-800 rounded-lg shadow-lg border-l-4 border-blue-500 p-6"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{agent.icon}</span>
          <div>
            <h3 className="font-bold text-lg text-gray-100">{agent.name}</h3>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              agent.status.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'
            }`}>
              {agent.status.status}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 text-sm text-gray-300">
        {Object.entries(agent.status.metrics).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
            <span className="font-medium text-gray-100">{String(value)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const MetricCard: React.FC<{ icon: React.ElementType; value: string | number; label: string; color: string; trend?: string }> = ({ 
    icon: Icon, value, label, color, trend 
  }) => (
    <motion.div 
      className={`bg-gray-800 p-6 rounded-lg border-l-4 ${color} shadow-lg hover:bg-gray-750 transition-colors`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
        {trend && <TrendingUp className="h-5 w-5 text-green-400" />}
      </div>
      <div className="text-3xl font-bold text-gray-100 mb-1">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
      {trend && <div className="text-xs text-green-400 mt-1">{trend}</div>}
    </motion.div>
  );

  const renderView = () => {
    switch (selectedView) {
      case 'weather-sentinel-mcp':
        return <WeatherSentinelMCP />;
      
      case 'mission-control':
        return (
          <div className="space-y-6">
            {/* Active Alerts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {counties.slice(0, 3).map((county) => (
                <AlertCard key={county.id} county={county} />
              ))}
            </div>
            
            {/* Enhanced Real-Time KPIs Dashboard */}
            <RealTimeKPIs data={realTimeData} />
            
            {/* Activity Feed and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center text-gray-100">
                  <Activity className="h-5 w-5 mr-2" />
                  Live Activity Feed
                </h3>
                <div className="space-y-3 max-h-96 overflow-auto">
                  <AnimatePresence>
                    {activityFeed.map((activity, index) => (
                      <motion.div
                        key={`${activity.time}-${index}`}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg"
                      >
                        <span className="text-2xl">{activity.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="text-blue-400 font-bold">{activity.agent}</span>
                            <span className="text-gray-400 ml-2">{activity.time}</span>
                          </div>
                          <div className="text-sm text-gray-300">{activity.message}</div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center text-gray-100">
                  <Target className="h-5 w-5 mr-2" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button 
                    onClick={handleEmergencyAlert}
                    className="bg-red-600 hover:bg-red-700 p-4 rounded-lg text-center transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-2xl mb-2">🚨</div>
                    <div className="font-medium text-white">Emergency Alert</div>
                  </motion.button>
                  <motion.button 
                    onClick={handleGenerateReport}
                    className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg text-center transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-medium text-white">Generate Report</div>
                  </motion.button>
                  <motion.button 
                    onClick={handleDeployResources}
                    className="bg-orange-600 hover:bg-orange-700 p-4 rounded-lg text-center transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-2xl mb-2">🚑</div>
                    <div className="font-medium text-white">Deploy Resources</div>
                  </motion.button>
                  <motion.button 
                    onClick={handleRunSimulation}
                    className="bg-purple-600 hover:bg-purple-700 p-4 rounded-lg text-center transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-2xl mb-2">🎮</div>
                    <div className="font-medium text-white">Run Simulation</div>
                  </motion.button>
                </div>
                

              </div>
            </div>
          </div>
        );

      case 'risk-assessment':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2">
              <div className="bg-gray-800 p-6 rounded-lg h-full shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center text-gray-100">
                  <Map className="h-5 w-5 mr-2" />
                  Interactive Heat Risk Map
                </h3>
                <InteractiveMap
                  counties={counties}
                  selectedCounty={selectedCounty}
                  onCountySelect={setSelectedCounty}
                />
              </div>
            </div>
            
            <div className="space-y-6">
              <CountyDetails county={selectedCounty} />
              <ResourceMarkers deployments={resourceDeployments} />
            </div>
          </div>
        );

      case 'agent-coordination':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
            
            <DecisionFlow isActive={simulationRunning} />
            <AgentCommunication isActive={simulationRunning} />
            <PerformanceMetrics isActive={simulationRunning} />
          </div>
        );

      case 'crisis-simulation':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScenarioGenerator
                onRunSimulation={handleSimulationRun}
                isRunning={isSimulationRunning}
              />
              
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center text-gray-100">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Predicted Impact Summary
                </h3>
                
                {currentResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-red-400">{currentResult.outcomes.actual.deaths}</div>
                        <div className="text-sm text-gray-400">Est. Deaths</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-orange-400">+{((currentResult.outcomes.actual.edVisits / 1000) * 0.37).toFixed(0)}%</div>
                        <div className="text-sm text-gray-400">ED Visits</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400">${currentResult.outcomes.actual.economicImpact.toFixed(1)}M</div>
                        <div className="text-sm text-gray-400">Economic Impact</div>
                      </div>
                      <div className="text-center p-4 bg-gray-700 rounded-lg">
                        <div className="text-2xl font-bold text-blue-400">{currentResult.outcomes.actual.responseTime}h</div>
                        <div className="text-sm text-gray-400">Duration</div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-600 p-4 rounded-lg">
                      <div className="font-bold text-white">HIGH SEVERITY</div>
                      <div className="text-sm text-yellow-100">Intervention recommended</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    Run a simulation to see impact predictions
                  </div>
                )}
              </div>
            </div>
            
            <BeforeAfterComparison result={currentResult} />
          </div>
        );

      case 'economic-analysis':
        return (
          <EconomicCalculator
            simulationResult={currentResult}
            isActive={simulationRunning}
          />
        );

      case 'county-analysis':
        return (
          <EnhancedCountyDeepDive 
            selectedCounty={selectedCounty || { fips: '48201', name: 'Harris County' }}
            realTimeData={realTimeData}
          />
        );

      case 'trigger-outreach':
        return (
          <TriggerOutreach 
            selectedCounty={selectedCounty}
            realTimeData={realTimeData}
          />
        );

      default:
        return null;
    }
  };

  const navigationItems = [
    { key: 'weather-sentinel-mcp', icon: Zap, label: 'Weather Sentinel MCP', emoji: '🛡️' },
    { key: 'mission-control', icon: Target, label: 'Mission Control', emoji: '🎯' },
    { key: 'risk-assessment', icon: Map, label: 'Risk Assessment', emoji: '🗺️' },
    { key: 'agent-coordination', icon: Bot, label: 'Agent Coordination', emoji: '🤖' },
    { key: 'crisis-simulation', icon: Flame, label: 'Crisis Simulation', emoji: '⚡' },
    { key: 'trigger-outreach', icon: Phone, label: 'Trigger Outreach', emoji: '📞' },
    { key: 'economic-analysis', icon: Banknote, label: 'Economic Analysis', emoji: '💰' },
    { key: 'county-analysis', icon: Building, label: 'County Deep Dive', emoji: '🏙️' }
  ];

  const viewTitles: Record<ViewType, { title: string; subtitle: string }> = {
    'weather-sentinel-mcp': {
      title: 'Weather Sentinel MCP - Live Demo',
      subtitle: 'Real-time weather monitoring with AI agent cascade response'
    },
    'mission-control': {
      title: 'Mission Control Dashboard',
      subtitle: 'Real-time crisis monitoring and response coordination'
    },
    'risk-assessment': {
      title: 'Risk Assessment Map',
      subtitle: 'Geographic heat risk analysis and resource deployment'
    },
    'agent-coordination': {
      title: 'Agent Coordination',
      subtitle: 'Multi-agent AI system coordination and communication'
    },
    'crisis-simulation': {
      title: 'Crisis Simulation',
      subtitle: 'What-if scenario modeling and impact analysis'
    },
    'economic-analysis': {
      title: 'Economic Analysis',
      subtitle: 'Cost-benefit analysis and ROI projections'
    },
    'county-analysis': {
      title: 'County Deep Dive Analysis',
      subtitle: 'Comprehensive county-level health and infrastructure assessment'
    },
    'trigger-outreach': {
      title: 'Trigger Outreach System',
      subtitle: 'AI-powered crisis response and emergency communications'
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Sentinel AI</h1>
              <p className="text-sm text-gray-400">Crisis Management</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <motion.button
              key={item.key}
              onClick={() => setSelectedView(item.key as ViewType)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                selectedView === item.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="font-medium">{item.label}</span>
            </motion.button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-400">System Active</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {currentTime.toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-100">
                {viewTitles[selectedView].title}
              </h2>
              <p className="text-gray-400">
                {viewTitles[selectedView].subtitle}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-lg font-bold text-green-400">OPERATIONAL</div>
                <div className="text-sm text-gray-400">All Systems</div>
              </div>
              <motion.button 
                onClick={handleEmergencyAlert}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Emergency Alert
              </motion.button>
            </div>
          </div>
        </header>
        
        {/* Content Views */}
        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default SentinelAI;
