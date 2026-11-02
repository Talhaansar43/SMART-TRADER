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
      <body className="bg-slate-50 text-slate-900">
        <Providers>
          <div className="flex h-screen flex-col bg-slate-50">
            <Navbar />
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <Sidebar />
              <main id="main-content" className="min-w-0 flex-1 overflow-auto">
                <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
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
