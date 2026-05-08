"use client";

import { useEffect, useState } from "react";
import type { PageSection } from "@/lib/route-meta";

export function PageToc({ sections }: { sections: PageSection[] }) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const visibleSections = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const targetId = entry.target.getAttribute("id");
          if (!targetId) {
            return;
          }

          if (entry.isIntersecting) {
            visibleSections.set(targetId, entry.intersectionRatio);
          } else {
            visibleSections.delete(targetId);
          }
        });

        const nextActiveId =
          [...visibleSections.entries()]
            .sort((a, b) => b[1] - a[1])
            .at(0)?.[0] ?? sections[0]?.id;

        if (nextActiveId) {
          setActiveSectionId(nextActiveId);
        }
      },
      {
        rootMargin: "-15% 0px -55% 0px",
        threshold: [0.2, 0.4, 0.6, 0.8],
      },
    );

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  return (
    <nav className="page-toc" aria-label="페이지 내 탐색">
      <p className="page-toc-overline">이 페이지</p>
      <div className="page-toc-list">
        {sections.map((section) => {
          const active = section.id === activeSectionId;

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`page-toc-link ${active ? "page-toc-link-active" : ""}`}
              aria-current={active ? "location" : undefined}
            >
              {section.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
