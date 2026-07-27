import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
