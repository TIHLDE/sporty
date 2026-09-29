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
