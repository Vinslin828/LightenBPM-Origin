import { Edge } from "@xyflow/react";
import { LayoutOptions, WorkflowNode } from "@/types/flow";

// Import worker URLs directly, letting Vite handle the bundling and pathing.
import standaloneWorkerUrl from "../workers/dagre-layout.worker.ts?worker&url";
import mergingWorkerUrl from "../workers/flow-layout.worker.ts?worker&url";

/**
 * Calculates layouted positions for nodes and edges asynchronously using a Web Worker.
 * @param nodes The nodes to layout.
 * @param edges The edges to layout.
 * @param options Layout options.
 * @returns A Promise that resolves with the layouted nodes and edges.
 */
export function getLayoutedElements(
  nodes: WorkflowNode[],
  edges: Edge[],
  options: LayoutOptions = {},
): Promise<{ nodes: WorkflowNode[]; edges: Edge[] }> {
  return new Promise((resolve) => {
    const mode = import.meta.env.VITE_WORKFLOW_BRANCH_MODE;

    // Select the appropriate worker URL based on the environment variable.
    const workerUrl =
      mode === "STANDALONE" ? standaloneWorkerUrl : mergingWorkerUrl;

    const worker = new Worker(workerUrl, {
      type: "module",
    });

    // Listen for messages from the worker
    worker.onmessage = (
      event: MessageEvent<{ nodes: WorkflowNode[]; edges: Edge[] }>,
    ) => {
      resolve(event.data);
      // Terminate the worker after it's done its job
      worker.terminate();
    };

    // Post the data to the worker to start the layout process
    worker.postMessage({ nodes, edges, options });
  });
}
