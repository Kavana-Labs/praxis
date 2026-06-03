/** Trigger a browser download of a text payload. */
export function downloadTextFile(
  filename: string,
  contents: string,
  mime = "application/json",
): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Open a native file picker and resolve the selected file's text contents. */
export function pickTextFile(accept = "application/json,.json"): Promise<string | null> {
  return new Promise((resolve) => {
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

/** Slugify a title into a safe filename stem. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "praxis-document"
  );
}
