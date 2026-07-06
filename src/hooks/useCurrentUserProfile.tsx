import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CurrentUserProfile {
  id: string;
  fullName: string;
  displayName: string;
  department: string;
  phone: string;
}

/**
 * Returns the currently signed-in user's profile info, used to auto-fill
 * "actor" fields (ผู้ดำเนินการ / ผู้ขอเบิก / ผู้แจ้ง ฯลฯ) so users cannot
 * impersonate someone else by typing another name.
 */
export function useCurrentUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, phone, department")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setProfile({
          id: data.id,
          fullName: data.full_name || "",
          displayName: (data as any).display_name || data.full_name || "",
          department: (data as any).department || "",
          phone: data.phone || "",
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /** Preferred name to show as the actor: display_name → full_name → email */
  const actorName = profile?.displayName || profile?.fullName || user?.email || "";

  return { profile, loading, actorName };
}
