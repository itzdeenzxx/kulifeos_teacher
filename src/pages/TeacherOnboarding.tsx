import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

const TeacherOnboarding = () => {
  const { authUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    fullName: "",
    faculty: "",
    department: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    setError("");
    setLoading(true);
    try {
      const now = Date.now();
      const userRef = doc(db, "users", authUser.uid);
      await setDoc(userRef, {
        uid: authUser.uid,
        email: authUser.email || "",
        role: "teacher",
        onboardingData: formData,
        onboardingStep: 1, // mark complete
        updatedAt: now,
        createdAt: now,
      }, { merge: true });

      localStorage.setItem(`ku_profile_${authUser.uid}`, JSON.stringify({
        id: `T${authUser.uid.substring(0, 8).toUpperCase()}`,
        uid: authUser.uid,
        email: authUser.email || "",
        role: "teacher",
        onboardingStep: 1,
        onboardingData: formData,
        createdAt: now,
        updatedAt: now,
      }));
      localStorage.setItem("ku_current_user_id", authUser.uid);

      navigate("/", { replace: true });
      window.location.reload();
    } catch (err: unknown) {
      console.error(err);
      const code = (err as { code?: string } | null)?.code || "";
      const message = (err as { message?: string } | null)?.message || "";
      const isPermissionDenied = code.includes("permission-denied") || /insufficient permissions/i.test(message);

      if (isPermissionDenied) {
        localStorage.setItem(`ku_profile_${authUser.uid}`, JSON.stringify({
          id: `T${authUser.uid.substring(0, 8).toUpperCase()}`,
          uid: authUser.uid,
          email: authUser.email || "",
          role: "teacher",
          onboardingStep: 1,
          onboardingData: formData,
          createdAt: now,
          updatedAt: now,
        }));
        localStorage.setItem("ku_current_user_id", authUser.uid);
        navigate("/", { replace: true });
        window.location.reload();
      } else {
        setError("บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border border-border/50 bg-card p-8 shadow-xl"
        >
          <div className="mb-8 text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">ข้อมูลอาจารย์</h1>
            <p className="text-sm text-muted-foreground">
              กรุณากรอกข้อมูลเพื่อใช้แสดงในระบบจัดการรายวิชา
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>คำนำหน้า</Label>
                <Input
                  required
                  placeholder="อ., ผศ., รศ."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-xl bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label>ชื่อ-นามสกุล</Label>
                <Input
                  required
                  placeholder="ชื่อ นามสกุล"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="rounded-xl bg-muted/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>คณะ</Label>
              <Input
                required
                placeholder="เช่น วิศวกรรมศาสตร์"
                value={formData.faculty}
                onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                className="rounded-xl bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label>ภาควิชา / สาขา</Label>
              <Input
                required
                placeholder="เช่น วิศวกรรมคอมพิวเตอร์"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="rounded-xl bg-muted/50"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold group mt-4"
            >
              {loading ? "กำลังบันทึก..." : "เข้าสู่หน้า Dashboard"}
              <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TeacherOnboarding;