import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "./connection";
import { projects, reviewComments, reviews, statuses } from "../../db/schema";

export type ReviewFilters = {
  projectId?: number;
  year?: number;
  month?: number;
  months?: string[];
  scoreType?: string;
  scoreTypes?: string[];
  category?: string;
  score?: number;
  statusId?: number;
  hasComment?: boolean;
  hasEditorial?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function getProjects() {
  return getDb().select().from(projects).orderBy(asc(projects.name));
}

export async function getProjectById(id: number) {
  return getDb().query.projects.findFirst({ where: eq(projects.id, id) });
}

export async function createProject(name: string) {
  const db = getDb();
  const [result] = await db.insert(projects).values({ name }).$returningId();
  return db.query.projects.findFirst({ where: eq(projects.id, result.id) });
}

export async function getStatuses() {
  return getDb().select().from(statuses).orderBy(asc(statuses.sortOrder), asc(statuses.id));
}

export async function createStatus(data: { name: string; color?: string; sortOrder?: number; isDefault?: number }) {
  const db = getDb();
  const [result] = await db.insert(statuses).values(data).$returningId();
  return db.query.statuses.findFirst({ where: eq(statuses.id, result.id) });
}

export async function updateStatus(id: number, data: Partial<{ name: string; color: string; sortOrder: number; isDefault: number }>) {
  const db = getDb();
  await db.update(statuses).set(data).where(eq(statuses.id, id));
  return db.query.statuses.findFirst({ where: eq(statuses.id, id) });
}

export async function deleteStatus(id: number) {
  const def = await getDb().query.statuses.findFirst({ where: eq(statuses.isDefault, 1) });
  if (def) {
    await getDb().update(reviews).set({ statusId: def.id }).where(eq(reviews.statusId, id));
  } else {
    await getDb().update(reviews).set({ statusId: null }).where(eq(reviews.statusId, id));
  }
  await getDb().delete(statuses).where(eq(statuses.id, id));
  return { success: true };
}

function buildWhere(filters: ReviewFilters) {
  const conditions = [];
  if (filters.projectId) conditions.push(eq(reviews.projectId, filters.projectId));
  const monthPairs = (filters.months || []).map((m) => m.split("-").map(Number)).filter(([y, mo]) => y >= 2000 && mo >= 1 && mo <= 12);
  if (monthPairs.length > 0) {
    conditions.push(
      sql`(${sql.join(monthPairs.map(([y, mo]) => sql`(${reviews.year} = ${y} AND ${reviews.month} = ${mo})`), sql` OR `)})`
    );
  } else {
    if (filters.year) conditions.push(eq(reviews.year, filters.year));
    if (filters.month) conditions.push(eq(reviews.month, filters.month));
  }
  const validScoreTypes = (filters.scoreTypes || []).filter((t) => ["detractor", "neutral", "promoter"].includes(t));
  if (validScoreTypes.length > 0 && validScoreTypes.length < 3) {
    conditions.push(inArray(reviews.scoreType, validScoreTypes as ("detractor" | "neutral" | "promoter")[]));
  } else if (validScoreTypes.length === 0 && filters.scoreType) {
    conditions.push(eq(reviews.scoreType, filters.scoreType as "detractor" | "neutral" | "promoter"));
  }
  if (filters.category) conditions.push(eq(reviews.category, filters.category));
  if (filters.score !== undefined) conditions.push(eq(reviews.score, filters.score));
  if (filters.statusId) conditions.push(eq(reviews.statusId, filters.statusId));
  if (filters.hasComment) conditions.push(sql`${reviews.comment} IS NOT NULL AND TRIM(${reviews.comment}) <> ''`);
  if (filters.hasEditorial === true) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM review_comments rc WHERE rc.reviewId = ${reviews.id} AND rc.commentText IS NOT NULL AND TRIM(rc.commentText) <> '')`
    );
  }
  if (filters.hasEditorial === false) {
    conditions.push(
      sql`NOT EXISTS (SELECT 1 FROM review_comments rc WHERE rc.reviewId = ${reviews.id} AND rc.commentText IS NOT NULL AND TRIM(rc.commentText) <> '')`
    );
  }
  if (filters.search) {
    conditions.push(sql`LOWER(${reviews.comment}) LIKE LOWER(${"%" + filters.search + "%"})`);
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getReviews(filters: ReviewFilters) {
  const db = getDb();
  const whereClause = buildWhere(filters);
  const limit = filters.limit || 50;
  const offset = filters.offset || 0;
  const items = await db.query.reviews.findMany({
    where: whereClause,
    with: {
      project: true,
      status: true,
      comments: { orderBy: [desc(reviewComments.createdAt)] },
    },
    limit,
    offset,
    orderBy: [desc(reviews.date)],
  });
  const [totalResult] = await db.select({ count: count() }).from(reviews).where(whereClause);
  return { items, total: totalResult.count };
}

export async function getReviewById(id: number) {
  return getDb().query.reviews.findFirst({
    where: eq(reviews.id, id),
    with: { project: true, status: true, comments: { with: { user: true } } },
  });
}

export async function getReviewCategories() {
  const db = getDb();
  const results = await db
    .selectDistinct({ category: reviews.category })
    .from(reviews)
    .where(sql`${reviews.category} IS NOT NULL`);
  return results.map((r) => r.category).filter(Boolean) as string[];
}

export async function getDashboardStats(projectId?: number, year?: number, month?: number) {
  const db = getDb();
  const conditions = [];
  if (projectId) conditions.push(eq(reviews.projectId, projectId));
  if (year) conditions.push(eq(reviews.year, year));
  if (month) conditions.push(eq(reviews.month, month));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(reviews).where(whereClause);
  const scoreResults = await db
    .select({ score: reviews.score, count: count() })
    .from(reviews)
    .where(whereClause)
    .groupBy(reviews.score);

  // Категории считаем для всех 0–8 (детракторы + нейтралы)
  const negativeConditions = [...conditions, sql`${reviews.score} <= 8`];
  const negativeCategoryResults = await db
    .select({ category: reviews.category, count: count() })
    .from(reviews)
    .where(and(...negativeConditions, sql`${reviews.category} IS NOT NULL`))
    .groupBy(reviews.category);

  const detractors = scoreResults.filter((r) => r.score <= 6).reduce((s, r) => s + r.count, 0);
  const neutrals = scoreResults.filter((r) => r.score >= 7 && r.score <= 8).reduce((s, r) => s + r.count, 0);
  const promoters = scoreResults.filter((r) => r.score >= 9).reduce((s, r) => s + r.count, 0);
  const total = detractors + neutrals + promoters;
  // Стандартная формула NPS: только промоутеры (9–10) и детракторы (0–6)
  const nps = total > 0 ? Math.round((promoters / total - detractors / total) * 100) : 0;

  const [negWithComment] = await db
    .select({ count: count() })
    .from(reviews)
    .where(and(...negativeConditions, sql`${reviews.comment} IS NOT NULL AND TRIM(${reviews.comment}) <> ''`));

  return {
    totalReviews: totalResult.count,
    nps,
    detractors,
    neutrals,
    promoters,
    negativesWithComment: negWithComment.count,
    scoreDistribution: scoreResults,
    negativeCategoryDistribution: negativeCategoryResults,
  };
}

export async function getNpsCalendar(projectId?: number) {
  const db = getDb();
  const conditions = [];
  if (projectId) conditions.push(eq(reviews.projectId, projectId));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select({
      year: reviews.year,
      month: reviews.month,
      total: count(),
      promoters: sql`SUM(CASE WHEN ${reviews.score} >= 9 THEN 1 ELSE 0 END)`,
      detractors: sql`SUM(CASE WHEN ${reviews.score} <= 6 THEN 1 ELSE 0 END)`,
    })
    .from(reviews)
    .where(whereClause)
    .groupBy(reviews.year, reviews.month)
    .orderBy(asc(reviews.year), asc(reviews.month));
  return rows.map((r) => ({
    year: r.year,
    month: r.month,
    total: r.total,
    promoters: Number(r.promoters),
    detractors: Number(r.detractors),
    nps: r.total > 0 ? Math.round(((Number(r.promoters) - Number(r.detractors)) / r.total) * 100) : 0,
  }));
}

export async function getProcessingStats(year?: number, month?: number) {
  const db = getDb();
  const conditions = [sql`${reviews.score} <= 8`];
  if (year) conditions.push(eq(reviews.year, year));
  if (month) conditions.push(eq(reviews.month, month));
  const whereClause = and(...conditions);
  const rows = await db
    .select({
      projectId: reviews.projectId,
      projectName: projects.name,
      negatives: count(),
      withComment: sql`SUM(CASE WHEN ${reviews.comment} IS NOT NULL AND TRIM(${reviews.comment}) <> '' THEN 1 ELSE 0 END)`,
      processed: sql`SUM(CASE WHEN EXISTS (SELECT 1 FROM review_comments rc WHERE rc.reviewId = ${reviews.id} AND rc.commentText IS NOT NULL AND TRIM(rc.commentText) <> '') THEN 1 ELSE 0 END)`,
    })
    .from(reviews)
    .innerJoin(projects, eq(reviews.projectId, projects.id))
    .where(whereClause)
    .groupBy(reviews.projectId, projects.name)
    .orderBy(desc(count()));
  const statusRows = await db
    .select({
      statusId: reviews.statusId,
      statusName: statuses.name,
      statusColor: statuses.color,
      count: count(),
    })
    .from(reviews)
    .leftJoin(statuses, eq(reviews.statusId, statuses.id))
    .where(whereClause)
    .groupBy(reviews.statusId, statuses.name, statuses.color)
    .orderBy(desc(count()));
  const totals = rows.reduce(
    (acc, r) => ({
      negatives: acc.negatives + r.negatives,
      withComment: acc.withComment + Number(r.withComment),
      processed: acc.processed + Number(r.processed),
    }),
    { negatives: 0, withComment: 0, processed: 0 }
  );
  return {
    byProject: rows.map((r) => ({
      projectId: r.projectId,
      projectName: r.projectName,
      negatives: r.negatives,
      withComment: Number(r.withComment),
      processed: Number(r.processed),
    })),
    byStatus: statusRows.map((r) => ({
      statusId: r.statusId,
      statusName: r.statusName ?? "Без статуса",
      statusColor: r.statusColor ?? "gray",
      count: r.count,
    })),
    totals,
  };
}

export async function setReviewStatus(reviewId: number, statusId: number) {
  const db = getDb();
  await db.update(reviews).set({ statusId }).where(eq(reviews.id, reviewId));
  return db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId),
    with: { status: true },
  });
}

export async function setReviewCategory(reviewId: number, category: string) {
  const db = getDb();
  await db.update(reviews).set({ category }).where(eq(reviews.id, reviewId));
  return { success: true };
}

export async function saveEditorialComment(reviewId: number, commentText: string, userId?: number | null) {
  const db = getDb();
  const existing = await db.query.reviewComments.findFirst({
    where: eq(reviewComments.reviewId, reviewId),
    orderBy: [desc(reviewComments.createdAt)],
  });
  if (existing) {
    await db.update(reviewComments).set({ commentText }).where(eq(reviewComments.id, existing.id));
    return db.query.reviewComments.findFirst({ where: eq(reviewComments.id, existing.id) });
  }
  const [result] = await db
    .insert(reviewComments)
    .values({ reviewId, commentText, userId: userId ?? null })
    .$returningId();
  return db.query.reviewComments.findFirst({ where: eq(reviewComments.id, result.id) });
}
