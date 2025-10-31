import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Don't Break The Chain",
  description: "Habit tracker to help you stay consistent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
