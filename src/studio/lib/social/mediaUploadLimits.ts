/** Matches FileUpload UI hint — reject before Supabase upload. */
export const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;

export function formatUploadBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function assertVideoUploadSize(file: File): void {
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    throw new Error(
      `Video is ${formatUploadBytes(file.size)} — max ${formatUploadBytes(MAX_VIDEO_UPLOAD_BYTES)}. Compress or trim before uploading.`,
    );
  }
  if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|mpe?g)$/i.test(file.name)) {
    throw new Error('Please choose a video file (MP4, WebM, or MOV).');
  }
}

export function assertImageUploadSize(file: File): void {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error(
      `Image is ${formatUploadBytes(file.size)} — max ${formatUploadBytes(MAX_IMAGE_UPLOAD_BYTES)}.`,
    );
  }
}
