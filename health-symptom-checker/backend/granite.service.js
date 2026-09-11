/**
 * IBM Granite watsonx.ai Service
 * Handles authentication and text generation via IBM watsonx.ai REST API
 */

const axios = require("axios");

// In-memory token cache
let _iamToken = null;
let _tokenExpiry = 0;

/**
 * Obtain (or return cached) IAM Bearer token for IBM Cloud.
 * Tokens are valid for ~1 hour; we refresh 5 minutes early.
 */
async function getIAMToken() {
  const now = Date.now();
  if (_iamToken && now < _tokenExpiry) return _iamToken;

  const response = await axios.post(
    "https://iam.cloud.ibm.com/identity/token",
    new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: process.env.IBM_API_KEY,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  _iamToken = response.data.access_token;
  // expires_in is in seconds; refresh 5 min before expiry
  _tokenExpiry = now + (response.data.expires_in - 300) * 1000;
  return _iamToken;
}

/**
 * Call IBM Granite via watsonx.ai text generation API.
 * @param {string} prompt  The full prompt string
 * @returns {string}       The generated text
 */
async function generateWithGranite(prompt) {
  const token = await getIAMToken();

  const modelId = process.env.GRANITE_MODEL_ID || "ibm/granite-13b-instruct-v2";
  const projectId = process.env.WATSONX_PROJECT_ID;
  const baseUrl = process.env.WATSONX_URL || "https://us-south.ml.cloud.ibm.com";

  const url = `${baseUrl}/ml/v1/text/generation?version=2023-05-29`;

  const payload = {
    model_id: modelId,
    project_id: projectId,
    input: prompt,
    parameters: {
      decoding_method: "greedy",
      max_new_tokens: 800,
      min_new_tokens: 50,
      stop_sequences: ["<|endoftext|>"],
      repetition_penalty: 1.1,
      temperature: 0.3,
    },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const result = response.data?.results?.[0]?.generated_text || "";
  return result.trim();
}

module.exports = { generateWithGranite };
