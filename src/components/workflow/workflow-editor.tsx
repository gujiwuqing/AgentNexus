"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./nodes";
import { NodeLibrary } from "./node-library";
import { NodeConfigDialog } from "./node-config-dialog";
import { RunPanel } from "./run-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useWorkflow, useUpdateWorkflow, useWorkflowRunDetail } from "@/hooks/use-workflows";
import type { WorkflowGraph, WorkflowNode } from "@/types/workflow";

const NODE_TYPE_KEYS: Record<string, "agent.label" | "condition.label" | "transform.label" | "humanInput.label" | "httpRequest.label" | "codeExecute.label" | "delay.label" | "variableAggregate.label"> = {
  agent: "agent.label",
  condition: "condition.label",
  transform: "transform.label",
  human_input: "humanInput.label",
  http_request: "httpRequest.label",
  code_execute: "codeExecute.label",
  delay: "delay.label",
  variable_aggregate: "variableAggregate.label",
};

function nodeTypeToKey(nodeType: string) {
  return NODE_TYPE_KEYS[nodeType] ?? "agent.label";
}

function graphToFlow(graph: WorkflowGraph) {
  const nodes: Node[] = graph.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position ?? { x: Math.random() * 400, y: Math.random() * 300 },
    data: { label: n.label, config: n.config },
  }));
  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
  return { nodes, edges };
}

function flowToGraph(nodes: Node[], edges: Edge[]): WorkflowGraph {
  return {
    nodes: nodes.map((n): WorkflowNode => ({
      id: n.id,
      type: (n.type ?? "agent") as WorkflowNode["type"],
      label: (n.data?.label as string) ?? "",
      config: (n.data?.config as WorkflowNode["config"]) ?? {},
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  };
}

function EditorInner({ workflowId }: { workflowId: string }) {
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const updateWorkflow = useUpdateWorkflow(workflowId);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [configNode, setConfigNode] = useState<Node | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: runDetail } = useWorkflowRunDetail(selectedRunId ?? "");
  const t = useTranslations("workflowExt.editor");
  const tCommon = useTranslations("common");
  const tNodeTypes = useTranslations("workflowExt.nodeTypes");

  useEffect(() => {
    if (workflow && !initialized) {
      const { nodes: n, edges: e } = graphToFlow(workflow.graph);
      setNodes(n);
      setEdges(e);
      setName(workflow.name);
      setInitialized(true);
    }
  }, [workflow, initialized, setNodes, setEdges]);

  useEffect(() => {
    if (!initialized) return;
    if (!runDetail) {
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: undefined } })));
      return;
    }
    const statusMap: Record<string, string> = {};
    for (const log of runDetail.stepLogs) {
      statusMap[log.nodeId] = log.status;
    }
    if (runDetail.run.currentNodeId && runDetail.run.status === "waiting_for_input") {
      statusMap[runDetail.run.currentNodeId] = "waiting_for_input";
    }
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: statusMap[n.id] } })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runDetail, initialized]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData("application/reactflow");
      if (!nodeType) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: nodeType,
        position,
        data: { label: tNodeTypes(nodeTypeToKey(nodeType)), config: {} },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, tNodeTypes]
  );

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setConfigNode(node);
    setConfigOpen(true);
  }, []);

  function handleConfigSave(nodeId: string, newData: Record<string, unknown>) {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n)));
  }

  function handleSave() {
    const graph = flowToGraph(nodes, edges);
    updateWorkflow.mutate({ name, graph });
  }

  if (isLoading) return <div className="p-8">{tCommon("loading")}</div>;
  if (!workflow) return <div className="p-8">{t("notFound")}</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Input
          className="max-w-[200px] h-8 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button size="sm" onClick={handleSave} disabled={updateWorkflow.isPending}>
          {updateWorkflow.isPending ? t("saving") : t("save")}
        </Button>
        {updateWorkflow.isSuccess && <span className="text-green-600 text-xs">{t("saved")}</span>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <NodeLibrary />
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </div>

      <RunPanel workflowId={workflowId} onSelectRun={setSelectedRunId} />

      <NodeConfigDialog
        node={configNode}
        allNodes={nodes}
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSave={handleConfigSave}
      />
    </div>
  );
}

export function WorkflowEditor({ workflowId }: { workflowId: string }) {
  return (
    <ReactFlowProvider>
      <EditorInner key={workflowId} workflowId={workflowId} />
    </ReactFlowProvider>
  );
}
