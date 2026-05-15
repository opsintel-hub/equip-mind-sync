-- Repair swap SWP-20260515-0004 history inconsistency:
-- T3-0001 (old) should be uninstalled; T3-0004 (spare) should be currently installed.
UPDATE public.media_player_billboard_history
SET uninstall_date = '2026-05-15',
    uninstall_reason = 'Swap SWP-20260515-0004 (data repair)',
    return_to_stock = true
WHERE id = '6c38c50c-79f0-4125-8774-e2ca9abe83db'
  AND uninstall_date IS NULL;

UPDATE public.media_player_billboard_history
SET uninstall_date = NULL,
    uninstall_reason = NULL,
    return_to_stock = false
WHERE id = '340252fd-75b7-4462-8f0a-8b118cad19ac';

-- Clean up any orphan billboard_equipment row for the OLD media player on this billboard
DELETE FROM public.billboard_equipment
WHERE billboard_id = '4fa13081-67ef-47f4-b2fd-929b1c2fc54a'
  AND equipment_id = '4a01394d-a54e-4b60-b677-9981496b06d6';