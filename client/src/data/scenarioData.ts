import { SimulationScenario, SimulationResult } from '@/types/simulation.types';

export const scenarios: SimulationScenario[] = [
  {
    id: 'harris-heat-dome',
    name: 'Harris County Heat Dome',
    description: 'Based on 2023 heat event',
    parameters: {
      peakTemperature: 119,
      affectedPopulation: 181241,
      vulnerabilityFactor: 2.1,
      duration: 72
    },
    county: 'harris-tx',
    isActive: true
  },
  {
    id: 'phoenix-extreme-heat',
    name: 'Phoenix Extreme Heat',
    description: 'Desert urban scenario',
    parameters: {
      peakTemperature: 125,
      affectedPopulation: 95000,
      vulnerabilityFactor: 1.8,
      duration: 96
    },
    county: 'maricopa-az',
    isActive: false
  },
  {
    id: 'custom-scenario',
    name: 'Custom Scenario',
    description: 'Configure parameters',
    parameters: {
      peakTemperature: 110,
      affectedPopulation: 100000,
      vulnerabilityFactor: 1.5,
      duration: 48
    },
    county: 'custom',
    isActive: false
  }
];

export const generateSimulationResult = (scenario: SimulationScenario): SimulationResult => {
  const { parameters } = scenario;
  
  // Calculate base impact without AI
  const baseDeaths = Math.round((parameters.peakTemperature - 90) / 5 * parameters.vulnerabilityFactor * (parameters.affectedPopulation / 100000));
  const baseEDVisits = Math.round(parameters.affectedPopulation * 0.15 * parameters.vulnerabilityFactor);
  const baseHospitalizations = Math.round(baseEDVisits * 0.25);
  const baseEconomicImpact = baseDeaths * 11.6 + baseEDVisits * 2.5 + baseHospitalizations * 18;
  
  // Calculate impact with Sentinel AI (significant reduction)
  const withSentinelDeaths = Math.round(baseDeaths * 0.2); // 80% reduction
  const withSentinelEDVisits = Math.round(baseEDVisits * 0.6); // 40% reduction
  const withSentinelHospitalizations = Math.round(baseHospitalizations * 0.55); // 45% reduction
  const withSentinelEconomicImpact = withSentinelDeaths * 11.6 + withSentinelEDVisits * 2.5 + withSentinelHospitalizations * 18;
  
  return {
    scenario,
    outcomes: {
      actual: {
        deaths: baseDeaths,
        edVisits: baseEDVisits,
        hospitalizations: baseHospitalizations,
        economicImpact: baseEconomicImpact,
        responseTime: 36
      },
      withSentinel: {
        deaths: withSentinelDeaths,
        edVisits: withSentinelEDVisits,
        hospitalizations: withSentinelHospitalizations,
        economicImpact: withSentinelEconomicImpact,
        responseTime: 3,
        preventedDeaths: baseDeaths - withSentinelDeaths,
        costSavings: baseEconomicImpact - withSentinelEconomicImpact
      }
    },
    timestamp: new Date().toISOString(),
    confidence: 94
  };
};
