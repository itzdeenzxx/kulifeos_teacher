import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, LogOut, GraduationCap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useLogout } from "@/hooks/use-logout";
import { LogoutDialog } from "@/components/LogoutDialog";
import { useCurrentUserProfile } from "@/lib/db";

const teacherNav = [
  { title: "Classrooms", url: "/", icon: LayoutDashboard },
  { title: "ตั้งค่า", url: "/settings", icon: Settings },
];

interface TeacherLayoutProps {
  children: ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
  const location = useLocation();
  const { open, promptLogout, confirmLogout, cancel } = useLogout();
  const { profile } = useCurrentUserProfile();

  const teacherName = useMemo(() => {
    const onboarding = profile?.onboardingData || {};
    const fullName = onboarding.fullName || profile?.fullName || "อาจารย์";
    const title = onboarding.title || "";
    return `${title} ${fullName}`.trim();
  }, [profile]);

  const avatarText = useMemo(() => {
    const trimmed = (teacherName || "อจ").trim();
    if (!trimmed) return "อจ";
    return trimmed.slice(0, 2);
  }, [teacherName]);

  const verificationLabel = useMemo(() => {
    if (profile?.verificationStatus === "trusted-ku") return "ยืนยันโดยโดเมน @ku.th";
    if (profile?.verificationStatus === "verified-non-ku") return "ยืนยันตัวตนแล้ว";
    return "ยังไม่ยืนยันตัวตน";
  }, [profile?.verificationStatus]);

  const verificationTone = useMemo(() => {
    if (profile?.verificationStatus === "trusted-ku" || profile?.verificationStatus === "verified-non-ku") {
      return "bg-primary/10 text-primary";
    }
    return "bg-amber-100 text-amber-800";
  }, [profile?.verificationStatus]);

  return (
    <div className="min-h-screen bg-background">
      {/* ===== DESKTOP Top bar ===== */}
      <header className="sticky top-0 z-50 hidden md:flex h-16 items-center justify-between border-b border-border bg-card px-8 shadow-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-lg font-bold text-foreground">KU Classroom</span>
            <span className="ml-2 text-xs text-muted-foreground">for Teachers</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {teacherNav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-accent text-primary font-semibold"
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={promptLogout}>
            <LogOut className="h-4 w-4" />
            <span>ออกจากระบบ</span>
          </Button>
          <span className="text-sm text-muted-foreground max-w-[240px] truncate">{teacherName}</span>
          <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${verificationTone}`}>
            {verificationLabel}
          </span>
          <Avatar className="h-9 w-9">
            {profile?.photoURL && <AvatarImage src={profile.photoURL} alt={teacherName} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">{avatarText}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* ===== MOBILE Header ===== */}
      <header className="flex items-center justify-between px-5 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-[18px] font-bold text-foreground">KU Classroom</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground" onClick={promptLogout}>
            <LogOut className="h-4 w-4" />
          </button>
          <Avatar className="h-9 w-9">
            {profile?.photoURL && <AvatarImage src={profile.photoURL} alt={teacherName} />}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{avatarText}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {profile?.verificationStatus === "unverified-non-ku" && !profile?.isGuest && (
        <div className="mx-4 mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 md:mx-8">
          บัญชีอาจารย์ยังไม่ยืนยันตัวตน นิสิตจะเห็นสถานะนี้เพื่อความปลอดภัย
        </div>
      )}

      {profile?.isGuest && (
        <div className="mx-4 mt-2 flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary md:mx-8">
          <Sparkles className="h-4 w-4" />
          <span className="font-medium">โหมดผู้เยี่ยมชม (Guest Mode):</span>
          <span>คุณสามารถทดลองสร้างข้อมูลและดูฟังก์ชันต่างๆ ได้ แต่ข้อมูลจะไม่ถูกบันทึกอย่างถาวรและไม่สามารถใช้งานร่วมกับนิสิตจริงได้</span>
        </div>
      )}

      {/* ===== MOBILE Bottom Nav ===== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-[60px] items-center justify-around px-2">
          {teacherNav.map((item) => {
            const isActive = location.pathname === item.url || (item.url === "/" && location.pathname.startsWith("/classroom"));
            return (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === "/"}
                className="relative flex flex-col items-center gap-0.5 px-6 py-1.5"
                activeClassName=""
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-200 ${
                  isActive ? "bg-primary/10 scale-110" : ""
                }`}>
                  <item.icon className={`h-[20px] w-[20px] transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`} />
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.title}
                </span>
                {isActive && (
                  <span className="absolute -top-[1px] left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-primary" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-4 pb-24 md:px-8 md:py-8 md:pb-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>

      <LogoutDialog open={open} onConfirm={confirmLogout} onCancel={cancel} />
    </div>
  );
}
