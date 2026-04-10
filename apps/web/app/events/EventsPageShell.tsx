export function EventsPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="events-root relative">
      <div className="relative">{children}</div>
    </div>
  );
}
