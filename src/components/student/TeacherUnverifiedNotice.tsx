import { AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { evaluateTeacherPolicy, type TeacherVerificationStatus } from "@/lib/teacherPolicy";

interface TeacherUnverifiedNoticeProps {
  teacherName?: string;
  verificationStatus?: TeacherVerificationStatus;
  isTeacherVerified?: boolean;
  isGuest?: boolean;
  className?: string;
}

export function TeacherUnverifiedNotice({
  teacherName,
  verificationStatus,
  isTeacherVerified,
  isGuest,
  className,
}: TeacherUnverifiedNoticeProps) {
  const policy = evaluateTeacherPolicy({
    verificationStatus,
    isTeacherVerified,
    isGuest,
  });

  if (policy.isGuest) {
    return (
      <div className={cn("rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-900", className)}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Info className="h-4 w-4" />
          โหมดผู้เยี่ยมชม (ตัวอย่าง)
        </div>
        <p className="mt-1 text-xs text-sky-800">
          ห้องเรียนนี้เป็นโหมดสาธิต สามารถทดลองใช้งานได้ แต่ข้อมูลอาจไม่ใช้งานจริง
        </p>
      </div>
    );
  }

  if (policy.isVerified) {
    return null;
  }

  return (
    <div className={cn("rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4" />
        อาจารย์ยังไม่ยืนยันตัวตน
      </div>
      <p className="mt-1 text-xs text-amber-800">
        {teacherName ? `${teacherName} ยังไม่ได้ผ่านการยืนยันตัวตน` : "ผู้สอนยังไม่ได้ผ่านการยืนยันตัวตน"}
      </p>
      <Badge variant="secondary" className="mt-2 border-0 bg-amber-100 text-amber-900">
        เนื้อหาในห้องเรียนนี้ควรตรวจสอบเพิ่มเติมก่อนใช้อ้างอิงอย่างเป็นทางการ
      </Badge>
    </div>
  );
}

export default TeacherUnverifiedNotice;
