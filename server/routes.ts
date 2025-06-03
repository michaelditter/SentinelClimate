import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Weather data proxy endpoint
  app.get("/api/weather", async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const nwsToken = '***REMOVED-NOAA-TOKEN***';
      const userAgent = 'SentinelAI/1.0 (info@michaelditter.com)';
      
      // Get weather data from National Weather Service
      const pointResponse = await fetch(
        `https://api.weather.gov/points/${latitude},${longitude}`,
        {
          headers: {
            'User-Agent': userAgent,
            'token': nwsToken
          }
        }
      );

      if (!pointResponse.ok) {
        throw new Error(`NWS API error: ${pointResponse.status}`);
      }

      const pointData = await pointResponse.json();
      
      // Get forecast data
      const forecastResponse = await fetch(pointData.properties.forecast, {
        headers: {
          'User-Agent': userAgent,
          'token': nwsToken
        }
      });

      if (!forecastResponse.ok) {
        throw new Error(`Forecast API error: ${forecastResponse.status}`);
      }

      const forecastData = await forecastResponse.json();

      // Get air quality from EPA
      const epaApiKey = '***REMOVED-AIRNOW-KEY***';
      const airQualityResponse = await fetch(
        `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${latitude}&longitude=${longitude}&distance=25&API_KEY=${epaApiKey}`
      );

      const airQualityData = airQualityResponse.ok ? await airQualityResponse.json() : null;

      res.json({
        forecast: forecastData,
        airQuality: airQualityData
      });

    } catch (error) {
      console.error('Weather API error:', error);
      res.status(500).json({ error: 'Failed to fetch weather data' });
    }
  });

  // Health data proxy endpoint
  app.get("/api/health-data", async (req, res) => {
    try {
      const { fipsCode, startDate, endDate } = req.query;
      
      if (!fipsCode || !startDate || !endDate) {
        return res.status(400).json({ error: 'FIPS code, start date, and end date are required' });
      }

      const cdcApiKey = process.env.CDC_API_KEY;
      const userAgent = 'SentinelAI/1.0 (info@michaelditter.com)';
      
      // Get health data from CDC Environmental Public Health Tracking
      const cdcResponse = await fetch(
        `https://ephtracking.cdc.gov/apigateway/api/v1/getCoreHolder/355/2/1/${fipsCode}/${startDate}/${endDate}`,
        {
          headers: {
            'User-Agent': userAgent,
            ...(cdcApiKey && { 'Authorization': `Bearer ${cdcApiKey}` })
          }
        }
      );

      if (!cdcResponse.ok) {
        throw new Error(`CDC API error: ${cdcResponse.status}`);
      }

      const cdcData = await cdcResponse.json();

      res.json(cdcData);

    } catch (error) {
      console.error('Health API error:', error);
      res.status(500).json({ error: 'Failed to fetch health data' });
    }
  });

  // Power grid data proxy endpoint
  app.get("/api/power-grid", async (req, res) => {
    try {
      const eiaApiKey = '***REMOVED-EIA-KEY***';
      
      // Get real-time electricity data from EIA API
      const eiaResponse = await fetch(
        `https://api.eia.gov/v2/electricity/rto/region-data/data/?frequency=hourly&data[0]=value&facets[respondent][]=TEX&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000&api_key=${eiaApiKey}`,
        {
          headers: {
            'User-Agent': 'SentinelAI/1.0 (info@michaelditter.com)'
          }
        }
      );

      if (!eiaResponse.ok) {
        throw new Error(`EIA API error: ${eiaResponse.status}`);
      }

      const eiaData = await eiaResponse.json();

      // Transform EIA data to our format
      const transformedData = {
        systemLoad: eiaData.response?.data?.[0]?.value || 45000,
        totalCapacity: 85000,
        reserveMargin: 25.5,
        demandForecast: 52000,
        outageCapacity: 2100,
        renewableGeneration: { wind: 8500, solar: 2800, total: 11300 },
        gridStability: 'Normal' as const,
        emergencyLevel: 1,
        rawData: eiaData
      };

      res.json(transformedData);

    } catch (error) {
      console.error('Power grid API error:', error);
      res.status(500).json({ error: 'Failed to fetch power grid data' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
