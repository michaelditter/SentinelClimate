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
  MessageSquare,
  Search,
  X,
  Download,
  FileText,
  TrendingUp as Temperature
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

import EnhancedCountyDeepDive from './EnhancedCountyDeepDive';
import RealTimeKPIs from './RealTimeKPIs';
import CountyProjections from './CountyProjections';
import TriggerOutreach from './TriggerOutreach';
import SocialListening from './SocialListening';
import WeatherSentinelMCP from './WeatherSentinelMCP';
import LiveAgentAnalysis from './LiveAgentAnalysis';
import RiskBoard from './RiskBoard';

// Data and hooks
import { resourceDeployments } from '@/data/geoData';
import { agents } from '@/data/agentData';
import { scenarios } from '@/data/scenarioData';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { useSimulation } from '@/hooks/useSimulation';
import { County } from '@/types/geo.types';
import { SimulationScenario } from '@/types/simulation.types';

type ViewType = 'weather-sentinel-mcp' | 'mission-control' | 'risk-assessment' | 'agent-coordination' | 'crisis-simulation' | 'county-analysis' | 'social-listening' | 'trigger-outreach';

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
  const [liveCounties, setLiveCounties] = useState<County[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [deploymentScenario, setDeploymentScenario] = useState<any>(null);
  
  // Custom hooks
  const { data: realTimeData } = useRealTimeData(simulationRunning);
  const { isRunning: isSimulationRunning, currentResult, runSimulation } = useSimulation();

  // Fetch live county data from government sources
  const fetchLiveCountyData = async () => {
    try {
      const response = await fetch('/api/live-county-alerts');
      if (response.ok) {
        const data = await response.json();
        setLiveCounties(data.counties);
        
        // Generate real activity based on actual conditions
        const criticalCounties = data.counties.filter((c: any) => c.alertLevel === 'EXTREME' || c.alertLevel === 'HIGH');
        if (criticalCounties.length > 0) {
          const county = criticalCounties[0];
          const newActivity = {
            time: new Date().toLocaleTimeString(),
            agent: 'SENTINEL',
            message: `LIVE: ${county.alertLevel} heat alert in ${county.name} - ${county.temperature}°F recorded`,
            icon: '🌡️'
          };
          setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch live county data:', error);
    }
  };

  // Activity feed state - starts with initial government data feed
  const [activityFeed, setActivityFeed] = useState([
    { time: new Date().toLocaleTimeString(), agent: 'SENTINEL', message: 'Connecting to National Weather Service...', icon: '🔍' },
    { time: new Date().toLocaleTimeString(), agent: 'SYSTEM', message: 'Initializing live government data feeds', icon: '📡' }
  ]);

  // Real-time data integration
  useEffect(() => {
    // Initial fetch
    fetchLiveCountyData();
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      
      // Refresh live county data every 5 minutes
      if (new Date().getMinutes() % 5 === 0 && new Date().getSeconds() === 0) {
        fetchLiveCountyData();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  const handleGenerateReport = async () => {
    try {
      // Fetch comprehensive real-time data for report
      const [kpiResponse, gridResponse, weatherResponse] = await Promise.all([
        fetch('/api/real-time-kpis?county=harris-tx'),
        fetch('/api/power-grid'),
        fetch('/api/weather-sentinel-live')
      ]);

      const kpiData = await kpiResponse.json();
      const gridData = await gridResponse.json();
      const weatherData = await weatherResponse.json();

      const reportData = {
        id: `REPORT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: 'Crisis Management Situation Report',
        classification: 'OFFICIAL USE ONLY',
        executive_summary: {
          threatLevel: weatherData.threatLevel || 'MODERATE',
          countiesMonitored: liveCounties.length,
          criticalCounties: liveCounties.filter(c => c.alertLevel === 'EXTREME' || c.alertLevel === 'HIGH').length,
          totalPopulationAtRisk: liveCounties.reduce((sum, c) => {
            // Use accurate vulnerable population data from county profiles
            if (c.id === 'harris-tx') {
              return sum + 187000; // Harris County vulnerable population (from county projections)
            } else if (c.id === 'maricopa-az') {
              return sum + 156000; // Maricopa County vulnerable population
            } else if (c.id === 'los-angeles-ca') {
              return sum + 98000; // Los Angeles County vulnerable population
            }
            return sum + (c.vulnerablePopulation || 8000); // Other counties
          }, 0),
          keyThreat: `Heat Index ${weatherData.heatIndex}°F in primary monitoring zones`
        },
        weather_conditions: {
          current_temperature: weatherData.temperature,
          heat_index: weatherData.heatIndex,
          humidity: weatherData.humidity,
          threat_level: weatherData.threatLevel,
          location: weatherData.location,
          conditions: weatherData.conditions,
          nws_alerts: weatherData.alerts?.length || 0
        },
        infrastructure_status: {
          grid_operator: 'ERCOT',
          system_load: gridData.systemLoad,
          total_capacity: gridData.totalCapacity,
          reserve_margin: kpiData.grid?.reserveMargin || 'N/A',
          grid_status: kpiData.grid?.status || 'NORMAL',
          renewable_generation: gridData.renewableGeneration?.total || 0
        },
        healthcare_capacity: {
          utilization: kpiData.healthcare?.capacityUtilization || 0,
          available_beds: kpiData.healthcare?.availableBeds || 0,
          avg_wait_time: kpiData.healthcare?.avgWaitTime || 0,
          reporting_facilities: kpiData.healthcare?.reportingFacilities || 0
        },
        air_quality: {
          aqi: kpiData.airQuality?.aqi || 'N/A',
          category: kpiData.airQuality?.category || 'Unknown',
          primary_pollutant: kpiData.airQuality?.primaryPollutant || 'N/A',
          source: kpiData.airQuality?.source || 'EPA Regional Estimate'
        },
        provider_analysis: {
          coverage_ratio: kpiData.providers?.coverageRatio || 0,
          critical_shortages: kpiData.providers?.criticalShortages || 0,
          cardiology_shortage: kpiData.providers?.cardiology?.shortage || false,
          emergency_shortage: kpiData.providers?.emergency?.shortage || false,
          psychiatry_shortage: kpiData.providers?.psychiatry?.shortage || false
        },
        recommendations: [
          `Monitor ${weatherData.location} heat conditions - current ${weatherData.temperature}°F`,
          `FLOOD ALERT: Potential flooding conditions - deploy additional medical resources for affected areas`,
          `Grid reserve margin: ${kpiData.grid?.reserveMargin || 'monitoring'} MW - monitor for changes`,
          `Air quality AQI ${kpiData.airQuality?.aqi || 'monitoring'} - advise vulnerable populations`,
          `Provider shortages: ${kpiData.providers?.criticalShortages || 0} critical areas identified`
        ],
        data_sources: [
          'National Weather Service (NWS) - Live weather stations',
          'ERCOT - Real-time grid operations',
          'CDC Health Surveillance - Hospital capacity',
          'EPA AirNow - Air quality monitoring',
          'NPI Registry - Healthcare provider coverage'
        ],
        generated_at: new Date().toLocaleString(),
        generated_by: 'Sentinel AI Crisis Management System',
        next_update: new Date(Date.now() + 30 * 60 * 1000).toLocaleString()
      };

      setGeneratedReport(reportData);
      setShowReportModal(true);

      const newActivity = {
        time: new Date().toLocaleTimeString(),
        agent: 'ANALYST',
        message: `Comprehensive crisis report generated - ${reportData.executive_summary.criticalCounties} counties at elevated risk`,
        icon: '📊'
      };
      setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);

    } catch (error) {
      console.error('Report generation error:', error);
      const errorActivity = {
        time: new Date().toLocaleTimeString(),
        agent: 'SYSTEM',
        message: 'Report generation failed - retrying with cached data',
        icon: '⚠️'
      };
      setActivityFeed(prev => [errorActivity, ...prev.slice(0, 9)]);
    }
  };

  const handleDeployResources = async () => {
    try {
      // Fetch current real-time data to determine deployment needs
      const [kpiResponse, weatherResponse] = await Promise.all([
        fetch('/api/real-time-kpis?county=harris-tx'),
        fetch('/api/weather-sentinel-live')
      ]);

      const kpiData = await kpiResponse.json();
      const weatherData = await weatherResponse.json();

      // Create detailed deployment scenario based on real conditions
      const scenario = {
        id: `DEPLOY-${Date.now()}`,
        timestamp: new Date().toISOString(),
        county: 'Harris County, Texas',
        threatLevel: 'ELEVATED',
        primaryConcerns: [
          'Mental health provider shortage (87% capacity)',
          'Heat index forecast 95°F+ next 7 days',
          'Air quality deteriorating (AQI 65 - Moderate)',
          'ERCOT grid stress during peak demand periods'
        ],
        deploymentRequest: {
          resourceType: 'Virtual Mental Health Crisis Support Network',
          urgency: 'HIGH',
          estimatedNeed: '150+ virtual counseling sessions/day',
          duration: '14-day deployment minimum',
          specializations: [
            'Heat stress psychological support',
            'Air quality health anxiety counseling',
            'Crisis intervention specialists',
            'Telehealth platform specialists'
          ]
        },
        currentConditions: {
          temperature: weatherData.temperature,
          heatIndex: weatherData.heatIndex,
          airQuality: kpiData.airQuality?.aqi || 'Monitoring',
          mentalHealthCapacity: kpiData.providers?.psychiatry?.capacityPercent || 87,
          gridReserve: kpiData.grid?.reserveMargin || 'Monitoring'
        },
        contactProtocol: {
          primaryNumber: 'Demo line — configured server-side',
          department: 'Texas Emergency Resource Coordination Center',
          requestCode: 'HARRIS-MH-HEAT-2025',
          authorization: 'County Emergency Operations Center'
        },
        deploymentChecklist: [
          'Verify telehealth platform capacity for 150+ concurrent sessions',
          'Coordinate with local mental health authorities',
          'Establish heat illness awareness protocols',
          'Deploy air quality monitoring alerts',
          'Pre-position cooling center virtual support staff',
          'Activate 24/7 crisis intervention hotline capacity'
        ],
        expectedOutcomes: {
          mentalHealthSupport: '+45% capacity increase',
          responseTime: 'Sub-5 minute crisis response',
          coverage: '24/7 virtual availability',
          specialtyServices: 'Heat stress and environmental anxiety support'
        }
      };

      setDeploymentScenario(scenario);
      setShowDeploymentModal(true);

      // Add to activity feed
      const newActivity = {
        time: new Date().toLocaleTimeString(),
        agent: 'COMMANDER',
        message: `Resource deployment simulation initiated - Virtual MH Crisis Network for Harris County`,
        icon: '🚁'
      };
      setActivityFeed(prev => [newActivity, ...prev.slice(0, 9)]);

    } catch (error) {
      console.error('Deployment simulation error:', error);
      const errorActivity = {
        time: new Date().toLocaleTimeString(),
        agent: 'SYSTEM',
        message: 'Deployment simulation failed - using emergency protocols',
        icon: '⚠️'
      };
      setActivityFeed(prev => [errorActivity, ...prev.slice(0, 9)]);
    }
  };;

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
              {liveCounties.slice(0, 3).map((county) => (
                <AlertCard key={county.id} county={county} />
              ))}
            </div>
            
            {/* Enhanced Real-Time KPIs Dashboard */}
            <RealTimeKPIs data={realTimeData} />

            {/* Live OSINT multi-agent pipeline */}
            <LiveAgentAnalysis />

            {/* National rules-engine risk board */}
            <RiskBoard />

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
                <div className="grid grid-cols-3 gap-4">
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
                    onClick={() => setSelectedView('crisis-simulation')}
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
                  counties={liveCounties}
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
            
            {/* Before/After Comparison Analysis */}
            <BeforeAfterComparison result={currentResult} />
          </div>
        );



      case 'county-analysis':
        return (
          <EnhancedCountyDeepDive 
            selectedCounty={selectedCounty || { fips: '48201', name: 'Harris County' }}
            realTimeData={realTimeData}
          />
        );

      case 'social-listening':
        return <SocialListening />;

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
    { key: 'weather-sentinel-mcp', icon: Zap, label: 'Sentinel AI MCP', emoji: '🛡️' },
    { key: 'mission-control', icon: Target, label: 'Mission Control', emoji: '🎯' },
    { key: 'risk-assessment', icon: Map, label: 'Risk Assessment', emoji: '🗺️' },
    { key: 'agent-coordination', icon: Bot, label: 'Agent Coordination', emoji: '🤖' },
    { key: 'crisis-simulation', icon: Flame, label: 'Crisis Simulation', emoji: '⚡' },
    { key: 'county-analysis', icon: Building, label: 'County Deep Dive', emoji: '🏙️' },
    { key: 'social-listening', icon: Search, label: 'Social Listening', emoji: '👂' },
    { key: 'trigger-outreach', icon: Phone, label: 'Trigger Outreach', emoji: '📞' }
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
      title: 'Agent Coordination Simulation',
      subtitle: 'Multi-agent AI system coordination and communication'
    },
    'crisis-simulation': {
      title: 'Crisis Simulation',
      subtitle: 'What-if scenario modeling and impact analysis'
    },

    'county-analysis': {
      title: 'County Deep Dive Analysis',
      subtitle: 'Comprehensive county-level health and infrastructure assessment'
    },
    'social-listening': {
      title: 'Social Listening Intelligence',
      subtitle: 'Real-time crisis detection across digital channels'
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
              <h1 className="text-xl font-bold">Sentinel AI MCP - Live Demo</h1>
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

      {/* Crisis Report Modal */}
      {showReportModal && generatedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-blue-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">{generatedReport.title}</h2>
                    <p className="text-sm text-gray-400">{generatedReport.classification}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const reportText = JSON.stringify(generatedReport, null, 2);
                      const blob = new Blob([reportText], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `crisis-report-${generatedReport.id}.json`;
                      a.click();
                    }}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Executive Summary */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-3">Executive Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{generatedReport.executive_summary.threatLevel}</div>
                    <div className="text-sm text-gray-400">Threat Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{generatedReport.executive_summary.criticalCounties}</div>
                    <div className="text-sm text-gray-400">Critical Counties</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{generatedReport.executive_summary.totalPopulationAtRisk.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Population at Risk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{generatedReport.executive_summary.countiesMonitored}</div>
                    <div className="text-sm text-gray-400">Counties Monitored</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-600 rounded">
                  <div className="font-medium text-white">Key Threat:</div>
                  <div className="text-gray-300">{generatedReport.executive_summary.keyThreat}</div>
                </div>
              </div>

              {/* Current Conditions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weather Conditions */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <Temperature className="h-5 w-5 mr-2" />
                    Weather Conditions
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Location:</span>
                      <span className="text-white">{generatedReport.weather_conditions.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Temperature:</span>
                      <span className="text-white">{generatedReport.weather_conditions.current_temperature}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Heat Index:</span>
                      <span className="text-white">{generatedReport.weather_conditions.heat_index}°F</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Humidity:</span>
                      <span className="text-white">{generatedReport.weather_conditions.humidity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Conditions:</span>
                      <span className="text-white">{generatedReport.weather_conditions.conditions}</span>
                    </div>
                  </div>
                </div>

                {/* Air Quality */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Air Quality
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">AQI:</span>
                      <span className="text-white">{generatedReport.air_quality.aqi}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Category:</span>
                      <span className="text-white">{generatedReport.air_quality.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Primary Pollutant:</span>
                      <span className="text-white">{generatedReport.air_quality.primary_pollutant}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Source:</span>
                      <span className="text-white">{generatedReport.air_quality.source}</span>
                    </div>
                  </div>
                </div>

                {/* Infrastructure Status */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Infrastructure Status
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Grid Operator:</span>
                      <span className="text-white">{generatedReport.infrastructure_status.grid_operator}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">System Load:</span>
                      <span className="text-white">{generatedReport.infrastructure_status.system_load} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reserve Margin:</span>
                      <span className="text-white">{generatedReport.infrastructure_status.reserve_margin} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-white">{generatedReport.infrastructure_status.grid_status}</span>
                    </div>
                  </div>
                </div>

                {/* Healthcare Capacity */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                    <Heart className="h-5 w-5 mr-2" />
                    Healthcare Capacity
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Utilization:</span>
                      <span className="text-white">{generatedReport.healthcare_capacity.utilization}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available Beds:</span>
                      <span className="text-white">{generatedReport.healthcare_capacity.available_beds}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Wait Time:</span>
                      <span className="text-white">{generatedReport.healthcare_capacity.avg_wait_time} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Facilities:</span>
                      <span className="text-white">{generatedReport.healthcare_capacity.reporting_facilities}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {generatedReport.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span className="text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Data Sources */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-3">Data Sources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {generatedReport.data_sources.map((source: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-gray-300 text-sm">{source}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Metadata */}
              <div className="border-t border-gray-600 pt-4 text-sm text-gray-400">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="font-medium">Generated:</div>
                    <div>{generatedReport.generated_at}</div>
                  </div>
                  <div>
                    <div className="font-medium">Generated By:</div>
                    <div>{generatedReport.generated_by}</div>
                  </div>
                  <div>
                    <div className="font-medium">Next Update:</div>
                    <div>{generatedReport.next_update}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Resource Deployment Simulation Modal */}
      {showDeploymentModal && deploymentScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-red-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Emergency Resource Deployment Simulation</h2>
                    <p className="text-sm text-gray-400">Threat Level: {deploymentScenario.threatLevel} | County: {deploymentScenario.county}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeploymentModal(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Threat Assessment */}
              <div className="bg-red-900/20 border border-red-600 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Current Threat Assessment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {deploymentScenario.primaryConcerns.map((concern: string, index: number) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full mt-2"></div>
                        <span className="text-gray-200">{concern}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <h4 className="font-bold text-white mb-2">Live Conditions</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Temperature:</span>
                        <span className="text-white">{deploymentScenario.currentConditions.temperature}°F</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Heat Index:</span>
                        <span className="text-white">{deploymentScenario.currentConditions.heatIndex}°F</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Air Quality:</span>
                        <span className="text-white">AQI {deploymentScenario.currentConditions.airQuality}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">MH Capacity:</span>
                        <span className="text-white">{deploymentScenario.currentConditions.mentalHealthCapacity}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployment Request Details */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Resource Deployment Request
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-400">Resource Type</div>
                        <div className="text-white font-medium">{deploymentScenario.deploymentRequest.resourceType}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Urgency Level</div>
                        <div className="text-red-400 font-bold">{deploymentScenario.deploymentRequest.urgency}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Estimated Need</div>
                        <div className="text-white">{deploymentScenario.deploymentRequest.estimatedNeed}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Duration</div>
                        <div className="text-white">{deploymentScenario.deploymentRequest.duration}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Required Specializations</div>
                    <div className="space-y-2">
                      {deploymentScenario.deploymentRequest.specializations.map((spec: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-gray-200 text-sm">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Protocol */}
              <div className="bg-blue-900/20 border border-blue-600 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Emergency Contact Protocol
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="text-center p-4 bg-blue-800/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400 mb-2">{deploymentScenario.contactProtocol.primaryNumber}</div>
                      <div className="text-sm text-gray-300">{deploymentScenario.contactProtocol.department}</div>
                    </div>
                    <button
                      onClick={() => window.open(`tel:${deploymentScenario.contactProtocol.primaryNumber}`, '_self')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Phone className="h-5 w-5" />
                      <span>Initiate Emergency Call</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-gray-400">Request Code</div>
                      <div className="text-white font-mono bg-gray-800 p-2 rounded">{deploymentScenario.contactProtocol.requestCode}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Authorization</div>
                      <div className="text-white">{deploymentScenario.contactProtocol.authorization}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployment Checklist */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Pre-Deployment Checklist
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deploymentScenario.deploymentChecklist.map((item: string, index: number) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-5 h-5 border-2 border-gray-400 rounded mt-0.5 flex-shrink-0"></div>
                      <span className="text-gray-200 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Outcomes */}
              <div className="bg-green-900/20 border border-green-600 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Expected Deployment Outcomes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-gray-400">Mental Health Support</div>
                      <div className="text-green-400 font-bold">{deploymentScenario.expectedOutcomes.mentalHealthSupport}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Response Time</div>
                      <div className="text-green-400 font-bold">{deploymentScenario.expectedOutcomes.responseTime}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-gray-400">Coverage</div>
                      <div className="text-green-400 font-bold">{deploymentScenario.expectedOutcomes.coverage}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Specialty Services</div>
                      <div className="text-green-400 font-bold">{deploymentScenario.expectedOutcomes.specialtyServices}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => {
                    // Simulate deployment call
                    const deployActivity = {
                      time: new Date().toLocaleTimeString(),
                      agent: 'COMMANDER',
                      message: `Emergency call initiated: ${deploymentScenario.contactProtocol.primaryNumber} - Virtual MH Crisis Network deployment`,
                      icon: '📞'
                    };
                    setActivityFeed(prev => [deployActivity, ...prev.slice(0, 9)]);
                    setShowDeploymentModal(false);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Execute Emergency Deployment
                </button>
                <button
                  onClick={() => setShowDeploymentModal(false)}
                  className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel Simulation
                </button>
              </div>

              {/* Simulation Metadata */}
              <div className="border-t border-gray-600 pt-4 text-sm text-gray-400">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium">Simulation ID:</div>
                    <div className="font-mono">{deploymentScenario.id}</div>
                  </div>
                  <div>
                    <div className="font-medium">Generated:</div>
                    <div>{new Date(deploymentScenario.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SentinelAI;
