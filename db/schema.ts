import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  mysqlEnum,
  bigint,
  int,
  index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const projects = mysqlTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
  },
  (t) => ({ nameIdx: index("project_name_idx").on(t.name) })
);

export const userProjects = mysqlTable(
  "user_projects",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
  },
  (t) => ({
    userIdx: index("up_user_idx").on(t.userId),
    projectIdx: index("up_project_idx").on(t.projectId),
  })
);

export const statuses = mysqlTable(
  "statuses",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    color: varchar("color", { length: 20 }).default("gray").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    isDefault: int("isDefault").default(0).notNull(), // 1 = статус по умолчанию для новых отзывов
  },
  (t) => ({ nameIdx: index("status_name_idx").on(t.name) })
);

export const categoryRules = mysqlTable(
  "category_rules",
  {
    id: serial("id").primaryKey(),
    pattern: varchar("pattern", { length: 255 }).notNull(),
    category: varchar("category", { length: 255 }).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(), // меньше = проверяется раньше
  },
  (t) => ({ catIdx: index("rule_category_idx").on(t.category) })
);

export const reviews = mysqlTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
    client: varchar("client", { length: 512 }),
    date: timestamp("date").notNull(),
    edition: varchar("edition", { length: 255 }),
    score: int("score").notNull(),
    comment: text("comment"),
    category: varchar("category", { length: 255 }),
    scoreType: mysqlEnum("scoreType", ["detractor", "neutral", "promoter"]).notNull(),
    statusId: bigint("statusId", { mode: "number", unsigned: true }),
    year: int("year").notNull(),
    month: int("month").notNull(),
    importedAt: timestamp("importedAt").defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("review_project_idx").on(t.projectId),
    dateIdx: index("review_date_idx").on(t.date),
    scoreIdx: index("review_score_idx").on(t.score),
    categoryIdx: index("review_category_idx").on(t.category),
    scoreTypeIdx: index("review_scoreType_idx").on(t.scoreType),
    statusIdx: index("review_status_idx").on(t.statusId),
    yearMonthIdx: index("review_year_month_idx").on(t.year, t.month),
  })
);

export const reviewComments = mysqlTable(
  "review_comments",
  {
    id: serial("id").primaryKey(),
    reviewId: bigint("reviewId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }),
    commentText: text("commentText"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (t) => ({ reviewIdx: index("rc_review_idx").on(t.reviewId) })
);

export const usersRelations = relations(users, ({ many }) => ({
  userProjects: many(userProjects),
  reviewComments: many(reviewComments),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  reviews: many(reviews),
  userProjects: many(userProjects),
}));

export const userProjectsRelations = relations(userProjects, ({ one }) => ({
  user: one(users, { fields: [userProjects.userId], references: [users.id] }),
  project: one(projects, { fields: [userProjects.projectId], references: [projects.id] }),
}));

export const statusesRelations = relations(statuses, ({ many }) => ({
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  project: one(projects, { fields: [reviews.projectId], references: [projects.id] }),
  status: one(statuses, { fields: [reviews.statusId], references: [statuses.id] }),
  comments: many(reviewComments),
}));

export const reviewCommentsRelations = relations(reviewComments, ({ one }) => ({
  review: one(reviews, { fields: [reviewComments.reviewId], references: [reviews.id] }),
  user: one(users, { fields: [reviewComments.userId], references: [users.id] }),
}));
