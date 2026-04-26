import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Brain, Users, FolderKanban, TrendingUp, ArrowRight, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const features = [
  { icon: Brain, title: "Smart Skill Profiling", description: "AI วิเคราะห์ทักษะจากรายวิชา กิจกรรม และความสนใจ สร้าง Skill Profile แบบ Dynamic" },
  { icon: Users, title: "AI Team Matching", description: "จับคู่ทีมที่เสริมกันด้วย AI วิเคราะห์ความเข้ากันของทักษะและสไตล์การทำงาน" },
  { icon: FolderKanban, title: "Intelligent Workspace", description: "Kanban Board อัจฉริยะพร้อม AI แนะนำแผนงาน บทบาท และ Milestone อัตโนมัติ" },
  { icon: TrendingUp, title: "Career Path Insight", description: "แนะนำเส้นทางอาชีพส่วนตัว วิเคราะห์ช่องว่างทักษะ และ Roadmap การเติบโต" },
];

const stats = [
  { value: "500+", label: "นิสิต KU" },
  { value: "120+", label: "โปรเจกต์" },
  { value: <span>4.9<Star className="h-4 w-4 ml-1 inline text-yellow-500 fill-current" /></span>, label: "คะแนน" },
  { value: "AI", label: "Powered" },
];

const LandingPage = () => {
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && userProfile) {
      if (userProfile.onboardingStep >= 4) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [userProfile, loading, navigate]);
  
  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-10 md:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary md:h-9 md:w-9 md:rounded-xl">
              <span className="text-xs font-bold text-primary-foreground md:text-sm">KU</span>
            </div>
            <span className="text-lg font-bold text-foreground md:text-xl">LifeOS</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm md:text-base">
                เข้าสู่ระบบ
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90 md:px-6">
                เริ่มต้น
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pb-16 pt-14 md:px-10 md:pb-28 md:pt-24">
        {/* Background blobs */}
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-primary/8 blur-3xl md:h-[500px] md:w-[500px]" />
        <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-accent/60 blur-3xl md:h-[300px] md:w-[300px]" />

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground md:text-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-Powered Platform for KU Students
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="mb-5 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-6xl md:leading-tight"
          >
            Student Life{" "}
            <span className="text-primary">Operating System</span>
            {" "}ที่ขับเคลื่อนด้วย AI
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-muted-foreground md:mb-10 md:max-w-2xl md:text-lg"
          >
            ค้นพบจุดแข็ง สร้างทีมที่ใช่ และวางแผนอนาคต — ทุกอย่างในแพลตฟอร์มเดียวสำหรับ Kasetsart University
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full gap-2 rounded-2xl bg-primary px-8 text-base font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto">
                เริ่มต้นใช้งานฟรี
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 w-full rounded-2xl border-border/60 px-8 text-base font-semibold text-foreground hover:bg-accent sm:w-auto">
                ดูฟีเจอร์
              </Button>
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-8"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-extrabold text-primary md:text-2xl">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section id="features" className="bg-muted/30 px-5 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center md:mb-12">
            <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
              เครื่องมืออัจฉริยะสำหรับชีวิตในมหาวิทยาลัย
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">ทุกฟีเจอร์ขับเคลื่อนด้วย AI</p>
          </div>

          {/* Mobile: stacked list / Desktop: grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              >
                <div className="card-hover group flex h-full flex-col rounded-2xl border border-border/50 bg-card p-5 md:p-6">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent transition-colors group-hover:bg-primary/10 md:h-12 md:w-12">
                    <feature.icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
                  </div>
                  <h3 className="mb-1.5 text-[15px] font-bold text-foreground md:mb-2 md:text-base">{feature.title}</h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground md:text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="px-5 py-14 md:px-10 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl bg-primary px-8 py-10 md:px-12 md:py-14"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-primary-foreground/80">
              <Star className="h-3 w-3" /> สำหรับนิสิต KU ทุกคน
            </div>
            <h2 className="mb-3 text-2xl font-extrabold text-primary-foreground md:text-3xl">
              พร้อมเริ่มต้นแล้วหรือยัง?
            </h2>
            <p className="mb-7 text-sm text-primary-foreground/70 md:text-base">
              สร้างโปรไฟล์ด้วย AI ฟรีทันที ไม่ต้องใช้บัตรเครดิต
            </p>
            <Link to="/auth">
              <Button size="lg" className="h-12 gap-2 rounded-2xl bg-background px-8 text-base font-bold text-primary hover:bg-background/90">
                เริ่มต้นเลย <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border px-5 py-6 text-center md:px-10 md:py-8">
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <span className="text-[10px] font-bold text-primary-foreground">KU</span>
          </div>
          <span className="text-sm font-bold text-foreground">LifeOS</span>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; 2026 KU LifeOS — Kasetsart University. Built with AI for a smarter campus.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
