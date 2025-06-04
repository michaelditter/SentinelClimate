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
  MapPin
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
  const [isLiveDemo, setIsLiveDemo] = useState(false);
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [agents, setAgents] = useState<AgentStatus[]>([
    {
      id: '1',
      name: 'WEATHER SENTINEL',
      icon: <Shield className="w-8 h-8 text-blue-400" />,
      status: 'STANDBY',
      description: 'NWS Data Monitor'
    },
    {
      id: '2',
      name: 'CRISIS AI',
      icon: <Brain className="w-8 h-8 text-purple-400" />,
      status: 'STANDBY',
      description: 'Predictive Analytics'
    },
    {
      id: '3',
      name: 'DISPATCH',
      icon: <Phone className="w-8 h-8 text-green-400" />,
      status: 'STANDBY',
      description: 'Emergency Coordination'
    },
    {
      id: '4',
      name: 'FIELD OPS',
      icon: <MapPin className="w-8 h-8 text-orange-400" />,
      status: 'STANDBY',
      description: 'Resource Management'
    }
  ]);

  // Fetch real weather data
  const fetchWeatherData = async () => {
    try {
      console.log('Fetching weather data...');
      const response = await fetch('/api/weather/houston');
      if (!response.ok) throw new Error('Weather API error');
      
      const data = await response.json();
      console.log('Weather data received:', data);
      
      setWeatherData({
        temperature: data.temperature || 87,
        heatIndex: data.heatIndex || 93,
        humidity: data.humidity || 65,
        location: data.location || 'Houston, TX',
        timestamp: new Date().toISOString(),
        alerts: data.alerts || [],
        threatLevel: data.threatLevel || 'MODERATE',
        conditions: data.conditions || 'Hot and Humid'
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
      // Set fallback data for demo
      setWeatherData({
        temperature: 87,
        heatIndex: 93,
        humidity: 65,
        location: 'Houston, TX',
        timestamp: new Date().toISOString(),
        alerts: [],
        threatLevel: 'MODERATE',
        conditions: 'Hot and Humid'
      });
    }
  };

  const startLiveDemo = async () => {
    setIsLiveDemo(true);
    
    // Activate agents sequentially
    const agentSequence = ['ACTIVE', 'PROCESSING', 'COMPLETE'];
    
    for (let i = 0; i < agents.length; i++) {
      setTimeout(() => {
        setAgents(prev => prev.map((agent, index) => 
          index === i 
            ? { 
                ...agent, 
                status: agentSequence[Math.min(i, agentSequence.length - 1)] as any,
                lastUpdate: new Date().toLocaleTimeString()
              }
            : agent
        ));
      }, i * 2000);
    }

    // Generate predictions
    setTimeout(() => {
      setPredictions({
        edVisits: 156,
        edSurge: 34,
        emsIncrease: 28,
        coolingCenters: 12,
        costSavings: '$2.3M',
        timeline: 'Next 6 hours'
      });
    }, 6000);

    // Refresh weather data
    await fetchWeatherData();
  };

  const simulateHeatEmergency = () => {
    setWeatherData(prev => prev ? {
      ...prev,
      temperature: 105,
      heatIndex: 118,
      threatLevel: 'CRITICAL',
      alerts: [{
        id: '1',
        type: 'EXCESSIVE_HEAT',
        severity: 'WARNING',
        title: 'Excessive Heat Warning',
        description: 'Dangerous heat index values up to 118°F expected. Take precautions to avoid heat illness.'
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
      case 'ACTIVE': return 'border-green-500 bg-green-500/10';
      case 'PROCESSING': return 'border-yellow-500 bg-yellow-500/10';
      case 'COMPLETE': return 'border-blue-500 bg-blue-500/10';
      default: return 'border-gray-500 bg-gray-500/10';
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 30000); // Refresh every 30 seconds
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
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${agent.status === 'STANDBY' ? 'bg-gray-600 text-gray-200' : 'bg-green-600 text-white'}`}>
                    {agent.status}
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