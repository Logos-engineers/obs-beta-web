export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-bg">
      <div className="phone-frame">{children}</div>
    </div>
  );
}
