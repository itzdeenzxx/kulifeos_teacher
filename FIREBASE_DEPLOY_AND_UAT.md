# Teacher UAT + Firestore Verification

เอกสารนี้ใช้ตรวจระบบฝั่งอาจารย์แบบใช้งานจริง (ไม่พึ่ง mock data)

## 1) ก่อนเริ่มทดสอบ

1. ยืนยันว่า `.env` ชี้ Firebase project จริง
2. ยืนยันว่า deploy rules/indexes ล่าสุดแล้ว
3. ใช้บัญชีอาจารย์ที่ login ได้จริง

## 2) Run ระบบ

```bash
npm install
npm run dev
```

## 3) UAT แบบคลิกทีละขั้น

### A. Login / Logout

1. เปิดหน้า login
2. login ด้วยบัญชีอาจารย์
3. หากยังไม่เคยกรอกข้อมูล ให้กรอก onboarding แล้วกดเข้าสู่ Dashboard
4. กดปุ่มออกจากระบบบน top bar (desktop) หรือปุ่มออกจากระบบบน mobile header

ผลที่คาดหวัง:

1. login สำเร็จ เข้าหน้า dashboard ได้
2. logout สำเร็จ กลับไปหน้า `/auth`
3. กลับหน้าก่อนหน้าไม่ได้โดยไม่ login ใหม่

### B. Create Classroom + Setup Wizard

1. กด "สร้าง Classroom"
2. กรอกชื่อห้องและคำอธิบาย
3. ระบบพาไปหน้า classroom พร้อมเปิด Setup Wizard อัตโนมัติ
4. Step 1 เลือกงานเดี่ยว/งานกลุ่ม กรอกชื่องานและ due date
5. Step 2 เลือกวิธีจัดกลุ่ม (สุ่ม/ตามความสามารถ/ตามความถนัด) และตั้ง members/skills
6. Step 3 ตรวจ preview แล้วกดยืนยัน

ผลที่คาดหวัง:

1. มีเอกสารใหม่ใน `teacherActivities`
2. มีเอกสารใหม่ใน `assignments`
3. ถ้าเลือกงานกลุ่มและมีนักศึกษาแล้ว ต้องมี `groups` และ `groupMembers`

### C. Classroom Detail Settings

1. เข้าแท็บ Groups
2. กดปุ่ม "ตั้งค่า Members/Skills"
3. เปลี่ยน members ต่อกลุ่ม และ target skills
4. กดบันทึก แล้วรีเฟรชหน้า

ผลที่คาดหวัง:

1. ค่ายังคงอยู่หลังรีเฟรช
2. กด Generate Groups แล้วใช้ค่าที่เพิ่งตั้ง

### D. Assignment / Review

1. สร้างงานจากปุ่ม Create Assignment
2. เลือก target ให้ครบตามประเภทงาน
3. เปิด Review / Feedback และบันทึกคะแนน

ผลที่คาดหวัง:

1. มี assignment ใหม่ใน Firestore
2. อัปเดต feedback/score ได้จริง

### E. Teacher Settings

1. เปิดหน้า ตั้งค่า
2. แก้ชื่อ คณะ ภาควิชา และอีเมล
3. กดบันทึก
4. รีเฟรชหน้า

ผลที่คาดหวัง:

1. ข้อมูลยังอยู่
2. ชื่อแสดงบน layout เป็นค่าล่าสุด

## 4) Firestore verification queries (ตรวจข้อมูลจริง)

ใช้ Firebase Console > Firestore > Data ตรวจ collection ตามรายการนี้

1. `users`
2. `teacherActivities`
3. `assignments`
4. `classroomEnrollments`
5. `groups`
6. `groupMembers`
7. `submissions`

ตัวอย่างตรวจแบบ script (รันใน Node script ที่ใช้ Firebase SDK หรือหน้าที่มี firebase initialized):

```javascript
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./src/lib/firebase";

const teacherUid = "<TEACHER_UID>";
const classroomId = "<CLASSROOM_ID>";

const qClassrooms = query(collection(db, "teacherActivities"), where("ownerId", "==", teacherUid));
const classrooms = await getDocs(qClassrooms);
console.log("teacherActivities:", classrooms.size);

const qAssignments = query(collection(db, "assignments"), where("classroomId", "==", classroomId));
const assignments = await getDocs(qAssignments);
console.log("assignments:", assignments.size);

const qEnrollments = query(collection(db, "classroomEnrollments"), where("classroomId", "==", classroomId));
const enrollments = await getDocs(qEnrollments);
console.log("classroomEnrollments:", enrollments.size);

const qGroups = query(collection(db, "groups"), where("classroomId", "==", classroomId));
const groups = await getDocs(qGroups);
console.log("groups:", groups.size);

const qMembers = query(collection(db, "groupMembers"), where("classroomId", "==", classroomId));
const members = await getDocs(qMembers);
console.log("groupMembers:", members.size);

const qSubmissions = query(collection(db, "submissions"), where("classroomId", "==", classroomId));
const submissions = await getDocs(qSubmissions);
console.log("submissions:", submissions.size);
```

## 5) Acceptance criteria

1. ไม่มี mock card/mock profile แสดงใน flow ฝั่งอาจารย์
2. logout ใช้งานได้จริงทั้ง desktop/mobile
3. สร้าง classroom แล้วเข้ากระบวนการ setup wizard ได้ทันที
4. members/skills ปรับและบันทึกได้จริงใน Classroom Detail
5. ข้อมูลที่สร้าง/แก้ไขตรวจเจอใน Firestore collections ครบ
