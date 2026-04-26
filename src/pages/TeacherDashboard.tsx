import { useState } from "react";
import { Link } from "react-router-dom";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/MotionWrappers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, CheckCircle, Clock, QrCode, MoreVertical, Sparkles, ChevronRight, X } from "lucide-react";
import { useTeacherActivities } from "@/lib/db";
import { db } from "@/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ClassroomQRDialog } from "@/components/teacher/ClassroomQRDialog";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const bannerColors = [
  "from-[hsl(153,100%,20%)] to-[hsl(153,80%,30%)]",
  "from-[hsl(200,80%,40%)] to-[hsl(200,60%,50%)]",
  "from-[hsl(280,60%,45%)] to-[hsl(280,40%,55%)]",
  "from-[hsl(30,80%,50%)] to-[hsl(30,60%,55%)]",
];

const TeacherDashboard = () => {
  const { authUser } = useAuth();
  const { toast } = useToast();
  const { data: teacherActivities = [] } = useTeacherActivities();
  const [qrActivity, setQrActivity] = useState<{ id: string | number; name: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create / Edit Form State
  const [editId, setEditId] = useState<string | number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [membersPerGroup, setMembersPerGroup] = useState("4");
  const [requirements, setRequirements] = useState<string[]>([]);
  const toggleRequirement = (skill: string) => {
    setRequirements(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const openCreateDialog = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setMembersPerGroup("4");
    setRequirements([]);
    setCreateOpen(true);
  };

  const openEditDialog = (activity: any) => {
    setEditId(activity.id);
    setName(activity.name || "");
    setDescription(activity.description || "");
    setMembersPerGroup(String(activity.membersPerGroup || 4));
    setRequirements(activity.requirements || []);
    setCreateOpen(true);
  };

  const handleDeleteClassroom = async (id: string | number) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบ Classroom นี้?")) return;
    try {
      await deleteDoc(doc(db, "teacherActivities", String(id)));
      toast({ title: "ลบ Classroom สำเร็จ", description: "ลบห้องเรียนเรียบร้อยแล้ว" });
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาดในการลบ", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateOrEditClassroom = async () => {
    if (!name || !description || requirements.length === 0) {
      toast({
        title: "ข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อวิชา คำอธิบาย และเลือกทักษะที่ต้องการอย่างน้อย 1 อย่าง",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editId) {
        // Edit mode
        await updateDoc(doc(db, "teacherActivities", String(editId)), {
          name,
          description,
          membersPerGroup: parseInt(membersPerGroup, 10),
          requirements,
          updatedAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
        });
        toast({ title: "อัปเดต Classroom สำเร็จ 🎉", description: "ข้อมูลห้องเรียนถูกแก้ไขแล้ว" });
      } else {
        // Create mode
        await addDoc(collection(db, "teacherActivities"), {
          ownerId: authUser?.uid || "unknown",
          name,
          description,
          membersPerGroup: parseInt(membersPerGroup, 10),
          requirements,
          students: 0,
          groups: 0,
          status: "waiting",
          createdAt: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
        });
        toast({ title: "สร้าง Classroom สำเร็จ 🎉", description: "คุณสามารถเริ่มเพิ่มนิสิตเข้าห้องเรียนได้เลย" });
      }
      
      setCreateOpen(false);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TeacherLayout>
      <PageTransition>
        <div className="space-y-5">
          {/* Global Dialog for Creating Classroom */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="rounded-2xl sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editId ? "แก้ไข Classroom" : "สร้าง Classroom ใหม่"}</DialogTitle>
                <DialogDescription>กรอกข้อมูลวิชาหรือ Classroom เพื่อให้นิสิตเข้าร่วม</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>ชื่อ Classroom / วิชา</Label>
                  <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น CPE 401 — Senior Project" 
                    className="rounded-xl border-border/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>คำอธิบาย</Label>
                  <Input 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="เช่น กลุ่มเรียน ภาค 2/2568" 
                    className="rounded-xl border-border/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>จำนวนคนต่อกลุ่ม</Label>
                  <Select value={membersPerGroup} onValueChange={setMembersPerGroup}>
                    <SelectTrigger className="rounded-xl border-border/50"><SelectValue placeholder="เลือก" /></SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} คน</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ทักษะที่ต้องการ</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Tech", "Finance", "Marketing", "Design", "Data", "Leadership"].map((skill) => {
                      const isSelected = requirements.includes(skill);
                      return (
                        <Badge 
                          key={skill} 
                          onClick={() => toggleRequirement(skill)}
                          className={`cursor-pointer rounded-full border-0 px-3 py-1 text-xs transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground hover:bg-primary/20"}`}
                        >
                          {skill}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <Button 
                  disabled={isSubmitting}
                  className="w-full gap-2 rounded-xl bg-primary text-primary-foreground" 
                  onClick={handleCreateOrEditClassroom}
                >
                  <Sparkles className="h-4 w-4" /> {isSubmitting ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "สร้าง Classroom"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ===== MOBILE LAYOUT ===== */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-[22px] font-bold text-foreground">Classrooms</h1>
                <p className="text-[12px] text-muted-foreground">จัดการห้องเรียนและ AI จัดกลุ่ม</p>
              </div>
              <button 
                onClick={openCreateDialog}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Mobile classroom cards */}
            <div className="space-y-3">
              {teacherActivities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link to={`/classroom/${activity.id}`}>
                    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden active:scale-[0.98] transition-transform">
                      <div className={`h-2 bg-gradient-to-r ${bannerColors[i % bannerColors.length]}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-foreground leading-tight">{activity.name}</h3>
                            <p className="mt-1 text-[11px] text-muted-foreground">สร้างเมื่อ {activity.createdAt}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-1 flex-shrink-0" />
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{activity.students} นิสิต</span>
                          </div>
                          <span className="text-border">•</span>
                          <span className="text-[12px] text-muted-foreground">{activity.groups} กลุ่ม</span>
                          {activity.status === "grouped" ? (
                            <Badge className="ml-auto rounded-full bg-primary/10 text-primary border-0 px-2 py-0.5 text-[10px]">
                              <CheckCircle className="mr-1 h-2.5 w-2.5" /> จัดกลุ่มแล้ว
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="ml-auto rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 px-2 py-0.5 text-[10px]">
                              <Clock className="mr-1 h-2.5 w-2.5" /> รอจัดกลุ่ม
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {activity.requirements.map((r) => (
                            <Badge key={r} variant="secondary" className="rounded-full bg-accent text-accent-foreground border-0 px-2 py-0.5 text-[9px]">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* Add card */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: teacherActivities.length * 0.06 }}
                onClick={openCreateDialog}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 py-8 text-muted-foreground transition-colors hover:border-primary/40"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm font-medium">สร้าง Classroom ใหม่</span>
              </motion.button>
            </div>
          </div>

          {/* ===== DESKTOP LAYOUT ===== */}
          <div className="hidden md:block space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Classrooms</h1>
                <p className="text-sm text-muted-foreground">จัดการห้องเรียน สร้าง QR Code และใช้ AI จัดกลุ่มนิสิต</p>
              </div>
              <Button 
                onClick={openCreateDialog}
                className="gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              >
                <Plus className="h-4 w-4" /> สร้าง Classroom
              </Button>
            </div>

            <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {teacherActivities.map((activity, i) => (
                <StaggerItem key={activity.id}>
                  <Card className="group overflow-hidden rounded-2xl border-border/50 shadow-sm transition-shadow hover:shadow-md">
                    <div className={`relative h-28 bg-gradient-to-br ${bannerColors[i % bannerColors.length]} p-5`}>
                      <div className="absolute right-3 top-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:bg-white/20 hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setQrActivity({ id: activity.id, name: activity.name })}>
                              <QrCode className="mr-2 h-4 w-4" /> QR Code
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(activity)}>แก้ไข</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClassroom(activity.id)}>ลบ</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Link to={`/classroom/${activity.id}`}>
                        <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 cursor-pointer hover:underline">
                          {activity.name}
                        </h3>
                        <p className="mt-1 text-xs text-white/70">สร้างเมื่อ {activity.createdAt}</p>
                      </Link>
                    </div>
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{activity.students} นิสิต</span>
                          <span className="text-border">•</span>
                          <span>{activity.groups} กลุ่ม</span>
                        </div>
                        {activity.status === "grouped" ? (
                          <Badge className="rounded-full bg-primary/10 text-primary border-0 px-2.5 py-0.5 text-[11px]">
                            <CheckCircle className="mr-1 h-3 w-3" /> จัดกลุ่มแล้ว
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 px-2.5 py-0.5 text-[11px]">
                            <Clock className="mr-1 h-3 w-3" /> รอจัดกลุ่ม
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activity.requirements.map((r) => (
                          <Badge key={r} variant="secondary" className="rounded-full bg-accent text-accent-foreground border-0 px-2.5 py-0.5 text-[10px]">
                            {r}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Link to={`/classroom/${activity.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-lg text-xs">
                            เปิด Classroom
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs"
                          onClick={() => setQrActivity({ id: activity.id, name: activity.name })}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}

              <StaggerItem>
                <Card
                  className="flex min-h-[220px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-border/60 transition-colors hover:border-primary/40 hover:bg-accent/30"
                  onClick={openCreateDialog}
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Plus className="h-8 w-8" />
                    <span className="text-sm font-medium">สร้าง Classroom ใหม่</span>
                  </div>
                </Card>
              </StaggerItem>
            </StaggerContainer>
          </div>
        </div>
      </PageTransition>

      <ClassroomQRDialog
        open={!!qrActivity}
        onOpenChange={(open) => !open && setQrActivity(null)}
        classroom={qrActivity}
      />
    </TeacherLayout>
  );
};

export default TeacherDashboard;
