import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Camera, ChevronRight, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const TeacherSettings = () => {
  return (
    <TeacherLayout>
      <PageTransition>
        {/* ===== MOBILE ===== */}
        <div className="md:hidden space-y-5">
          <h1 className="text-[22px] font-bold text-foreground">ตั้งค่า</h1>

          {/* Profile card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3.5 rounded-2xl border border-border/50 bg-card p-4">
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">อจ</AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-foreground">ดร. สมศักดิ์ เกษตรศาสตร์</p>
                <p className="text-[12px] text-muted-foreground">คณะวิศวกรรมศาสตร์</p>
                <Badge className="mt-1 rounded-full bg-primary/10 text-primary border-0 px-2 py-0.5 text-[10px] font-semibold">อาจารย์</Badge>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </div>
          </motion.div>

          {/* Info form */}
          <div>
            <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">ข้อมูลส่วนตัว</p>
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label className="text-[13px]">ชื่อ</Label>
                  <Input defaultValue="ดร. สมศักดิ์ เกษตรศาสตร์" className="rounded-xl border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]">อีเมล</Label>
                  <Input defaultValue="somsak.k@ku.ac.th" className="rounded-xl border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]">คณะ / ภาควิชา</Label>
                  <Input defaultValue="ภาควิชาวิศวกรรมคอมพิวเตอร์" className="rounded-xl border-border/50" />
                </div>
                <Button className="w-full rounded-xl bg-primary text-primary-foreground gap-2">
                  <Save className="h-4 w-4" /> บันทึก
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== DESKTOP ===== */}
        <div className="hidden md:block">
          <StaggerContainer className="space-y-6">
            <StaggerItem>
              <h1 className="text-2xl font-bold text-foreground">ตั้งค่า</h1>
            </StaggerItem>

            <StaggerItem>
              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">ข้อมูลอาจารย์</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">อจ</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">ดร. สมศักดิ์ เกษตรศาสตร์</p>
                      <p className="text-sm text-muted-foreground">คณะวิศวกรรมศาสตร์</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>ชื่อ</Label>
                      <Input defaultValue="ดร. สมศักดิ์ เกษตรศาสตร์" className="rounded-xl border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>อีเมล</Label>
                      <Input defaultValue="somsak.k@ku.ac.th" className="rounded-xl border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>คณะ / ภาควิชา</Label>
                      <Input defaultValue="ภาควิชาวิศวกรรมคอมพิวเตอร์" className="rounded-xl border-border/50" />
                    </div>
                  </div>
                  <Button className="rounded-xl bg-primary text-primary-foreground">บันทึก</Button>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </PageTransition>
    </TeacherLayout>
  );
};

export default TeacherSettings;
