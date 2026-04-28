import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { PageTransition } from "@/components/MotionWrappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Brain,
  Clock,
  FileCheck2,
  FileWarning,
  FolderKanban,
  QrCode,
  Send,
  TrendingUp,
  UserPlus,
  Download,
} from "lucide-react";
import {
  calculateClassroomProgress,
  createAssignment,
  generateClassroomGroups,
  clearExistingGroups,
  inviteStudentsByUid,
  updateAssignmentTargetType,
  upsertSubmissionFeedback,
  useAssignmentsByClassroom,
  useClassroomEnrollments,
  useClassroomGroups,
  useGroupMembers,
  useSubmissionsByClassroom,
  useTeacherActivities,
  type GroupingMode,
} from "@/lib/db";
import { ClassroomQRDialog } from "@/components/teacher/ClassroomQRDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { generateAIGroupsWithTogether } from "@/lib/aiAnalyze";
import { evaluateTeacherPolicy } from "@/lib/teacherPolicy";

const groupingModeOptions: { value: GroupingMode; label: string; description: string }[] = [
  {
    value: "random",
    label: "สุ่ม",
    description: "กระจายนิสิตแบบสุ่มเพื่อเริ่มจัดทีมอย่างรวดเร็ว",
  },
  {
    value: "skill",
    label: "ตามความสามารถ",
    description: "กระจายนิสิตที่มีทักษะสูงให้สมดุลในแต่ละกลุ่ม",
  },
  {
    value: "interest",
    label: "ตามความถนัด",
    description: "จัดทีมให้ทักษะและความสนใจครอบคลุมกันในแต่ละกลุ่ม",
  },
];

function formatDateLabel(value?: string) {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ClassroomDetail = () => {
  const { classroomId } = useParams();
  const [, setSearchParams] = useSearchParams();
  const { authUser, userProfile } = useAuth();
  const { toast } = useToast();

  const { data: teacherActivities = [] } = useTeacherActivities();
  const classroom = teacherActivities.find((item) => String(item.id) === String(classroomId));
  const scopedClassroomId = classroom ? classroomId : undefined;

  const { data: assignments = [] } = useAssignmentsByClassroom(scopedClassroomId);
  const { data: submissions = [] } = useSubmissionsByClassroom(scopedClassroomId);
  const { data: enrollments = [] } = useClassroomEnrollments(scopedClassroomId);
  const { data: groups = [] } = useClassroomGroups(scopedClassroomId);
  const { data: groupMembers = [] } = useGroupMembers(scopedClassroomId);

  const [activeTab, setActiveTab] = useState("classwork");
  const [qrOpen, setQrOpen] = useState(false);
  const [uidInviteOpen, setUidInviteOpen] = useState(false);
  const [uidInput, setUidInput] = useState("");
  const [inviting, setInviting] = useState(false);

  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    allowTextLink: true,
    allowFileUpload: true,
  });

  const [groupingMode, setGroupingMode] = useState<GroupingMode>("skill");
  const [groupingLoading, setGroupingLoading] = useState(false);
  const [classroomSetupOpen, setClassroomSetupOpen] = useState(false);
  const [savingClassroomSetup, setSavingClassroomSetup] = useState(false);
  const [membersPerGroupInput, setMembersPerGroupInput] = useState("4");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [requiredSkillsInput, setRequiredSkillsInput] = useState("");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const [wizardForm, setWizardForm] = useState({
    workMode: "individual" as "individual" | "group",
    assignmentTitle: "",
    assignmentDescription: "",
    dueDate: "",
    groupingMode: "ai" as GroupingMode,
    membersPerGroup: "4",
    requiredSkills: [] as string[],
  });
  const [wizardSkillInput, setWizardSkillInput] = useState("");

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState("");
  const [scoreValue, setScoreValue] = useState("");
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<any>(null);
  const teacherPolicy = useMemo(() => evaluateTeacherPolicy(userProfile), [userProfile]);

  const progress = useMemo(() => {
    return calculateClassroomProgress({
      assignments,
      submissions,
      enrollments,
      groupMembers,
    });
  }, [assignments, submissions, enrollments, groupMembers]);

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
        const target = new Set<string>();
        (assignment.targetIds || []).forEach((uid) => {
          if (enrolledSet.has(uid)) target.add(uid);
        });
        map.set(assignment.id, target.size);
        return;
      }
      const target = new Set<string>();
      (assignment.targetIds || []).forEach((groupId) => {
        if (membersByGroupId.has(groupId)) target.add(groupId);
      });
      map.set(assignment.id, target.size);
    });
    return map;
  }, [assignments, enrollments, membersByGroupId]);

  const selectedAssignmentSubmissions = useMemo(() => {
    if (!selectedAssignmentId) return [];
    return submissions.filter((submission) => submission.assignmentId === selectedAssignmentId);
  }, [selectedAssignmentId, submissions]);

  const memberStatusMatrix = useMemo(() => {
    const submittedStudentsByAssignment = new Map<string, Set<string>>();
    const submittedGroupsByAssignment = new Map<string, Set<string>>();

    submissions.forEach((submission) => {
      if (submission.groupId) {
        const currentGroupSet = submittedGroupsByAssignment.get(submission.assignmentId) || new Set<string>();
        currentGroupSet.add(submission.groupId);
        submittedGroupsByAssignment.set(submission.assignmentId, currentGroupSet);
      }

      if (submission.studentUid) {
        const currentStudentSet = submittedStudentsByAssignment.get(submission.assignmentId) || new Set<string>();
        currentStudentSet.add(submission.studentUid);
        submittedStudentsByAssignment.set(submission.assignmentId, currentStudentSet);
      }
    });

    const matrixByGroup = new Map<string, {
      groupName: string;
      members: Array<{
        memberId: string;
        memberName: string;
        rawMember: any;
        statuses: Array<{ assignmentId: string; title: string; required: boolean; done: boolean }>;
      }>;
    }>();

    groupMembers.forEach((member) => {
      const groupName = (member as unknown as { groupName?: string }).groupName || member.groupId;
      const groupEntry = matrixByGroup.get(member.groupId) || { groupName, members: [] };

      const statuses = assignments.map((assignment) => {
        let required = false;
        let done = false;

        if (assignment.targetType === "classroom") {
          required = true;
          done = (submittedStudentsByAssignment.get(assignment.id) || new Set()).has(member.studentUid);
        } else if (assignment.targetType === "individual") {
          required = !!assignment.targetIds?.includes(member.studentUid);
          done = required && (submittedStudentsByAssignment.get(assignment.id) || new Set()).has(member.studentUid);
        } else {
          required = !!assignment.targetIds?.includes(member.groupId);
          done = required && (submittedGroupsByAssignment.get(assignment.id) || new Set()).has(member.groupId);
        }

        return {
          assignmentId: assignment.id,
          title: assignment.title,
          required,
          done,
        };
      });

      groupEntry.members.push({
        memberId: member.id,
        memberName: member.studentName,
        rawMember: member,
        statuses,
      });
      matrixByGroup.set(member.groupId, groupEntry);
    });

    return Array.from(matrixByGroup.entries()).map(([groupId, value]) => ({
      groupId,
      ...value,
    }));
  }, [assignments, submissions, groupMembers]);

  const memberByGroup = useMemo(() => {
    const map = new Map<string, typeof groupMembers>();
    groupMembers.forEach((member) => {
      const current = map.get(member.groupId) || [];
      current.push(member);
      map.set(member.groupId, current);
    });
    return map;
  }, [groupMembers]);

  useEffect(() => {
    if (!classroom) return;
    setMembersPerGroupInput(String(classroom.membersPerGroup || 4));
    setRequiredSkills(Array.isArray(classroom.requirements) ? classroom.requirements : []);
  }, [classroom]);

  if (!classroom) {
    return (
      <TeacherLayout>
        <div className="py-20 text-center">
          <p className="text-lg font-semibold text-foreground">ไม่พบ Classroom นี้</p>
          <Link to="/">
            <Button variant="outline" className="mt-4 rounded-xl">
              กลับหน้า Dashboard
            </Button>
          </Link>
        </div>
      </TeacherLayout>
    );
  }

  const classCode = classroom.classroomCode || `KU-${String(classroom.id).toUpperCase().slice(0, 6)}`;

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

  const handleCreateAssignment = async () => {
    if (!authUser?.uid || !classroomId) return;
    if (!teacherPolicy.canPublishAssignments) {
      toast({
        title: "ยังสร้างงานไม่ได้",
        description: "ยืนยันตัวตนอาจารย์ก่อน จึงจะเผยแพร่งานได้",
        variant: "destructive",
      });
      return;
    }
    if (!assignmentForm.title.trim() || !assignmentForm.dueDate) {
      toast({ title: "ข้อมูลไม่ครบ", description: "กรุณาระบุชื่องานและวันครบกำหนด", variant: "destructive" });
      return;
    }
    setAssignmentSubmitting(true);
    try {
      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
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
      }, { classroomName: classroom?.name, actorName: teacherName });
      toast({ title: "สร้างงานสำเร็จ", description: assignmentForm.title });
      setAssignmentForm({ title: "", description: "", dueDate: "", allowTextLink: true, allowFileUpload: true });
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
      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser?.email || "";
      await updateAssignmentTargetType({
        assignmentId,
        targetType,
        meta: { actorUid: authUser?.uid, actorName: teacherName, classroomId, classroomName: classroom?.name },
      });
      toast({ title: "อัปเดตประเภทงานแล้ว", description: `เปลี่ยนเป็น ${targetType === "classroom" ? "ทั้งห้อง" : targetType === "group" ? "งานกลุ่ม" : "งานเดี่ยว"}` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    }
  };

  const handleExportGroupsCSV = () => {
    if (groups.length === 0) {
      toast({ title: "ไม่มีข้อมูล", description: "ยังไม่มีการจัดกลุ่มในห้องนี้", variant: "destructive" });
      return;
    }
    const header = "รหัสนิสิต (UID),ชื่อ-นามสกุล,รหัสกลุ่ม,ชื่อกลุ่ม,ทักษะ\n";
    const rows = groupMembers.map((member) => {
      const group = groups.find((g) => g.id === member.groupId);
      const skillsStr = (member.skills || []).join(";");
      return `${member.studentUid},${member.studentName},${member.groupId},${group?.name || ""},${skillsStr}`;
    }).join("\n");
    
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `groups_${classroom?.name || "classroom"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGradesCSV = (assignmentId: string, assignmentTitle: string) => {
    const assignmentSubmissions = submissions.filter((s) => s.assignmentId === assignmentId);
    if (assignmentSubmissions.length === 0) {
      toast({ title: "ไม่มีข้อมูล", description: "ยังไม่มีการส่งงานนี้", variant: "destructive" });
      return;
    }
    const header = "รหัสนิสิต (UID),ชื่อ-นามสกุล,สถานะการส่งงาน,คะแนน,วันที่ส่ง\n";
    const rows = assignmentSubmissions.map((sub) => {
      const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("th-TH") : "";
      return `${sub.studentUid},${sub.studentName || ""},${sub.status},${sub.score || 0},${dateStr}`;
    }).join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `grades_${assignmentTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateGroups = async () => {
    if (!authUser?.uid || !classroomId) return;
    if (!teacherPolicy.canGenerateGroups) {
      toast({
        title: "ยังจัดกลุ่มไม่ได้",
        description: "ยืนยันตัวตนอาจารย์ก่อน จึงจะ generate groups ได้",
        variant: "destructive",
      });
      return;
    }

    const hasGroupAssignment = assignments.some((item) => item.targetType === "group");
    const classroomConfiguredForGroup = classroom.defaultWorkMode === "group";
    if (!hasGroupAssignment && !classroomConfiguredForGroup) {
      toast({
        title: "ยังไม่มีงานกลุ่ม",
        description: "กรุณาสร้างงานและเลือกประเภทเป็นงานกลุ่มก่อน แล้วจึงจัดกลุ่มนิสิต",
        variant: "destructive",
      });
      return;
    }

    if (enrollments.length === 0) {
      toast({
        title: "ยังไม่มีนิสิตในห้อง",
        description: "เพิ่มนิสิตเข้าห้องเรียนก่อนเริ่มจัดกลุ่ม",
        variant: "destructive",
      });
      return;
    }

    setGroupingLoading(true);
    try {
      const aiResult = await generateAIGroupsWithTogether({
        groupSize: Number(classroom.membersPerGroup || 4),
        requiredSkills: classroom.requirements || [],
        students: enrollments.map((enrollment) => {
          const member = groupMembers.find((item) => item.studentUid === enrollment.studentUid);
          return {
            uid: enrollment.studentUid,
            name: member?.studentName || enrollment.studentUid,
            skills: member?.skills || [],
            interests: member?.interests || [],
          };
        }),
      });

      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
      const result = await generateClassroomGroups({
        classroomId,
        teacherUid: authUser.uid,
        mode: groupingMode,
        membersPerGroup: Number(classroom.membersPerGroup || 4),
        requiredSkills: classroom.requirements || [],
        aiSuggestedGroups: aiResult?.groups,
        meta: { classroomName: classroom?.name, actorName: teacherName },
      });
      toast({
        title: "จัดกลุ่มสำเร็จ",
        description: `สร้าง ${result.groupCount} กลุ่ม ครอบคลุม ${result.memberCount} นิสิต`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "จัดกลุ่มไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setGroupingLoading(false);
    }
  };

  const handleClearGroups = async () => {
    if (!classroomId || !teacherPolicy.canGenerateGroups) return;
    if (!confirm("คุณต้องการลบกลุ่มทั้งหมดใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)")) return;
    setGroupingLoading(true);
    try {
      await clearExistingGroups(classroomId);
      toast({ title: "ลบกลุ่มทั้งหมดสำเร็จ" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "ลบกลุ่มไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setGroupingLoading(false);
    }
  };

  const toggleRequiredSkill = (value: string) => {
    setRequiredSkills((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
  };

  const addRequiredSkill = () => {
    const value = requiredSkillsInput.trim();
    if (!value) return;
    if (!requiredSkills.includes(value)) {
      setRequiredSkills((prev) => [...prev, value]);
    }
    setRequiredSkillsInput("");
  };

  const toggleWizardSkill = (value: string) => {
    setWizardForm((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.includes(value)
        ? prev.requiredSkills.filter((item) => item !== value)
        : [...prev.requiredSkills, value],
    }));
  };

  const addWizardSkill = () => {
    const value = wizardSkillInput.trim();
    if (!value) return;
    setWizardForm((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.includes(value) ? prev.requiredSkills : [...prev.requiredSkills, value],
    }));
    setWizardSkillInput("");
  };

  const saveClassroomSetup = async () => {
    if (!classroomId) return;
    const numericMembers = Math.max(2, Number(membersPerGroupInput) || 4);

    setSavingClassroomSetup(true);
    try {
      await updateDoc(doc(db, "teacherActivities", classroomId), {
        membersPerGroup: numericMembers,
        requirements: requiredSkills,
        updatedAt: Date.now(),
      });

      if (authUser?.uid) {
        const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
        void writeAuditLog({
          action: "save_classroom_setup",
          actorUid: authUser.uid,
          actorName: teacherName,
          classroomId,
          classroomName: classroom?.name,
          detail: `ตั้งค่า ${numericMembers} คนต่อกลุ่ม, ทักษะ: ${requiredSkills.join(", ") || "-"}`,
        });
      }

      toast({ title: "บันทึกการตั้งค่าห้องเรียนแล้ว" });
      setClassroomSetupOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "บันทึกไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setSavingClassroomSetup(false);
    }
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("setup");
      return next;
    }, { replace: true });
  };

  const finishWizard = async () => {
    if (!authUser?.uid || !classroomId) return;
    if (!teacherPolicy.canPublishAssignments) {
      toast({
        title: "ยัง Setup ไม่ได้",
        description: "บัญชีอาจารย์ยังไม่ยืนยันตัวตน จึงยังไม่สามารถสร้าง assignment ในขั้นตอน setup",
        variant: "destructive",
      });
      return;
    }
    if (!wizardForm.assignmentTitle.trim() || !wizardForm.dueDate) {
      toast({ title: "ข้อมูลไม่ครบ", description: "กรุณาระบุชื่องานและวันครบกำหนด", variant: "destructive" });
      return;
    }

    setWizardSubmitting(true);
    try {
      const numericMembers = Math.max(2, Number(wizardForm.membersPerGroup) || 4);
      await updateDoc(doc(db, "teacherActivities", classroomId), {
        membersPerGroup: numericMembers,
        requirements: wizardForm.requiredSkills,
        defaultWorkMode: wizardForm.workMode,
        updatedAt: Date.now(),
      });

      const wizardTeacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
      await createAssignment({
        classroomId,
        title: wizardForm.assignmentTitle,
        description: wizardForm.assignmentDescription || (wizardForm.workMode === "group" ? "งานกลุ่ม" : "งานเดี่ยว"),
        dueDate: wizardForm.dueDate,
        targetType: "classroom",
        targetIds: [],
        allowTextLink: true,
        allowFileUpload: true,
        createdByUid: authUser.uid,
      }, { classroomName: classroom?.name, actorName: wizardTeacherName });

      if (wizardForm.workMode === "group" && enrollments.length > 0 && teacherPolicy.canGenerateGroups) {
        const aiResult = await generateAIGroupsWithTogether({
          groupSize: numericMembers,
          requiredSkills: wizardForm.requiredSkills,
          students: enrollments.map((enrollment) => {
            const member = groupMembers.find((item) => item.studentUid === enrollment.studentUid);
            return {
              uid: enrollment.studentUid,
              name: member?.studentName || enrollment.studentUid,
              skills: member?.skills || [],
              interests: member?.interests || [],
            };
          }),
        });

        const tName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser.email || "";
        await generateClassroomGroups({
          classroomId,
          teacherUid: authUser.uid,
          mode: wizardForm.groupingMode,
          membersPerGroup: numericMembers,
          requiredSkills: wizardForm.requiredSkills,
          aiSuggestedGroups: aiResult?.groups,
          meta: { classroomName: classroom?.name, actorName: tName },
        });
      }

      toast({ title: "Setup สำเร็จ", description: "ตั้งค่างานและการจัดกลุ่มเรียบร้อยแล้ว" });
      setActiveTab(wizardForm.workMode === "group" ? "groups" : "classwork");
      closeWizard();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "ตั้งค่าไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setWizardSubmitting(false);
    }
  };

  const openReviewDialog = (assignmentId: string) => {
    setSelectedAssignmentId(assignmentId);
    setReviewOpen(true);
    setReviewingSubmissionId("");
    setFeedbackText("");
    setScoreValue("");
  };

  const startReviewSubmission = (submissionId: string, currentFeedback?: string, currentScore?: number) => {
    setReviewingSubmissionId(submissionId);
    setFeedbackText(currentFeedback || "");
    setScoreValue(Number.isFinite(currentScore as number) ? String(currentScore) : "");
  };

  const handleSubmitReview = async () => {
    if (!reviewingSubmissionId) return;

    const normalizedScore = scoreValue.trim();
    if (!/^\d+(\.\d+)?$/.test(normalizedScore)) {
      toast({ title: "คะแนนไม่ถูกต้อง", description: "กรุณากรอกคะแนนเป็นตัวเลข (0–100)", variant: "destructive" });
      return;
    }
    const numericScore = Number(normalizedScore);
    if (numericScore < 0 || numericScore > 100) {
      toast({ title: "คะแนนไม่ถูกต้อง", description: "คะแนนต้องอยู่ระหว่าง 0–100", variant: "destructive" });
      return;
    }
    try {
      const teacherName = `${userProfile?.onboardingData?.title ?? ""} ${userProfile?.onboardingData?.fullName ?? ""}`.trim() || authUser?.email || "";
      await upsertSubmissionFeedback(reviewingSubmissionId, feedbackText, numericScore, {
        actorUid: authUser?.uid,
        actorName: teacherName,
        classroomId: classroomId,
        classroomName: classroom?.name,
      });
      toast({ title: "บันทึก Feedback สำเร็จ" });
      setReviewingSubmissionId("");
      setFeedbackText("");
      setScoreValue("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "บันทึก feedback ไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    }
  };

  return (
    <TeacherLayout>
      <PageTransition>
        <div className="space-y-6 pb-10">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground p-6 md:p-8 shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="w-full">
                <Link to="/" className="inline-flex items-center text-sm opacity-90 hover:opacity-100 mb-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> กลับ
                </Link>
                <h1 className="text-2xl md:text-4xl font-bold line-clamp-2">{classroom.name}</h1>
                <p className="mt-2 text-primary-foreground/85">รหัสห้อง: {classCode}</p>
                <p className="text-primary-foreground/85">นิสิต {enrollments.length} คน · กลุ่ม {groups.length} กลุ่ม</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-primary shadow-sm">สตรีม</span>
                  <Link to={`/classroom/${classroomId}/work`} className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/20 transition-colors">งานของชั้นเรียน</Link>
                  <Link to={`/classroom/${classroomId}/people`} className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/20 transition-colors">ผู้คน</Link>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button variant="secondary" className="rounded-xl flex-1 md:flex-none" onClick={() => setQrOpen(true)}>
                  <QrCode className="h-4 w-4 mr-1" /> QR / ลิงก์
                </Button>
                <Button variant="secondary" className="rounded-xl flex-1 md:flex-none" onClick={() => setUidInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" /> เพิ่มด้วย UID
                </Button>
                <Button variant="secondary" className="rounded-xl flex-1 md:flex-none" onClick={() => setWizardOpen(true)}>
                  มอบหมายงาน / จัดกลุ่ม
                </Button>
              </div>
            </div>
            {classroom.teacherVerificationStatus === "unverified-non-ku" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                บัญชีอาจารย์ยังไม่ยืนยันตัวตน ระบบจะแสดงสถานะนี้ให้นิสิตทราบเพื่อความปลอดภัย
              </div>
            )}
            {!teacherPolicy.isVerified && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                โหมดจำกัดสิทธิ์: ยังไม่สามารถ publish assignment และ generate groups ได้จนกว่าจะยืนยันตัวตน
              </div>
            )}
            {teacherPolicy.isGuest && (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                โหมดผู้เยี่ยมชม: ทดลองใช้งานได้ครบทุกฟีเจอร์ แต่เป็นข้อมูลตัวอย่าง
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 rounded-xl h-auto md:h-11 bg-muted/50 p-1">
              <TabsTrigger value="classwork" className="rounded-lg text-xs sm:text-sm">ภาพรวมห้องเรียน</TabsTrigger>
              <TabsTrigger value="groups" className="rounded-lg text-xs sm:text-sm">รายชื่อกลุ่ม</TabsTrigger>
              <TabsTrigger value="people" className="rounded-lg text-xs sm:text-sm">ข้อมูลเชิงลึกสมาชิก</TabsTrigger>
            </TabsList>

            <TabsContent value="classwork" className="space-y-4 mt-4 overflow-hidden w-full">
              <div className="grid gap-3 md:grid-cols-4">
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">ความคืบหน้ารวม</p>
                    <p className="text-2xl font-bold mt-1">{progress.completionPercent}%</p>
                    <Progress className="mt-2 h-2" value={progress.completionPercent} />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><FileWarning className="h-3.5 w-3.5 text-amber-500" /> ความเสี่ยงส่งงานล่าช้า</p>
                    <p className="text-2xl font-bold mt-1">{progress.overdueRisk}</p>
                    <p className="text-xs text-muted-foreground">จำนวนงานที่มีแนวโน้มล่าช้า</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> การส่งงานรายสัปดาห์</p>
                    <p className="text-2xl font-bold mt-1">{progress.weeklyVelocity}</p>
                    <p className="text-xs text-muted-foreground">จำนวนงานที่ส่งใน 7 วันล่าสุด</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><FileCheck2 className="h-3.5 w-3.5 text-blue-500" /> งานที่มอบหมาย</p>
                    <p className="text-2xl font-bold mt-1">{assignments.length}</p>
                    <p className="text-xs text-muted-foreground">จำนวนงานทั้งหมดในห้องเรียน</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> สถิติการส่งงานรายสัปดาห์ (8 สัปดาห์)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {progress.weeklyTimeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลสถิติการส่งงาน</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(() => {
                        const maxCount = Math.max(...progress.weeklyTimeline.map((item) => item.count), 1);
                        return progress.weeklyTimeline.map((item) => (
                          <div key={item.weekStart} className="rounded-xl border border-border/50 p-3">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="text-lg font-bold mt-1">{item.count}</p>
                            <div className="mt-2 h-2 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${Math.max(6, Math.round((item.count / maxCount) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">ภาพรวมสถานะการส่งงาน</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {memberStatusMatrix.length === 0 && (
                    <p className="text-sm text-muted-foreground">ยังไม่มีสมาชิกที่จัดกลุ่มแล้ว</p>
                  )}

                  {memberStatusMatrix.map((group) => (
                    <div key={group.groupId} className="rounded-xl border border-border/40 p-3">
                      <p className="text-sm font-semibold mb-3">{group.groupName}</p>
                      <div className="overflow-x-auto w-full max-w-full rounded-xl border border-border/40 bg-background/50">
                        <div className="min-w-[720px]">
                          {/* Header Row */}
                          <div
                            className="grid bg-muted/40 border-b border-border/40 p-2"
                            style={{ gridTemplateColumns: `180px repeat(${assignments.length}, minmax(120px, 1fr))` }}
                          >
                            <div className="text-xs font-semibold text-muted-foreground px-2">สมาชิก</div>
                            {assignments.map((assignment) => (
                              <div key={assignment.id} className="text-xs font-semibold text-muted-foreground truncate px-2 border-l border-border/30" title={assignment.title}>
                                {assignment.title}
                              </div>
                            ))}
                          </div>

                          {/* Member Rows */}
                          {group.members.map((member, idx) => (
                            <div
                              key={member.memberId}
                              className={`grid items-center p-2 transition-colors hover:bg-muted/60 ${idx !== group.members.length - 1 ? 'border-b border-border/30' : ''}`}
                              style={{ gridTemplateColumns: `180px repeat(${assignments.length}, minmax(120px, 1fr))` }}
                            >
                              <button 
                                onClick={() => setSelectedStudentForProfile({ ...member.rawMember, groupName: group.groupName })}
                                className="text-sm font-medium px-2 flex items-center gap-2 hover:bg-muted/80 rounded-md transition-colors text-left py-1"
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{member.memberName.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <span className="truncate">{member.memberName}</span>
                              </button>
                              {member.statuses.map((status) => (
                                <div key={`${member.memberId}-${status.assignmentId}`} className="px-2 border-l border-border/30 h-full flex items-center">
                                  {!status.required ? (
                                    <span className="text-[10px] text-muted-foreground/40 font-medium ml-1">-</span>
                                  ) : status.done ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-0 text-[10px] shadow-sm font-semibold">ส่งแล้ว</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-0 text-[10px] shadow-sm font-semibold">รอดำเนินการ</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4 mt-4">
              <Card className="rounded-2xl border-border/50">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base inline-flex items-center gap-2"><Brain className="h-4 w-4" /> จัดการกลุ่ม</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl" onClick={handleExportGroupsCSV} disabled={groups.length === 0}>
                      <Download className="mr-1 h-4 w-4" /> Export CSV
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => setClassroomSetupOpen(true)}>
                      ตั้งค่า Members/Skills
                    </Button>
                    <Select value={groupingMode} onValueChange={(value: GroupingMode) => setGroupingMode(value)}>
                      <SelectTrigger className="w-48 rounded-xl h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {groupingModeOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="destructive" className="rounded-xl" onClick={handleClearGroups} disabled={groupingLoading || !teacherPolicy.canGenerateGroups || groups.length === 0}>
                      ลบกลุ่มทั้งหมด
                    </Button>
                    <Button className="rounded-xl" onClick={handleGenerateGroups} disabled={groupingLoading || !teacherPolicy.canGenerateGroups}>
                      {groupingLoading ? "กำลังดำเนินการ..." : "จัดกลุ่มอัตโนมัติ"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {groupingModeOptions.find((item) => item.value === groupingMode)?.description}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ทักษะเป้าหมาย: {(classroom.requirements || []).join(", ") || "ยังไม่ได้ตั้งค่า"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    จำนวนสมาชิกต่อกลุ่ม: {classroom.membersPerGroup || 4}
                  </p>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {progress.groupProgress.length === 0 && groups.length === 0 && (
                  <Card className="rounded-2xl border-dashed col-span-2">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">ยังไม่มีกลุ่ม</CardContent>
                  </Card>
                )}

                {groups.map((group) => {
                  const stats = progress.groupProgress.find((item) => item.groupId === group.id);
                  const members = memberByGroup.get(group.id) || [];
                  return (
                    <Card key={group.id} className="rounded-2xl border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{group.name}</span>
                          <Badge variant="secondary" className="border-0">{members.length} คน</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">ความคืบหน้า</p>
                          <p className="text-xl font-bold">{stats?.percent || 0}%</p>
                          <Progress className="h-2 mt-2" value={stats?.percent || 0} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {members.map((member) => (
                            <button 
                              key={member.id} 
                              onClick={() => setSelectedStudentForProfile({ ...member, groupName: group.name })}
                              className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card pr-3 p-1 text-sm font-medium transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{member.studentName.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              {member.studentName}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="people" className="space-y-4 mt-4">
              <Card className="rounded-2xl border-border/50">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">รายชื่อนิสิต</CardTitle>
                  <Button variant="outline" className="rounded-xl" onClick={() => setUidInviteOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" /> เพิ่มนิสิต
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {enrollments.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีนิสิตในห้องเรียน</p>}
                  {enrollments.map((enrollment) => {
                    const fromGroup = groupMembers.find((member) => member.studentUid === enrollment.studentUid);
                    const groupName = (fromGroup as unknown as { groupName?: string } | undefined)?.groupName;
                    return (
                      <div key={enrollment.id} className="rounded-xl border border-border/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-shadow hover:shadow-sm">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary">{(fromGroup?.studentName || enrollment.studentUid).slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{fromGroup?.studentName || enrollment.studentUid}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {fromGroup?.skills && fromGroup.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {fromGroup.skills.map((s, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] font-normal px-1.5 py-0 border-sky-200 bg-sky-50 text-sky-700">{s}</Badge>
                                  ))}
                                </div>
                              )}
                              {fromGroup?.interests && fromGroup.interests.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {fromGroup.interests.map((s, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px] font-normal px-1.5 py-0 border-purple-200 bg-purple-50 text-purple-700">{s}</Badge>
                                  ))}
                                </div>
                              )}
                              {(!fromGroup?.skills?.length && !fromGroup?.interests?.length) && (
                                <span className="text-[10px] text-muted-foreground">ไม่มีข้อมูลทักษะ/ความสนใจ</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {groupName ? (
                            <Badge className="bg-primary/10 text-primary border-0 font-medium">{groupName}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground border-dashed">ยังไม่จัดกลุ่ม</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>

      <ClassroomQRDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        classroom={{
          id: classroom.id,
          name: classroom.name,
          classroomCode: classCode,
          joinPath: classroom.joinPath || `/join/${classroom.id}`,
        }}
      />

      <Dialog open={uidInviteOpen} onOpenChange={setUidInviteOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>เพิ่มนิสิตด้วย UID</DialogTitle>
            <DialogDescription>นิสิตจะถูกเพิ่มทันที คั่น UID ด้วยเว้นวรรค จุลภาค หรือขึ้นบรรทัดใหม่</DialogDescription>
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

      <Dialog open={classroomSetupOpen} onOpenChange={setClassroomSetupOpen}>
        <DialogContent className="rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>ตั้งค่าห้องเรียน</DialogTitle>
            <DialogDescription>กำหนดจำนวนคนต่อกลุ่มและทักษะเป้าหมายสำหรับการจัดกลุ่ม</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>จำนวนสมาชิกต่อกลุ่ม</Label>
              <Input
                type="number"
                min={2}
                max={10}
                value={membersPerGroupInput}
                onChange={(e) => setMembersPerGroupInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ทักษะเป้าหมาย</Label>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleRequiredSkill(skill)}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
                    {skill} x
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={requiredSkillsInput}
                  onChange={(e) => setRequiredSkillsInput(e.target.value)}
                  placeholder="เช่น Backend Node.js"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRequiredSkill())}
                />
                <Button type="button" variant="outline" onClick={addRequiredSkill}>เพิ่ม</Button>
              </div>
            </div>
            <Button className="w-full rounded-xl" onClick={saveClassroomSetup} disabled={savingClassroomSetup}>
              {savingClassroomSetup ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={wizardOpen} onOpenChange={(open) => !open && closeWizard()}>
        <DialogContent className="rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setup Wizard</DialogTitle>
            <DialogDescription>ตั้งค่าห้องเรียน 3 ขั้นตอนก่อนเริ่มใช้งานจริง</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[1, 2, 3].filter(step => wizardForm.workMode === "group" || step !== 2).map((step, index) => (
                <div key={step} className={`rounded-lg px-3 py-2 text-center text-sm ${wizardStep === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  Step {index + 1}
                </div>
              ))}
            </div>

            {wizardStep === 1 && (
              <div className="space-y-3">
                <Label>Step 1: ประเภทงาน</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={wizardForm.workMode === "individual" ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => setWizardForm((prev) => ({ ...prev, workMode: "individual" }))}
                  >
                    งานเดี่ยว
                  </Button>
                  <Button
                    type="button"
                    variant={wizardForm.workMode === "group" ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => setWizardForm((prev) => ({ ...prev, workMode: "group" }))}
                  >
                    งานกลุ่ม
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>ชื่องานแรกของคลาส</Label>
                  <Input
                    value={wizardForm.assignmentTitle}
                    onChange={(e) => setWizardForm((prev) => ({ ...prev, assignmentTitle: e.target.value }))}
                    placeholder="เช่น Assignment 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รายละเอียดงาน</Label>
                  <Textarea
                    value={wizardForm.assignmentDescription}
                    onChange={(e) => setWizardForm((prev) => ({ ...prev, assignmentDescription: e.target.value }))}
                    placeholder="คำอธิบายงานโดยย่อ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>กำหนดส่ง</Label>
                  <Input
                    type="date"
                    value={wizardForm.dueDate}
                    onChange={(e) => setWizardForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {wizardStep === 2 && wizardForm.workMode === "group" && (
              <div className="space-y-3">
                <Label>Step 2: วิธีจัดกลุ่ม</Label>
                <Select
                  value={wizardForm.groupingMode}
                  onValueChange={(value: GroupingMode) => setWizardForm((prev) => ({ ...prev, groupingMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupingModeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <Label>จำนวนสมาชิกต่อกลุ่ม</Label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={wizardForm.membersPerGroup}
                    onChange={(e) => setWizardForm((prev) => ({ ...prev, membersPerGroup: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ทักษะเป้าหมาย</Label>
                  <div className="flex flex-wrap gap-2">
                    {wizardForm.requiredSkills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleWizardSkill(skill)}
                        className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary"
                      >
                        {skill} x
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={wizardSkillInput}
                      onChange={(e) => setWizardSkillInput(e.target.value)}
                      placeholder="เช่น Frontend React"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWizardSkill())}
                    />
                    <Button type="button" variant="outline" onClick={addWizardSkill}>เพิ่ม</Button>
                  </div>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4 text-sm">
                <Label>Step {wizardForm.workMode === "group" ? "3" : "2"}: Preview</Label>
                <p><span className="font-medium">ประเภทงาน:</span> {wizardForm.workMode === "group" ? "งานกลุ่ม" : "งานเดี่ยว"}</p>
                <p><span className="font-medium">ชื่องาน:</span> {wizardForm.assignmentTitle || "-"}</p>
                <p><span className="font-medium">กำหนดส่ง:</span> {wizardForm.dueDate || "-"}</p>
                {wizardForm.workMode === "group" && (
                  <>
                    <p><span className="font-medium">วิธีจัดกลุ่ม:</span> {groupingModeOptions.find((item) => item.value === wizardForm.groupingMode)?.label}</p>
                    <p><span className="font-medium">สมาชิกต่อกลุ่ม:</span> {wizardForm.membersPerGroup}</p>
                    <p><span className="font-medium">ทักษะเป้าหมาย:</span> {wizardForm.requiredSkills.join(", ") || "-"}</p>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setWizardStep((prev) => wizardForm.workMode === "individual" && prev === 3 ? 1 : Math.max(1, prev - 1))} disabled={wizardStep === 1 || wizardSubmitting}>
                ย้อนกลับ
              </Button>
              {wizardStep < 3 && !(wizardForm.workMode === "individual" && wizardStep === 1) ? (
                <Button type="button" className="rounded-xl" onClick={() => setWizardStep((prev) => wizardForm.workMode === "individual" && prev === 1 ? 3 : Math.min(3, prev + 1))}>
                  ถัดไป
                </Button>
              ) : (
                <Button type="button" className="rounded-xl" onClick={finishWizard} disabled={wizardSubmitting}>
                  {wizardSubmitting ? "กำลังบันทึก..." : "ยืนยันและเริ่มใช้งาน"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent className="rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>
              {teacherPolicy.canPublishAssignments
                ? "สร้างงานเดี่ยวหรืองานกลุ่ม และเปิดรับข้อความ/ลิงก์/ไฟล์ได้"
                : "บัญชีอาจารย์ยังไม่ยืนยันตัวตน จึงยังไม่สามารถเผยแพร่ assignment ได้"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Final Report"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Assignment brief / rubric"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={assignmentForm.dueDate}
                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={assignmentForm.allowTextLink ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => setAssignmentForm((prev) => ({ ...prev, allowTextLink: !prev.allowTextLink }))}
              >
                Text/Link
              </Button>
              <Button
                type="button"
                variant={assignmentForm.allowFileUpload ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => setAssignmentForm((prev) => ({ ...prev, allowFileUpload: !prev.allowFileUpload }))}
              >
                File Upload
              </Button>
            </div>
            <Button className="w-full rounded-xl" onClick={handleCreateAssignment} disabled={assignmentSubmitting || !teacherPolicy.canPublishAssignments}>
              {assignmentSubmitting ? "Saving..." : "Create Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>ตรวจงาน & Feedback</DialogTitle>
            <DialogDescription>เลือกงานที่ส่งแล้วและให้ feedback พร้อมคะแนน</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedAssignmentSubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground">ยังไม่มีการส่งงานสำหรับงานนี้</p>
            )}

            {selectedAssignmentSubmissions.map((submission) => (
              <div key={submission.id} className="rounded-xl border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {submission.submissionMode === "group"
                        ? (submission.groupName || submission.groupId || "Group Submission")
                        : (submission.studentName || submission.studentUid)}
                    </p>
                    <p className="text-xs text-muted-foreground">status: {submission.status}</p>
                    {submission.submissionMode === "group" && (
                      <p className="text-xs text-muted-foreground">
                        submitted by: {submission.submittedByName || submission.submittedByUid || submission.studentUid}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => startReviewSubmission(submission.id, submission.feedback, submission.score)}
                  >
                    เลือกตรวจงาน
                  </Button>
                </div>
                {submission.contentText && <p className="text-xs text-muted-foreground">{submission.contentText}</p>}
                {submission.contentLink && (
                  <a href={submission.contentLink} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                    {submission.contentLink}
                  </a>
                )}
                {submission.fileUrl && (
                  <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all">
                    {submission.fileName || "Open attachment"}
                  </a>
                )}
              </div>
            ))}

            {reviewingSubmissionId && (
              <div className="rounded-xl border border-border/50 p-3 space-y-2">
                <Label>Feedback</Label>
                <Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="ให้คำแนะนำการปรับปรุง" />
                <Label>คะแนน (0–100)</Label>
                <Input value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} placeholder="เช่น 85" />
                <Button className="rounded-xl w-full" onClick={handleSubmitReview}>
                  บันทึก Feedback
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStudentForProfile} onOpenChange={(open) => !open && setSelectedStudentForProfile(null)}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 to-emerald-500/10 p-6 flex flex-col items-center justify-center border-b border-border/40">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-md">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {selectedStudentForProfile?.studentName?.slice(0, 2) || "??"}
              </AvatarFallback>
            </Avatar>
            <DialogTitle className="mt-4 text-xl text-center">{selectedStudentForProfile?.studentName}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">UID: {selectedStudentForProfile?.studentUid}</p>
          </div>
          <div className="p-6 space-y-4">
            {selectedStudentForProfile?.groupName && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">สังกัดกลุ่ม</h4>
                <Badge variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary border-0">{selectedStudentForProfile.groupName}</Badge>
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">ทักษะความสามารถ</h4>
              <div className="flex flex-wrap gap-2">
                {selectedStudentForProfile?.skills?.length > 0 ? (
                  selectedStudentForProfile.skills.map((skill: string) => (
                    <Badge key={skill} variant="outline" className="border-primary/20 text-primary">{skill}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">ไม่มีข้อมูลทักษะ</span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">ความสนใจ</h4>
              <div className="flex flex-wrap gap-2">
                {selectedStudentForProfile?.interests?.length > 0 ? (
                  selectedStudentForProfile.interests.map((interest: string) => (
                    <Badge key={interest} variant="secondary" className="border-0 bg-muted">{interest}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">ไม่มีข้อมูลความสนใจ</span>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
};

export default ClassroomDetail;



