import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useAssignmentById, useClassroomGroups, useGroupMembers, useTeacherActivities } from "@/lib/db";

const AssignmentGroups = () => {
  const { assignmentId } = useParams();
  const { data: assignment, loading: assignmentLoading } = useAssignmentById(assignmentId);
  const classroomId = assignment?.classroomId;

  const { data: classroomGroups = [] } = useClassroomGroups(classroomId);
  const { data: groupMembers = [] } = useGroupMembers(classroomId);
  const { data: teacherActivities = [] } = useTeacherActivities();

  const classroom = teacherActivities.find((item) => String(item.id) === String(classroomId));

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
            <h1 className="text-2xl font-bold">AI Group Result</h1>
            <p className="mt-1 text-sm opacity-90">งาน: {assignment.title}</p>
            <p className="text-sm opacity-90">ห้องเรียน: {classroom?.name || assignment.classroomId}</p>
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
