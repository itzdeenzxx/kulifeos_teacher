import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  role: "student" | "teacher";
  isGuest?: boolean;
  isTeacherVerified?: boolean;
  verificationStatus?: "trusted-ku" | "verified-non-ku" | "unverified-non-ku";
  onboardingStep: number; // 0-3 for steps, 4 means completed
  onboardingData?: any;
  createdAt: number;
  updatedAt: number;
}

const FALLBACK_ROLE: UserProfile["role"] = "teacher";
const FALLBACK_ONBOARDING_STEP = 1;

function isFirestorePermissionError(error: unknown) {
  const code = (error as { code?: string } | null)?.code || "";
  const message = (error as { message?: string } | null)?.message || "";
  return code.includes("permission-denied") || /insufficient permissions/i.test(message);
}

function createFallbackProfile(user: User): UserProfile {
  const now = Date.now();
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email || "",
    role: FALLBACK_ROLE,
    onboardingStep: FALLBACK_ONBOARDING_STEP,
    onboardingData: {},
    createdAt: now,
    updatedAt: now,
  };
}

// Global cache to prevent repeated fetching of the same user profile
let globalCachedProfile: { uid: string; profile: UserProfile } | null = null;

export function useAuth() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!isMounted) return;
        setAuthUser(user);
        
        if (user) {
          // Use global cache if valid
          if (globalCachedProfile && globalCachedProfile.uid === user.uid) {
            setUserProfile(globalCachedProfile.profile);
            localStorage.setItem("ku_current_user_id", user.uid);
            setLoading(false);
            return;
          }

          // Optimistic UI load from local storage to bypass Firebase network delays
          const cachedParams = localStorage.getItem(`ku_profile_${user.uid}`);
          if (cachedParams) {
            try {
              const parsed = JSON.parse(cachedParams) as UserProfile;
              setUserProfile(parsed);
              setLoading(false); // Instantly allow access to the dashboard
            } catch (e) {
              console.error("Optimistic cache parse error", e);
            }
          }

          const userDocRef = doc(db, "users", user.uid);
          let data: UserProfile | null = null;
          
          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              data = userSnap.data() as UserProfile;
              localStorage.setItem(`ku_profile_${user.uid}`, JSON.stringify(data));
            }
          } catch (fetchErr: unknown) {
            console.warn("Failed to fetch fresh profile from Firebase, trying local cache. Error:", fetchErr);
            const cachedParams = localStorage.getItem(`ku_profile_${user.uid}`);
            if (cachedParams) {
              try {
                data = JSON.parse(cachedParams) as UserProfile;
              } catch (e) {
                console.error("Failed to parse cached profile", e);
              }
            } else if (isFirestorePermissionError(fetchErr)) {
              data = createFallbackProfile(user);
            } else {
              throw fetchErr; // rethrow if no cache
            }
          }
          
          if (!isMounted) return;

          if (data) {
            globalCachedProfile = { uid: user.uid, profile: data };
            setUserProfile(data);
            localStorage.setItem("ku_current_user_id", user.uid);
          } else {
<<<<<<< HEAD
            console.warn("User auth exists but Firestore profile not found. Waiting for profile to be created.");
            setUserProfile(null);
=======
            const fallback = createFallbackProfile(user);
            globalCachedProfile = { uid: user.uid, profile: fallback };
            setUserProfile(fallback);
            localStorage.setItem(`ku_profile_${user.uid}`, JSON.stringify(fallback));
            localStorage.setItem("ku_current_user_id", user.uid);
>>>>>>> d4904f5ef0e6ae453e47054cd4a6263a00d1ea02
          }
        } else {
          globalCachedProfile = null;
          setUserProfile(null);
          localStorage.removeItem("ku_current_user_id");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error("Auth error:", err);
        const message = (err as { message?: string } | null)?.message || "Authentication failed";
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return {
    authUser,
    userProfile,
    loading,
    error,
    isAuthenticated: !!authUser,
    logout: () => signOut(auth),
  };
}
