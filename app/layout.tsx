import type { Metadata } from "next";
import { Toaster } from "sonner";
import { CHAPTER_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: CHAPTER_NAME === "RushHQ" ? "RushHQ" : `${CHAPTER_NAME} | RushHQ`,
  description: "Recruitment check-in, ratings, and bid review"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans")}>
        <main>{children}</main>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
