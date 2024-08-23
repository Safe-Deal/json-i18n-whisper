#!/usr/bin/env node
import translateJson from "./translate-json.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length > 3) {
    console.error("Usage: translate-json <inputLang> <targetLangs> [apiKey]");
    process.exit(1);
  }

  const [inputLang, targetLangs, cliApiKey] = args;
  const apiKey = cliApiKey || process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: API key not provided. Please provide it as a command-line argument or set the GOOGLE_TRANSLATE_API_KEY environment variable.");
    process.exit(1);
  }

  translateJson(inputLang, targetLangs, apiKey);
}

export default translateJson;
