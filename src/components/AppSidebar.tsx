import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Bot,
  AlertTriangle,
  BarChart3,
  CandlestickChart,
  DollarSign,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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

const adminMainItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Users", url: "/users", icon: Users },
  { title: "Market", url: "/market", icon: CandlestickChart },
];

const adminAIItems = [
  { title: "AI Signals", url: "/signals", icon: TrendingUp },
  { title: "Trading Bots", url: "/bots", icon: Bot },
  { title: "Risk Alerts", url: "/alerts", icon: AlertTriangle },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const adminManagementItems = [
  { title: "Manage Deposits", url: "/deposits", icon: DollarSign },
];

const traderItems = [
  { title: "Deposit Funds", url: "/", icon: DollarSign },
  { title: "Market", url: "/market", icon: CandlestickChart },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role } = useAuth();

  const renderItems = (items: typeof adminMainItems) =>
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

  const isTrader = role === "trader";
  const isAdmin = role === "admin";

  return (
    <Sidebar collapsible="icon" className="gradient-sidebar border-r border-border">
      <SidebarContent>
        {!collapsed && (
          <div className="px-4 py-5 border-b border-border">
            <h1 className="text-lg font-bold font-display text-primary tracking-tight">
              FX<span className="text-foreground">Broker</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isTrader ? "Trader Portal" : "Admin Dashboard"}
            </p>
          </div>
        )}

        {isTrader && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Trading
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(traderItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Dashboard
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderItems(adminMainItems)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderItems(adminManagementItems)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
                AI & Automation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>{renderItems(adminAIItems)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
