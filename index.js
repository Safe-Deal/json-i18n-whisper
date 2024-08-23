#!/usr/bin/env node
const translateJson = require("./translate-json");

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: translate-json <inputLang> <targetLangs> [apiKey]");
    process.exit(1);
  }

  const [inputLang, targetLangs, cliApiKey] = args;
  const apiKey = cliApiKey || process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: GOOGLE_TRANSLATE_API_KEY is not provided. Set it as an environment variable or pass it as the last argument.");
    process.exit(1);
  }

  translateJson(inputLang, targetLangs, apiKey);
}

module.exports = translateJson;
