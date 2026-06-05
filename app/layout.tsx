import "./globals.css";
import { Providers } from "./providers";

export const metadata = { title: "PromptingHub", description: "Discover and share AI prompts" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-900 transition-colors">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
