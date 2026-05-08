"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { CommandEntry } from "@/lib/route-meta";

type CommandPaletteProps = {
  commands: CommandEntry[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: CommandEntry) => void;
};

const commandGroupLabel: Record<CommandEntry["group"], string> = {
  Pages: "페이지",
  Context: "현재 작업",
  Sections: "섹션",
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 pb-[10vh] bg-slate-900/50 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="w-full max-w-2xl bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="명령 팔레트"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-border-soft">
          <Search size={20} className="text-slate-400 mr-2 flex-shrink-0" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="페이지, 작업, 섹션 검색"
            className="flex-1 py-4 bg-transparent text-foreground placeholder-slate-400 outline-none text-lg border-0 focus:ring-0 appearance-none"
          />
          <button
            type="button"
            className="px-2 py-1 ml-2 text-xs font-medium text-slate-500 bg-slate-100 rounded border border-slate-200 hover:bg-slate-200 transition-colors"
            onClick={onClose}
          >
            ESC
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border-soft scrollbar-track-transparent flex flex-col gap-1" role="listbox">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center">
              <p className="m-0 text-muted font-medium text-[0.9375rem]">일치하는 명령이 없습니다.</p>
              <p className="m-0 text-slate-400 text-sm mt-1">다른 검색어를 입력해보세요.</p>
            </div>
          ) : (
            filteredCommands.map((command, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={command.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex flex-col items-start px-4 py-3 rounded-xl transition-colors text-left border ${active ? "bg-primary-soft border-blue-200/50" : "bg-transparent border-transparent hover:bg-slate-50"}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onSelect(command)}
                >
                  <div className="flex items-center gap-2 mb-1 w-full">
                    <span className="text-[0.6875rem] font-bold tracking-wider uppercase bg-border-soft text-slate-600 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      {commandGroupLabel[command.group]}
                    </span>
                    <span className={`font-semibold text-[0.9375rem] truncate flex-1 ${active ? "text-primary" : "text-foreground"}`}>
                      {command.label}
                    </span>
                  </div>
                  <span className={`text-[0.8125rem] truncate w-full pl-0.5 ${active ? "text-blue-600/80" : "text-muted"}`}>
                    {command.description}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
