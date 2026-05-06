import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ WebkitTextSizeAdjust: '100%' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>AcuGuard</title>
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
