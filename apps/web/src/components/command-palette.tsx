"use client";

import { useEffect, useMemo, useState } from "react";
import type { CommandEntry } from "@/lib/route-meta";

type CommandPaletteProps = {
  commands: CommandEntry[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: CommandEntry) => void;
};

export function CommandPalette({
  commands,
  isOpen,
  onClose,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return commands;
    }

    return commands.filter((command) =>
      [command.label, command.description, ...(command.keywords ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) =>
          filteredCommands.length === 0 ? 0 : (current + 1) % filteredCommands.length,
        );
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) =>
          filteredCommands.length === 0
            ? 0
            : (current - 1 + filteredCommands.length) % filteredCommands.length,
        );
      }

      if (event.key === "Enter") {
        const command = filteredCommands[activeIndex];
        if (!command) {
          return;
        }

        event.preventDefault();
        onSelect(command);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filteredCommands, isOpen, onClose, onSelect]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="command-palette-overlay"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="명령 팔레트"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-palette-head">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="페이지, 액션, 섹션 검색"
            className="command-palette-input"
          />
          <button
            type="button"
            className="button-ghost"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <div className="command-palette-list" role="listbox">
          {filteredCommands.length === 0 ? (
            <p className="doc-empty-copy">일치하는 명령이 없습니다.</p>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={[
                  "command-palette-item",
                  index === activeIndex ? "command-palette-item-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onSelect(command)}
              >
                <span className="command-palette-group">{command.group}</span>
                <span className="doc-nav-title">{command.label}</span>
                <span className="doc-nav-description">{command.description}</span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
