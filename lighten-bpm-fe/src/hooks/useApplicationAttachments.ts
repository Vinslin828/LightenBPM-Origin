import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import apiCaller from "@/utils/api-caller";
import { runtimeApplicationAtom } from "@/store/atoms";
import type { Attachment } from "@/types/attachment";

const applicationAttachmentsQueryKey = (
  serialNumber: string | null,
  fieldKey?: string,
) => ["applicationAttachments", serialNumber, fieldKey];

async function fetchApplicationAttachments(
  serialNumber: string,
  fieldKey: string,
): Promise<Attachment[]> {
  const res = await apiCaller.get<Attachment[]>(
    `/applications/${serialNumber}/attachments`,
    { params: { field_key: fieldKey } },
  );
  return res.data;
}

/**
 * Fetches attachments for an existing application using its serial_number.
 * Used in review / readonly mode.
 *
 * API: GET /applications/{serial_number}/attachments?field_key={fieldKey}
 */
export function useApplicationAttachments(fieldKey: string) {
  const application = useAtomValue(runtimeApplicationAtom);

  const serialNumber = application?.serialNumber ?? null;

  const query = useQuery({
    queryKey: applicationAttachmentsQueryKey(serialNumber, fieldKey),
    queryFn: () => fetchApplicationAttachments(serialNumber!, fieldKey),
    enabled: !!serialNumber && !!fieldKey,
  });

  return {
    serialNumber,
    attachments: query.data ?? [],
    isLoading: query.isLoading,
  };
}
