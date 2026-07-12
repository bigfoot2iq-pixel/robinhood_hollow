"use client";

/**
 * Site-wide ambient backdrop — looping cinematic video sections.
 * Fixed behind all content at low opacity so it reads as atmosphere, not noise.
 */
export function RobinhoodAmbientBackground() {
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
      <div className="absolute inset-0 bg-gradient-to-b from-[#ccff00]/85 via-[#ccff00]/80 to-[#ccff00]/92" />
    </div>
  );
}
