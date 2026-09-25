"use client";

import type { ComponentProps } from "react";

/** Icon buttons keep an accessible name and do not show a hover tooltip. */
export function IconButton({ title: _title, children, ...props }: ComponentProps<"button">) {
  void _title;
  return <button {...props}>{children}</button>;
}
