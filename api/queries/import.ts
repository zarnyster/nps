import * as XLSX from "xlsx";
import { and, eq, asc } from "drizzle-orm";
import { getDb } from "./connection";
import { categoryRules, projects, reviews, statuses } from "../../db/schema";

export type ParsedRow = {
  date: Date;
  system: string;
  edition: string | null;
  client: string | null;
  score: number;
  comment: string | null;
  scoreType: "detractor" | "neutral" | "promoter";
  category: string | null;
};

export function parseFile(buffer: Buffer, filename: string): ParsedRow[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const rawText = isCsv ? buffer.toString("utf8") : undefined;
  const detectDelimiter = (text: string) => {
    const sample = text.slice(0, 300);
    const carets = (sample.match(/\^/g) || []).length;
    const commas = (sample.match(/,/g) || []).length;
    return carets > commas ? "^" : undefined;
  };
  const wb = isCsv
    ? XLSX.read(rawText, { type: "string", cellDates: true, FS: detectDelimiter(rawText!) })
    : XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  const rows: ParsedRow[] = [];
  for (const r of json) {
    const get = (name: string) => {
      for (const key of Object.keys(r)) {
        if (key.trim().toLowerCase() === name.toLowerCase()) return r[key];
      }
      return null;
    };
    const rawDate = get("Дата и время оценки");
    const system = get("Система");
    const score = Number(get("Оценка"));
    if (!rawDate || !system || isNaN(score)) continue;
    let date: Date;
    if (rawDate instanceof Date) {
      date = rawDate;
    } else {
      const s = String(rawDate).trim();
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
      const m2 = s.match(/^(\d{2})\.(\d{2})\.(\d{4})[ ](\d{2}):(\d{2})(?::(\d{2}))?/);
      if (m) date = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
      else if (m2) date = new Date(+m2[3], +m2[2] - 1, +m2[1], +m2[4], +m2[5], +(m2[6] || 0));
      else continue;
    }
    if (isNaN(date.getTime())) continue;
    const det = Number(get("Детрактор")) === 1;
    const neu = Number(get("Нейтральный")) === 1;
    const pro = Number(get("Промоутер")) === 1;
    const scoreType = det ? "detractor" : neu ? "neutral" : pro ? "promoter" : score <= 6 ? "detractor" : score <= 8 ? "neutral" : "promoter";
    const commentRaw = get("Комментарий");
    const comment = commentRaw && String(commentRaw).trim() ? String(commentRaw).trim() : null;
    const bitrix = get("Битрикс");
    const categoryRaw = get("Категория");
    rows.push({
      date,
      system: String(system).trim(),
      edition: get("Издание") ? String(get("Издание")).trim() : null,
      client: bitrix !== null && bitrix !== undefined ? String(bitrix).trim() : null,
      score,
      comment,
      scoreType,
      category: categoryRaw && String(categoryRaw).trim() ? String(categoryRaw).trim() : null,
    });
  }
  return rows;
}

export async function getCategoryRules() {
  return getDb().select().from(categoryRules).orderBy(asc(categoryRules.sortOrder));
}

export function classify(comment: string | null, scoreType: string, rules: { pattern: string; category: string }[]): string | null {
  if (!comment) return null;
  if (scoreType === "promoter") return null;
  const text = comment.toLowerCase();
  for (const rule of rules) {
    if (text.includes(rule.pattern.toLowerCase())) return rule.category;
  }
  return "Общее недовольство";
}

function dedupeKey(projectId: number, date: Date, score: number, client: string | null, comment: string | null) {
  const ts = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return `${projectId}|${ts}|${score}|${client ?? ""}|${(comment ?? "").trim()}`;
}

export async function importRows(rows: ParsedRow[]) {
  const db = getDb();
  const result = {
    total: rows.length,
    imported: 0,
    duplicates: 0,
    skipped: 0,
    newProjects: [] as string[],
    yearMonths: [] as string[],
  };
  if (rows.length === 0) return result;
  const rules = await getCategoryRules();
  const [defStatus] = await db.select().from(statuses).where(eq(statuses.isDefault, 1));
  const projectCache = new Map<string, number>();
  for (const p of await db.select().from(projects)) projectCache.set(p.name, p.id);
  const months = new Set<string>();
  for (const r of rows) months.add(`${r.date.getFullYear()}-${r.date.getMonth() + 1}`);
  const existing = new Set<string>();
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const rowsDb = await db
      .select({
        projectId: reviews.projectId,
        date: reviews.date,
        score: reviews.score,
        client: reviews.client,
        comment: reviews.comment,
      })
      .from(reviews)
      .where(and(eq(reviews.year, y), eq(reviews.month, m)));
    for (const r of rowsDb) {
      existing.add(dedupeKey(r.projectId, r.date, r.score, r.client, r.comment));
    }
  }
  const seenInFile = new Set<string>();
  const toInsert = [];
  for (const row of rows) {
    let projectId = projectCache.get(row.system);
    if (!projectId) {
      const [ins] = await db.insert(projects).values({ name: row.system }).$returningId();
      projectId = ins.id;
      projectCache.set(row.system, projectId);
      result.newProjects.push(row.system);
    }
    const key = dedupeKey(projectId, row.date, row.score, row.client, row.comment);
    if (existing.has(key) || seenInFile.has(key)) {
      result.duplicates++;
      continue;
    }
    seenInFile.add(key);
    const category = row.category ?? classify(row.comment, row.scoreType, rules);
    toInsert.push({
      projectId,
      client: row.client,
      date: row.date,
      edition: row.edition,
      score: row.score,
      comment: row.comment,
      category,
      scoreType: row.scoreType,
      statusId: defStatus?.id ?? null,
      year: row.date.getFullYear(),
      month: row.date.getMonth() + 1,
    });
    result.imported++;
  }
  for (let i = 0; i < toInsert.length; i += 200) {
    await db.insert(reviews).values(toInsert.slice(i, i + 200));
    if (i % 2000 === 0) console.log(`inserted ${i}/${toInsert.length}`);
  }
  result.yearMonths = [...months].sort();
  return result;
}
