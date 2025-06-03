export interface County {
  id: string;
  name: string;
  state: string;
  coordinates: [number, number];
  population: number;
  vulnerablePopulation: number;
  riskScore: number;
  temperature: number;
  heatIndex: number;
  alertLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
  demographics: {
    elderly: number;
    lowIncome: number;
    noAC: number;
    providerShortage: number;
  };
}

export interface ResourceDeployment {
  id: string;
  type: 'mobile-unit' | 'cooling-center' | 'medical-team' | 'emergency-kit';
  coordinates: [number, number];
  status: 'deployed' | 'staging' | 'en-route' | 'available';
  capacity: number;
  served: number;
}

export interface HeatZone {
  id: string;
  coordinates: [number, number][];
  intensity: number;
  riskLevel: 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';
}
