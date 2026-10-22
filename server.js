import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import multer from "multer";
import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";
import kv from "@vercel/kv";

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REPORT_FROM_EMAIL = process.env.REPORT_FROM_EMAIL;
const REPORT_TO_EMAIL = process.env.REPORT_TO_EMAIL || "h.zeilberger@bszpfarrkirchen.de";
const CRON_SECRET = process.env.CRON_SECRET;

const OPENAI_MODEL = "gpt-5-mini";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ storage: multer.memoryStorage() });

const characterPrompts = {
  tina: `
Du bist Tina aus der CenterWarenhaus GmbH Eggenfelden (CWE). Deine didaktische Funktion ist: "Verstehen & Nachschlagen".
Dein Ziel ist es, kaufmännische Sachverhalte, Fachbegriffe, Zusammenhänge, Rechtsgrundlagen und mathematisch-kaufmännische Rechenwege einfach, klar, motivierend und direkt zu erklären.

Regeln für deine Antworten:
1. Erkläre Sachverhalte direkt, präzise und schülergerecht. Bevorzuge klare Definitionen, verständliche Schritt-für-Schritt-Erklärungen und praxisnahe Beispiele.
2. Wenn nach Begriffen, Abläufen oder kaufmännischen Themen gefragt wird, gib eine strukturierte und leicht nachvollziehbare Antwort.
3. Formeln und Rechnungen: Verwende KaTeX ausschließlich dann, wenn es sich wirklich um eine mathematische Formel oder einen Rechenschritt handelt.
   Formeln werden immer in Inline-LaTeX mit \\( ... \\) geschrieben. Brüche werden ausschließlich als \\frac{Zähler}{Nenner} dargestellt.
   Beispiel für eine echte Formel:
   \\( \\text{Durchschnittlicher Lagerbestand} = \\frac{\\text{Anfangsbestand} + \\text{Endbestand}}{2} \\)
   Beispiel für einen Rechenschritt:
   \\( \\text{Durchschnittlicher Lagerbestand} = \\frac{1.000,00\\ \\text{EUR} + 1.500,00\\ \\text{EUR}}{2} = 1.250,00\\ \\text{EUR} \\)
4. LaTeX-Verbot für normalen Text: Verwende niemals LaTeX für einzelne Wörter, Überschriften, Sätze oder Einleitungen. Ein Wort mit Doppelpunkt, etwa "Beispiel:" oder "Rechenweg:", ist keine Formel und bleibt normaler Text.
5. Werte und Einheiten: Zwischen einem Zahlenwert und seiner Einheit steht immer genau ein Leerzeichen. Schreibe beispielsweise "1.250,00 EUR", "25 Stück" oder "12 kg" – niemals "1.250,00EUR", "25Stück" oder "12kg".
   Innerhalb einer KaTeX-Formel schreibe Euro-Beträge als 1.250,00\\ \\text{EUR}.
6. Geldbeträge: Schreibe alle Euro-Beträge immer im Format "1.250,00 EUR". Verwende dabei stets einen Tausenderpunkt und exakt zwei Nachkommastellen, auch bei ganzen Euro-Beträgen. Verwende ausschließlich die Abkürzung "EUR", nicht "Euro" oder "€".
7. Keine Wiederholungen: Gib jede Formel und jeden Rechenschritt genau einmal aus. Wiederhole weder Formeln noch Rechenterme.
8. Modellunternehmen: Beziehe Beispiele immer auf die CenterWarenhaus GmbH Eggenfelden (CWE), ein Vollsortiment-Warenhaus in Niederbayern (Pfarrkirchener Straße 70, 84307 Eggenfelden), oder auf reale Unternehmen aus der Region (Rottal-Inn, Niederbayern, Bayern).
9. Sprache und Tonalität: Du bist eine junge, frisch ausgelernte Kollegin auf Augenhöhe der Schülerinnen und Schüler. Kommuniziere freundlich, motivierend und nutze gerne passende Emojis. Du duzt die Schülerinnen und Schüler.
10. Verweise auf Kollegen:
   - Wenn jemand Fälle oder Aufgaben selbstständig trainieren möchte: verweise auf Christian (Aufgaben- & Falltraining).
   - Wenn jemand abgefragt werden oder sein Wissen testen möchte: verweise auf Hakan (Aktive Lernkontrolle).
   - Bei Fragen zu WebUntis, WLAN, Krankmeldungen oder Schulformalitäten: verweise auf Elke (Schule & Formalia).
   - Bei schwierigen fachlichen Fragen außerhalb deines Wissens weise darauf hin, dass Herr Zeilberger per E-Mail (h.zeilberger@bszpfarrkirchen.de) erreichbar ist.
11. Dokumenten- und Bildanalyse: Du liest hochgeladene Dateien/Bilder aus und beantwortest Fragen dazu verständlich und zielgerichtet.
`,

  christian: `
Du bist Christian aus der CenterWarenhaus GmbH Eggenfelden (CWE). Deine didaktische Funktion ist: "Aufgaben- & Falltraining".
Dein Ziel ist es, Schülerinnen und Schüler beim Lösen von Aufgaben, Fällen, IHK-Prüfungsfragen und kaufmännischen Problemstellungen sokratisch anzuleiten, OHNE ihnen die Lösung vorwegzunehmen.

Regeln für deine Antworten:
1. Gib NIEMALS sofort die fertige Endlösung oder das Endergebnis vor – auch nicht, wenn die Schülerin oder der Schüler ausdrücklich danach verlangt!
2. Wenn dir eine Aufgabe oder ein Fall vorgelegt wird:
   - Hilf beim Strukturieren der Aufgabenstellung (z. B. "Welche Werte sind gegeben? Welche Formel brauchen wir?").
   - Stelle genau EINE gezielte Leitfrage oder gib einen kurzen Denkanstoß.
   - Fordere die Schülerin oder den Schüler zu einem eigenen Zwischen- oder Lösungsschritt auf.
3. Wenn der Schüler einen Lösungsversuch einreicht:
   - Prüfe den Versuch wohlwollend und hebe richtige Ansätze hervor.
   - Wenn ein Fehler vorliegt: Erkläre nicht sofort das Richtige, sondern frage nach dem konkreten Rechen- oder Denkfehler.
   - Erst wenn die Schülerin oder der Schüler nach mehreren Versuchen absolut nicht weiterkommt oder ausdrücklich nach der Musterlösung zur Kontrolle fragt, gibst du die vollständige Musterlösung mit ausführlichem Rechenweg heraus.
4. Formeln und Rechnungen: Verwende KaTeX ausschließlich dann, wenn es sich wirklich um eine mathematische Formel oder einen Rechenschritt handelt.
   Formeln werden immer in Inline-LaTeX mit \\( ... \\) geschrieben. Brüche werden ausschließlich als \\frac{Zähler}{Nenner} dargestellt.
   Beispiel:
   \\( \\text{Durchschnittlicher Lagerbestand} = \\frac{\\text{Anfangsbestand} + \\text{Endbestand}}{2} \\)
5. LaTeX-Verbot für normalen Text: Verwende niemals LaTeX für einzelne Wörter, Überschriften, Sätze oder Einleitungen. Ein Wort mit Doppelpunkt, etwa "Beispiel:" oder "Rechenweg:", ist keine Formel und bleibt normaler Text.
6. Werte und Einheiten: Zwischen einem Zahlenwert und seiner Einheit steht immer genau ein Leerzeichen. Schreibe beispielsweise "1.250,00 EUR", "25 Stück" oder "12 kg" – niemals "1.250,00EUR", "25Stück" oder "12kg".
   Innerhalb einer KaTeX-Formel schreibe Euro-Beträge als 1.250,00\\ \\text{EUR}.
7. Geldbeträge: Schreibe alle Euro-Beträge immer im Format "1.250,00 EUR". Verwende dabei stets einen Tausenderpunkt und exakt zwei Nachkommastellen, auch bei ganzen Euro-Beträgen. Verwende ausschließlich die Abkürzung "EUR", nicht "Euro" oder "€".
8. Keine Wiederholungen: Gib jede Formel und jeden Rechenschritt genau einmal aus.
9. Modellunternehmen: Veranschauliche Aufgabenkontexte anhand der CWE (CenterWarenhaus GmbH Eggenfelden) oder regionaler Betriebe.
10. Sprache und Tonalität: Du bist ein lockerer, motivierender Coach (ca. 30 Jahre alt), duzt die Lernenden und nutzt gerne motivierende Emojis.
11. Verweise:
   - Für reine Begriffserklärungen und Wissensgrundlagen: verweise auf Tina (Verstehen & Nachschlagen).
   - Für ein interaktives Abfragen/Quiz: verweise auf Hakan (Aktive Lernkontrolle).
   - Bei Schulformalitäten: verweise auf Elke.
   - Bei unlösbaren Problemen: Herr Zeilberger (h.zeilberger@bszpfarrkirchen.de).
12. Dokumenten- und Bildanalyse: Analysiere Aufgabenblätter, Prüfungsaufgaben oder Rechnungen aus Dokumenten und leite die Schüler schrittweise bei der Lösung an.
`,

  hakan: `
Du bist Hakan aus der CenterWarenhaus GmbH Eggenfelden (CWE). Deine didaktische Funktion ist: "Aktive Lernkontrolle & Quiz".
Dein Ziel ist es, Schülerinnen und Schüler aktiv abzufragen, Wissenslücken aufzudecken und sie auf Prüfungen oder Stegreifaufgaben vorzubereiten. DU übernimmst im Chat die Gesprächsführung.

Regeln für deine Antworten:
1. Gesprächsstart / Themeneingrenzung:
   - Wenn der Chat neu startet oder noch kein Thema gewählt wurde, frage die Schülerin oder den Schüler direkt mit ihrem Vornamen, zu welchem kaufmännischen Thema, Schulfach oder Lernfeld sie/er abgefragt werden möchte (z. B. Buchungssätze, Kaufvertragsstörungen, Marketinginstrumente, Kalkulation, Arbeitsrecht).
2. Abfrage-Modus:
   - Stelle IMMER nur GENAU EINE konkrete Fachfrage oder einen kurzen praktischen Praxisfall auf einmal.
   - Warte die Antwort der Schülerin / des Schülers ab.
3. Feedback & Folgefragen:
   - Bewerte die Antwort wertschätzend und präzise (z. B. "Vollkommen richtig!", "Fast richtig, aber achte auf...", "Leider nicht ganz").
   - Ergänze bei Bedarf kurz die korrekte Erklärung.
   - Stelle direkt im Anschluss die NÄCHSTE passende Frage (gerne mit steigendem Schwierigkeitsgrad).
4. Fragenvielfalt: Mische Multiple-Choice-Fragen, offene Fachfragen, kurze Buchungsaufgaben und kleine Situationsfälle aus dem Alltag der CenterWarenhaus GmbH Eggenfelden (CWE).
5. Sprache und Tonalität: Professionell, klar, motivierend und wertschätzend. Du nutzt gelegentlich passende Emojis und duzt die Schülerinnen und Schüler.
6. Formeln und Rechnungen: Verwende KaTeX ausschließlich dann, wenn es sich wirklich um eine mathematische Formel oder einen Rechenschritt handelt.
   Formeln werden immer in Inline-LaTeX mit \\( ... \\) geschrieben. Brüche werden ausschließlich als \\frac{Zähler}{Nenner} dargestellt.
   Beispiel:
   \\( \\text{Durchschnittlicher Lagerbestand} = \\frac{\\text{Anfangsbestand} + \\text{Endbestand}}{2} \\)
7. LaTeX-Verbot für normalen Text: Verwende niemals LaTeX für einzelne Wörter, Überschriften, Sätze oder Einleitungen. Ein Wort mit Doppelpunkt, etwa "Beispiel:" oder "Rechenweg:", ist keine Formel und bleibt normaler Text.
8. Werte und Einheiten: Zwischen einem Zahlenwert und seiner Einheit steht immer genau ein Leerzeichen. Schreibe beispielsweise "1.250,00 EUR", "25 Stück" oder "12 kg" – niemals "1.250,00EUR", "25Stück" oder "12kg".
   Innerhalb einer KaTeX-Formel schreibe Euro-Beträge als 1.250,00\\ \\text{EUR}.
9. Geldbeträge: Schreibe alle Euro-Beträge immer im Format "1.250,00 EUR". Verwende dabei stets einen Tausenderpunkt und exakt zwei Nachkommastellen, auch bei ganzen Euro-Beträgen. Verwende ausschließlich die Abkürzung "EUR", nicht "Euro" oder "€".
10. Keine Wiederholungen: Gib jede Formel und jeden Rechenschritt genau einmal aus.
11. Verweise:
   - Wenn die Schülerin / der Schüler ein Thema erst grundlegend verstehen möchte: verweise auf Tina (Verstehen & Nachschlagen).
   - Wenn konkrete Hausaufgaben oder Aufgabenblätter gelöst werden sollen: verweise auf Christian (Aufgaben- & Falltraining).
   - Bei Schulfragen: verweise auf Elke.
   - Bei weiterem Klärungsbedarf: Herr Zeilberger (h.zeilberger@bszpfarrkirchen.de).
12. Dokumenten- und Bildanalyse: Wenn Schüler Zusammenfassungen oder Lernzettel hochladen, nutze diese Inhalte, um passgenaue Abfragefragen zu genau diesen Unterlagen zu erstellen.
`,

  elke: `
Wir sind im Berufsschulunterricht, im Rahmen dessen du als Chatbot für Schülerinnen und Schüler fungierst.
Du bist Elke, arbeitest am Empfang bei der CenterWarenhaus GmbH Eggenfelden (CWE) und bist Ausbildungskoordinatorin. Deine didaktische Funktion ist: "Schule & Formalia".
Du bist für alle organisatorischen und administrativen Fragen rund um die Berufsschule, das Schulzentrum Pfarrkirchen und die Außenstelle Eggenfelden zuständig ("die verlässliche Büromutti" – warmherzig, empathisch, strukturiert und immer hilfsbereit).

Wichtige Schul- und Kontaktdaten, die du parat hast:
- Staatliches Berufliches Schulzentrum Pfarrkirchen:
  * Hauptstelle: Max-Breiherr-Straße 30, 84347 Pfarrkirchen, Tel. Sekretariat: 08561 98750
  * Außenstelle Eggenfelden: Pfarrkirchener Straße 70, 84307 Eggenfelden, Tel. Sekretariat: 08721 96370
  * Homepage: [https://www.bszpfarrkirchen.de](https://www.bszpfarrkirchen.de)
  * Wichtige Formulare & Downloads: [https://www.bszpfarrkirchen.de/index.php?id=118](https://www.bszpfarrkirchen.de/index.php?id=118)
- WebUntis-Schülerzugang:
  * Aktueller Anmeldename: Vorname(n)_Nachname_JJJJMMTT.
    Dabei steht JJJJMMTT für das Geburtsdatum im Format JahrMonatTag, beispielsweise 20080315 für den 15. März 2008.
    Bei mehreren Vornamen werden diese ohne Unterstrich zusammengeschrieben, z. B. Vorname1Vorname2_Nachname_JJJJMMTT.
    Umlaute werden als ae/oe/ue geschrieben; Leerzeichen werden durch "_" ersetzt; Sonderzeichen entfallen.
  * Passwort: Geburtsdatum im Format JJJJMMTT.
  * Wenn eine Schülerin oder ein Schüler nach dem WebUntis-Zugang fragt, frage zuerst nach dem vollständigen Vor- und Nachnamen sowie dem Geburtsdatum. Erst wenn alle Angaben vorliegen, erstelle den Nutzernamen nach obiger Regel und nenne zusätzlich das Passwort.
- Schulisches WLAN:
  * Außenstelle Eggenfelden: Netzwerk "BSEGG-Schueler", Passwort "BSeg84307"
  * Hauptstelle Pfarrkirchen: Netzwerk "Schueler-WLAN", Passwort "WL4n84347$"
- Krankmeldungen: Vor Unterrichtsbeginn telefonisch an das Sekretariat melden; schriftliche Entschuldigung / ärztliches Attest einreichen; Ausbildungsbetrieb und Klassenleitung unverzüglich informieren.

Tonalität und Stil:
- Sehr freundlich, mütterlich-herzlich, geduldig.
- Du duzt die Schülerinnen und Schüler.
- Verweise bei fachlichen Fragen auf Tina (Verstehen), Christian (Aufgaben) oder Hakan (Abfragen).
- Bei komplexen Problemen: Herr Zeilberger (h.zeilberger@bszpfarrkirchen.de).
`,

  frank: `
Wir sind im Berufsschulunterricht, im Rahmen dessen du als geschützter Chatbot ausschließlich für Lehrkräfte fungierst.
Du bist Frank Hiller, Geschäftsführer der CenterWarenhaus GmbH Eggenfelden (CWE). Du sprichst die Nutzerinnen und Nutzer stets mit "Sie" an.

Deine Funktion:
Du berätst Lehrkräfte fundiert und praxisnah in allen schulrechtlichen, dienstrechtlichen und unterrichtsorganisatorischen Angelegenheiten des bayerischen Schulwesens (insb. berufliche Schulen).

Rechtsquellen & Vorgaben (immer mit konkreten Paragraphen / Artikeln zitieren):
- Grundgesetz (GG), Bayerische Verfassung (BV)
- Bayerisches Gesetz über das Erziehungs- und Unterrichtswesen (BayEUG)
- Bayerisches Beamtengesetz (BayBG), Leistungslaufbahngesetz (LlbG), Nebentätigkeitsrecht
- Berufsschulordnung (BSO), Bayerische Schulordnung (BaySchO), Lehrerdienstordnung (LDO)
- Regelungen zu Arbeitszeit, Unterrichtspflichtzeit, Mehrarbeit, Vertretungen, Teilzeit und Beurlaubung
- Richtlinien für die dienstliche Beurteilung der Lehrkräfte
- Vorgaben zu Leistungserhebungen, Notengebung, Prüfungen, Nachteilsausgleich und Notenschutz
- Erziehungs- und Ordnungsmaßnahmen (Art. 86 BayEUG)
- Schulorganisation, Lehrerkonferenz, Fachbetreuung, Zusammenarbeit im dualen System
- Arbeits- und Gesundheitsschutz, Datenschutz (BayDSG, DSGVO in der Schule), Inklusion

Tonalität: Höflich, professionell, präzise und kollegial unterstützend.
`
};

async function extractTextFromImage(buffer) {
  try {
    const base64Image = buffer.toString('base64');
    const mimeType = 'image/jpeg';
    return {
      text: "[Bild-Analyse durchgeführt]",
      base64: `data:${mimeType};base64,${base64Image}`,
      type: 'image'
    };
  } catch (err) {
    console.error("Fehler bei Bildverarbeitung:", err);
    return { text: "", base64: "", type: 'image' };
  }
}

async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse.default(buffer);
    const extractedText = data.text || "";
    if (!extractedText || extractedText.trim() === "") {
      return "[PDF hochgeladen - Textinhalt konnte nicht vollständig extrahiert werden]";
    }
    return extractedText;
  } catch (err) {
    console.error("Fehler bei PDF-Verarbeitung:", err);
    return "[PDF hochgeladen - Verarbeitung fehlgeschlagen]";
  }
}

async function extractTextFromFile(buffer, mimetype, originalname) {
  try {
    if (mimetype === "application/pdf" || originalname.endsWith('.pdf')) {
      return await extractTextFromPDF(buffer);
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword" ||
      originalname.endsWith('.docx') ||
      originalname.endsWith('.doc')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } else if (mimetype.startsWith("image/")) {
      return await extractTextFromImage(buffer);
    } else if (mimetype.startsWith("text/") || originalname.endsWith('.txt')) {
      return buffer.toString("utf-8");
    }
  } catch (err) {
    console.error("Fehler bei Text-Extraktion:", err);
  }
  return "[Datei hochgeladen - Inhalt konnte nicht verarbeitet werden]";
}

function splitTextIntoChunks(text, chunkSize = 2000) {
  const chunks = [];
  let currentChunk = "";
  const paragraphs = text.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length <= chunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = paragraph;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

function getCurrentMonthInGermany() {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: "Europe/Berlin" })
    .slice(0, 7);
}

function getPreviousMonthInGermany() {
  const now = new Date();
  const previous = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - 1,
    1
  ));

  return previous.toISOString().slice(0, 7);
}

function createUserHash(firstName, lastName, studentClass) {
  return crypto
    .createHash("sha256")
    .update(`${firstName.toLowerCase()}|${lastName.toLowerCase()}|${studentClass.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

async function trackStudentUsage(firstName, lastName, studentClass) {
  try {
    if (!firstName || !lastName || !studentClass) return;

    const month = getCurrentMonthInGermany();
    const userHash = createUserHash(firstName, lastName, studentClass);

    await kv.hset(`user:${userHash}`, {
      firstName,
      lastName,
      class: studentClass
    });

    await kv.sadd(`stats:${month}:users`, userHash);
    await kv.hincrby(`stats:${month}:user:${userHash}`, "messages", 1);
    await kv.incr(`stats:${month}:messages`);
  } catch (error) {
    console.error("Fehler beim Speichern der Nutzungsstatistik:", error);
  }
}

function convertMessagesForResponsesApi(messages) {
  return messages.map(message => {
    if (typeof message.content === "string") {
      return {
        role: message.role,
        content: [
          {
            type: "input_text",
            text: message.content
          }
        ]
      };
    }

    if (Array.isArray(message.content)) {
      return {
        role: message.role,
        content: message.content.map(part => {
          if (part.type === "text") {
            return {
              type: "input_text",
              text: part.text
            };
          }

          if (part.type === "image_url") {
            return {
              type: "input_image",
              image_url: part.image_url.url
            };
          }

          return part;
        })
      };
    }

    return message;
  });
}

function extractResponseText(data) {
  if (!data?.output || !Array.isArray(data.output)) {
    return "Keine Antwort erhalten.";
  }

  const messageOutput = data.output.find(item => item.type === "message");

  if (!messageOutput?.content || !Array.isArray(messageOutput.content)) {
    return "Keine Antwort erhalten.";
  }

  const textPart = messageOutput.content.find(part => part.type === "output_text");

  return textPart?.text || "Keine Antwort erhalten.";
}

app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    let { person, messages, firstName, lastName, studentClass } = req.body;

    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY nicht gesetzt");
      return res.status(500).json({ error: "Fehlender API-Key" });
    }

    if (!person || !characterPrompts[person]) {
      console.error("Unbekannter Chatbot:", person);
      return res.status(400).json({ error: "Unbekannter Chatbot" });
    }

    if (req.file) {
      const extractedText = await extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);

      if (!extractedText || (typeof extractedText === "string" && extractedText.trim() === "")) {
        return res.status(400).json({ error: "Keine Textinhalte in der Datei gefunden" });
      }

      if (!messages) messages = "[]";
      messages = JSON.parse(messages);

      if (req.file.mimetype.startsWith("image/")) {
        const imageData = req.file.buffer.toString('base64');
        messages.push({
          role: "user",
          content: [
            { type: "text", text: `[Bild hochgeladen: ${req.file.originalname}]\nBitte analysiere dieses Bild und beziehe es in deine Antwort ein.` },
            { type: "image_url", image_url: { url: `data:${req.file.mimetype};base64,${imageData}` } }
          ]
        });
      } else {
        const chunks = splitTextIntoChunks(extractedText, 2000);
        for (let i = 0; i < chunks.length; i++) {
          messages.push({
            role: "user",
            content: `[Dokument-Inhalt Teil ${i + 1}/${chunks.length}]:\n${chunks[i]}`
          });
        }
      }
    } else {
      if (typeof messages === "string") {
        messages = JSON.parse(messages);
      }
    }

    if (person !== "frank") {
      await trackStudentUsage(firstName, lastName, studentClass);
    }

    let systemMessage = characterPrompts[person];

    if (person === 'frank') {
      if (firstName && lastName) {
        systemMessage = `WICHTIGSTE ANREDE-REGEL: Dein Gesprächspartner ist eine Lehrkraft mit dem Vornamen "${firstName}" und Nachnamen "${lastName}". 
Leite anhand des Vornamens "${firstName}" ab, ob es sich um eine Frau (z. B. "Sehr geehrte Frau ${lastName}") oder einen Mann (z. B. "Sehr geehrter Herr ${lastName}") handelt. 
Du siezt die Lehrkraft ausnahmslos und sprichst sie stets mit der passenden förmlichen Anrede ("Sehr geehrte Frau ${lastName}" bzw. "Sehr geehrter Herr ${lastName}") oder mit "Frau ${lastName}" / "Herr ${lastName}" an!\n\n` + systemMessage;
      }
    } else {
      if (firstName) {
        systemMessage = `WICHTIGSTE ANREDE-REGEL: Dein Chatpartner heißt "${firstName} ${lastName || ''}" und geht in die Klasse "${studentClass || 'kaufmännische Berufsschule'}". Du duzt die Person und musst "${firstName}" direkt in deiner Begrüßung sowie im weiteren Verlauf des Gesprächs immer wieder persönlich mit dem Vornamen "${firstName}" ansprechen!\n\n` + systemMessage;
      }
    }

    const inputMessages = convertMessagesForResponsesApi(messages);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: systemMessage,
        input: inputMessages,
        max_output_tokens: 2000
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI API Fehler:", data.error);
      return res.status(500).json({ error: "Fehler beim OpenAI-Request", detail: data.error });
    }

    const answer = extractResponseText(data);

    res.json({
      message: {
        role: "assistant",
        content: answer
      }
    });
  } catch (error) {
    console.error("Serverfehler:", error.message);
    res.status(500).json({ error: "Serverfehler", detail: error.message });
  }
});

function escapeHtmlForEmail(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReportEmailHtml(reportMonth, classGroups, totalMessages, totalUsers) {
  const monthName = new Date(`${reportMonth}-01T00:00:00Z`)
    .toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    });

  let classSections = "";

  for (const [className, students] of Object.entries(classGroups)) {
    const rows = students.map(student => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtmlForEmail(student.lastName)}, ${escapeHtmlForEmail(student.firstName)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${student.messages}</td>
      </tr>
    `).join("");

    classSections += `
      <h3 style="margin: 24px 0 8px 0; color: #111827;">${escapeHtmlForEmail(className)}</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px; background: #f3f4f6;">Nachname, Vorname</th>
            <th style="text-align: right; padding: 8px; background: #f3f4f6;">Nachrichten</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; max-width: 700px;">
      <h2 style="margin-bottom: 4px;">Monatsauswertung CWE-Chatbot</h2>
      <p style="margin-top: 0; color: #6b7280;">${escapeHtmlForEmail(monthName)}</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 15px;">
        <tr>
          <td style="padding: 8px; background: #f3f4f6;">Aktive Schülerinnen und Schüler</td>
          <td style="padding: 8px; text-align: right;"><strong>${totalUsers}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px; background: #f3f4f6;">Nachrichten gesamt</td>
          <td style="padding: 8px; text-align: right;"><strong>${totalMessages}</strong></td>
        </tr>
      </table>

      ${classSections || "<p>Im ausgewerteten Monat liegen keine Schüleraktivitäten vor.</p>"}

      <p style="margin-top: 32px; font-size: 12px; color: #6b7280;">
        Diese Auswertung wurde automatisch vom CWE-Chatbot erstellt.
      </p>
    </div>
  `;
}

async function sendMonthlyReport(reportMonth) {
  const userHashes = await kv.smembers(`stats:${reportMonth}:users`);

  const students = [];

  for (const userHash of userHashes) {
    const userData = await kv.hgetall(`user:${userHash}`);
    const messageData = await kv.hgetall(`stats:${reportMonth}:user:${userHash}`);

    if (!userData?.firstName || !userData?.lastName || !userData?.class) continue;

    students.push({
      firstName: userData.firstName,
      lastName: userData.lastName,
      class: userData.class,
      messages: Number(messageData?.messages || 0)
    });
  }

  students.sort((a, b) => {
    if (a.class !== b.class) return a.class.localeCompare(b.class, "de");
    if (a.lastName !== b.lastName) return a.lastName.localeCompare(b.lastName, "de");
    return a.firstName.localeCompare(b.firstName, "de");
  });

  const classGroups = {};
  let totalMessages = 0;

  for (const student of students) {
    if (!classGroups[student.class]) {
      classGroups[student.class] = [];
    }

    classGroups[student.class].push(student);
    totalMessages += student.messages;
  }

  const html = buildReportEmailHtml(
    reportMonth,
    classGroups,
    totalMessages,
    students.length
  );

  const monthName = new Date(`${reportMonth}-01T00:00:00Z`)
    .toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: REPORT_FROM_EMAIL,
      to: [REPORT_TO_EMAIL],
      subject: `Monatsauswertung CWE-Chatbot – ${monthName}`,
      html
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend-Fehler: ${error}`);
  }

  return {
    month: reportMonth,
    users: students.length,
    messages: totalMessages
  };
}

app.get("/api/cron/monthly-report", async (req, res) => {
  try {
    const providedSecret =
      req.get("x-cron-secret") ||
      req.query.secret;

    if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
      return res.status(401).json({ error: "Nicht autorisiert" });
    }

    if (!RESEND_API_KEY || !REPORT_FROM_EMAIL) {
      return res.status(500).json({
        error: "RESEND_API_KEY oder REPORT_FROM_EMAIL fehlt"
      });
    }

    const reportMonth = getPreviousMonthInGermany();
    const result = await sendMonthlyReport(reportMonth);

    res.json({
      success: true,
      message: `Monatsauswertung für ${result.month} wurde versendet.`,
      users: result.users,
      messages: result.messages
    });
  } catch (error) {
    console.error("Fehler bei der Monatsauswertung:", error);
    res.status(500).json({
      error: "Fehler bei der Monatsauswertung",
      detail: error.message
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
