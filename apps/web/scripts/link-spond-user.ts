// Links a Spond member to a TIHLDE email from the command line.
//
// Needed to bootstrap the first administrator when their TIHLDE email differs
// from their Spond email (only recognised administrators and sub-administrators
// can link on the admin page).
//
//   bun run spond:link <spond-email> <tihlde-email>

// The app reads .env from the repo root (see envDir in vite.config.ts).
process.loadEnvFile(`${import.meta.dirname}/../../../.env`);

const [spondEmail, tihldeEmail] = process.argv.slice(2);
if (!spondEmail || !tihldeEmail) {
	console.error("Bruk: bun run spond:link <spond-epost> <tihlde-epost>");
	process.exit(1);
}

// Imported after the env file is loaded, since services read it on import.
const { db, spond } = await import("../src/services");
const { linkPerson, normalizeEmail } = await import("@sporty/api/people");

const wanted = normalizeEmail(spondEmail);
const groups = await spond.getGroups();
const matches = groups.flatMap((group) =>
	group.members
		.filter((m) => normalizeEmail(m.email) === wanted)
		.map((member) => ({ group, member })),
);

if (matches.length === 0) {
	console.error(`Fant ingen Spond-medlemmer med e-post ${spondEmail}`);
	process.exit(1);
}

for (const { group, member } of matches) {
	await linkPerson(db, group, {
		memberId: member.id,
		tihldeEmail,
		linkedById: null,
	});
	console.log(
		`Koblet ${member.firstName} ${member.lastName} (${group.name}) til ${normalizeEmail(tihldeEmail)}`,
	);
}

await db.$disconnect();
