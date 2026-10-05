import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@sporty/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";

import type { SpondOverview } from "@/utils/trpc";

export function NavSubGroups({ items }: { items: SpondOverview["subGroups"] }) {
  const location = useRouterState({ select: (s) => s.location });
  const search = location.search as { tab?: string; subGroup?: string };
  const sidebar = useSidebar();
  if (items.length === 0) return null;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Undergrupper</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              onClick={() => {
                if (!sidebar.isMobile) return;
                sidebar.toggleSidebar();
              }}
              isActive={
                location.pathname === "/dashboard" &&
                search.tab === "members" &&
                search.subGroup === item.id
              }
              render={
                <Link
                  to="/dashboard"
                  search={{ tab: "members", subGroup: item.id }}
                  hash="tables"
                />
              }
            >
              <span
                className="size-2.5 shrink-0 rounded-full bg-muted-foreground"
                style={item.color ? { backgroundColor: item.color } : undefined}
              />
              <span>{item.name}</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>{item.memberCount}</SidebarMenuBadge>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
