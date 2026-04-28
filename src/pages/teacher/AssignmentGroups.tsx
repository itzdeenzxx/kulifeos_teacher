import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Wand2, Edit2, CheckCircle2, Loader2, Users, Hand, Trash2 } from "lucide-react";
import { useAssignmentById, useAssignmentGroups, useAssignmentGroupMembers, useTeacherActivities, generateClassroomGroups, getClassroomStudentProfiles, setAssignmentGroupMember, useClassroomEnrollments, copyClassroomGroupsToAssignment, createEmptyAssignmentGroups, clearExistingGroups, deleteSingleGroup, renameGroup } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generateAIGroupsWithTogether } from "@/lib/aiAnalyze";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AssignmentGroups = () => {
  const { assignmentId } = useParams();
  const { data: assignment, loading: assignmentLoading } = useAssignmentById(assignmentId);
  const classroomId = assignment?.classroomId;

  const { data: classroomGroups = [] } = useAssignmentGroups(assignmentId);
  const { data: groupMembers = [] } = useAssignmentGroupMembers(assignmentId);
  const { data: teacherActivities = [] } = useTeacherActivities();

  const { authUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [manualGroupOpen, setManualGroupOpen] = useState(false);
  const [manualGroupCount, setManualGroupCount] = useState("3");

  const { data: enrollments = [] } = useClassroomEnrollments(classroomId);

  const classroom = teacherActivities.find((item) => String(item.id) === String(classroomId));

  const handleAIGenerateGroups = async (mode: GroupingMode) => {
    if (!authUser || !classroomId || !assignmentId) return;
    setGenerating(true);
    try {
      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
      
      const enrolledStudents = await getClassroomStudentProfiles(classroomId);
      const students = enrolledStudents.map(s => ({
        uid: s.uid,
        displayName: s.displayName,
        skills: s.skills || [],
        interests: s.interests || []
      }));

      if (students.length === 0) {
        toast({ title: "ไม่พบรายชื่อนิสิต", description: "กรุณาเพิ่มนิสิตเข้าห้องเรียนก่อน", variant: "destructive" });
        return;
      }

      let aiResult = null;
      if (mode !== "random") {
        aiResult = await generateAIGroupsWithTogether({
          students,
          membersPerGroup: 3,
          requiredSkills: [],
          mode
        });
      }

      await generateClassroomGroups({
        classroomId,
        assignmentId,
        teacherUid: authUser.uid,
        mode,
        membersPerGroup: 3,
        requiredSkills: [],
        aiSuggestedGroups: aiResult?.groups.map((g: any) => ({
          name: g.name,
          memberUids: g.memberUids,
          reason: g.reason
        })),
        meta: { classroomName: classroom?.name, actorName: teacherName }
      });

      toast({ title: "จัดกลุ่มสำเร็จ" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "จัดกลุ่มไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const membersByGroupId = useMemo(() => {
    const map = new Map<string, typeof groupMembers>();
    groupMembers.forEach((member) => {
      const current = map.get(member.groupId) || [];
      current.push(member);
      map.set(member.groupId, current);
    });
    return map;
  }, [groupMembers]);

  const unassignedStudents = useMemo(() => {
    const assignedUids = new Set(groupMembers.map(m => m.studentUid));
    return enrollments.filter(e => !assignedUids.has(e.studentUid));
  }, [enrollments, groupMembers]);

  const handleGroupChange = async (studentUid: string, studentName: string, newGroupId: string) => {
    const targetGroupId = newGroupId === "unassigned" ? null : newGroupId;
    const targetGroupName = targetGroupId ? classroomGroups.find(g => g.id === targetGroupId)?.name : null;
    
    try {
      await setAssignmentGroupMember({
        classroomId: classroomId!,
        assignmentId,
        studentUid,
        studentName,
        newGroupId: targetGroupId,
        newGroupName: targetGroupName
      });
      toast({ title: "ย้ายสมาชิกสำเร็จ" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "ย้ายไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: msg, variant: "destructive" });
    }
  };

  const handleUseDefaultGroups = async () => {
    if (!authUser || !classroomId || !assignmentId) return;
    setGenerating(true);
    try {
      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
      await copyClassroomGroupsToAssignment({
        classroomId,
        assignmentId,
        teacherUid: authUser.uid,
        meta: { actorName: teacherName, classroomName: classroom?.name }
      });
      toast({ title: "ใช้กลุ่มวิชาสำเร็จ" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "ลอกกลุ่มไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleManualGrouping = async () => {
    if (!authUser || !classroomId || !assignmentId) return;
    const count = parseInt(manualGroupCount);
    if (isNaN(count) || count < 1) {
      toast({ title: "เกิดข้อผิดพลาด", description: "จำนวนกลุ่มต้องมากกว่า 0", variant: "destructive" });
      return;
    }
    
    setGenerating(true);
    try {
      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
      await createEmptyAssignmentGroups({
        classroomId,
        assignmentId,
        teacherUid: authUser.uid,
        groupCount: count,
        meta: { actorName: teacherName, classroomName: classroom?.name }
      });
      setManualGroupOpen(false);
      setEditMode(true); // Turn on edit mode automatically
      toast({ title: "สร้างกลุ่มเปล่าสำเร็จ กรุณาจัดสมาชิก" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "สร้างกลุ่มไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleClearGroups = async () => {
    if (!authUser || !classroomId || !assignmentId) return;
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบกลุ่มทั้งหมดในงานนี้? (สามารถจัดกลุ่มใหม่ได้ในภายหลัง)")) return;
    setGenerating(true);
    try {
      await clearExistingGroups(classroomId, assignmentId);
      setEditMode(false);
      toast({ title: "ลบกลุ่มทั้งหมดสำเร็จ" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "ลบกลุ่มไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("คุณต้องการลบกลุ่มนี้ใช่หรือไม่? สมาชิกจะกลายเป็นผู้ที่ยังไม่ถูกจัดกลุ่ม")) return;
    try {
      if (!classroomId) return;
      await deleteSingleGroup(groupId, classroomId);
      toast({ title: "ลบกลุ่มสำเร็จ" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "ลบกลุ่มไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    }
  };

  const handleRenameGroup = async (groupId: string, currentName: string) => {
    const newName = prompt("ชื่อกลุ่มใหม่:", currentName);
    if (!newName || newName === currentName) return;
    try {
      await renameGroup(groupId, newName);
      toast({ title: "เปลี่ยนชื่อกลุ่มสำเร็จ" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "เปลี่ยนชื่อไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    }
  };

  if (assignmentLoading) {
    return (
      <TeacherLayout>
        <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลดข้อมูล...</div>
      </TeacherLayout>
    );
  }

  if (!assignment) {
    return (
      <TeacherLayout>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold text-foreground">ไม่พบ Assignment นี้</p>
          <Link to="/">
            <Button variant="outline" className="mt-4 rounded-xl">กลับหน้า Dashboard</Button>
          </Link>
        </div>
      </TeacherLayout>
    );
  }

  if (assignment.targetType !== "group") {
    return (
      <TeacherLayout>
        <PageTransition>
          <div className="space-y-4 py-10">
            <Link to={`/classroom/${assignment.classroomId}/work`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1 h-4 w-4" /> กลับหน้า Work
            </Link>
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-6 text-center">
                <p className="text-base font-semibold">งานนี้ยังไม่ใช่งานกลุ่ม</p>
                <p className="mt-2 text-sm text-muted-foreground">เปลี่ยนประเภทงานเป็น Group ที่หน้า Work ก่อน</p>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <PageTransition>
        <div className="space-y-5 pb-10">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-emerald-700 p-6 text-primary-foreground shadow-lg">
            <Link to={`/classroom/${assignment.classroomId}/work`} className="mb-2 inline-flex items-center text-sm opacity-90 hover:opacity-100">
              <ArrowLeft className="mr-1 h-4 w-4" /> กลับหน้า Work
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{assignment.title}</h1>
                <p className="mt-1 text-sm opacity-90">กลุ่มสำหรับงานนี้ (Assignment Groups)</p>
                <p className="text-sm opacity-90">ห้องเรียน: {classroom?.name || assignment.classroomId}</p>
              </div>
            </div>
          </div>

          {classroomGroups.length === 0 && !generating ? (
            <Card className="rounded-2xl border-border/50 border-dashed bg-slate-50/50">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Users className="mb-4 h-12 w-12 text-slate-300" />
                <h2 className="text-lg font-semibold text-slate-700">ยังไม่มีการจัดกลุ่มในงานนี้</h2>
                <p className="mb-8 mt-2 text-sm text-slate-500 max-w-md">
                  กรุณาเลือกวิธีการจัดกลุ่มสำหรับงาน <strong>{assignment.title}</strong>
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto flex-col gap-2 p-4 w-40 rounded-2xl border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                    onClick={handleUseDefaultGroups}
                  >
                    <Users className="h-6 w-6 text-emerald-600" />
                    <span className="text-emerald-800 font-medium text-sm">คัดลอกกลุ่มของวิชา<br/><span className="text-xs opacity-70 font-normal">ตามที่จัดไว้ตอนแรก</span></span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-auto flex-col gap-2 p-4 w-40 rounded-2xl border-sky-200 hover:bg-sky-50 hover:border-sky-300 transition-colors">
                        <Wand2 className="h-6 w-6 text-sky-600" />
                        <span className="text-sky-800 font-medium text-sm">จัดกลุ่มอัตโนมัติ<br/><span className="text-xs opacity-70 font-normal">สุ่มหรือใช้ AI วิเคราะห์</span></span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl">
                      <DropdownMenuItem onClick={() => handleAIGenerateGroups("random")} className="cursor-pointer rounded-lg p-3">
                        <Users className="mr-3 h-4 w-4 text-slate-600" /> สุ่มรายชื่อ
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAIGenerateGroups("skill")} className="cursor-pointer rounded-lg p-3">
                        <Sparkles className="mr-3 h-4 w-4 text-sky-600" /> ตามความสามารถ (Skills)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAIGenerateGroups("interest")} className="cursor-pointer rounded-lg p-3">
                        <Sparkles className="mr-3 h-4 w-4 text-emerald-600" /> ตามความถนัด (Interests)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button 
                    variant="outline" 
                    className="h-auto flex-col gap-2 p-4 w-40 rounded-2xl border-amber-200 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                    onClick={() => setManualGroupOpen(true)}
                  >
                    <Hand className="h-6 w-6 text-amber-600" />
                    <span className="text-amber-800 font-medium text-sm">จัดกลุ่มเอง<br/><span className="text-xs opacity-70 font-normal">สร้างกลุ่มว่างและลากวาง</span></span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : generating ? (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="flex flex-col items-center py-12 text-center text-muted-foreground">
                <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
                <p>กำลังประมวลผลการจัดกลุ่ม...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="rounded-2xl border-border/50 bg-transparent shadow-none border-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4">
                  <div className="inline-flex items-center gap-2 text-base sm:text-lg font-semibold">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> กลุ่มสำหรับงาน: {assignment.title}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleClearGroups}
                      className="rounded-xl flex-1 sm:flex-none text-xs"
                      disabled={generating}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> ลบกลุ่ม
                    </Button>
                    <Button 
                      variant={editMode ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setEditMode(!editMode)}
                      className="rounded-xl flex-1 sm:flex-none text-xs"
                    >
                      {editMode ? <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5"/> เสร็จสิ้น</> : <><Edit2 className="mr-1.5 h-3.5 w-3.5"/> จัดการสมาชิก</>}
                    </Button>
                  </div>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classroomGroups.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีผลจัดกลุ่ม</p>}
              {classroomGroups.map((group) => {
                const members = membersByGroupId.get(group.id) || [];
                return (
                  <Card key={group.id} className="rounded-xl border-border/50 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-3 border-b border-border/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle 
                            className="text-base font-bold text-slate-800 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleRenameGroup(group.id, group.name)}
                          >
                            {group.name}
                          </CardTitle>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {members.length} คน
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {group.aiReason && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1" title={group.aiReason}>
                          {group.aiReason}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-3 pb-4 space-y-2">
                      {members.length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-4">ไม่มีสมาชิกในกลุ่ม</p>
                      )}
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-lg bg-slate-50/50 px-3 py-2 border border-slate-100">
                          <span className="text-sm font-medium text-slate-700 truncate">{member.studentName || member.studentUid}</span>
                          {editMode && (
                            <Select 
                              value={group.id} 
                              onValueChange={(val) => handleGroupChange(member.studentUid, member.studentName || member.studentUid, val)}
                            >
                              <SelectTrigger className="w-[120px] h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {classroomGroups.map(g => (
                                  <SelectItem key={g.id} value={g.id} className="text-xs">{g.name}</SelectItem>
                                ))}
                                <SelectItem value="unassigned" className="text-xs text-red-600">นำออกจากกลุ่ม</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            </Card>

          {editMode && unassignedStudents.length > 0 && (
            <Card className="rounded-2xl border-border/50 bg-amber-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-amber-800">นิสิตที่ยังไม่มีกลุ่ม ({unassignedStudents.length} คน)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {unassignedStudents.map(student => {
                    const studentName = enrollments.find(e => e.studentUid === student.studentUid)?.studentUid || student.studentUid; // We'll just use UID or maybe fetch name if available
                    return (
                      <div key={student.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white p-2 shadow-sm">
                        <span className="text-sm font-medium">{student.studentUid}</span>
                        <Select value="unassigned" onValueChange={(val) => handleGroupChange(student.studentUid, student.studentUid, val)}>
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue placeholder="เลือกกลุ่ม..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" disabled>ไม่มีกลุ่ม</SelectItem>
                            {classroomGroups.map(g => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          </>
          )}
        </div>
      </PageTransition>

      <Dialog open={manualGroupOpen} onOpenChange={setManualGroupOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>จัดกลุ่มเอง (สร้างกลุ่มว่าง)</DialogTitle>
            <DialogDescription>ระบบจะสร้างกลุ่มที่ยังไม่มีสมาชิกให้ คุณสามารถลากหรือเพิ่มนิสิตเข้ากลุ่มเองได้ในโหมดแก้ไข</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>จำนวนกลุ่มที่ต้องการสร้าง</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={manualGroupCount}
                onChange={(e) => setManualGroupCount(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setManualGroupOpen(false)}>ยกเลิก</Button>
            <Button className="rounded-xl" onClick={handleManualGrouping} disabled={generating}>
              {generating ? "กำลังสร้าง..." : "สร้างกลุ่ม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
};

export default AssignmentGroups;
