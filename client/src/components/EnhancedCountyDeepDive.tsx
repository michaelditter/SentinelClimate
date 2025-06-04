import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  Thermometer, 
  Activity, 
  Users,
  Clock,
  MapPin,
  Zap,
  Brain,
  Heart,
  Phone
} from 'lucide-react';

interface EnhancedCountyDeepDiveProps {
  selectedCounty: any;
  realTimeData?: any;
}

interface CountyData {
  name: string;
  fips: string;
  lastUpdated: string;
  overallRisk: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  weather: {
    heatIndex: number;
    temperature: number;
    humidity: number;
    alertLevel: string;
    trend: number;
    nwsOffice: string;
    urbanHeatIsland: number;
  };
  grid: {
    operator: string;
    zone: string;
    reserveMargin: number;
    capacityUtilization: number;
    status: string;
    regionalLoad: number;
  };
  healthcare: {
    healthcareRegion: string;
    availableBeds: number;
    totalBeds: number;
    edCapacity: number;
    avgResponseTime: number;
    surgeCapacity: number;
  };
  vulnerable: {
    totalCount: number;
    seniors: number;
    noAC: number;
    poverty: number;
  };
  providers: Array<{
    type: string;
    name: string;
    available: number;
    needed: number;
    shortage: boolean;
    ratio: string;
    nationalRatio: number;
  }>;
  predictions: {
    edVisits: {
      predicted: number;
      baseline: number;
      increasePercentage: number;
      breakdown: {
        heatFactor: number;
        durationFactor: number;
        vulnerabilityFactor: number;
        powerOutageFactor: number;
      };
    };
    mentalHealth: {
      counselingDemand: number;
      crisisCalls: number;
      telehealthSessions: number;
      increasePercentage: number;
    };
    specialty: {
      cardiology: { predictedVisits: number; increasePercentage: number };
      nephrology: { predictedVisits: number; increasePercentage: number };
      geriatrics: { predictedVisits: number; increasePercentage: number };
    };
    remote: {
      telehealthSessions: number;
      mentalHealthRemote: number;
      chronicCareMonitoring: number;
      increasePercentage: number;
    };
  };
  forecast: Array<{
    time: string;
    temperature: number;
    heatIndex: number;
    overallRisk: string;
    predictedEDVisits: number;
    mentalHealthCalls: number;
    cardiologyVisits: number;
    telehealthSessions: number;
  }>;
}

const EnhancedCountyDeepDive: React.FC<EnhancedCountyDeepDiveProps> = ({ selectedCounty, realTimeData }) => {
  const [countyData, setCountyData] = useState<CountyData | null>(null);
  const [socialData, setSocialData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const currentFips = selectedCounty?.fips || '48201';

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/county-analysis/${currentFips}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          // Ensure data structure matches expected format
          const processedData = {
            ...data,
            predictions: data.predictions || {
              edVisits: { predicted: 0, baseline: 0, increasePercentage: 0, breakdown: {} },
              mentalHealth: { counselingDemand: 0, crisisCalls: 0, telehealthSessions: 0, increasePercentage: 0 },
              specialty: { cardiology: { predictedVisits: 0, increasePercentage: 0 }, nephrology: { predictedVisits: 0, increasePercentage: 0 }, geriatrics: { predictedVisits: 0, increasePercentage: 0 } },
              remote: { telehealthSessions: 0, mentalHealthRemote: 0, chronicCareMonitoring: 0, increasePercentage: 0 }
            },
            providers: data.providers || [],
            forecast: data.forecast || [],
            vulnerable: data.vulnerable || { totalCount: 0, seniors: 0, noAC: 0, poverty: 0 },
            weather: data.weather || { heatIndex: 0, temperature: 0, humidity: 0, alertLevel: 'LOW', trend: 0, nwsOffice: '', urbanHeatIsland: 0 },
            grid: data.grid || { operator: '', zone: '', reserveMargin: 0, capacityUtilization: 0, status: '', regionalLoad: 0 },
            healthcare: data.healthcare || { healthcareRegion: '', availableBeds: 0, totalBeds: 0, edCapacity: 0, avgResponseTime: 0, surgeCapacity: 0 }
          };
          
          setCountyData(processedData);
        }
      } catch (error) {
        console.error('Error fetching county data:', error);
        if (isMounted) {
          setCountyData(null);
        }
      }
      
      if (isMounted) {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentFips]);

  const fetchSocialMediaIntelligence = async () => {
    setSocialLoading(true);
    try {
      const response = await fetch('/api/social-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          county: selectedCounty,
          weatherData: countyData?.weather,
          gridData: countyData?.grid
        })
      });
      const data = await response.json();
      setSocialData(data);
    } catch (error) {
      console.error('Error fetching social intelligence:', error);
    }
    setSocialLoading(false);
  };

  if (loading) return <div className="animate-pulse">Loading comprehensive county analysis...</div>;
  if (!countyData) return <div>Select a county for detailed analysis</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MODERATE': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0.5) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend < -0.5) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{countyData.name} Deep Dive Analysis</h2>
        <div className="flex space-x-2">
          <Badge className={getStatusColor(countyData.overallRisk)}>
            {countyData.overallRisk} RISK
          </Badge>
          <Button 
            onClick={fetchSocialMediaIntelligence}
            disabled={socialLoading}
            variant="outline"
            size="sm"
          >
            <Brain className="h-4 w-4 mr-2" />
            {socialLoading ? 'Analyzing...' : 'Social Intelligence'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="healthcare">Healthcare</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="social">Social Intel</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Real-time Status Grid - Enhanced */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Weather Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Weather Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countyData.weather.heatIndex}°F</div>
                <div className="text-xs text-gray-500 flex items-center">
                  Heat Index {getTrendIcon(countyData.weather.trend)}
                </div>
                <div className="mt-2">
                  <Badge className={getStatusColor(countyData.weather.alertLevel)}>
                    {countyData.weather.alertLevel}
                  </Badge>
                </div>
                <div className="mt-2 text-xs space-y-1">
                  <div>NWS Office: {countyData.weather.nwsOffice}</div>
                  <div>Urban Heat Island: +{countyData.weather.urbanHeatIsland}°F</div>
                </div>
              </CardContent>
            </Card>

            {/* Grid Status - County Specific */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {countyData.grid.operator} Grid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countyData.grid.reserveMargin} MW</div>
                <div className="text-xs text-gray-500">Reserve Margin</div>
                <Progress 
                  value={countyData.grid.capacityUtilization} 
                  className="mt-2"
                />
                <div className="text-xs mt-1">{countyData.grid.capacityUtilization}% Capacity</div>
                <div className="mt-2 text-xs">
                  Zone: {countyData.grid.zone}
                </div>
              </CardContent>
            </Card>

            {/* Hospital System - Region Specific */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {countyData.healthcare.healthcareRegion}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countyData.healthcare.availableBeds}</div>
                <div className="text-xs text-gray-500">Available Beds</div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>ED Capacity</span>
                    <span className={countyData.healthcare.edCapacity > 80 ? 'text-red-500' : 'text-green-500'}>
                      {countyData.healthcare.edCapacity}%
                    </span>
                  </div>
                  <Progress value={countyData.healthcare.edCapacity} />
                </div>
              </CardContent>
            </Card>

            {/* Vulnerable Population - County Specific */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Vulnerable Population</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countyData.vulnerable.totalCount.toLocaleString()}</div>
                <div className="text-xs text-gray-500">High-Risk Individuals</div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>65+ years</span>
                    <span>{countyData.vulnerable.seniors}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No AC</span>
                    <span>{countyData.vulnerable.noAC}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Poverty</span>
                    <span>{countyData.vulnerable.poverty}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="healthcare" className="space-y-4">
          {/* Enhanced Healthcare Predictions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Emergency Department Predictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  Emergency Department
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {countyData.predictions.edVisits.predicted}
                  </div>
                  <div className="text-sm text-gray-600">Predicted ED Visits</div>
                  <Badge className="mt-1" variant="destructive">
                    +{countyData.predictions.edVisits.increasePercentage}% vs baseline
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Baseline:</span>
                    <span>{countyData.predictions.edVisits.baseline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heat Factor:</span>
                    <span>{countyData.predictions.edVisits.breakdown.heatFactor}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Power Factor:</span>
                    <span>{countyData.predictions.edVisits.breakdown.powerOutageFactor}x</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mental Health Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-purple-500" />
                  Mental Health Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Crisis Calls</span>
                    <span className="font-bold text-purple-600">
                      {countyData.predictions.mentalHealth.crisisCalls}
                    </span>
                  </div>
                  <Progress value={75} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Remote Counseling</span>
                    <span className="font-bold text-blue-600">
                      {countyData.predictions.mentalHealth.telehealthSessions}
                    </span>
                  </div>
                  <Progress value={60} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">In-Person Sessions</span>
                    <span className="font-bold text-green-600">
                      {countyData.predictions.mentalHealth.counselingDemand}
                    </span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                
                <Badge className="w-full justify-center" variant="outline">
                  +{countyData.predictions.mentalHealth.increasePercentage}% demand surge
                </Badge>
              </CardContent>
            </Card>

            {/* Specialty Care Surge */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2 text-red-500" />
                  Specialty Care Surge
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(countyData.predictions.specialty).map(([specialty, data]) => (
                  <div key={specialty} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm capitalize">{specialty}</span>
                      <div className="text-right">
                        <div className="font-bold">{data.predictedVisits}</div>
                        <div className="text-xs text-gray-500">
                          +{data.increasePercentage}%
                        </div>
                      </div>
                    </div>
                    <Progress value={Math.min(data.increasePercentage, 100)} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Remote Healthcare Services */}
          <Card>
            <CardHeader>
              <CardTitle>Remote Healthcare Services Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {countyData.predictions.remote.telehealthSessions}
                  </div>
                  <div className="text-sm text-gray-600">Telehealth Sessions</div>
                  <div className="text-xs text-gray-500 mt-1">
                    +{countyData.predictions.remote.increasePercentage}% vs normal
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {countyData.predictions.remote.mentalHealthRemote}
                  </div>
                  <div className="text-sm text-gray-600">Remote Mental Health</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Preferred during crisis
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {countyData.predictions.remote.chronicCareMonitoring}
                  </div>
                  <div className="text-sm text-gray-600">Chronic Care Monitoring</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Remote patient monitoring
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          {/* Enhanced Provider Coverage including Mental Health */}
          <Card>
            <CardHeader>
              <CardTitle>Healthcare Provider Coverage Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {countyData.providers.map((specialty) => (
                  <div key={specialty.type} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{specialty.name}</span>
                      <Badge variant={specialty.shortage ? 'destructive' : 'default'}>
                        {specialty.shortage ? 'SHORTAGE' : 'ADEQUATE'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Available:</span>
                        <span className="font-bold">{specialty.available}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Needed:</span>
                        <span>{specialty.needed}</span>
                      </div>
                      <Progress value={(specialty.available / specialty.needed) * 100} />
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Ratio: {specialty.ratio} per 100k</div>
                      <div>National Standard: {specialty.nationalRatio} per 100k</div>
                      {specialty.type === 'mentalHealth' && (
                        <div className="text-blue-600 font-medium">
                          Includes licensed counselors & therapists
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          {/* 48-Hour Detailed Prediction Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>48-Hour Healthcare Demand Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {countyData.forecast.map((period, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 rounded-lg border">
                    <div className="text-sm font-medium w-24">{period.time}</div>
                    <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">ED Visits</div>
                        <div className="text-red-600">{period.predictedEDVisits}</div>
                      </div>
                      <div>
                        <div className="font-medium">Mental Health</div>
                        <div className="text-purple-600">{period.mentalHealthCalls}</div>
                      </div>
                      <div>
                        <div className="font-medium">Cardiology</div>
                        <div className="text-orange-600">{period.cardiologyVisits}</div>
                      </div>
                      <div>
                        <div className="font-medium">Telehealth</div>
                        <div className="text-blue-600">{period.telehealthSessions}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{period.temperature}°F</div>
                      <Badge className={getStatusColor(period.overallRisk)}>
                        {period.overallRisk}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          {socialData ? (
            <div className="space-y-4">
              {/* Social Intelligence Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Social Media Intelligence
                    <Badge variant="outline">{socialData.riskIndicators?.level || 'Moderate'} Risk</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">{socialData.sentimentAnalysis?.breakdown?.negative || 0}%</div>
                      <div className="text-sm text-gray-600">Negative Sentiment</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{socialData.sentimentAnalysis?.breakdown?.urgent || 0}%</div>
                      <div className="text-sm text-gray-600">Urgent Posts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{socialData.keyTopics?.length || 0}</div>
                      <div className="text-sm text-gray-600">Key Topics</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">{socialData.emergingConcerns?.length || 0}</div>
                      <div className="text-sm text-gray-600">Emerging Concerns</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Key Topics Trending</h4>
                      <div className="space-y-2">
                        {socialData.keyTopics?.map((topic: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">{topic.topic}</div>
                              <div className="text-sm text-gray-600">{topic.summary}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{topic.mentions} mentions</div>
                              <Badge variant={topic.urgency === 'High' ? 'destructive' : 'secondary'}>
                                {topic.urgency}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Emerging Concerns</h4>
                      <div className="space-y-1">
                        {socialData.emergingConcerns?.map((concern: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">{concern}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <div className="space-y-1">
                        {socialData.recommendations?.map((rec: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Social Media Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Analyze local social media conversations about heat, infrastructure, and health issues.
                </p>
                <Button onClick={fetchSocialMediaIntelligence} disabled={socialLoading}>
                  {socialLoading ? 'Analyzing Social Media...' : 'Run Social Intelligence Analysis'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedCountyDeepDive;