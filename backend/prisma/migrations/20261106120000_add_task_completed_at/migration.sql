-- Adds a nullable completion time. Existing rows keep NULL: their real completion
-- time was never stored, so none is invented here.
ALTER TABLE "tasks" ADD COLUMN "completed_at" TIMESTAMP(3);
