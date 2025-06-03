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

  // Voice call endpoint for emergency alerts
  app.post("/api/emergency-call", async (req, res) => {
    try {
      const { phoneNumber, message, agentType, severity } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
      }

      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

      // Generate AI voice using ElevenLabs
      const voiceResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey
        },
        body: JSON.stringify({
          text: `Emergency alert from Sentinel AI ${agentType} agent: ${message}`,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!voiceResponse.ok) {
        throw new Error(`ElevenLabs API error: ${voiceResponse.status}`);
      }

      const audioBuffer = await voiceResponse.arrayBuffer();
      
      // Create Twilio client and make call
      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: twilioPhoneNumber,
          Twiml: `<Response><Say voice="alice">${message}</Say></Response>`
        })
      });

      if (!twilioResponse.ok) {
        throw new Error(`Twilio API error: ${twilioResponse.status}`);
      }

      const callData = await twilioResponse.json();

      res.json({
        success: true,
        callSid: callData.sid,
        message: 'Emergency call initiated successfully',
        agentType,
        severity
      });

    } catch (error) {
      console.error('Emergency call error:', error);
      res.status(500).json({ error: 'Failed to initiate emergency call' });
    }
  });

  // SMS alert endpoint
  app.post("/api/emergency-sms", async (req, res) => {
    try {
      const { phoneNumber, message, agentType } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
      }

      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: twilioPhoneNumber,
          Body: `[SENTINEL AI ${agentType.toUpperCase()}] ${message}`
        })
      });

      if (!twilioResponse.ok) {
        throw new Error(`Twilio SMS error: ${twilioResponse.status}`);
      }

      const smsData = await twilioResponse.json();

      res.json({
        success: true,
        messageSid: smsData.sid,
        message: 'Emergency SMS sent successfully',
        agentType
      });

    } catch (error) {
      console.error('Emergency SMS error:', error);
      res.status(500).json({ error: 'Failed to send emergency SMS' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
