"use client";

import type { PageSection } from "@/lib/route-meta";

export function PageToc({ sections }: { sections: PageSection[] }) {
  return (
    <nav className="page-toc" aria-label="페이지 내 탐색">
      <p className="page-toc-overline">이 페이지</p>
      <div className="page-toc-list">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="page-toc-link"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
