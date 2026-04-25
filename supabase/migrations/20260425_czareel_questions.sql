-- =====================================================
-- Czareel AI Questions Migration
-- =====================================================
-- Adds columns for storing AI-generated questions and user answers

ALTER TABLE public.czareels
  ADD COLUMN IF NOT EXISTS question_1 TEXT,
  ADD COLUMN IF NOT EXISTS question_2 TEXT,
  ADD COLUMN IF NOT EXISTS question_3 TEXT,
  ADD COLUMN IF NOT EXISTS answer_1 TEXT,
  ADD COLUMN IF NOT EXISTS answer_2 TEXT,
  ADD COLUMN IF NOT EXISTS answer_3 TEXT,
  ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON COLUMN public.czareels.question_1 IS 'AI-generated first question about the video';
COMMENT ON COLUMN public.czareels.question_2 IS 'AI-generated second question about the video';
COMMENT ON COLUMN public.czareels.question_3 IS 'AI-generated third question about the video';
COMMENT ON COLUMN public.czareels.answer_1 IS 'User answer to first question (max 500 chars)';
COMMENT ON COLUMN public.czareels.answer_2 IS 'User answer to second question (max 500 chars)';
COMMENT ON COLUMN public.czareels.answer_3 IS 'User answer to third question (max 500 chars)';
COMMENT ON COLUMN public.czareels.ai_feedback IS 'AI feedback and suggestions on user answers';
