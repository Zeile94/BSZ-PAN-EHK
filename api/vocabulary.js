import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DATASET_ID = "bsz-pan-ehk-english";
let validatedCatalog = null;

export const config = {
  maxDuration: 15
};

function loadCatalog() {
  if (validatedCatalog) return validatedCatalog;
  // Static literal: the JSON file must be included in the function bundle.
  const data = require("../data/vocabulary.json");
  if (!data || data.schemaVersion !== 1 || data.datasetId !== DATASET_ID ||
      typeof data.version !== "string" || !data.version.trim() ||
      typeof data.sourceDocument !== "string" || !data.sourceDocument.trim() ||
      !Array.isArray(data.sections) || data.sections.length === 0) {
    throw new Error("Ungültige Metadaten der Vokabeldatei.");
  }
  const sectionIds = new Set();
  const cardIds = new Set();
  for (const section of data.sections) {
    if (!section || typeof section.id !== "string" ||
        !/^[a-z0-9][a-z0-9-]*$/.test(section.id) || sectionIds.has(section.id) ||
        typeof section.title !== "string" || !section.title.trim() ||
        !Array.isArray(section.cards) || section.cards.length === 0) {
      throw new Error("Ungültiger oder doppelter Themenbereich.");
    }
    sectionIds.add(section.id);
    for (const card of section.cards) {
      if (!card || typeof card.id !== "string" || !card.id.trim() || cardIds.has(card.id) ||
          typeof card.en !== "string" || !card.en.trim() ||
          typeof card.de !== "string" || !card.de.trim()) {
        throw new Error(`Ungültiges Wortpaar oder doppelte Karten-ID in ${section.id}.`);
      }
      cardIds.add(card.id);
    }
  }
  validatedCatalog = data;
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Nur GET ist erlaubt." });
  }

  const url = new URL(req.url || "/api/vocabulary", "http://localhost");
  if ([...url.searchParams.keys()].some(key => key !== "section")) {
    return res.status(400).json({
      error: "Erlaubt ist nur die Auswahl eines Themenbereichs. Eine Anzahl oder ein Freitext-Thema wird nicht unterstützt."
    });
  }
  const selections = url.searchParams.getAll("section");
  if (selections.length > 1 || (selections.length === 1 &&
      (!selections[0] || selections[0].length > 128 || !/^[a-z0-9][a-z0-9-]*$/.test(selections[0])))) {
    return res.status(400).json({ error: "Bitte genau einen gültigen Themenbereich auswählen." });
  }

  try {
    const data = loadCatalog();
    const metadata = {
      datasetId: data.datasetId,
      version: data.version,
      sourceDocument: data.sourceDocument
    };
    if (selections.length === 0) {
      return res.status(200).json({
        ...metadata,
        sections: data.sections.map(section => ({
          id: section.id,
          title: section.title,
          count: section.cards.length
        }))
      });
    }
    const section = data.sections.find(item => item.id === selections[0]);
    if (!section) {
      return res.status(404).json({ error: "Dieser Themenbereich ist nicht vorhanden." });
    }
    return res.status(200).json({
      ...metadata,
      sectionId: section.id,
      topic: section.title,
      count: section.cards.length,
      cards: section.cards.map(card => ({ id: card.id, en: card.en, de: card.de })),
      materialContext: {
        basis: "fixed-vocabulary-document",
        materialUsed: true,
        materialFiles: [{ file: data.sourceDocument }],
        materialState: "available",
        materialUnavailable: false,
        webSearchUsed: false,
        webSearchPerformed: false,
        currentCheckRequired: false,
        message: `${data.sourceDocument} – ${section.title} (Version ${data.version})`
      },
      sources: []
    });
  } catch (error) {
    console.error("Vokabeldatei konnte nicht geladen werden:", error);
    return res.status(500).json({
      error: "Die hinterlegte Wortliste ist nicht verfügbar oder fehlerhaft. Bitte die Lehrkraft informieren."
    });
  }
}
