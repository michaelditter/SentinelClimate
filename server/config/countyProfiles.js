export const countyProfiles = {
  // Harris County, Texas (existing)
  "48201": {
    name: "Harris County",
    state: "TX",
    population: 4731145,
    fips: "48201",
    weatherStation: "KHOU",
    nwsOffice: "HGX", // Houston/Galveston
    gridOperator: "ERCOT",
    gridZone: "HOUSTON",
    healthcareRegion: "Texas Medical Center",
    vulnerabilityFactors: {
      seniorPopulation: 0.124, // 12.4%
      housingWithoutAC: 0.08,
      povertyRate: 0.158,
      chronicConditions: 0.45,
      urbanHeatIsland: 8.2 // degrees F above rural
    },
    providerBaselines: {
      cardiology: { needed: 280, nationalRatio: 5.8 },
      emergency: { needed: 720, nationalRatio: 15.2 },
      nephrology: { needed: 57, nationalRatio: 1.2 },
      psychiatry: { needed: 620, nationalRatio: 13.1 },
      mentalHealth: { needed: 850, nationalRatio: 18.0 }, // Licensed counselors
      geriatrics: { needed: 99, nationalRatio: 2.1 },
      primaryCare: { needed: 3548, nationalRatio: 75.0 }
    },
    socialMediaRegions: ["houston", "harris county", "htown", "htx"]
  },

  // Maricopa County, Arizona
  "04013": {
    name: "Maricopa County", 
    state: "AZ",
    population: 4485414,
    fips: "04013",
    weatherStation: "KPHX",
    nwsOffice: "PSR", // Phoenix
    gridOperator: "APS", // Arizona Public Service
    gridZone: "PHOENIX",
    healthcareRegion: "Maricopa Integrated Health System",
    vulnerabilityFactors: {
      seniorPopulation: 0.168, // 16.8% - higher retirement population
      housingWithoutAC: 0.02, // Lower due to necessity in desert
      povertyRate: 0.134,
      chronicConditions: 0.52, // Higher due to heat exposure
      urbanHeatIsland: 12.1 // Extreme heat island effect
    },
    providerBaselines: {
      cardiology: { needed: 260, nationalRatio: 5.8 },
      emergency: { needed: 682, nationalRatio: 15.2 },
      nephrology: { needed: 54, nationalRatio: 1.2 },
      psychiatry: { needed: 588, nationalRatio: 13.1 },
      mentalHealth: { needed: 807, nationalRatio: 18.0 },
      geriatrics: { needed: 94, nationalRatio: 2.1 },
      primaryCare: { needed: 3364, nationalRatio: 75.0 }
    },
    socialMediaRegions: ["phoenix", "maricopa county", "phx", "scottsdale", "tempe", "mesa"]
  },

  // Miami-Dade County, Florida
  "12086": {
    name: "Miami-Dade County",
    state: "FL", 
    population: 2716940,
    fips: "12086",
    weatherStation: "KMIA",
    nwsOffice: "MFL", // Miami
    gridOperator: "FPL", // Florida Power & Light
    gridZone: "SOUTHEAST",
    healthcareRegion: "Jackson Health System",
    vulnerabilityFactors: {
      seniorPopulation: 0.179, // 17.9% - high retirement population
      housingWithoutAC: 0.05, // Low due to climate necessity
      povertyRate: 0.145,
      chronicConditions: 0.48,
      urbanHeatIsland: 6.8, // Moderated by ocean proximity
      hurricaneRisk: 0.85 // Additional climate factor
    },
    providerBaselines: {
      cardiology: { needed: 157, nationalRatio: 5.8 },
      emergency: { needed: 413, nationalRatio: 15.2 },
      nephrology: { needed: 33, nationalRatio: 1.2 },
      psychiatry: { needed: 356, nationalRatio: 13.1 },
      mentalHealth: { needed: 489, nationalRatio: 18.0 },
      geriatrics: { needed: 57, nationalRatio: 2.1 },
      primaryCare: { needed: 2038, nationalRatio: 75.0 }
    },
    socialMediaRegions: ["miami", "miami-dade", "dade county", "305", "786", "south beach"]
  },

  // Clark County, Nevada (Las Vegas)
  "32003": {
    name: "Clark County",
    state: "NV",
    population: 2265461,
    fips: "32003",
    weatherStation: "KLAS",
    nwsOffice: "VEF", // Las Vegas
    gridOperator: "NVE", // NV Energy
    gridZone: "NEVADA",
    healthcareRegion: "Southern Nevada Health District",
    vulnerabilityFactors: {
      seniorPopulation: 0.162, // 16.2% - retirement population
      housingWithoutAC: 0.03, // Very low due to desert necessity
      povertyRate: 0.118,
      chronicConditions: 0.49,
      urbanHeatIsland: 15.3 // Extreme heat island in desert
    },
    providerBaselines: {
      cardiology: { needed: 131, nationalRatio: 5.8 },
      emergency: { needed: 344, nationalRatio: 15.2 },
      nephrology: { needed: 27, nationalRatio: 1.2 },
      psychiatry: { needed: 297, nationalRatio: 13.1 },
      mentalHealth: { needed: 408, nationalRatio: 18.0 },
      geriatrics: { needed: 48, nationalRatio: 2.1 },
      primaryCare: { needed: 1699, nationalRatio: 75.0 }
    },
    socialMediaRegions: ["las vegas", "clark county", "vegas", "henderson", "summerlin"]
  }
};

module.exports = countyProfiles;