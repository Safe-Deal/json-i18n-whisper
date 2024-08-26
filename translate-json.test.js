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

    await translateJson("en", "fr", "fake-api-key");

    expect(mockTranslate.translate).toHaveBeenCalledWith(["Hello", "World"], expect.any(Object));
    expect(fs.writeFileSync).toHaveBeenCalledWith("fr.json", expect.any(String));
  });

  test("handles nested JSON structures", async () => {
    const mockTranslate = {
      translate: jest.fn().mockResolvedValue([["Bonjour", "Le monde", "Imbriqué"]]),
    };
    Translate.mockImplementation(() => mockTranslate);
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        greeting: "Hello",
        messages: { welcome: "World", nested: "Nested" },
      })
    );

    await translateJson("en", "fr", "fake-api-key");

    expect(mockTranslate.translate).toHaveBeenCalledWith(["Hello", "World", "Nested"], expect.any(Object));
    expect(fs.writeFileSync).toHaveBeenCalledWith("fr.json", expect.any(String));
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

    await translateJson("en", "es,fr", "fake-api-key");

    expect(mockTranslate.translate).toHaveBeenCalledTimes(2);
    expect(fs.writeFileSync).toHaveBeenCalledWith("es.json", expect.any(String));
    expect(fs.writeFileSync).toHaveBeenCalledWith("fr.json", expect.any(String));
  });

  test("removes diacritics for specific languages", async () => {
    const mockTranslate = {
      translate: jest.fn().mockResolvedValue([["مَرحَبًا", "العَالَم"]]),
    };
    Translate.mockImplementation(() => mockTranslate);
    fs.readFileSync.mockReturnValue(JSON.stringify({ hello: "Hello", world: "World" }));

    await translateJson("en", "ar", "fake-api-key");

    expect(fs.writeFileSync).toHaveBeenCalledWith("ar.json", expect.stringContaining("مرحبا"));
    expect(fs.writeFileSync).toHaveBeenCalledWith("ar.json", expect.stringContaining("العالم"));
  });

  test("handles translation errors", async () => {
    const mockTranslate = {
      translate: jest.fn().mockRejectedValue(new Error("Translation API error")),
    };
    Translate.mockImplementation(() => mockTranslate);
    fs.readFileSync.mockReturnValue(JSON.stringify({ hello: "Hello", world: "World" }));

    await expect(translateJson("en", "fr", "fake-api-key")).rejects.toThrow("Translation API error");
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
