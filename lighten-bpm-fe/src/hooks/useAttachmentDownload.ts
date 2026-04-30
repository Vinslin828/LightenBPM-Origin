import { useRef } from "react";
import { useAtomValue } from "jotai";
import { useMutation } from "@tanstack/react-query";
import apiCaller from "@/utils/api-caller";
import { runtimeApplicationAtom } from "@/store/atoms";

interface DownloadUrlResponse {
  download_url: string;
  file_name: string;
  expires_in: number;
}

/**
 * Fetch a presigned download URL for a committed attachment.
 *
 * Uses:
 *   GET /applications/{serial_number}/attachments/{attachment_id}/download
 *
 * Returns a short-lived presigned S3 URL. Open it in a new tab to
 * trigger the browser's file download.
 */
async function fetchDownloadUrl(
  serialNumber: string,
  attachmentId: number,
): Promise<DownloadUrlResponse> {
  const res = await apiCaller.get<DownloadUrlResponse>(
    `/applications/${serialNumber}/attachments/${attachmentId}/download`,
  );
  return res.data;
}

export function useAttachmentDownload() {
  const application = useAtomValue(runtimeApplicationAtom);
  const serialNumber = application?.serialNumber ?? null;
  const preOpenedTabRef = useRef<Window | null>(null);

  const downloadMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      if (!serialNumber) {
        throw new Error("No serial number available for download");
      }
      return fetchDownloadUrl(serialNumber, attachmentId);
    },
    onSuccess: async ({ download_url, file_name }) => {
      const newTab = preOpenedTabRef.current;
      preOpenedTabRef.current = null;

      // TODO: Once backend supports Content-Disposition: inline on presigned URLs,
      // replace the blob approach with a simple window.open(download_url) to avoid
      // double-fetching, memory overhead, and streaming delays.

      // Determine if file can be previewed in browser
      const ext = file_name.toLowerCase().split(".").pop() ?? "";
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
      };
      const mimeType = mimeMap[ext];

      if (mimeType && newTab) {
        // Previewable: open in new tab only, no download
        const response = await fetch(download_url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(
          new Blob([blob], { type: mimeType }),
        );
        newTab.location.replace(blobUrl);

        const timer = setInterval(() => {
          if (newTab.closed) {
            URL.revokeObjectURL(blobUrl);
            clearInterval(timer);
          }
        }, 1000);
      } else {
        // Non-previewable: trigger file download
        newTab?.close();
        const anchor = document.createElement("a");
        anchor.href = download_url;
        anchor.download = file_name;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
    },
  });

  const previewableExts = new Set(["pdf", "png", "jpg", "jpeg"]);

  /** Call this from onClick — opens a blank tab synchronously only for previewable files */
  const download = (attachmentId: number, fileName?: string) => {
    const ext = fileName?.toLowerCase().split(".").pop() ?? "";
    if (previewableExts.has(ext)) {
      preOpenedTabRef.current = window.open("", "_blank");
    }
    return downloadMutation.mutateAsync(attachmentId);
  };

  return {
    /** true if a serial_number is available (i.e. we can download) */
    canDownload: !!serialNumber,
    download,
    isDownloading: downloadMutation.isPending,
  };
}
