import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  createProject,
  createStatus,
  deleteStatus,
  getDashboardStats,
  getNpsCalendar,
  getProcessingStats,
  getProjectById,
  getProjects,
  getReviewById,
  getReviewCategories,
  getReviews,
  getStatuses,
  saveEditorialComment,
  setReviewCategory,
  setReviewStatus,
  updateStatus,
} from "./queries/reviews";
import { createCategoryRule, deleteCategoryRule, getCategoryRules, reclassifyReviews } from "./queries/rules";

export const projectsRouter = createRouter({
  list: publicQuery.query(() => getProjects()),
  getById: publicQuery.input(z.object({ id: z.number() })).query(({ input }) => getProjectById(input.id)),
  create: publicQuery.input(z.object({ name: z.string().min(1) })).mutation(({ input }) => createProject(input.name)),
});

export const statusesRouter = createRouter({
  list: publicQuery.query(() => getStatuses()),
  create: publicQuery
    .input(z.object({ name: z.string().min(1), color: z.string().optional(), sortOrder: z.number().optional(), isDefault: z.number().optional() }))
    .mutation(({ input }) => createStatus(input)),
  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
        isDefault: z.number().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateStatus(id, data);
    }),
  delete: publicQuery.input(z.object({ id: z.number() })).mutation(({ input }) => deleteStatus(input.id)),
});

export const categoryRulesRouter = createRouter({
  list: publicQuery.query(() => getCategoryRules()),
  create: publicQuery
    .input(z.object({ pattern: z.string().min(1), category: z.string().min(1), sortOrder: z.number().optional() }))
    .mutation(({ input }) => createCategoryRule(input)),
  delete: publicQuery.input(z.object({ id: z.number() })).mutation(({ input }) => deleteCategoryRule(input.id)),
  reclassify: publicQuery.mutation(() => reclassifyReviews()),
});

export const reviewsRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          projectId: z.number().optional(),
          year: z.number().optional(),
          month: z.number().optional(),
          months: z.array(z.string()).optional(),
          scoreType: z.string().optional(),
          scoreTypes: z.array(z.string()).optional(),
          category: z.string().optional(),
          score: z.number().optional(),
          statusId: z.number().optional(),
          hasComment: z.boolean().optional(),
          hasEditorial: z.boolean().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(500).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(({ input }) => getReviews(input || {})),
  getById: publicQuery.input(z.object({ id: z.number() })).query(({ input }) => getReviewById(input.id)),
  categories: publicQuery.query(() => getReviewCategories()),
  stats: publicQuery
    .input(z.object({ projectId: z.number().optional(), year: z.number().optional(), month: z.number().optional() }).optional())
    .query(({ input }) => getDashboardStats(input?.projectId, input?.year, input?.month)),
  calendar: publicQuery.input(z.object({ projectId: z.number().optional() }).optional()).query(({ input }) => getNpsCalendar(input?.projectId)),
  processingStats: publicQuery
    .input(z.object({ year: z.number().optional(), month: z.number().optional() }).optional())
    .query(({ input }) => getProcessingStats(input?.year, input?.month)),
  setStatus: publicQuery
    .input(z.object({ reviewId: z.number(), statusId: z.number() }))
    .mutation(({ input, ctx }) => setReviewStatus(input.reviewId, input.statusId)),
  setCategory: publicQuery
    .input(z.object({ reviewId: z.number(), category: z.string().min(1) }))
    .mutation(({ input }) => setReviewCategory(input.reviewId, input.category)),
  saveEditorial: publicQuery
    .input(z.object({ reviewId: z.number(), commentText: z.string() }))
    .mutation(({ input, ctx }) => saveEditorialComment(input.reviewId, input.commentText, ctx.user?.id)),
});
