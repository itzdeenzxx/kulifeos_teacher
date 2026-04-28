import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Wand2 } from "lucide-react";
import { useAssignmentById, useAssignmentGroups, useAssignmentGroupMembers, useTeacherActivities, generateClassroomGroups, getClassroomStudentProfiles } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { generateAIGroupsWithTogether } from "@/lib/aiAnalyze";
import { useState } from "react";
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

  const classroom = teacherActivities.find((item) => String(item.id) === String(classroomId));

  const handleAIGenerateGroups = async () => {
    if (!authUser || !classroomId || !assignmentId) return;
    setGenerating(true);
    try {
      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
      
      // ดึงนิสิตจาก enrollments (ไม่ใช่จาก groupMembers ที่อาจว่างเปล่า)
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

      const aiResult = await generateAIGroupsWithTogether({
        students,
        membersPerGroup: 3,
        requiredSkills: [],
        mode: "interest"
      });

      await generateClassroomGroups({
        classroomId,
        assignmentId,
        teacherUid: authUser.uid,
        mode: "interest",
        membersPerGroup: 3,
        requiredSkills: [],
        aiSuggestedGroups: aiResult.groups.map(g => ({
          name: g.name,
          memberUids: g.memberUids,
          reason: g.reason
        })),
        meta: { classroomName: classroom?.name, actorName: teacherName }
      });

      toast({ title: "จัดกลุ่มด้วย AI สำเร็จ" });
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
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
              {classroomGroups.length === 0 && (
                <Button 
                  onClick={handleAIGenerateGroups} 
                  disabled={generating}
                  className="bg-white text-primary hover:bg-white/90 rounded-xl shadow-md border-0"
                >
                  <Wand2 className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? "กำลังประมวลผล..." : "จัดกลุ่มด้วย AI"}
                </Button>
              )}
            </div>
          </div>

          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" /> กลุ่มที่ AI แนะนำพร้อมเหตุผล
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {classroomGroups.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีผลจัดกลุ่ม</p>}
              {classroomGroups.map((group) => {
                const members = membersByGroupId.get(group.id) || [];
                return (
                  <div key={group.id} className="rounded-xl border border-border/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{group.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{group.aiReason || "AI จัดกลุ่มตามความสมดุลของทักษะ"}</p>
                      </div>
                      <Badge variant="secondary" className="border-0">{members.length} คน</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {members.map((member) => (
                        <Badge key={member.id} variant="secondary" className="border-0">{member.studentName}</Badge>
                      ))}
                    </div>
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

export default AssignmentGroups;
