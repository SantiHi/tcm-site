import type { Metadata } from "next";
import { authMode } from "@/lib/env";
import { DemoLoginForm } from "@/components/DemoLoginForm";
import { ClerkLoginForm } from "@/components/ClerkLoginForm";

export const metadata: Metadata = { title: "Member Access" };

export default function LoginPage() {
  return authMode() === "demo" ? <DemoLoginForm /> : <ClerkLoginForm />;
}
