export function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="warning-box" role="note">
      <span aria-hidden="true">!</span>
      <div>{children}</div>
    </div>
  );
}
