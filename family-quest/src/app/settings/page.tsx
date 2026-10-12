"use client";

import { AppShell } from "@/components/layout/AppShell";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsScreen />
    </AppShell>
  );
}
