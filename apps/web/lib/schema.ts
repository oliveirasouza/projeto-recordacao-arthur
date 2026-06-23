import { pgTable, text, timestamp, integer, primaryKey, serial, customType } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { randomUUID } from "crypto"

// Custom column type for binary data (bytea)
export const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea"
  },
  toDriver(value: Buffer) {
    return value
  },
  fromDriver(value: unknown) {
    if (Buffer.isBuffer(value)) {
      return value
    }
    return Buffer.from(value as any)
  },
})

// NextAuth.js v5 compatibility tables
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // e.g. "oauth"
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    {
      compoundKey: primaryKey({
        columns: [account.provider, account.providerAccountId],
      }),
    },
  ]
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    {
      compositePk: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ]
)

// Custom tables for moments and frames
export const frames = pgTable("frame", {
  id: text("id").primaryKey(), // 'gold', 'polaroid', 'soccer'
  name: text("name").notNull(),
  borderClass: text("borderClass").notNull(),
})

export const moments = pgTable("moment", {
  id: serial("id").primaryKey(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
  mediaUrl: text("mediaUrl").notNull(),
  type: text("type").notNull(), // 'image' | 'video'
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  caption: text("caption"), // legenda / frase_motivacional
  frameId: text("frameId").references(() => frames.id),
  category: text("category"),
  dreamCategory: text("dream_category"),
  duration: text("duration"),
})

export const mediaFiles = pgTable("media_file", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  filename: text("filename").notNull(),
  mimetype: text("mimetype").notNull(),
  data: bytea("data").notNull(),
  status: text("status").default("ready").notNull(), // 'ready' | 'processing' | 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Relational mapping helpers for query builders
export const usersRelations = relations(users, ({ many }) => ({
  moments: many(moments),
}))

export const momentsRelations = relations(moments, ({ one }) => ({
  user: one(users, { fields: [moments.userId], references: [users.id] }),
  frame: one(frames, { fields: [moments.frameId], references: [frames.id] }),
}))

export const framesRelations = relations(frames, ({ many }) => ({
  moments: many(moments),
}))
