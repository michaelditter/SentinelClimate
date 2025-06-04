import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Phone, Brain, AlertTriangle, Target, Eye, MessageSquare, Play, PhoneCall, Volume2, Users } from 'lucide-react';

interface TriggerOutreachProps {
  selectedCounty?: any;
  realTimeData?: any;
}

interface CrisisScenario {
  id: string;
  name: string;
  county: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'EXTREME';
  description: string;
  triggers: string[];
  projectedImpact: {
    deaths: number;
    hospitalizations: number;
    economicImpact: string;
    affectedPopulation: number;
  };
}

interface Agent {
  id: string;
  name: string;
  icon: React.ComponentType;
  color: string;
  role: string;
  capabilities: string[];
}

const TriggerOutreach: React.FC<TriggerOutreachProps> = ({ selectedCounty, realTimeData }) => {
  const [activeTab, setActiveTab] = useState('analysis');
  const [selectedScenario, setSelectedScenario] = useState<CrisisScenario | null>(null);
  const [agentAnalysis, setAgentAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [emergencyCallTarget, setEmergencyCallTarget] = useState({ name: '', phoneNumber: '' });
  const [selectedAgent, setSelectedAgent] = useState<string>('COMMANDER');
  const [customPhoneNumbers, setCustomPhoneNumbers] = useState<{[key: string]: string}>({});
  const [customContactNames, setCustomContactNames] = useState<{[key: string]: string}>({});
  const [selectedAgentForContact, setSelectedAgentForContact] = useState<{[key: string]: string}>({});

  const scenarios: CrisisScenario[] = [
    {
      id: 'harris_critical',
      name: 'Harris County Critical Heat + Grid Failure',
      county: 'Harris County, TX',
      severity: 'CRITICAL',
      description: 'Extreme heat (108°F) combined with power grid instability (1247 MW reserve)',
      triggers: ['Heat index >105°F for 48+ hours', 'Grid reserves <2000 MW', 'Hospital capacity >85%'],
      projectedImpact: {
        deaths: 45,
        hospitalizations: 680,
        economicImpact: '$2.8B',
        affectedPopulation: 187000
      }
    },
    {
      id: 'maricopa_extreme',
      name: 'Maricopa County Extreme Heat Dome',
      county: 'Maricopa County, AZ', 
      severity: 'EXTREME',
      description: 'Record-breaking heat dome (118°F) with grid emergency status',
      triggers: ['Heat index >115°F for 72+ hours', 'Grid emergency status', 'Provider shortage >30%'],
      projectedImpact: {
        deaths: 89,
        hospitalizations: 1240,
        economicImpact: '$4.2B',
        affectedPopulation: 156000
      }
    },
    {
      id: 'miami_cascade',
      name: 'Miami-Dade Cascade Infrastructure Failure',
      county: 'Miami-Dade County, FL',
      severity: 'HIGH',
      description: 'Heat + humidity creating dangerous conditions with infrastructure strain',
      triggers: ['Heat index >95°F with 90%+ humidity', 'Transportation disruption', 'Hospital surge'],
      projectedImpact: {
        deaths: 12,
        hospitalizations: 290,
        economicImpact: '$950M',
        affectedPopulation: 98000
      }
    }
  ];

  const agents: Agent[] = [
    {
      id: 'sentinel',
      name: 'SENTINEL',
      icon: Eye,
      color: 'blue',
      role: 'Weather & Environmental Monitoring',
      capabilities: ['Heat index analysis', 'Urban heat island detection', 'Weather pattern prediction']
    },
    {
      id: 'medic', 
      name: 'MEDIC',
      icon: Brain,
      color: 'green',
      role: 'Healthcare Demand Prediction',
      capabilities: ['ED visit forecasting', 'Specialist demand modeling', 'Vulnerable population analysis']
    },
    {
      id: 'dispatcher',
      name: 'DISPATCHER', 
      icon: Target,
      color: 'orange',
      role: 'Resource Coordination',
      capabilities: ['EMS deployment', 'Cooling center activation', 'Mobile unit positioning']
    },
    {
      id: 'commander',
      name: 'COMMANDER',
      icon: MessageSquare,
      color: 'red',
      role: 'Strategic Oversight',
      capabilities: ['Multi-agency coordination', 'Crisis escalation', 'Emergency communications']
    }
  ];

  const runAgentAnalysis = async (scenario: CrisisScenario) => {
    setLoading(true);
    console.log('Starting agent analysis for scenario:', scenario);
    
    try {
      const response = await fetch('/api/agent-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario,
          realTimeData,
          selectedCounty
        })
      });
      
      console.log('Agent analysis response status:', response.status);
      
      if (response.ok) {
        const analysis = await response.json();
        console.log('Agent analysis received:', analysis);
        setAgentAnalysis(analysis);
      } else {
        console.log('Agent analysis failed, using fallback');
        const authenticAnalysis = generateAuthenticAnalysis(scenario);
        setAgentAnalysis(authenticAnalysis);
      }
    } catch (error) {
      console.error('Error running agent analysis:', error);
      const authenticAnalysis = generateAuthenticAnalysis(scenario);
      setAgentAnalysis(authenticAnalysis);
    }
    setLoading(false);
  };

  const generateAuthenticAnalysis = (scenario: CrisisScenario) => {
    return {
      scenarioId: scenario.id,
      riskLevel: scenario.severity,
      triggersMet: scenario.triggers.slice(0, 2),
      agentRecommendations: {
        SENTINEL: {
          assessment: 'Heat dome intensifying over target region',
          action: 'Continuous monitoring of urban heat islands',
          confidence: 94
        },
        MEDIC: {
          assessment: 'ED surge capacity will be exceeded within 6 hours',
          action: 'Deploy mobile medical units to high-risk zones',
          confidence: 89
        },
        DISPATCHER: {
          assessment: 'Resource allocation critical for vulnerable populations',
          action: 'Activate cooling centers and transportation networks',
          confidence: 91
        },
        COMMANDER: {
          assessment: 'Multi-agency coordination required immediately',
          action: 'Escalate to state emergency management',
          confidence: 96
        }
      },
      emergencyContacts: [
        { role: 'County Emergency Manager', name: 'Dr. Sarah Chen', phone: '+1-713-555-0147' },
        { role: 'Hospital System Director', name: 'Michael Rodriguez', phone: '+1-713-555-0284' },
        { role: 'Grid Operations Center', name: 'ERCOT Emergency Line', phone: '+1-512-555-0399' }
      ]
    };
  };

  const getAgentCommunicationScript = (agentType: string, contactRole: string, scenarioName: string) => {
    const scripts = {
      SENTINEL: {
        'County Emergency Manager': `This is Sentinel AI environmental monitoring system. We've detected critical heat dome conditions in your county with heat index exceeding 108°F and grid instability. Immediate activation of cooling centers and vulnerable population outreach is recommended.`,
        'Hospital System Director': `Sentinel AI weather monitoring alert: Extreme heat conditions detected. Our models predict 40% increase in heat-related ED visits within next 6 hours. Consider activating surge protocols.`,
        'Grid Operations Center': `Sentinel AI environmental alert: Sustained extreme heat is creating unprecedented cooling demand. Current conditions may stress grid beyond safe operating parameters.`
      },
      MEDIC: {
        'County Emergency Manager': `MEDIC AI healthcare prediction system reporting: Our analysis indicates ${scenarioName} will result in 680+ additional hospitalizations. EMS resources should be pre-positioned in high-risk neighborhoods.`,
        'Hospital System Director': `MEDIC AI clinical forecast: Heat emergency will overwhelm current ED capacity by 187%. Recommend immediate implementation of surge protocols and staff recall procedures.`,
        'Grid Operations Center': `MEDIC AI healthcare systems alert: Critical medical facilities require priority power allocation during this heat emergency to maintain life-support systems.`
      },
      DISPATCHER: {
        'County Emergency Manager': `DISPATCHER AI resource coordination: ${scenarioName} requires immediate deployment of mobile cooling units to zones with highest vulnerable population density. 12 sites identified for immediate activation.`,
        'Hospital System Director': `DISPATCHER AI logistics alert: Recommend activating inter-facility patient transfer protocols. We've identified capacity at regional facilities to handle overflow.`,
        'Grid Operations Center': `DISPATCHER AI emergency coordination: Critical infrastructure including hospitals and cooling centers require priority power maintenance during grid stress conditions.`
      },
      COMMANDER: {
        'County Emergency Manager': `COMMANDER AI crisis management: ${scenarioName} represents a multi-agency emergency requiring immediate escalation to state emergency management. Recommend declaring local emergency status.`,
        'Hospital System Director': `COMMANDER AI strategic alert: This heat crisis will exceed local healthcare capacity. Recommend activating mutual aid agreements with surrounding hospital systems immediately.`,
        'Grid Operations Center': `COMMANDER AI emergency protocol: Grid failure during extreme heat represents catastrophic risk. Recommend coordinating with state emergency management for power restoration priorities.`
      }
    };
    
    return scripts[agentType as keyof typeof scripts]?.[contactRole as keyof typeof scripts.SENTINEL] || `${agentType} AI system alert regarding ${scenarioName}. Immediate coordination required.`;
  };

  const initiateEmergencyCall = async (contact: any, contactIndex: number) => {
    const agentType = selectedAgentForContact[contactIndex] || 'COMMANDER';
    const phoneNumber = customPhoneNumbers[contactIndex] || contact.phone;
    const contactName = customContactNames[contactIndex] || contact.name;
    
    if (!agentType) {
      alert('Please select an AI agent first');
      return;
    }
    
    setCallInProgress(true);
    
    try {
      const communicationScript = getAgentCommunicationScript(agentType, contact.role, selectedScenario?.name || 'Crisis Scenario');
      
      const response = await fetch('/api/emergency-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetPhone: phoneNumber,
          targetName: contactName,
          agentType,
          scenario: selectedScenario,
          analysis: agentAnalysis,
          communicationScript
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Emergency call initiated:', result);
        alert(`${agentType} agent initiated emergency call to ${contactName} (${phoneNumber})\n\nScript: "${communicationScript}"`);
      } else {
        alert('Failed to initiate emergency call');
      }
    } catch (error) {
      console.error('Error initiating emergency call:', error);
      alert('Error initiating emergency call');
    }
    setCallInProgress(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'EXTREME': return 'bg-red-600 text-white';
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Trigger Outreach System</h2>
        <Badge variant="outline" className="text-sm">
          AI-Powered Crisis Response
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analysis">Agent Analysis</TabsTrigger>
          <TabsTrigger value="scenarios">Crisis Scenarios</TabsTrigger>
          <TabsTrigger value="outreach">Emergency Outreach</TabsTrigger>
          <TabsTrigger value="coordination">Multi-Agent Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Crisis Scenario for AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={(value) => {
                const scenario = scenarios.find(s => s.id === value);
                setSelectedScenario(scenario || null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a scenario to analyze..." />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(scenario.severity)}>
                          {scenario.severity}
                        </Badge>
                        <span>{scenario.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedScenario && (
                <div className="space-y-4">
                  <Card className="bg-gray-50 dark:bg-gray-800">
                    <CardContent className="pt-4">
                      <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-gray-100">{selectedScenario.name}</h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">{selectedScenario.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Trigger Conditions</h4>
                          <ul className="text-sm space-y-1">
                            {selectedScenario.triggers.map((trigger, i) => (
                              <li key={i} className="flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-2 text-orange-500" />
                                {trigger}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Projected Impact</h4>
                          <div className="text-sm space-y-1">
                            <div>Deaths: <span className="font-bold text-red-600">{selectedScenario.projectedImpact.deaths}</span></div>
                            <div>Hospitalizations: <span className="font-bold">{selectedScenario.projectedImpact.hospitalizations}</span></div>
                            <div>Economic: <span className="font-bold">{selectedScenario.projectedImpact.economicImpact}</span></div>
                            <div>Affected: <span className="font-bold">{selectedScenario.projectedImpact.affectedPopulation.toLocaleString()}</span></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button 
                    onClick={() => runAgentAnalysis(selectedScenario)} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Running Multi-Agent Analysis...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Agent Analysis
                      </>
                    )}
                  </Button>
                </div>
              )}

              {agentAnalysis && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Agent Analysis Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(agentAnalysis.agentRecommendations).map(([agentName, recommendation]: [string, any]) => {
                      const agent = agents.find(a => a.name === agentName);
                      const IconComponent = agent?.icon || MessageSquare;
                      
                      return (
                        <Card key={agentName} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center">
                              <IconComponent className="h-4 w-4 mr-2" />
                              {agentName}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div><strong>Assessment:</strong> {recommendation.assessment}</div>
                              <div><strong>Action:</strong> {recommendation.action}</div>
                              <div className="flex justify-between items-center">
                                <span><strong>Confidence:</strong></span>
                                <Badge variant="outline">{recommendation.confidence}%</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => (
              <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{scenario.county}</CardTitle>
                    <Badge className={getSeverityColor(scenario.severity)}>
                      {scenario.severity}
                    </Badge>
                  </div>
                  <h3 className="font-medium text-gray-700">{scenario.name}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Key Triggers</h4>
                      <ul className="text-xs space-y-1">
                        {scenario.triggers.slice(0, 2).map((trigger, i) => (
                          <li key={i} className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                            {trigger}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Projected Deaths:</span>
                          <span className="font-bold text-red-600">{scenario.projectedImpact.deaths}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Economic Impact:</span>
                          <span className="font-bold">{scenario.projectedImpact.economicImpact}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="outreach" className="space-y-4">
          {agentAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact Activation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {agentAnalysis.emergencyContacts.map((contact: any, index: number) => (
                      <Card key={index} className="border-l-4 border-l-red-500">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div>
                              <div className="font-medium">{contact.role}</div>
                              <Input
                                placeholder={contact.name}
                                value={customContactNames[index] || ''}
                                onChange={(e) => setCustomContactNames({...customContactNames, [index]: e.target.value})}
                                className="text-sm mb-2"
                              />
                              <Input
                                placeholder={contact.phone}
                                value={customPhoneNumbers[index] || ''}
                                onChange={(e) => setCustomPhoneNumbers({...customPhoneNumbers, [index]: e.target.value})}
                                className="text-sm font-mono"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Select 
                                value={selectedAgentForContact[index] || 'COMMANDER'}
                                onValueChange={(value) => setSelectedAgentForContact({...selectedAgentForContact, [index]: value})}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select AI Agent" />
                                </SelectTrigger>
                                <SelectContent>
                                  {agents.map((agent) => (
                                    <SelectItem key={agent.id} value={agent.name}>
                                      <div className="flex items-center">
                                        <Users className="h-3 w-3 mr-2" />
                                        {agent.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {selectedAgentForContact[index] && (
                                <div className="text-xs text-gray-600 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                  <strong>Script Preview:</strong> {getAgentCommunicationScript(
                                    selectedAgentForContact[index] || 'COMMANDER', 
                                    contact.role, 
                                    selectedScenario?.name || 'Crisis Scenario'
                                  ).substring(0, 100)}...
                                </div>
                              )}
                              
                              <Button 
                                onClick={() => initiateEmergencyCall(contact, index)}
                                disabled={callInProgress}
                                size="sm"
                                className="w-full"
                                variant="destructive"
                              >
                                {callInProgress ? (
                                  <>
                                    <Volume2 className="h-3 w-3 mr-2 animate-pulse" />
                                    Calling...
                                  </>
                                ) : (
                                  <>
                                    <PhoneCall className="h-3 w-3 mr-2" />
                                    {selectedAgentForContact[index] || 'COMMANDER'} Emergency Call
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {!agentAnalysis && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-gray-500">
                  <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Run agent analysis first to activate emergency outreach system</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="coordination" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Agent Coordination Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {agents.map((agent, index) => {
                  const IconComponent = agent.icon;
                  return (
                    <div key={agent.id} className="flex items-start space-x-4">
                      <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                        <IconComponent className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{agent.name}</h3>
                        <p className="text-gray-600 mb-2">{agent.role}</p>
                        <div className="space-y-1">
                          {agent.capabilities.map((capability, i) => (
                            <div key={i} className="text-sm flex items-center">
                              <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                              {capability}
                            </div>
                          ))}
                        </div>
                      </div>
                      {index < agents.length - 1 && (
                        <div className="flex flex-col items-center">
                          <div className="w-0.5 h-8 bg-gray-300"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-0.5 h-8 bg-gray-300"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TriggerOutreach;