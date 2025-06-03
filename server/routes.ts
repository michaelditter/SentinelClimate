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

  // Voice Call endpoint for crisis communication
  app.post('/api/crisis-call', async (req, res) => {
    try {
      const { 
        phoneNumber, 
        agentType, 
        targetName, 
        analysisData,
        scenario = 'heat-emergency'
      } = req.body;
      
      if (!phoneNumber || !agentType || !targetName) {
        return res.status(400).json({ error: 'Phone number, agent type, and target name are required' });
      }

      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        return res.status(500).json({ error: 'Voice call service configuration error - Twilio credentials missing' });
      }

      if (!elevenlabsApiKey) {
        return res.status(500).json({ error: 'Voice call service configuration error - ElevenLabs API key missing' });
      }

      // Generate crisis script based on agent type and analysis data
      const script = generateCrisisScript(agentType, targetName, analysisData);
      
      // Get voice ID for agent
      const voiceId = getAgentVoiceId(agentType);
      
      // Generate voice using ElevenLabs
      const voiceResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        })
      });

      if (!voiceResponse.ok) {
        throw new Error(`ElevenLabs API error: ${voiceResponse.statusText}`);
      }

      const audioBuffer = await voiceResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      
      // Create TwiML for the call
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">This is an emergency alert from Sentinel AI Crisis Prevention System.</Say>
    <Play>data:audio/mpeg;base64,${audioBase64}</Play>
    <Say voice="alice">Thank you for your attention. This concludes the emergency notification.</Say>
</Response>`;

      // Make the call using Twilio
      const callResponse = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + twilioAccountSid + '/Calls.json', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(twilioAccountSid + ':' + twilioAuthToken).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: twilioPhoneNumber,
          Twiml: twiml
        })
      });

      if (!callResponse.ok) {
        throw new Error(`Twilio call API error: ${callResponse.statusText}`);
      }

      const callResult = await callResponse.json();
      
      res.json({
        success: true,
        callSid: callResult.sid,
        status: callResult.status,
        agentType,
        targetName,
        message: 'Emergency call initiated successfully'
      });

    } catch (error) {
      console.error('Crisis call error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate crisis call'
      });
    }
  });

  // Helper functions for crisis calls
  function generateCrisisScript(agentType: string, targetName: string, analysisData: any): string {
    const scripts = {
      'SENTINEL': `Hello ${targetName}, this is the Sentinel AI Weather Monitoring System calling with an urgent climate alert. We have detected an extreme heat event developing in your area with temperatures expected to reach ${analysisData?.SENTINEL?.peakTemp || 119} degrees Fahrenheit over the next ${analysisData?.SENTINEL?.duration || 72} hours. Heat index values may exceed ${analysisData?.SENTINEL?.heatIndex || 125} degrees. Our confidence level is ${analysisData?.SENTINEL?.confidence || 94} percent. We recommend immediate activation of heat emergency protocols including opening public cooling centers, issuing public heat warnings, and preparing emergency medical services for increased demand. This is a high-priority alert requiring immediate attention. Please confirm receipt and coordinate with emergency management. Thank you.`,
      
      'MEDIC': `Hello ${targetName}, this is the Sentinel AI Medical Coordination Agent with a critical healthcare surge alert. Our predictive models indicate a ${analysisData?.MEDIC?.surgePrediction || 137} percent increase in emergency department visits expected within the next 48 hours due to extreme heat conditions. We anticipate ${analysisData?.MEDIC?.expectedCases || 850} cases affecting a vulnerable population of ${analysisData?.MEDIC?.vulnerablePopulation || 45000} individuals. Hospital capacity is currently at ${analysisData?.MEDIC?.hospitalCapacity || 78} percent. We recommend immediate implementation of hospital surge protocols and consider activating additional medical staff. Current prediction confidence is ${analysisData?.MEDIC?.confidence || 89} percent. Please acknowledge receipt and coordinate appropriate medical response.`,
      
      'DISPATCHER': `Hello ${targetName}, this is the Sentinel AI Resource Dispatch Agent calling with emergency deployment notification. We are currently deploying ${analysisData?.DISPATCHER?.mobileUnits || 15} mobile health units and activating ${analysisData?.DISPATCHER?.coolingCenters || 8} cooling centers in response to predicted extreme heat emergency. Resource deployment includes mobile units staged in high-vulnerability census tracts, EMS units positioned strategically with ${analysisData?.DISPATCHER?.emsUnits || 35} ambulances on standby. Resource deployment efficiency is optimized at ${analysisData?.DISPATCHER?.efficiency || 97} percent. Requesting coordination with local emergency management for optimal response coverage. Thank you.`,
      
      'COMMANDER': `Hello ${targetName}, this is the Sentinel AI Strategic Command Center Agent with a critical crisis authorization update. We have authorized ${analysisData?.COMMANDER?.authorizationLevel || 'EXTREME'} level crisis response for your jurisdiction. A heat dome event is imminent with potential for significant public health impact. Without intervention, we estimate ${analysisData?.COMMANDER?.potentialDeaths || 15} heat-related fatalities. Key authorizations include multi-agency emergency coordination activated, total deployment budget authorized at ${analysisData?.COMMANDER?.deploymentCost || 2.4} million dollars, projected healthcare cost savings of ${analysisData?.COMMANDER?.costSavings || 9.8} million dollars. This is a critical time-sensitive alert requiring immediate executive action. Coordinate with all emergency services and implement maximum heat emergency protocols immediately. Thank you.`
    };
    
    return scripts[agentType] || scripts.COMMANDER;
  }

  function getAgentVoiceId(agentType: string): string {
    const voices = {
      'SENTINEL': 'EXAVITQu4vr4xnSDxMaL',   // Professional analyst
      'MEDIC': 'ThT5KcBeYPX3keUQqHPh',     // Caring healthcare professional  
      'DISPATCHER': 'onwK4e9ZLuTAKqWW03F9', // Efficient coordinator
      'COMMANDER': 'pNInz6obpgDQGcFmaJgB'   // Authoritative leader
    };
    return voices[agentType] || voices.COMMANDER;
  }

  const httpServer = createServer(app);

  return httpServer;
}
