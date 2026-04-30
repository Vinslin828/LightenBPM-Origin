import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { isAxiosError } from "axios";

export const QueryErrorHandler = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      // We are only interested in 'updated' events that result in an error.
      if (event.type !== "updated" || !event.mutation) {
        return;
      }

      if (event.mutation.state.status === "error") {
        const error = event.mutation.state.error;
        let message = "An unexpected error occurred.";

        if (isAxiosError(error)) {
          // Prefer the specific error message from the backend response
          message = error.response?.data?.message ?? error.message;
        } else if (error instanceof Error) {
          message = error.message;
        }

        toast({
          variant: "destructive",
          title: "An Error Occurred",
          description: message,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient, toast]);

  return null; // This component does not render anything
};
