// File contents and clue strings shared by several modules.

export const LAST_ACTIVITY_LOG_CONTENT = [
  "IGC SYSTEM – SECURITY LOG",
  "[08:41] Unauthorized login detected.",
  "[08:43] Suspicious file accessed.",
  "[08:45] Camera evidence disabled.",
  "[08:47] User identity hidden.",
  "WARNING: The attacker forgot to erase everything.",
  "A backup of the evidence is stored in: /home/igc/.evidence/",
].join("\n");

/** Stages at which progression makes an item exist for the player. */
export const REVEAL_STAGES = {
  instagramAccount: 2,
  classifiedFile: 2,
  classifiedFolder: 3,
  phoneNumber: 3,
  confidentialData: 3,
  lastActivityLog: 5,
  evidenceFolder: 6,
  evidenceFiles: 6,
} as const;

export const FINAL_PHOTO_CLUE =
  "The first frame shows the technical department. Compare it with the degraded portrait and enter the name of the person in it.";

export const VAULT_CLUES = {
  date: "The day I decided to attack the IGC system was a special day for Tunisians... Eid Jala2.",
  time: "Remember the last time Tunisia won the Africa Cup of Nations. Convert that year into a time.",
  location:
    "I didn't attack the system from outside. I was sitting where I was interviewing new members (ED25). Where was I?",
} as const;
