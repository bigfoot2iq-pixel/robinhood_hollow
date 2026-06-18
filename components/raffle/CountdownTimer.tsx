import { useCountdown } from "@/lib/hooks/useCountdown";

interface CountdownTimerProps {
  endDate: string | Date;
  className?: string;
}

export function CountdownTimer({ endDate, className = "" }: CountdownTimerProps) {
  const { hours, minutes, seconds, isExpired } = useCountdown(endDate);

  if (isExpired) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span className="material-symbols-outlined text-muted-blue text-sm">schedule</span>
        <span className="text-xs font-bold text-muted-blue uppercase tracking-wider">Ended</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="material-symbols-outlined text-[#33C5D9] text-sm animate-pulse">schedule</span>
      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center">
          <span className="text-sm font-display font-bold text-white leading-none">{hours}</span>
          <span className="text-[7px] font-bold text-muted-blue uppercase tracking-wider">hrs</span>
        </div>
        <span className="text-white/40 text-xs mb-2">:</span>
        <div className="flex flex-col items-center">
          <span className="text-sm font-display font-bold text-white leading-none">{minutes}</span>
          <span className="text-[7px] font-bold text-muted-blue uppercase tracking-wider">min</span>
        </div>
        <span className="text-white/40 text-xs mb-2">:</span>
        <div className="flex flex-col items-center">
          <span className="text-sm font-display font-bold text-white leading-none">{seconds}</span>
          <span className="text-[7px] font-bold text-muted-blue uppercase tracking-wider">sec</span>
        </div>
      </div>
    </div>
  );
}
