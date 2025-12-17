import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
}

export function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="p-5 rounded-xl bg-[#141414]">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[#555555]">
          {icon}
        </div>
      </div>
      <div className="text-[28px] font-medium text-foreground tracking-tight leading-none mb-1">
        {value}
      </div>
      <div className="text-[13px] text-[#666666]">{label}</div>
    </div>
  );
}
