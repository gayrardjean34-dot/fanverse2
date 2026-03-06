ALTER TABLE "users" ADD COLUMN "unlocked_automations" json DEFAULT '[]';
ALTER TABLE "users" ADD COLUMN "free_unlock_used" boolean NOT NULL DEFAULT false;
