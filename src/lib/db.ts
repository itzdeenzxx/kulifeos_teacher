import { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, addDoc, updateDoc, arrayUnion, where, onSnapshot, serverTimestamp, orderBy, runTransaction, increment, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "@/hooks/useAuth";
import { evaluateTeacherPolicy } from "@/lib/teacherPolicy";

// ─── Audit Log ────────────────────────────────────────────────────────────────
export type AuditAction =
  | "create_assignment"
  | "generate_groups"
  | "invite_students"
  | "submit_feedback"
  | "update_assignment_type"
  | "save_classroom_setup"
  | "update_profile";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorUid: string;
  actorName?: string;
  classroomId?: string;
  classroomName?: string;
  detail?: string;
  createdAt: any;
}

export async function writeAuditLog(entry: Omit<AuditLogEntry, "id" | "createdAt">) {
  try {
    await addDoc(collection(db, "auditLogs"), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-critical — swallow silently but warn
    console.warn("[AuditLog] Failed to write audit entry:", err);
  }
}

export function useAuditLog(classroomId?: string, limitCount = 30) {
  const { authUser } = useAuth();
  const [data, setData] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) {
      setData([]);
      setLoading(false);
      return;
    }

    const constraints: any[] = classroomId
      ? [where("classroomId", "==", classroomId), orderBy("createdAt", "desc")]
      : [where("actorUid", "==", authUser.uid), orderBy("createdAt", "desc")];

    const q = query(collection(db, "auditLogs"), ...constraints);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.slice(0, limitCount).map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [authUser?.uid, classroomId, limitCount]);

  return { data, loading };
}

// Generic hook to fetch a document
export function useFirestoreDoc<T>(collectionName: string, docId?: string, defaultState: T | null = null) {
  const [data, setData] = useState<T | null>(defaultState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }
    const fetchDoc = async () => {
      try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData({ id: docSnap.id, ...docSnap.data() } as unknown as T);
        }
      } catch (err) {
        console.error(`Error fetching ${collectionName}/${docId}:`, err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [collectionName, docId]);

  return { data, loading };
}

// Generic hook to fetch a collection realtime
export function useFirestoreCollection<T>(collectionName: string, queryConstraints: any[] = [], defaultState: T[] = []) {
  const { authUser } = useAuth();
  const [data, setData] = useState<T[]>(defaultState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) {
      setData(defaultState);
      setLoading(false);
      return;
    }

    // Automatically isolate by user ID if it's a user-owned collection
    const ownerFieldMap: Record<string, string> = {
      classrooms: "teacherId",
      teacherActivities: "ownerId",
      projectSpaces: "ownerId",
    };
    const ownerField = ownerFieldMap[collectionName] || "userId";
    const q = query(collection(db, collectionName), where(ownerField, "==", authUser.uid), ...queryConstraints);
    
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as unknown as T);
          setData(items.length > 0 ? items : []); // Completely isolate mapping to only user's items
          setLoading(false);
        }, (err) => {
          console.error(`Error fetching ${collectionName}:`, err);
          setLoading(false);
        });

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(queryConstraints), authUser?.uid]);

  return { data, loading };
}

export interface TaskItem { id: string; title: string; description?: string; status: "todo" | "inProgress" | "done"; assignee: string; tags: string[]; createdAt: string; dueDate?: string; }
export interface ProjectSpace { id: string; name: string; description: string; ownerId?: string; members: { id?: string; name: string; avatar: string; role: string }[]; tasks: TaskItem[]; classroomId?: number; groupName?: string; }
export type DbProjectSpace = ProjectSpace;

export type GroupingMode = "random" | "skill" | "interest" | "ai";

export interface ClassroomAssignment {
  id: string;
  classroomId: string;
  title: string;
  description?: string;
  dueDate: string;
  targetType: "classroom" | "group" | "individual";
  targetIds?: string[];
  allowTextLink: boolean;
  allowFileUpload: boolean;
  createdByUid: string;
  createdAt?: any;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  classroomId: string;
  studentUid: string;
  studentName?: string;
  submittedByUid?: string;
  submittedByName?: string;
  submissionMode?: "individual" | "group";
  groupId?: string;
  groupName?: string;
  contentText?: string;
  contentLink?: string;
  fileUrl?: string;
  fileName?: string;
  status: "submitted" | "reviewed";
  submittedAt?: any;
  feedback?: string;
  score?: number;
}

export interface ClassroomEnrollment {
  id: string;
  classroomId: string;
  studentUid: string;
  source: "code" | "link" | "uid" | "qr";
}

export interface ClassroomGroup {
  id: string;
  classroomId: string;
  assignmentId?: string | null;
  name: string;
  mode: GroupingMode;
  membersPerGroup: number;
  requiredSkills: string[];
  aiReason?: string;
  createdAt?: any;
}

export interface GroupMember {
  id: string;
  classroomId: string;
  groupId: string;
  studentUid: string;
  studentName: string;
  skills: string[];
  interests: string[];
}

async function getTeacherPolicyByUid(uid?: string) {
  if (!uid) {
    return evaluateTeacherPolicy(null);
  }
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) {
      return evaluateTeacherPolicy(null);
    }
    const data = snap.data() as {
      isGuest?: boolean;
      isTeacherVerified?: boolean;
      verificationStatus?: "trusted-ku" | "verified-non-ku" | "unverified-non-ku";
    };
    return evaluateTeacherPolicy(data);
  } catch {
    return evaluateTeacherPolicy(null);
  }
}

async function assertCanPublishAssignments(teacherUid?: string) {
  const policy = await getTeacherPolicyByUid(teacherUid);
  if (!policy.canPublishAssignments) {
    throw new Error("บัญชีอาจารย์ยังไม่ยืนยันตัวตน ไม่สามารถ publish assignment ได้จนกว่าจะยืนยัน");
  }
}

async function assertCanGenerateGroups(teacherUid?: string) {
  const policy = await getTeacherPolicyByUid(teacherUid);
  if (!policy.canGenerateGroups) {
    throw new Error("บัญชีอาจารย์ยังไม่ยืนยันตัวตน ไม่สามารถ generate groups ได้จนกว่าจะยืนยัน");
  }
}

// Specific feature fetchers
export function useCurrentUserProfile() {
  const { authUser, userProfile } = useAuth();
  const uid = authUser?.uid;

  // Attempt to read from cache first for instant display
  const [cachedProfile, setCachedProfile] = useState(() => {
    if (!uid) return null;
    try {
      const storedRaw = localStorage.getItem(`ku_profile_${uid}`);
      return storedRaw ? JSON.parse(storedRaw) : null;
    } catch {
      return null;
    }
  });

  const { data, loading } = useFirestoreDoc<any>("users", uid, userProfile || cachedProfile || null);

  // Sync to cache when Firestore data loads
  useEffect(() => {
    if (data && Object.keys(data).length > 0 && uid) {
      const currentCache = JSON.parse(localStorage.getItem(`ku_profile_${uid}`) || "{}");
      // Merge keeping the latest photoURL if it exists
      const merged = { ...currentCache, ...data };
      localStorage.setItem(`ku_profile_${uid}`, JSON.stringify(merged));
      setCachedProfile(merged);
    }
  }, [data, uid]);

  return { profile: cachedProfile || data || userProfile, loading };
}

export function useTeacherActivities() { 
  return useFirestoreCollection<any>("teacherActivities", [], []);
}
export function useTeacherStudents() { return useFirestoreCollection<any>("teacherStudents", [], []); }
export function useNotifications() { return useFirestoreCollection<any>("notifications", [], []); }
export function useProjectSpaces(userId?: string) {
  const [data, setData] = useState<ProjectSpace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "projectSpaces"),
      where("ownerId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ProjectSpace);
      setData(items);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching projectSpaces:", err);
      setData([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { data, loading };
}
export function useTeammates() { return useFirestoreCollection<any>("teammates", [], []); }
export function useDeadlines() { return useFirestoreCollection<any>("deadlines", [], []); }
export function useActiveProjects() { return useFirestoreCollection<any>("activeProjects", [], []); }
export function usePortfolioProjects() { return useFirestoreCollection<any>("portfolioProjects", [], []); }
export function useExperienceTimeline() { return useFirestoreCollection<any>("experienceTimeline", [], []); }
export function useSkillData() { return useFirestoreCollection<any>("skillData", [], []); }
export function useSkillGapData() { return useFirestoreCollection<any>("skillGapData", [], []); }
export function useGrowthTimeline() { return useFirestoreCollection<any>("growthTimeline", [], []); }
export function useCareerRecommendation() { return useFirestoreDoc<any>("careerRecommendations", "default", null); }

export function useAssignmentsByClassroom(classroomId?: string) {
  const [data, setData] = useState<ClassroomAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classroomId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "assignments"),
      where("classroomId", "==", classroomId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ClassroomAssignment);
      items.sort((a, b) => {
        const dateA = a.dueDate ? Date.parse(a.dueDate) : 0;
        const dateB = b.dueDate ? Date.parse(b.dueDate) : 0;
        return dateA - dateB;
      });
      setData(items);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching assignments:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classroomId]);

  return { data, loading };
}

export function useAssignmentById(assignmentId?: string) {
  return useFirestoreDoc<ClassroomAssignment>("assignments", assignmentId, null);
}

export function useSubmissionsByClassroom(classroomId?: string) {
  const [data, setData] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classroomId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "submissions"),
      where("classroomId", "==", classroomId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AssignmentSubmission));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [classroomId]);

  return { data, loading };
}

export function useClassroomEnrollments(classroomId?: string) {
  const [data, setData] = useState<ClassroomEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classroomId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "classroomEnrollments"),
      where("classroomId", "==", classroomId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ClassroomEnrollment));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [classroomId]);

  return { data, loading };
}

export function useClassroomGroups(classroomId?: string) {
  const [data, setData] = useState<ClassroomGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classroomId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "groups"), where("classroomId", "==", classroomId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ClassroomGroup));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [classroomId]);

  return { data, loading };
}

export function useGroupMembers(classroomId?: string) {
  const [data, setData] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classroomId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "groupMembers"), where("classroomId", "==", classroomId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as GroupMember));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [classroomId]);

  return { data, loading };
}

export function useAssignmentGroups(assignmentId?: string) {
  const [data, setData] = useState<ClassroomGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assignmentId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "groups"), where("assignmentId", "==", assignmentId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ClassroomGroup));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [assignmentId]);

  return { data, loading };
}

export function useAssignmentGroupMembers(assignmentId?: string) {
  const [data, setData] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assignmentId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "groupMembers"), where("assignmentId", "==", assignmentId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as GroupMember));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribe();
  }, [assignmentId]);

  return { data, loading };
}

export async function createAssignment(
  input: Omit<ClassroomAssignment, "id" | "createdAt">,
  meta?: { classroomName?: string; actorName?: string }
) {
  await assertCanPublishAssignments(input.createdByUid);
  const normalizedTargetIds = Array.from(new Set((input.targetIds || []).map((item) => String(item).trim()).filter(Boolean)));

  const created = await addDoc(collection(db, "assignments"), {
    ...input,
    classroomName: meta?.classroomName ?? "",
    targetIds: input.targetType === "classroom" ? [] : normalizedTargetIds,
    createdAt: serverTimestamp(),
  });

  void writeAuditLog({
    action: "create_assignment",
    actorUid: input.createdByUid,
    actorName: meta?.actorName,
    classroomId: input.classroomId,
    classroomName: meta?.classroomName,
    detail: `สร้างงาน "${input.title}"`,
  });

  return created.id;
}

export async function updateAssignmentTargetType(params: {
  assignmentId: string;
  targetType: "classroom" | "group" | "individual";
  meta?: { actorUid?: string; actorName?: string; classroomId?: string; classroomName?: string };
}) {
  await updateDoc(doc(db, "assignments", params.assignmentId), {
    targetType: params.targetType,
    updatedAt: serverTimestamp(),
  });

  if (params.meta?.actorUid) {
    void writeAuditLog({
      action: "update_assignment_type",
      actorUid: params.meta.actorUid,
      actorName: params.meta.actorName,
      classroomId: params.meta.classroomId,
      classroomName: params.meta.classroomName,
      detail: `เปลี่ยนประเภทงาน ${params.assignmentId} เป็น ${params.targetType === "classroom" ? "ทั้งห้อง" : params.targetType === "group" ? "งานกลุ่ม" : "งานเดี่ยว"}`,
    });
  }
}

export async function upsertSubmissionFeedback(
  submissionId: string,
  feedback: string,
  score: number,
  meta?: { actorUid?: string; actorName?: string; classroomId?: string; classroomName?: string }
) {
  if (!Number.isFinite(score)) {
    throw new Error("คะแนนต้องเป็นตัวเลขระหว่าง 0–100");
  }
  const numericScore = Math.max(0, Math.min(100, Math.round(score)));
  await updateDoc(doc(db, "submissions", submissionId), {
    feedback,
    score: numericScore,
    status: "reviewed",
    reviewedAt: serverTimestamp(),
  });

  if (meta?.actorUid) {
    void writeAuditLog({
      action: "submit_feedback",
      actorUid: meta.actorUid,
      actorName: meta.actorName,
      classroomId: meta.classroomId,
      classroomName: meta.classroomName,
      detail: `ให้ feedback (score ${numericScore}) สำหรับ submission ${submissionId}`,
    });
  }
}

export async function getClassroomStudentProfiles(classroomId: string) {
  const enrollmentSnap = await getDocs(
    query(collection(db, "classroomEnrollments"), where("classroomId", "==", classroomId))
  );
  const studentUids = Array.from(new Set(enrollmentSnap.docs.map((d) => d.data().studentUid as string)));

  const users = await Promise.all(studentUids.map(async (uid) => {
    const snap = await getDoc(doc(db, "users", uid));
    const payload = snap.exists() ? snap.data() : {};
    const onboardingData = (payload as any)?.onboardingData || {};
    const selectedSkills = onboardingData.selectedSkills || [];
    const interests = onboardingData.interests || [];
    const firstName = onboardingData.firstName || "";
    const lastName = onboardingData.lastName || "";
    const displayName = `${firstName} ${lastName}`.trim() || (payload as any)?.email || uid;

    return {
      uid,
      displayName,
      skills: Array.isArray(selectedSkills) ? selectedSkills : [],
      interests: Array.isArray(interests) ? interests : [],
    };
  }));

  return users;
}

function scoreByRequiredSkills(skills: string[], requiredSkills: string[]) {
  if (requiredSkills.length === 0) return skills.length;
  const normalized = new Set(skills.map((s) => s.toLowerCase()));
  return requiredSkills.reduce((score, skill) => {
    return normalized.has(skill.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function scoreByRequiredInterests(interests: string[], requiredInterests: string[]) {
  if (requiredInterests.length === 0) return interests.length;
  const normalized = new Set(interests.map((item) => item.toLowerCase()));
  return requiredInterests.reduce((score, item) => {
    return normalized.has(item.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function createGroupShells(totalStudents: number, membersPerGroup: number) {
  const groupCount = Math.max(1, Math.ceil(totalStudents / Math.max(1, membersPerGroup)));
  return Array.from({ length: groupCount }).map((_, idx) => ({
    name: `A${idx + 1}`,
    members: [] as any[],
    requiredCoverage: new Set<string>(),
  }));
}

function buildRandomGroups(students: any[], membersPerGroup: number) {
  const shuffled = [...students].sort(() => Math.random() - 0.5);
  const groups = createGroupShells(shuffled.length, membersPerGroup);
  shuffled.forEach((student, index) => {
    const groupIndex = index % groups.length;
    groups[groupIndex].members.push(student);
  });
  return groups;
}

function buildSkillGroups(students: any[], membersPerGroup: number, requiredSkills: string[]) {
  const ranked = [...students].sort((a, b) => {
    const scoreDiff = scoreByRequiredSkills(b.skills, requiredSkills) - scoreByRequiredSkills(a.skills, requiredSkills);
    if (scoreDiff !== 0) return scoreDiff;
    return b.skills.length - a.skills.length;
  });

  const groups = createGroupShells(ranked.length, membersPerGroup);
  let cursor = 0;
  let direction = 1;

  for (const student of ranked) {
    groups[cursor].members.push(student);
    student.skills.forEach((skill: string) => groups[cursor].requiredCoverage.add(skill.toLowerCase()));
    if (direction > 0) {
      if (cursor >= groups.length - 1) direction = -1;
      else cursor += 1;
    } else {
      if (cursor <= 0) direction = 1;
      else cursor -= 1;
    }
  }

  return groups;
}

function buildInterestGroups(students: any[], membersPerGroup: number, requiredInterests: string[]) {
  const groups = createGroupShells(students.length, membersPerGroup);
  const required = requiredInterests.map((item) => item.toLowerCase());

  const ranked = [...students].sort((a, b) => {
    const scoreDiff = scoreByRequiredInterests(b.interests || [], requiredInterests) - scoreByRequiredInterests(a.interests || [], requiredInterests);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.interests || []).length - (a.interests || []).length;
  });

  for (const student of ranked) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    groups.forEach((group, index) => {
      const hasCapacity = group.members.length < membersPerGroup;
      if (!hasCapacity) return;

      const studentInterestSet = new Set((student.interests || []).map((item: string) => item.toLowerCase()));
      let missingCoverageGain = 0;
      for (const req of required) {
        if (studentInterestSet.has(req) && !group.requiredCoverage.has(req)) {
          missingCoverageGain += 2;
        }
      }
      const balanceBonus = -group.members.length;
      const score = missingCoverageGain + balanceBonus;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    groups[bestIndex].members.push(student);
    (student.interests || []).forEach((item: string) => groups[bestIndex].requiredCoverage.add(item.toLowerCase()));
  }

  return groups;
}

export async function clearExistingGroups(classroomId: string, assignmentId?: string) {
  let groupRefs: any[] = [];
  let memberRefs: any[] = [];

  if (assignmentId) {
    const qGroups = query(collection(db, "groups"), where("classroomId", "==", classroomId), where("assignmentId", "==", assignmentId));
    const qMembers = query(collection(db, "groupMembers"), where("classroomId", "==", classroomId), where("assignmentId", "==", assignmentId));
    const [snapG, snapM] = await Promise.all([getDocs(qGroups), getDocs(qMembers)]);
    groupRefs = snapG.docs.map(d => d.ref);
    memberRefs = snapM.docs.map(d => d.ref);
  } else {
    const qGroups = query(collection(db, "groups"), where("classroomId", "==", classroomId));
    const qMembers = query(collection(db, "groupMembers"), where("classroomId", "==", classroomId));
    const [snapG, snapM] = await Promise.all([getDocs(qGroups), getDocs(qMembers)]);
    groupRefs = snapG.docs.filter(d => !d.data().assignmentId).map(d => d.ref);
    memberRefs = snapM.docs.filter(d => !d.data().assignmentId).map(d => d.ref);
  }

  const allRefs = [...groupRefs, ...memberRefs];
  for (let idx = 0; idx < allRefs.length; idx += 400) {
    const batch = writeBatch(db);
    allRefs.slice(idx, idx + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

export async function generateClassroomGroups(params: {
  assignmentId?: string;
  classroomId: string;
  teacherUid: string;
  mode: GroupingMode;
  membersPerGroup: number;
  requiredSkills: string[];
  aiSuggestedGroups?: Array<{ name: string; memberUids: string[]; reason?: string }>;
  meta?: { classroomName?: string; actorName?: string };
}) {
  await assertCanGenerateGroups(params.teacherUid);
  const students = await getClassroomStudentProfiles(params.classroomId);
  if (students.length === 0) {
    return { groupCount: 0, memberCount: 0 };
  }

  await clearExistingGroups(params.classroomId, params.assignmentId);

  let groups = [] as Array<{ name: string; members: any[]; requiredCoverage: Set<string>; aiReason?: string }>;
  if (params.aiSuggestedGroups && params.aiSuggestedGroups.length > 0) {
    const byUid = new Map(students.map((student) => [student.uid, student]));
    const assignedUids = new Set<string>();
    groups = params.aiSuggestedGroups.map((group, index) => {
      const members = (group.memberUids || [])
        .map((uid) => {
          if (assignedUids.has(uid)) return null;
          const st = byUid.get(uid);
          if (st) assignedUids.add(uid);
          return st;
        })
        .filter(Boolean) as any[];
      return {
        name: group.name || `A${index + 1}`,
        members,
        requiredCoverage: new Set<string>(),
        aiReason: group.reason,
      };
    }).filter((group) => group.members.length > 0);
  } else if (params.mode === "random") {
    groups = buildRandomGroups(students, params.membersPerGroup);
  } else if (params.mode === "skill") {
    groups = buildSkillGroups(students, params.membersPerGroup, params.requiredSkills);
  } else {
    groups = buildInterestGroups(students, params.membersPerGroup, params.requiredSkills);
  }

  const classroomRef = doc(db, "teacherActivities", params.classroomId);
  const records: Array<{ ref: ReturnType<typeof doc>; payload: Record<string, unknown> }> = [];
  let groupCount = 0;
  let memberCount = 0;

  for (const group of groups) {
    if (group.members.length === 0) continue;
    const groupRef = doc(collection(db, "groups"));
    records.push({
      ref: groupRef,
      payload: {
        classroomId: params.classroomId,
        assignmentId: params.assignmentId || null,
        name: group.name,
        mode: params.mode,
        membersPerGroup: params.membersPerGroup,
        requiredSkills: params.requiredSkills,
        aiReason: group.aiReason || "จัดกลุ่มตามความสมดุลของทักษะและความเหมาะสม",
        createdByUid: params.teacherUid,
        createdAt: serverTimestamp(),
      },
    });
    groupCount += 1;

    for (const student of group.members) {
      const memberRef = doc(collection(db, "groupMembers"));
      records.push({
        ref: memberRef,
        payload: {
          classroomId: params.classroomId,
          assignmentId: params.assignmentId || null,
          groupId: groupRef.id,
          groupName: group.name,
          studentUid: student.uid,
          studentName: student.displayName,
          skills: student.skills,
          interests: student.interests,
          createdAt: serverTimestamp(),
        },
      });
      memberCount += 1;
    }
  }

  const chunkSize = 350;
  for (let idx = 0; idx < records.length; idx += chunkSize) {
    const batch = writeBatch(db);
    records.slice(idx, idx + chunkSize).forEach((entry) => {
      batch.set(entry.ref, entry.payload);
    });
    if (idx + chunkSize >= records.length) {
      batch.update(classroomRef, {
        groups: groupCount,
        status: "grouped",
        updatedAt: Date.now(),
      });
    }
    await batch.commit();
  }

  if (records.length === 0) {
    await updateDoc(classroomRef, {
      groups: 0,
      status: "waiting",
      updatedAt: Date.now(),
    });
  }

  void writeAuditLog({
    action: "generate_groups",
    actorUid: params.teacherUid,
    actorName: params.meta?.actorName,
    classroomId: params.classroomId,
    classroomName: params.meta?.classroomName,
    detail: `จัดกลุ่ม ${groupCount} กลุ่ม (${memberCount} นิสิต) โหมด ${params.mode}`,
  });

  return { groupCount, memberCount };
}

export async function copyClassroomGroupsToAssignment(params: {
  classroomId: string;
  assignmentId: string;
  teacherUid: string;
  meta?: { actorName?: string; classroomName?: string };
}) {
  await assertCanGenerateGroups(params.teacherUid);
  await clearExistingGroups(params.classroomId, params.assignmentId);

  const qGroups = query(collection(db, "groups"), where("classroomId", "==", params.classroomId));
  const qMembers = query(collection(db, "groupMembers"), where("classroomId", "==", params.classroomId));
  const [snapG, snapM] = await Promise.all([getDocs(qGroups), getDocs(qMembers)]);

  const defaultGroups = snapG.docs.filter(d => !d.data().assignmentId);
  const defaultMembers = snapM.docs.filter(d => !d.data().assignmentId);

  const records: any[] = [];
  const groupIdMap = new Map<string, string>();

  defaultGroups.forEach(d => {
    const data = d.data();
    const groupRef = doc(collection(db, "groups"));
    groupIdMap.set(d.id, groupRef.id);
    records.push({
      ref: groupRef,
      payload: {
        ...data,
        assignmentId: params.assignmentId,
        createdAt: serverTimestamp(),
      }
    });
  });

  defaultMembers.forEach(d => {
    const data = d.data();
    const memberRef = doc(collection(db, "groupMembers"));
    const newGroupId = groupIdMap.get(data.groupId) || data.groupId;
    records.push({
      ref: memberRef,
      payload: {
        ...data,
        assignmentId: params.assignmentId,
        groupId: newGroupId,
        createdAt: serverTimestamp(),
      }
    });
  });

  const chunkSize = 350;
  for (let idx = 0; idx < records.length; idx += chunkSize) {
    const batch = writeBatch(db);
    records.slice(idx, idx + chunkSize).forEach(entry => batch.set(entry.ref, entry.payload));
    await batch.commit();
  }
}

export async function createEmptyAssignmentGroups(params: {
  classroomId: string;
  assignmentId: string;
  teacherUid: string;
  groupCount: number;
  meta?: { actorName?: string; classroomName?: string };
}) {
  await assertCanGenerateGroups(params.teacherUid);
  await clearExistingGroups(params.classroomId, params.assignmentId);

  const records: any[] = [];
  for (let i = 0; i < params.groupCount; i++) {
    const groupRef = doc(collection(db, "groups"));
    records.push({
      ref: groupRef,
      payload: {
        classroomId: params.classroomId,
        assignmentId: params.assignmentId,
        name: `กลุ่ม ${i + 1}`,
        mode: "manual",
        membersPerGroup: 0,
        requiredSkills: [],
        aiReason: "สร้างกลุ่มเพื่อจัดสมาชิกด้วยตนเอง",
        createdByUid: params.teacherUid,
        createdAt: serverTimestamp(),
      }
    });
  }

  const chunkSize = 350;
  for (let idx = 0; idx < records.length; idx += chunkSize) {
    const batch = writeBatch(db);
    records.slice(idx, idx + chunkSize).forEach(entry => batch.set(entry.ref, entry.payload));
    await batch.commit();
  }
}


export async function setAssignmentGroupMember(params: {
  classroomId: string;
  assignmentId?: string | null;
  studentUid: string;
  studentName: string;
  newGroupId?: string | null;
  newGroupName?: string | null;
}) {
  const qArgs: any[] = [collection(db, "groupMembers"), where("classroomId", "==", params.classroomId), where("studentUid", "==", params.studentUid)];
  if (params.assignmentId) {
    qArgs.push(where("assignmentId", "==", params.assignmentId));
  } else {
    qArgs.push(where("assignmentId", "==", null));
  }
  
  const snaps = await getDocs(query.apply(null, qArgs as any));
  
  if (!params.newGroupId) {
    snaps.forEach(d => deleteDoc(d.ref));
    return;
  }
  
  if (snaps.empty) {
    await addDoc(collection(db, "groupMembers"), {
      classroomId: params.classroomId,
      assignmentId: params.assignmentId || null,
      groupId: params.newGroupId,
      groupName: params.newGroupName,
      studentUid: params.studentUid,
      studentName: params.studentName,
      skills: [],
      interests: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } else {
    snaps.forEach(d => updateDoc(d.ref, {
      groupId: params.newGroupId,
      groupName: params.newGroupName,
      updatedAt: serverTimestamp()
    }));
  }
}

export async function deleteSingleGroup(groupId: string, classroomId: string) {
  const groupRef = doc(db, "groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) return;
  const groupData = groupSnap.data();

  const batch = writeBatch(db);
  
  // 1. Delete Group Document
  batch.delete(groupRef);
  
  // 2. Delete all members in this group
  const qMembers = query(collection(db, "groupMembers"), where("groupId", "==", groupId));
  const snapM = await getDocs(qMembers);
  snapM.forEach(d => batch.delete(d.ref));
  
  // 3. Commit
  await batch.commit();

  // 4. Update classroom group count if it's a classroom-level group
  if (!groupData.assignmentId) {
    const classroomRef = doc(db, "teacherActivities", classroomId);
    await updateDoc(classroomRef, {
      groups: increment(-1),
      updatedAt: Date.now()
    });
  }
}

export async function renameGroup(groupId: string, newName: string) {
  const batch = writeBatch(db);
  
  // 1. Update Group Document
  batch.update(doc(db, "groups", groupId), { name: newName, updatedAt: serverTimestamp() });
  
  // 2. Update all member documents to reflect new name
  const qMembers = query(collection(db, "groupMembers"), where("groupId", "==", groupId));
  const snapM = await getDocs(qMembers);
  snapM.forEach(d => batch.update(d.ref, { groupName: newName, updatedAt: serverTimestamp() }));
  
  // 3. Commit
  await batch.commit();
}

export function calculateClassroomProgress(args: {
  assignments: ClassroomAssignment[];
  submissions: AssignmentSubmission[];
  enrollments: ClassroomEnrollment[];
  groupMembers: GroupMember[];
}) {
  const now = Date.now();
  const enrolledUids = new Set(args.enrollments.map((item) => item.studentUid));
  const enrollmentUidSet = new Set(args.enrollments.map((item) => item.studentUid));
  const studentsByGroupId = new Map<string, Set<string>>();
  args.groupMembers.forEach((member) => {
    const current = studentsByGroupId.get(member.groupId) || new Set<string>();
    current.add(member.studentUid);
    studentsByGroupId.set(member.groupId, current);
  });

  const assignmentById = new Map(args.assignments.map((assignment) => [assignment.id, assignment]));
  const normalizedSubmissions = new Map<string, AssignmentSubmission>();
  args.submissions.forEach((submission) => {
    const assignment = assignmentById.get(submission.assignmentId);
    if (!assignment) return;

    if (assignment.targetType === "group") {
      if (!submission.groupId || !studentsByGroupId.has(submission.groupId)) return;
      const uniqueKey = `${submission.assignmentId}::group::${submission.groupId}`;
      normalizedSubmissions.set(uniqueKey, submission);
      return;
    }

    if (!enrollmentUidSet.has(submission.studentUid)) return;
    const uniqueKey = `${submission.assignmentId}::student::${submission.studentUid}`;
    normalizedSubmissions.set(uniqueKey, submission);
  });
  const uniqueSubmissions = Array.from(normalizedSubmissions.values());

  const expectedRecipientsForAssignment = (assignment: ClassroomAssignment) => {
    if (assignment.targetType === "classroom") {
      return new Set(Array.from(enrolledUids).map((uid) => `student::${uid}`));
    }
    if (assignment.targetType === "individual") {
      if (!assignment.targetIds || assignment.targetIds.length === 0) {
        return new Set(Array.from(enrolledUids).map((uid) => `student::${uid}`));
      }
      const target = new Set<string>();
      (assignment.targetIds || []).forEach((uid) => {
        if (enrollmentUidSet.has(uid)) target.add(`student::${uid}`);
      });
      return target;
    }

    if (!assignment.targetIds || assignment.targetIds.length === 0) {
      return new Set(Array.from(studentsByGroupId.keys()).map((groupId) => `group::${groupId}`));
    }
    const targetGroupIds = new Set(assignment.targetIds || []);
    const target = new Set<string>();
    targetGroupIds.forEach((groupId) => {
      if (studentsByGroupId.has(groupId)) target.add(`group::${groupId}`);
    });
    return target;
  };

  const dueAssignments = args.assignments.filter((item) => Date.parse(item.dueDate) < now);
  const expectedByAssignment = new Map<string, Set<string>>();
  let expectedSubmissionCount = 0;
  args.assignments.forEach((assignment) => {
    const recipients = expectedRecipientsForAssignment(assignment);
    expectedByAssignment.set(assignment.id, recipients);
    expectedSubmissionCount += recipients.size;
  });

  const submissionByAssignment = new Map<string, AssignmentSubmission[]>();
  uniqueSubmissions.forEach((item) => {
    const group = submissionByAssignment.get(item.assignmentId) || [];
    group.push(item);
    submissionByAssignment.set(item.assignmentId, group);
  });

  let overdueRisk = 0;
  for (const assignment of dueAssignments) {
    const expectedRecipients = expectedByAssignment.get(assignment.id) || new Set<string>();
    const submittedRecipients = new Set(
      (submissionByAssignment.get(assignment.id) || []).flatMap((item) => {
        const meta = assignmentById.get(item.assignmentId);
        if (!meta) return [];
        if (meta.targetType === "group" && item.groupId) return [`group::${item.groupId}`];
        return [`student::${item.studentUid}`];
      })
    );
    const pending = Math.max(0, expectedRecipients.size - submittedRecipients.size);
    overdueRisk += pending;
  }

  const submittedCount = uniqueSubmissions.length;
  const completionPercent = expectedSubmissionCount > 0
    ? Math.round((submittedCount / expectedSubmissionCount) * 100)
    : 0;

  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const weeklyVelocity = uniqueSubmissions.filter((item) => {
    const ts = item.submittedAt?.seconds ? item.submittedAt.seconds * 1000 : Date.parse(item.submittedAt || "");
    return Number.isFinite(ts) && ts >= weekAgo;
  }).length;

  const startOfWeek = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    const diffToMonday = (day + 6) % 7;
    date.setDate(date.getDate() - diffToMonday);
    return date.getTime();
  };

  const currentWeekStart = startOfWeek(now);
  const weeklyTimelineMap = new Map<number, number>();
  const timelineWeeks = 8;
  for (let idx = timelineWeeks - 1; idx >= 0; idx -= 1) {
    const start = currentWeekStart - idx * 7 * 24 * 60 * 60 * 1000;
    weeklyTimelineMap.set(start, 0);
  }

  uniqueSubmissions.forEach((submission) => {
    const ts = submission.submittedAt?.seconds ? submission.submittedAt.seconds * 1000 : Date.parse(submission.submittedAt || "");
    if (!Number.isFinite(ts)) return;
    const bucket = startOfWeek(ts);
    if (!weeklyTimelineMap.has(bucket)) return;
    weeklyTimelineMap.set(bucket, (weeklyTimelineMap.get(bucket) || 0) + 1);
  });

  const weeklyTimeline = Array.from(weeklyTimelineMap.entries())
    .map(([weekStart, count]) => ({
      weekStart,
      label: new Date(weekStart).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      count,
    }))
    .sort((a, b) => a.weekStart - b.weekStart);

  const contributionMap = new Map<string, number>();
  uniqueSubmissions.forEach((item) => {
    const contributorUid = item.submittedByUid || item.studentUid;
    contributionMap.set(contributorUid, (contributionMap.get(contributorUid) || 0) + 1);
  });

  const contribution = Array.from(contributionMap.entries()).map(([contributorUid, count]) => {
    const member = args.groupMembers.find((groupMember) => groupMember.studentUid === contributorUid);
    return {
      studentUid: contributorUid,
      studentName: member?.studentName || contributorUid,
      count,
    };
  }).sort((a, b) => b.count - a.count);

  const byGroup = new Map<string, { submitted: number; expected: number; groupName: string }>();
  args.groupMembers.forEach((member) => {
    const current = byGroup.get(member.groupId) || { submitted: 0, expected: 0, groupName: (member as any).groupName || member.groupId };
    const expectedCountForMember = args.assignments.reduce((sum, assignment) => {
      const recipients = expectedByAssignment.get(assignment.id);
      if (!recipients) return sum;
      if (assignment.targetType === "group") {
        return sum + (recipients.has(`group::${member.groupId}`) ? 1 : 0);
      }
      return sum + (recipients.has(`student::${member.studentUid}`) ? 1 : 0);
    }, 0);
    current.expected += expectedCountForMember;
    byGroup.set(member.groupId, current);
  });

  uniqueSubmissions.forEach((submission) => {
    const assignment = assignmentById.get(submission.assignmentId);
    if (!assignment) return;

    if (assignment.targetType === "group") {
      if (!submission.groupId) return;
      const current = byGroup.get(submission.groupId);
      if (!current) return;
      current.submitted += 1;
      return;
    }

    const member = args.groupMembers.find((item) => item.studentUid === submission.studentUid);
    if (!member) return;
    const current = byGroup.get(member.groupId);
    if (!current) return;
    current.submitted += 1;
  });

  const groupProgress = Array.from(byGroup.entries()).map(([groupId, stats]) => ({
    groupId,
    groupName: stats.groupName,
    submitted: stats.submitted,
    expected: stats.expected,
    percent: stats.expected > 0 ? Math.round((stats.submitted / stats.expected) * 100) : 0,
  })).sort((a, b) => b.percent - a.percent);

  return {
    completionPercent,
    overdueRisk,
    weeklyVelocity,
    weeklyTimeline,
    contribution,
    groupProgress,
  };
}

export async function inviteStudentsByUid(
  classroomId: string,
  invitedByUid: string,
  studentUids: string[],
  meta?: { classroomName?: string; actorName?: string }
) {
  const uniqueUids = Array.from(
    new Set(studentUids.map((uid) => uid.trim()).filter(Boolean))
  );

  if (uniqueUids.length === 0) {
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;
  const classroomRef = doc(db, "teacherActivities", classroomId);

  await runTransaction(db, async (transaction) => {
    const classroomSnap = await transaction.get(classroomRef);
    if (!classroomSnap.exists()) {
      throw new Error("ไม่พบห้องเรียนนี้ในระบบ");
    }

    for (const studentUid of uniqueUids) {
      // Deterministic enrollment id prevents duplicate enrollment by UID.
      const enrollmentRef = doc(db, "classroomEnrollments", `${classroomId}_${studentUid}`);
      const existingEnrollment = await transaction.get(enrollmentRef);

      if (existingEnrollment.exists()) {
        skipped += 1;
        continue;
      }

      transaction.set(enrollmentRef, {
        classroomId,
        classroomName: meta?.classroomName ?? "",
        studentUid,
        source: "uid",
        invitedByUid,
        joinedAt: serverTimestamp(),
        updatedAt: Date.now(),
      });
      created += 1;
    }

    if (created > 0) {
      transaction.update(classroomRef, {
        students: increment(created),
        updatedAt: Date.now(),
      });
    }
  });

  if (created > 0) {
    void writeAuditLog({
      action: "invite_students",
      actorUid: invitedByUid,
      actorName: meta?.actorName,
      classroomId,
      classroomName: meta?.classroomName,
      detail: `เพิ่มนิสิต ${created} คน (ข้าม ${skipped} ซ้ำ)`,
    });
  }

  return { created, skipped };
}

export const skillTagsDefault = ["AI & ML", "Finance", "Marketing", "Data", "Leadership"];

export const aiChatMessagesDefault = [
  { role: "assistant", content: "สวัสดีครับ! ผมเป็น AI คู่คิดของคุณ ถามอะไรเกี่ยวกับโปรเจกต์ได้เลยนะครับ" },
];
export const aiMockResponsesDefault: Record<string, string> = {
  default: "เข้าใจครับ! ลองอธิบายเพิ่มเติมได้ไหมครับว่าอยากให้ช่วยในส่วนไหน?",
  task: "แนะนำให้แบ่งงานออกเป็น 3 ส่วนหลัก:\n1. **Research & Planning** — เก็บข้อมูล + ออกแบบ\n2. **Development** — สร้าง prototype + coding\n3. **Testing & Launch** — ทดสอบ + deploy\n\nแต่ละส่วนควรมีคนรับผิดชอบชัดเจนครับ",
  topic: "สำหรับหัวข้อโปรเจกต์ ลองดูแนวทางนี้:\n- **AI + Education**: ระบบติวเตอร์อัจฉริยะ\n- **AI + Agriculture**: ตรวจจับโรคพืชด้วยภาพ\n- **AI + Health**: ระบบแนะนำการออกกำลังกาย\n\nเลือกหัวข้อที่ทีมถนัดและมี dataset ให้ใช้ครับ",
  tech: "สำหรับ tech stack แนะนำ:\n- **Frontend**: React + TypeScript + Tailwind\n- **Backend**: Node.js + Express หรือ FastAPI\n- **Database**: PostgreSQL\n- **AI/ML**: Python + TensorFlow/PyTorch\n- **Deploy**: Docker + Cloud Run\n\nเลือกตามความถนัดของทีมได้เลยครับ",
};

export async function createProjectSpace(data: Omit<DbProjectSpace, "id">) {
  try {
    const docRef = await addDoc(collection(db, "projectSpaces"), data);
    return docRef.id;
  } catch (error) {
    console.error("Error creating project space:", error);
    throw error;
  }
}

export async function addTasksToProjectSpace(spaceId: string, tasks: TaskItem[]) {
  try {
    const docRef = doc(db, "projectSpaces", spaceId);
    await updateDoc(docRef, {
      tasks: arrayUnion(...tasks)
    });
  } catch (error) {
    console.error("Error adding tasks to project space:", error);
    throw error;
  }
}

const mockNames = [
  "สมชาย ใจดี", "สมหญิง รักเรียน", "กนกวรรณ ตั้งใจ", "ชัยชนะ มุ่งมั่น",
  "ศิริพร อดทน", "พงศกร พัฒนา", "วิภาดา ร่าเริง", "นัฐพงษ์ ยิ้มแย้ม",
  "สุวิทย์ คิดดี", "อภิญญา มีฝัน", "ธนพล กล้าหาญ", "ดาริกา สวยงาม",
  "เอกราช ชาติชาย", "สุพรรณี ใจเย็น", "ปิยะราช รักเพื่อน"
];

const mockSkills = ["React", "Node.js", "Python", "Data Analysis", "UI/UX", "Figma", "Marketing", "Project Management", "Java", "C++"];
const mockInterests = ["Web Development", "AI/ML", "Data Science", "Business", "Design", "Game Dev"];

function getRandomSubset(arr: string[], min = 1, max = 3) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.floor(Math.random() * (max - min + 1)) + min);
}

export async function injectMockStudentsWithSkills(classroomId: string) {
  const batch = writeBatch(db);
  const uids: string[] = [];

  for (let i = 0; i < 15; i++) {
    const uid = `mock_student_${Math.floor(Math.random() * 100000)}_${i}`;
    uids.push(uid);
    const [firstName, ...rest] = mockNames[i].split(" ");

    batch.set(doc(db, "users", uid), {
      email: `${uid}@student.ku.ac.th`,
      onboardingData: {
        firstName,
        lastName: rest.join(" "),
        fullName: mockNames[i],
        selectedSkills: getRandomSubset(mockSkills, 2, 4),
        interests: getRandomSubset(mockInterests, 1, 3),
        type: "student"
      },
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  return inviteStudentsByUid(classroomId, "system_mock", uids, { actorName: "System Mock" });
}
