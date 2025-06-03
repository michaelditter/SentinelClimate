import { County, ResourceDeployment, HeatZone } from '@/types/geo.types';

export const counties: County[] = [
  {
    id: 'harris-tx',
    name: 'Harris County',
    state: 'TX',
    coordinates: [29.7604, -95.3698],
    population: 4700000,
    vulnerablePopulation: 2632000,
    riskScore: 94,
    temperature: 119,
    heatIndex: 125,
    alertLevel: 'EXTREME',
    demographics: {
      elderly: 12.4,
      lowIncome: 38,
      noAC: 800000,
      providerShortage: 45
    }
  },
  {
    id: 'maricopa-az',
    name: 'Maricopa County',
    state: 'AZ',
    coordinates: [33.4484, -112.0740],
    population: 4400000,
    vulnerablePopulation: 1848000,
    riskScore: 87,
    temperature: 115,
    heatIndex: 118,
    alertLevel: 'HIGH',
    demographics: {
      elderly: 18.2,
      lowIncome: 28,
      noAC: 350000,
      providerShortage: 32
    }
  },
  {
    id: 'miami-dade-fl',
    name: 'Miami-Dade County',
    state: 'FL',
    coordinates: [25.7617, -80.1918],
    population: 2700000,
    vulnerablePopulation: 1188000,
    riskScore: 72,
    temperature: 108,
    heatIndex: 115,
    alertLevel: 'MODERATE',
    demographics: {
      elderly: 15.8,
      lowIncome: 42,
      noAC: 250000,
      providerShortage: 28
    }
  }
];

export const resourceDeployments: ResourceDeployment[] = [
  {
    id: 'mobile-1',
    type: 'mobile-unit',
    coordinates: [29.7604, -95.3698],
    status: 'deployed',
    capacity: 50,
    served: 34
  },
  {
    id: 'cooling-1',
    type: 'cooling-center',
    coordinates: [29.7904, -95.3398],
    status: 'deployed',
    capacity: 200,
    served: 156
  },
  {
    id: 'medical-1',
    type: 'medical-team',
    coordinates: [33.4484, -112.0740],
    status: 'en-route',
    capacity: 25,
    served: 0
  }
];

export const heatZones: HeatZone[] = [
  {
    id: 'harris-extreme',
    coordinates: [
      [29.6, -95.5],
      [29.9, -95.5],
      [29.9, -95.2],
      [29.6, -95.2]
    ],
    intensity: 0.9,
    riskLevel: 'EXTREME'
  },
  {
    id: 'maricopa-high',
    coordinates: [
      [33.3, -112.2],
      [33.6, -112.2],
      [33.6, -111.9],
      [33.3, -111.9]
    ],
    intensity: 0.7,
    riskLevel: 'HIGH'
  }
];
