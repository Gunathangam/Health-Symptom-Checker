/**
 * Prompt Builder — constructs structured prompts for IBM Granite
 * so it returns structured, safe, educational health information.
 */

/**
 * Build the symptom-analysis prompt.
 * @param {string} symptoms     Natural-language symptom description
 * @param {string} language     Target response language (e.g. "English", "Spanish")
 * @param {string} [age]        Optional age context
 * @param {string} [gender]     Optional gender context
 * @returns {string}
 */
function buildSymptomPrompt(symptoms, language = "English", age = "", gender = "") {
  const patientContext =
    age || gender
      ? `Patient context: ${[age && `Age: ${age}`, gender && `Gender: ${gender}`]
          .filter(Boolean)
          .join(", ")}.`
      : "";

  return `You are a certified AI health information assistant. Your role is to provide educational health information only — NOT a diagnosis. Always recommend consulting a licensed doctor.

${patientContext}

The user reports the following symptoms: "${symptoms}"

Respond ONLY in ${language}. Provide your response in the following exact JSON structure (no markdown fences, pure JSON):

{
  "possibleConditions": [
    {
      "name": "<condition name>",
      "description": "<brief 1-2 sentence description>",
      "matchScore": "<High / Medium / Low>"
    }
  ],
  "urgencyLevel": "<Emergency | Urgent | Moderate | Low>",
  "urgencyReason": "<1 sentence explaining urgency level>",
  "homeRemedies": [
    "<remedy 1>",
    "<remedy 2>",
    "<remedy 3>"
  ],
  "whenToSeeDoctor": [
    "<warning sign 1>",
    "<warning sign 2>",
    "<warning sign 3>"
  ],
  "preventiveTips": [
    "<tip 1>",
    "<tip 2>",
    "<tip 3>"
  ],
  "disclaimer": "This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.",
  "sources": ["WHO Guidelines", "CDC Health Information", "MedlinePlus"]
}`;
}

/**
 * Build the language-translation prompt when the user writes in a non-English language.
 * @param {string} text  Text to detect/translate
 * @returns {string}
 */
function buildDetectLanguagePrompt(text) {
  return `Detect the language of the following text and return ONLY the language name in English (e.g. "Spanish", "French", "Hindi"). Text: "${text}"`;
}

module.exports = { buildSymptomPrompt, buildDetectLanguagePrompt };
