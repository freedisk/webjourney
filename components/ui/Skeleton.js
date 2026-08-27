export function Skeleton({ className = "", style }) {
  return <span className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function AppSkeleton() {
  return (
    <main className="app-shell app-shell-loading" aria-busy="true" aria-label="Chargement de Capsule">
      <div className="app-header glass-card">
        <Skeleton className="skeleton-logo" />
        <Skeleton className="skeleton-view" />
        <Skeleton className="skeleton-action" />
      </div>
      <div className="workspace-skeleton">
        <div className="workspace-skeleton-toolbar glass-card">
          <Skeleton style={{ width: "55%", height: "2.5rem" }} />
          <Skeleton style={{ width: "8rem", height: "2.5rem" }} />
        </div>
        <div className="workspace-skeleton-grid">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="workspace-skeleton-card glass-card">
              <Skeleton style={{ width: `${68 + (item % 3) * 8}%`, height: "1rem" }} />
              <Skeleton style={{ width: "100%", height: "0.65rem" }} />
              <Skeleton style={{ width: "82%", height: "0.65rem" }} />
              <Skeleton style={{ width: "5rem", height: "1.25rem", marginTop: "auto" }} />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement des notes…</span>
    </main>
  );
}
