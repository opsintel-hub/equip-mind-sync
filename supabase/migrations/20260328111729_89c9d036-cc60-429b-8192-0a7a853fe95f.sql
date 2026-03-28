-- Fix serial_number_1 for MMM 0001 (KSA7179649), MMM 0004 (KSA7179652), MMM 0005 (KSA7179651)
UPDATE public.media_players SET serial_number_1 = 'KSA7179649' WHERE id = 'bdc4fff1-aa75-44d7-b50b-6205b76e0d49';
UPDATE public.media_players SET serial_number_1 = 'KSA7179652' WHERE id = '3de50945-7cce-4067-b07c-41a8edfe1d54';
UPDATE public.media_players SET serial_number_1 = 'KSA7179651' WHERE id = 'eb1638c6-5a3f-4d77-a762-e0e265182cda';