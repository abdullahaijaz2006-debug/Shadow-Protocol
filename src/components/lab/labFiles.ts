// Browser-side file helpers for the Lab (no extra dependencies): a download for saving, and the
// system file picker (an <input type="file">) for loading. Not unit-tested: they only touch the DOM.

/** Offers `text` as a file download (WebView2 shows its download prompt / saves to Downloads). */
export function downloadTextFile(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the download a moment to start before releasing the data.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Reads the file chosen in an <input type="file">, as text. */
export function readChosenFile(input: HTMLInputElement): Promise<{ name: string; text: string } | null> {
  const file = input.files?.[0];
  input.value = ""; // allow choosing the same file again later
  if (!file) return Promise.resolve(null);
  return file.text().then((text) => ({ name: file.name, text }));
}
