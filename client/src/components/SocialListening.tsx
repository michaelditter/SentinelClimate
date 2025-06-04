import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  AlertTriangle, 
  Globe, 
  Users, 
  Zap, 
  Heart, 
  Building, 
  TrendingUp,
  RefreshCw,
  PlayCircle,
  PauseCircle,
  Clock,
  MapPin,
  Activity,
  Shield,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  id: string;
  query: string;
  timestamp: Date;
  results: {
    title: string;
    url: string;
    snippet: string;
    relevanceScore: number;
    riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'WATCH';
  }[];
  alertLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'WATCH';
  summary: string;
}

interface SectionConfig {
  id: string;
  name: string;
  icon: any;
  color: string;
  frequency: string;
  queries: string[];
  lastRun?: Date;
  isRunning: boolean;
  results: SearchResult[];
}

const SocialListening: React.FC = () => {
  const [sections, setSections] = useState<SectionConfig[]>([
    {
      id: 'immediate-threats',
      name: 'Immediate Threat Detection',
      icon: AlertTriangle,
      color: 'border-red-500',
      frequency: 'Every 15 minutes',
      queries: [
        '"extreme heat warning" OR "heat advisory" OR "excessive heat" site:weather.gov OR site:weather.com',
        '"heat index" AND ("110" OR "115" OR "120") AND ("Texas" OR "Arizona" OR "California" OR "Florida")',
        '"power outage" AND "heat wave" AND ("hospital" OR "emergency")',
        '"cooling center" AND ("opened" OR "activated" OR "emergency")',
        '"emergency department" AND ("overwhelmed" OR "capacity" OR "surge") AND "heat"'
      ],
      isRunning: false,
      results: []
    },
    {
      id: 'vulnerable-populations',
      name: 'Vulnerable Population Monitoring',
      icon: Users,
      color: 'border-orange-500',
      frequency: 'Every 30 minutes',
      queries: [
        '"elderly" AND "heat exhaustion" AND ("emergency room" OR "hospitalized")',
        '"homeless" AND ("heat stroke" OR "heat related death")',
        '"chronic illness" AND "heat wave" AND ("complications" OR "exacerbation")',
        '"mental health" AND "extreme heat" AND ("crisis" OR "emergency")',
        '"Harris County" AND "heat related" AND ("death" OR "illness" OR "emergency")'
      ],
      isRunning: false,
      results: []
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure Vulnerability',
      icon: Zap,
      color: 'border-yellow-500',
      frequency: 'Every hour',
      queries: [
        '"power grid" AND ("strain" OR "failure" OR "overload") AND "heat"',
        '"rolling blackouts" OR "brownouts" AND "extreme temperatures"',
        '"ERCOT" AND ("emergency" OR "alert" OR "conservation")',
        '"electricity demand" AND "record high" AND "cooling"',
        '"public transportation" AND "heat emergency" AND ("suspended" OR "delayed")'
      ],
      isRunning: false,
      results: []
    },
    {
      id: 'social-media',
      name: 'Social Media Sentiment',
      icon: Globe,
      color: 'border-blue-500',
      frequency: 'Every 30 minutes',
      queries: [
        'site:twitter.com "can\'t afford AC" OR "no air conditioning" AND "heat wave"',
        'site:reddit.com "emergency room" AND "heat" AND ("wait time" OR "crowded")',
        'site:facebook.com "cooling center" OR "heat emergency" AND ("local" OR "community")',
        '"can\'t pay electric bill" AND "summer" AND ("heat" OR "cooling")',
        '"heat exhaustion" AND ("workplace" OR "job site" OR "outdoors")'
      ],
      isRunning: false,
      results: []
    },
    {
      id: 'healthcare-system',
      name: 'Healthcare System Intelligence',
      icon: Heart,
      color: 'border-green-500',
      frequency: 'Every hour',
      queries: [
        '"urgent care" AND "heat related" AND ("busy" OR "full" OR "appointments")',
        '"911 calls" AND "heat emergency" AND ("increase" OR "surge")',
        '"ambulance diversion" AND "hospital capacity" AND "summer"',
        '"IV fluid shortage" OR "saline shortage" AND "heat wave"',
        '"nurse shortage" AND "emergency department" AND "summer"'
      ],
      isRunning: false,
      results: []
    },
    {
      id: 'policy-response',
      name: 'Policy & Emergency Response',
      icon: Shield,
      color: 'border-purple-500',
      frequency: 'Every 2 hours',
      queries: [
        '"emergency declaration" AND "heat" AND ("governor" OR "mayor" OR "county")',
        '"heat emergency plan" AND "activated"',
        '"National Weather Service" AND "heat warning" AND ("extended" OR "prolonged")',
        '"mobile medical unit" OR "mobile clinic" AND "heat relief"',
        '"water distribution" AND "heat emergency"'
      ],
      isRunning: false,
      results: []
    },
    {
      id: 'economic-impact',
      name: 'Economic & Secondary Impact',
      icon: DollarSign,
      color: 'border-indigo-500',
      frequency: 'Every 4 hours',
      queries: [
        '"heat related" AND "economic impact" OR "economic loss"',
        '"productivity loss" AND "extreme heat"',
        '"insurance claims" AND "heat damage" OR "heat related"',
        '"delivery delays" AND "extreme heat"',
        '"road closures" AND "heat" AND ("buckling" OR "damage")'
      ],
      isRunning: false,
      results: []
    }
  ]);

  const [globalRunning, setGlobalRunning] = useState(false);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [overallRiskLevel, setOverallRiskLevel] = useState<'CRITICAL' | 'HIGH' | 'MODERATE' | 'WATCH'>('WATCH');

  const executeSearch = async (sectionId: string, query: string): Promise<SearchResult> => {
    try {
      const response = await fetch('/api/social-listening/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          sectionId
        }),
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Search error:', error);
      return {
        id: `${sectionId}-${Date.now()}`,
        query,
        timestamp: new Date(),
        results: [],
        alertLevel: 'WATCH',
        summary: 'Search temporarily unavailable'
      };
    }
  };

  const runSectionQueries = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, isRunning: true } : s
    ));

    const searchPromises = section.queries.map(query => executeSearch(sectionId, query));
    const results = await Promise.all(searchPromises);

    setSections(prev => prev.map(s => 
      s.id === sectionId ? { 
        ...s, 
        isRunning: false, 
        lastRun: new Date(),
        results: results
      } : s
    ));
  };

  const runAllSections = async () => {
    setGlobalRunning(true);
    const promises = sections.map(section => runSectionQueries(section.id));
    await Promise.all(promises);
    setGlobalRunning(false);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MODERATE': return 'bg-yellow-500';
      case 'WATCH': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  useEffect(() => {
    // Calculate overall risk level and total alerts
    let criticalCount = 0;
    let highCount = 0;
    let moderateCount = 0;
    let totalCount = 0;

    sections.forEach(section => {
      section.results.forEach(result => {
        totalCount++;
        switch (result.alertLevel) {
          case 'CRITICAL': criticalCount++; break;
          case 'HIGH': highCount++; break;
          case 'MODERATE': moderateCount++; break;
        }
      });
    });

    setTotalAlerts(totalCount);
    
    if (criticalCount > 0) setOverallRiskLevel('CRITICAL');
    else if (highCount > 2) setOverallRiskLevel('HIGH');
    else if (moderateCount > 3) setOverallRiskLevel('MODERATE');
    else setOverallRiskLevel('WATCH');
  }, [sections]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Search className="h-6 w-6 text-blue-400" />
              <div>
                <CardTitle className="text-white">Social Listening Intelligence</CardTitle>
                <p className="text-gray-400 text-sm">Real-time crisis detection across digital channels</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className={`${getRiskLevelColor(overallRiskLevel)} text-white`}>
                {overallRiskLevel} RISK
              </Badge>
              <div className="text-right">
                <div className="text-lg font-bold text-white">{totalAlerts}</div>
                <div className="text-xs text-gray-400">Active Alerts</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={runAllSections}
                disabled={globalRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {globalRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running All Scans...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run All Sections
                  </>
                )}
              </Button>
              {globalRunning && (
                <div className="flex items-center space-x-2">
                  <Progress value={33} className="w-32" />
                  <span className="text-sm text-gray-400">Scanning...</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-400">
              Last full scan: {formatTimeAgo(new Date())}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`bg-gray-800 border-gray-700 border-l-4 ${section.color}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <section.icon className="h-5 w-5 text-gray-400" />
                    <div>
                      <CardTitle className="text-white text-lg">{section.name}</CardTitle>
                      <p className="text-gray-400 text-sm">{section.frequency}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {section.results.length > 0 && (
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        {section.results.length} results
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      onClick={() => runSectionQueries(section.id)}
                      disabled={section.isRunning}
                      className="bg-gray-700 hover:bg-gray-600"
                    >
                      {section.isRunning ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Query List */}
                <div className="space-y-2">
                  <h4 className="font-medium text-white text-sm">Active Queries:</h4>
                  <div className="space-y-1">
                    {section.queries.slice(0, 3).map((query, index) => (
                      <div key={index} className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded">
                        {query.length > 80 ? `${query.substring(0, 80)}...` : query}
                      </div>
                    ))}
                    {section.queries.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{section.queries.length - 3} more queries...
                      </div>
                    )}
                  </div>
                </div>

                {/* Results Summary */}
                {/* Only show results if they contain genuine crisis indicators */}
                {section.results.length > 0 && section.results.some(result => 
                  result.alertLevel !== 'NONE' && 
                  result.results.length > 0 &&
                  result.alertLevel !== 'WATCH' ||
                  (result.alertLevel === 'WATCH' && result.results.length > 0 && 
                   result.summary && !result.summary.includes('No relevant'))
                ) && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white text-sm">Crisis Indicators Found:</h4>
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(section.lastRun)}
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {section.results
                        .filter(result => 
                          result.alertLevel !== 'NONE' && 
                          result.results.length > 0 &&
                          (!result.summary || !result.summary.includes('No relevant'))
                        )
                        .slice(0, 2)
                        .map((result, resultIndex) => (
                        <motion.div
                          key={`${section.id}-${result.id}-${resultIndex}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-gray-900/50 p-3 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <Badge className={`${getRiskLevelColor(result.alertLevel)} text-white text-xs`}>
                              {result.alertLevel}
                            </Badge>
                            <div className="text-xs text-gray-400">
                              {result.results.length} verified sources
                            </div>
                          </div>
                          
                          {result.results.length > 0 && (
                            <div className="space-y-2">
                              <a 
                                href={result.results[0].url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block text-sm text-blue-300 font-medium hover:text-blue-200 underline transition-colors"
                              >
                                {result.results[0].title.length > 60 
                                  ? `${result.results[0].title.substring(0, 60)}...` 
                                  : result.results[0].title}
                              </a>
                              <div className="text-xs text-gray-400">
                                {result.results[0].snippet.length > 100 
                                  ? `${result.results[0].snippet.substring(0, 100)}...` 
                                  : result.results[0].snippet}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                  Source: {result.results[0].source}
                                </span>
                                <a 
                                  href={result.results[0].url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  View Article →
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {result.summary && !result.summary.includes('No relevant') && (
                            <div className="text-xs text-blue-300 bg-blue-900/20 p-2 rounded">
                              Crisis Analysis: {result.summary}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Show monitoring status when no crisis indicators found */}
                {section.lastRun && (section.results.length === 0 || 
                  section.results.every(result => 
                    result.alertLevel === 'NONE' || 
                    result.results.length === 0 ||
                    (result.summary && result.summary.includes('No relevant'))
                  )
                ) && (
                  <div className="text-center py-4">
                    <div className="text-sm text-gray-400">
                      ✓ Monitoring active - No crisis indicators detected
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last scan: {formatTimeAgo(section.lastRun)}
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      section.isRunning ? 'bg-yellow-400 animate-pulse' : 
                      section.results.length > 0 ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                    <span className="text-xs text-gray-400">
                      {section.isRunning ? 'Scanning...' : 
                       section.results.length > 0 ? 'Active monitoring' : 'Standby'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {section.queries.length} queries configured
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Insights Panel */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Real-Time Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {sections.reduce((sum, s) => sum + s.results.filter(r => r.alertLevel === 'CRITICAL').length, 0)}
              </div>
              <div className="text-red-400 text-sm">Critical Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {sections.reduce((sum, s) => sum + s.results.filter(r => r.alertLevel === 'HIGH').length, 0)}
              </div>
              <div className="text-orange-400 text-sm">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {sections.filter(s => s.isRunning).length}
              </div>
              <div className="text-blue-400 text-sm">Active Scans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {sections.reduce((sum, s) => sum + s.results.reduce((r, result) => r + result.results.length, 0), 0)}
              </div>
              <div className="text-green-400 text-sm">Total Sources</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialListening;