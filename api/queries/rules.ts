import { and, asc, eq, or, sql } from "drizzle-orm";
import { getDb } from "./connection";
import { categoryRules, reviews } from "../../db/schema";
import { classify } from "./import";

export const FALLBACK_CATEGORY = "Общее недовольство";

export async function getCategoryRules() {
  return getDb().select().from(categoryRules).orderBy(asc(categoryRules.sortOrder), asc(categoryRules.id));
}

export async function createCategoryRule(data: { pattern: string; category: string; sortOrder?: number }) {
  const db = getDb();
  const [result] = await db
    .insert(categoryRules)
    .values({ pattern: data.pattern.toLowerCase().trim(), category: data.category.trim(), sortOrder: data.sortOrder ?? 100 })
    .$returningId();
  return db.query.categoryRules.findFirst({ where: eq(categoryRules.id, result.id) });
}

export async function deleteCategoryRule(id: number) {
  await getDb().delete(categoryRules).where(eq(categoryRules.id, id));
  return { success: true };
}

// Переклассификация: все отзывы 0–8 без категории или с фолбэк-категорией
export async function reclassifyReviews() {
  const db = getDb();
  const rules = await getCategoryRules();
  const rows = await db
    .select({ id: reviews.id, comment: reviews.comment, scoreType: reviews.scoreType })
    .from(reviews)
    .where(
      and(
        sql`${reviews.score} <= 8`,
        or(eq(reviews.category, FALLBACK_CATEGORY), sql`${reviews.category} IS NULL`, eq(reviews.category, ""))
      )
    );
  let changed = 0;
  for (const r of rows) {
    const cat = classify(r.comment, r.scoreType, rules);
    if (cat && cat !== FALLBACK_CATEGORY) {
      await db.update(reviews).set({ category: cat }).where(eq(reviews.id, r.id));
      changed++;
    }
  }
  return { checked: rows.length, changed, remaining: rows.length - changed };
}
