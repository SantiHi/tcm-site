/**
 * Site-wide configuration. Safe to import from client and server code.
 * No secrets live here.
 */
export const site = {
  name: "Tiger Capital Management",
  shortName: "TCM",
  mainSiteUrl: "https://www.tiger-cm.com",
  contactEmail: "questions.tcm@gmail.com",
  linkedinUrl: "https://www.linkedin.com/company/tiger-capital-management",
  facebookUrl: "https://www.facebook.com/PrincetonTCM/",
  disclaimer:
    "Tiger Capital Management is not legally affiliated with or endorsed by Princeton University.",
} as const;

/**
 * Airtable column names. Matching is case-insensitive at runtime and each
 * entry may list several accepted names (first match wins).
 *
 * `required` columns must exist in the Members table. `optional` columns are
 * detected at runtime: add them in Airtable and the related features switch
 * on automatically.
 */
export const fields = {
  required: {
    name: ["Name"],
    classYear: ["Class Year", "Year"],
    email: ["Email", "email"],
    firm: ["Firm", "Company"],
  },
  optional: {
    linkedinUrl: ["LinkedIn URL", "LinkedIn", "Linkedin"],
    showInDirectory: ["Show in directory", "Show in Directory"],
    location: ["Location", "City"],
  },
} as const;

/** Events table (created and extended by `npm run airtable:setup`). */
export const eventsTable = {
  name: "Events",
  /** Must exist for the Events feature to switch on. */
  required: {
    title: "Title",
    start: "Start",
    end: "End",
    location: "Location",
    description: "Description",
    link: "Link",
    postedBy: "Posted By",
    postedByEmail: "Posted By Email",
    reminderEmails: "Reminder Emails",
    reminderSent: "Reminder Sent",
    cancelled: "Cancelled",
  },
  /** RSVP features switch on when these exist. */
  optional: {
    going: "Going",
    maybe: "Maybe",
    capacity: "Capacity",
    type: "Type",
    image: "Image",
  },
} as const;

/** Event categories (single-select choices in Airtable). */
export const eventTypes = ["Social", "Networking", "Panel / Talk", "Reunion", "Recruiting", "Other"] as const;
export type EventType = (typeof eventTypes)[number];

/** Time zone used to display and enter event times. */
export const timeZone = "America/New_York";
