/**
 * Print layout — intentionally bare.
 * No sidebar, no topbar, no app chrome.
 * window.print() on these pages captures ONLY the document content.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
