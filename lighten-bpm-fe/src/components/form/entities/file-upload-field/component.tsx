import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { RefObject } from "react";
import { Label } from "@/components/ui/label";
import { ValidationError, formatError } from "@/components/ui/validation-error";
import { createEntityComponent } from "@coltorapps/builder-react";
import { fileUploadFieldEntity } from "./definition";
import { useRefWithErrorFocus } from "@/utils/error-focus";
import { CloseIcon, FileIcon, FileDownloadIcon } from "@/components/icons";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAttachmentDraft } from "@/hooks/useAttachmentDraft";
import { useAttachmentDownload } from "@/hooks/useAttachmentDownload";
import { useApplicationAttachments } from "@/hooks/useApplicationAttachments";
import { useApplicationAttachmentUpload } from "@/hooks/useApplicationAttachmentUpload";
import type { Attachment } from "@/types/attachment";
import { useEntityLabel } from "@/hooks/useEntityLabel";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_VISIBLE_FILES = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + " " + sizes[i];
};

// ─── Shared sub-elements ──────────────────────────────────────────────────────

const FileIconCircle = () => (
  <div className="w-[40px] h-[40px] rounded-full bg-gray-2 flex items-center justify-center shrink-0">
    <FileIcon className="text-primary-text" />
  </div>
);

const DownloadButton = () => (
  <div className="shrink-0 flex items-center justify-center">
    <FileDownloadIcon className="w-5 h-5 text-lighten-blue" />
  </div>
);

const DotSeparator = () => (
  <span className="inline-block w-1 h-1 rounded-full bg-[#CED4DA] mx-[4px] align-middle" />
);

// ─── Dropzone ─────────────────────────────────────────────────────────────────

interface DropzoneProps {
  inputId: string;
  inputName: string;
  enableMultiple?: boolean;
  isInteractive: boolean;
  supportedFormats?: string[];
  constraints?: string;
  buttonText?: string;
  required?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputKey?: string | number;
  onFilesSelected: (files: File[]) => void;
  onClear?: () => void;
}

const Dropzone = ({
  inputId,
  inputName,
  enableMultiple = false,
  isInteractive,
  supportedFormats,
  constraints,
  buttonText = "Browse",
  required = false,
  inputRef,
  inputKey,
  onFilesSelected,
  onClear,
}: DropzoneProps) => {
  const acceptValue =
    supportedFormats && supportedFormats.length > 0
      ? supportedFormats.map((format) => `.${format.toLowerCase()}`).join(",")
      : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      let incoming = Array.from(files);

      if (supportedFormats && supportedFormats.length > 0) {
        const allowedExts = supportedFormats.map((f) => f.toLowerCase());
        incoming = incoming.filter((file) => {
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          return allowedExts.includes(ext);
        });
      }

      if (incoming.length === 0) {
        if (inputRef?.current) inputRef.current.value = "";
        return;
      }

      onFilesSelected(incoming);
    } else if (!enableMultiple) {
      onClear?.();
    }

    if (inputRef?.current) {
      inputRef.current.value = "";
    } else if (e.target) {
      e.target.value = "";
    }
  };

  return (
    <label
      htmlFor={isInteractive ? inputId : undefined}
      className={`relative flex flex-col items-center justify-center p-8 bg-gray-2 rounded-lg w-full min-h-[160px] ${
        isInteractive
          ? "cursor-pointer hover:bg-slate-200 transition-colors"
          : "opacity-50 pointer-events-none"
      }`}
    >
      <input
        ref={inputRef}
        id={inputId}
        name={inputName}
        type="file"
        multiple={enableMultiple}
        disabled={!isInteractive}
        key={inputKey}
        accept={acceptValue}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleChange}
        required={required}
      />
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <p className="font-medium text-dark text-[16px] leading-[24px]">
          Chose a file or drag &amp; drop it here.
        </p>
        {constraints && (
          <p className="text-[14px] text-primary-text leading-[20px] mb-2">
            {constraints}.
          </p>
        )}
        <span className="inline-flex h-[36px] items-center justify-center rounded-[6px] border border-stroke bg-white px-[16px] text-[14px] font-medium text-dark-3 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lighten-blue disabled:pointer-events-none disabled:opacity-50">
          {buttonText}
        </span>
      </div>
    </label>
  );
};

// ─── FileInfoCard ─────────────────────────────────────────────────────────────

interface CommittedFileInfoCardProps {
  variant: "committed";
  fileName: string;
  fileSize: number;
  fileError?: string;
  canDownload?: boolean;
  isDisabled?: boolean;
  isDownloading?: boolean;
  isInteractive?: boolean;
  onDownload?: () => void;
  onRemove?: () => void;
}

interface ReviewFileInfoCardProps {
  variant: "review";
  fileName: string;
  createdAt: string | Date;
  nodeName: string;
  uploadedBy: string;
  canDownload?: boolean;
  isDownloading?: boolean;
  canRemove?: boolean;
  onDownload?: () => void;
  onRemove?: () => void;
}

interface UploadingFileInfoCardProps {
  variant: "uploading";
  fileName: string;
  fileSize: number;
  progress: number;
  status: "uploading" | "error";
  error?: string;
  onRemove?: () => void;
}

type FileInfoCardProps =
  | CommittedFileInfoCardProps
  | ReviewFileInfoCardProps
  | UploadingFileInfoCardProps;

const FileInfoCard = (props: FileInfoCardProps) => {
  if (props.variant === "uploading") {
    return <UploadingCard {...props} />;
  }

  if (props.variant === "review") {
    return <ReviewCard {...props} />;
  }

  return <CommittedCard {...props} />;
};

const CommittedCard = ({
  fileName,
  fileSize,
  fileError,
  canDownload = false,
  isDisabled = false,
  isDownloading = false,
  isInteractive = false,
  onDownload,
  onRemove,
}: CommittedFileInfoCardProps) => {
  const isClickable = canDownload && !isDisabled;

  const handleClick = () => {
    if (isClickable && !isDownloading) {
      onDownload?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && !isDownloading && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onDownload?.();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove?.();
  };

  return (
    <div
      className={`flex items-start p-4 border border-stroke rounded-[8px] bg-white gap-4 relative ${
        isClickable ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""
      } ${isDownloading ? "opacity-50 pointer-events-none" : ""}`}
      onClick={handleClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={isClickable ? `Download ${fileName}` : undefined}
    >
      <FileIconCircle />

      <div className="flex-1 min-w-0 pr-6 mt-0.5">
        <p className="text-[14px] font-medium text-dark truncate mb-1">
          {fileName}
        </p>

        {fileError ? (
          <span className="text-[13px] text-red-600 font-body-small-medium">
            {fileError}
          </span>
        ) : (
          <span className="text-[13px] text-green-600 font-body-small-medium">
            {formatBytes(fileSize)} &mdash; Upload completed!
          </span>
        )}
      </div>

      {isClickable && <DownloadButton />}

      {isInteractive && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Remove file"
        >
          <CloseIcon className="text-primary-text" />
        </button>
      )}
    </div>
  );
};

const ReviewCard = ({
  fileName,
  createdAt,
  nodeName,
  uploadedBy,
  canDownload = false,
  isDownloading = false,
  canRemove = false,
  onDownload,
  onRemove,
}: ReviewFileInfoCardProps) => {
  const handleClick = () => {
    if (canDownload && !isDownloading) {
      onDownload?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (canDownload && !isDownloading && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onDownload?.();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove?.();
  };

  const formattedDate = (() => {
    const d = new Date(createdAt);
    const date = d.toLocaleDateString("en-CA");
    const time = d.toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${date} ${time}`;
  })();

  return (
    <div
      className={`flex items-center p-4 border border-stroke rounded-[8px] bg-white gap-4 relative ${
        canDownload ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""
      } ${isDownloading ? "opacity-50 pointer-events-none" : ""}`}
      onClick={handleClick}
      role={canDownload ? "button" : undefined}
      tabIndex={canDownload ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={canDownload ? `Download ${fileName}` : undefined}
    >
      <FileIconCircle />

      <div className="flex-1 min-w-0 text-left pr-6">
        <p className="font-body-medium-medium text-dark truncate">{fileName}</p>
        <span className="text-primary-text font-body-small-medium">
          {formattedDate}
          <DotSeparator />
          {nodeName}
          <DotSeparator />
          {uploadedBy}
        </span>
      </div>

      {canDownload && !canRemove && <DownloadButton />}

      {canRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Remove file"
        >
          <CloseIcon className="text-primary-text" />
        </button>
      )}
    </div>
  );
};

const UploadingCard = ({
  fileName,
  fileSize,
  progress,
  status,
  error,
  onRemove,
}: UploadingFileInfoCardProps) => {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    onRemove?.();
  };

  return (
    <div className="flex items-start p-4 border border-stroke rounded-[8px] bg-white gap-4 relative">
      <FileIconCircle />

      <div className="flex-1 min-w-0 pr-6 mt-0.5">
        <p className="text-[14px] font-medium text-dark truncate mb-1">
          {fileName}
        </p>

        {status === "uploading" && (
          <>
            <div className="flex items-center justify-between text-[13px] mb-2">
              <span className="text-primary-text">
                {formatBytes(fileSize * (progress / 100))} of{" "}
                {formatBytes(fileSize)}
              </span>
              <span className="text-lighten-blue font-medium">
                Uploading...
              </span>
            </div>
            <div className="w-full bg-gray-3 rounded-full h-1.5">
              <div
                className="bg-lighten-blue h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {status === "error" && (
          <span className="text-[13px] text-red-600 font-body-small-medium">
            Upload failed: {error ?? "Unknown error"}
          </span>
        )}
      </div>

      {status === "error" && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Remove failed upload"
        >
          <CloseIcon className="text-primary-text" />
        </button>
      )}
    </div>
  );
};

// ─── Local UI-only state type ─────────────────────────────────────────────────

interface FileEntry {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  attachment?: Attachment;
}

type PendingFileEntry = FileEntry & { status: "uploading" | "error" };

// ─── Main Component ──────────────────────────────────────────────────────────

export const FileUploadFieldEntity = createEntityComponent(
  fileUploadFieldEntity,
  function FileUploadFieldEntity(props) {
    const { id: entityId, error, value, attributes } = props.entity;
    const {
      supportedFormats,
      fileSize,
      buttonText = "Browse",
      label,
      name,
      required,
      enableMultiple,
      readonly,
    } = attributes;

    const isReadonly = Boolean(readonly);
    const isDisabled = Boolean(attributes.disabled);
    const fieldKey =
      typeof name === "string" && name.trim() ? name.trim() : entityId;
    const translatedLabel = useEntityLabel(
      entityId,
      label.value || name,
      fieldKey,
    );

    // ── Form value: attachment_id(s) ────────────────────────────────────────
    const idList: number[] = (() => {
      if (!value) return [];
      if (typeof value === "string") {
        return value
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n) && n > 0);
      }
      return [];
    })();
    const idListRef = useRef<number[]>(idList);
    idListRef.current = idList;

    const id = useId();
    const inputRef = useRefWithErrorFocus<HTMLInputElement>(error);

    // ── Local upload-progress state ─────────────────────────────────────────
    const [fileEntries, setFileEntries] = useState<Map<string, FileEntry>>(
      new Map(),
    );

    // ── Hooks ───────────────────────────────────────────────────────────────
    // Draft mode: upload/delete via draft endpoints
    const {
      upload: draftUpload,
      deleteAttachment: draftDeleteAttachment,
      attachments: draftAttachments,
    } = useAttachmentDraft(fieldKey);

    const { canDownload, download, isDownloading } = useAttachmentDownload();

    // Application mode: fetch existing attachments by serial_number
    const {
      serialNumber,
      attachments: applicationAttachments,
      isLoading: isLoadingAppAttachments,
    } = useApplicationAttachments(fieldKey);

    // Application mode: upload/delete via serial_number endpoints (Flow A)
    const {
      upload: applicationUpload,
      deleteAttachment: applicationDeleteAttachment,
      approvalTaskId,
    } = useApplicationAttachmentUpload(fieldKey);

    // ── Review mode: serialNumber exists → form is submitted, under review
    const isReviewMode = !!serialNumber;

    // ── Check if this user can edit attachments in review mode
    // Only allow editing when the URL's applicationId matches the approvalTaskId
    const { applicationId: urlApplicationId } = useParams<{
      applicationId: string;
    }>();
    const isReviewEditable =
      isReviewMode && !!approvalTaskId && approvalTaskId === urlApplicationId;

    // Route upload/delete to the correct hook based on mode
    const upload = isReviewMode ? applicationUpload : draftUpload;
    const deleteAttachment = isReviewMode
      ? applicationDeleteAttachment
      : draftDeleteAttachment;

    // ── Resolve display info for an attachment_id ───────────────────────────
    const resolveAttachment = useCallback(
      (attachmentId: number): Attachment | undefined => {
        // 1. Local session uploads
        for (const entry of fileEntries.values()) {
          if (entry.attachment?.id === attachmentId) return entry.attachment;
        }
        // 2. Application query (review mode)
        if (isReviewMode) {
          return applicationAttachments.find(
            (a: Attachment) => a.id === attachmentId,
          );
        }
        // 3. Draft query
        return draftAttachments.find((a: Attachment) => a.id === attachmentId);
      },
      [fileEntries, draftAttachments, applicationAttachments, isReviewMode],
    );

    // ── Error helpers ───────────────────────────────────────────────────────
    const formattedError = error
      ? (formatError(value, error) as Record<string, any>)
      : undefined;

    const globalError = (() => {
      if (!formattedError) return undefined;
      if (formattedError._errors?.[0]) {
        if (enableMultiple || idList.length === 0) {
          return formattedError._errors[0];
        }
      }
      return undefined;
    })();

    const getFileError = (index: number) => {
      if (!formattedError) return undefined;
      if (!enableMultiple) return formattedError._errors?.[0];
      return formattedError[index]?._errors?.[0];
    };

    // ── Upload logic ────────────────────────────────────────────────────────
    const uploadFile = useCallback(
      async (file: File) => {
        const key = file.name;

        if (fileSize && file.size > fileSize * 1024 * 1024) {
          setFileEntries((prev) => {
            const next = new Map(prev);
            next.set(key, {
              file,
              progress: 0,
              status: "error",
              error: `File size exceeds ${fileSize}MB limit`,
            });
            return next;
          });
          return;
        }

        setFileEntries((prev) => {
          const next = new Map(prev);
          next.set(key, { file, progress: 0, status: "uploading" });
          return next;
        });

        try {
          const attachment = await upload({
            file,
            onProgress: (percent) => {
              setFileEntries((prev) => {
                const next = new Map(prev);
                const entry = next.get(key);
                if (entry) next.set(key, { ...entry, progress: percent });
                return next;
              });
            },
          });

          setFileEntries((prev) => {
            const next = new Map(prev);
            next.set(key, {
              file,
              progress: 100,
              status: "completed",
              attachment,
            });
            return next;
          });

          // Store attachment_id in form value (prepend so newest is first)
          if (enableMultiple) {
            props.setValue([attachment.id, ...idListRef.current].join(","));
          } else {
            props.setValue(String(attachment.id));
          }
        } catch (err) {
          setFileEntries((prev) => {
            const next = new Map(prev);
            next.set(key, {
              file,
              progress: 0,
              status: "error",
              error: err instanceof Error ? err.message : "Upload failed",
            });
            return next;
          });
        }
      },
      [upload, enableMultiple, props.setValue, fileSize],
    );

    const handleFilesSelected = useCallback(
      (incomingFiles: File[]) => {
        if (enableMultiple) {
          const existingNames = new Set(fileEntries.keys());
          const uniqueNewFiles = incomingFiles.filter(
            (f) => !existingNames.has(f.name),
          );
          uniqueNewFiles.forEach((file) => uploadFile(file));
        } else {
          const previousId = idListRef.current[0];
          if (previousId) {
            deleteAttachment(previousId).catch(() => {});
          }
          props.setValue(undefined);
          setFileEntries(new Map());
          uploadFile(incomingFiles[0]);
        }
      },
      [enableMultiple, fileEntries, props.setValue, uploadFile],
    );

    const handleRemoveFile = useCallback(
      async (attachmentId: number, fileName: string) => {
        try {
          await deleteAttachment(attachmentId);
        } catch {
          // Continue with local removal even if API delete fails
        }

        setFileEntries((prev) => {
          const next = new Map(prev);
          next.delete(fileName);
          return next;
        });

        if (enableMultiple) {
          const newIds = idListRef.current.filter((i) => i !== attachmentId);
          props.setValue(newIds.length > 0 ? newIds.join(",") : undefined);
        } else {
          props.setValue(undefined);
        }
      },
      [enableMultiple, deleteAttachment, props.setValue],
    );

    // ── Derived lists ───────────────────────────────────────────────────────
    const pendingEntries: PendingFileEntry[] = [];
    fileEntries.forEach((entry) => {
      if (entry.status === "uploading" || entry.status === "error") {
        pendingEntries.unshift(entry as PendingFileEntry);
      }
    });

    const formatsString = supportedFormats?.join(", ");
    const sizeString = fileSize ? `up to ${fileSize}MB` : "";
    const constraints = [
      formatsString ? `${formatsString} formats` : "",
      sizeString,
    ]
      .filter(Boolean)
      .join(", ");

    const totalCount = idList.length + pendingEntries.length;
    const isInteractive = !isReadonly && !isDisabled;

    // ── "View all files" modal state ────────────────────────────────────
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);

    const handleOpenFilesModal = useCallback(() => {
      setIsFilesModalOpen(true);
    }, []);

    const handleCloseFilesModal = useCallback(() => {
      setIsFilesModalOpen(false);
    }, []);

    // In review mode: resolve attachments from server data
    // When isReviewMode (serialNumber exists), show application attachments
    // When isReadonly but no serialNumber, resolve from local/draft data
    const reviewAttachments = isReviewMode
      ? applicationAttachments
      : isReadonly
        ? idList
            .map((aid) => resolveAttachment(aid))
            .filter((a): a is Attachment => !!a)
        : [];

    // ── Visible vs full lists (truncate to MAX_VISIBLE_FILES) ───────────
    const visibleIdList = useMemo(
      () =>
        idList.length > MAX_VISIBLE_FILES
          ? idList.slice(0, MAX_VISIBLE_FILES)
          : idList,
      [idList],
    );

    const visibleReviewAttachments = useMemo(
      () =>
        reviewAttachments.length > MAX_VISIBLE_FILES
          ? reviewAttachments.slice(0, MAX_VISIBLE_FILES)
          : reviewAttachments,
      [reviewAttachments],
    );

    const hasMoreCommittedFiles = idList.length > MAX_VISIBLE_FILES;
    const hasMoreReviewFiles = reviewAttachments.length > MAX_VISIBLE_FILES;

    const modalTitle = translatedLabel || "Files";

    const handleClear = useCallback(() => {
      props.setValue(undefined);
    }, [props.setValue]);

    // ═══════════════════════════════════════════════════════════════════════
    // UNIFIED RENDER
    // ═══════════════════════════════════════════════════════════════════════
    return (
      <div className="flex flex-col gap-2">
        <Label
          htmlFor={isInteractive ? id : undefined}
          aria-required={required}
        >
          {translatedLabel}
        </Label>

        {isLoadingAppAttachments && isReviewMode ? (
          <p className="text-[14px] text-primary-text">Loading...</p>
        ) : (
          <>
            {/* Drop zone — shown unless purely readonly (no serialNumber) */}
            {(!isReadonly || isReviewMode) && (
              <Dropzone
                inputId={id}
                inputName={entityId}
                enableMultiple={enableMultiple}
                isInteractive={
                  isReviewEditable ? !isDisabled && !isReadonly : isInteractive
                }
                supportedFormats={supportedFormats}
                constraints={constraints}
                buttonText={buttonText}
                required={required && idList.length === 0}
                inputRef={inputRef}
                inputKey={totalCount > 0 ? totalCount : "empty"}
                onFilesSelected={handleFilesSelected}
                onClear={handleClear}
              />
            )}
          </>
        )}

        {/* ── In-flight upload cards (not yet committed to form value) ────── */}
        {(!isReadonly || isReviewEditable) && pendingEntries.length > 0 && (
          <div className="flex flex-col gap-3 mt-1">
            {pendingEntries.map((entry) => (
              <FileInfoCard
                key={entry.file.name}
                variant="uploading"
                fileName={entry.file.name}
                fileSize={entry.file.size}
                progress={entry.progress}
                status={entry.status}
                error={entry.error}
                onRemove={() => {
                  setFileEntries((prev) => {
                    const next = new Map(prev);
                    next.delete(entry.file.name);
                    return next;
                  });
                }}
              />
            ))}
          </div>
        )}

        {/* ── Review mode: server attachments with download ──────────────── */}
        {(isReadonly || isReviewMode) && reviewAttachments.length > 0 && (
          <div className="flex flex-col gap-3 mt-1">
            {visibleReviewAttachments.map((attachment) => {
              const canRemoveAttachment =
                isReviewMode &&
                !!urlApplicationId &&
                attachment.approval_task_id === urlApplicationId;

              return (
                <FileInfoCard
                  key={attachment.id}
                  variant="review"
                  fileName={attachment.file_name}
                  createdAt={attachment.created_at}
                  nodeName={
                    attachment.node_description ||
                    attachment.approval_task_id ||
                    "Start point"
                  }
                  uploadedBy={attachment.uploaded_by.name || "Unknown User"}
                  canDownload={canDownload}
                  isDownloading={isDownloading}
                  canRemove={canRemoveAttachment}
                  onDownload={() =>
                    download(attachment.id, attachment.file_name)
                  }
                  onRemove={
                    canRemoveAttachment
                      ? () =>
                          handleRemoveFile(attachment.id, attachment.file_name)
                      : undefined
                  }
                />
              );
            })}

            {hasMoreReviewFiles && (
              <button
                type="button"
                onClick={handleOpenFilesModal}
                className="inline-flex items-center justify-center h-[24px] bg-white px-[16px] text-[14px] font-medium text-lighten-blue cursor-pointer"
                aria-label={`View all ${reviewAttachments.length} files`}
                tabIndex={0}
              >
                View all files ({reviewAttachments.length})
              </button>
            )}
          </div>
        )}

        {/* ── Committed file cards (attachment_id in form value) ──────────── */}
        {!isReadonly && !isReviewMode && idList.length > 0 && (
          <div className="flex flex-col gap-3 mt-1">
            {visibleIdList.map((attachmentId, index) => {
              const att = resolveAttachment(attachmentId);
              const fileName = att?.file_name ?? `Attachment #${attachmentId}`;
              const size = att?.file_size ?? 0;
              const fileError = getFileError(index);

              return (
                <FileInfoCard
                  key={attachmentId}
                  variant="committed"
                  fileName={fileName}
                  fileSize={size}
                  fileError={fileError}
                  canDownload={canDownload}
                  isDisabled={isDisabled}
                  isDownloading={isDownloading}
                  isInteractive={isInteractive}
                  onDownload={() => download(attachmentId, fileName)}
                  onRemove={() => handleRemoveFile(attachmentId, fileName)}
                />
              );
            })}

            {hasMoreCommittedFiles && (
              <button
                type="button"
                onClick={handleOpenFilesModal}
                className="inline-flex items-center justify-center h-[36px] rounded-[6px] border border-stroke bg-white px-[16px] text-[14px] font-medium text-primary-text shadow-sm hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lighten-blue"
                aria-label={`View all ${idList.length} files`}
                tabIndex={0}
              >
                View all files ({idList.length})
              </button>
            )}
          </div>
        )}

        {idList.length === 0 &&
          pendingEntries.length === 0 &&
          !globalError &&
          required &&
          !!error && (
            <ValidationError>{"This field is required"}</ValidationError>
          )}

        {/* ── View all files modal ─────────────────────────────────────────── */}
        <Modal
          isOpen={isFilesModalOpen}
          close={handleCloseFilesModal}
          size="lg"
          closeOnOverlayClick
          closeOnEscape
        >
          <div className="flex flex-col gap-[20px] items-center p-[30px]">
            <h2 className="font-semibold text-[24px] leading-[30px] text-dark">
              {modalTitle}
            </h2>

            <div className="flex flex-col gap-[20px] w-full flex-1 min-h-0">
              {isLoadingAppAttachments && isReviewMode ? (
                <p className="text-[14px] text-primary-text">Loading...</p>
              ) : (
                (!isReadonly || isReviewMode) && (
                  <Dropzone
                    inputId={`${id}-modal`}
                    inputName={`${entityId}-modal`}
                    enableMultiple={enableMultiple}
                    isInteractive={
                      isReviewEditable
                        ? !isDisabled && !isReadonly
                        : isInteractive
                    }
                    supportedFormats={supportedFormats}
                    constraints={constraints}
                    buttonText={buttonText}
                    required={required && idList.length === 0}
                    inputKey={`modal-${totalCount > 0 ? totalCount : "empty"}`}
                    onFilesSelected={handleFilesSelected}
                    onClear={handleClear}
                  />
                )
              )}

              <div className="flex flex-col gap-[10px] w-full max-h-[35vh] overflow-y-auto">
                {(isReadonly || isReviewMode) &&
                  reviewAttachments.map((attachment) => {
                    const canRemoveAttachment =
                      isReviewMode &&
                      !!urlApplicationId &&
                      attachment.approval_task_id === urlApplicationId;

                    return (
                      <FileInfoCard
                        key={attachment.id}
                        variant="review"
                        fileName={attachment.file_name}
                        createdAt={attachment.created_at}
                        nodeName={
                          attachment.node_description ||
                          attachment.approval_task_id ||
                          "Start point"
                        }
                        uploadedBy={
                          attachment.uploaded_by.name || "Unknown User"
                        }
                        canDownload={canDownload}
                        isDownloading={isDownloading}
                        canRemove={canRemoveAttachment}
                        onDownload={() =>
                          download(attachment.id, attachment.file_name)
                        }
                        onRemove={
                          canRemoveAttachment
                            ? () =>
                                handleRemoveFile(
                                  attachment.id,
                                  attachment.file_name,
                                )
                            : undefined
                        }
                      />
                    );
                  })}

                {!isReadonly &&
                  !isReviewMode &&
                  idList.map((attachmentId, index) => {
                    const att = resolveAttachment(attachmentId);
                    const fileName =
                      att?.file_name ?? `Attachment #${attachmentId}`;
                    const size = att?.file_size ?? 0;
                    const fileError = getFileError(index);

                    return (
                      <FileInfoCard
                        key={attachmentId}
                        variant="committed"
                        fileName={fileName}
                        fileSize={size}
                        fileError={fileError}
                        canDownload={canDownload}
                        isDisabled={isDisabled}
                        isDownloading={isDownloading}
                        isInteractive={isInteractive}
                        onDownload={() => download(attachmentId, fileName)}
                        onRemove={() =>
                          handleRemoveFile(attachmentId, fileName)
                        }
                      />
                    );
                  })}
              </div>
            </div>

            <div className="flex items-start">
              <Button
                type="button"
                variant="tertiary"
                onClick={handleCloseFilesModal}
                className="w-[190px] h-[50px] rounded-[6px] text-[16px] font-medium cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
);
