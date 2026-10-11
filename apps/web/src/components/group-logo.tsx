import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@sporty/ui/components/avatar";
import { cn } from "@sporty/ui/lib/utils";
import { VolleyballIcon } from "lucide-react";

/** The Spond group's logo, or a ball icon while it loads or if it has none. */
export function GroupLogo({
	name,
	imageUrl,
	className,
}: {
	name: string;
	imageUrl: string | null | undefined;
	className?: string;
}) {
	return (
		<Avatar className={cn("size-10 rounded-lg after:rounded-lg", className)}>
			{imageUrl && (
				<AvatarImage src={imageUrl} alt={name} className="rounded-lg" />
			)}
			<AvatarFallback className="rounded-lg bg-primary/10 text-primary">
				<VolleyballIcon className="size-1/2" />
			</AvatarFallback>
		</Avatar>
	);
}
