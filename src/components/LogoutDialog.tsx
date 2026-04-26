import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LogoutDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutDialog({ open, onConfirm, onCancel }: LogoutDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="rounded-2xl border-border/50 max-w-sm mx-4">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">ออกจากระบบ</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            คุณต้องการออกจากระบบใช่ไหม? คุณจะต้องเข้าสู่ระบบใหม่เพื่อใช้งานต่อ
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="rounded-xl border-border/50"
          >
            ยกเลิก
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            ออกจากระบบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
