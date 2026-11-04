import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

const POOL_URL = new URL("../data/quiz-pool.json", import.meta.url);

const CACHE_MS = 60 * 1000;
const GENERATED_PREFIX = "quiz:generated:v1";
const LOCK_SECONDS = 180;
const MAX_GENERATED_PER_TOPIC = 200;
const MAX_GENERATION_ATTEMPTS = 2;

let cachedPool = null;
let cachedAt = 0;
let loadingPool = null;
let redisClient = null;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

const SAVE_IF_OWNER_SCRIPT = `
if redis.call("get", KEYS[1]) ~= ARGV[1] then
  return 0
end
redis.call("set", KEYS[2], ARGV[2])
return 1
`;

export class QuizPoolError extends Error {
  constructor(message, status = 500, code = "QUIZ_POOL_ERROR", details = {}) {
    super(message);
    this.name = "QuizPoolError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("de-DE")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hash(value) {
  return createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function checkSignal(signal) {
  if (signal?.aborted) {
    throw new QuizPoolError(
      "Die Quizanfrage wurde abgebrochen oder hat zu lange gedauert.",
      504,
      "TIMEOUT"
    );
  }
}

export function validPoolQuiz(question) {
  const ids = ["A", "B", "C", "D"];

  return Boolean(
    question &&
    nonempty(question.id) &&
    Number.isInteger(question.revision) &&
    question.revision >= 1 &&
    nonempty(question.question) &&
    nonempty(question.explanation) &&
    ["single", "multiple"].includes(question.mode) &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every(
      (option, index) =>
        option &&
        option.id === ids[index] &&
        nonempty(option.text)
    ) &&
    new Set(
      question.options.map(option => normalize(option.text))
    ).size === 4 &&
    Array.isArray(question.correctIds) &&
    new Set(question.correctIds).size === question.correctIds.length &&
    question.correctIds.every(id => ids.includes(id)) &&
    (
      question.mode === "single"
        ? question.correctIds.length === 1
        : question.correctIds.length >= 2 &&
          question.correctIds.length <= 3
    )
  );
}

function validatePool(data) {
  if (
    !data ||
    data.schemaVersion !== 1 ||
    !nonempty(data.datasetId) ||
    !nonempty(data.version) ||
    !Array.isArray(data.topics) ||
    !data.topics.length
  ) {
    throw new QuizPoolError(
      "Der vorbereitete Quizpool hat ein ungültiges Format.",
      503,
      "QUIZ_POOL_INVALID"
    );
  }

  const topicIds = new Set();
  const questionIds = new Set();

  for (const topic of data.topics) {
    if (
      !topic ||
      !nonempty(topic.id) ||
      topicIds.has(topic.id) ||
      !nonempty(topic.title) ||
      !nonempty(topic.gradeId) ||
      !nonempty(topic.subjectId) ||
      !nonempty(topic.fieldId) ||
      !nonempty(topic.materialVersion) ||
      !Array.isArray(topic.questions) ||
      topic.questions.length !== 7
    ) {
      throw new QuizPoolError(
        "Eine Themenzuordnung im Quizpool ist ungültig oder enthält nicht sieben Aufgaben.",
        503,
        "QUIZ_POOL_INVALID"
      );
    }

    topicIds.add(topic.id);

    for (const question of topic.questions) {
      if (
        !validPoolQuiz(question) ||
        questionIds.has(question.id)
      ) {
        throw new QuizPoolError(
          "Der Quizpool enthält eine ungültige Aufgabe oder doppelte Aufgaben-IDs.",
          503,
          "QUIZ_POOL_INVALID"
        );
      }

      questionIds.add(question.id);
    }

    if (
      !topic.questions.some(question => question.mode === "single") ||
      !topic.questions.some(question => question.mode === "multiple")
    ) {
      throw new QuizPoolError(
        "Jedes vorbereitete Thema muss Single- und Multiple-Choice-Aufgaben enthalten.",
        503,
        "QUIZ_POOL_INVALID"
      );
    }
  }

  return data;
}

export async function loadQuizPool({ force = false } = {}) {
  if (
    !force &&
    cachedPool &&
    Date.now() - cachedAt < CACHE_MS
  ) {
    return cachedPool;
  }

  if (!loadingPool) {
    loadingPool = (async () => {
      try {
        const raw = await readFile(POOL_URL, "utf8");
        const data = validatePool(JSON.parse(raw));

        cachedPool = data;
        cachedAt = Date.now();

        return data;
      } catch (error) {
        if (error instanceof QuizPoolError) throw error;

        throw new QuizPoolError(
          "Der vorbereitete Quizpool konnte nicht gelesen werden.",
          503,
          "QUIZ_POOL_UNAVAILABLE"
        );
      }
    })().finally(() => {
      loadingPool = null;
    });
  }

  return loadingPool;
}

function topicSummary(topic) {
  return {
    id: topic.id,
    title: topic.title,
    gradeId: topic.gradeId,
    subjectId: topic.subjectId,
    subjectName: topic.subjectName || "",
    fieldId: topic.fieldId,
    fieldName: topic.fieldName || ""
  };
}

function gradeFromClass(studentClass) {
  const match = String(studentClass || "").match(/\b(10|11|12)\b/);
  return match?.[1] || "";
}

function topicLabels(topic) {
  return [
    topic.title,
    ...(Array.isArray(topic.aliases) ? topic.aliases : [])
  ]
    .filter(nonempty)
    .map(normalize);
}

export async function resolvePoolTopic({
  topicId = "",
  requestedTopic = "",
  gradeId = "",
  studentClass = "",
  subjectId = "",
  fieldId = ""
} = {}) {
  const pool = await loadQuizPool();

  if (topicId) {
    const exact = pool.topics.find(topic => topic.id === topicId);

    if (!exact) {
      throw new QuizPoolError(
        "Das ausgewählte Quizthema ist nicht mehr verfügbar.",
        422,
        "TOPIC_NOT_AVAILABLE"
      );
    }

    return {
      matched: true,
      method: "topic_id",
      topic: exact,
      candidates: []
    };
  }

  const wanted = normalize(requestedTopic);

  if (!wanted) {
    throw new QuizPoolError(
      "Bitte nenne ein Thema für das Quiz.",
      422,
      "TOPIC_CLARIFICATION"
    );
  }

  let candidates = pool.topics.filter(topic =>
    topicLabels(topic).includes(wanted)
  );

  if (!candidates.length) {
    return {
      matched: false,
      method: "no_exact_match",
      topic: null,
      candidates: []
    };
  }

  if (gradeId) {
    candidates = candidates.filter(
      topic => topic.gradeId === String(gradeId)
    );
  }

  if (subjectId) {
    candidates = candidates.filter(
      topic => topic.subjectId === subjectId
    );
  }

  if (fieldId) {
    candidates = candidates.filter(
      topic => topic.fieldId === fieldId
    );
  }

  if (!gradeId && candidates.length > 1) {
    const inferredGrade = gradeFromClass(studentClass);
    const inGrade = candidates.filter(
      topic => topic.gradeId === inferredGrade
    );

    if (inGrade.length) candidates = inGrade;
  }

  if (candidates.length === 1) {
    return {
      matched: true,
      method: "exact_title_or_alias",
      topic: candidates[0],
      candidates: []
    };
  }

  if (candidates.length > 1) {
    return {
      matched: false,
      method: "ambiguous",
      topic: null,
      candidates: candidates.map(topicSummary)
    };
  }

  return {
    matched: false,
    method: "no_match_in_scope",
    topic: null,
    candidates: []
  };
}

export function questionProgressKey(question) {
  return `${question.id}@${question.revision}`;
}

function answeredSet(values) {
  return new Set(
    (Array.isArray(values) ? values : [])
      .filter(value => typeof value === "string")
      .map(value => value.trim())
      .filter(Boolean)
  );
}

function remainingQuestions(questions, answered) {
  return questions.filter(
    question => !answered.has(questionProgressKey(question))
  );
}

function pickQuestion(questions, preferredQuestionKey = "") {
  const preferred = questions.find(
    question => questionProgressKey(question) === preferredQuestionKey
  );

  if (preferred) return preferred;

  return questions[
    Math.floor(Math.random() * questions.length)
  ];
}

function generatedKey(topic) {
  const identity = JSON.stringify([
    topic.id,
    topic.materialVersion
  ]);

  return `${GENERATED_PREFIX}:${hash(identity)}`;
}

function getRedis() {
  if (redisClient) return redisClient;

  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL;

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new QuizPoolError(
      "Der zentrale Quizspeicher ist nicht eingerichtet. Es wurde keine neue KI-Frage erstellt.",
      503,
      "QUIZ_STORAGE_UNAVAILABLE"
    );
  }

  redisClient = new Redis({ url, token });

  return redisClient;
}

async function readGenerated(redis, key) {
  try {
    const records = await redis.get(key);

    if (records === null) return [];

    if (
      !Array.isArray(records) ||
      records.some(
        record =>
          !record ||
          !validPoolQuiz(record.question) ||
          !nonempty(record.createdAt)
      )
    ) {
      throw new Error("Ungültiger gespeicherter Quizpool.");
    }

    return records;
  } catch {
    throw new QuizPoolError(
      "Zusätzliche gespeicherte Quizfragen konnten nicht zuverlässig geladen werden. Es wurde keine neue KI-Frage erstellt.",
      503,
      "QUIZ_STORAGE_UNAVAILABLE"
    );
  }
}

function materialContextForPrepared(topic) {
  return {
    basis: "materials",
    materialUsed: true,
    materialState: "prepared",
    materialUnavailable: false,
    materialFiles: (topic.materialReferences || []).map(reference => ({
      file: reference.file,
      section: null
    })),
    webSearchUsed: false,
    webSearchPerformed: false,
    currentCheckRequired: false,
    researchedAt: null,
    message:
      "Vorbereitete Quizaufgabe auf Grundlage der hinterlegten Lernkarten.",
    sources: []
  };
}

function deliver(topic, question, {
  origin,
  materialContext = null,
  sources = [],
  createdAt = null
}) {
  return {
    quiz: {
      id: question.id,
      revision: question.revision,
      topicId: topic.id,
      topic: topic.title,
      question: question.question,
      mode: question.mode,
      options: question.options,
      correctIds: question.correctIds,
      explanation: question.explanation
    },
    pool: {
      topicId: topic.id,
      materialVersion: topic.materialVersion,
      questionKey: questionProgressKey(question),
      origin,
      reviewStatus:
        question.reviewStatus || "automatically_checked",
      createdAt
    },
    materialContext:
      materialContext || materialContextForPrepared(topic),
    sources: Array.isArray(sources) ? sources : []
  };
}

function textTokens(value) {
  const stop = new Set([
    "der", "die", "das", "den", "dem", "des",
    "ein", "eine", "einer", "eines", "und", "oder",
    "ist", "sind", "welche", "welcher", "welches",
    "richtig", "falsch", "aussage", "aussagen"
  ]);

  return new Set(
    normalize(value)
      .split(" ")
      .filter(word => word.length > 2 && !stop.has(word))
  );
}

function jaccard(a, b) {
  const union = new Set([...a, ...b]);

  if (!union.size) return 0;

  const intersection = [...a].filter(word => b.has(word)).length;

  return intersection / union.size;
}

function quizFingerprint(question) {
  return hash(JSON.stringify({
    question: normalize(question.question),
    options: question.options
      .map(option => normalize(option.text))
      .sort()
  }));
}

function tooSimilar(candidate, existingQuestions) {
  const normalized = normalize(candidate.question);
  const candidateTokens = textTokens(candidate.question);
  const fingerprint = quizFingerprint(candidate);

  return existingQuestions.some(previous =>
    normalize(previous.question) === normalized ||
    quizFingerprint(previous) === fingerprint ||
    jaccard(candidateTokens, textTokens(previous.question)) >= 0.85
  );
}

function compactPrevious(question) {
  return {
    question: question.question,
    mode: question.mode,
    options: question.options,
    correctIds: question.correctIds,
    explanation: question.explanation,
    learningObjective: question.learningObjective || "",
    conceptIds: question.conceptIds || []
  };
}

export async function nextPoolQuiz({
  topicId,
  answeredQuestionKeys = [],
  preferredQuestionKey = "",
  allowGeneration = false,
  generateQuestion,
  signal
} = {}) {
  checkSignal(signal);

  const pool = await loadQuizPool();
  const topic = pool.topics.find(item => item.id === topicId);

  if (!topic) {
    throw new QuizPoolError(
      "Das ausgewählte Quizthema ist nicht verfügbar.",
      422,
      "TOPIC_NOT_AVAILABLE"
    );
  }

  const answered = answeredSet(answeredQuestionKeys);

  const preparedRemaining = remainingQuestions(
    topic.questions,
    answered
  );

  if (preparedRemaining.length) {
    const question = pickQuestion(
      preparedRemaining,
      preferredQuestionKey
    );

    return deliver(topic, question, {
      origin: "prepared"
    });
  }

  checkSignal(signal);

  const redis = getRedis();
  const key = generatedKey(topic);
  let records = await readGenerated(redis, key);

  function pickStored() {
    const available = records.filter(
      record =>
        !answered.has(questionProgressKey(record.question))
    );

    if (!available.length) return null;

    const preferred = available.find(
      record =>
        questionProgressKey(record.question) === preferredQuestionKey
    );

    const record = preferred || available[
      Math.floor(Math.random() * available.length)
    ];

    return deliver(topic, record.question, {
      origin: "generated_cached",
      materialContext: record.materialContext,
      sources: record.sources,
      createdAt: record.createdAt
    });
  }

  const stored = pickStored();

  if (stored) return stored;

  if (!allowGeneration) {
    throw new QuizPoolError(
      "Die verfügbaren Aufgaben sind bearbeitet. Beim Fortsetzen kann eine neue Aufgabe erstellt werden.",
      409,
      "QUIZ_POOL_EXHAUSTED"
    );
  }

  if (typeof generateQuestion !== "function") {
    throw new QuizPoolError(
      "Die Erstellung zusätzlicher Quizfragen ist noch nicht angebunden.",
      503,
      "QUIZ_GENERATOR_UNAVAILABLE"
    );
  }

  const lockKey = `${key}:lock`;
  const lockToken = randomUUID();

  let acquired;

  try {
    acquired = await redis.set(lockKey, lockToken, {
      nx: true,
      ex: LOCK_SECONDS
    });
  } catch {
    throw new QuizPoolError(
      "Der zentrale Quizspeicher ist nicht erreichbar. Es wurde keine neue KI-Frage erstellt.",
      503,
      "QUIZ_STORAGE_UNAVAILABLE"
    );
  }

  if (acquired !== "OK") {
    throw new QuizPoolError(
      "Für dieses Thema wird gerade eine zusätzliche Aufgabe erstellt. Bitte in wenigen Sekunden erneut auf Weiter klicken.",
      409,
      "QUIZ_GENERATION_BUSY"
    );
  }

  try {
    checkSignal(signal);

    records = await readGenerated(redis, key);

    const newlyStored = pickStored();

    if (newlyStored) return newlyStored;

    if (records.length >= MAX_GENERATED_PER_TOPIC) {
      throw new QuizPoolError(
        "Für dieses Thema ist die vorläufige Poolgrenze erreicht. Bitte wiederhole vorhandene Aufgaben oder wähle ein anderes Thema.",
        409,
        "QUIZ_POOL_LIMIT"
      );
    }

    const existing = [
      ...topic.questions,
      ...records.map(record => record.question)
    ];

    const rejected = [];

    for (
      let attempt = 0;
      attempt < MAX_GENERATION_ATTEMPTS;
      attempt++
    ) {
      checkSignal(signal);

      const generated = await generateQuestion({
        topic: topicSummary(topic),
        materialVersion: topic.materialVersion,
        previousQuestions: [
          ...existing,
          ...rejected
        ].map(compactPrevious),
        signal
      });

      checkSignal(signal);

      const rawQuiz = generated?.quiz;

      const question = {
        ...rawQuiz,
        id: `${topic.id}-ai-${randomUUID()}`,
        revision: 1,
        origin: "generated",
        reviewStatus: "automatically_checked"
      };

      if (!validPoolQuiz(question)) {
        throw new QuizPoolError(
          "Die zusätzliche Quizfrage war unvollständig oder formal ungültig.",
          502,
          "INVALID_LEARNING_OFFER"
        );
      }

      if (tooSimilar(question, existing)) {
        rejected.push(question);
        continue;
      }

      if (!generated.materialContext) {
        throw new QuizPoolError(
          "Für die zusätzliche Quizfrage fehlen Angaben zur verwendeten Grundlage.",
          502,
          "QUIZ_SOURCE_CONTEXT_MISSING"
        );
      }

      const record = {
        question,
        materialContext: generated.materialContext,
        sources: Array.isArray(generated.sources)
          ? generated.sources
          : [],
        createdAt: new Date().toISOString(),
        materialVersion: topic.materialVersion
      };

      const saved = await redis.eval(
        SAVE_IF_OWNER_SCRIPT,
        [lockKey, key],
        [
          lockToken,
          JSON.stringify([...records, record])
        ]
      );

      if (Number(saved) !== 1) {
        throw new QuizPoolError(
          "Die Aufgabe konnte nicht sicher im zentralen Pool gespeichert werden. Bitte erneut versuchen.",
          503,
          "QUIZ_SAVE_FAILED"
        );
      }

      return deliver(topic, question, {
        origin: "generated_new",
        materialContext: record.materialContext,
        sources: record.sources,
        createdAt: record.createdAt
      });
    }

    throw new QuizPoolError(
      "Es konnte keine ausreichend unterschiedliche neue Aufgabe erstellt werden. Bitte wiederhole vorhandene Fragen oder wähle einen anderen Themenbereich.",
      422,
      "QUIZ_NO_DISTINCT_QUESTION"
    );
  } finally {
    try {
      await redis.eval(
        RELEASE_LOCK_SCRIPT,
        [lockKey],
        [lockToken]
      );
    } catch (error) {
      console.warn(
        "Quiz-Sperre konnte nicht aktiv freigegeben werden:",
        error?.name || "RedisError"
      );
    }
  }
}