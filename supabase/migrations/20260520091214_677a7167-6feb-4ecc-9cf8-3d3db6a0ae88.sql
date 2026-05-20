UPDATE public.media_player_billboard_history h
SET uninstall_date = CURRENT_DATE::text,
    uninstall_reason = COALESCE(h.uninstall_reason, 'Auto-close: media_player no longer linked to this billboard')
FROM public.media_players mp
WHERE h.media_player_id = mp.id
  AND h.uninstall_date IS NULL
  AND (mp.billboard_id IS NULL OR mp.billboard_id <> h.billboard_id);