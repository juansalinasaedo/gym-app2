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

  const base =
    "rounded-2xl p-5 mb-6 border transition-all duration-200";

  const v = {
    default: "bg-white border-gray-200 shadow-sm",
    soft: "bg-slate-50 border-slate-200 shadow-sm",
    highlight: "bg-emerald-50 border-emerald-200 shadow-md",
    blue: "bg-blue-50 border-blue-300 shadow-md",
    red: "bg-rose-50 border-rose-300 shadow-md",
    purple: "bg-purple-50 border-purple-300 shadow-md",
    gray: "bg-gray-100 border-gray-300 shadow-sm",
    dark: "bg-gray-800 border-gray-700 text-white shadow-lg",
    glass: "bg-white/70 backdrop-blur border-gray-200 shadow",
    card: "bg-white border-gray-200 shadow-lg",
  };

  const t = {
    default: "text-gray-800",
    soft: "text-slate-700",
    highlight: "text-emerald-900",
    blue: "text-blue-900",
    red: "text-rose-900",
    purple: "text-purple-900",
    gray: "text-gray-700",
    dark: "text-white",
    glass: "text-gray-900",
    card: "text-gray-900",
  };

  const hoverStyle = hover ? "hover:shadow-xl hover:-translate-y-1" : "";

  return (
    <div className={`${base} ${v[variant]} ${hoverStyle} ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon && <div className="text-2xl">{icon}</div>}
        <h2 className={`text-lg font-semibold tracking-tight ${t[variant]}`}>
          {title}
        </h2>
      </div>

      {subtitle && (
        <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
      )}

      {children}
    </div>
  );
}
