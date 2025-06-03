export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  parameters: {
    peakTemperature: number;
    affectedPopulation: number;
    vulnerabilityFactor: number;
    duration: number;
  };
  county: string;
  isActive: boolean;
}

export interface SimulationOutcome {
  deaths: number;
  edVisits: number;
  hospitalizations: number;
  economicImpact: number;
  responseTime: number;
  preventedDeaths?: number;
  costSavings?: number;
}

export interface SimulationResult {
  scenario: SimulationScenario;
  outcomes: {
    actual: SimulationOutcome;
    withSentinel: SimulationOutcome;
  };
  timestamp: string;
  confidence: number;
}

export interface CostBreakdown {
  category: string;
  withoutAI: number;
  withAI: number;
  savings: number;
  description: string;
  icon: string;
}

export interface ROIProjection {
  year: number;
  investment: number;
  savings: number;
  cumulativeSavings: number;
  roi: number;
}
