interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-[#0f3460] text-[#8892a4]',
    success: 'bg-[rgba(74,222,128,0.15)] text-[#4ade80]',
    warning: 'bg-[rgba(226,185,111,0.15)] text-[#e2b96f]',
    danger: 'bg-[rgba(233,69,96,0.15)] text-[#e94560]',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
