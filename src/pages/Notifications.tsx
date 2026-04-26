import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, Users, FolderKanban, TrendingUp, CheckCircle, Circle, BellRing } from "lucide-react";
import { useNotifications } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

const typeIcons: Record<string, typeof Bell> = {
  deadline: Calendar, invite: Users, group: Users, task: FolderKanban, career: TrendingUp,
};

const typeColors: Record<string, string> = {
  deadline: "bg-red-100 text-red-600",
  invite: "bg-blue-100 text-blue-600",
  group: "bg-primary/10 text-primary",
  task: "bg-orange-100 text-orange-600",
  career: "bg-purple-100 text-purple-600",
};

const Notifications = () => {
  const { data: notifications = [] } = useNotifications();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (notifications.length > 0 && items.length === 0) {
      setItems(notifications);
    }
  }, [notifications, items.length]);

  const unreadCount = items.filter((n: any) => !n.read).length;

  const markAllRead = () => setItems(items.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: number) => setItems(items.map((n) => n.id === id ? { ...n, read: !n.read } : n));

  return (
    <AppLayout title="Alerts">
      <PageTransition>
        {/* ========== MOBILE ========== */}
        <div className="md:hidden space-y-4">
          {/* Unread count + Mark all */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} ยังไม่ได้อ่าน` : "อ่านครบแล้ว ✓"}
            </p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[13px] font-semibold text-primary">
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* LINE banner - compact */}
          <div className="flex items-center gap-3 rounded-2xl bg-[#06C755]/5 border border-[#06C755]/20 p-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755]/10">
              <span className="text-lg font-bold text-[#06C755]">L</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">LINE OA เชื่อมต่อแล้ว</p>
              <p className="text-[11px] text-muted-foreground">แจ้งเตือนอัตโนมัติผ่าน @ku-lifeos</p>
            </div>
            <Badge className="shrink-0 rounded-full bg-[#06C755]/10 text-[#06C755] border-0 px-2 py-0.5 text-[10px]">Active</Badge>
          </div>

          {/* Notification list */}
          <div className="space-y-1.5">
            <AnimatePresence>
              {items.map((notif, i) => {
                const Icon = typeIcons[notif.type] || Bell;
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => toggleRead(notif.id)}
                    className={`flex items-start gap-3 rounded-2xl p-3.5 transition-colors active:scale-[0.98] transition-transform ${
                      notif.read ? "bg-transparent" : "bg-accent/50"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${typeColors[notif.type]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-[13px] leading-tight ${notif.read ? "text-foreground" : "font-semibold text-foreground"}`}>{notif.title}</p>
                        {!notif.read && <Circle className="h-1.5 w-1.5 shrink-0 fill-primary text-primary" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{notif.message}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60">{notif.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ========== DESKTOP ========== */}
        <div className="hidden md:block">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">การแจ้งเตือน <BellRing className="h-6 w-6 inline ml-2 text-primary" /></h2>
                <p className="text-muted-foreground">
                  {unreadCount > 0 ? `คุณมี ${unreadCount} การแจ้งเตือนที่ยังไม่ได้อ่าน` : "อ่านครบแล้ว!"}
                </p>
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" onClick={markAllRead} className="text-primary hover:bg-accent">
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark all as read
                </Button>
              )}
            </div>

            <StaggerItem>
              <Card className="rounded-2xl border-border/50 bg-accent/30">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#06C755]/10">
                    <span className="text-2xl font-bold text-[#06C755]">L</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">ทุกการแจ้งเตือนส่งผ่าน LINE</p>
                    <p className="text-xs text-muted-foreground">เชื่อมต่อ LINE OA @ku-lifeos แล้ว</p>
                  </div>
                  <Badge className="ml-auto rounded-full bg-[#06C755]/10 text-[#06C755] border-0 px-3 py-1 text-xs">Active</Badge>
                </CardContent>
              </Card>
            </StaggerItem>

            <Card className="rounded-2xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Bell className="h-5 w-5 text-primary" /> ประวัติการแจ้งเตือน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AnimatePresence>
                  {items.map((notif, i) => {
                    const Icon = typeIcons[notif.type] || Bell;
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        onClick={() => toggleRead(notif.id)}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl p-4 transition-colors duration-200 ${
                          notif.read ? "bg-transparent hover:bg-muted/50" : "bg-accent/50 hover:bg-accent"
                        }`}
                      >
                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${typeColors[notif.type]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm ${notif.read ? "text-foreground" : "font-semibold text-foreground"}`}>{notif.title}</p>
                            {!notif.read && <Circle className="h-2 w-2 fill-primary text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{notif.message}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">{notif.time}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </CardContent>
            </Card>

            <StaggerContainer className="grid gap-3 sm:grid-cols-2">
              {[
                { type: "deadline", label: "เดดไลน์", desc: "แจ้งเตือนก่อนหมดเขต 3 วัน" },
                { type: "invite", label: "คำเชิญเข้าทีม", desc: "เมื่อมีคนเชิญเข้าร่วมโปรเจกต์" },
                { type: "group", label: "จับกลุ่ม", desc: "เมื่ออาจารย์จับกลุ่มเสร็จแล้ว" },
                { type: "task", label: "งาน", desc: "เมื่อมีงานใหม่ถูกมอบหมาย" },
                { type: "career", label: "Career Update", desc: "เมื่อ Skill หรือ Career Insight เปลี่ยน" },
              ].map((item) => {
                const Icon = typeIcons[item.type] || Bell;
                return (
                  <StaggerItem key={item.type}>
                    <div className="flex items-center gap-3 rounded-xl border border-border/50 p-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeColors[item.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
};

export default Notifications;
