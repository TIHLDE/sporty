import * as React from "react";

const MINUTE = 60_000;

// getSnapshot must return a cached value, so only read the clock once a minute.
let cached: { at: number; now: number } = { at: 0, now: 0 };
function getSnapshot() {
	const now = Date.now();
	if (now - cached.at >= MINUTE) {
		cached = { at: now, now };
	}
	return cached.now;
}
function getServerSnapshot() {
	return 0;
}
function subscribe(onChange: () => void) {
	const id = window.setInterval(onChange, MINUTE);
	return () => window.clearInterval(id);
}

/** Current time, refreshed once a minute. Safe to read during render. */
export function useNow() {
	return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
