/**
 * Presentational pieces shared by the demo and Clerk login forms so the two
 * modes look identical.
 */

export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-site flex justify-center py-16 sm:py-24">
      <div className="card w-full max-w-md text-center">{children}</div>
    </div>
  );
}

export function LoginHeading({ title, text }: { title: string; text: string }) {
  return (
    <>
      <h1 className="text-3xl mb-3">{title}</h1>
      <p className="text-body mb-8">{text}</p>
    </>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-[6px] bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-left">
      {message}
    </p>
  );
}

import { site } from "@/config/site";

export function ContactLine() {
  return (
    <p className="mt-6 text-xs text-body">
      Not on the registry but think you should be? Email{" "}
      <a className="link" href={`mailto:${site.contactEmail}?subject=Alumni%20portal%20access`}>{site.contactEmail}</a>.
    </p>
  );
}

export function NotRegistered({ email }: { email?: string }) {
  const subject = encodeURIComponent("Alumni portal access");
  const body = encodeURIComponent(`Hi TCM,\n\nI'm a Tiger Capital alum and I'd like access to the alumni portal.\n\nName:\nClass year:\nEmail to register: ${email ?? ""}\nFirm:\n\nThanks!`);
  return (
    <div className="rounded-[6px] bg-white border border-line px-5 py-6 text-left">
      <p className="font-semibold text-ink mb-1">You&apos;re not registered.</p>
      <p className="text-body text-sm">
        {email ? <><span className="text-ink">{email}</span> isn&apos;t</> : "This email isn't"} on the alumni registry. If you&apos;re a Tiger Capital alum and think you should be, email{" "}
        <a className="link" href={`mailto:${site.contactEmail}?subject=${subject}&body=${body}`}>{site.contactEmail}</a>{" "}
        with your name, class year, and the email you&apos;d like to use. You may also have registered with a different address.
      </p>
      <a href={`mailto:${site.contactEmail}?subject=${subject}&body=${body}`} className="btn-primary w-full mt-5">Email {site.contactEmail}</a>
    </div>
  );
}
