import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Brain, QrCode, ArrowLeft, Clock, Trash2, UserPlus, FolderKanban, Circle, CheckCircle2, MoreVertical, Info, Plus } from "lucide-react";
import { useTeacherActivities, useTeacherStudents, useProjectSpaces } from "@/lib/db";
import { ClassroomQRDialog } from "@/components/teacher/ClassroomQRDialog";

const bannerColors = [
  "from-green-600 to-emerald-800",
  "from-blue-600 to-sky-800",
  "from-purple-600 to-indigo-800",
  "from-orange-500 to-red-700",
];

const patterns = [
  "radial-gradient(circle at center, rgba(255,255,255,0.1) 1px, transparent 1px) 0 0 / 20px 20px",
  "linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.05)) 0 0 / 20px 20px",
  "linear-gradient(0deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px) 0 0 / 20px 20px"
];

const ClassroomDetail = () => {
  const { data: teacherActivities = [] } = useTeacherActivities();
  const { data: teacherStudents = [] } = useTeacherStudents();
  const { data: myProjectSpaces = [] } = useProjectSpaces();

  const { classroomId } = useParams();
  const [qrOpen, setQrOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("stream");

  const classroom = teacherActivities.find((a) => String(a.id) === String(classroomId));

  if (!classroom) {
    return (
      <TeacherLayout>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold text-foreground">ไม่พบ Classroom นี้</p>
          <Link to="/"><Button variant="outline" className="mt-4 rounded-xl">กลับ</Button></Link>
        </div>
      </TeacherLayout>
    );
  }

  const stringHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
    return hash;
  };
  const hashVal = typeof classroom.id === 'string' ? stringHash(classroom.id) : (Number(classroom.id) || 0);

  const colorIdx = hashVal % bannerColors.length;
  const patternIdx = hashVal % patterns.length;
  const groupSpaces = myProjectSpaces.filter((s) => String(s.classroomId) === String(classroom.id));
  const classCode = `KU${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return (
    <TeacherLayout>
      <PageTransition>
        <div className="max-w-6xl mx-auto pb-10">
          
          {/* Header Banner - Google Classroom Style */}
          <div className={`relative h-48 md:h-64 w-full rounded-2xl md:rounded-3xl overflow-hidden mb-6 bg-gradient-to-br ${bannerColors[colorIdx]} shadow-md`}>
            {/* Pattern Overlay */}
            <div 
              className="absolute inset-0 opacity-30" 
              style={{ background: patterns[patternIdx] }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Top Bar */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
               <Link to="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/40 text-[13px] text-white backdrop-blur-md transition-colors">
                 <ArrowLeft className="h-4 w-4" /> กลับ
               </Link>
               <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
                 <Info className="h-4 w-4" />
               </Button>
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-4 left-4 md:bottom-6 md:left-8 z-10 right-4">
              <h1 className="text-2xl md:text-4xl font-bold text-white drop-shadow-sm line-clamp-2">{classroom.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-white/90 drop-shadow-sm">
                <span className="text-sm md:text-base font-medium">ภาคต้น ปีการศึกษา 2568</span>
                <span className="h-1 w-1 bg-white/50 rounded-full" />
                <span className="text-xs md:text-sm">{classroom.students} นิสิต</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex px-1 md:px-6 mb-6 overflow-x-auto scrollbar-hide border-b border-border/40">
              <TabsList className="bg-transparent p-0 w-full justify-start h-auto gap-2 md:gap-4 flex-nowrap">
                {["stream", "classwork", "people", "groups"].map((tab) => (
                  <TabsTrigger 
                    key={tab}
                    value={tab} 
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-3 font-semibold text-[13px] md:text-[15px] text-muted-foreground transition-all hover:text-foreground shrink-0"
                  >
                    {tab === "stream" && "สตรีม"}
                    {tab === "classwork" && "งานของชั้นเรียน"}
                    {tab === "people" && "ผู้คน"}
                    {tab === "groups" && "การจัดกลุ่ม"}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Stream Tab */}
            <TabsContent value="stream" className="mt-0 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-1 text-card-foreground">
                
                {/* Left Sidebar */}
                <div className="hidden lg:flex flex-col gap-4">
                  <Card className="rounded-xl border border-border bg-card shadow-sm overflow-hidden text-card-foreground">
                    <CardHeader className="bg-muted/30 pb-3 p-4 flex flex-row items-center justify-between">
                      <span className="text-sm font-semibold">รหัสชั้นเรียน</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setQrOpen(true)}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                       <p className="text-2xl font-bold tracking-widest text-primary">{classCode}</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl border border-border shadow-sm">
                    <CardHeader className="pb-2 p-4">
                      <CardTitle className="text-sm font-semibold">งานที่กำลังจะมาถึง</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <p className="text-sm text-muted-foreground">เย้! ไม่มีงานที่ต้องส่งเร็วๆ นี้</p>
                    </CardContent>
                    <CardFooter className="p-2 pr-4 pt-0 w-full flex justify-end">
                      <Button variant="link" size="sm" className="h-8 text-[13px] font-semibold text-primary px-0">ดูทั้งหมด</Button>
                    </CardFooter>
                  </Card>
                </div>

                {/* Main Feed */}
                <div className="lg:col-span-3 flex flex-col gap-5">
                  {/* Mobile Class Code */}
                  <div className="lg:hidden flex items-center justify-between bg-card text-card-foreground border border-border rounded-xl p-4 shadow-sm">
                     <div>
                       <p className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">รหัสชั้นเรียน</p>
                       <p className="text-lg font-bold tracking-widest text-primary">{classCode}</p>
                     </div>
                     <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => setQrOpen(true)}>
                       <QrCode className="h-4 w-4 mr-2" /> แสดง
                     </Button>
                  </div>

                  {/* Announcement Input Box */}
                  <Card className="rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow bg-card cursor-text">
                    <CardContent className="p-4 flex items-center gap-4">
                       <Avatar className="h-10 w-10 border border-border">
                         <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=Teacher&backgroundColor=e2e8f0" />
                         <AvatarFallback>TC</AvatarFallback>
                       </Avatar>
                       <div className="text-sm text-muted-foreground font-medium">ประกาศสิ่งต่างๆ ให้ชั้นเรียนของคุณ...</div>
                    </CardContent>
                  </Card>

                  {/* Dummy Announcements */}
                  <StaggerContainer className="flex flex-col gap-5">
                    <StaggerItem>
                      <Card className="rounded-xl border border-border shadow-sm">
                        <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
                          <div className="h-11 w-11 flex items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 shadow-sm">
                             <FolderKanban className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">Teacher Post โพสต์งานใหม่: Final Project Proposal</p>
                            <p className="text-[12px] text-muted-foreground mt-0.5">เมื่อวานนี้</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </CardHeader>
                      </Card>
                    </StaggerItem>
                    
                    <StaggerItem>
                      <Card className="rounded-xl border border-border shadow-sm">
                        <CardHeader className="p-4 flex flex-row items-center gap-3 pb-3">
                           <Avatar className="h-11 w-11 border border-border shadow-sm">
                             <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=Teacher&backgroundColor=e2e8f0" />
                             <AvatarFallback>TC</AvatarFallback>
                           </Avatar>
                           <div className="flex-1">
                             <p className="text-sm font-semibold text-foreground">Teacher Post</p>
                             <p className="text-[12px] text-muted-foreground mt-0.5">22 มี.ค.</p>
                           </div>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
                            <MoreVertical className="h-4 w-4" />
                           </Button>
                        </CardHeader>
                        <CardContent className="px-4 pb-4 pt-0 text-[14px] md:text-[15px] leading-relaxed text-foreground border-b border-border/40">
                          ยินดีต้อนรับนิสิตทุกคนเข้าสู่รายวิชาโปรเจกต์ภาคต้น ปีการศึกษา 2568 ครับ!
                          กรุณาจัดกลุ่มให้เรียบร้อย และแจ้งทักษะความถนัดของตนเองลงในระบบด้วย ภายในช่วงสุดสัปดาห์นี้ระบบ AI จะเริ่มแนะนำและจับคู่กลุ่มให้กับผู้ที่ยังไม่มีกลุ่มนะครับ 
                          <br/><br/>
                          หากมีคำถามเพิ่มเติมสามารถพิมพ์ถามทิ้งไว้ด้านล่างได้เลย
                        </CardContent>
                        <CardFooter className="p-0">
                          <Button variant="ghost" className="w-full justify-start h-12 rounded-none rounded-b-xl text-muted-foreground font-medium text-sm border-t border-border bg-muted/10">
                            เพิ่มความคิดเห็นในชั้นเรียน...
                          </Button>
                        </CardFooter>
                      </Card>
                    </StaggerItem>

                  </StaggerContainer>
                </div>
              </div>
            </TabsContent>

            {/* Classwork Tab */}
            <TabsContent value="classwork" className="mt-0 outline-none">
               <div className="px-1 lg:px-8">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-border/60 pb-6">
                    <Button className="rounded-full shadow-sm px-6 h-12 text-[15px] font-semibold gap-2">
                       <Plus className="h-5 w-5" /> สร้างงาน
                    </Button>
                    <Badge variant="secondary" className="rounded-md font-semibold px-3 py-1 bg-muted">
                        คลาสนี้มีทั้งหมด {groupSpaces.length} โปรเจกต์จัดกลุ่มแล้ว
                    </Badge>
                 </div>

                 <StaggerContainer className="grid gap-5 md:grid-cols-2">
                    {groupSpaces.length === 0 ? (
                      <Card className="col-span-2 rounded-2xl border-dashed border-2 bg-transparent shadow-none">
                        <CardContent className="py-20 text-center">
                          <FolderKanban className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                          <p className="text-xl font-semibold text-foreground">ยังไม่มีโปรเจกต์ของนิสิตในชั้นเรียนนี้</p>
                          <p className="text-sm text-muted-foreground mt-2">เมื่องานถูกได้รับมอบหมายและกลุ่มเริ่มทำ คุณจะเห็นความคืบหน้าที่นี่</p>
                        </CardContent>
                      </Card>
                    ) : (
                      groupSpaces.map((space) => {
                        const total = space.tasks.length;
                        const done = space.tasks.filter((t) => t.status === "done").length;
                        const inProg = space.tasks.filter((t) => t.status === "inProgress").length;
                        const todo = space.tasks.filter((t) => t.status === "todo").length;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                        return (
                          <StaggerItem key={space.id}>
                            <Card className="h-full rounded-2xl border border-border shadow-sm transition-all hover:border-primary/30">
                              <CardHeader className="pb-4 border-b border-border/40">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className="rounded border-0 bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
                                        กลุ่ม {space.groupName}
                                      </Badge>
                                    </div>
                                    <CardTitle className="text-base text-foreground leading-tight">{space.name}</CardTitle>
                                    <p className="mt-1 text-[13px] text-muted-foreground line-clamp-2">{space.description}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0 bg-muted/60 rounded-xl p-3">
                                    <p className="text-xl font-bold tracking-tight text-foreground">{pct}%</p>
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Complete</p>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-4 space-y-4">
                                <Progress value={pct} className="h-2.5 rounded-full bg-muted" />
                                <div className="flex justify-between text-[12px] font-semibold text-muted-foreground">
                                  <span className="flex items-center gap-1.5"><Circle className="h-3.5 w-3.5" /> To Do: {todo}</span>
                                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> In Prog: {inProg}</span>
                                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Done: {done}</span>
                                </div>
                                <div className="space-y-1.5 pt-3 border-t border-border/40">
                                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1 mb-2">Recent Tasks</p>
                                  {space.tasks.slice(0, 3).map((task) => (
                                    <div key={task.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-card border border-border/50">
                                      {task.status === "done" ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                      ) : task.status === "inProgress" ? (
                                        <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                      )}
                                      <p className="flex-1 min-w-0 text-[13px] truncate text-foreground font-medium">{task.title}</p>
                                      <Avatar className="h-6 w-6 shrink-0 border border-border">
                                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">{task.assignee}</AvatarFallback>
                                      </Avatar>
                                    </div>
                                  ))}
                                  {space.tasks.length > 3 && (
                                    <p className="text-[11px] font-semibold text-center text-muted-foreground pt-2">+ อีก {space.tasks.length - 3} งาน</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </StaggerItem>
                        );
                      })
                    )}
                 </StaggerContainer>
               </div>
            </TabsContent>

            {/* People Tab */}
            <TabsContent value="people" className="mt-0 outline-none">
              <div className="max-w-4xl mx-auto px-2 md:px-0 space-y-14 mt-4">
                {/* Teachers */}
                <section>
                  <div className="flex items-center justify-between border-b-2 border-primary/20 pb-4 mb-4">
                    <h2 className="text-3xl font-normal text-primary tracking-tight">ครูผู้สอน</h2>
                    <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 text-primary hover:bg-primary/10">
                      <UserPlus className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 px-2 py-2">
                     <Avatar className="h-10 w-10 border border-border">
                       <AvatarImage src="https://api.dicebear.com/7.x/notionists/svg?seed=Teacher&backgroundColor=e2e8f0" />
                       <AvatarFallback>TC</AvatarFallback>
                     </Avatar>
                     <span className="text-sm font-medium text-foreground">Teacher Post</span>
                  </div>
                </section>

                {/* Students */}
                <section>
                  <div className="flex items-center justify-between border-b-2 border-primary/20 pb-4 mb-4">
                    <h2 className="text-3xl font-normal text-primary tracking-tight">เพื่อนร่วมชั้น</h2>
                    <div className="flex items-center gap-4">
                      <span className="text-[15px] font-semibold text-primary">{teacherStudents.length} นิสิต</span>
                      <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 text-primary hover:bg-primary/10">
                        <UserPlus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    {teacherStudents.map((student) => (
                      <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-4 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{student.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-medium text-foreground">{student.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pl-14 sm:pl-0">
                           <div className="flex flex-wrap gap-1.5 opacity-80">
                             {student.skills.map((s) => (
                               <Badge key={s} variant="secondary" className="rounded bg-muted text-muted-foreground border-0 px-2 py-0 text-[11px] font-medium">{s}</Badge>
                             ))}
                           </div>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                             <MoreVertical className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </TabsContent>

            {/* Groups Tab */}
            <TabsContent value="groups" className="mt-0 outline-none">
              <div className="px-1 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-card border border-border p-4 md:p-6 rounded-2xl shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-3 mb-1">
                       รายชื่อกลุ่ม 
                       <Badge variant="secondary" className="rounded-md bg-muted text-muted-foreground text-xs py-0.5">สถานะ: จัดกลุ่มแล้ว {classroom.groups} กลุ่ม</Badge>
                    </h2>
                    <p className="text-[13px] font-medium text-muted-foreground">ทักษะที่ต้องการ: {classroom.requirements.join(", ")}</p>
                  </div>
                  {classroom.status === "pending" ? (
                    <Button className="rounded-xl shadow-sm h-11 px-5 gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white border-0 w-full sm:w-auto">
                      <Brain className="h-4 w-4" /> สั่ง AI จัดกลุ่ม
                    </Button>
                  ) : (
                    <Button variant="outline" className="rounded-xl font-semibold">
                      จัดการกลุ่ม
                    </Button>
                  )}
                </div>

                <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {["A1", "A2", "A3"].map((group) => {
                    const members = teacherStudents.filter((s) => s.group === group);
                    return (
                      <StaggerItem key={group}>
                        <Card className="rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow h-full bg-card">
                          <CardHeader className="p-4 md:p-5 border-b border-border/40">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-bold text-foreground">
                                กลุ่ม {group}
                              </h3>
                              <Badge variant="secondary" className="rounded-md px-2.5 py-0.5 text-xs font-semibold">
                                {members.length} สมาชิก
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 md:p-5">
                            <div className="space-y-4">
                              {members.map((m) => (
                                <div key={m.id} className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 shrink-0 border border-border">
                                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{m.avatar}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-medium text-foreground truncate">{m.name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate uppercase">{m.skills.join(" • ")}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                          <CardFooter className="p-4 md:p-5 pt-0 mt-auto">
                             <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs font-semibold h-10 border border-border/50 hover:bg-muted">
                               ดูความคืบหน้าของกลุ่มนี้
                             </Button>
                          </CardFooter>
                        </Card>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </PageTransition>

      <ClassroomQRDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        classroom={{ id: classroom.id, name: classroom.name }}
      />
    </TeacherLayout>
  );
};

export default ClassroomDetail;