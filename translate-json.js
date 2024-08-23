/* eslint-disable no-console */
const fs = require("fs");
const { Translate } = require("@google-cloud/translate").v2;

const costPerMillionCharsUsd = 20;
const batchSize = 100;

const translateInBatches = async (textToTranslate, sourceLang, targetLang, translate) => {
  const translations = [];
  for (let i = 0; i < textToTranslate.length; i += batchSize) {
    const batch = textToTranslate.slice(i, i + batchSize);
    console.log(`📤 Sending batch to the API ${sourceLang} -> ${targetLang} ...`);
    const [batchTranslations] = await translate.translate(batch, {
      from: sourceLang,
      to: targetLang,
    });
    translations.push(...batchTranslations);
  }
  return translations;
};

const translateRecursive = async (obj, sourceLang, targetLang, translate) => {
  const textToTranslate = [];
  const placeholders = [];

  const collectText = (obj, path = []) => {
    if (typeof obj === "string") {
      textToTranslate.push(obj);
      placeholders.push(path);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => collectText(item, path.concat(index)));
    } else if (typeof obj === "object" && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => collectText(value, path.concat(key)));
    }
  };

  collectText(obj);

  let translations = await translateInBatches(textToTranslate, sourceLang, targetLang, translate);

  // Remove diacritics for specific languages
  if (["he", "iw", "ar", "fa", "ur"].includes(targetLang)) {
    translations = translations.map(removeDiacritics);
  }

  const applyTranslations = (obj, path = []) => {
    if (typeof obj === "string") {
      const index = placeholders.findIndex((p) => JSON.stringify(p) === JSON.stringify(path));
      return translations[index];
    }
    if (Array.isArray(obj)) {
      return obj.map((item, index) => applyTranslations(item, path.concat(index)));
    }
    if (typeof obj === "object" && obj !== null) {
      const translatedObj = {};
      Object.entries(obj).forEach(([key, value]) => {
        translatedObj[key] = applyTranslations(value, path.concat(key));
      });
      return translatedObj;
    }
    return obj;
  };

  return applyTranslations(obj);
};

const translateObject = async (obj, sourceLang, targetLangs, translate) => {
  const translations = {};

  for (const lang of targetLangs) {
    console.log(`🌐 Translating to ${lang} from ${sourceLang} ...`);
    translations[lang] = await translateRecursive(obj, sourceLang, lang, translate);
    console.log(`📥 Received translation for ${lang} from ${sourceLang} ...`);
  }

  return translations;
};

const translateJson = async (inputLang, targetLangs, apiKey) => {
  try {
    const translate = new Translate({ key: apiKey });

    const inputPath = `${inputLang}.json`;
    const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
    const langsAmounts = targetLangs.split(",").length;
    const textLength = JSON.stringify(data).length;
    const estimatedCost = ((textLength / 1_000_000) * costPerMillionCharsUsd * langsAmounts).toFixed(2);

    console.log(`\n🔄 Starting translation process...`);
    console.log(`\n¤ Estimated cost: $${estimatedCost} for ${langsAmounts} languages`);

    const translations = await translateObject(data, inputLang, targetLangs.split(","), translate);

    for (const [lang, translatedData] of Object.entries(translations)) {
      const outputPath = `${lang}.json`;
      fs.writeFileSync(outputPath, JSON.stringify(translatedData, null, 2));
      console.log(`✅ Written to ${outputPath}`);
    }

    console.log("\nTranslation completed successfully.");
  } catch (error) {
    console.error("❌ Error during translation:", error);
  }
};

module.exports = translateJson;

function removeDiacritics(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0591-\u05C7]/g, "") // Hebrew
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "") // Arabic
    .replace(/[\u0610-\u061A\u0656-\u065F\u0670\u06D6-\u06ED]/g, "") // Persian (Farsi)
    .replace(/[\u0610-\u061A\u0656-\u065F\u0670\u06D6-\u06ED]/g, "") // Urdu
    .normalize("NFC");
}
