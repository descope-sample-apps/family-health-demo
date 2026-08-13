import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@descope/nextjs-sdk";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Family Health Demo",
  description: "Descope family account management demo for a family health app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const baseUrl = process.env.NEXT_PUBLIC_DESCOPE_BASE_URL;
  // Against a local Descope backend the flow pages aren't on the default CDN,
  // so point the widget at the local static content host.
  const baseStaticUrl = baseUrl?.includes("localhost")
    ? "https://static.local.descope.org/pages"
    : undefined;

  return (
    <AuthProvider
      projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}
      baseUrl={baseUrl}
      baseStaticUrl={baseStaticUrl}
      sessionTokenViaCookie={{
        secure: false,
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </AuthProvider>
  );
}
