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

// Cookies must be Secure in production (HTTPS) but must NOT be in local dev, where the app is served
// over plain http - a Secure cookie is silently dropped by the browser there, which breaks session and
// refresh-token persistence. This is the SDK's own recommended form for that.
const cookieConfig = { secure: process.env.NODE_ENV !== "development" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider
      projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}
      // Unset in normal use - the SDK then targets Descope's production API and flow CDN. Only set it
      // to point at a non-default Descope environment.
      baseUrl={process.env.NEXT_PUBLIC_DESCOPE_BASE_URL}
      sessionTokenViaCookie={cookieConfig}
      refreshTokenViaCookie={cookieConfig}
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
