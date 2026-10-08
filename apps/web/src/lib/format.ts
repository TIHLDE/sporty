// Fixed time zone so server-rendered and client-rendered times match.
const timeZone = "Europe/Oslo";

const dateFormat = new Intl.DateTimeFormat("nb-NO", {
	day: "numeric",
	month: "short",
	timeZone,
});
const dateTimeFormat = new Intl.DateTimeFormat("nb-NO", {
	weekday: "short",
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit",
	timeZone,
});
const longDateFormat = new Intl.DateTimeFormat("nb-NO", {
	weekday: "long",
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone,
});
const timeFormat = new Intl.DateTimeFormat("nb-NO", {
	hour: "2-digit",
	minute: "2-digit",
	timeZone,
});
const numberFormat = new Intl.NumberFormat("nb-NO");

export const formatDate = (value: string | Date) =>
	dateFormat.format(new Date(value));
export const formatDateTime = (value: string | Date) =>
	dateTimeFormat.format(new Date(value));
export const formatLongDate = (value: string | Date) =>
	longDateFormat.format(new Date(value));
export const formatTime = (value: string | Date) =>
	timeFormat.format(new Date(value));
export const formatNumber = (value: number) => numberFormat.format(value);

export function formatPercent(value: number | null, { signed = false } = {}) {
	if (value === null) return "–";
	const rounded = Math.round(value * 10) / 10;
	const sign = signed && rounded > 0 ? "+" : "";
	return `${sign}${rounded.toLocaleString("nb-NO")} %`;
}

// Spond gives a group's sport as an English code, e.g. "football".
const activityNames: Record<string, string> = {
	football: "Fotball",
	soccer: "Fotball",
	volleyball: "Volleyball",
	beach_volleyball: "Sandvolleyball",
	handball: "Håndball",
	basketball: "Basketball",
	ice_hockey: "Ishockey",
	floorball: "Innebandy",
	bandy: "Bandy",
	futsal: "Futsal",
	tennis: "Tennis",
	table_tennis: "Bordtennis",
	badminton: "Badminton",
	padel: "Padel",
	squash: "Squash",
	running: "Løping",
	athletics: "Friidrett",
	cycling: "Sykling",
	swimming: "Svømming",
	climbing: "Klatring",
	skiing: "Ski",
	cross_country_skiing: "Langrenn",
	orienteering: "Orientering",
	gymnastics: "Turn",
	dance: "Dans",
	martial_arts: "Kampsport",
	rugby: "Rugby",
	american_football: "Amerikansk fotball",
	cricket: "Cricket",
	baseball: "Baseball",
	softball: "Softball",
	golf: "Golf",
	esports: "E-sport",
	chess: "Sjakk",
	other: "Annet",
};

/** A Spond activity code in Norwegian, e.g. "football" → "Fotball". */
export function formatActivity(activity: string): string {
	const key = activity.toLowerCase();
	const name = activityNames[key] ?? key.replaceAll("_", " ");
	return name.charAt(0).toUpperCase() + name.slice(1);
}
