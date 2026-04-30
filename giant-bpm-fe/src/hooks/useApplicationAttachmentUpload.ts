import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiCaller from "@/utils/api-caller";
import { runtimeApplicationAtom } from "@/store/atoms";
import type {
  Attachment,
  PresignUploadRequest,
  PresignUploadResponse,
} from "@/types/attachment";
import axios from "axios";

const applicationAttachmentsQueryKey = (
  serialNumber: string | null,
  fieldKey?: string,
) => ["applicationAttachments", serialNumber, fieldKey];

async function presignApplicationUpload(
  serialNumber: string,
  body: PresignUploadRequest & { approval_task_id: string },
): Promise<PresignUploadResponse> {
  const res = await apiCaller.post<PresignUploadResponse>(
    `/applications/${serialNumber}/attachments/presign-upload`,
    body,
  );
  return res.data;
}

async function uploadToS3(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: { "Content-Type": contentType },
    onUploadProgress(event) {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
}

async function confirmApplicationUpload(
  serialNumber: string,
  s3Key: string,
): Promise<Attachment> {
  const res = await apiCaller.post<Attachment>(
    `/applications/${serialNumber}/attachments`,
    { s3_key: s3Key },
  );
  return res.data;
}

async function deleteApplicationAttachment(
  serialNumber: string,
  attachmentId: number,
): Promise<void> {
  await apiCaller.delete(
    `/applications/${serialNumber}/attachments/${attachmentId}`,
  );
}

/**
 * Handles file upload and deletion for existing applications (Flow A).
 * Uses serial_number-based endpoints when a form has been submitted.
 *
 * API endpoints:
 *   POST /applications/{serial_number}/attachments/presign-upload
 *   PUT  {upload_url}  (direct to S3)
 *   POST /applications/{serial_number}/attachments  (confirm)
 *   DELETE /applications/{serial_number}/attachments/{id}
 */
export function useApplicationAttachmentUpload(fieldKey: string) {
  const application = useAtomValue(runtimeApplicationAtom);
  const serialNumber = application?.serialNumber ?? null;
  const approvalTaskId = application?.approvalId ?? null;
  const queryClient = useQueryClient();

  const invalidateAttachments = useCallback(() => {
    if (!serialNumber) return;
    queryClient.invalidateQueries({
      queryKey: applicationAttachmentsQueryKey(serialNumber, fieldKey),
    });
  }, [serialNumber, fieldKey, queryClient]);

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      if (!serialNumber || !approvalTaskId) {
        throw new Error(
          "No serial number or approval task ID available for upload",
        );
      }

      const presign = await presignApplicationUpload(serialNumber, {
        approval_task_id: approvalTaskId,
        field_key: fieldKey,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
        file_size: file.size,
      });

      await uploadToS3(
        presign.upload_url,
        file,
        file.type || "application/octet-stream",
        onProgress,
      );

      const attachment = await confirmApplicationUpload(
        serialNumber,
        presign.s3_key,
      );
      return attachment;
    },
    onSuccess: () => {
      invalidateAttachments();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      if (!serialNumber) {
        throw new Error("No serial number available for delete");
      }
      await deleteApplicationAttachment(serialNumber, attachmentId);
    },
    onSuccess: () => {
      invalidateAttachments();
    },
  });

  return {
    serialNumber,
    approvalTaskId,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteAttachment: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
