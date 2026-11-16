import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "IGC CTF – The Insider Threat",
    description: "A functional macOS Sequoia desktop environment built with Next.js",
    robots: { index: false },
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
