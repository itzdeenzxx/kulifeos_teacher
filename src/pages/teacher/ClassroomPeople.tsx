import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { inviteStudentsByUid, useClassroomEnrollments, useGroupMembers, useTeacherActivities } from "@/lib/db";

const ClassroomPeople = () => {
  const { classroomId } = useParams();
  const { authUser, userProfile } = useAuth();
  const { toast } = useToast();
  const { data: teacherActivities = [] } = useTeacherActivities();
  const classroom = teacherActivities.find((item) => String(item.id) === String(classroomId));
  const { data: enrollments = [] } = useClassroomEnrollments(classroomId);
  const { data: groupMembers = [] } = useGroupMembers(classroomId);

  const [uidInviteOpen, setUidInviteOpen] = useState(false);
  const [uidInput, setUidInput] = useState("");
  const [inviting, setInviting] = useState(false);

  const handleInviteByUid = async () => {
    if (!authUser?.uid || !classroomId) return;

    const parsedUids = uidInput
      .split(/[\n,\s]+/)
      .map((uid) => uid.trim())
      .filter(Boolean);

    if (parsedUids.length === 0) {
      toast({ title: "ต้องระบุ UID", description: "กรุณาใส่ UID อย่างน้อย 1 รายการ", variant: "destructive" });
      return;
    }

    setInviting(true);
    try {
      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
      const result = await inviteStudentsByUid(classroomId, authUser.uid, parsedUids, {
        classroomName: classroom?.name,
        actorName: teacherName,
      });
      toast({
        title: "เพิ่มนิสิตสำเร็จ",
        description: `เพิ่ม ${result.created} คน (ข้าม ${result.skipped} ซ้ำ)`,
      });
      setUidInput("");
      setUidInviteOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "เพิ่มนิสิตไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setInviting(false);
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
            <h1 className="text-2xl font-bold">{classroom.name} - People</h1>
            <div className="mt-3 flex gap-2 text-sm">
              <Link to={`/classroom/${classroomId}`} className="rounded-full bg-white/15 px-3 py-1">Stream</Link>
              <Link to={`/classroom/${classroomId}/work`} className="rounded-full bg-white/15 px-3 py-1">Work</Link>
              <span className="rounded-full bg-white px-3 py-1 font-medium text-primary">People</span>
            </div>
          </div>

          <Card className="rounded-2xl border-border/50">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Students</CardTitle>
              <Button variant="outline" className="rounded-xl" onClick={() => setUidInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Students
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {enrollments.length === 0 && <p className="text-sm text-muted-foreground">No students enrolled yet.</p>}
              {enrollments.map((enrollment) => {
                const fromGroup = groupMembers.find((member) => member.studentUid === enrollment.studentUid);
                const groupName = (fromGroup as unknown as { groupName?: string } | undefined)?.groupName;
                return (
                  <div key={enrollment.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{(fromGroup?.studentName || enrollment.studentUid).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{fromGroup?.studentName || enrollment.studentUid}</p>
                        <p className="text-xs text-muted-foreground">source: {enrollment.source}</p>
                      </div>
                    </div>
                    {groupName && <Badge variant="secondary" className="border-0">{groupName}</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </PageTransition>

      <Dialog open={uidInviteOpen} onOpenChange={setUidInviteOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Students by UID</DialogTitle>
            <DialogDescription>Students are enrolled immediately. Separate UIDs by space, comma, or newline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              placeholder="uid_123 uid_456"
              className="rounded-xl"
            />
            <Button className="w-full rounded-xl" onClick={handleInviteByUid} disabled={inviting}>
              {inviting ? "Adding..." : "Add Students Now"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
};

export default ClassroomPeople;
