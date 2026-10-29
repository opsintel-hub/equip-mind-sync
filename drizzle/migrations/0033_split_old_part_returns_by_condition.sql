DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.submit_issue_return_v2(uuid,integer,integer,integer,jsonb,integer,text,text,text[],text[],text[],text[],uuid,text,uuid)'::regprocedure);
 IF position('GROUP BY x->>''kind'',x->>''id'' HAVING count(*)>1' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected old-part duplicate guard'; END IF;
 definition := replace(definition,
 'GROUP BY x->>''kind'',x->>''id'' HAVING count(*)>1',
 'GROUP BY x->>''kind'',x->>''id'',x->>''condition'' HAVING count(*)>1');
 definition := replace(definition,
 'n>(candidate->>''quantity'')::integer',
 '(SELECT sum((x->>''quantity'')::integer) FROM jsonb_array_elements(_old_parts) x WHERE x->>''kind''=a->>''kind'' AND x->>''id''=a->>''id'')>(candidate->>''quantity'')::integer');
 definition := replace(definition,
 'old_total:=old_total+n;',
 'IF (a->>''kind''=''media_player'' OR coalesce(candidate->>''serial_number'','''')<>'''') AND ((SELECT count(*) FROM jsonb_array_elements(_old_parts) x WHERE x->>''kind''=a->>''kind'' AND x->>''id''=a->>''id'')>1 OR n<>(candidate->>''quantity'')::integer) THEN RAISE EXCEPTION ''อุปกรณ์มี S/N ต้องคืนทั้งรายการในสภาพเดียว''; END IF;
 old_total:=old_total+n;');
 EXECUTE definition;
END;
$migration$;