import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { api, setAuthToken, type User as ApiUser } from "@/lib/api";

interface UserCompat {
  id: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    student_id?: string;
    is_student_verified?: boolean;
  };
}

interface AuthState {
  user: UserCompat | null;
  loading: boolean;
  displayName: string;
  isAdmin: boolean;
  isStudentVerified: boolean;
  studentId: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  displayName: "",
  isAdmin: false,
  isStudentVerified: false,
  studentId: null,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserCompat | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudentVerified, setIsStudentVerified] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  const fetchSession = async () => {
    // 1. First check Express backend JWT session
    const token = typeof window !== "undefined" ? localStorage.getItem("foundit_token") : null;
    if (token) {
      try {
        const { user: apiUser } = await api.getMe();
        if (apiUser) {
          setUser({
            id: apiUser.id,
            email: apiUser.email,
            user_metadata: {
              display_name: apiUser.displayName,
              student_id: apiUser.studentId ?? undefined,
              is_student_verified: apiUser.isStudentVerified,
            },
          });
          setDisplayName(apiUser.displayName || apiUser.email.split("@")[0]);
          setIsAdmin(apiUser.role === "admin");
          setIsStudentVerified(apiUser.isStudentVerified);
          setStudentId(apiUser.studentId ?? null);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Token expired or invalid
        setAuthToken(null);
      }
    }

    // 2. Fallback to Supabase auth session if available
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const sbUser = data.session.user;
        setUser(sbUser);
        setDisplayName((sbUser.user_metadata?.["display_name"] as string) || sbUser.email?.split("@")[0] || "Member");
        setIsAdmin(sbUser.email === "admin@foundit.edu");
        setIsStudentVerified(Boolean(sbUser.user_metadata?.["is_student_verified"]));
        setStudentId((sbUser.user_metadata?.["student_id"] as string) ?? null);
      } else {
        setUser(null);
        setDisplayName("");
        setIsAdmin(false);
        setIsStudentVerified(false);
        setStudentId(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSession();
  }, []);

  const value: AuthState = {
    user,
    loading,
    displayName,
    isAdmin,
    isStudentVerified,
    studentId,
    signOut: async () => {
      setAuthToken(null);
      await supabase.auth.signOut().catch(() => {});
      setUser(null);
      setDisplayName("");
      setIsAdmin(false);
      setIsStudentVerified(false);
      setStudentId(null);
    },
    refreshUser: fetchSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
