export interface Attachment {
  id: number;
  field_key: string;
  file_name: string;
  file_size: number;
  content_type: string;
  status: "PENDING" | "UPLOADED";
  serial_number: string | null;
  draft_id: string | null;
  remark: string | null;
  uploaded_by: { id: number; name: string };
  created_at: string;
  node_description: string | null;
  approval_task_id: string;
}

export interface PresignUploadRequest {
  field_key: string;
  file_name: string;
  content_type: string;
  file_size: number;
}

export interface PresignUploadResponse {
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

export interface ConfirmUploadRequest {
  s3_key: string;
  remark?: string;
}

export interface DraftInitResponse {
  draft_id: string;
}
