import { useCallback, useRef } from "react";
import { useAtom } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiCaller from "@/utils/api-caller";
import { draftIdAtom } from "@/store/atoms";
import type {
  Attachment,
  PresignUploadRequest,
  PresignUploadResponse,
  DraftInitResponse,
} from "@/types/attachment";
import axios from "axios";

const draftAttachmentsQueryKey = (draftId: string | null) => [
  "draftAttachments",
  draftId,
];

async function initDraft(): Promise<DraftInitResponse> {
  const res = await apiCaller.post<DraftInitResponse>(
    "/attachments/drafts/init",
  );
  return res.data;
}

async function presignDraftUpload(
  draftId: string,
  body: PresignUploadRequest,
): Promise<PresignUploadResponse> {
  const res = await apiCaller.post<PresignUploadResponse>(
    `/attachments/drafts/${draftId}/presign-upload`,
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

async function confirmDraftUpload(
  draftId: string,
  s3Key: string,
): Promise<Attachment> {
  const res = await apiCaller.post<Attachment>(
    `/attachments/drafts/${draftId}/confirm`,
    { s3_key: s3Key },
  );
  return res.data;
}

async function fetchDraftAttachments(draftId: string): Promise<Attachment[]> {
  const res = await apiCaller.get<Attachment[]>(
    `/attachments/drafts/${draftId}`,
  );
  return res.data;
}

async function deleteDraftAttachment(
  draftId: string,
  attachmentId: number,
): Promise<void> {
  await apiCaller.delete(`/attachments/drafts/${draftId}/${attachmentId}`);
}

export function useAttachmentDraft(fieldKey: string) {
  const [draftId, setDraftId] = useAtom(draftIdAtom);
  const queryClient = useQueryClient();
  const initializingRef = useRef<Promise<string> | null>(null);

  const ensureDraftId = useCallback(async (): Promise<string> => {
    if (draftId) return draftId;

    // Prevent duplicate init calls
    if (initializingRef.current) return initializingRef.current;

    initializingRef.current = initDraft()
      .then((res) => {
        setDraftId(res.draft_id);
        initializingRef.current = null;
        return res.draft_id;
      })
      .catch((err) => {
        initializingRef.current = null;
        throw err;
      });

    return initializingRef.current;
  }, [draftId, setDraftId]);

  const attachmentsQuery = useQuery({
    queryKey: draftAttachmentsQueryKey(draftId),
    queryFn: () => fetchDraftAttachments(draftId!),
    enabled: !!draftId,
    select: (data) => data.filter((a) => a.field_key === fieldKey),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      const currentDraftId = await ensureDraftId();

      const presign = await presignDraftUpload(currentDraftId, {
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

      const attachment = await confirmDraftUpload(
        currentDraftId,
        presign.s3_key,
      );
      return attachment;
    },
    onSuccess: () => {
      if (draftId) {
        queryClient.invalidateQueries({
          queryKey: draftAttachmentsQueryKey(draftId),
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      if (!draftId) throw new Error("No draft initialized");
      await deleteDraftAttachment(draftId, attachmentId);
    },
    onSuccess: () => {
      if (draftId) {
        queryClient.invalidateQueries({
          queryKey: draftAttachmentsQueryKey(draftId),
        });
      }
    },
  });

  return {
    draftId,
    attachments: attachmentsQuery.data ?? [],
    isLoadingAttachments: attachmentsQuery.isLoading,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    deleteAttachment: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
