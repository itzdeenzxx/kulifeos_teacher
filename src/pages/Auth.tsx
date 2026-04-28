import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Sparkles, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { auth, googleProvider, db } from "@/lib/firebase";
import {
  signInWithPopup,
  signOut,
  signInAnonymously,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

type Tab = "login" | "signup";

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

const getFriendlyAuthError = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code;
  if (code === "auth/unauthorized-domain") {
    return `Google login is blocked on ${window.location.hostname}. Open this page via http://localhost:${window.location.port} or add this domain in Firebase Console > Authentication > Settings > Authorized domains.`;
  }
  return "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง";
};

const isFirestorePermissionDenied = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code || "";
  const message = (error as { message?: string } | null)?.message || "";
  return code.includes("permission-denied") || /insufficient permissions/i.test(message);
};

const getTeacherVerificationMeta = (email: string, emailVerified?: boolean) => {
  const isKuEmail = /@ku\.th$/i.test((email || "").trim());
  if (isKuEmail) {
    return { isTeacherVerified: true, verificationStatus: "trusted-ku" as const };
  }
  if (emailVerified) {
    return { isTeacherVerified: true, verificationStatus: "verified-non-ku" as const };
  }
  return { isTeacherVerified: false, verificationStatus: "unverified-non-ku" as const };
};

const persistLocalTeacherProfile = (params: {
  uid: string;
  email: string;
  onboardingStep?: number;
  isGuest?: boolean;
  isTeacherVerified?: boolean;
  verificationStatus?: "trusted-ku" | "verified-non-ku" | "unverified-non-ku";
}) => {
  const now = Date.now();
  const profile = {
    id: `T${params.uid.substring(0, 8).toUpperCase()}`,
    uid: params.uid,
    email: params.email,
    role: "teacher" as const,
    isGuest: !!params.isGuest,
    isTeacherVerified: params.isTeacherVerified ?? /@ku\.th$/i.test(params.email),
    verificationStatus: params.verificationStatus || (/@ku\.th$/i.test(params.email) ? "trusted-ku" : "unverified-non-ku"),
    onboardingStep: params.onboardingStep ?? 1,
    onboardingData: {},
    createdAt: now,
    updatedAt: now,
  };

  localStorage.setItem(`ku_profile_${params.uid}`, JSON.stringify(profile));
  localStorage.setItem("ku_current_user_id", params.uid);
};

const Auth = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roleGuardTriggered, setRoleGuardTriggered] = useState(false);
  const { userProfile, loading: authLoading } = useAuth();
  
  useEffect(() => {
    if (userProfile && !authLoading) {
      if (userProfile.role !== "teacher") {
<<<<<<< HEAD
        signOut(auth);
        setError("บัญชีนี้ถูกลงทะเบียนเป็นนิสิต กรุณาใช้งานผ่านแอปพลิเคชันสำหรับนิสิต");
=======
        if (roleGuardTriggered) return;
        setRoleGuardTriggered(true);
        setError("บัญชีนี้ถูกลงทะเบียนเป็นนิสิต กรุณาใช้งานผ่านระบบนิสิต");
        void signOut(auth);
>>>>>>> d4904f5ef0e6ae453e47054cd4a6263a00d1ea02
        return;
      }
      if (userProfile.onboardingStep >= 1) {
        navigate("/", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [userProfile, authLoading, navigate, roleGuardTriggered]);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const verifyMeta = getTeacherVerificationMeta(user.email || "", user.emailVerified);

      const userRef = doc(db, "users", user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (error: unknown) {
        if (isFirestorePermissionDenied(error)) {
          persistLocalTeacherProfile({ uid: user.uid, email: user.email || "", onboardingStep: 1, ...verifyMeta });
          navigate("/");
          return;
        }
        throw error;
      }

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.role !== "teacher") {
          await signOut(auth);
          setError("บัญชีนี้ถูกลงทะเบียนเป็นนิสิต กรุณาใช้งานผ่านแอปพลิเคชันสำหรับนิสิต");
          setLoading(false);
          return;
        }

        await setDoc(userRef, {
          ...verifyMeta,
          updatedAt: Date.now(),
        }, { merge: true });
        
        if (userData.onboardingStep >= 1) {
          window.location.href = "/";
        } else {
          window.location.href = "/onboarding";
        }
      } else {
        // Teacher doesn't exist, create a new record
        const newUser = {
          id: `T${user.uid.substring(0, 8).toUpperCase()}`,
          uid: user.uid,
          email: user.email,
          role: "teacher",
          ...verifyMeta,
          onboardingStep: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
<<<<<<< HEAD
        await setDoc(userRef, newUser);
        window.location.href = "/onboarding";
=======
        try {
          await setDoc(userRef, newUser);
        } catch (error: unknown) {
          if (!isFirestorePermissionDenied(error)) {
            throw error;
          }
          persistLocalTeacherProfile({ uid: user.uid, email: user.email || "", onboardingStep: 1, ...verifyMeta });
        }
        navigate("/onboarding");
>>>>>>> d4904f5ef0e6ae453e47054cd4a6263a00d1ea02
      }
    } catch (err: unknown) {
      console.error("Login failed:", err);
      const errorCode = (err as { code?: string } | null)?.code;
      if (errorCode === "auth/popup-blocked" || errorCode === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบ");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const verifyMeta = getTeacherVerificationMeta(result.user.email || email, result.user.emailVerified);
      const userRef = doc(db, "users", result.user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (error: unknown) {
        if (isFirestorePermissionDenied(error)) {
          persistLocalTeacherProfile({ uid: result.user.uid, email: result.user.email || email, onboardingStep: 1, ...verifyMeta });
          navigate("/");
          return;
        }
        throw error;
      }

      if (!userSnap.exists()) {
        setError("ไม่พบบัญชีอาจารย์นี้ในระบบ กรุณาสมัครสมาชิกก่อน");
        return;
      }

      const userData = userSnap.data();
      if (userData.role && userData.role !== "teacher") {
        await signOut(auth);
        setError("บัญชีนี้ถูกลงทะเบียนเป็นนิสิต กรุณาใช้งานผ่านระบบนิสิต");
        return;
      }

      await setDoc(userRef, {
        ...verifyMeta,
        updatedAt: Date.now(),
      }, { merge: true });

      if (userData.onboardingStep >= 1) {
        navigate("/");
      } else {
        navigate("/onboarding");
      }
    } catch (err: unknown) {
      console.error("Email login failed:", err);
      const errorCode = (err as { code?: string } | null)?.code;
      if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password" || errorCode === "auth/user-not-found") {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    setError("");
    if (!email || !password || !confirmPassword) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const verifyMeta = getTeacherVerificationMeta(email, result.user.emailVerified);
      const newUser = {
        id: `T${result.user.uid.substring(0, 8).toUpperCase()}`,
        uid: result.user.uid,
        email,
        role: "teacher",
        ...verifyMeta,
        onboardingStep: 0,
        onboardingData: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await setDoc(doc(db, "users", result.user.uid), newUser);
      } catch (error: unknown) {
        if (!isFirestorePermissionDenied(error)) {
          throw error;
        }
        persistLocalTeacherProfile({ uid: result.user.uid, email, onboardingStep: 1, ...verifyMeta });
        navigate("/");
        return;
      }

      navigate("/onboarding");
    } catch (err: unknown) {
      console.error("Email signup failed:", err);
      const errorCode = (err as { code?: string } | null)?.code;
      if (errorCode === "auth/email-already-in-use") {
        setError("อีเมลนี้ถูกใช้งานแล้ว");
      } else {
        setError("เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง");
      }
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
        try {
          await setDoc(userRef, {
            id: `TGUEST${user.uid.substring(0, 8).toUpperCase()}`,
            uid: user.uid,
            fullName: "ผู้เยี่ยมชม (Guest Teacher)",
            email: "guest.teacher@ku.th",
            role: "teacher",
            isTeacherVerified: true,
            verificationStatus: "trusted-ku",
            isGuest: true,
            onboardingStep: 1, // Bypass onboarding
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        } catch (error: unknown) {
          if (!isFirestorePermissionDenied(error)) {
            throw error;
          }
          persistLocalTeacherProfile({ uid: user.uid, email: "guest.teacher@ku.th", onboardingStep: 1, isGuest: true, isTeacherVerified: true, verificationStatus: "trusted-ku" });
        }
      }
<<<<<<< HEAD
      window.location.href = "/";
    } catch (err: any) {
=======
      navigate("/");
    } catch (err: unknown) {
>>>>>>> d4904f5ef0e6ae453e47054cd4a6263a00d1ea02
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
                ลงชื่อเข้าสู่ระบบเพื่อเข้าถึงเครื่องมือจัดการการเรียนการสอนและดูแลโปรเจกต์ของนิสิต
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-destructive/10 p-3 text-sm text-destructive font-medium border border-destructive/20 text-center">
                {error}
              </div>
            )}

            <div className="mb-5 flex rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setTab("login")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  tab === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => setTab("signup")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  tab === "signup" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>

            <div className="space-y-4 mb-5">
              <div className="space-y-1.5">
                <Label htmlFor="teacher-email">อีเมล</Label>
                <Input
                  id="teacher-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="teacher-password">รหัสผ่าน</Label>
                <div className="relative">
                  <Input
                    id="teacher-password"
                    type={showPass ? "text" : "password"}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl pr-10"
                    onKeyDown={(e) => e.key === "Enter" && (tab === "login" ? handleEmailLogin() : handleEmailSignup())}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {tab === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="teacher-confirm-password">ยืนยันรหัสผ่าน</Label>
                  <div className="relative">
                    <Input
                      id="teacher-confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 rounded-xl pr-10"
                      onKeyDown={(e) => e.key === "Enter" && handleEmailSignup()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={tab === "login" ? handleEmailLogin : handleEmailSignup}
                disabled={loading}
                className="w-full h-[48px] rounded-xl font-semibold"
              >
                {loading ? "กำลังโหลด..." : tab === "login" ? "เข้าสู่ระบบด้วยอีเมล" : "สมัครสมาชิกด้วยอีเมล"}
              </Button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">หรือ</span>
              </div>
            </div>

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
              {loading ? "กำลังโหลด..." : "Sign in with Google"}
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
              รองรับอีเมลทั่วไปและ Google สำหรับการเข้าใช้งานระบบอาจารย์
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
