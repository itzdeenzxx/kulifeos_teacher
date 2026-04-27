import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  createAssignment,
  updateAssignmentTargetType,
  useAssignmentsByClassroom,
  useClassroomEnrollments,
  useClassroomGroups,
  useGroupMembers,
  useSubmissionsByClassroom,
  useTeacherActivities,
} from "@/lib/db";

function formatDateLabel(value?: string) {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

const ClassroomWork = () => {
  const { classroomId } = useParams();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const { data: teacherActivities = [] } = useTeacherActivities();
  const classroom = teacherActivities.find((item) => String(item.id) === String(classroomId));

  const { data: assignments = [] } = useAssignmentsByClassroom(classroomId);
  const { data: submissions = [] } = useSubmissionsByClassroom(classroomId);
  const { data: enrollments = [] } = useClassroomEnrollments(classroomId);
  const { data: groups = [] } = useClassroomGroups(classroomId);
  const { data: groupMembers = [] } = useGroupMembers(classroomId);

  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    allowTextLink: true,
    allowFileUpload: true,
  });

  const membersByGroupId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    groupMembers.forEach((member) => {
      const current = map.get(member.groupId) || new Set<string>();
      current.add(member.studentUid);
      map.set(member.groupId, current);
    });
    return map;
  }, [groupMembers]);

  const expectedRecipientsByAssignment = useMemo(() => {
    const enrolledSet = new Set(enrollments.map((item) => item.studentUid));
    const map = new Map<string, number>();
    assignments.forEach((assignment) => {
      if (assignment.targetType === "classroom") {
        map.set(assignment.id, enrolledSet.size);
        return;
      }
      if (assignment.targetType === "individual") {
        if (!assignment.targetIds || assignment.targetIds.length === 0) {
          map.set(assignment.id, enrolledSet.size);
          return;
        }
        const target = new Set<string>();
        assignment.targetIds.forEach((uid) => {
          if (enrolledSet.has(uid)) target.add(uid);
        });
        map.set(assignment.id, target.size);
        return;
      }

      if (!assignment.targetIds || assignment.targetIds.length === 0) {
        map.set(assignment.id, membersByGroupId.size);
        return;
      }
      const target = new Set<string>();
      assignment.targetIds.forEach((groupId) => {
        if (membersByGroupId.has(groupId)) target.add(groupId);
      });
      map.set(assignment.id, target.size);
    });
    return map;
  }, [assignments, enrollments, membersByGroupId]);

  const assignmentSubmissionStats = useMemo(() => {
    const byAssignment = new Map<string, number>();
    const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
    const dedup = new Set<string>();

    submissions.forEach((submission) => {
      const assignment = assignmentById.get(submission.assignmentId);
      if (!assignment) return;
      const recipientKey = assignment.targetType === "group"
        ? `group::${submission.groupId || ""}`
        : `student::${submission.studentUid}`;
      if (assignment.targetType === "group" && !submission.groupId) return;
      const dedupKey = `${submission.assignmentId}::${recipientKey}`;
      if (dedup.has(dedupKey)) return;
      dedup.add(dedupKey);
      byAssignment.set(submission.assignmentId, (byAssignment.get(submission.assignmentId) || 0) + 1);
    });

    return byAssignment;
  }, [assignments, submissions]);

  const handleCreateAssignment = async () => {
    if (!authUser?.uid || !classroomId) return;
    if (!assignmentForm.title.trim() || !assignmentForm.dueDate) {
      toast({ title: "ข้อมูลไม่ครบ", description: "กรุณากรอกชื่องานและกำหนดส่ง", variant: "destructive" });
      return;
    }

    setAssignmentSubmitting(true);
    try {
      await createAssignment({
        classroomId,
        title: assignmentForm.title,
        description: assignmentForm.description,
        dueDate: assignmentForm.dueDate,
        targetType: "classroom",
        targetIds: [],
        allowTextLink: assignmentForm.allowTextLink,
        allowFileUpload: assignmentForm.allowFileUpload,
        createdByUid: authUser.uid,
      });
      toast({ title: "สร้างงานสำเร็จ" });
      setAssignmentForm({
        title: "",
        description: "",
        dueDate: "",
        allowTextLink: true,
        allowFileUpload: true,
      });
      setAssignmentOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "สร้างงานไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const handleUpdateAssignmentType = async (assignmentId: string, targetType: "classroom" | "group" | "individual") => {
    try {
      await updateAssignmentTargetType({ assignmentId, targetType });
      toast({ title: "อัปเดตประเภทงานแล้ว" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    }
  };

  if (!classroom) {
    return (
      <TeacherLayout>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold text-foreground">ไม่พบ Classroom นี้</p>
          <Link to="/">
            <Button variant="outline" className="mt-4 rounded-xl">กลับหน้า Dashboard</Button>
          </Link>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <PageTransition>
        <div className="space-y-5 pb-10">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-emerald-700 p-6 text-primary-foreground shadow-lg">
            <Link to={`/classroom/${classroomId}`} className="mb-2 inline-flex items-center text-sm opacity-90 hover:opacity-100">
              <ArrowLeft className="mr-1 h-4 w-4" /> กลับ Stream
            </Link>
            <h1 className="text-2xl font-bold">{classroom.name} - Work</h1>
            <div className="mt-3 flex gap-2 text-sm">
              <Link to={`/classroom/${classroomId}`} className="rounded-full bg-white/15 px-3 py-1">Stream</Link>
              <span className="rounded-full bg-white px-3 py-1 text-primary font-medium">Work</span>
              <Link to={`/classroom/${classroomId}/people`} className="rounded-full bg-white/15 px-3 py-1">People</Link>
            </div>
          </div>

          <Card className="rounded-2xl border-border/50">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Assignments</CardTitle>
              <Button className="rounded-xl" onClick={() => setAssignmentOpen(true)}>
                <Send className="mr-2 h-4 w-4" /> เพิ่มงาน
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignments.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีงาน</p>}
              {assignments.map((assignment) => {
                const submittedCount = assignmentSubmissionStats.get(assignment.id) || 0;
                const expectedCount = expectedRecipientsByAssignment.get(assignment.id) || 0;
                return (
                  <div key={assignment.id} className="rounded-xl border border-border/50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="mb-2 w-[180px]">
                          <Select value={assignment.targetType} onValueChange={(value: "classroom" | "group" | "individual") => handleUpdateAssignmentType(assignment.id, value)}>
                            <SelectTrigger className="h-8 rounded-lg"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="classroom">ทั้งห้อง</SelectItem>
                              <SelectItem value="individual">งานเดี่ยว</SelectItem>
                              <SelectItem value="group">งานกลุ่ม</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-sm font-semibold">{assignment.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{assignment.description || "-"}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Due {formatDateLabel(assignment.dueDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="border-0">Submitted {submittedCount}/{expectedCount}</Badge>
                        {assignment.targetType === "group" && (
                          <div className="mt-2">
                            <Link to={`/assignment/${assignment.id}/groups`}>
                              <Button variant="outline" size="sm" className="rounded-lg">ดูผล AI Group</Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </PageTransition>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent className="rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>เพิ่ม Assignment</DialogTitle>
            <DialogDescription>สร้างงานได้ทันทีแบบ Google Classroom แล้วค่อยเปลี่ยนประเภทภายหลัง</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>ชื่องาน</Label>
              <Input value={assignmentForm.title} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียด</Label>
              <Textarea value={assignmentForm.description} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>กำหนดส่ง</Label>
              <Input type="date" value={assignmentForm.dueDate} onChange={(e) => setAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant={assignmentForm.allowTextLink ? "default" : "outline"} className="rounded-xl" onClick={() => setAssignmentForm((prev) => ({ ...prev, allowTextLink: !prev.allowTextLink }))}>Text/Link</Button>
              <Button type="button" variant={assignmentForm.allowFileUpload ? "default" : "outline"} className="rounded-xl" onClick={() => setAssignmentForm((prev) => ({ ...prev, allowFileUpload: !prev.allowFileUpload }))}>File Upload</Button>
            </div>
            <Button className="w-full rounded-xl" onClick={handleCreateAssignment} disabled={assignmentSubmitting}>
              {assignmentSubmitting ? "กำลังบันทึก..." : "สร้างงาน"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
};

export default ClassroomWork;
