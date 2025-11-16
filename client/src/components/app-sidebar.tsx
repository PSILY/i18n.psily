import { Link, useLocation } from "wouter";
import { Languages, FileText, BarChart3, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Translations",
    url: "/",
    icon: FileText,
  },
  {
    title: "Languages",
    url: "/languages",
    icon: Languages,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const currentUser = getCurrentUser();

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser) return "U";
    return `${currentUser.first_name.charAt(0)}${currentUser.last_name.charAt(0)}`.toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Languages className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-sidebar-foreground">Translation Manager</h2>
            <p className="text-xs text-muted-foreground">psilyou Platform</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8" data-testid="avatar-user">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate" data-testid="text-user-name">
              {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {currentUser?.user_email || "user@example.com"}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
