import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, Zap, Thermometer, Users } from 'lucide-react';

interface KPIData {
  grid: {
    reserveMargin: number;
    currentLoad: number;
    totalCapacity: number;
    trend: number;
    status: 'CRITICAL' | 'WARNING' | 'WATCH' | 'NORMAL';
    lastUpdate: string;
  };
  providers: {
    coverageRatio: number;
    cardiology: { ratio: number; shortage: boolean };
    emergency: { ratio: number; shortage: boolean };
    psychiatry: { ratio: number; shortage: boolean };
    criticalShortages: number;
    totalActive: number;
    lastSync: string;
  };
  weather: {
    heatIndex: number;
    peakToday: number;
    weekendPeak: number;
    alertLevel: 'CRITICAL' | 'WARNING' | 'WATCH' | 'NORMAL';
    daysOut: number;
    nextUpdate: string;
  };
  healthcare: {
    capacityUtilization: number;
    availableBeds: number;
    avgWaitTime: number;
    reportingFacilities: number;
    dataLag: number;
  };
}

interface RealTimeKPIsProps {
  data?: any;
}

const RealTimeKPIs: React.FC<RealTimeKPIsProps> = ({ data }) => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchRealTimeKPIs();
    const interval = setInterval(fetchRealTimeKPIs, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRealTimeKPIs = async () => {
    try {
      const response = await fetch('/api/real-time-kpis');
      const data = await response.json();
      setKpiData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching real-time KPIs:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-red-500';
      case 'WARNING': return 'bg-orange-500';
      case 'WATCH': return 'bg-yellow-500';
      case 'NORMAL': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  if (!kpiData) return <div className="animate-pulse">Loading real-time data...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Real-Time System Status</h2>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Primary KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* ERCOT Grid Status */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              ERCOT Grid Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.grid.reserveMargin} MW</div>
            <div className="text-xs text-gray-500 flex items-center">
              Reserve Margin {getTrendIcon(kpiData.grid.trend)}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Current Load</span>
                <span>{kpiData.grid.currentLoad.toLocaleString()} MW</span>
              </div>
              <Progress value={(kpiData.grid.currentLoad / kpiData.grid.totalCapacity) * 100} />
              <div className="flex justify-between text-xs">
                <span>Capacity</span>
                <span>{kpiData.grid.totalCapacity.toLocaleString()} MW</span>
              </div>
            </div>
            <Badge className={`mt-2 ${getStatusColor(kpiData.grid.status)} text-white`}>
              {kpiData.grid.status}
            </Badge>
          </CardContent>
        </Card>

        {/* Provider Coverage from NPI */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Provider Coverage (NPI)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.providers.coverageRatio}%</div>
            <div className="text-xs text-gray-500">Overall Coverage Ratio</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Cardiology</span>
                <span className={kpiData.providers.cardiology.shortage ? 'text-red-500' : 'text-green-500'}>
                  {kpiData.providers.cardiology.ratio}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Emergency Med</span>
                <span className={kpiData.providers.emergency.shortage ? 'text-red-500' : 'text-green-500'}>
                  {kpiData.providers.emergency.ratio}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Mental Health</span>
                <span className={kpiData.providers.psychiatry.shortage ? 'text-red-500' : 'text-green-500'}>
                  {kpiData.providers.psychiatry.ratio}%
                </span>
              </div>
            </div>
            <Badge className={`mt-2 ${kpiData.providers.criticalShortages > 0 ? 'bg-red-500' : 'bg-green-500'} text-white`}>
              {kpiData.providers.criticalShortages} Critical Shortages
            </Badge>
          </CardContent>
        </Card>

        {/* Weather Conditions from NWS */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Thermometer className="h-4 w-4 mr-2" />
              Heat Risk (NWS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.weather.heatIndex}°F</div>
            <div className="text-xs text-gray-500">Current Heat Index</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Peak Today</span>
                <span>{kpiData.weather.peakToday}°F</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>This Weekend</span>
                <span className="font-medium text-red-600">{kpiData.weather.weekendPeak}°F</span>
              </div>
              <div className="text-xs text-gray-500">
                {kpiData.weather.daysOut} day forecast
              </div>
            </div>
            <Badge className={`mt-2 ${getStatusColor(kpiData.weather.alertLevel)} text-white`}>
              {kpiData.weather.alertLevel} HEAT RISK
            </Badge>
          </CardContent>
        </Card>

        {/* Hospital Capacity from CDC */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Hospital Capacity (CDC)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.healthcare.capacityUtilization}%</div>
            <div className="text-xs text-gray-500">Current Utilization</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Available Beds</span>
                <span>{kpiData.healthcare.availableBeds}</span>
              </div>
              <Progress value={kpiData.healthcare.capacityUtilization} />
              <div className="flex justify-between text-xs">
                <span>ED Wait Time</span>
                <span>{kpiData.healthcare.avgWaitTime} min</span>
              </div>
            </div>
            <Badge className={`mt-2 ${kpiData.healthcare.capacityUtilization > 85 ? 'bg-red-500' : 'bg-green-500'} text-white`}>
              {kpiData.healthcare.capacityUtilization > 85 ? 'HIGH' : 'NORMAL'} LOAD
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">ERCOT Grid Data</div>
              <div className="text-gray-600">Real-time load: {kpiData.grid.currentLoad.toLocaleString()} MW</div>
              <div className="text-gray-600">Updated: {kpiData.grid.lastUpdate}</div>
            </div>
            <div>
              <div className="font-medium">NPI Provider Registry</div>
              <div className="text-gray-600">Active providers: {kpiData.providers.totalActive.toLocaleString()}</div>
              <div className="text-gray-600">Last sync: {kpiData.providers.lastSync}</div>
            </div>
            <div>
              <div className="font-medium">NWS Weather Service</div>
              <div className="text-gray-600">Forecast horizon: {kpiData.weather.daysOut} days</div>
              <div className="text-gray-600">Next update: {kpiData.weather.nextUpdate}</div>
            </div>
            <div>
              <div className="font-medium">CDC Health Surveillance</div>
              <div className="text-gray-600">Reporting facilities: {kpiData.healthcare.reportingFacilities}</div>
              <div className="text-gray-600">Data lag: {kpiData.healthcare.dataLag} hours</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeKPIs;