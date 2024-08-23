#!/usr/bin/env node
const translateJson = require("./translate-json");

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: translate-json <inputLang> <targetLangs>");
    process.exit(1);
  }

  const [inputLang, targetLangs] = args;
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: GOOGLE_TRANSLATE_API_KEY environment variable is not set");
    process.exit(1);
  }

  translateJson(inputLang, targetLangs, apiKey);
}

module.exports = translateJson;
