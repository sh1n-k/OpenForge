import Link from "next/link";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/strategies", label: "Strategies" },
  { href: "/universes", label: "Universes" },
];

export function AppNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-900"
        >
          OpenForge
        </Link>
        <nav className="flex items-center gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-900 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

