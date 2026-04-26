import { motion } from "framer-motion";
import { ReactNode } from "react";

// Page-level fade-in
export const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// Stagger container
export const StaggerContainer = ({ children, className, id }: { children: ReactNode; className?: string; id?: string }) => (
  <motion.div
    key={id}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: 0.08 } },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

// Stagger item
export const StaggerItem = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 16, scale: 0.97 },
      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
    }}
    className={className}
  >
    {children}
  </motion.div>
);
