"use client";

/**
 * Cinematic LitVM hero banner — uses the litvm.com key art + looping city video,
 * matching the "Litecoin's Virtual Machine" landing section.
 */
export function LitvmHero({
  title = "Litecoin's Virtual Machine",
  subtitle = "Hard Money Web3. Powered by BitcoinOS. Enter raffles and win on the LiteForge testnet.",
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

      <div className="relative z-10 flex flex-col gap-4 p-6 sm:p-10 lg:p-14">
        <img src="/litvm/logo.svg" alt="LitVM" className="h-8 w-auto sm:h-10" />
        <h1 className="font-header text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl max-w-2xl">
          {title}
        </h1>
        <p className="max-w-xl text-sm text-muted-blue sm:text-base">{subtitle}</p>
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
