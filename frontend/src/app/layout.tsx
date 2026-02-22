// This file is not used by Vite — the root layout is src/App.tsx with AuthProvider.
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
