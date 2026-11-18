import type { FSItem } from "@/stores/fileSystemStore";

export interface VisibilityContext {
  stage: number;
  showHidden: boolean;
}

/**
 * Progression gate: an item does not exist for the player before its stage.
 * This cannot be bypassed by the hidden-files toggle.
 */
export function isRevealed(item: Pick<FSItem, "revealStage">, stage: number): boolean {
  return stage >= (item.revealStage ?? 1);
}

/**
 * Full visibility rule used by Finder, Desktop and the Terminal listing:
 * the progression gate first, then the dot-file toggle.
 */
export function isVisible(item: FSItem, ctx: VisibilityContext): boolean {
  if (!isRevealed(item, ctx.stage)) return false;
  if (item.hidden && !ctx.showHidden) return false;
  return true;
}
