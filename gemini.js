const fetch = require('node-fetch');

async function getGeminiResponse(prompt) {
  const apiKey = process.env.GEMINI_API_KEY; // Get API key from environment variable

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable not set.");
    return null;
  }

  const apiUrl = 'https://api.gemini.google.com/v1/text';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      temperature: 0.7, // Adjust as needed. Lower values make responses more deterministic.
      max_decode_steps: 100, // Adjust as needed to control response length.
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Gemini API request failed with status ${response.status}:`, errorData);
    return null;
  }

  const data = await response.json();
  return data.text;
}

async function main() {
  const prompt = "What triggered World War I?";
  console.log("Prompt:", prompt);

  const response = await getGeminiResponse(prompt);

  if (response) {
    console.log("\nGemini Response:");
    console.log(response);
  }
}


main();