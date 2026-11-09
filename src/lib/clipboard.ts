/** Copies text through Electron when available: the desktop app denies web clipboard permissions. */
export async function copyText(text: string): Promise<void> {
  if (typeof window !== "undefined" && window.nuztracker) {
    await window.nuztracker.copyText(text);
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    if (!document.execCommand("copy"))
      throw new Error("The clipboard is unavailable.");
  } finally {
    area.remove();
  }
}
