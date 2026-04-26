import { Fragment, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import {
  calculateClassroomProgress,
  createAssignment,
  generateClassroomGroups,
  inviteStudentsByUid,
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

const groupingModeOptions: { value: GroupingMode; label: string; description: string }[] = [
  {
    value: "balanced",
    label: "Balanced",
    description: "Distribute high-skill members evenly across groups.",
  },
  {
    value: "complementary",
    label: "Complementary",
    description: "Maximize skill coverage by filling missing strengths per group.",
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
  const { authUser } = useAuth();
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
    targetType: "classroom" as "classroom" | "group" | "individual",
    allowTextLink: true,
    allowFileUpload: true,
  });
  const [assignmentTargetIds, setAssignmentTargetIds] = useState<string[]>([]);

  const [groupingMode, setGroupingMode] = useState<GroupingMode>("balanced");
  const [groupingLoading, setGroupingLoading] = useState(false);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState("");
  const [scoreValue, setScoreValue] = useState("");

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

  const groupTargetOptions = useMemo(() => {
    return groups.map((group) => ({
      id: group.id,
      label: group.name,
    }));
  }, [groups]);

  const individualTargetOptions = useMemo(() => {
    return enrollments.map((enrollment) => {
      const member = groupMembers.find((item) => item.studentUid === enrollment.studentUid);
      return {
        id: enrollment.studentUid,
        label: member?.studentName || enrollment.studentUid,
      };
    });
  }, [enrollments, groupMembers]);

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
      toast({ title: "UID Required", description: "Please provide at least 1 UID.", variant: "destructive" });
      return;
    }

    setInviting(true);
    try {
      const result = await inviteStudentsByUid(classroomId, authUser.uid, parsedUids);
      toast({
        title: "Students Added",
        description: `Added ${result.created} students, skipped ${result.skipped} duplicates.`,
      });
      setUidInput("");
      setUidInviteOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to add students.";
      toast({ title: "Add Failed", description: message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!authUser?.uid || !classroomId) return;
    if (!assignmentForm.title.trim() || !assignmentForm.dueDate) {
      toast({ title: "Incomplete Form", description: "Please provide assignment title and due date.", variant: "destructive" });
      return;
    }
    if (assignmentForm.targetType !== "classroom" && assignmentTargetIds.length === 0) {
      toast({ title: "No Target Selected", description: "Please select at least one target.", variant: "destructive" });
      return;
    }

    setAssignmentSubmitting(true);
    try {
      await createAssignment({
        classroomId,
        title: assignmentForm.title,
        description: assignmentForm.description,
        dueDate: assignmentForm.dueDate,
        targetType: assignmentForm.targetType,
        targetIds: assignmentForm.targetType === "classroom" ? [] : assignmentTargetIds,
        allowTextLink: assignmentForm.allowTextLink,
        allowFileUpload: assignmentForm.allowFileUpload,
        createdByUid: authUser.uid,
      });
      toast({ title: "Assignment Created", description: assignmentForm.title });
      setAssignmentForm({
        title: "",
        description: "",
        dueDate: "",
        targetType: "classroom",
        allowTextLink: true,
        allowFileUpload: true,
      });
      setAssignmentTargetIds([]);
      setAssignmentOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to create assignment.";
      toast({ title: "Create Failed", description: message, variant: "destructive" });
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  const toggleAssignmentTarget = (targetId: string) => {
    setAssignmentTargetIds((prev) => {
      if (prev.includes(targetId)) {
        return prev.filter((item) => item !== targetId);
      }
      return [...prev, targetId];
    });
  };

  const handleGenerateGroups = async () => {
    if (!authUser?.uid || !classroomId) return;

    setGroupingLoading(true);
    try {
      const result = await generateClassroomGroups({
        classroomId,
        teacherUid: authUser.uid,
        mode: groupingMode,
        membersPerGroup: Number(classroom.membersPerGroup || 4),
        requiredSkills: classroom.requirements || [],
      });
      toast({
        title: "Groups Generated",
        description: `Created ${result.groupCount} groups, covering ${result.memberCount} students.`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to generate groups.";
      toast({ title: "Grouping Failed", description: message, variant: "destructive" });
    } finally {
      setGroupingLoading(false);
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
      toast({ title: "Invalid Score", description: "Score must be numeric (0-100).", variant: "destructive" });
      return;
    }
    const numericScore = Number(normalizedScore);
    if (numericScore < 0 || numericScore > 100) {
      toast({ title: "Invalid Score", description: "Score must be between 0 and 100.", variant: "destructive" });
      return;
    }
    try {
      await upsertSubmissionFeedback(reviewingSubmissionId, feedbackText, numericScore);
      toast({ title: "Feedback Saved" });
      setReviewingSubmissionId("");
      setFeedbackText("");
      setScoreValue("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to save feedback.";
      toast({ title: "Save Failed", description: message, variant: "destructive" });
    }
  };

  return (
    <TeacherLayout>
      <PageTransition>
        <div className="space-y-6 pb-10">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground p-6 md:p-8 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link to="/" className="inline-flex items-center text-sm opacity-90 hover:opacity-100 mb-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Link>
                <h1 className="text-2xl md:text-4xl font-bold">{classroom.name}</h1>
                <p className="mt-2 text-primary-foreground/85">Class code: {classCode}</p>
                <p className="text-primary-foreground/85">Students {enrollments.length} • Groups {groups.length}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="rounded-xl" onClick={() => setQrOpen(true)}>
                  <QrCode className="h-4 w-4 mr-1" /> QR / Link
                </Button>
                <Button variant="secondary" className="rounded-xl" onClick={() => setUidInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1" /> Add by UID
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 rounded-xl h-11">
              <TabsTrigger value="classwork">Classwork</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
            </TabsList>

            <TabsContent value="classwork" className="space-y-4 mt-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Overall Completion</p>
                    <p className="text-2xl font-bold mt-1">{progress.completionPercent}%</p>
                    <Progress className="mt-2 h-2" value={progress.completionPercent} />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><FileWarning className="h-3.5 w-3.5" /> Overdue Risk</p>
                    <p className="text-2xl font-bold mt-1">{progress.overdueRisk}</p>
                    <p className="text-xs text-muted-foreground">At-risk overdue deliverables</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Weekly Velocity</p>
                    <p className="text-2xl font-bold mt-1">{progress.weeklyVelocity}</p>
                    <p className="text-xs text-muted-foreground">Submissions in the last 7 days</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><FileCheck2 className="h-3.5 w-3.5" /> Assignments</p>
                    <p className="text-2xl font-bold mt-1">{assignments.length}</p>
                    <p className="text-xs text-muted-foreground">Total assignments in this class</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-base inline-flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Weekly Timeline (8 weeks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {progress.weeklyTimeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No weekly timeline data yet.</p>
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
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base inline-flex items-center gap-2"><FolderKanban className="h-4 w-4" /> Assignment + Submission</CardTitle>
                  <Button className="rounded-xl" onClick={() => setAssignmentOpen(true)}>
                    <Send className="h-4 w-4 mr-2" /> Create Assignment
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignments.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}
                  {assignments.map((assignment) => {
                    const submittedCount = assignmentSubmissionStats.get(assignment.id) || 0;
                    const expectedCount = expectedRecipientsByAssignment.get(assignment.id) || 0;
                    const dueTs = Date.parse(assignment.dueDate);
                    const isOverdue = Number.isFinite(dueTs) && dueTs < Date.now();
                    return (
                      <div key={assignment.id} className="rounded-xl border border-border/50 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{assignment.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{assignment.description || "-"}</p>
                            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> Due {formatDateLabel(assignment.dueDate)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Target: {assignment.targetType === "classroom" ? "Whole class" : `${assignment.targetType} (${assignment.targetIds?.length || 0})`}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={isOverdue ? "destructive" : "secondary"} className="mb-2 border-0">
                              Submitted {submittedCount}/{expectedCount}
                            </Badge>
                            <div>
                              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => openReviewDialog(assignment.id)}>
                                Review / Feedback
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Contribution by Member</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {progress.contribution.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
                  {progress.contribution.map((item) => (
                    <div key={item.studentUid} className="flex items-center justify-between rounded-lg border border-border/40 p-2">
                      <span className="text-sm">{item.studentName}</span>
                      <Badge className="bg-primary/10 text-primary border-0">{item.count} submissions</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Member Status Matrix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {memberStatusMatrix.length === 0 && (
                    <p className="text-sm text-muted-foreground">No grouped members yet.</p>
                  )}

                  {memberStatusMatrix.map((group) => (
                    <div key={group.groupId} className="rounded-xl border border-border/40 p-3">
                      <p className="text-sm font-semibold mb-3">{group.groupName}</p>
                      <div className="overflow-auto">
                        <div
                          className="grid gap-2 min-w-[720px]"
                          style={{ gridTemplateColumns: `180px repeat(${assignments.length}, minmax(120px, 1fr))` }}
                        >
                          <div className="text-xs font-semibold text-muted-foreground">Member</div>
                          {assignments.map((assignment) => (
                            <div key={assignment.id} className="text-xs font-semibold text-muted-foreground truncate" title={assignment.title}>
                              {assignment.title}
                            </div>
                          ))}

                          {group.members.map((member) => (
                            <Fragment key={member.memberId}>
                              <div className="text-sm font-medium">{member.memberName}</div>
                              {member.statuses.map((status) => (
                                <div key={`${member.memberId}-${status.assignmentId}`}>
                                  {!status.required ? (
                                    <Badge variant="secondary" className="border-0 text-[10px]">N/A</Badge>
                                  ) : status.done ? (
                                    <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Submitted</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-[10px]">Pending</Badge>
                                  )}
                                </div>
                              ))}
                            </Fragment>
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
                  <CardTitle className="text-base inline-flex items-center gap-2"><Brain className="h-4 w-4" /> Grouping Engine</CardTitle>
                  <div className="flex items-center gap-2">
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
                    <Button className="rounded-xl" onClick={handleGenerateGroups} disabled={groupingLoading}>
                      {groupingLoading ? "Generating..." : "Generate Groups"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {groupingModeOptions.find((item) => item.value === groupingMode)?.description}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Target skills: {(classroom.requirements || []).join(", ") || "-"}
                  </p>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {progress.groupProgress.length === 0 && groups.length === 0 && (
                  <Card className="rounded-2xl border-dashed col-span-2">
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">No groups yet.</CardContent>
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
                          <Badge variant="secondary" className="border-0">{members.length} members</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <p className="text-xl font-bold">{stats?.percent || 0}%</p>
                          <Progress className="h-2 mt-2" value={stats?.percent || 0} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {members.map((member) => (
                            <Badge key={member.id} variant="secondary" className="border-0">
                              {member.studentName}
                            </Badge>
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
                  <CardTitle className="text-base">Student Roster</CardTitle>
                  <Button variant="outline" className="rounded-xl" onClick={() => setUidInviteOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" /> Add Students
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {enrollments.length === 0 && <p className="text-sm text-muted-foreground">No students enrolled yet.</p>}
                  {enrollments.map((enrollment) => {
                    const fromGroup = groupMembers.find((member) => member.studentUid === enrollment.studentUid);
                    return (
                      <div key={enrollment.id} className="rounded-xl border border-border/50 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{(fromGroup?.studentName || enrollment.studentUid).slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{fromGroup?.studentName || enrollment.studentUid}</p>
                            <p className="text-xs text-muted-foreground">source: {enrollment.source}</p>
                          </div>
                        </div>
                        {fromGroup?.groupName && <Badge variant="secondary" className="border-0">{fromGroup.groupName}</Badge>}
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

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent className="rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>Supports text/link/file submissions.</DialogDescription>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={assignmentForm.dueDate}
                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target Type</Label>
                <Select
                  value={assignmentForm.targetType}
                  onValueChange={(value: "classroom" | "group" | "individual") => {
                    setAssignmentForm((prev) => ({ ...prev, targetType: value }));
                    setAssignmentTargetIds([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classroom">Whole Class</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {assignmentForm.targetType !== "classroom" && (
              <div className="space-y-2">
                <Label>
                  {assignmentForm.targetType === "group" ? "Select target groups" : "Select target students"}
                </Label>
                <div className="max-h-36 overflow-auto rounded-xl border border-border/50 p-2 space-y-2">
                  {(assignmentForm.targetType === "group" ? groupTargetOptions : individualTargetOptions).map((option) => {
                    const selected = assignmentTargetIds.includes(option.id);
                    return (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => toggleAssignmentTarget(option.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border/50 hover:bg-muted/40"}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                  {(assignmentForm.targetType === "group" ? groupTargetOptions : individualTargetOptions).length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">No available targets.</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Selected: {assignmentTargetIds.length}</p>
              </div>
            )}
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
            <Button className="w-full rounded-xl" onClick={handleCreateAssignment} disabled={assignmentSubmitting}>
              {assignmentSubmitting ? "Saving..." : "Create Assignment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review & Feedback</DialogTitle>
            <DialogDescription>Select a submission and provide feedback with score.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedAssignmentSubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground">No submissions for this assignment yet.</p>
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
                    Select for review
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
                <Textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Give improvement guidance" />
                <Label>Score</Label>
                <Input value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} placeholder="e.g. 85" />
                <Button className="rounded-xl w-full" onClick={handleSubmitReview}>
                  Save Feedback
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TeacherLayout>
  );
};

export default ClassroomDetail;



