import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { CardImportDemoProvider } from "@/contexts/CardImportDemoContext";

export const metadata: Metadata = {
  title: "個人タクシー売上・経費管理デモ",
  description: "個人タクシー事業者向けに、営業CSVから日報、決済集計、カレンダー、経費管理まで確認する商談用デモ画面"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <CardImportDemoProvider>
          <AppShell>{children}</AppShell>
        </CardImportDemoProvider>
      </body>
    </html>
  );
}
