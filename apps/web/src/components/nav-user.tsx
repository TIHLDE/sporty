import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@sporty/ui/components/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@sporty/ui/components/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@sporty/ui/components/sidebar";
import { useNavigate } from "@tanstack/react-router";
import { EllipsisVerticalIcon, LogOutIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";

function initials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export function NavUser() {
	const { isMobile } = useSidebar();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	if (!session) return null;
	const { user } = session;

	const avatar = (
		<Avatar className="size-8 rounded-lg grayscale">
			{user.image && <AvatarImage src={user.image} alt={user.name} />}
			<AvatarFallback className="rounded-lg">
				{initials(user.name)}
			</AvatarFallback>
		</Avatar>
	);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
						}
					>
						{avatar}
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">{user.name}</span>
							<span className="truncate text-xs text-foreground/70">
								{user.email}
							</span>
						</div>
						<EllipsisVerticalIcon className="ml-auto size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="min-w-56"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="p-0 font-normal">
								<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
									{avatar}
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-medium">{user.name}</span>
										<span className="truncate text-xs text-muted-foreground">
											{user.email}
										</span>
									</div>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() =>
								authClient.signOut({
									fetchOptions: { onSuccess: () => navigate({ to: "/" }) },
								})
							}
						>
							<LogOutIcon />
							Logg ut
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
