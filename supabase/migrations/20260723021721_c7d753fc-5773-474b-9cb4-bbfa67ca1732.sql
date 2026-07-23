
ALTER TABLE public.tool_images ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;
ALTER TABLE public.media_player_images ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;
ALTER TABLE public.equipment_images ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS tool_images_one_primary_per_tool
  ON public.tool_images (tool_id) WHERE is_primary;
CREATE UNIQUE INDEX IF NOT EXISTS media_player_images_one_primary_per_mp
  ON public.media_player_images (media_player_id) WHERE is_primary;
CREATE UNIQUE INDEX IF NOT EXISTS equipment_images_one_primary_per_eq
  ON public.equipment_images (equipment_id) WHERE is_primary;
