import { Redis } from "@upstash/redis";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const REPORT_EMAIL =
  process.env.REPORT_EMAIL ||
  "h.zeilberger@bszpfarrkirchen.de";
const RESEND_FROM =
  process.env.RESEND_FROM ||
  "CWE Chatbot <onboarding@resend.dev>";
const CRON_SECRET = process.env.CRON_SECRET;

const redis = Redis.fromEnv();

function previousMonthKey() {
  const now = new Date();
  const previous = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - 1,
      1
    )
  );

  return previous.toISOString().slice(0, 7);
}

function previousMonthLabel() {
  const key = previousMonthKey();
  const [year, month] = key.split("-");

  return `${month}/${year}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReportHtml(records, monthLabel) {
  const classes = new Map();

  for (const record of records) {
    const className =
      record.studentClass || "Ohne Klasse";

    if (!classes.has(className)) {
      classes.set(className, []);
    }

    classes.get(className).push(record);
  }

  const sortedClasses = [...classes.keys()].sort(
    (a, b) =>
      a.localeCompare(b, "de", {
        sensitivity: "base"
      })
  );

  let html = `
    <h2>Nutzungsstatistik CWE-Chatbot</h2>
    <p>
      Auswertungszeitraum:
      <strong>${escapeHtml(monthLabel)}</strong>
    </p>
  `;

  let totalMessages = 0;
  let totalStudents = 0;

  for (const className of sortedClasses) {
    const students = classes
      .get(className)
      .sort((a, b) => {
        const lastCompare = String(a.lastName || "")
          .localeCompare(
            String(b.lastName || ""),
            "de",
            { sensitivity: "base" }
          );

        if (lastCompare !== 0) return lastCompare;

        return String(a.firstName || "").localeCompare(
          String(b.firstName || ""),
          "de",
          { sensitivity: "base" }
        );
      });

    const classMessages = students.reduce(
      (sum, student) => sum + student.messages,
      0
    );

    totalMessages += classMessages;
    totalStudents += students.length;

    html += `
      <h3>${escapeHtml(className)}</h3>
      <table
        cellpadding="6"
        cellspacing="0"
        border="1"
        style="
          border-collapse: collapse;
          font-family: Arial, sans-serif;
          font-size: 14px;
        "
      >
        <thead>
          <tr>
            <th align="left">Nachname</th>
            <th align="left">Vorname</th>
            <th align="right">Nachrichten</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const student of students) {
      html += `
        <tr>
          <td>${escapeHtml(student.lastName || "—")}</td>
          <td>${escapeHtml(student.firstName || "—")}</td>
          <td align="right">${student.messages}</td>
        </tr>
      `;
    }

    html += `
        <tr>
          <td colspan="2">
            <strong>Summe ${escapeHtml(className)}</strong>
          </td>
          <td align="right">
            <strong>${classMessages}</strong>
          </td>
        </tr>
        </tbody>
      </table>
      <p style="margin-bottom: 32px;"></p>
    `;
  }

  html += `
    <p>
      <strong>Gesamt:</strong>
      ${totalStudents} erfasste Personen,
      ${totalMessages} Nachrichten
    </p>
  `;

  return html;
}

export default async function handler(req, res) {
  try {
    const providedSecret =
      req.query.secret ||
      String(
        req.headers.authorization || ""
      ).replace(/^Bearer\s+/i, "");

    if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
      return res.status(401).json({
        success: false,
        error: "Nicht autorisiert."
      });
    }

    if (!RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "RESEND_API_KEY fehlt."
      });
    }

    if (!REPORT_EMAIL) {
      return res.status(500).json({
        success: false,
        error: "REPORT_EMAIL fehlt."
      });
    }

    const monthKey = previousMonthKey();
    const monthLabel = previousMonthLabel();
    const storageKey = `chatbot:usage:${monthKey}`;

    const stored = await redis.hgetall(storageKey);

    if (!stored || Object.keys(stored).length === 0) {
      const resend = new Resend(RESEND_API_KEY);

      await resend.emails.send({
        from: RESEND_FROM,
        to: [REPORT_EMAIL],
        subject:
          `CWE-Chatbot: Nutzungsstatistik ${monthLabel}`,
        html: `
          <h2>Nutzungsstatistik CWE-Chatbot</h2>
          <p>
            Für <strong>${escapeHtml(monthLabel)}</strong>
            liegen keine erfassten Chatnachrichten vor.
          </p>
        `
      });

      return res.status(200).json({
        success: true,
        message:
          "Keine Nutzungsdaten vorhanden. Leere Auswertung wurde versendet."
      });
    }

    const records = Object.entries(stored).map(
      ([field, messages]) => {
        const [
          studentClass,
          lastName,
          firstName,
          person
        ] = field.split("||");

        return {
          studentClass,
          lastName,
          firstName,
          person,
          messages: Number(messages) || 0
        };
      }
    );

    const html = buildReportHtml(
      records,
      monthLabel
    );

    const resend = new Resend(RESEND_API_KEY);

    const result = await resend.emails.send({
      from: RESEND_FROM,
      to: [REPORT_EMAIL],
      subject:
        `CWE-Chatbot: Nutzungsstatistik ${monthLabel}`,
      html
    });

    if (result.error) {
      console.error(
        "Resend-Fehler:",
        result.error
      );

      return res.status(502).json({
        success: false,
        error:
          "Die E-Mail konnte nicht versendet werden."
      });
    }

    await redis.del(storageKey);

    return res.status(200).json({
      success: true,
      message:
        `Monatliche Nutzungsstatistik für ${monthLabel} wurde versendet.`,
      recipients: [REPORT_EMAIL],
      records: records.length
    });
  } catch (error) {
    console.error(
      "Fehler im monatlichen Report:",
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        "Die monatliche Auswertung konnte nicht erstellt werden."
    });
  }
}
