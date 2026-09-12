/**
 * DAAT Platform — Unified Database Schema
 * Combines RUACH + NESHER + CHAYYIM models
 */

import {
  pgTable, uuid, text, integer, real,
  jsonb, timestamp, boolean, varchar,
  index, pgEnum
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ── Enums ────────────────────────────────────────────────── */
export const blockStatusEnum = pgEnum("block_status", [
  "idle", "connecting", "live", "error", "offline", "reconnecting",
]);

export const brainStateEnum = pgEnum("brain_state", [
  "deep_sleep", "meditation", "relaxed", "focused",
  "peak_cognition", "unknown",
]);

export const dominantBandEnum = pgEnum("dominant_band", [
  "delta", "theta", "alpha", "beta", "gamma",
]);

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "signal_capture", "fft_analysis", "band_extraction",
  "pattern_detect", "block_update", "ai_analysis",
  "memory_store", "response_gen", "broadcast", "complete",
]);

export const llmProviderEnum = pgEnum("llm_provider", [
  "openai", "anthropic", "cohere", "local",
]);

/* ══════════════════════════════════════════════════════════ */
/* USERS — Core identity                                       */
/* ══════════════════════════════════════════════════════════ */
export const users = pgTable("users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  clerkId:      text("clerk_id").notNull().unique(),
  email:        text("email").notNull().unique(),
  name:         text("name"),
  plan:         text("plan").notNull().default("spark"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
  metadata:     jsonb("metadata").default({}),
}, (t) => ({
  clerkIdx: index("users_clerk_idx").on(t.clerkId),
}));

/* ══════════════════════════════════════════════════════════ */
/* RUACH — AI Memory & Sessions                               */
/* ══════════════════════════════════════════════════════════ */
export const aiSessions = pgTable("ai_sessions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:        text("title"),
  model:        text("model").notNull().default("gpt-4o"),
  provider:     llmProviderEnum("provider").notNull().default("openai"),
  totalTokens:  integer("total_tokens").default(0),
  totalCost:    real("total_cost").default(0),
  isActive:     boolean("is_active").default(true),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("ai_sessions_user_idx").on(t.userId),
}));

export const aiMessages = pgTable("ai_messages", {
  id:           uuid("id").primaryKey().defaultRandom(),
  sessionId:    uuid("session_id").notNull().references(() => aiSessions.id, { onDelete: "cascade" }),
  role:         text("role").notNull(),             // user | assistant | system
  content:      text("content").notNull(),
  model:        text("model"),
  tokens:       integer("tokens").default(0),
  latencyMs:    real("latency_ms"),
  pluginsUsed:  jsonb("plugins_used").default([]),
  metadata:     jsonb("metadata").default({}),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index("ai_messages_session_idx").on(t.sessionId),
}));

export const aiMemory = pgTable("ai_memory", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type:         text("type").notNull(),             // episodic | semantic | neural_session
  content:      text("content").notNull(),
  embedding:    jsonb("embedding"),                 // Vector embedding
  tags:         text("tags").array().default([]),
  importance:   real("importance").default(0.5),
  accessCount:  integer("access_count").default(0),
  lastAccessed: timestamp("last_accessed"),
  expiresAt:    timestamp("expires_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("ai_memory_user_idx").on(t.userId),
  tagsIdx: index("ai_memory_tags_idx").on(t.tags),
}));

/* ══════════════════════════════════════════════════════════ */
/* NESHER — Neural Sessions & Signals                         */
/* ══════════════════════════════════════════════════════════ */
export const neuralSessions = pgTable("neural_sessions", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId:       text("device_id"),
  channelCount:   integer("channel_count").notNull().default(32),
  sampleRate:     integer("sample_rate").notNull().default(256),
  durationSecs:   real("duration_secs"),
  brainState:     brainStateEnum("brain_state"),
  dominantBand:   dominantBandEnum("dominant_band"),
  isActive:       boolean("is_active").default(true),
  startedAt:      timestamp("started_at").defaultNow().notNull(),
  endedAt:        timestamp("ended_at"),
  metadata:       jsonb("metadata").default({}),
}, (t) => ({
  userIdx: index("neural_sessions_user_idx").on(t.userId),
}));

export const neuralSnapshots = pgTable("neural_snapshots", {
  id:             uuid("id").primaryKey().defaultRandom(),
  sessionId:      uuid("session_id").notNull().references(() => neuralSessions.id, { onDelete: "cascade" }),
  timestamp:      real("timestamp").notNull(),
  brainState:     brainStateEnum("brain_state"),
  dominantBand:   dominantBandEnum("dominant_band"),

  // Band powers
  deltaPower:     real("delta_power"),
  thetaPower:     real("theta_power"),
  alphaPower:     real("alpha_power"),
  betaPower:      real("beta_power"),
  gammaPower:     real("gamma_power"),

  // Derived metrics
  cognitiveLoad:  real("cognitive_load"),
  attentionIndex: real("attention_index"),
  stressLevel:    real("stress_level"),

  // Raw + processed
  rawData:        jsonb("raw_data"),
  electrodeMap:   jsonb("electrode_map").default({}),
  anomalies:      jsonb("anomalies").default([]),
  patterns:       jsonb("patterns").default({}),

  createdAt:      timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index("neural_snapshots_session_idx").on(t.sessionId),
  tsIdx:      index("neural_snapshots_ts_idx").on(t.timestamp),
}));

/* ══════════════════════════════════════════════════════════ */
/* CHAYYIM — Live Blocks & WebSocket Events                   */
/* ══════════════════════════════════════════════════════════ */
export const liveBlocks = pgTable("live_blocks", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:          text("title").notNull(),
  content:        text("content").notNull().default(""),
  status:         blockStatusEnum("status").notNull().default("idle"),
  version:        integer("version").notNull().default(0),
  latencyMs:      real("latency_ms").default(0),
  wsConnections:  integer("ws_connections").default(0),
  isPublic:       boolean("is_public").default(false),
  metadata:       jsonb("metadata").default({}),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx:   index("live_blocks_user_idx").on(t.userId),
  statusIdx: index("live_blocks_status_idx").on(t.status),
}));

export const blockEvents = pgTable("block_events", {
  id:          uuid("id").primaryKey().defaultRandom(),
  blockId:     uuid("block_id").notNull().references(() => liveBlocks.id, { onDelete: "cascade" }),
  type:        text("type").notNull(),
  payload:     jsonb("payload").notNull().default({}),
  version:     integer("version").notNull(),
  latencyMs:   real("latency_ms"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  blockIdx:   index("block_events_block_idx").on(t.blockId),
  versionIdx: index("block_events_version_idx").on(t.version),
}));

/* ══════════════════════════════════════════════════════════ */
/* DAAT — Unified Pipeline Sessions                           */
/* ══════════════════════════════════════════════════════════ */
export const daatSessions = pgTable("daat_sessions", {
  id:              uuid("id").primaryKey().defaultRandom(),
  userId:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Links to all 3 systems
  aiSessionId:     uuid("ai_session_id").references(() => aiSessions.id),
  neuralSessionId: uuid("neural_session_id").references(() => neuralSessions.id),
  blockId:         uuid("block_id").references(() => liveBlocks.id),

  // Pipeline state
  currentStage:    pipelineStageEnum("current_stage").default("signal_capture"),
  stagesComplete:  text("stages_complete").array().default([]),
  errors:          jsonb("errors").default([]),

  // Summary metrics
  totalPackets:    integer("total_packets").default(0),
  avgLatencyMs:    real("avg_latency_ms").default(0),
  dominantBand:    dominantBandEnum("dominant_band"),
  brainState:      brainStateEnum("brain_state"),
  aiInsightsCount: integer("ai_insights_count").default(0),

  isActive:        boolean("is_active").default(true),
  startedAt:       timestamp("started_at").defaultNow().notNull(),
  endedAt:         timestamp("ended_at"),
  metadata:        jsonb("metadata").default({}),
}, (t) => ({
  userIdx:    index("daat_sessions_user_idx").on(t.userId),
  activeIdx:  index("daat_sessions_active_idx").on(t.isActive),
}));

export const daatPacketLog = pgTable("daat_packet_log", {
  id:             uuid("id").primaryKey().defaultRandom(),
  daatSessionId:  uuid("daat_session_id").notNull()
                    .references(() => daatSessions.id, { onDelete: "cascade" }),
  packetId:       varchar("packet_id", { length: 64 }).notNull(),

  // NESHER data snapshot
  brainState:     brainStateEnum("brain_state"),
  dominantBand:   dominantBandEnum("dominant_band"),
  bandPowers:     jsonb("band_powers").default({}),
  cognitiveLoad:  real("cognitive_load"),
  attentionIndex: real("attention_index"),

  // CHAYYIM data snapshot
  blockVersion:   integer("block_version"),
  blockStatus:    blockStatusEnum("block_status"),
  blockLatencyMs: real("block_latency_ms"),

  // RUACH data snapshot
  aiPrompt:       text("ai_prompt"),
  aiResponse:     text("ai_response"),
  modelUsed:      text("model_used"),
  pluginsUsed:    jsonb("plugins_used").default([]),

  // Pipeline meta
  stagesComplete: text("stages_complete").array().default([]),
  errors:         jsonb("errors").default([]),
  totalLatencyMs: real("total_latency_ms"),

  createdAt:      timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index("daat_packet_session_idx").on(t.daatSessionId),
  packetIdx:  index("daat_packet_id_idx").on(t.packetId),
}));

/* ── Collaborators (shared across all projects) ───────────── */
export const collaborators = pgTable("collaborators", {
  id:         uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").notNull(),
  resourceType: text("resource_type").notNull(), // ai_session|neural_session|live_block|daat_session
  userId:     uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:       text("role").notNull().default("viewer"),
  invitedBy:  uuid("invited_by").references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  resourceIdx: index("collaborators_resource_idx").on(t.resourceId),
  userIdx:     index("collaborators_user_idx").on(t.userId),
}));

/* ── Relations ────────────────────────────────────────────── */
export const usersRelations = relations(users, ({ many }) => ({
  aiSessions:     many(aiSessions),
  neuralSessions: many(neuralSessions),
  liveBlocks:     many(liveBlocks),
  daatSessions:   many(daatSessions),
  memory:         many(aiMemory),
}));

export const daatSessionsRelations = relations(daatSessions, ({ one, many }) => ({
  user:          one(users,          { fields: [daatSessions.userId],         references: [users.id]          }),
  aiSession:     one(aiSessions,     { fields: [daatSessions.aiSessionId],    references: [aiSessions.id]     }),
  neuralSession: one(neuralSessions, { fields: [daatSessions.neuralSessionId],references: [neuralSessions.id] }),
  block:         one(liveBlocks,     { fields: [daatSessions.blockId],        references: [liveBlocks.id]     }),
  packetLog:     many(daatPacketLog),
}));

export const neuralSessionsRelations = relations(neuralSessions, ({ one, many }) => ({
  user:      one(users,             { fields: [neuralSessions.userId],    references: [users.id] }),
  snapshots: many(neuralSnapshots),
}));

export const liveBlocksRelations = relations(liveBlocks, ({ one, many }) => ({
  user:   one(users,        { fields: [liveBlocks.userId],  references: [users.id] }),
  events: many(blockEvents),
}));

export const aiSessionsRelations = relations(aiSessions, ({ one, many }) => ({
  user:     one(users,       { fields: [aiSessions.userId], references: [users.id] }),
  messages: many(aiMessages),
}));