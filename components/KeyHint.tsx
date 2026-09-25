import { ArrowBendDownLeft, ArrowDown, ArrowUp, Command, MagnifyingGlass, MouseSimple, X } from "@phosphor-icons/react";

const ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  enter: ArrowBendDownLeft,
  esc: X,
  slash: MagnifyingGlass,
  meta: Command,
  mouse: MouseSimple,
} as const;

/** A key shown as an icon when one exists for that key. */
export function KeyHint({ name, label }: { name: keyof typeof ICONS; label: string }) {
  const Icon = ICONS[name];
  return (
    <kbd className="key-hint" aria-label={label}>
      <Icon weight="regular" aria-hidden="true" />
    </kbd>
  );
}
