import Icon from "@/components/ui/Icon";

export default function EmptyState({
  icon = "cards",
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <div className={`empty-state${compact ? " empty-state-compact" : ""}`}>
      <span className="empty-state-icon"><Icon name={icon} size={compact ? 20 : 28} /></span>
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {actionLabel && onAction && (
        <button type="button" className="btn-brutal primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
