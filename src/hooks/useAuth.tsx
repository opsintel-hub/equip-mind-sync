import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, displayName?: string, phone?: string, requestedJobRole?: string, requestedDepartment?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    // If profile.is_hidden is true, force sign-out (deleted/disabled user)
    const enforceHiddenGuard = async (uid: string | undefined) => {
      if (!uid) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_hidden")
          .eq("id", uid)
          .maybeSingle();
        if (isMounted && data?.is_hidden) {
          toast.error("บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      } catch {
        /* ignore */
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user?.id) {
          // Defer to avoid deadlock inside the auth listener
          setTimeout(() => enforceHiddenGuard(session.user!.id), 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user?.id) {
        enforceHiddenGuard(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast.success('เข้าสู่ระบบสำเร็จ');
      let target = '/dashboard';
      try {
        const last = localStorage.getItem('lastRoute');
        if (last && last !== '/') target = last;
      } catch { /* ignore */ }
      navigate(target, { replace: true });
      return { error: null };

    } catch (error: any) {
      toast.error(error.message || 'เข้าสู่ระบบไม่สำเร็จ');
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    displayName?: string,
    phone?: string,
    requestedJobRole?: string,
    requestedDepartment?: string,
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            display_name: displayName || '',
            phone: phone || '',
            requested_job_role: requestedJobRole || '',
            requested_department: requestedDepartment || '',
          },
        },
      });
      
      if (error) throw error;
      
      toast.success('สมัครสมาชิกสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติสิทธิ์การใช้งาน');
      navigate('/user-manual');
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || 'สมัครสมาชิกไม่สำเร็จ');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      try { localStorage.removeItem('lastRoute'); } catch { /* ignore */ }
      await supabase.auth.signOut();
      toast.success('ออกจากระบบสำเร็จ');
      navigate('/');
    } catch (error: any) {
      toast.error('ออกจากระบบไม่สำเร็จ');
    }
  };


  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
