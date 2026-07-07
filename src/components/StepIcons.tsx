const colors: Record<string, string> = {
  repetition: '#4A90E2',
  repeat_group: '#a855f7',
  action: '#6b7280',
};

export function StepIcon({ type, className, count }: { type: string; className?: string; count?: number | string }) {
  const color = colors[type] ?? 'currentColor';
  const svgProps = {
    width: '1em',
    height: '1em',
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (type) {
    case 'repetition':
      return (
        <svg {...svgProps}>
          <circle cx="10" cy="10" r="9" />
          <text x="10" y="14" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={count !== undefined && String(count).length > 1 ? 8 : 11} fontWeight="bold" fill={color} stroke="none">{count ?? 1}</text>
        </svg>
      );
    case 'repeat_group':
      return (
        <svg {...svgProps}>
          <path d="M14 5 A7 7 0 0 1 6 15" />
          <polyline points="9,14 6,15 7,12" />
          <path d="M6 15 A7 7 0 0 1 14 5" />
          <polyline points="11,6 14,5 13,8" />
        </svg>
      );
    case 'action':
      return (
        <svg {...svgProps}>
          <rect x="4" y="2" width="12" height="15" rx="1.5" />
          <path d="M8 2h4v2H8z" />
          <path d="M6.5 8h7M6.5 11.5h7M6.5 15h4" />
        </svg>
      );
    default:
      return <span className={className}>❓</span>;
  }
}


