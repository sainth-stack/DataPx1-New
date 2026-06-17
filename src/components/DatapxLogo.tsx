import logoSrc from "@/assets/datapx1-logo.png";

interface DatapxLogoProps {
  collapsed?: boolean;
  variant?: "light" | "dark";
}

export function DatapxLogo({ collapsed = false }: DatapxLogoProps) {
  return (
    <div className="flex w-full items-center gap-3">
      <img
        src={logoSrc}
        alt="Datapx1"
        className="object-contain shrink-0"
        style={{
          height: collapsed ? 40 : 56,
          width: "auto",
          maxWidth: collapsed ? 56 : 80,
        }}
      />
      {!collapsed && (
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-white font-bold text-sm leading-tight truncate">
            Asset Optimization
          </h1>
          <p className="text-white/70 text-xs leading-tight truncate">
            Decision Intelligence
          </p>
        </div>
      )}
    </div>
  );
}
