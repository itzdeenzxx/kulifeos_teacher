import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, GraduationCap, Users, Hash, ArrowRight, PartyPopper } from "lucide-react";
import { useState } from "react";
import { useTeacherActivities } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const JoinClassroom = () => {
  const { data: teacherActivities = [] } = useTeacherActivities();
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [joined, setJoined] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [mode, setMode] = useState<"info" | "code">(classroomId ? "info" : "code");

  const classroom = classroomId && teacherActivities.length > 0
    ? teacherActivities.find((a: any) => String(a.id) === String(classroomId))
    : null;

  const handleCodeJoin = () => {
    // parse code like KU-0001
    const match = codeInput.trim().match(/^KU-?(\d+)$/i);
    if (!match) {
      toast.error("โค้ดไม่ถูกต้อง กรุณาลองอีกครั้ง");
      return;
    }
    const id = parseInt(match[1], 10);
    const found = teacherActivities.find((a) => a.id === id);
    if (!found) {
      toast.error("ไม่พบ Classroom นี้");
      return;
    }
    navigate(`/join/${found.id}`);
  };

  // No classroomId → show code input page
  if (!classroomId || !classroom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Card className="w-full max-w-sm rounded-3xl border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-primary via-[hsl(153,80%,25%)] to-secondary p-6 text-center">
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <GraduationCap className="mx-auto mb-2 h-10 w-10 text-primary-foreground" />
                <h2 className="text-xl font-extrabold text-primary-foreground">เข้าร่วม Classroom</h2>
                <p className="mt-1 text-sm text-primary-foreground/70">กรอกโค้ดจากอาจารย์</p>
              </motion.div>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="เช่น KU-0001"
                  className="pl-10 h-12 rounded-xl text-center text-lg font-bold tracking-widest"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleCodeJoin()}
                />
              </div>
              <Button
                className="w-full gap-2 h-12 rounded-xl bg-primary text-primary-foreground text-base font-semibold"
                onClick={handleCodeJoin}
              >
                เข้าร่วม <ArrowRight className="h-5 w-5" />
              </Button>
              <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                กลับหน้าหลัก
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Card className="w-full max-w-sm rounded-3xl border-0 shadow-xl overflow-hidden">
          <AnimatePresence mode="wait">
            {joined ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="bg-gradient-to-br from-primary via-[hsl(153,80%,25%)] to-secondary p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                  >
                    <CheckCircle className="mx-auto mb-3 h-16 w-16 text-primary-foreground" />
                  </motion.div>
                  <h2 className="text-2xl font-extrabold text-primary-foreground">เข้าร่วมสำเร็จ! <PartyPopper className="h-6 w-6 inline ml-1" /></h2>
                  <p className="mt-2 text-sm text-primary-foreground/80">คุณเข้าร่วม {classroom.name} แล้ว</p>
                </div>
                <CardContent className="p-6">
                  <Link to="/dashboard">
                    <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-base font-semibold gap-2">
                      ไปที่ Dashboard <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </motion.div>
            ) : (
              <motion.div
                key="join"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="bg-gradient-to-br from-primary via-[hsl(153,80%,25%)] to-secondary p-6 text-center">
                  <GraduationCap className="mx-auto mb-2 h-10 w-10 text-primary-foreground" />
                  <h2 className="text-xl font-extrabold text-primary-foreground">{classroom.name}</h2>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> {classroom.students} คนเข้าร่วมแล้ว
                  </div>
                  <p className="text-center text-xs text-muted-foreground">สร้างเมื่อ {classroom.createdAt}</p>
                  <Button
                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-base font-semibold"
                    onClick={() => setJoined(true)}
                  >
                    เข้าร่วม Classroom
                  </Button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default JoinClassroom;
