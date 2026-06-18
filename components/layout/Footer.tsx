export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} LitVM Raffles. All rights reserved.
        </p>
        <p className="text-sm text-muted-foreground">
          Built on LitVM LiteForge testnet (Chain ID: 4441)
        </p>
      </div>
    </footer>
  );
}
