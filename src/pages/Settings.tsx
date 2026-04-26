import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, Save, Bell, Globe, Shield, ChevronRight, Moon, Sun, LogOut, Monitor } from "lucide-react";
import { useCurrentUserProfile } from "@/lib/db";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { useLogout } from "@/hooks/use-logout";
import { LogoutDialog } from "@/components/LogoutDialog";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

const Settings = () => {
  const { authUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile: dbUserProfile } = useCurrentUserProfile();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<any>(dbUserProfile || {});
  const [name, setName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const storedRaw = localStorage.getItem("ku_profile");
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    const combined = { ...dbUserProfile, ...stored };
    setUserProfile(combined);
    
    setName(combined.name || dbUserProfile?.name || "");
    setFaculty(combined.faculty || dbUserProfile?.faculty || "");
    setBio(combined.bio || dbUserProfile?.bio || "");
  }, [dbUserProfile]);

  const [language, setLanguage] = useState("th");
  const [emailNotif, setEmailNotif] = useState(true);
  const [lineNotif, setLineNotif] = useState(true);
  const [deadlineNotif, setDeadlineNotif] = useState(true);
  const [teamNotif, setTeamNotif] = useState(true);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { open: logoutOpen, promptLogout, confirmLogout, cancel: cancelLogout } = useLogout();

  const handleSave = async () => {
    if (!authUser) {
      toast({ title: "เกิดข้อผิดพลาด", description: "กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล", variant: "destructive" });
      return;
    }
    try {
      const userRef = doc(db, "users", authUser.uid);
      await updateDoc(userRef, {
        name,
        faculty,
        bio,
        updatedAt: Date.now()
      });
      // Update local state and cache
      const stored = JSON.parse(localStorage.getItem("ku_profile") || "{}");
      const newProfile = { ...stored, name, faculty, bio };
      localStorage.setItem("ku_profile", JSON.stringify(newProfile));
      setUserProfile((prev: any) => ({ ...prev, ...newProfile }));
      toast({ title: "บันทึกสำเร็จ ✓", description: "ข้อมูลโปรไฟล์ได้รับการอัปเดตบน Firebase แล้ว" });
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    }
  };

  const handleConnectGoogle = () => {
    toast({ title: "Google Account", description: "ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้" });
  };

  const handleCamera = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast({ title: "กำลังอัปโหลดรูปภาพ...", description: "กรุณารอสักครู่" });
      
      let photoURL = "";
      if (authUser) {
        try {
          const avatarRef = storageRef(storage, `users/${authUser.uid}/avatar`);
          await uploadBytes(avatarRef, file);
          photoURL = await getDownloadURL(avatarRef);

          const userDocRef = doc(db, "users", authUser.uid);
          await updateDoc(userDocRef, { photoURL });
        } catch (fbError) {
          console.warn("Firebase upload failed, falling back to local config:", fbError);
        }
      }

      if (photoURL) {
        const scopedKey = `ku_profile_${authUser?.uid || "guest"}`;
        const stored = JSON.parse(localStorage.getItem(scopedKey) || "{}");
        localStorage.setItem(scopedKey, JSON.stringify({ ...stored, photoURL }));
        setUserProfile((prev: any) => ({ ...prev, photoURL }));
        toast({ title: "อัปโหลดสำเร็จ ✓", description: "รูปโปรไฟล์ของคุณได้รับการอัปเดตแล้ว" });
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          const scopedKey = `ku_profile_${authUser?.uid || "guest"}`;
          const stored = JSON.parse(localStorage.getItem(scopedKey) || "{}");
          localStorage.setItem(scopedKey, JSON.stringify({ ...stored, photoURL: base64Url }));
          setUserProfile((prev: any) => ({ ...prev, photoURL: base64Url }));
          toast({ title: "อัปโหลดสำเร็จ ✓", description: "รูปโปรไฟล์จำลองได้รับการอัปเดตแล้ว" });
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัปโหลดรูปภาพได้", variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Settings">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <LogoutDialog open={logoutOpen} onConfirm={confirmLogout} onCancel={cancelLogout} />
      <PageTransition>
        {/* ========== MOBILE - iOS Settings style ========== */}
        <div className="md:hidden space-y-5">
          {/* Profile card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card p-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={userProfile?.photoURL || userProfile?.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{userProfile?.avatar}</AvatarFallback>
                  </Avatar>
                  <button onClick={handleCamera} className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-foreground">{userProfile.name}</p>
                  <p className="text-[12px] text-muted-foreground">{userProfile.faculty}</p>
                  <Badge className="mt-1 rounded-full bg-primary/10 text-primary border-0 px-2 py-0.5 text-[10px] font-semibold">{userProfile.year}</Badge>
                </div>
              </div>
              <Separator />
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ชื่อ-นามสกุล</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl border-border/50 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">คณะ/ภาควิชา</Label>
                  <Input value={faculty} onChange={(e) => setFaculty(e.target.value)} className="h-9 rounded-xl border-border/50 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">ประวัติย่อ (Bio)</Label>
                  <Input value={bio} onChange={(e) => setBio(e.target.value)} className="h-9 rounded-xl border-border/50 text-sm" />
                </div>
                <Button onClick={handleSave} className="w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-sm">
                  <Save className="h-3.5 w-3.5" /> บันทึกข้อมูล
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Notifications section */}
          <div>
            <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">การแจ้งเตือน</p>
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
              {[
                { label: "Email", desc: "รับแจ้งเตือนผ่านอีเมล", value: emailNotif, set: setEmailNotif },
                { label: "LINE", desc: "รับแจ้งเตือนผ่าน LINE", value: lineNotif, set: setLineNotif },
                { label: "เดดไลน์", desc: "แจ้งเตือนล่วงหน้า 3 วัน", value: deadlineNotif, set: setDeadlineNotif },
                { label: "ทีม", desc: "คำเชิญเข้าร่วมทีม", value: teamNotif, set: setTeamNotif },
              ].map((item, i, arr) => (
                <div key={item.label} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? "border-b border-border/40" : ""}`}>
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.value} onCheckedChange={item.set} />
                </div>
              ))}
            </div>
          </div>

          {/* Language & Theme */}
          <div>
            <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">ทั่วไป</p>
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="text-[14px] font-medium text-foreground">ภาษา</span>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-32 h-8 rounded-xl border-border/50 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="th"><span className="mr-2 font-semibold text-primary">TH</span> ไทย</SelectItem>
                    <SelectItem value="en"><span className="mr-2 font-semibold text-primary">EN</span> English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {resolvedTheme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                  <span className="text-[14px] font-medium text-foreground">ธีม</span>
                </div>
                <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                  <SelectTrigger className="w-28 h-8 rounded-xl border-border/50 text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light"><Sun className="h-4 w-4" /> Light</SelectItem>
                    <SelectItem value="dark"><Moon className="h-4 w-4" /> Dark</SelectItem>
                    <SelectItem value="system"><Monitor className="h-4 w-4" />️ System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Connected accounts */}
          <div>
            <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">บัญชีที่เชื่อมต่อ</p>
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C755]/10">
                    <span className="text-sm font-bold text-[#06C755]">L</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-foreground">LINE</p>
                    <p className="text-[11px] text-muted-foreground">somchai_k</p>
                  </div>
                </div>
                <Badge className="rounded-full bg-primary/10 text-primary border-0 px-2 py-0.5 text-[10px]">เชื่อมต่อแล้ว</Badge>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <span className="text-sm font-bold text-muted-foreground">G</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-foreground">Google</p>
                    <p className="text-[11px] text-muted-foreground">ยังไม่เชื่อมต่อ</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleConnectGoogle} className="h-7 rounded-lg border-primary/20 text-primary text-[12px] px-3">
                  เชื่อมต่อ
                </Button>
          </div>
          </div>
          {/* Logout - Mobile */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <button
              onClick={promptLogout}
              className="flex w-full items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4 text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[14px] font-semibold">ออกจากระบบ</span>
            </button>
          </motion.div>
        </div>
        </div>

        {/* ========== DESKTOP ========== */}
        <div className="hidden md:block">
          <StaggerContainer className="mx-auto max-w-3xl space-y-6">
            <StaggerItem>
              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-primary" /> Profile Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={userProfile?.photoURL || userProfile?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{userProfile?.avatar}</AvatarFallback>
                      </Avatar>
                      <button onClick={handleCamera} className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110">
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{userProfile.name}</p>
                      <Badge variant="secondary" className="mt-1 rounded-full bg-accent text-accent-foreground border-0 text-xs">{userProfile.year}</Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faculty">Faculty</Label>
                      <Input id="faculty" value={faculty} onChange={(e) => setFaculty(e.target.value)} className="rounded-xl border-border/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-xl border-border/50" />
                  </div>
                  <Button onClick={handleSave} className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-primary" /> Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Email Notifications", desc: "รับการแจ้งเตือนผ่านอีเมล", value: emailNotif, set: setEmailNotif },
                    { label: "LINE Notifications", desc: "รับการแจ้งเตือนผ่าน LINE OA", value: lineNotif, set: setLineNotif },
                    { label: "Deadline Reminders", desc: "แจ้งเตือนเดดไลน์ล่วงหน้า 3 วัน", value: deadlineNotif, set: setDeadlineNotif },
                    { label: "Team Invites", desc: "แจ้งเตือนเมื่อมีคนเชิญเข้าทีม", value: teamNotif, set: setTeamNotif },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch checked={item.value} onCheckedChange={item.set} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Globe className="h-5 w-5 text-primary" /> Language & Appearance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Language</p>
                      <p className="text-xs text-muted-foreground">เลือกภาษาที่ต้องการ</p>
                    </div>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-40 rounded-xl border-border/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="th">TH ภาษาไทย</SelectItem>
                        <SelectItem value="en"><span className="mr-2 font-semibold text-primary">EN</span> English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Theme</p>
                      <p className="text-xs text-muted-foreground">เลือกธีมที่ต้องการ</p>
                    </div>
                    <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                      <SelectTrigger className="w-36 rounded-xl border-border/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light"><Sun className="h-4 w-4" /> Light</SelectItem>
                        <SelectItem value="dark"><Moon className="h-4 w-4" /> Dark</SelectItem>
                        <SelectItem value="system"><Monitor className="h-4 w-4" />️ System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <button
                onClick={promptLogout}
                className="flex w-full items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-semibold">ออกจากระบบ</span>
              </button>
            </StaggerItem>

            <StaggerItem>
              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5 text-primary" /> Connected Accounts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755]/10">
                        <span className="text-lg font-bold text-[#06C755]">L</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">LINE Account</p>
                        <p className="text-xs text-muted-foreground">Connected • somchai_k</p>
                      </div>
                    </div>
                    <Badge className="rounded-full bg-accent text-accent-foreground border-0 text-xs">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                        <span className="text-lg font-bold text-muted-foreground">G</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Google Account</p>
                        <p className="text-xs text-muted-foreground">Not connected</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleConnectGoogle} className="rounded-xl border-primary/20 text-primary hover:bg-accent">Connect</Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Settings;
