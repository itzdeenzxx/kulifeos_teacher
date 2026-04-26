import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

// ── Logo ──
const Logo = () => (
  <div className="flex items-center gap-2 justify-center pb-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
      <GraduationCap className="h-7 w-7 text-primary-foreground" />
    </div>
    <span className="text-2xl font-bold flex gap-1 items-center bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
      KU TeacherOS <Sparkles className="h-5 w-5 text-primary/60" />
    </span>
  </div>
);

const Auth = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { userProfile, loading: authLoading } = useAuth();
  
  useEffect(() => {
    if (userProfile && !authLoading) {
      if (userProfile.onboardingStep >= 4) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [userProfile, authLoading, navigate]);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email?.endsWith("@ku.th")) {
        await signOut(auth);
        setError("แอปพลิเคชันนี้สำหรับอาจารย์ มหาวิทยาลัยเกษตรศาสตร์เท่านั้น (กรุณาใช้อีเมล @ku.th)");
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.role !== "teacher") {
          await signOut(auth);
          setError("บัญชีนี้ถูกลงทะเบียนเป็นนิสิต กรุณาใช้งานผ่านแอปพลิเคชันสำหรับนิสิต");
          setLoading(false);
          return;
        }
        
        if (userData.onboardingStep >= 1) {
          navigate("/");
        } else {
          navigate("/onboarding");
        }
      } else {
        // Teacher doesn't exist, create a new record
        const newUser = {
          id: `T${user.uid.substring(0, 8).toUpperCase()}`,
          uid: user.uid,
          email: user.email,
          role: "teacher",
          onboardingStep: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await setDoc(userRef, newUser);
        navigate("/onboarding");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: `TGUEST${user.uid.substring(0, 8).toUpperCase()}`,
          uid: user.uid,
          fullName: "ผู้เยี่ยมชม (Guest Teacher)",
          email: "guest.teacher@ku.th",
          role: "teacher",
          isGuest: true,
          onboardingStep: 1, // Bypass onboarding
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      navigate("/");
    } catch (err: any) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ผู้เยี่ยมชม");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background p-4 relative overflow-hidden items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key="teacher-auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-xl"
          >
            <Logo />
            
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome, Educator</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ลงชื่อเข้าสู่ระบบด้วยบัญชี @ku.th เพื่อเข้าถึงเครื่องมือจัดการการเรียนการสอนและดูแลโปรเจกต์ของนิสิต
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 text-center">
                {error}
              </div>
            )}

            <Button
              variant="outline"
              type="button"
              className="w-full relative h-[52px] rounded-xl border-border bg-card text-foreground font-semibold hover:bg-muted/50 hover:text-foreground transition-all duration-200"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              {loading ? "กำลังโหลด..." : "Sign in with KU Google"}
            </Button>

            <div className="relative my-6 mt-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  หรือ
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full h-[52px] rounded-xl text-base font-semibold border-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              ดำเนินการต่อด้วยผู้เยี่ยมชม
            </Button>

            <div className="mt-8 text-center text-xs text-muted-foreground font-medium">
              เฉพาะบุคลากรที่มีบัญชีโดเมน <span className="text-foreground">@ku.th</span> เท่านั้น
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
