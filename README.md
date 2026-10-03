# Tiger Capital Management – Alumni Member Portal

Next.js (App Router) + TypeScript + Tailwind. Clerk for email-code login. Airtable as the database.

## Production architecture

| Piece | Where it runs | Notes |
| --- | --- | --- |
| Web app (Next.js) | Vercel | Server components and server actions only talk to Airtable/Clerk/Resend from the server. |
| Members + Events data | Airtable (your existing base) | The Events table lives next to Members. No separate database. |
| Sign-in | Clerk | Email verification codes. Clerk sends the codes itself and keeps members signed in with an httpOnly session cookie (lifetime is set in Clerk → Sessions; 7 days inactivity / 30 days max is a sensible setting). |
| Reminder emails | Resend | Only used for event reminders. |
| Daily reminder job | Vercel Cron | `vercel.json` calls `/api/cron/reminders` at 13:00 UTC with `CRON_SECRET`. |

Connectors and the keys each needs:

| Connector | Env vars | Where to get them |
| --- | --- | --- |
| Airtable | `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME` | airtable.com/create/tokens (scopes: data.records:read, data.records:write, schema.bases:read; add schema.bases:write only to run `airtable:setup`) |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | dashboard.clerk.com → API keys (use `pk_live`/`sk_live` from the production instance) |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | resend.com → API keys, after verifying the tiger-cm.com domain |
| Cron | `CRON_SECRET` | any long random string, e.g. `openssl rand -hex 32` |
| Links in emails | `APP_URL` | `https://members.tiger-cm.com` |
| Address suggestions (optional) | `GOOGLE_MAPS_API_KEY` | Google Cloud Console → enable "Places API (New)" → create a key restricted to that API. Without it, Photon is used. |

How sign-in works in Clerk mode: the member enters their email → the server checks it exists in Members → the server creates the Clerk user if this is their first login (members never see a sign-up form, and nobody else can create an account) → Clerk emails a 6-digit code → the code is verified and Clerk sets the session cookie. In the Clerk dashboard, set sign-up mode to **Restricted** so the only way in is through this flow.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the Airtable values
npm run airtable:check       # prints the base schema and what the portal will use
npm run dev                  # http://localhost:3000
```

## Features

- **Directory**: search plus Class Year, Firm and Location filters. Blank rows (no Name) and members with "Show in directory" unchecked are never listed.
- **Member profile**: Name, class year, firm, location, LinkedIn button.
- **My Profile**: members edit Firm, Location, LinkedIn and the directory toggle. Name and email are read-only.
- **Events**: any member can post, edit, cancel and delete their own events. Everyone sees Upcoming / Mine / Past tabs, type filters (Social, Networking, Panel / Talk, Reunion, Recruiting, Other), month grouping, Google Calendar and .ics links, and a copy-link button.
- **Home**: welcome page with quick links, the next three events, and a nudge to complete your profile.
- **Event banners**: organizers can upload a JPEG/PNG/WebP banner (stored as an Airtable attachment). "Open in Maps" link on event locations.
- **Address suggestions**: location fields suggest places as you type. Uses Google Places when `GOOGLE_MAPS_API_KEY` is set, otherwise the free Photon (OpenStreetMap) geocoder.
- **Not registered?** Every dead end tells people to email questions.tcm@gmail.com, with a pre-filled mail link.
- **RSVPs**: Going / Maybe / Can't go. Attendee names (linked to their directory profile) are visible to all members; emails are never shown. Optional capacity per event with "spots left" and a Full state (Maybe still allowed). Going automatically enrols you in the day-before reminder and sends a confirmation with calendar links. Cancelling an event emails everyone who responded.
- **Email reminders**: "Remind me by email" sends a confirmation right away and a reminder the day before (daily job at 9am ET via Vercel Cron, `vercel.json`). Uses Resend; without a key, emails are printed to the server log.

## Airtable setup

```bash
npm run airtable:check   # read-only: prints tables/columns and what the portal uses
npm run airtable:setup   # additive: adds Location + "Show in directory" to Members (ticked for all named members), creates the Events table
```

Neither script touches the "Magic Links" table.

## Branded sign-in email

`emails/clerk-verification-code.html` is the branded verification-code email (TCM header, what the portal offers, sign-in link, security note, footer). Apply it with `npm run clerk:email-template` once custom email templates are enabled on the Clerk instance (a Clerk plan feature; the dashboard shows it under Customization → Emails). `--preview` renders it through Clerk without saving. The sender name shown in inboxes is the Clerk application name, set in the Clerk dashboard.

## Login modes

| Clerk keys in `.env.local` | Mode  | Behaviour |
| -------------------------- | ----- | --------- |
| empty                      | Demo  | Any registered email + any 6-digit code. Banner "Demo mode, local only." Refuses any host other than localhost. |
| filled                     | Clerk | Real email verification codes. Same UI. No code changes. |

**Never deploy while the Clerk keys are empty.** The proxy returns 403 for non-localhost hosts and the Airtable layer throws on Vercel in demo mode, but don't rely on that: add the keys first.

## Security model

- All Airtable calls live in `src/lib/airtable/`, which imports `server-only`. The token never reaches the browser.
- Only the Members and Events tables are referenced. The "Magic Links" table is never read or written.
- Event ownership (edit/delete) and reminder lists are checked on the server against the session email; the private "Posted By Email" and "Reminder Emails" columns are never sent to the browser.
- Login requires the email to exist in Members (lower-cased, trimmed match). Otherwise: "You're not registered. Contact us."
- Directory and profile pages receive a fixed whitelist: Name, Class Year, firm, LinkedIn URL. Email is never included in those responses.
- Profile edits locate the record by the session email on the server. Record IDs from the browser are never trusted for writes.
- If a "Show in directory" checkbox column exists, unchecked members are hidden from the directory and their profile URL returns 404.

## Airtable columns

Members, required: `Name`, `Class Year`, `Email`, `Firm`.
Members, optional (auto-detected): `LinkedIn` or `LinkedIn URL`, `Location`, `Show in directory`.
Events table (created by `airtable:setup`): Title, Start, End, Location, Description, Link, Type, Capacity, Posted By, Posted By Email (private), Going (private), Maybe (private), Reminder Emails (private), Reminder Sent, Cancelled.
Column names are matched case-insensitively; accepted names live in `src/config/site.ts`.

The token should have scopes `data.records:read`, `data.records:write`, and ideally `schema.bases:read` (for column detection; without it the app samples records instead).

## Going live

See the checklist in the project chat / below.

1. **Clerk**: create an app at clerk.com. Under *User & Authentication*, enable **Email address** with **Email verification code** and disable password, phone, username and all social providers. Copy the publishable and secret keys.
2. **Local test**: paste the keys into `.env.local`, restart `npm run dev`, confirm the banner disappears and a real code arrives by email.
3. **Git**: commit and push to GitHub (`.env.local` is ignored).
4. **Vercel**: import the repo. Add environment variables `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` (any long random string; Vercel Cron sends it automatically), `APP_URL` (`https://members.tiger-cm.com`) for Production. Deploy.
4b. **Resend**: create an account at resend.com, verify the `tiger-cm.com` sending domain (DNS records in Squarespace), and use a from address on it, e.g. `Tiger Capital Management <alumni@tiger-cm.com>`.
5. **Clerk production instance**: in Clerk, create the production instance, add your domain `members.tiger-cm.com`, and swap the Vercel env vars to the production (`pk_live_` / `sk_live_`) keys. Add the DNS records Clerk asks for.
6. **Subdomain**: in Vercel, add the domain `members.tiger-cm.com` to the project. In Squarespace → Settings → Domains → DNS, add a `CNAME` record with host `members` pointing to `cname.vercel-dns.com`. Wait for Vercel to show the domain as valid.
7. **Squarespace**: point your existing "Member Access" button at `https://members.tiger-cm.com/login`.
