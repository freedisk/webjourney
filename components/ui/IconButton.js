import Icon from "@/components/ui/Icon";

export default function IconButton({
  label,
  icon,
  className = "",
  size = "default",
  ...props
}) {
  return (
    <button
      type="button"
      className={`icon-button icon-button-${size} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} size={size === "small" ? 16 : 18} />
    </button>
  );
}
