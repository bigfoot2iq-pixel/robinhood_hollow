"use client";

/**
 * Cinematic LitVM hero banner — uses the litvm.com key art + looping city video,
 * matching the "Litecoin's Virtual Machine" landing section.
 */
export function LitvmHero({
  title = "Litecoin's Virtual Machine",
  subtitle = "Hard Money Web3 — enter raffles and win on the LiteForge testnet.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10">
      {/* Looping background video with still-image fallback */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="/litvm/hero.webp"
      >
        <source src="/litvm/bg-city.mp4" type="video/mp4" />
      </video>

      {/* Cinematic gradient wash for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A1622] via-[#0A1622]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1622] via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col gap-3 p-6 sm:p-8 lg:p-10">
        <img src="/litvm/logo.svg" alt="LitVM" className="h-7 w-auto sm:h-9" />
        <h1 className="font-header text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl max-w-2xl">
          {title}
        </h1>
        <p className="max-w-md text-sm text-muted-blue">{subtitle}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#33C5D9]/40 bg-[#33C5D9]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#7FE0EE]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#33C5D9]" />
            LiteForge Testnet · Live
          </span>
        </div>
      </div>
    </section>
  );
}
