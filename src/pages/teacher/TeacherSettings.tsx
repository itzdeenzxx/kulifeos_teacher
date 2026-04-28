import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentUserProfile } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const TeacherSettings = () => {
  const { authUser } = useAuth();
  const { profile } = useCurrentUserProfile();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [form, setForm] = useState({
    title: "",
    fullName: "",
    email: "",
    faculty: "",
    department: "",
  });

  useEffect(() => {
    if (!authUser) return;
    const onboarding = profile?.onboardingData || {};
    setForm({
      title: onboarding.title || "",
      fullName: onboarding.fullName || profile?.fullName || "",
      email: profile?.email || authUser.email || "",
      faculty: onboarding.faculty || "",
      department: onboarding.department || "",
    });
    setPhotoURL(profile?.photoURL || "");
  }, [profile, authUser]);

  const displayName = useMemo(() => {
    return `${form.title} ${form.fullName}`.trim() || "อาจารย์";
  }, [form.title, form.fullName]);

  const handleSave = async () => {
    if (!authUser) return;
    if (!form.fullName.trim() || !form.email.trim()) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อและอีเมล",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      await setDoc(doc(db, "users", authUser.uid), {
        uid: authUser.uid,
        email: form.email.trim(),
        photoURL,
        role: "teacher",
        onboardingStep: 1,
        onboardingData: {
          title: form.title.trim(),
          fullName: form.fullName.trim(),
          faculty: form.faculty.trim(),
          department: form.department.trim(),
        },
        updatedAt: now,
        createdAt: profile?.createdAt || now,
      }, { merge: true });

      const cachedRaw = localStorage.getItem(`ku_profile_${authUser.uid}`);
      const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
      localStorage.setItem(`ku_profile_${authUser.uid}`, JSON.stringify({
        ...cached,
        uid: authUser.uid,
        email: form.email.trim(),
        photoURL,
        role: "teacher",
        onboardingStep: 1,
        onboardingData: {
          title: form.title.trim(),
          fullName: form.fullName.trim(),
          faculty: form.faculty.trim(),
          department: form.department.trim(),
        },
        updatedAt: now,
      }));

      toast({ title: "บันทึกสำเร็จ", description: "อัปเดตข้อมูลอาจารย์เรียบร้อยแล้ว" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!authUser) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "ไฟล์ไม่ถูกต้อง", description: "กรุณาเลือกไฟล์รูปภาพ", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarRef = ref(storage, `users/${authUser.uid}/avatar`);
      await uploadBytes(avatarRef, file, { contentType: file.type });
      const url = await getDownloadURL(avatarRef);
      setPhotoURL(url);

      await setDoc(doc(db, "users", authUser.uid), {
        uid: authUser.uid,
        photoURL: url,
        updatedAt: Date.now(),
      }, { merge: true });

      const cachedRaw = localStorage.getItem(`ku_profile_${authUser.uid}`);
      const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
      localStorage.setItem(`ku_profile_${authUser.uid}`, JSON.stringify({
        ...cached,
        uid: authUser.uid,
        photoURL: url,
        updatedAt: Date.now(),
      }));

      toast({ title: "อัปโหลดรูปโปรไฟล์สำเร็จ" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  return (
    <TeacherLayout>
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">ตั้งค่าอาจารย์</h1>

          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="text-base">โปรไฟล์ผู้สอน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                <Avatar className="h-14 w-14">
                  {photoURL && <AvatarImage src={photoURL} alt={displayName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    {(displayName || "อจ").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">{form.faculty || "ยังไม่ได้ระบุคณะ"}</p>
                  <Badge className="mt-1 rounded-full border-0 bg-primary/10 text-primary">อาจารย์</Badge>
                </div>
                <div className="ml-auto">
                  <Label htmlFor="teacher-avatar" className="cursor-pointer text-sm text-primary underline underline-offset-4">
                    {uploadingAvatar ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
                  </Label>
                  <input id="teacher-avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>คำนำหน้า</Label>
                  <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="rounded-xl border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อ-นามสกุล</Label>
                  <Input value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} className="rounded-xl border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label>อีเมล</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="rounded-xl border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label>คณะ</Label>
                  <Input value={form.faculty} onChange={(e) => setForm((prev) => ({ ...prev, faculty: e.target.value }))} className="rounded-xl border-border/50" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>ภาควิชา / สาขา</Label>
                  <Input value={form.department} onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))} className="rounded-xl border-border/50" />
                </div>
              </div>

              <Button className="w-full rounded-xl bg-primary text-primary-foreground md:w-auto" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </TeacherLayout>
  );
};

export default TeacherSettings;
