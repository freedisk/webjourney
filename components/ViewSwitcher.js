import Icon from "@/components/ui/Icon";

const VIEWS = [
  { id: "card", label: "Cartes", icon: "cards", shortcut: "1" },
  { id: "list", label: "Liste", icon: "list", shortcut: "2" },
  { id: "kanban", label: "Kanban", icon: "kanban", shortcut: "3" },
];

export default function ViewSwitcher({ value, onChange, compact = false }) {
  return (
    <div className={`view-switcher${compact ? " view-switcher-compact" : ""}`} role="group" aria-label="Mode d'affichage">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          className={value === view.id ? "is-active" : ""}
          onClick={() => onChange(view.id)}
          aria-pressed={value === view.id}
          aria-label={view.label}
          title={`${view.label} (${view.shortcut})`}
        >
          <Icon name={view.icon} size={compact ? 19 : 16} />
          {!compact && <span>{view.label}</span>}
        </button>
      ))}
    </div>
  );
}
