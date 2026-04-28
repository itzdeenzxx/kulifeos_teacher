import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Save, ShieldCheck, ShieldAlert, ShieldOff, ClipboardList, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentUserProfile, useAuditLog, writeAuditLog } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { evaluateTeacherPolicy } from "@/lib/teacherPolicy";

// ─── Verification badge config ─────────────────────────────────────────────────
const VERIFICATION_CONFIG = {
  "trusted-ku": {
    label: "ยืนยันโดยโดเมน @ku.th",
    description: "บัญชีของคุณใช้อีเมล @ku.th ซึ่งระบบเชื่อถืออัตโนมัติ คุณสามารถใช้งานได้เต็มรูปแบบ",
    icon: ShieldCheck,
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    cardClass: "border-emerald-200 bg-emerald-50",
    steps: null,
  },
  "verified-non-ku": {
    label: "ยืนยันตัวตนแล้ว",
    description: "บัญชีของคุณผ่านการยืนยันตัวตนโดยผู้ดูแลระบบแล้ว คุณสามารถใช้งานได้เต็มรูปแบบ",
    icon: ShieldCheck,
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    cardClass: "border-primary/20 bg-primary/5",
    steps: null,
  },
  "unverified-non-ku": {
    label: "ยังไม่ยืนยันตัวตน",
    description: "บัญชีของคุณยังไม่ผ่านการยืนยันตัวตน บางฟีเจอร์จะถูกจำกัด เช่น การสร้างงานและจัดกลุ่มนิสิต",
    icon: ShieldAlert,
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    cardClass: "border-amber-200 bg-amber-50",
    steps: [
      "ใช้อีเมล @ku.th สำหรับลงทะเบียน (ระบบยืนยันอัตโนมัติ)",
      "หรือส่งหลักฐานตัวตนให้ผู้ดูแลระบบที่ support@ku.th",
      "ผู้ดูแลจะอนุมัติภายใน 1-2 วันทำการ",
    ],
  },
} as const;

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

  const { data: auditLogs, loading: auditLoading } = useAuditLog(undefined, 10);

  const teacherPolicy = useMemo(() => evaluateTeacherPolicy(profile), [profile]);
  const verificationStatus = profile?.verificationStatus ?? "unverified-non-ku";
  const verConfig = VERIFICATION_CONFIG[verificationStatus] ?? VERIFICATION_CONFIG["unverified-non-ku"];
  const VerIcon = verConfig.icon;

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
        email: form.email.trim(),
        photoURL,
        onboardingData: {
          title: form.title.trim(),
          fullName: form.fullName.trim(),
          faculty: form.faculty.trim(),
          department: form.department.trim(),
        },
        updatedAt: now,
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

      void writeAuditLog({
        action: "update_profile",
        actorUid: authUser.uid,
        actorName: displayName,
        detail: "อัปเดตข้อมูลโปรไฟล์อาจารย์",
      });

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

  const auditActionLabel: Record<string, string> = {
    create_assignment: "สร้างงาน",
    generate_groups: "จัดกลุ่มนิสิต",
    invite_students: "เพิ่มนิสิต",
    submit_feedback: "ให้คะแนน",
    update_assignment_type: "เปลี่ยนประเภทงาน",
    save_classroom_setup: "ตั้งค่าห้องเรียน",
    update_profile: "อัปเดตโปรไฟล์",
  };

  return (
    <TeacherLayout>
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground">ตั้งค่าอาจารย์</h1>

          {/* ─── Verification Status Badge Card ─── */}
          <Card className={`rounded-2xl border ${verConfig.cardClass}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <VerIcon className="h-5 w-5" />
                สถานะการยืนยันตัวตน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`rounded-full border px-3 py-1 text-sm font-semibold ${verConfig.badgeClass}`}>
                  {teacherPolicy.isGuest ? (
                    <><ShieldOff className="mr-1.5 h-3.5 w-3.5 inline" />ผู้เยี่ยมชม (Guest)</>
                  ) : (
                    <>{verConfig.label}</>
                  )}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {teacherPolicy.canPublishAssignments ? "✓ สร้างงานได้" : "✗ ยังสร้างงานไม่ได้"}
                  {" · "}
                  {teacherPolicy.canGenerateGroups ? "✓ จัดกลุ่มได้" : "✗ ยังจัดกลุ่มไม่ได้"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{verConfig.description}</p>
              {verConfig.steps && (
                <div className="rounded-xl border border-amber-200 bg-white/60 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-800 mb-2">ขั้นตอนการยืนยันตัวตน:</p>
                  {verConfig.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-60" />
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Profile Card ─── */}
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

          {/* ─── Audit Log Card ─── */}
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                ประวัติกิจกรรมล่าสุด
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {auditLoading && <p className="text-sm text-muted-foreground">กำลังโหลด...</p>}
              {!auditLoading && auditLogs.length === 0 && (
                <p className="text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>
              )}
              {auditLogs.map((log) => {
                const ts = log.createdAt?.seconds
                  ? new Date(log.createdAt.seconds * 1000)
                  : null;
                return (
                  <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{auditActionLabel[log.action] ?? log.action}</p>
                      {log.detail && <p className="text-xs text-muted-foreground truncate">{log.detail}</p>}
                      {log.classroomName && <p className="text-xs text-muted-foreground">ห้องเรียน: {log.classroomName}</p>}
                    </div>
                    {ts && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {ts.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                        {" "}
                        {ts.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </TeacherLayout>
  );
};

export default TeacherSettings;
