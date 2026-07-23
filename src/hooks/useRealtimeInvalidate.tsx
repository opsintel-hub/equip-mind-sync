import { useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type EventType = "INSERT" | "UPDATE" | "DELETE" | "*";

interface Options {
  /** ตารางใน public schema ที่ต้องการฟัง */
  table: string;
  /** Events ที่ต้องการฟัง (default: '*') */
  event?: EventType;
  /** QueryKey ที่จะ invalidate เมื่อมี event เข้ามา (จะ refetch แบบเงียบไม่กระพริบ ถ้า useQuery ตั้ง placeholderData: keepPreviousData) */
  queryKeys: QueryKey[];
  /** เรียกเมื่อเป็น INSERT (ใช้แสดง toast เตือน) */
  onInsert?: (payload: any) => void;
  /** ปิด/เปิด subscription ตามเงื่อนไข */
  enabled?: boolean;
  /** ชื่อ channel เฉพาะ (default: table name) */
  channelName?: string;
}

/**
 * Subscribe Supabase Realtime แล้ว invalidate React Query แบบ debounce
 * เพื่อให้ตารางอัปเดตอัตโนมัติโดยไม่ต้องกด Refresh และไม่กระพริบ
 */
export function useRealtimeInvalidate({
  table,
  event = "*",
  queryKeys,
  onInsert,
  enabled = true,
  channelName,
}: Options) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep latest callbacks / keys in refs so we don't re-subscribe on each render
  const keysRef = useRef(queryKeys);
  const onInsertRef = useRef(onInsert);
  keysRef.current = queryKeys;
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(channelName ?? `rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        // @ts-ignore - postgres_changes typing
        "postgres_changes",
        { event, schema: "public", table },
        (payload: any) => {
          if (payload.eventType === "INSERT" && onInsertRef.current) {
            onInsertRef.current(payload);
          }
          // Debounce เผื่อ event มาถี่ๆ
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            keysRef.current.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }, 200);
        },
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, table, event, channelName]);
}
