/**
 * Routes — /api/symptoms
 * Core symptom analysis endpoint powered by IBM Granite
 */

const express = require("express");
const router = express.Router();
const { generateWithGranite } = require("../granite.service");
const { buildSymptomPrompt, buildDetectLanguagePrompt } = require("../prompt.builder");

// ─── Demo-mode mock response ──────────────────────────────────────────────────
function buildDemoResponse(symptoms) {
  const s = symptoms.toLowerCase();

  // Pick a plausible urgency based on keywords
  let urgencyLevel = "Low";
  let urgencyReason = "Symptoms appear mild and self-limiting.";
  if (/chest pain|difficulty breath|shortness|heart/.test(s)) {
    urgencyLevel = "Emergency";
    urgencyReason = "Chest pain or breathing difficulty may indicate a serious cardiac or respiratory event. Seek emergency care immediately.";
  } else if (/high fever|severe|cannot breathe|vomit blood/.test(s)) {
    urgencyLevel = "Urgent";
    urgencyReason = "Symptoms suggest a condition that should be evaluated by a doctor within 24 hours.";
  } else if (/fever|headache|body ache|sore throat|cough/.test(s)) {
    urgencyLevel = "Moderate";
    urgencyReason = "Common viral/bacterial illness symptoms. Monitor closely; see a doctor if symptoms worsen or persist beyond 5 days.";
  }

  return {
    possibleConditions: [
      {
        name: "Viral Upper Respiratory Infection (Common Cold / Flu)",
        description: "A contagious viral infection affecting the nose, throat, and sinuses. Very common and usually resolves within 7–10 days.",
        matchScore: "High",
      },
      {
        name: "Bacterial Pharyngitis (Strep Throat)",
        description: "A bacterial throat infection caused by Streptococcus. May require antibiotic treatment if confirmed by a rapid strep test.",
        matchScore: "Medium",
      },
      {
        name: "Seasonal Allergic Rhinitis",
        description: "An immune response to airborne allergens causing runny nose, sneezing, and fatigue. Not contagious.",
        matchScore: "Low",
      },
    ],
    urgencyLevel,
    urgencyReason,
    homeRemedies: [
      "Rest and get adequate sleep (7–9 hours per night).",
      "Stay well-hydrated — drink water, herbal teas, and clear broths.",
      "Gargle with warm salt water (½ tsp salt in 8 oz warm water) for throat relief.",
      "Use a cool-mist humidifier to ease congestion.",
      "Honey and ginger tea may help soothe a sore throat.",
    ],
    whenToSeeDoctor: [
      "Fever above 39.4°C (103°F) lasting more than 3 days.",
      "Difficulty breathing or shortness of breath.",
      "Severe or persistent chest pain.",
      "Symptoms that worsen significantly after initial improvement.",
      "Signs of dehydration: dry mouth, no urination, dizziness.",
    ],
    preventiveTips: [
      "Wash hands frequently with soap and water for at least 20 seconds.",
      "Avoid close contact with people who are sick.",
      "Keep up-to-date with recommended vaccinations (flu, COVID-19, etc.).",
      "Maintain a balanced diet rich in vitamins C and D.",
      "Exercise regularly and manage stress to support immune function.",
    ],
    disclaimer:
      "⚠️ DEMO MODE — This is a sample response. Real analysis requires IBM Granite credentials in .env. This information is for educational purposes only and is NOT a substitute for professional medical advice.",
    sources: ["WHO Guidelines", "CDC Health Information", "MedlinePlus", "NHS Inform"],
  };
}

// ─── POST /api/symptoms/analyze ──────────────────────────────────────────────
router.post("/analyze", async (req, res) => {
  try {
    const { symptoms, language, age, gender } = req.body;

    if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length < 3) {
      return res.status(400).json({
        error: "Please provide a valid symptom description (at least 3 characters).",
      });
    }

    // ── DEMO MODE: return mock data immediately ──
    if (process.env._DEMO_MODE === "true") {
      // Small artificial delay to simulate API latency
      await new Promise((r) => setTimeout(r, 900));
      return res.json({
        success: true,
        language: language || "English",
        symptoms: symptoms.trim(),
        analysis: buildDemoResponse(symptoms.trim()),
        timestamp: new Date().toISOString(),
        poweredBy: "DEMO MODE — Add IBM Granite credentials to go live",
      });
    }

    // ── LIVE MODE: call IBM Granite ──

    // Step 1: Auto-detect language if not provided
    let targetLanguage = language || "English";
    if (!language) {
      try {
        const detectedRaw = await generateWithGranite(
          buildDetectLanguagePrompt(symptoms)
        );
        const detected = detectedRaw.trim().split("\n")[0];
        if (detected && detected.length < 50) {
          targetLanguage = detected;
        }
      } catch (_) {
        targetLanguage = "English";
      }
    }

    // Step 2: Build symptom analysis prompt
    const prompt = buildSymptomPrompt(
      symptoms.trim(),
      targetLanguage,
      age || "",
      gender || ""
    );

    // Step 3: Generate response via IBM Granite
    const rawResponse = await generateWithGranite(prompt);

    // Step 4: Parse JSON from model output
    let analysisResult;
    try {
      // Extract the first JSON object from the response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in model output");
      analysisResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Fallback: return raw text wrapped in a safe structure
      analysisResult = {
        possibleConditions: [],
        urgencyLevel: "Unknown",
        urgencyReason: "Could not parse structured response.",
        homeRemedies: [],
        whenToSeeDoctor: ["Please consult a licensed physician for accurate information."],
        preventiveTips: [],
        rawResponse: rawResponse,
        disclaimer:
          "This information is for educational purposes only. Always consult a licensed doctor.",
        sources: ["WHO Guidelines", "CDC Health Information"],
      };
    }

    return res.json({
      success: true,
      language: targetLanguage,
      symptoms: symptoms.trim(),
      analysis: analysisResult,
      timestamp: new Date().toISOString(),
      poweredBy: "IBM Granite via watsonx.ai",
    });
  } catch (err) {
    console.error("[symptoms/analyze] Error:", err.message);

    // Surface IBM API errors meaningfully
    if (err.response?.status === 401) {
      return res.status(500).json({ error: "IBM API authentication failed. Check your API key." });
    }
    if (err.response?.status === 429) {
      return res.status(429).json({ error: "IBM API rate limit reached. Please try again shortly." });
    }

    return res.status(500).json({
      error: "An error occurred while analyzing symptoms. Please try again.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ─── GET /api/symptoms/health ─────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Agentic AI Health Symptom Checker",
    model: process.env.GRANITE_MODEL_ID || "ibm/granite-13b-instruct-v2",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
