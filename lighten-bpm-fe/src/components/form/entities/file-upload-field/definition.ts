import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { EntityKey } from "@/types/form-builder";
import { nameAttribute } from "../../attributes/name/definition";
import { buttonTextAttribute } from "../../attributes/button-text/definition";
import { fileSizeAttribute } from "../../attributes/file-size/definition";
import { supportedFormatsAttribute } from "../../attributes/supported-formats/definition";
import { enableMultipleAttribute } from "../../attributes/enable-multiple/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const fileUploadFieldEntity = createEntity({
  name: EntityKey.buttonUpload,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    buttonTextAttribute,
    fileSizeAttribute,
    supportedFormatsAttribute,
    enableMultipleAttribute,
    requiredAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value, context) {
    /**
     * A field value can be:
     *   - a browser `File` (uploads still in flight, validated for size/format)
     *   - a `number` (attachment_id, committed after upload success)
     *
     * File-size / format checks only apply to `File` instances — committed
     * attachment_ids have already passed those checks at upload time.
     */
    let fileSchema: z.ZodTypeAny = z.instanceof(File);

    if (context.entity.attributes.fileSize) {
      const maxSizeBytes =
        Number(context.entity.attributes.fileSize) * 1024 * 1024;
      fileSchema = z
        .instanceof(File)
        .refine((file) => file.size <= maxSizeBytes, {
          message: `File size must be less than or equal to ${context.entity.attributes.fileSize}MB`,
        });
    }

    if (
      context.entity.attributes.supportedFormats &&
      context.entity.attributes.supportedFormats.length > 0
    ) {
      const allowedFormats = context.entity.attributes.supportedFormats.map(
        (f: string) => f.toLowerCase(),
      );
      fileSchema = fileSchema.refine(
        (v: unknown) => {
          const file = v as File;
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          return allowedFormats.includes(ext);
        },
        {
          message: `Unsupported format. Supported formats are: ${context.entity.attributes.supportedFormats.join(", ")}`,
        },
      );
    }

    // Value is stored as a comma-separated string of attachment_ids (e.g. "26" or "26,27").
    // Also accept number or File for backward compatibility / in-flight uploads.
    const committedSchema = z.union([
      z.string().min(1),
      z.number(),
      fileSchema,
    ]);

    let schema: z.ZodTypeAny = committedSchema;

    if (!context.entity.attributes.required) {
      schema = schema.optional();
    }

    return schema.parse(value);
  },
  defaultValue(context) {
    return undefined;
  },
});
