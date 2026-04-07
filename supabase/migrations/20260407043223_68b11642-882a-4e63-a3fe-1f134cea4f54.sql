
-- Fix PlayerA clones: MP 0002, MP 0003 → MP 0001
UPDATE public.media_players SET code = 'MP 0001' WHERE id IN ('bb926b53-04de-4c75-ae8f-94cd623e9c24', '5c87dd33-1282-45a7-8c71-a4481bd44d04');

-- Fix goods_receipt_pending for PlayerA
UPDATE public.goods_receipt_pending SET equipment_code = 'MP 0001' WHERE media_player_id IN ('bb926b53-04de-4c75-ae8f-94cd623e9c24', '5c87dd33-1282-45a7-8c71-a4481bd44d04');

-- Fix Media Player clones: MP-POOK 0002, 0003 → MP-POOK 0001
UPDATE public.media_players SET code = 'MP-POOK 0001' WHERE id IN ('1023050b-5027-4d1a-b9f5-097ef95678a4', '8dd9adf2-f854-420e-9b6c-0650749db38e');
UPDATE public.goods_receipt_pending SET equipment_code = 'MP-POOK 0001' WHERE media_player_id IN ('1023050b-5027-4d1a-b9f5-097ef95678a4', '8dd9adf2-f854-420e-9b6c-0650749db38e');

-- Fix MPDGT clones: 0026, 0027 → MPDGT 0025
UPDATE public.media_players SET code = 'MPDGT 0025' WHERE id IN ('1a4d916b-a8a7-4cd9-9065-5129434df783', 'c4a4dc44-7a5f-477d-b3d0-1f43b23d05a0');
UPDATE public.goods_receipt_pending SET equipment_code = 'MPDGT 0025' WHERE media_player_id IN ('1a4d916b-a8a7-4cd9-9065-5129434df783', 'c4a4dc44-7a5f-477d-b3d0-1f43b23d05a0');
