"use client";

/**
 * Site-wide ambient backdrop — mirrors litvm.com's looping cinematic video sections.
 * Fixed behind all content at low opacity so it reads as atmosphere, not noise.
 */
export function LitvmAmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-[0.18]"
        autoPlay
        muted
        loop
        playsInline
        poster="/litvm/poster-litecoin.jpg"
      >
        <source src="/litvm/bg-litecoin.mp4" type="video/mp4" />
      </video>
      {/* Navy wash so foreground text stays legible over the video */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A1622]/85 via-[#0A1622]/80 to-[#0A1622]/92" />
    </div>
  );
}
