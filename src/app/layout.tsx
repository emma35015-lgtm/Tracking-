import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gastos",
  description: "Tracking de gastos automático con Apple Pay y Siri",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gastos",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F3EAC9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Aplica dark antes del primer render para evitar destello */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})()",
          }}
        />
      </head>
      <body className="min-h-full bg-crema text-ink">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'))}",
          }}
        />
      </body>
    </html>
  );
}
