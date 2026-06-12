import { useState } from "react";
import { FlaskConical, Cpu, NotebookPen, Sigma } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  PRESENTATION_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type PresentationTemplate,
  type TemplateCategory,
} from "@/templates/registry";
import { cn } from "@/lib/utils";

/**
 * "Start with a Template": dashed category chips + the template card grid,
 * per the Figma template section. Every card creates a real starter deck.
 */

const CATEGORY_ICONS: Record<TemplateCategory, LucideIcon> = {
  science: FlaskConical,
  technology: Cpu,
  mathematics: Sigma,
  academia: NotebookPen,
};

const CATEGORY_CHIP_COLORS: Record<
  TemplateCategory,
  { border: string; text: string }
> = {
  science: { border: "#94dfad", text: "#8bcda1" },
  technology: { border: "#99bdfd", text: "#6da4fc" },
  mathematics: { border: "#b6a8fc", text: "#9d87fb" },
  academia: { border: "#f8baba", text: "#e69797" },
};

function TemplateCard({
  template,
  onUse,
}: {
  template: PresentationTemplate;
  onUse: (template: PresentationTemplate) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onUse(template)}
      aria-label={`Use the ${template.name} template`}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      <span
        className="relative block h-40 w-full overflow-hidden"
        style={{ background: template.coverBackground }}
      >
        {template.cover ? (
          <img
            src={template.cover}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <span className="absolute left-5 top-5 rounded-2xl border-[1.5px] border-dashed border-gray-200 px-3 py-1.5 text-[13px] text-gray-100">
          {template.categoryLabel}
        </span>
      </span>
      <span className="flex flex-col gap-2 p-5">
        <span className="text-lg font-semibold text-gray-800">
          {template.name}
        </span>
        <span className="text-sm leading-snug text-gray-500">
          {template.description}
        </span>
      </span>
    </button>
  );
}

export function TemplateSection({
  onUse,
  heading = "Start with a Template",
}: {
  onUse: (template: PresentationTemplate) => void;
  heading?: string;
}) {
  const [filter, setFilter] = useState<TemplateCategory | "all">("all");
  const visible = PRESENTATION_TEMPLATES.filter(
    (template) => filter === "all" || template.category === filter,
  );

  return (
    <section aria-labelledby="templates-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="templates-heading"
          className="text-[22px] font-bold tracking-[-0.44px] text-gray-800"
        >
          {heading}
        </h2>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Filter templates">
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={cn(
              "h-10 rounded-xl px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              filter === "all"
                ? "bg-[#652ff3] text-gray-50"
                : "border-[1.5px] border-dashed border-gray-300 text-gray-500 hover:bg-white",
            )}
          >
            All
          </button>
          {TEMPLATE_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.id];
            const colors = CATEGORY_CHIP_COLORS[category.id];
            const active = filter === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setFilter(active ? "all" : category.id)}
                aria-pressed={active}
                style={
                  active
                    ? { background: colors.text, borderColor: colors.text }
                    : { borderColor: colors.border, color: colors.text }
                }
                className={cn(
                  "flex h-10 items-center gap-2 rounded-xl border-[1.5px] border-dashed px-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                  active ? "border-solid text-white" : "hover:bg-white",
                )}
              >
                <Icon size={20} strokeWidth={1.8} />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((template) => (
          <TemplateCard key={template.id} template={template} onUse={onUse} />
        ))}
        {visible.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-gray-500">
            No templates in this category yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
