export function Logo({ className = "" }: { className?: string }) {
  return <img src="/brand/logo-mudebem.png" alt="Mude Bem" className={`logo-marca ${className}`.trim()} />;
}
