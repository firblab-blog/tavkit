interface StatPillProps {
  count: number;
  label: string;
  onClick?: () => void;
}

export default function StatPill({ count, label, onClick }: StatPillProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-1.5 transition-all group ${
        onClick ? "hover:text-primary cursor-pointer" : ""
      }`}
    >
      <span className="text-sm text-text-muted group-hover:text-text transition-colors">
        {label}
      </span>
      <span className="text-lg font-bold text-primary group-hover:text-primary/70 transition-colors ml-2">
        {count}
      </span>
    </Component>
  );
}
