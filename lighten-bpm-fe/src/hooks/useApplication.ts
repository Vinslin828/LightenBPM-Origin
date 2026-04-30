import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { container } from "../container";
import { IApplicationService } from "../interfaces/services";
import { TYPES } from "../types/symbols";
import {
  Application,
  ApplicationForm,
  ApplicationFormOptions,
  ApplicationOptions,
  OverallStatus,
  Progress,
  ProgressType,
} from "@/types/application";
import { ApiResponse, Options } from "@/types/domain";
import {
  normalizeApplicationFormOptions,
  normalizeApplicationOptions,
} from "@/services/application-service";
import { EntitiesValues } from "@coltorapps/builder";
import { basicFormBuilder } from "@/components/form/builder/definition";

// --- Service and Query Keys ---
const useApplicationService = () =>
  container.get<IApplicationService>(TYPES.ApplicationService);

const applicationQueryKey = (applicationId: string) => [
  "application",
  applicationId,
];
const applicationsListQueryKey = (options?: ApplicationOptions) => [
  "applications",
  options,
];
const applicationFormListQueryKey = (options?: ApplicationFormOptions) => [
  "applicationForms",
  options,
];
const applicationFormQueryKey = (bindingId?: string) => [
  "applicationform",
  bindingId,
];
const applicationProgressQueryKey = (applicationId: string) => [
  "applicationProgress",
  applicationId,
];
const applicationCommentQueryKey = (applicaitonId: string) => [
  "applicaitonComment",
  applicaitonId,
];

export const useApplication = (applicationId?: string) => {
  const [application, setApplication] = useState<Application | undefined>();
  const applicationService = useApplicationService();

  const applicationResult = useQuery({
    queryKey: applicationQueryKey(applicationId!),
    queryFn: async () => {
      if (!applicationId) return null;
      return applicationService.getApplication(applicationId);
    },
    enabled: !!applicationId,
  });

  const commentResult = useQuery({
    queryKey: applicationCommentQueryKey(applicationId!),
    queryFn: async () => {
      if (!applicationId) return null;
      return applicationService.getComments(applicationId);
    },
    enabled: !!applicationId,
  });

  useEffect(() => {
    setApplication(applicationResult.data?.data);
  }, [applicationResult.data]);
  useEffect(() => {
    // console.debug(applicationResult.data, commentResult.data);
    if (applicationResult.data) {
      if (
        !!commentResult.data?.data &&
        commentResult.data.data?.length > 0 &&
        applicationResult.data?.data?.id !== "" &&
        applicationResult.data?.data?.approvalId ===
          commentResult.data.data[0].approvalId
      ) {
        setApplication((prev) =>
          prev
            ? {
                ...prev,
                ...applicationResult.data?.data,
                comment: commentResult.data?.data?.[0].content,
                timestamp: commentResult.data?.data?.[0].updatedAt,
              }
            : undefined,
        );
      }
    }
  }, [commentResult.data, applicationResult.data]);

  return {
    application: application,
    isLoading: applicationResult.isLoading || commentResult.isLoading,
    isError: applicationResult.isError || commentResult.isError,
    error: applicationResult.error || commentResult.error,
    refetch: () => {
      applicationResult.refetch();
      commentResult.refetch();
    },
  };
};

export const useApprovalApplication = (approvalId?: string) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: applicationQueryKey(approvalId!),
    queryFn: () => {
      const applicationService = useApplicationService();
      return applicationService.getApprovalApplication(approvalId!);
    },
    enabled: !!approvalId,
  });
  return { application: data?.data, isLoading, isError };
};

export const useApplications = (options?: ApplicationOptions) => {
  const applicationService = useApplicationService();
  const normalizedOptions = useMemo(
    () => normalizeApplicationOptions(options),
    [options],
  );
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: applicationsListQueryKey(normalizedOptions),
    queryFn: () => applicationService.getApplications(normalizedOptions),
  });

  return {
    applications: response?.data,
    isLoading,
    isError,
    error,
  };
};

export const useApplicationProgress = (applicationId?: string) => {
  const applicationService = useApplicationService();
  const [progress, setProgress] = useState<
    { progress: Progress; overallStatus: OverallStatus } | undefined
  >(undefined);
  const progressResult = useQuery({
    queryKey: applicationProgressQueryKey(applicationId!),
    queryFn: async () => {
      if (!applicationId) return null;
      return applicationService.getApplicationProgress(applicationId);
    },
    enabled: !!applicationId,
  });

  const commentResult = useQuery({
    queryKey: applicationCommentQueryKey(applicationId!),
    queryFn: async () => {
      if (!applicationId) return null;
      return applicationService.getComments(applicationId);
    },
    enabled: !!applicationId,
  });
  // console.debug({ progress });

  useEffect(() => {
    // console.debug({
    //   progressData: progressResult.data,
    //   commentData: commentResult.data,
    // });

    const progressData = progressResult.data?.data;
    if (!progressData) {
      setProgress(undefined);
      return;
    }

    const comments = commentResult.data?.data ?? [];
    if (!comments.length) {
      setProgress(progressData);
      return;
    }

    const commentMap = new Map(
      comments.map((comment) => [comment.approvalId, comment]),
    );

    const applyCommentsToStep = (step: Progress[number]): Progress[number] => {
      if (step.type === ProgressType.Group) {
        return {
          ...step,
          children: step.children.map((group) => ({
            ...group,
            data: group.data.map((reviewer) => {
              const matchedComment = commentMap.get(reviewer.id);
              return matchedComment
                ? {
                    ...reviewer,
                    comment: matchedComment.content,
                    timestamp: matchedComment.updatedAt,
                  }
                : reviewer;
            }),
          })),
        };
      }

      if (step.type === ProgressType.Review) {
        return {
          ...step,
          children: step.children.map((reviewer) => {
            const matchedComment = commentMap.get(reviewer.id);
            return matchedComment
              ? {
                  ...reviewer,
                  comment: matchedComment.content,
                  timestamp: matchedComment.updatedAt,
                }
              : reviewer;
          }),
        };
      }

      if (step.type === ProgressType.Condition) {
        return {
          ...step,
          children: step.children.map((branch) =>
            branch.map((branchStep) => applyCommentsToStep(branchStep)),
          ),
        };
      }

      return step;
    };

    const merged: Progress = progressData.progress.map(applyCommentsToStep);

    setProgress({ ...progressData, progress: merged });
  }, [progressResult.data, commentResult.data]);

  return {
    progress,
    isLoading: progressResult.isLoading || commentResult.isLoading,
    isError: progressResult.isLoading || commentResult.isLoading,
    error: progressResult.error ?? commentResult.error,
  };
};
export const useApplicationForms = (options?: ApplicationFormOptions) => {
  const applicationService = useApplicationService();

  const normalizedOptions = useMemo(
    () => normalizeApplicationFormOptions(options),
    [options],
  );

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: applicationFormListQueryKey(normalizedOptions),
    queryFn: () => applicationService.getApplicationForms(normalizedOptions),
    staleTime: 0,
    gcTime: 0,
  });

  return {
    forms: response?.data,
    isLoading,
    isError,
    error,
  };
};
export const useApplicationForm = (bindingId: string | undefined) => {
  const applicationService = useApplicationService();
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: applicationFormQueryKey(bindingId),
    queryFn: () => applicationService.getApplicationForm(bindingId!),
    enabled: !!bindingId,
  });

  return {
    form: response?.data,
    isLoading,
    isError,
    error,
  };
};

/**
 * Provides a mutation function to submit a new application.
 */
export const useCreateApplication = (options?: {
  onSuccess?: (data: ApiResponse<Application>) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const applicationService = useApplicationService();

  return useMutation({
    mutationFn: (
      payload: Omit<
        Application,
        "submittedAt" | "id" | "serialNumber" | "approvalId"
      > &
        ({ id: string } | { serialNumber: string }) & {
          draftId?: string | null;
        },
    ) => applicationService.createApplication(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: applicationQueryKey(data.data?.serialNumber ?? ""),
      });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      console.error("Application submission failed:", error);
      options?.onError?.(error);
    },
  });
};

export const useDiscardApplication = (options?: {
  onSuccess?: (data: ApiResponse<void>, applicationId: string) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const applicationService = useApplicationService();

  return useMutation({
    mutationFn: (applicationId: string) =>
      applicationService.discardApplication(applicationId),
    onSuccess: (data, applicationId) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      // Invalidate the specific application query
      queryClient.invalidateQueries({
        queryKey: applicationQueryKey(applicationId),
      });
      queryClient.invalidateQueries({
        queryKey: applicationProgressQueryKey(applicationId),
      });
      // Custom logic
      options?.onSuccess?.(data, applicationId);
    },
    onError: (error) => {
      console.error("Cancel application failed:", error);
      options?.onError?.(error);
    },
  });
};

export const useApproveApplication = (options?: {
  onSuccess?: (
    data: ApiResponse<unknown>,
    variable: { serialNumber: string; comment?: string; approvalId: string },
  ) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const applicationService = useApplicationService();

  return useMutation({
    mutationFn: ({
      serialNumber: serialNumber,
      comment,
      approvalId,
      formData,
    }: {
      serialNumber: string;
      comment?: string;
      approvalId: string;
      formData?: EntitiesValues<typeof basicFormBuilder>;
    }) =>
      applicationService.approveApplication(
        serialNumber,
        approvalId,
        comment,
        formData,
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: applicationQueryKey(variables.serialNumber),
      });
      queryClient.invalidateQueries({
        queryKey: applicationQueryKey(variables.approvalId),
      });
      queryClient.invalidateQueries({
        queryKey: applicationProgressQueryKey(variables.serialNumber),
      });
      queryClient.invalidateQueries({
        queryKey: applicationCommentQueryKey(variables.serialNumber),
      });
      options?.onSuccess?.(data, variables);
    },
    onError: (error) => {
      console.error("Approve application failed:", error);
      options?.onError?.(error);
    },
  });
};

export const useRejectApplication = (
  options?: UseMutationOptions<
    ApiResponse<unknown>,
    Error,
    {
      serialNumber: string;
      comment?: string;
      approvalId: string;
    },
    unknown
  >,
) => {
  const queryClient = useQueryClient();
  const applicationService = useApplicationService();

  return useMutation({
    mutationFn: ({
      serialNumber,
      comment,
      approvalId,
      formData,
    }: {
      serialNumber: string;
      comment?: string;
      approvalId: string;
      formData?: EntitiesValues<typeof basicFormBuilder>;
    }) =>
      applicationService.rejectApplication(
        serialNumber,
        approvalId,
        comment,
        formData,
      ),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({
        queryKey: applicationQueryKey(variables.serialNumber),
      });
      queryClient.invalidateQueries({
        queryKey: applicationQueryKey(variables.approvalId),
      });
      queryClient.invalidateQueries({
        queryKey: applicationProgressQueryKey(variables.serialNumber),
      });
      queryClient.invalidateQueries({
        queryKey: applicationProgressQueryKey(variables.serialNumber),
      });
      queryClient.invalidateQueries({
        queryKey: applicationCommentQueryKey(variables.serialNumber),
      });
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variable, context) => {
      console.error("Reject application failed:", error);
      options?.onError?.(error, variable, context);
    },
  });
};

export const useUpdateApplication = (options?: {
  onSuccess?: (
    data: ApiResponse<Application>,
    variables: { id: string; application: any },
  ) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const applicationService = useApplicationService();

  return useMutation({
    mutationFn: ({ id, application }: { id: string; application: any }) =>
      applicationService.updateApplication(id, application),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.setQueryData(applicationQueryKey(variables.id), response);
      options?.onSuccess?.(response, variables);
    },
    onError: (error) => {
      console.error("Update application failed:", error);
      options?.onError?.(error);
    },
  });
};
