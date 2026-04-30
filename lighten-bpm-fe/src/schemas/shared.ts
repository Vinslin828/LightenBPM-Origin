import { PaginatedData } from "@/types/domain";
import { z } from "zod";

/**
 * Creates a generic pagination schema in Zod.
 * @param itemSchema The Zod schema for the individual items in the `items` array.
 * @returns A Zod schema for a paginated API response.
 *
 * @example
 * const userSchema = z.object({ id: z.string(), name: z.string() });
 * const userPaginationSchema = createApiPaginationSchema(userSchema);
 *
 * // Infer the type
 * type UserPagination = z.infer<typeof userPaginationSchema>;
 * // type UserPagination = {
 * //   total: number;
 * //   page: number;
 * //   totalPages: number;
 * //   items: { id: string, name: string }[];
 * // }
 */
export const createApiPaginationSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
    limit: z.number().optional(),
    items: z.array(itemSchema),
  });

export type PaginatedResponseLike<T> = {
  total: number;
  page: number;
  totalPages: number;
  items: T[];
  limit?: number;
};

export function transformPaginatedResponse<TSource, TTarget>(
  payload: PaginatedResponseLike<TSource>,
  mapper: (item: TSource) => TTarget,
): PaginatedData<TTarget> {
  return {
    total: payload.total,
    page: payload.page,
    totalPages: payload.totalPages,
    items: payload.items.map(mapper),
    limit: payload.limit ?? payload.items.length,
  };
}
