/**
 * Resource Deployment Calculator for Emergency Response
 * Handles both urban and rural deployment scenarios with appropriate scaling
 */

export interface CountyProfile {
  population: number;
  area: number; // square miles
  populationDensity: number;
  isRural: boolean;
  hasFloodRisk: boolean;
  majorWaterways: string[];
  infrastructureType: 'urban' | 'suburban' | 'rural';
}

export interface DeploymentScenario {
  scenarioType: 'heat' | 'flood' | 'combined';
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'EXTREME';
  duration: number; // hours
  affectedPopulation: number;
  vulnerablePopulation: number;
}

export interface ResourceDeployment {
  mobileUnits: number;
  emergencyShelters: number;
  medicalPersonnel: number;
  emergencyKits: number;
  specializedResources: {
    highWaterRescue?: number;
    helicopterUnits?: number;
    boatUnits?: number;
    communicationUnits?: number;
    livestockSupport?: boolean;
  };
}

/**
 * Calculate appropriate resource deployment based on county characteristics and scenario
 */
export function calculateResourceDeployment(
  county: CountyProfile,
  scenario: DeploymentScenario
): ResourceDeployment {
  
  // Base deployment ratios
  const baseRatios = {
    urban: {
      mobileUnitsPerCapita: 0.00001, // 1 per 100k population
      sheltersPerArea: 0.5, // per square mile
      medicalPerCapita: 0.000003, // 3 per million
      kitsPerVulnerable: 0.1 // 10% of vulnerable population
    },
    rural: {
      mobileUnitsPerCapita: 0.000005, // 0.5 per 100k population
      sheltersPerArea: 0.1, // fewer per area but strategically placed
      medicalPerCapita: 0.000002, // 2 per million
      kitsPerVulnerable: 0.08 // 8% of vulnerable population
    }
  };

  const ratios = county.isRural ? baseRatios.rural : baseRatios.urban;
  
  // Severity multipliers
  const severityMultipliers = {
    'LOW': 0.5,
    'MODERATE': 1.0,
    'HIGH': 1.5,
    'CRITICAL': 2.0,
    'EXTREME': 3.0
  };

  const multiplier = severityMultipliers[scenario.severity];

  // Base calculations
  let mobileUnits = Math.ceil(county.population * ratios.mobileUnitsPerCapita * multiplier);
  let emergencyShelters = Math.ceil(county.area * ratios.sheltersPerArea * multiplier);
  let medicalPersonnel = Math.ceil(county.population * ratios.medicalPerCapita * multiplier);
  let emergencyKits = Math.ceil(scenario.vulnerablePopulation * ratios.kitsPerVulnerable * multiplier);

  // Rural-specific adjustments
  if (county.isRural) {
    // Rural areas need fewer but more strategically placed resources
    mobileUnits = Math.max(2, Math.min(mobileUnits, 5)); // 2-5 units max for rural
    emergencyShelters = Math.max(1, Math.min(emergencyShelters, 3)); // 1-3 shelters max
    medicalPersonnel = Math.max(3, Math.min(medicalPersonnel, 10)); // 3-10 personnel
    emergencyKits = Math.min(emergencyKits, 1000); // Cap at 1000 for rural areas
  }

  // Urban caps (prevent over-deployment)
  if (!county.isRural) {
    mobileUnits = Math.min(mobileUnits, 50); // Max 50 units for urban
    emergencyShelters = Math.min(emergencyShelters, 25); // Max 25 shelters
    medicalPersonnel = Math.min(medicalPersonnel, 20); // Max 20 teams
  }

  // Specialized resources based on scenario and geography
  const specializedResources: any = {};

  if (scenario.scenarioType === 'flood' || county.hasFloodRisk) {
    if (county.isRural) {
      specializedResources.highWaterRescue = Math.ceil(county.majorWaterways.length * 0.5);
      specializedResources.helicopterUnits = scenario.severity === 'EXTREME' ? 2 : 1;
      specializedResources.boatUnits = Math.min(county.majorWaterways.length * 2, 8);
      specializedResources.communicationUnits = Math.ceil(county.area / 100); // 1 per 100 sq miles
      specializedResources.livestockSupport = true;
    } else {
      specializedResources.highWaterRescue = Math.ceil(mobileUnits * 0.3);
      specializedResources.boatUnits = Math.ceil(county.majorWaterways.length * 3);
    }
  }

  if (scenario.scenarioType === 'heat') {
    // Heat-specific resources don't need specialized equipment
    // Focus on cooling centers and medical support
  }

  return {
    mobileUnits,
    emergencyShelters,
    medicalPersonnel,
    emergencyKits,
    specializedResources
  };
}

/**
 * Get county profile for common Texas counties
 */
export function getCountyProfile(fips: string): CountyProfile | null {
  const profiles: Record<string, CountyProfile> = {
    // Harris County (Houston) - Urban
    '48201': {
      population: 4780913,
      area: 1777,
      populationDensity: 2690,
      isRural: false,
      hasFloodRisk: true,
      majorWaterways: ['Buffalo Bayou', 'San Jacinto River', 'Brays Bayou'],
      infrastructureType: 'urban'
    },
    
    // Angelina County (rural East Texas near Neches River) - Rural
    '48005': {
      population: 86395,
      area: 802,
      populationDensity: 108,
      isRural: true,
      hasFloodRisk: true,
      majorWaterways: ['Neches River', 'Angelina River'],
      infrastructureType: 'rural'
    },
    
    // Cherokee County (rural East Texas) - Rural
    '48073': {
      population: 50412,
      area: 1052,
      populationDensity: 48,
      isRural: true,
      hasFloodRisk: true,
      majorWaterways: ['Neches River', 'Angelina River'],
      infrastructureType: 'rural'
    },
    
    // Nacogdoches County (rural East Texas) - Rural
    '48347': {
      population: 65124,
      area: 947,
      populationDensity: 69,
      isRural: true,
      hasFloodRisk: true,
      majorWaterways: ['Neches River', 'Angelina River'],
      infrastructureType: 'rural'
    }
  };

  return profiles[fips] || null;
}

/**
 * Generate deployment scenario based on current conditions
 */
export function generateDeploymentScenario(
  county: CountyProfile,
  weatherData: any,
  floodData?: any
): DeploymentScenario {
  
  let scenarioType: 'heat' | 'flood' | 'combined' = 'heat';
  let severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'EXTREME' = 'MODERATE';
  
  // Determine scenario type
  if (floodData?.active && weatherData?.heatIndex > 95) {
    scenarioType = 'combined';
  } else if (floodData?.active) {
    scenarioType = 'flood';
  } else {
    scenarioType = 'heat';
  }
  
  // Determine severity based on conditions
  if (scenarioType === 'flood') {
    if (floodData?.level === 'major') severity = 'EXTREME';
    else if (floodData?.level === 'moderate') severity = 'HIGH';
    else severity = 'MODERATE';
  } else {
    const heatIndex = weatherData?.heatIndex || 80;
    if (heatIndex >= 115) severity = 'EXTREME';
    else if (heatIndex >= 110) severity = 'CRITICAL';
    else if (heatIndex >= 105) severity = 'HIGH';
    else if (heatIndex >= 100) severity = 'MODERATE';
    else severity = 'LOW';
  }
  
  // Calculate affected population (rural areas have lower density)
  const affectedPercentage = county.isRural ? 0.15 : 0.25; // 15% rural, 25% urban
  const vulnerablePercentage = county.isRural ? 0.08 : 0.12; // 8% rural, 12% urban
  
  return {
    scenarioType,
    severity,
    duration: scenarioType === 'flood' ? 72 : 48, // floods last longer
    affectedPopulation: Math.ceil(county.population * affectedPercentage),
    vulnerablePopulation: Math.ceil(county.population * vulnerablePercentage)
  };
}