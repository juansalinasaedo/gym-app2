// src/components/Section.jsx
export default function Section({
  title,
  subtitle = "",
  children,
  variant = "default",
  icon = null,
  hover = false,
  className = "",
}) {
  // Más padding para que los módulos se vean más grandes y cómodos
  const base =
    "rounded-2xl p-5 md:p-6 mb-6 border transition-all duration-200";

  const variants = {
    default: "bg-white border-gym-border shadow-sm",
    soft: "bg-slate-50 border-slate-200 shadow-sm",
    highlight: "bg-gym-primary-soft border-gym-primary shadow",
    blue: "bg-blue-50 border-blue-300 shadow",
    warning: "bg-amber-50 border-amber-300 shadow",
    danger: "bg-rose-50 border-rose-300 shadow",
    dark: "bg-gym-dark-card border-gym-dark-soft text-white shadow-lg",
    card: "bg-white border-gym-border shadow-lg",
    leftPrimary:
      "bg-white border border-gym-border border-l-4 border-l-gym-primary shadow-sm",
  };

  const texts = {
    default: "text-gym-text-main",
    soft: "text-slate-800",
    highlight: "text-gym-primary-dark",
    blue: "text-blue-900",
    warning: "text-amber-900",
    danger: "text-rose-900",
    dark: "text-white",
    card: "text-gym-text-main",
    leftPrimary: "text-gym-text-main",
  };

  const hoverStyle = hover ? "hover:shadow-xl hover:-translate-y-1" : "";

  const v = variants[variant] || variants.default;
  const t = texts[variant] || texts.default;

  return (
    <div className={`${base} ${v} ${hoverStyle} ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon && <div className="text-3xl">{icon}</div>}
        <h2
          className={`text-xl md:text-2xl font-semibold tracking-tight ${t}`}
        >
          {title}
        </h2>
      </div>

      {subtitle && (
        <p className="text-base text-gym-text-muted mb-4">
          {subtitle}
        </p>
      )}

      {children}
    </div>
  );
}
