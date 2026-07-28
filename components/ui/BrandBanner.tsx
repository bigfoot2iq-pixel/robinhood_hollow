import Image from "next/image";

interface BrandBannerProps {
  /** Rendered over the bottom-left of the artwork. Omit for a plain banner. */
  eyebrow?: string;
  className?: string;
  priority?: boolean;
}

export function BrandBanner({ eyebrow, className = "", priority = false }: BrandBannerProps) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-[#ccff00]/15 bg-[#1a160d] ${className}`}
    >
      <Image
        src="/banner.jpg"
        alt="The Hollow"
        width={1500}
        height={500}
        priority={priority}
        sizes="(max-width: 1440px) 100vw, 1440px"
        className="w-full h-24 sm:h-32 lg:h-44 object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a160d] via-[#1a160d]/25 to-transparent" />
      {eyebrow && (
        <p className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-[#ccff00]">
          {eyebrow}
        </p>
      )}
    </div>
  );
}
