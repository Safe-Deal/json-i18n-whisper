/* eslint-disable no-console */
const fs = require("fs");
const { Translate } = require("@google-cloud/translate").v2;

const costPerMillionCharsUsd = 20; // Update this value if the price has changed
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

const countCharacters = (obj) => {
  let count = 0;
  const traverse = (item) => {
    if (typeof item === "string") {
      count += item.length;
    } else if (Array.isArray(item)) {
      item.forEach(traverse);
    } else if (typeof item === "object" && item !== null) {
      Object.values(item).forEach(traverse);
    }
  };
  traverse(obj);
  return count;
};

const translateJson = async (inputLang, targetLangs, apiKey, isCLI = false) => {
  try {
    const translate = new Translate({ key: apiKey });

    const inputPath = `${inputLang}.json`;
    const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
    const targetLangsArray = targetLangs.split(",");
    const langsAmounts = targetLangsArray.length;
    const textLength = countCharacters(data);
    const totalCharacters = textLength * targetLangsArray.length;
    const estimatedCost = ((totalCharacters / 1_000_000) * costPerMillionCharsUsd).toFixed(10);

    console.log(`\n🔄 Starting translation process...`);
    console.log(`\n¤ Total characters to be translated: ${textLength}`);
    console.log(`¤ Number of target languages: ${targetLangsArray.length} (${targetLangsArray.join(", ")})`);
    console.log(`¤ Total characters (including all target languages): ${totalCharacters}`);
    console.log(`¤ Cost per million characters: $${costPerMillionCharsUsd.toFixed(2)}`);
    console.log(`¤ Estimated cost: $${estimatedCost}`);

    if (isCLI) {
      console.log("\n┌──────────────────────────────────────────────────┐");
      console.log("│ Press Enter to continue, Esc or Ctrl+C to cancel │");
      console.log("└──────────────────────────────────────────────────┘");

      await new Promise((resolve) => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once("data", (key) => {
          const byteArray = [...key];
          if (byteArray[0] === 3 || byteArray[0] === 27) {
            // 3 for Ctrl+C, 27 for Esc
            console.log("\n❌ Translation cancelled.");
            process.exit(0);
          } else if (byteArray[0] === 13) {
            // 13 for Enter
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve();
          }
        });
      });

      console.log("\n✅ Continuing with translation...");
    }

    const translations = await translateObject(data, inputLang, targetLangsArray, translate);

    for (const [lang, translatedData] of Object.entries(translations)) {
      const outputPath = `${lang}.json`;
      fs.writeFileSync(outputPath, JSON.stringify(translatedData, null, 2));
      console.log(`✅ Written to ${outputPath}`);
    }

    console.log("\nTranslation completed successfully.");
  } catch (error) {
    console.error("❌ Error during translation:", error);
    throw error;
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
