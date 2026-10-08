import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@sporty/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CalendarIcon,
  ChevronsUpDownIcon,
  ExternalLinkIcon,
  HomeIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
  VolleyballIcon,
} from "lucide-react";
import type * as React from "react";

import { GroupLogo } from "@/components/group-logo";
import { type NavItem, NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavSubGroups } from "@/components/nav-subgroups";
import { NavUser } from "@/components/nav-user";
import { useTRPC } from "@/utils/trpc";

const navMain: NavItem[] = [
  { title: "Oversikt", to: "/dashboard", icon: <LayoutDashboardIcon /> },
  {
    title: "Arrangementer",
    to: "/dashboard/events",
    tab: "events",
    icon: <CalendarIcon />,
  },
  {
    title: "Medlemmer",
    to: "/dashboard/members",
    tab: "members",
    icon: <UsersIcon />,
  },
];

const adminItem: NavItem = {
  title: "Administrasjon",
  to: "/admin",
  icon: <ShieldCheckIcon />,
};

const navSecondary = [
  { title: "Forsiden", url: "/", icon: <HomeIcon /> },
  {
    title: "Åpne Spond",
    url: "https://spond.com/client/",
    icon: <ExternalLinkIcon />,
    external: true,
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.spond.overview.queryOptions({}));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link to="/groups" />}
            >
              {data ? (
                <GroupLogo
                  name={data.group.name}
                  imageUrl={data.group.imageUrl}
                  className="size-6"
                />
              ) : (
                <VolleyballIcon className="size-5!" />
              )}
              <span className="truncate text-base font-semibold">
                {data?.group.name ?? "Sporty"}
              </span>
              <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={
            data?.viewer.canManagePeople ? [...navMain, adminItem] : navMain
          }
        />
        <NavSubGroups items={data?.subGroups ?? []} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
