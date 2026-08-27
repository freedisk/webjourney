import Icon from "@/components/ui/Icon";

export default function MobileNavigation({
  viewMode,
  onViewChange,
  onNewNote,
  onOpenCommand,
  busy,
}) {
  const items = [
    { id: "card", label: "Cartes", icon: "cards", action: () => onViewChange("card") },
    { id: "list", label: "Liste", icon: "list", action: () => onViewChange("list") },
    { id: "new", label: "Créer", icon: "plus", action: onNewNote, primary: true },
    { id: "kanban", label: "Kanban", icon: "kanban", action: () => onViewChange("kanban") },
    { id: "search", label: "Chercher", icon: "search", action: onOpenCommand },
  ];

  return (
    <nav className="mobile-navigation" aria-label="Navigation principale mobile">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`${item.primary ? "is-primary" : ""}${viewMode === item.id ? " is-active" : ""}`.trim()}
          onClick={item.action}
          disabled={item.primary && busy}
          aria-current={viewMode === item.id ? "page" : undefined}
        >
          <Icon name={item.icon} size={item.primary ? 22 : 19} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
