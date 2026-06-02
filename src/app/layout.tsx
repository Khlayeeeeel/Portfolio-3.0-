import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "macOS Sequoia Portfolio",
    description: "A functional macOS Sequoia desktop environment built with Next.js",
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
