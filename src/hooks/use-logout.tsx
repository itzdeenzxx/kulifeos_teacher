import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export function useLogout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const promptLogout = () => setOpen(true);

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("ku_current_user_id");
      localStorage.removeItem("ku_current_user");
      // clear any profile cache
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("ku_profile_")) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Logout error", e);
    }
    setOpen(false);
    navigate("/auth");
  };

  const cancel = () => setOpen(false);

  return { open, promptLogout, confirmLogout, cancel };
}
