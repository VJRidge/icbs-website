export function filesFromFileList(list: FileList | Iterable<File> | null | undefined): File[] {
  if (!list) return [];
  return [...list].filter((file) => file instanceof File && file.size > 0 && file.name && !file.name.startsWith('.'));
}

async function filesFromEntry(entry: FileSystemEntry | null | undefined): Promise<File[]> {
  if (!entry) return [];
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File | null>((resolve) => {
      fileEntry.file(resolve, () => resolve(null));
    });
    return filesFromFileList(file ? [file] : []);
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children = await new Promise<FileSystemEntry[]>((resolve) => {
    const all: FileSystemEntry[] = [];
    const read = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(all);
            return;
          }
          all.push(...batch);
          read();
        },
        () => resolve(all),
      );
    };
    read();
  });
  const nested = await Promise.all(children.map((child) => filesFromEntry(child)));
  return nested.flat();
}

/** Files from a desktop drop, including a folder of images when the browser exposes entries. */
export async function collectDroppedFiles(data: DataTransfer | null | undefined): Promise<File[]> {
  if (!data) return [];
  const items = [...(data.items ?? [])];
  const entries = items
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  if (entries.length) {
    const nested = await Promise.all(entries.map((entry) => filesFromEntry(entry)));
    const files = nested.flat();
    if (files.length) return files;
  }
  return filesFromFileList(data.files);
}
