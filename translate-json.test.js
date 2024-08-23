const translateJson = require("./translate-json");
const { Translate } = require("@google-cloud/translate").v2;
const fs = require("fs");

jest.mock("@google-cloud/translate");
jest.mock("fs");

describe("translateJson", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("translates JSON file correctly", async () => {
    const mockTranslate = {
      translate: jest.fn().mockResolvedValue([["Bonjour", "Le monde"]]),
    };

    Translate.mockImplementation(() => mockTranslate);

    fs.readFileSync.mockReturnValue(JSON.stringify({ hello: "Hello", world: "World" }));
    fs.writeFileSync.mockImplementation(() => {});

    await translateJson("en", "fr", "fake-api-key");

    expect(mockTranslate.translate).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith("fr.json", JSON.stringify({ hello: "Bonjour", world: "Le monde" }, null, 2));
  });

  test("handles nested JSON structures", async () => {
    const mockTranslate = {
      translate: jest.fn().mockResolvedValue([["Bonjour", "Le monde", "Imbriqué"]]),
    };

    Translate.mockImplementation(() => mockTranslate);

    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        greeting: "Hello",
        messages: {
          welcome: "World",
          nested: "Nested",
        },
      })
    );
    fs.writeFileSync.mockImplementation(() => {});

    await translateJson("en", "fr", "fake-api-key");

    expect(mockTranslate.translate).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "fr.json",
      JSON.stringify(
        {
          greeting: "Bonjour",
          messages: {
            welcome: "Le monde",
            nested: "Imbriqué",
          },
        },
        null,
        2
      )
    );
  });

  test("translates to multiple languages", async () => {
    const mockTranslate = {
      translate: jest
        .fn()
        .mockResolvedValueOnce([["Hola", "Mundo"]])
        .mockResolvedValueOnce([["Bonjour", "Le monde"]]),
    };

    Translate.mockImplementation(() => mockTranslate);

    fs.readFileSync.mockReturnValue(JSON.stringify({ hello: "Hello", world: "World" }));
    fs.writeFileSync.mockImplementation(() => {});

    await translateJson("en", "es,fr", "fake-api-key");

    expect(mockTranslate.translate).toHaveBeenCalledTimes(2);
    expect(fs.writeFileSync).toHaveBeenCalledWith("es.json", JSON.stringify({ hello: "Hola", world: "Mundo" }, null, 2));
    expect(fs.writeFileSync).toHaveBeenCalledWith("fr.json", JSON.stringify({ hello: "Bonjour", world: "Le monde" }, null, 2));
  });

  test("removes diacritics for specific languages", async () => {
    const mockTranslate = {
      translate: jest.fn().mockResolvedValue([["مَرحَبًا", "العَالَم"]]),
    };

    Translate.mockImplementation(() => mockTranslate);

    fs.readFileSync.mockReturnValue(JSON.stringify({ hello: "Hello", world: "World" }));
    fs.writeFileSync.mockImplementation(() => {});

    await translateJson("en", "ar", "fake-api-key");

    expect(mockTranslate.translate).toHaveBeenCalledTimes(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith("ar.json", JSON.stringify({ hello: "مرحبا", world: "العالم" }, null, 2));
  });

  test("handles translation errors", async () => {
    const mockTranslate = {
      translate: jest.fn().mockRejectedValue(new Error("Translation API error")),
    };

    Translate.mockImplementation(() => mockTranslate);

    fs.readFileSync.mockReturnValue(JSON.stringify({ hello: "Hello", world: "World" }));
    fs.writeFileSync.mockImplementation(() => {});

    console.error = jest.fn();

    await translateJson("en", "fr", "fake-api-key");

    expect(console.error).toHaveBeenCalledWith("❌ Error during translation:", expect.any(Error));
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test("estimates cost correctly", async () => {
    const mockTranslate = {
      translate: jest.fn().mockResolvedValue([["Bonjour", "Le monde"]]),
    };

    Translate.mockImplementation(() => mockTranslate);

    fs.readFileSync.mockReturnValue(JSON.stringify({ hello: "Hello", world: "World" }));
    fs.writeFileSync.mockImplementation(() => {});

    console.log = jest.fn();

    await translateJson("en", "fr,es", "fake-api-key");

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Estimated cost: $"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("for 2 languages"));
  });
});
