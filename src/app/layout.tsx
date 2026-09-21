import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stream Optimizer | Maximum Entertainment, Minimum Subscriptions",
  description:
    "Intelligently optimize your streaming subscriptions based on TV show schedules. Never pay for overlapping idle months.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
