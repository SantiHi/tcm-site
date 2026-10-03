export { AirtableConfigError, normalizeEmail } from "@/lib/airtable/client";
export { getSchema, getFeatures, type Features, type Schema } from "@/lib/airtable/schema";
export {
  findMemberByEmail,
  listDirectory,
  getDirectoryMember,
  updateMemberByEmail,
  type MemberPublic,
  type MemberSelf,
  type ProfilePatch,
} from "@/lib/airtable/members";
export {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  setReminder,
  setRsvp,
  setCancelled,
  listEventsDueForReminder,
  markReminderSent,
  uploadEventImage,
  removeEventImage,
  IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  EventFullError,
  type EventPublic,
  type EventView,
  type EventInput,
  type Attendee,
  type RsvpStatus,
} from "@/lib/airtable/events";
