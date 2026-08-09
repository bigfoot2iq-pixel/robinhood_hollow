"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DateTimePickerProps {
  // datetime-local string: yyyy-MM-dd'T'HH:mm (same value a native input emits).
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const FMT = "yyyy-MM-dd'T'HH:mm";
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
// Gap between the trigger and the popover, and the minimum breathing room we
// keep against the viewport edges.
const GAP = 8;
// Used before the popover has been measured, so the first paint lands close.
const ESTIMATED_POPOVER_HEIGHT = 380;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface Coords {
  top: number;
  left: number;
  width: number;
}

export function DateTimePicker({
  value,
  onChange,
  className,
  placeholder = "Select date & time",
}: DateTimePickerProps) {
  const parsed = value ? new Date(value) : null;
  const sel = parsed && !isNaN(parsed.getTime()) ? parsed : null;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(sel ?? new Date());
  const [coords, setCoords] = useState<Coords | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const time = sel ? format(sel, "HH:mm") : "12:00";
  const today = startOfDay(new Date());

  // The popover is portalled to <body> so it can't be clipped by an ancestor's
  // `overflow-hidden` or trapped under a sibling's stacking context (cards use
  // `backdrop-filter`, which creates one). That means positioning it by hand.
  const updatePosition = useCallback(() => {
    const anchor = ref.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const height = popRef.current?.offsetHeight ?? ESTIMATED_POPOVER_HEIGHT;

    // Prefer opening upward; drop below when there isn't room above.
    const above = rect.top - GAP - height;
    const top =
      above >= GAP ? above : Math.min(rect.bottom + GAP, window.innerHeight - height - GAP);

    const width = popRef.current?.offsetWidth ?? rect.width;
    const left = Math.max(GAP, Math.min(rect.left, window.innerWidth - width - GAP));

    const next = { top: Math.max(GAP, top), left, width: rect.width };
    setCoords((prev) =>
      prev && prev.top === next.top && prev.left === next.left && prev.width === next.width
        ? prev
        : next
    );
  }, []);

  // Unconditional so it also re-runs once the popover has mounted and its real
  // height is known; `setCoords` bails out when nothing moved.
  useIsomorphicLayoutEffect(() => {
    if (open) updatePosition();
  });

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    // Capture phase so scrolling any ancestor (e.g. a modal body) is tracked.
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(view), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(view), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [view]);

  function emit(day: Date, hhmm: string) {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(day);
    d.setHours(h || 0, m || 0, 0, 0);
    onChange(format(d, FMT));
  }

  function pickDay(day: Date) {
    if (isBefore(day, today)) return;
    emit(day, time);
  }

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded border border-[#1a160d]/10 bg-dark-navy px-4 py-3 text-left transition-colors hover:border-[#1a160d]/20 focus:outline-none focus:ring-1 focus:ring-[#1a160d]"
      >
        <span className={cn("flex items-center gap-2", sel ? "text-text-primary" : "text-muted-blue")}>
          <Calendar className="h-4 w-4 text-[#1a160d]" />
          {sel ? format(sel, "PP 'at' p") : placeholder}
        </span>
        <ChevronRight
          className={cn("h-4 w-4 text-muted-blue transition-transform", open && "rotate-90")}
        />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          style={{
            top: coords?.top ?? 0,
            left: coords?.left ?? 0,
            width: coords?.width,
            visibility: coords ? "visible" : "hidden",
          }}
          className="fixed z-[100] min-w-[17rem] rounded border border-[#1a160d]/10 bg-[#1a160d] p-3 shadow-2xl animate-step"
        >
          {/* Month navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView((v) => subMonths(v, 1))}
              className="rounded p-1 text-muted-blue transition-colors hover:bg-[#1a160d]/5 hover:text-text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-text-primary">{format(view, "MMMM yyyy")}</span>
            <button
              type="button"
              onClick={() => setView((v) => addMonths(v, 1))}
              className="rounded p-1 text-muted-blue transition-colors hover:bg-[#1a160d]/5 hover:text-text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="mb-1 grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="text-[10px] font-bold uppercase text-muted-blue/60">
                {d}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const disabled = isBefore(day, today);
              const isSel = sel && isSameDay(day, sel);
              const isToday = isSameDay(day, new Date());
              const outside = !isSameMonth(day, view);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(day)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded text-xs transition-colors",
                    isSel
                      ? "bg-[#1a160d] font-bold text-[#ccff00]"
                      : disabled
                        ? "cursor-not-allowed text-muted-blue/25"
                        : "text-text-primary hover:bg-[#1a160d]/10",
                    !isSel && outside && !disabled && "text-muted-blue/50",
                    !isSel && !disabled && isToday && "ring-1 ring-inset ring-[#1a160d]/40"
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time + confirm */}
          <div className="mt-3 flex items-center gap-2 border-t border-[#1a160d]/10 pt-3">
            <Clock className="h-4 w-4 shrink-0 text-[#1a160d]" />
            <input
              type="time"
              value={time}
              onChange={(e) => emit(sel ?? new Date(), e.target.value)}
              className="flex-1 rounded border border-[#1a160d]/10 bg-dark-navy px-3 py-2 text-sm text-text-primary [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-[#1a160d]"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded bg-[#1a160d] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-text-primary transition-all hover:brightness-125"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
