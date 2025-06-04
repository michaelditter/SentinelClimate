import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Thermometer, 
  Zap, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Eye, 
  TrendingUp,
  Shield,
  Brain,
  Phone,
  MapPin,
  Cloud,
  Wind,
  Droplets,
  Users,
  Hospital,
  Truck,
  Radio,
  Building,
  Heart,
  CheckCircle,
  AlertCircle,
  Power,
  CloudRain,
  Gauge
} from 'lucide-react';

interface EnvironmentalData {
  temperature: number;
  heatIndex: number;
  humidity: number;
  airQuality: {
    aqi: number;
    category: string;
    pm25: number;
    ozone: number;
  };
  windSpeed: number;
  conditions: string;
  uvIndex: number;
  location: string;
  timestamp: string;
  threatLevel: 'NORMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'CRITICAL';
  alerts: WeatherAlert[];
  urbanHeatIsland: number;
  nwsOffice: string;
}

interface WeatherAlert {
  id: string;
  type: string;
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme';
  urgency: 'Past' | 'Future' | 'Expected' | 'Immediate';
  certainty: 'Unknown' | 'Unlikely' | 'Possible' | 'Likely' | 'Observed';
  title: string;
  description: string;
  areas: string[];
  onset: string;
  expires: string;
}

interface InfrastructureData {
  powerGrid: {
    demand: number;
    capacity: number;
    reserveMargin: number;
    stability: 'STABLE' | 'STRESSED' | 'CRITICAL';
    outageRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    renewableGeneration: number;
  };
  transportation: {
    roadConditions: string;
    publicTransit: string;
    emergencyRoutes: string;
  };
}

interface HealthcareSystemData {
  totalBeds: number;
  availableBeds: number;
  edCapacity: number;
  emsUnits: {
    total: number;
    available: number;
    deployed: number;
  };
  coolingCenters: {
    total: number;
    open: number;
    capacity: number;
  };
  surgeCapability: number;
  avgResponseTime: number;
}

interface VulnerablePopulationData {
  totalCount: number;
  demographics: {
    seniors: number;
    children: number;
    chronicConditions: number;
    homeless: number;
    noAC: number;
    poverty: number;
  };
  areas: Array<{
    name: string;
    riskLevel: string;
    population: number;
    vulnerabilityScore: number;
  }>;
}

interface EmergencyPhase {
  phase: 'MONITORING' | 'DETECTION' | 'ANALYSIS' | 'VERIFICATION' | 'DEPLOYMENT' | 'COORDINATION' | 'SUSTAINED_OPS';
  status: 'STANDBY' | 'ACTIVE' | 'COMPLETE';
  startTime: string;
  duration: string;
  description: string;
  activities: string[];
  nextPhase?: string;
  estimatedCompletion?: string;
}

interface AgentStatus {
  id: string;
  name: 'SENTINEL' | 'MEDIC' | 'DISPATCHER' | 'FIELD_OPS' | 'COMMANDER';
  icon: React.ReactNode;
  status: 'STANDBY' | 'MONITORING' | 'THREAT_DETECTED' | 'ANALYZING' | 'COORDINATING' | 'DEPLOYING' | 'ACTIVE' | 'VERIFYING';
  description: string;
  currentActivity?: string;
  lastUpdate?: string;
  phase?: EmergencyPhase;
  metrics?: {
    dataProcessed: number;
    predictionsGenerated: number;
    resourcesDeployed: number;
    responseTime: string;
  };
}

interface PredictionData {
  healthcare: {
    edVisits: {
      baseline: number;
      predicted: number;
      surge: number;
      peakTime: string;
    };
    specialtyDemand: {
      cardiology: number;
      nephrology: number;
      geriatrics: number;
      mentalHealth: number;
    };
    emsIncrease: number;
    avgResponseTimeIncrease: string;
  };
  resources: {
    coolingCentersNeeded: number;
    transportationRequired: number;
    personnelDeployment: number;
    suppliesRequired: string[];
  };
  economics: {
    preventiveCostSavings: string;
    deploymentCost: string;
    potentialLosses: string;
  };
  timeline: {
    immediate: string[];
    shortTerm: string[];
    sustained: string[];
  };
}

export default function WeatherSentinelMCP() {
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null);
  const [infrastructureData, setInfrastructureData] = useState<InfrastructureData | null>(null);
  const [healthcareData, setHealthcareData] = useState<HealthcareSystemData | null>(null);
  const [vulnerablePopData, setVulnerablePopData] = useState<VulnerablePopulationData | null>(null);
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [currentPhase, setCurrentPhase] = useState<EmergencyPhase | null>(null);
  const [isLiveDemo, setIsLiveDemo] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  const [agents, setAgents] = useState<AgentStatus[]>([
    {
      id: '1',
      name: 'SENTINEL',
      icon: <Shield className="w-8 h-8 text-blue-400" />,
      status: 'STANDBY',
      description: 'Environmental Monitoring',
      currentActivity: 'NWS Data Streams',
      metrics: {
        dataProcessed: 0,
        predictionsGenerated: 0,
        resourcesDeployed: 0,
        responseTime: '--'
      }
    },
    {
      id: '2',
      name: 'MEDIC',
      icon: <Heart className="w-8 h-8 text-red-400" />,
      status: 'STANDBY',
      description: 'Healthcare Impact Analysis',
      currentActivity: 'System Monitoring',
      metrics: {
        dataProcessed: 0,
        predictionsGenerated: 0,
        resourcesDeployed: 0,
        responseTime: '--'
      }
    },
    {
      id: '3',
      name: 'DISPATCHER',
      icon: <Radio className="w-8 h-8 text-green-400" />,
      status: 'STANDBY',
      description: 'Resource Coordination',
      currentActivity: 'Resource Inventory',
      metrics: {
        dataProcessed: 0,
        predictionsGenerated: 0,
        resourcesDeployed: 0,
        responseTime: '--'
      }
    },
    {
      id: '4',
      name: 'FIELD_OPS',
      icon: <Truck className="w-8 h-8 text-orange-400" />,
      status: 'STANDBY',
      description: 'Field Operations',
      currentActivity: 'Unit Status Check',
      metrics: {
        dataProcessed: 0,
        predictionsGenerated: 0,
        resourcesDeployed: 0,
        responseTime: '--'
      }
    },
    {
      id: '5',
      name: 'COMMANDER',
      icon: <Building className="w-8 h-8 text-purple-400" />,
      status: 'STANDBY',
      description: 'Operations Command',
      currentActivity: 'Strategic Overview',
      metrics: {
        dataProcessed: 0,
        predictionsGenerated: 0,
        resourcesDeployed: 0,
        responseTime: '--'
      }
    }
  ]);

  // Fetch comprehensive environmental data from multiple sources
  const fetchAllSystemData = async () => {
    try {
      console.log('Fetching comprehensive system data...');
      
      // Fetch environmental data
      const weatherResponse = await fetch('/api/weather-sentinel-live');
      const gridResponse = await fetch('/api/power-grid');
      const healthResponse = await fetch('/api/health-data');
      
      if (!weatherResponse.ok) throw new Error('Environmental data unavailable');
      
      const weatherData = await weatherResponse.json();
      const gridData = gridResponse.ok ? await gridResponse.json() : null;
      const healthData = healthResponse.ok ? await healthResponse.json() : null;
      
      console.log('Live system data received');
      
      // Set environmental data
      setEnvironmentalData({
        temperature: weatherData.temperature,
        heatIndex: weatherData.heatIndex,
        humidity: weatherData.humidity,
        airQuality: {
          aqi: 45,
          category: 'Good',
          pm25: 12,
          ozone: 35
        },
        windSpeed: 5,
        conditions: weatherData.conditions,
        uvIndex: 7,
        location: weatherData.location,
        timestamp: weatherData.timestamp,
        threatLevel: weatherData.threatLevel === 'LOW' ? 'NORMAL' : weatherData.threatLevel as any,
        alerts: weatherData.alerts.map((alert: any) => ({
          ...alert,
          severity: alert.severity || 'Moderate',
          urgency: 'Expected',
          certainty: 'Likely',
          areas: ['Harris County'],
          onset: new Date().toISOString(),
          expires: new Date(Date.now() + 86400000).toISOString()
        })),
        urbanHeatIsland: 3.2,
        nwsOffice: 'Houston/Galveston, TX'
      });

      // Set infrastructure data
      setInfrastructureData({
        powerGrid: {
          demand: gridData?.systemLoad || 60195,
          capacity: gridData?.totalCapacity || 85000,
          reserveMargin: gridData?.reserveMargin || 25,
          stability: gridData?.systemLoad > 75000 ? 'STRESSED' : 'STABLE',
          outageRisk: 'LOW',
          renewableGeneration: 15
        },
        transportation: {
          roadConditions: 'Normal',
          publicTransit: 'Operational',
          emergencyRoutes: 'Clear'
        }
      });

      // Set healthcare data
      setHealthcareData({
        totalBeds: 4780,
        availableBeds: 341,
        edCapacity: 85,
        emsUnits: {
          total: 67,
          available: 23,
          deployed: 44
        },
        coolingCenters: {
          total: 15,
          open: 0,
          capacity: 2400
        },
        surgeCapability: 150,
        avgResponseTime: 8.5
      });

      // Set vulnerable population data
      setVulnerablePopData({
        totalCount: 800000,
        demographics: {
          seniors: 180000,
          children: 120000,
          chronicConditions: 320000,
          homeless: 3500,
          noAC: 85000,
          poverty: 145000
        },
        areas: [
          { name: 'Fifth Ward', riskLevel: 'HIGH', population: 12500, vulnerabilityScore: 8.2 },
          { name: 'Third Ward', riskLevel: 'HIGH', population: 18000, vulnerabilityScore: 7.8 },
          { name: 'East End', riskLevel: 'MODERATE', population: 22000, vulnerabilityScore: 6.5 },
          { name: 'Acres Homes', riskLevel: 'HIGH', population: 15000, vulnerabilityScore: 7.9 }
        ]
      });

    } catch (error) {
      console.error('System data error:', error);
      setEnvironmentalData({
        temperature: 0,
        heatIndex: 0,
        humidity: 0,
        airQuality: { aqi: 0, category: 'Unknown', pm25: 0, ozone: 0 },
        windSpeed: 0,
        conditions: 'Data unavailable',
        uvIndex: 0,
        location: 'Connection Error',
        timestamp: new Date().toISOString(),
        threatLevel: 'NORMAL',
        alerts: [],
        urbanHeatIsland: 0,
        nwsOffice: 'Unknown'
      });
    }
  };

  const startLiveDemo = async () => {
    setIsLiveDemo(true);
    setIsEmergencyMode(true);
    setDemoProgress(0);
    
    console.log('Starting comprehensive emergency response demo...');
    
    // Phase 1: Environmental Detection (0-30 seconds)
    setCurrentPhase({
      phase: 'DETECTION',
      status: 'ACTIVE',
      startTime: new Date().toISOString(),
      duration: '30 seconds',
      description: 'Environmental threat detection and assessment',
      activities: [
        'Processing NWS weather data streams',
        'Analyzing heat index patterns',
        'Calculating urban heat island effects',
        'Assessing air quality impacts'
      ]
    });

    setTimeout(() => {
      setAgents(prev => prev.map(agent => 
        agent.name === 'SENTINEL' 
          ? { 
              ...agent, 
              status: 'THREAT_DETECTED', 
              description: 'Extreme heat conditions detected',
              currentActivity: 'Heat Index: 108°F - EXTREME THREAT',
              metrics: {
                dataProcessed: 1247,
                predictionsGenerated: 3,
                resourcesDeployed: 0,
                responseTime: '15 seconds'
              }
            }
          : agent
      ));
      setDemoProgress(20);
    }, 3000);

    // Phase 2: Healthcare Analysis (30-90 seconds)
    setTimeout(() => {
      setCurrentPhase({
        phase: 'ANALYSIS',
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
        duration: '60 seconds',
        description: 'Healthcare impact analysis and surge prediction',
        activities: [
          'Analyzing vulnerable population distribution',
          'Predicting ED visit surge patterns',
          'Calculating specialty care demand',
          'Assessing healthcare system capacity'
        ]
      });

      setAgents(prev => prev.map(agent => 
        agent.name === 'MEDIC' 
          ? { 
              ...agent, 
              status: 'ANALYZING', 
              description: 'Healthcare surge prediction active',
              currentActivity: 'Predicting +287 ED visits (+45% surge)',
              metrics: {
                dataProcessed: 2103,
                predictionsGenerated: 12,
                resourcesDeployed: 0,
                responseTime: '45 seconds'
              }
            }
          : agent
      ));
      setDemoProgress(40);
    }, 6000);

    // Phase 3: Resource Verification (90-180 seconds)
    setTimeout(() => {
      setCurrentPhase({
        phase: 'VERIFICATION',
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
        duration: '90 seconds',
        description: 'Resource inventory and deployment verification',
        activities: [
          'Verifying cooling center capacity',
          'Confirming EMS unit availability',
          'Coordinating with partner agencies',
          'Staging emergency supplies'
        ]
      });

      setAgents(prev => prev.map(agent => 
        agent.name === 'DISPATCHER' 
          ? { 
              ...agent, 
              status: 'COORDINATING', 
              description: 'Resource verification in progress',
              currentActivity: '12 cooling centers verified, 23 EMS units ready',
              metrics: {
                dataProcessed: 847,
                predictionsGenerated: 5,
                resourcesDeployed: 12,
                responseTime: '2 minutes'
              }
            }
          : agent
      ));
      setDemoProgress(60);
    }, 10000);

    // Phase 4: Field Deployment (180-240 seconds)
    setTimeout(() => {
      setCurrentPhase({
        phase: 'DEPLOYMENT',
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
        duration: '60 seconds',
        description: 'Emergency resource deployment and coordination',
        activities: [
          'Deploying mobile health units',
          'Opening priority cooling centers',
          'Staging EMS units in vulnerable areas',
          'Activating transport coordination'
        ]
      });

      setAgents(prev => prev.map(agent => 
        agent.name === 'FIELD_OPS' 
          ? { 
              ...agent, 
              status: 'DEPLOYING', 
              description: 'Field deployment active',
              currentActivity: '8 mobile units deployed, 5 centers opening',
              metrics: {
                dataProcessed: 654,
                predictionsGenerated: 2,
                resourcesDeployed: 23,
                responseTime: '3 minutes'
              }
            }
          : agent
      ));
      setDemoProgress(80);
    }, 14000);

    // Phase 5: Operational Coordination (240+ seconds)
    setTimeout(() => {
      setCurrentPhase({
        phase: 'COORDINATION',
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
        duration: 'Ongoing',
        description: 'Sustained emergency operations coordination',
        activities: [
          'Monitoring resource utilization',
          'Coordinating inter-agency response',
          'Managing public communications',
          'Preparing for sustained operations'
        ]
      });

      setAgents(prev => prev.map(agent => ({
        ...agent,
        status: 'ACTIVE',
        lastUpdate: new Date().toLocaleTimeString(),
        metrics: {
          ...agent.metrics!,
          dataProcessed: agent.metrics!.dataProcessed + 500,
          predictionsGenerated: agent.metrics!.predictionsGenerated + 3,
          resourcesDeployed: agent.metrics!.resourcesDeployed + 5
        }
      })));
      setDemoProgress(100);
    }, 18000);

    // Generate comprehensive predictions
    setTimeout(() => {
      setPredictions({
        healthcare: {
          edVisits: {
            baseline: 4780,
            predicted: 5067,
            surge: 287,
            peakTime: '14:00-20:00 today'
          },
          specialtyDemand: {
            cardiology: 45,
            nephrology: 28,
            geriatrics: 67,
            mentalHealth: 34
          },
          emsIncrease: 28,
          avgResponseTimeIncrease: '+3.5 minutes'
        },
        resources: {
          coolingCentersNeeded: 12,
          transportationRequired: 8,
          personnelDeployment: 127,
          suppliesRequired: ['IV fluids', 'cooling packs', 'hydration supplies', 'transport vehicles']
        },
        economics: {
          preventiveCostSavings: '$2.3M',
          deploymentCost: '$456K',
          potentialLosses: '$8.7M prevented'
        },
        timeline: {
          immediate: ['Open 5 cooling centers', 'Deploy 8 EMS units', 'Activate mobile health units'],
          shortTerm: ['Transport vulnerable residents', 'Open additional centers', 'Coordinate with partners'],
          sustained: ['Monitor utilization', 'Rotate personnel', 'Coordinate with neighboring counties']
        }
      });
    }, 8000);

    // Refresh system data
    await fetchAllSystemData();
  };

  const simulateHeatEmergency = () => {
    setEnvironmentalData(prev => prev ? {
      ...prev,
      temperature: 105,
      heatIndex: 118,
      threatLevel: 'CRITICAL',
      alerts: [{
        id: '1',
        type: 'EXCESSIVE_HEAT',
        severity: 'Extreme',
        urgency: 'Immediate',
        certainty: 'Observed',
        title: 'Excessive Heat Warning',
        description: 'Dangerous heat index values up to 118°F expected. Take precautions to avoid heat illness.',
        areas: ['Harris County'],
        onset: new Date().toISOString(),
        expires: new Date(Date.now() + 86400000).toISOString()
      }]
    } : null);

    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'ACTIVE',
      lastUpdate: new Date().toLocaleTimeString()
    })));
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-600 text-white border-red-500';
      case 'HIGH': return 'bg-orange-600 text-white border-orange-500';
      case 'MODERATE': return 'bg-yellow-600 text-white border-yellow-500';
      case 'LOW': return 'bg-green-600 text-white border-green-500';
      default: return 'bg-gray-600 text-white border-gray-500';
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'MONITORING': return 'border-blue-500 bg-blue-500/10';
      case 'THREAT_DETECTED': return 'border-red-500 bg-red-500/10';
      case 'ANALYZING': return 'border-yellow-500 bg-yellow-500/10';
      case 'COORDINATING': return 'border-purple-500 bg-purple-500/10';
      case 'DEPLOYING': return 'border-orange-500 bg-orange-500/10';
      case 'ACTIVE': return 'border-green-500 bg-green-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAllSystemData();
    const interval = setInterval(fetchAllSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px] animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/2 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-spin"></div>
        </div>
      </div>
      
      {/* Content Container */}
      <div className="relative z-10 space-y-8 p-8 text-white">
        {/* Premium Live Demo Header */}
        <div className="text-center py-12">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 rounded-full blur animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 rounded-full border border-red-400/50 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                <span className="text-white font-bold tracking-wider">LIVE DEMONSTRATION</span>
                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <h1 className="text-7xl font-black mb-4 bg-gradient-to-r from-cyan-200 via-blue-200 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
              🛡️ SENTINEL AI
            </h1>
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-full h-full bg-gradient-to-r from-cyan-400/20 via-blue-400/20 to-purple-400/20 blur-3xl"></div>
          </div>
          
          <div className="relative bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl p-6 mx-auto max-w-4xl mt-6">
            <p className="text-2xl font-light bg-gradient-to-r from-cyan-100 to-blue-100 bg-clip-text text-transparent">
              Advanced Multi-Agent Climate Crisis Management System
            </p>
            <div className="flex items-center justify-center space-x-8 mt-4 text-sm text-cyan-300">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Real-Time NWS Integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>AI Agent Coordination</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span>Emergency Response Automation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Weather Command Center */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <Card className="relative bg-black/40 backdrop-blur-xl border border-orange-500/30 rounded-2xl overflow-hidden transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="relative">
                  <Thermometer className="w-16 h-16 mx-auto mb-6 text-orange-400 drop-shadow-lg" />
                  <div className="absolute inset-0 bg-orange-400/20 rounded-full blur-2xl"></div>
                </div>
                <div className="text-4xl font-black mb-3 bg-gradient-to-r from-orange-300 to-red-300 bg-clip-text text-transparent">
                  {environmentalData ? `${environmentalData.temperature}°F` : '--°F'}
                </div>
                <div className="text-lg font-medium text-orange-200 mb-2">Current Temperature</div>
                <div className="text-sm text-orange-300/70">
                  {environmentalData ? environmentalData.location : 'Loading...'}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <Card className="relative bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-2xl overflow-hidden transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="relative">
                  <Zap className="w-16 h-16 mx-auto mb-6 text-red-400 drop-shadow-lg animate-pulse" />
                  <div className="absolute inset-0 bg-red-400/20 rounded-full blur-2xl"></div>
                </div>
                <div className="text-4xl font-black mb-3 bg-gradient-to-r from-red-300 to-pink-300 bg-clip-text text-transparent">
                  {environmentalData ? `${environmentalData.heatIndex}°F` : '--°F'}
                </div>
                <div className="text-lg font-medium text-red-200 mb-2">Heat Index</div>
                {environmentalData && (
                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getThreatColor(environmentalData.threatLevel)} shadow-lg`}>
                    {environmentalData.threatLevel} RISK
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <Card className="relative bg-black/40 backdrop-blur-xl border border-yellow-500/30 rounded-2xl overflow-hidden transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="relative">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-yellow-400 drop-shadow-lg" />
                  <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-2xl"></div>
                </div>
                <div className="text-4xl font-black mb-3 bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                  {environmentalData ? environmentalData.alerts.length : 0}
                </div>
                <div className="text-lg font-medium text-yellow-200 mb-2">Active Alerts</div>
                <div className="text-sm text-yellow-300/70 flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {environmentalData ? new Date(environmentalData.timestamp).toLocaleTimeString() : '--:--:--'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Demo Controls */}
        <div className="flex flex-wrap gap-6 justify-center mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <Button 
              onClick={startLiveDemo}
              disabled={isLiveDemo}
              className="relative bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-10 py-4 text-xl font-bold rounded-2xl border border-green-400/30 shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              {isLiveDemo ? (
                <Activity className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Eye className="w-5 h-5 mr-2" />
              )}
              {isLiveDemo ? 'DEMO RUNNING...' : 'START LIVE DEMO'}
            </Button>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <Button 
              onClick={simulateHeatEmergency}
              disabled={isLiveDemo}
              className="relative bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-10 py-4 text-xl font-bold rounded-2xl border border-red-400/30 shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              SIMULATE HEAT EMERGENCY
            </Button>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <Button 
              onClick={() => {
                if (predictions) {
                  alert(`AI Predictions:\n\nExpected ED Visits: +${predictions.edVisits} (${predictions.timeline})\nEMS Surge: +${predictions.emsIncrease}%\nCooling Centers: ${predictions.coolingCenters} activated\nEstimated Cost Savings: ${predictions.costSavings}`);
                }
              }}
              className="relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-10 py-4 text-xl font-bold rounded-2xl border border-purple-400/30 shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              VIEW PREDICTIONS
            </Button>
          </div>
        </div>

        {/* Enhanced Agent Status Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {agents.map((agent) => (
            <div key={agent.id} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <Card className={`relative bg-black/40 backdrop-blur-xl border rounded-2xl transition-all duration-500 transform hover:scale-105 ${getAgentStatusColor(agent.status)}`}>
                <CardContent className="p-6 text-center">
                  <div className="mb-4 text-3xl">{agent.icon}</div>
                  <div className="font-bold text-xl mb-2">{agent.name}</div>
                  <div className="text-sm opacity-80 mb-3">{agent.description}</div>
                  {agent.phase && (
                    <div className="text-xs text-cyan-300 mb-2 italic">
                      {agent.phase}
                    </div>
                  )}
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    agent.status === 'STANDBY' ? 'bg-gray-600 text-gray-200' :
                    agent.status === 'MONITORING' ? 'bg-blue-600 text-white' :
                    agent.status === 'THREAT_DETECTED' ? 'bg-red-600 text-white' :
                    agent.status === 'ANALYZING' ? 'bg-yellow-600 text-white' :
                    agent.status === 'COORDINATING' ? 'bg-purple-600 text-white' :
                    agent.status === 'DEPLOYING' ? 'bg-orange-600 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {agent.status.replace('_', ' ')}
                  </div>
                  {agent.lastUpdate && (
                    <div className="text-xs mt-3 opacity-60">
                      Updated: {agent.lastUpdate}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Enhanced Weather Alerts */}
        {weatherData && weatherData.alerts.length > 0 && (
          <div className="relative group mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-2xl blur opacity-40"></div>
            <Card className="relative bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-red-300">
                  <AlertTriangle className="w-6 h-6 mr-3 text-red-400 animate-pulse" />
                  Active Weather Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weatherData.alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className="p-4 rounded-xl bg-red-900/40 border border-red-500/40 transform hover:scale-105 transition-all duration-300"
                    >
                      <div className="font-bold text-red-300 text-lg">{alert.title}</div>
                      <div className="text-red-200 mt-2">{alert.description}</div>
                      <div className="text-sm text-red-400 mt-3 flex items-center justify-between">
                        <span>Severity: {alert.severity}</span>
                        <span>Type: {alert.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Predictions Display */}
        {predictions && (
          <div className="relative group mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur opacity-40"></div>
            <Card className="relative bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-300">
                  <TrendingUp className="w-6 h-6 mr-3 text-purple-400" />
                  AI Crisis Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center p-4 rounded-xl bg-blue-900/30 border border-blue-500/30">
                    <div className="text-3xl font-bold text-blue-300">+{predictions.edVisits}</div>
                    <div className="text-sm text-blue-200">Expected ED Visits</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-orange-900/30 border border-orange-500/30">
                    <div className="text-3xl font-bold text-orange-300">+{predictions.emsIncrease}%</div>
                    <div className="text-sm text-orange-200">EMS Call Surge</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-green-900/30 border border-green-500/30">
                    <div className="text-3xl font-bold text-green-300">{predictions.coolingCenters}</div>
                    <div className="text-sm text-green-200">Cooling Centers</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-purple-900/30 border border-purple-500/30">
                    <div className="text-3xl font-bold text-purple-300">{predictions.costSavings}</div>
                    <div className="text-sm text-purple-200">Cost Savings</div>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <div className="text-lg font-semibold text-green-400">
                    Estimated Cost Savings: {predictions.costSavings}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}