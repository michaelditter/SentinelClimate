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
                  {weatherData ? `${weatherData.temperature}°F` : '--°F'}
                </div>
                <div className="text-lg font-medium text-orange-200 mb-2">Current Temperature</div>
                <div className="text-sm text-orange-300/70">
                  {weatherData ? weatherData.location : 'Loading...'}
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
                  {weatherData ? `${weatherData.heatIndex}°F` : '--°F'}
                </div>
                <div className="text-lg font-medium text-red-200 mb-2">Heat Index</div>
                {weatherData && (
                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getThreatColor(weatherData.threatLevel)} shadow-lg`}>
                    {weatherData.threatLevel} RISK
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
                  {weatherData ? weatherData.alerts.length : 0}
                </div>
                <div className="text-lg font-medium text-yellow-200 mb-2">Active Alerts</div>
                <div className="text-sm text-yellow-300/70 flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {weatherData ? new Date(weatherData.timestamp).toLocaleTimeString() : '--:--:--'}
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
              {isLiveDemo ? 'DEMO RUNNING...' : '🚀 START LIVE DEMO'}
            </Button>
          </div>
        
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
      </div>
    </div>
  );
}