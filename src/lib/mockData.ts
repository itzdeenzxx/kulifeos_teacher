export const skillData = [
  { skill: "AI & ML", value: 85, fullMark: 100 },
  { skill: "Finance", value: 65, fullMark: 100 },
  { skill: "Marketing", value: 70, fullMark: 100 },
  { skill: "Data", value: 90, fullMark: 100 },
  { skill: "Leadership", value: 75, fullMark: 100 },
  { skill: "Design", value: 55, fullMark: 100 },
];

export const skillTags = ["AI & ML", "Finance", "Marketing", "Data", "Leadership"];

export const careerRecommendation = {
  title: "AI Product Manager",
  matchScore: 92,
  description: "Combine your AI expertise with leadership skills to drive product innovation at tech companies.",
  requiredSkills: ["AI & ML", "Leadership", "Data", "Communication"],
};

export const deadlines = [
  { title: "Senior Project Proposal", date: "Mar 5, 2026", course: "CPE 401" },
  { title: "Data Science Assignment", date: "Mar 8, 2026", course: "CPE 312" },
  { title: "Team Presentation", date: "Mar 12, 2026", course: "MKT 201" },
];

export const activeProjects = [
  { name: "AI Chatbot for Campus", members: 4, progress: 68 },
  { name: "Smart Agriculture Dashboard", members: 3, progress: 45 },
  { name: "Student Wellness Tracker", members: 5, progress: 82 },
];

export const userProfile = {
  name: "Somchai Kasetsart",
  faculty: "Faculty of Engineering",
  year: "3rd Year",
  avatar: "SK",
  bio: "Passionate about AI and its applications in agriculture and education.",
};

export const portfolioProjects = [
  { title: "AI Crop Disease Detection", description: "Deep learning model for identifying plant diseases from images", tech: ["Python", "TensorFlow", "React"], status: "Completed" },
  { title: "Campus Navigation App", description: "Mobile-first wayfinding solution for Kasetsart campus", tech: ["React Native", "MapBox"], status: "In Progress" },
  { title: "Student Budget Tracker", description: "Personal finance management tool for university students", tech: ["React", "Firebase"], status: "Completed" },
];

export const experienceTimeline = [
  { year: "2024", title: "AI Research Intern", org: "NECTEC Thailand", description: "Worked on NLP for Thai language processing" },
  { year: "2025", title: "Hackathon Winner", org: "KU Innovation Challenge", description: "Built AI-powered study planner — 1st place" },
  { year: "2025", title: "Teaching Assistant", org: "CPE Department", description: "Assisted in Data Structures & Algorithms course" },
  { year: "2026", title: "Team Lead", org: "Senior Project", description: "Leading a 5-person team on AI campus assistant" },
];

export const teammates = [
  { id: 1, name: "Nattapong Wongchai", faculty: "Computer Engineering", skills: ["AI", "Data", "Python"], compatibility: 94, avatar: "NW" },
  { id: 2, name: "Siriporn Thongdee", faculty: "Business Administration", skills: ["Marketing", "Finance", "Leadership"], compatibility: 87, avatar: "ST" },
  { id: 3, name: "Ananya Chaiyasit", faculty: "Information Technology", skills: ["Design", "UX", "React"], compatibility: 82, avatar: "AC" },
  { id: 4, name: "Kritsada Somboon", faculty: "Economics", skills: ["Finance", "Data", "Analytics"], compatibility: 78, avatar: "KS" },
  { id: 5, name: "Parichat Lertpanya", faculty: "Science", skills: ["AI", "Research", "Statistics"], compatibility: 91, avatar: "PL" },
  { id: 6, name: "Thanawat Jaidee", faculty: "Engineering", skills: ["IoT", "AI", "Hardware"], compatibility: 85, avatar: "TJ" },
];

export const kanbanTasks = {
  todo: [
    { id: "1", title: "Design user survey", tags: ["Research"], assignee: "NW" },
    { id: "2", title: "Set up CI/CD pipeline", tags: ["DevOps"], assignee: "SK" },
    { id: "3", title: "Write API documentation", tags: ["Docs"], assignee: "AC" },
  ],
  inProgress: [
    { id: "4", title: "Build recommendation engine", tags: ["AI", "Backend"], assignee: "SK" },
    { id: "5", title: "Create dashboard mockups", tags: ["Design"], assignee: "AC" },
  ],
  done: [
    { id: "6", title: "Project requirements gathering", tags: ["Planning"], assignee: "NW" },
    { id: "7", title: "Database schema design", tags: ["Backend"], assignee: "SK" },
  ],
};

export const aiSuggestedPlan = {
  tasks: [
    { title: "Data Collection & Preprocessing", role: "Data Engineer", duration: "Week 1-2" },
    { title: "Model Architecture Design", role: "AI Engineer", duration: "Week 2-3" },
    { title: "Frontend Prototype", role: "UI Developer", duration: "Week 2-4" },
    { title: "API Integration", role: "Backend Developer", duration: "Week 4-5" },
    { title: "Testing & QA", role: "QA Lead", duration: "Week 5-6" },
    { title: "Deployment & Launch", role: "DevOps", duration: "Week 6-7" },
  ],
  milestones: ["Alpha Release — Week 3", "Beta Testing — Week 5", "Final Launch — Week 7"],
};

export const skillGapData = [
  { skill: "Machine Learning", current: 85, required: 90 },
  { skill: "Product Strategy", current: 45, required: 80 },
  { skill: "Communication", current: 60, required: 85 },
  { skill: "Data Analysis", current: 90, required: 85 },
  { skill: "UX Design", current: 40, required: 70 },
  { skill: "Project Management", current: 55, required: 75 },
];

export const growthTimeline = [
  { year: "2024", milestone: "Foundation Skills", description: "Core programming & data fundamentals" },
  { year: "2025", milestone: "Specialization", description: "AI/ML deep dive & first internship" },
  { year: "2026", milestone: "Leadership", description: "Team lead & senior project completion" },
  { year: "2027", milestone: "Career Launch", description: "Graduate & enter AI product management" },
];

export const notifications = [
  { id: 1, type: "deadline" as const, title: "เดดไลน์: Senior Project Proposal", message: "เหลืออีก 3 วัน — CPE 401", time: "2 ชม. ที่แล้ว", read: false },
  { id: 2, type: "invite" as const, title: "คำเชิญเข้าทีม", message: "Nattapong เชิญคุณเข้าร่วมโปรเจกต์ Smart Farm", time: "5 ชม. ที่แล้ว", read: false },
  { id: 3, type: "group" as const, title: "จับกลุ่มสำเร็จ!", message: "คุณถูกจัดอยู่ในกลุ่ม A3 — วิชา MKT 201", time: "เมื่อวาน", read: true },
  { id: 4, type: "task" as const, title: "งานใหม่ถูกมอบหมาย", message: "Build recommendation engine — AI Chatbot Project", time: "เมื่อวาน", read: true },
  { id: 5, type: "career" as const, title: "Career Insight Update", message: "ทักษะ Product Strategy ของคุณเพิ่มขึ้น 12%", time: "2 วันที่แล้ว", read: true },
  { id: 6, type: "deadline" as const, title: "เดดไลน์: Data Science Assignment", message: "เหลืออีก 6 วัน — CPE 312", time: "3 วันที่แล้ว", read: true },
];

export const teacherActivities = [
  {
    id: 1,
    name: "CPE 401 — Senior Project",
    students: 48,
    groups: 12,
    status: "grouped" as const,
    requirements: ["Tech", "Design", "Marketing"],
    createdAt: "Jan 15, 2026",
  },
  {
    id: 2,
    name: "MKT 201 — Digital Marketing Workshop",
    students: 200,
    groups: 40,
    status: "grouped" as const,
    requirements: ["Marketing", "Data", "Finance"],
    createdAt: "Feb 1, 2026",
  },
  {
    id: 3,
    name: "CPE 312 — Data Science Lab",
    students: 60,
    groups: 0,
    status: "pending" as const,
    requirements: ["AI", "Data", "Leadership"],
    createdAt: "Feb 10, 2026",
  },
];

export const teacherStudents = [
  { id: 1, name: "Somchai Kasetsart", faculty: "Engineering", skills: ["AI", "Data"], group: "A1", avatar: "SK" },
  { id: 2, name: "Nattapong Wongchai", faculty: "Engineering", skills: ["AI", "Python"], group: "A1", avatar: "NW" },
  { id: 3, name: "Siriporn Thongdee", faculty: "Business", skills: ["Marketing", "Finance"], group: "A2", avatar: "ST" },
  { id: 4, name: "Ananya Chaiyasit", faculty: "IT", skills: ["Design", "UX"], group: "A2", avatar: "AC" },
  { id: 5, name: "Kritsada Somboon", faculty: "Economics", skills: ["Finance", "Data"], group: "A3", avatar: "KS" },
  { id: 6, name: "Parichat Lertpanya", faculty: "Science", skills: ["AI", "Research"], group: "A3", avatar: "PL" },
];

export const uploadedDocuments = [
  { id: 1, name: "Resume_Somchai_2026.pdf", type: "resume" as const, uploadedAt: "Feb 10, 2026", status: "analyzed" as const },
  { id: 2, name: "Transcript_CPE_Y3.pdf", type: "transcript" as const, uploadedAt: "Feb 10, 2026", status: "analyzed" as const },
];

export const aiAnalyzedSkills = [
  { skill: "Python Programming", confidence: 95, source: "resume" as const },
  { skill: "Machine Learning", confidence: 88, source: "resume" as const },
  { skill: "Data Analysis", confidence: 92, source: "transcript" as const },
  { skill: "Calculus III", confidence: 85, source: "transcript" as const },
  { skill: "Database Systems", confidence: 78, source: "transcript" as const },
  { skill: "Team Leadership", confidence: 80, source: "resume" as const },
  { skill: "React / Frontend", confidence: 72, source: "resume" as const },
  { skill: "Communication", confidence: 70, source: "resume" as const },
];

// ====== Group Tasks (for student workspace & teacher monitoring) ======

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "inProgress" | "done";
  assignee: string;
  tags: string[];
  createdAt: string;
  dueDate?: string;
}

export interface ProjectSpace {
  id: string;
  name: string;
  description: string;
  members: { name: string; avatar: string; role: string }[];
  tasks: TaskItem[];
  classroomId?: number;
  groupName?: string;
}

export const myProjectSpaces: ProjectSpace[] = [
  {
    id: "space-1",
    name: "AI Campus Assistant",
    description: "Senior Project — ระบบ AI ช่วยเหลือนิสิตในมหาวิทยาลัย",
    members: [
      { name: "Somchai K.", avatar: "SK", role: "Team Lead" },
      { name: "Nattapong W.", avatar: "NW", role: "AI Engineer" },
      { name: "Ananya C.", avatar: "AC", role: "UI/UX Designer" },
      { name: "Parichat L.", avatar: "PL", role: "Data Engineer" },
      { name: "Thanawat J.", avatar: "TJ", role: "Backend Dev" },
    ],
    classroomId: 1,
    groupName: "A1",
    tasks: [
      { id: "t1", title: "ออกแบบ User Survey", description: "สร้างแบบสอบถามสำหรับนิสิตเพื่อเก็บ requirements", status: "todo", assignee: "NW", tags: ["Research"], createdAt: "2026-02-10" },
      { id: "t2", title: "ตั้งค่า CI/CD Pipeline", description: "ตั้งค่า GitHub Actions สำหรับ auto deploy", status: "todo", assignee: "SK", tags: ["DevOps"], createdAt: "2026-02-11" },
      { id: "t3", title: "เขียน API Documentation", description: "เขียน Swagger docs สำหรับ REST API ทั้งหมด", status: "todo", assignee: "AC", tags: ["Docs"], createdAt: "2026-02-12" },
      { id: "t4", title: "สร้าง Recommendation Engine", description: "สร้างระบบแนะนำวิชาและกิจกรรมด้วย collaborative filtering", status: "inProgress", assignee: "SK", tags: ["AI", "Backend"], createdAt: "2026-02-08" },
      { id: "t5", title: "สร้าง Dashboard Mockups", description: "ออกแบบ Figma mockup สำหรับหน้า Dashboard", status: "inProgress", assignee: "AC", tags: ["Design"], createdAt: "2026-02-09" },
      { id: "t6", title: "รวบรวม Requirements", description: "ประชุมกับอาจารย์ที่ปรึกษาเพื่อเก็บ requirements", status: "done", assignee: "NW", tags: ["Planning"], createdAt: "2026-02-01" },
      { id: "t7", title: "ออกแบบ Database Schema", description: "ออกแบบ ERD และ normalize database", status: "done", assignee: "SK", tags: ["Backend"], createdAt: "2026-02-03" },
      { id: "t8", title: "สร้าง Project Proposal", description: "เขียน proposal ส่งอาจารย์", status: "done", assignee: "PL", tags: ["Docs"], createdAt: "2026-02-02" },
    ],
  },
  {
    id: "space-2",
    name: "Smart Agriculture Dashboard",
    description: "โปรเจกต์ IoT สำหรับติดตามข้อมูลการเกษตรอัจฉริยะ",
    members: [
      { name: "Somchai K.", avatar: "SK", role: "Developer" },
      { name: "Kritsada S.", avatar: "KS", role: "Data Analyst" },
      { name: "Siriporn T.", avatar: "ST", role: "Business" },
    ],
    classroomId: 2,
    groupName: "A2",
    tasks: [
      { id: "t9", title: "ออกแบบ Sensor Layout", status: "done", assignee: "SK", tags: ["IoT"], createdAt: "2026-02-01" },
      { id: "t10", title: "สร้าง Data Pipeline", status: "inProgress", assignee: "KS", tags: ["Data"], createdAt: "2026-02-05" },
      { id: "t11", title: "หา Business Model", status: "todo", assignee: "ST", tags: ["Business"], createdAt: "2026-02-10" },
    ],
  },
];

export const aiChatMessages = [
  { role: "assistant" as const, content: "สวัสดีครับ! ผมเป็น AI คู่คิดของคุณ ถามอะไรเกี่ยวกับโปรเจกต์ได้เลยนะครับ เช่น ช่วยคิดหัวข้อ, แบ่งงาน, หรือแนะนำเทคนิคต่างๆ" },
];

// Mock AI responses for different topics
export const aiMockResponses: Record<string, string> = {
  default: "เข้าใจครับ! ลองอธิบายเพิ่มเติมได้ไหมครับว่าอยากให้ช่วยในส่วนไหน?",
  task: "แนะนำให้แบ่งงานออกเป็น 3 ส่วนหลัก:\n1. **Research & Planning** — เก็บข้อมูล + ออกแบบ\n2. **Development** — สร้าง prototype + coding\n3. **Testing & Launch** — ทดสอบ + deploy\n\nแต่ละส่วนควรมีคนรับผิดชอบชัดเจนครับ",
  topic: "สำหรับหัวข้อโปรเจกต์ ลองดูแนวทางนี้:\n- **AI + Education**: ระบบติวเตอร์อัจฉริยะ\n- **AI + Agriculture**: ตรวจจับโรคพืชด้วยภาพ\n- **AI + Health**: ระบบแนะนำการออกกำลังกาย\n\nเลือกหัวข้อที่ทีมถนัดและมี dataset ให้ใช้ครับ",
  tech: "สำหรับ tech stack แนะนำ:\n- **Frontend**: React + TypeScript + Tailwind\n- **Backend**: Node.js + Express หรือ FastAPI\n- **Database**: PostgreSQL\n- **AI/ML**: Python + TensorFlow/PyTorch\n- **Deploy**: Docker + Cloud Run\n\nเลือกตามความถนัดของทีมได้เลยครับ️",
};
