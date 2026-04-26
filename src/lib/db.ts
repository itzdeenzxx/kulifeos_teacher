import { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, addDoc, updateDoc, arrayUnion, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "@/hooks/useAuth";
import * as mockData from "./mockData";

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
    const ownerField = collectionName === "classrooms" ? "teacherId" : "userId";
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
  const { authUser } = useAuth();
  return useFirestoreCollection<any>(
    "teacherActivities", 
    authUser ? [where("ownerId", "==", authUser.uid)] : [], 
    mockData.teacherActivities
  ); 
}
export function useTeacherStudents() { return useFirestoreCollection<any>("teacherStudents", [], mockData.teacherStudents); }
export function useNotifications() { return useFirestoreCollection<any>("notifications", [], mockData.notifications); }
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
      setData(items.length > 0 ? items : mockData.myProjectSpaces);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching projectSpaces:", err);
      setData(mockData.myProjectSpaces);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { data, loading };
}
export function useTeammates() { return useFirestoreCollection<any>("teammates", [], mockData.teammates); }
export function useDeadlines() { return useFirestoreCollection<any>("deadlines", [], mockData.deadlines); }
export function useActiveProjects() { return useFirestoreCollection<any>("activeProjects", [], mockData.activeProjects); }
export function usePortfolioProjects() { return useFirestoreCollection<any>("portfolioProjects", [], mockData.portfolioProjects); }
export function useExperienceTimeline() { return useFirestoreCollection<any>("experienceTimeline", [], mockData.experienceTimeline); }
export function useSkillData() { return useFirestoreCollection<any>("skillData", [], mockData.skillData); }
export function useSkillGapData() { return useFirestoreCollection<any>("skillGapData", [], mockData.skillGapData); }
export function useGrowthTimeline() { return useFirestoreCollection<any>("growthTimeline", [], mockData.growthTimeline); }
export function useCareerRecommendation() { return useFirestoreDoc<any>("careerRecommendations", "default", mockData.careerRecommendation); }

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
