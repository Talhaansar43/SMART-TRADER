import type { Metadata } from "next";
import "./globals.css";
import "@/styles/animations.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/common/navbar";
import { Sidebar } from "@/components/common/sidebar";

export const metadata: Metadata = {
  title: "Smart Trader - Daily Trading Application",
  description: "Manage your portfolio, execute trades, and optimize profits intelligently",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <Providers>
          <div className="flex h-screen flex-col">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-auto">
                <div className="p-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
