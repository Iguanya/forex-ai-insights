import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Bot,
  AlertTriangle,
  BarChart3,
  CandlestickChart,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Users", url: "/users", icon: Users },
  { title: "Market", url: "/market", icon: CandlestickChart },
];

const aiItems = [
  { title: "AI Signals", url: "/signals", icon: TrendingUp },
  { title: "Trading Bots", url: "/bots", icon: Bot },
  { title: "Risk Alerts", url: "/alerts", icon: AlertTriangle },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="hover:bg-sidebar-accent/50 transition-colors"
            activeClassName="bg-sidebar-accent text-primary font-medium"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="gradient-sidebar border-r border-border">
      <SidebarContent>
        {!collapsed && (
          <div className="px-4 py-5 border-b border-border">
            <h1 className="text-lg font-bold font-display text-primary tracking-tight">
              FX<span className="text-foreground">Broker</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">AI Trading Platform</p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
            AI & Automation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(aiItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
