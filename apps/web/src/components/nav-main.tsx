import { Button } from "@sporty/ui/components/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@sporty/ui/components/sidebar";
import { Link, useRouterState } from "@tanstack/react-router";
import { CirclePlusIcon, MessageCircleIcon } from "lucide-react";

import type { TableTab } from "@/components/spond-tables";

export type NavItem = {
  title: string;
  to: FileRouteTypes["to"];
  tab?: TableTab;
  icon?: React.ReactNode;
};

export function NavMain({ items }: { items: NavItem[] }) {
  const location = useRouterState({ select: (s) => s.location });
  const currentTab = (location.search as { tab?: TableTab }).tab;
  const isActive = (item: NavItem) =>
    location.pathname === item.to &&
    (item.to !== "/dashboard" || currentTab === item.tab);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Nytt arrangement"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              render={
                <a
                  href="https://spond.com/client/"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <CirclePlusIcon />
              <span>Nytt arrangement</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href="https://spond.com/client/chat"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <MessageCircleIcon />
              <span className="sr-only">Chat i Spond</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive(item)}
                render={<Link to={item.to} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
