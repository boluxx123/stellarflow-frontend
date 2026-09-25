import "@/config/env";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { ProgressBarProvider } from "./components/TopLoadingBar";
import { UserProvider } from "./components/providers/UserProvider";
import { QueryProvider } from "./components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/ToastQueue";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Script from "next/script";
import SvgSprite from "@/components/icons/SvgSprite";
import { SecurityBanner } from "@/components/navigation/SecurityBanner";
import { InstallBanner } from "./components/InstallBanner";
import { OfflineBanner } from "./components/OfflineBanner";
import { SwUpdateBanner } from "@/components/pwa/SwUpdateBanner";
import { ScreenLockProvider } from "@/components/security/ScreenLockModal";
import { SessionTimeoutManager } from "@/components/security/SessionTimeoutManager";
import { WalletSessionProvider } from "@/context/WalletContext";
import { GasFeeProvider } from "@/components/gas-fee";
import { headers } from "next/headers";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { HapticProvider } from "@/components/providers/HapticProvider";
import { PushNotificationRoot } from "@/components/notifications";
import { RpcFailoverMonitor } from "./components/providers/RpcFailoverMonitor";
import { CommandPalette } from "@/components/command-palette";

/**
 * iOS startup images (`apple-touch-startup-image`).
 *
 * iOS matches startup images with a media query per device resolution, so each
 * entry maps to a file in `public/` produced by `scripts/generate-pwa-icons.js`
 * — keep both lists in sync when adding a device.
 */
const APPLE_SPLASH_SCREENS = [
  // iPhone
  { file: "apple-splash-1290-2796.png", width: 430, height: 932, dpr: 3 },
  { file: "apple-splash-1179-2556.png", width: 393, height: 852, dpr: 3 },
  { file: "apple-splash-1284-2778.png", width: 428, height: 926, dpr: 3 },
  { file: "apple-splash-1170-2532.png", width: 390, height: 844, dpr: 3 },
  { file: "apple-splash-1125-2436.png", width: 375, height: 812, dpr: 3 },
  { file: "apple-splash-828-1792.png", width: 414, height: 896, dpr: 2 },
  { file: "apple-splash-750-1334.png", width: 375, height: 667, dpr: 2 },
  // iPad
  { file: "apple-splash-2048-2732.png", width: 1024, height: 1366, dpr: 2 },
  { file: "apple-splash-1668-2388.png", width: 834, height: 1194, dpr: 2 },
  { file: "apple-splash-1536-2048.png", width: 768, height: 1024, dpr: 2 },
];

export const metadata: Metadata = {
  title: "StellarFlow Network Dashboard",
  description:
    "Monitor relayers, contracts, logs, and network health in real time.",
  manifest: "/manifest.json",
  themeColor: "#39ff14",
  appleWebApp: {
    capable: true,
    // Translucent status bar so the app background shows through on iOS.
    statusBarStyle: "black-translucent",
    title: "StellarFlow",
  },
  icons: {
    // iOS ignores SVG apple-touch-icons, so point it at the 180×180 PNG.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode; }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * Flash-prevention: blocking inline script runs synchronously before
         * any CSS/JS loads. It reads the stored theme from localStorage and,
         * when absent, falls back to the OS colour-scheme preference.
         * The correct "dark" or "light" class is applied to <html> before the
         * first paint, eliminating any theme flash on hard-reload or cold start.
         *
         * Must be a plain <script> tag (not next/script) so it blocks parsing.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('stellarflow-theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);}catch(e){}})();`,
          }}
        />
        {/* Fallback background colour while the script above runs. */}
        <style>{`html{background-color:#0d1117}`}</style>
        {/* Prevent background flash before next-themes hydrates */}
        <style nonce={nonce}>{`html { background-color: #0d1117; }`}</style>
        {/* Preconnect to polyfill CDN (font files are self-hosted via next/font, so no Google Fonts preconnect needed) */}
        <link
          rel="preconnect"
          href="https://polyfill-library.fastly.dev"
        />
        <link
          rel="preconnect"
          href="https://raw.githubusercontent.com"
        />
        <link
          rel="preconnect"
          href="https://assets.coingecko.com"
        />
        <link
          rel="preload"
          href="/sf.webp"
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="/sprite.svg"
          as="image"
          type="image/svg+xml"
          fetchPriority="low"
        />
        {/* PWA: apple-touch-icon + iOS startup images for home-screen installs */}
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
          sizes="180x180"
          type="image/png"
        />
        {APPLE_SPLASH_SCREENS.map(({ file, width, height, dpr }) => (
          <link
            key={file}
            rel="apple-touch-startup-image"
            href={`/${file}`}
            media={`(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`}
          />
        ))}
        <Script
          id="polyfill-loader"
          nonce={nonce}
          strategy="afterInteractive"
          fetchPriority="low"
          dangerouslySetInnerHTML={{
            __html: `
              if (!('IntersectionObserver' in window) || 
                  !('ResizeObserver' in window) || 
                  !('fetch' in window) || 
                  !('Promise' in window)) {
                console.info('StellarFlow: Modern features missing. Loading on-demand polyfills...');
                var js = document.createElement('script');
                js.src = 'https://polyfill-library.fastly.dev/v3/polyfill.min.js?features=default,IntersectionObserver,ResizeObserver,fetch,Promise';
                document.head.appendChild(js);
              }
            `
          }}
        />
      </head>
      <body
        className="antialiased font-sans flex flex-col min-h-screen"
      >
        <OfflineBanner />
        <SvgSprite />
        <div className="fixed top-3 right-3 z-40">
          <SecurityBanner />
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="stellarflow-theme"
          disableTransitionOnChange
        >
          <AccessibilityProvider>
            <HapticProvider>
              <UserProvider>
                <QueryProvider>
                  <ProgressBarProvider>
                      <ToastProvider>
                        <RpcFailoverMonitor />
                        <PushNotificationRoot>
                          <ErrorBoundary tags={{ section: "root" }}>
                            <WalletSessionProvider>
                              <SessionTimeoutManager>
                                <ScreenLockProvider>{children}</ScreenLockProvider>
                              </SessionTimeoutManager>
                            </WalletSessionProvider>
                          </ErrorBoundary>
                        </PushNotificationRoot>
                      </ToastProvider>
                      <SwUpdateBanner />
                      <InstallBanner />
                      <CommandPalette />
                  </ProgressBarProvider>
                </QueryProvider>
              </UserProvider>
            </HapticProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
