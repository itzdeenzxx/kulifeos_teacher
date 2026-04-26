import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Sparkles, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ClassroomQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classroom: { id: number; name: string } | null;
}

const confettiColors = [
  "hsl(153,100%,20%)", "hsl(122,39%,49%)", "hsl(45,100%,55%)",
  "hsl(280,60%,55%)", "hsl(200,80%,50%)", "hsl(0,80%,60%)",
  "hsl(30,80%,55%)", "hsl(320,70%,55%)",
];

const ConfettiPiece = ({ index }: { index: number }) => {
  const color = confettiColors[index % confettiColors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.6;
  const rotation = Math.random() * 720 - 360;
  const size = 6 + Math.random() * 8;
  const shape = index % 3;

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0, scale: 0 }}
      animate={{
        y: 400 + Math.random() * 100,
        x: (Math.random() - 0.5) * 200,
        opacity: [1, 1, 0],
        rotate: rotation,
        scale: [0, 1.2, 1],
      }}
      transition={{ duration: 2 + Math.random(), delay, ease: "easeOut" }}
      className="pointer-events-none absolute z-50"
      style={{ left: `${left}%`, top: -10 }}
    >
      {shape === 0 ? (
        <div style={{ width: size, height: size, backgroundColor: color, borderRadius: 2 }} />
      ) : shape === 1 ? (
        <div style={{ width: size, height: size, backgroundColor: color, borderRadius: "50%" }} />
      ) : (
        <div style={{
          width: 0, height: 0,
          borderLeft: `${size / 2}px solid transparent`,
          borderRight: `${size / 2}px solid transparent`,
          borderBottom: `${size}px solid ${color}`,
        }} />
      )}
    </motion.div>
  );
};

export function ClassroomQRDialog({ open, onOpenChange, classroom }: ClassroomQRDialogProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  if (!classroom) return null;

  const joinUrl = `${window.location.origin}/join/${classroom.id}`;
  const classroomCode = `KU-${String(classroom.id).padStart(4, "0")}`;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    onOpenChange(isOpen);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("คัดลอกลิงก์แล้ว");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(classroomCode);
    toast.success("คัดลอกโค้ดแล้ว");
  };

  const downloadQR = () => {
    const svg = document.getElementById("classroom-qr");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx?.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.download = `${classroom.name}-qr.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="overflow-hidden sm:max-w-md rounded-3xl border-0 p-0">
        {/* Confetti */}
        <AnimatePresence>
          {showConfetti && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden z-50">
              {Array.from({ length: 40 }).map((_, i) => (
                <ConfettiPiece key={i} index={i} />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Kahoot-style header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-gradient-to-br from-primary via-[hsl(153,80%,25%)] to-secondary p-6 pb-4 text-center"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <PartyPopper className="h-6 w-6 text-primary-foreground" />
              <h2 className="text-xl font-extrabold text-primary-foreground tracking-tight">เข้าร่วมเลย!</h2>
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <p className="text-sm text-primary-foreground/80 font-medium">{classroom.name}</p>
          </motion.div>
        </motion.div>

        <div className="p-6 pt-5 space-y-5">
          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ rotate: -5, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
              className="rounded-2xl border-4 border-primary/20 bg-white p-5 shadow-lg"
            >
              <QRCodeSVG
                id="classroom-qr"
                value={joinUrl}
                size={180}
                level="H"
                fgColor="hsl(153, 100%, 20%)"
              />
            </motion.div>
          </motion.div>

          {/* Divider with "หรือ" */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-muted-foreground">หรือกรอกโค้ด</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Code */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.3 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="rounded-2xl bg-gradient-to-br from-primary to-secondary px-8 py-3 shadow-lg">
              <span className="text-2xl font-black tracking-[0.3em] text-primary-foreground">
                {classroomCode}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">บอกนิสิตให้กรอกโค้ดนี้ที่ <span className="font-semibold">/join</span></p>
          </motion.div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-xl" onClick={copyCode}>
              <Copy className="h-4 w-4" /> คัดลอกโค้ด
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-xl" onClick={copyLink}>
              <Copy className="h-4 w-4" /> คัดลอกลิงก์
            </Button>
            <Button size="sm" className="gap-2 rounded-xl bg-primary text-primary-foreground" onClick={downloadQR}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
