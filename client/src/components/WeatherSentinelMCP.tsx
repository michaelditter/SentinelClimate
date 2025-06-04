import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Thermometer, 
  AlertTriangle, 
  Eye, 
  Heart, 
  Phone, 
  Target,
  Zap,
  MapPin,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';

interface WeatherData {
  temperature: number;
  heatIndex: number;
  humidity: number;
  location: string;
  timestamp: string;
  alerts: WeatherAlert[];
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  conditions: string;
}

interface WeatherAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
}

interface AgentStatus {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'STANDBY' | 'ACTIVE' | 'PROCESSING' | 'COMPLETE';
  description: string;
  lastUpdate?: string;
}

interface PredictionData {
  edVisits: number;
  edSurge: number;
  emsIncrease: number;
  coolingCenters: number;
  costSavings: string;
  timeline: string;
}

export default function WeatherSentinelMCP() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([
    {
      id: 'sentinel',
      name: 'SENTINEL',
      icon: <Eye className="w-6 h-6" />,
      status: 'ACTIVE',
      description: 'Weather Monitoring'
    },
    {
      id: 'medic',
      name: 'MEDIC',
      icon: <Heart className="w-6 h-6" />,
      status: 'STANDBY',
      description: 'Healthcare Analysis'
    },
    {
      id: 'dispatcher',
      name: 'DISPATCHER',
      icon: <Phone className="w-6 h-6" />,
      status: 'STANDBY',
      description: 'Resource Allocation'
    },
    {
      id: 'commander',
      name: 'COMMANDER',
      icon: <Target className="w-6 h-6" />,
      status: 'STANDBY',
      description: 'Central Coordination'
    }
  ]);
  
  const [isLiveDemo, setIsLiveDemo] = useState(false);
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [demoLog, setDemoLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch initial weather data
    fetchWeatherData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchWeatherData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [demoLog]);

  const fetchWeatherData = async () => {
    try {
      const response = await fetch('/api/weather-sentinel-live');
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
        
        // Auto-trigger demo if high threat detected
        if (data.threatLevel === 'HIGH' || data.threatLevel === 'CRITICAL') {
          if (!isLiveDemo) {
            addToLog('🚨 HIGH THREAT DETECTED - Auto-triggering Sentinel AI response...');
            setTimeout(() => startLiveDemo(), 2000);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
    }
  };

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDemoLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateAgentStatus = (agentId: string, status: AgentStatus['status']) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, status, lastUpdate: new Date().toLocaleTimeString() }
        : agent
    ));
  };

  const startLiveDemo = async () => {
    if (isLiveDemo) return;
    
    setIsLiveDemo(true);
    addToLog('🔍 SENTINEL Agent: Initiating live weather threat assessment...');
    
    try {
      // Step 1: SENTINEL analyzes current conditions
      updateAgentStatus('sentinel', 'PROCESSING');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (weatherData && (weatherData.heatIndex > 95 || weatherData.threatLevel !== 'LOW')) {
        addToLog(`🚨 THREAT DETECTED: Heat Index ${weatherData.heatIndex}°F - ${weatherData.threatLevel} RISK`);
        
        // Step 2: MEDIC Agent activation
        addToLog('🏥 MEDIC Agent: Analyzing vulnerable populations and healthcare capacity...');
        updateAgentStatus('medic', 'ACTIVE');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const medicResponse = await fetch('/api/medic-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weatherData })
        });
        
        if (medicResponse.ok) {
          const medicData = await medicResponse.json();
          setPredictions(medicData.predictions);
          addToLog(`📊 Healthcare Surge Predicted: +${medicData.predictions.edVisits} ED visits, +${medicData.predictions.edSurge}% surge`);
          updateAgentStatus('medic', 'COMPLETE');
        }
        
        // Step 3: DISPATCHER Agent activation
        addToLog('📞 DISPATCHER Agent: Coordinating emergency resources...');
        updateAgentStatus('dispatcher', 'ACTIVE');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const dispatcherResponse = await fetch('/api/dispatcher-deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weatherData, predictions })
        });
        
        if (dispatcherResponse.ok) {
          const dispatcherData = await dispatcherResponse.json();
          addToLog(`🚑 Resources Deployed: ${dispatcherData.coolingCenters} cooling centers, ${dispatcherData.emsUnits} EMS units staged`);
          updateAgentStatus('dispatcher', 'COMPLETE');
        }
        
        // Step 4: COMMANDER Agent coordination
        addToLog('🎯 COMMANDER Agent: Sending emergency alerts and coordinating response...');
        updateAgentStatus('commander', 'ACTIVE');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const commanderResponse = await fetch('/api/commander-coordinate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weatherData, predictions })
        });
        
        if (commanderResponse.ok) {
          const commanderData = await commanderResponse.json();
          addToLog('📱 Emergency alerts sent via WhatsApp and SMS');
          addToLog('📧 Healthcare facilities notified');
          addToLog('🌡️ Cooling center coordinates shared');
          updateAgentStatus('commander', 'COMPLETE');
          
          addToLog('✅ LIVE DEMO COMPLETE - Full Sentinel AI Response Activated!');
        }
        
      } else {
        addToLog('✅ No immediate heat threat detected. System continues monitoring...');
        updateAgentStatus('sentinel', 'ACTIVE');
      }
      
    } catch (error) {
      addToLog('❌ Demo error: ' + error.message);
    } finally {
      setIsLiveDemo(false);
    }
  };

  const simulateHeatEmergency = () => {
    // Temporarily override weather data for demo
    setWeatherData(prev => prev ? {
      ...prev,
      temperature: 102,
      heatIndex: 118,
      threatLevel: 'CRITICAL',
      alerts: [
        {
          id: '1',
          type: 'HEAT_WARNING',
          severity: 'SEVERE',
          title: 'Excessive Heat Warning',
          description: 'Dangerous heat index values up to 118°F expected'
        }
      ]
    } : null);
    
    addToLog('🔥 SIMULATED: Critical heat emergency triggered for demo');
    setTimeout(() => startLiveDemo(), 1000);
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-500';
      case 'MODERATE': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgentStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'border-green-500 bg-green-500/20';
      case 'PROCESSING': return 'border-blue-500 bg-blue-500/20 animate-pulse';
      case 'COMPLETE': return 'border-purple-500 bg-purple-500/20';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 min-h-screen text-white">
      {/* Live Demo Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center bg-red-500 px-4 py-2 rounded-full mb-4 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></div>
          LIVE DEMO
        </div>
        
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
          🛡️ SENTINEL AI
        </h1>
        <p className="text-xl opacity-90">
          Predictive Climate Health Crisis Management • Live Houston Weather Integration
        </p>
      </div>

      {/* Weather Command Center */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6 text-center">
            <Thermometer className="w-12 h-12 mx-auto mb-4 text-orange-400" />
            <div className="text-3xl font-bold mb-2">
              {weatherData ? `${weatherData.temperature}°F` : '--°F'}
            </div>
            <div className="text-sm opacity-80">Current Temperature</div>
            <div className="text-xs mt-2 opacity-60">
              {weatherData ? weatherData.location : 'Loading...'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <div className="text-3xl font-bold mb-2">
              {weatherData ? `${weatherData.heatIndex}°F` : '--°F'}
            </div>
            <div className="text-sm opacity-80">Heat Index</div>
            {weatherData && (
              <Badge className={`mt-2 ${getThreatColor(weatherData.threatLevel)}`}>
                {weatherData.threatLevel} RISK
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
            <div className="text-3xl font-bold mb-2">
              {weatherData ? weatherData.alerts.length : 0}
            </div>
            <div className="text-sm opacity-80">Active Alerts</div>
            <div className="text-xs mt-2 opacity-60">
              <Clock className="w-3 h-3 inline mr-1" />
              {weatherData ? new Date(weatherData.timestamp).toLocaleTimeString() : '--:--:--'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demo Controls */}
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        <Button 
          onClick={startLiveDemo}
          disabled={isLiveDemo}
          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 px-8 py-3 text-lg"
        >
          {isLiveDemo ? (
            <Activity className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Eye className="w-5 h-5 mr-2" />
          )}
          {isLiveDemo ? 'DEMO RUNNING...' : '🚀 START LIVE DEMO'}
        </Button>
        
        <Button 
          onClick={simulateHeatEmergency}
          disabled={isLiveDemo}
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 px-8 py-3 text-lg"
        >
          <AlertTriangle className="w-5 h-5 mr-2" />
          🚨 SIMULATE HEAT EMERGENCY
        </Button>
        
        <Button 
          onClick={() => {
            if (predictions) {
              alert(`🔮 AI Predictions:\n\n🏥 Expected ED Visits: +${predictions.edVisits} (${predictions.timeline})\n🚑 EMS Surge: +${predictions.emsIncrease}%\n❄️ Cooling Centers: ${predictions.coolingCenters} activated\n💰 Estimated Cost Savings: ${predictions.costSavings}`);
            }
          }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-3 text-lg"
        >
          <TrendingUp className="w-5 h-5 mr-2" />
          🔮 VIEW PREDICTIONS
        </Button>
      </div>

      {/* Agent Status Grid */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {agents.map((agent) => (
          <Card 
            key={agent.id}
            className={`bg-white/10 backdrop-blur-md border-2 transition-all duration-500 ${getAgentStatusColor(agent.status)}`}
          >
            <CardContent className="p-4 text-center">
              <div className="mb-3">{agent.icon}</div>
              <div className="font-bold text-lg">{agent.name}</div>
              <div className="text-sm opacity-80 mb-2">{agent.description}</div>
              <Badge variant={agent.status === 'STANDBY' ? 'secondary' : 'default'}>
                {agent.status}
              </Badge>
              {agent.lastUpdate && (
                <div className="text-xs mt-2 opacity-60">
                  Updated: {agent.lastUpdate}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Weather Alerts */}
      {weatherData && weatherData.alerts.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
              Active Weather Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weatherData.alerts.map((alert) => (
                <Alert key={alert.id} className="bg-yellow-500/20 border-yellow-500/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-sm mt-1">{alert.description}</div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Demo Log */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-400" />
            Live Demo Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            ref={logRef}
            className="bg-black/30 p-4 rounded-lg font-mono text-sm h-48 overflow-y-auto space-y-1"
          >
            {demoLog.length === 0 ? (
              <div className="text-gray-400 italic">Waiting for demo to start...</div>
            ) : (
              demoLog.map((log, index) => (
                <div key={index} className="text-green-300">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Predictions Display */}
      {predictions && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
              AI Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">+{predictions.edVisits}</div>
                <div className="text-sm">Expected ED Visits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">+{predictions.emsIncrease}%</div>
                <div className="text-sm">EMS Surge</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{predictions.coolingCenters}</div>
                <div className="text-sm">Cooling Centers</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-lg font-semibold text-green-400">
                Estimated Cost Savings: {predictions.costSavings}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}