import { useCTFStore } from "@/stores/ctfStore";
import { useFileSystemStore } from "@/stores/fileSystemStore";
import { useWindowStore } from "@/stores/windowStore";
import type { FSItem } from "@/stores/fileSystemStore";
import { LAST_ACTIVITY_LOG_CONTENT, REVEAL_STAGES } from "@/lib/ctf-content";

export interface VerifyResult {
  ok: boolean;
  token?: string;
  field?: string;
  error?: string;
}

/**
 * Single place where a solved challenge updates the run. Every surface that can
 * unlock a file (Finder, Desktop icons, Terminal, Photos) goes through here so
 * the stage machine cannot drift.
 */
export function applyChallengeSuccess(item: FSItem, data?: VerifyResult): void {
  const ctf = useCTFStore.getState();
  ctf.unlockFile(item.id);

  switch (item.challenge) {
    case "classified_file":
      ctf.advanceStage(3);
      break;

    case "confidential_data":
      ctf.advanceStage(4);
      // The vault becomes reachable as soon as the operator data is open.
      useWindowStore.getState().openWindow("vault", "Password Vault", "vault");
      break;

    case "final_photo":
      if (data?.token) ctf.setEvidenceToken(data.token);
      ctf.setEvidence3Unlocked();
      ctf.setCompleted();
      ctf.advanceStage(7);
      break;

    default:
      break;
  }
}

/**
 * Repairs older localStorage trees: the log must exist under its canonical id,
 * in the real Logs folder, with its documented content and stage-5 visibility,
 * before the vault can reveal it. Idempotent: safe to call on every vault solve.
 */
export function ensureLastActivityLog(): void {
  const items = useFileSystemStore.getState().items;

  // Resolve the Logs folder by id, then by path/name as a fallback.
  let logsFolderId: string | undefined = items["logs-folder"]?.id;
  if (!logsFolderId || items[logsFolderId]?.type !== "folder") {
    const byName = Object.values(items).find(
      (i) => i.type === "folder" && i.name.toLowerCase() === "logs"
    );
    logsFolderId = byName?.id;
  }
  if (!logsFolderId || !items[logsFolderId]) {
    console.warn("[ctf] Logs folder not found in the VFS; last_activity.log was not created.");
    return;
  }

  // Canonical id first, then by name for stray copies from older versions of
  // this helper (which used createFile and therefore a random `file-...` id).
  const canonical = items["last-activity-log"];
  const byName = canonical
    ? undefined
    : Object.values(items).find((i) => i.name.toLowerCase() === "last_activity.log");

  const stamp = new Date().toISOString();
  const expected: FSItem = {
    id: "last-activity-log",
    name: "last_activity.log",
    type: "text",
    parentId: logsFolderId,
    content: LAST_ACTIVITY_LOG_CONTENT,
    size: `${new Blob([LAST_ACTIVITY_LOG_CONTENT]).size} B`,
    revealStage: REVEAL_STAGES.lastActivityLog,
    hidden: false,
    createdAt: canonical?.createdAt ?? byName?.createdAt ?? stamp,
    updatedAt: stamp,
  };

  const isHealthy =
    !!canonical &&
    canonical.parentId === logsFolderId &&
    canonical.content === LAST_ACTIVITY_LOG_CONTENT &&
    canonical.hidden !== true &&
    canonical.revealStage === REVEAL_STAGES.lastActivityLog;
  const hasStrayCopy = Object.values(items).some(
    (i) => i.id !== "last-activity-log" && i.name.toLowerCase() === "last_activity.log"
  );

  if (isHealthy && !hasStrayCopy) return;

  useFileSystemStore.setState((state) => {
    const nextItems: Record<string, FSItem> = {};
    for (const [id, item] of Object.entries(state.items)) {
      // Remove random-id duplicates so cat/open can only target the canonical id.
      if (id !== "last-activity-log" && item.name.toLowerCase() === "last_activity.log") continue;
      nextItems[id] = id === "last-activity-log" ? expected : item;
    }
    if (!nextItems["last-activity-log"]) nextItems["last-activity-log"] = expected;
    return { items: nextItems };
  });
}
