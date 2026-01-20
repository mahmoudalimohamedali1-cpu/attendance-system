-- CreateEnum: PostType
DO $$ BEGIN
    CREATE TYPE "PostType" AS ENUM ('POST', 'ANNOUNCEMENT', 'PROMOTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: PostStatus
DO $$ BEGIN
    CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'ARCHIVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: VisibilityType
DO $$ BEGIN
    CREATE TYPE "VisibilityType" AS ENUM ('PUBLIC', 'DEPARTMENT', 'TEAM', 'TARGETED', 'MANAGERS_ONLY', 'HR_ONLY', 'PRIVATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: TargetType
DO $$ BEGIN
    CREATE TYPE "TargetType" AS ENUM ('BRANCH', 'DEPARTMENT', 'TEAM', 'USER', 'ROLE', 'JOB_TITLE', 'GRADE', 'CONTRACT_TYPE', 'SHIFT', 'LOCATION', 'TAG');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: MentionType
DO $$ BEGIN
    CREATE TYPE "MentionType" AS ENUM ('USER', 'TEAM', 'DEPARTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: EventType
DO $$ BEGIN
    CREATE TYPE "EventType" AS ENUM ('MEETING', 'INTERVIEW', 'PAYROLL', 'HOLIDAY', 'DEADLINE', 'ANNOUNCEMENT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: EventStatus
DO $$ BEGIN
    CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'DONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: RSVPStatus
DO $$ BEGIN
    CREATE TYPE "RSVPStatus" AS ENUM ('INVITED', 'GOING', 'MAYBE', 'DECLINED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: posts
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'POST',
    "title" TEXT,
    "title_en" TEXT,
    "content" TEXT NOT NULL,
    "content_en" TEXT,
    "visibility_type" "VisibilityType" NOT NULL DEFAULT 'PUBLIC',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_until" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "require_acknowledge" BOOLEAN NOT NULL DEFAULT false,
    "hide_after_acknowledge" BOOLEAN NOT NULL DEFAULT false,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "reach_count" INTEGER NOT NULL DEFAULT 0,
    "impression_count" INTEGER NOT NULL DEFAULT 0,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "max_impressions" INTEGER,
    "promoted_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_targets
CREATE TABLE "post_targets" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "target_type" "TargetType" NOT NULL,
    "target_value" TEXT NOT NULL,
    "is_exclusion" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_reactions
CREATE TABLE "post_reactions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_comments
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_mentions
CREATE TABLE "post_mentions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "mention_type" "MentionType" NOT NULL,
    "mention_id" TEXT NOT NULL,
    "start_index" INTEGER,
    "end_index" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_views
CREATE TABLE "post_views" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "device_type" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "post_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_impressions
CREATE TABLE "post_impressions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT,
    "impressed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "position" INTEGER,
    "device_type" TEXT,
    "session_id" TEXT,

    CONSTRAINT "post_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_acknowledges
CREATE TABLE "post_acknowledges" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_type" TEXT,
    "ip_address" TEXT,
    "note" TEXT,

    CONSTRAINT "post_acknowledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable: post_attachments
CREATE TABLE "post_attachments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "thumbnail_url" TEXT,
    "alt_text" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: events
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_en" TEXT,
    "description" TEXT,
    "description_en" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "location" TEXT,
    "meeting_link" TEXT,
    "event_type" "EventType" NOT NULL DEFAULT 'MEETING',
    "visibility_type" "VisibilityType" NOT NULL DEFAULT 'PUBLIC',
    "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: event_attendees
CREATE TABLE "event_attendees" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rsvp_status" "RSVPStatus" NOT NULL DEFAULT 'INVITED',
    "responded_at" TIMESTAMP(3),
    "note" TEXT,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable: event_targets
CREATE TABLE "event_targets" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "target_type" "TargetType" NOT NULL,
    "target_value" TEXT NOT NULL,
    "is_exclusion" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: posts indexes
CREATE INDEX "posts_company_id_status_published_at_idx" ON "posts"("company_id", "status", "published_at");
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");
CREATE INDEX "posts_company_id_is_pinned_idx" ON "posts"("company_id", "is_pinned");

-- CreateIndex: post_targets indexes
CREATE INDEX "post_targets_post_id_idx" ON "post_targets"("post_id");
CREATE INDEX "post_targets_target_type_target_value_idx" ON "post_targets"("target_type", "target_value");

-- CreateIndex: post_reactions indexes
CREATE UNIQUE INDEX "post_reactions_post_id_user_id_emoji_key" ON "post_reactions"("post_id", "user_id", "emoji");
CREATE INDEX "post_reactions_post_id_idx" ON "post_reactions"("post_id");
CREATE INDEX "post_reactions_user_id_idx" ON "post_reactions"("user_id");

-- CreateIndex: post_comments indexes
CREATE INDEX "post_comments_post_id_idx" ON "post_comments"("post_id");
CREATE INDEX "post_comments_author_id_idx" ON "post_comments"("author_id");
CREATE INDEX "post_comments_parent_id_idx" ON "post_comments"("parent_id");

-- CreateIndex: post_mentions indexes
CREATE INDEX "post_mentions_post_id_idx" ON "post_mentions"("post_id");
CREATE INDEX "post_mentions_mention_type_mention_id_idx" ON "post_mentions"("mention_type", "mention_id");

-- CreateIndex: post_views indexes
CREATE UNIQUE INDEX "post_views_post_id_user_id_key" ON "post_views"("post_id", "user_id");
CREATE INDEX "post_views_post_id_idx" ON "post_views"("post_id");
CREATE INDEX "post_views_user_id_idx" ON "post_views"("user_id");
CREATE INDEX "post_views_viewed_at_idx" ON "post_views"("viewed_at");

-- CreateIndex: post_impressions indexes
CREATE INDEX "post_impressions_post_id_idx" ON "post_impressions"("post_id");
CREATE INDEX "post_impressions_user_id_idx" ON "post_impressions"("user_id");
CREATE INDEX "post_impressions_impressed_at_idx" ON "post_impressions"("impressed_at");
CREATE INDEX "post_impressions_source_idx" ON "post_impressions"("source");

-- CreateIndex: post_acknowledges indexes
CREATE UNIQUE INDEX "post_acknowledges_post_id_user_id_key" ON "post_acknowledges"("post_id", "user_id");
CREATE INDEX "post_acknowledges_post_id_idx" ON "post_acknowledges"("post_id");
CREATE INDEX "post_acknowledges_user_id_idx" ON "post_acknowledges"("user_id");
CREATE INDEX "post_acknowledges_acknowledged_at_idx" ON "post_acknowledges"("acknowledged_at");

-- CreateIndex: post_attachments indexes
CREATE INDEX "post_attachments_post_id_idx" ON "post_attachments"("post_id");
CREATE INDEX "post_attachments_file_type_idx" ON "post_attachments"("file_type");

-- CreateIndex: events indexes
CREATE INDEX "events_company_id_start_at_idx" ON "events"("company_id", "start_at");
CREATE INDEX "events_company_id_status_idx" ON "events"("company_id", "status");
CREATE INDEX "events_creator_id_idx" ON "events"("creator_id");

-- CreateIndex: event_attendees indexes
CREATE UNIQUE INDEX "event_attendees_event_id_user_id_key" ON "event_attendees"("event_id", "user_id");
CREATE INDEX "event_attendees_event_id_idx" ON "event_attendees"("event_id");
CREATE INDEX "event_attendees_user_id_idx" ON "event_attendees"("user_id");
CREATE INDEX "event_attendees_rsvp_status_idx" ON "event_attendees"("rsvp_status");

-- CreateIndex: event_targets indexes
CREATE INDEX "event_targets_event_id_idx" ON "event_targets"("event_id");
CREATE INDEX "event_targets_target_type_target_value_idx" ON "event_targets"("target_type", "target_value");

-- AddForeignKey: posts
ALTER TABLE "posts" ADD CONSTRAINT "posts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: post_targets
ALTER TABLE "post_targets" ADD CONSTRAINT "post_targets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: post_reactions
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: post_comments
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: post_mentions
ALTER TABLE "post_mentions" ADD CONSTRAINT "post_mentions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: post_views
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: post_impressions
ALTER TABLE "post_impressions" ADD CONSTRAINT "post_impressions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_impressions" ADD CONSTRAINT "post_impressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: post_acknowledges
ALTER TABLE "post_acknowledges" ADD CONSTRAINT "post_acknowledges_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_acknowledges" ADD CONSTRAINT "post_acknowledges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: post_attachments
ALTER TABLE "post_attachments" ADD CONSTRAINT "post_attachments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: events
ALTER TABLE "events" ADD CONSTRAINT "events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: event_attendees
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: event_targets
ALTER TABLE "event_targets" ADD CONSTRAINT "event_targets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
