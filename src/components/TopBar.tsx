import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCurrentUserProfile } from "@/lib/db";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { profile: userProfile } = useCurrentUserProfile();
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hidden" />
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
        <Avatar className="h-9 w-9 cursor-pointer">
          <AvatarImage src={userProfile?.photoURL || userProfile?.avatar} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
            {userProfile.avatar}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
