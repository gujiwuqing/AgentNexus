"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { History, ArrowLeft, Undo2, Redo2, LayoutGrid, Rocket } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./nodes";
import { NodeLibrary } from "./node-library";
import { NodeConfigDialog } from "./node-config-dialog";
import { RunPanel } from "./run-panel";
import { VersionHistoryPanel } from "./version-history-panel";
import { IssuesPopover } from "./issues-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useWorkflow, useUpdateWorkflow, useWorkflowRunDetail, usePublishWorkflow } from "@/hooks/use-workflows";
import { validateGraph } from "@/lib/workflow/validate-graph";
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

function autoLayoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const outgoing = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();
  nodes.forEach((n) => {
    outgoing.set(n.id, []);
    incomingCount.set(n.id, 0);
  });
  edges.forEach((e) => {
    if (!outgoing.has(e.source) || !incomingCount.has(e.target)) return;
    outgoing.get(e.source)!.push(e.target);
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
  });

  const layer = new Map<string, number>();
  const queue: string[] = [];
  nodes.forEach((n) => {
    if ((incomingCount.get(n.id) ?? 0) === 0) {
      layer.set(n.id, 0);
      queue.push(n.id);
    }
  });

  const visited = new Set(queue);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const currentLayer = layer.get(id) ?? 0;
    for (const next of outgoing.get(id) ?? []) {
      const candidate = currentLayer + 1;
      if (!layer.has(next) || candidate > (layer.get(next) ?? 0)) {
        layer.set(next, candidate);
      }
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  nodes.forEach((n) => {
    if (!layer.has(n.id)) layer.set(n.id, 0);
  });

  const byLayer = new Map<number, string[]>();
  nodes.forEach((n) => {
    const l = layer.get(n.id) ?? 0;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n.id);
  });

  const X_GAP = 240;
  const Y_GAP = 110;
  return nodes.map((n) => {
    const l = layer.get(n.id) ?? 0;
    const siblings = byLayer.get(l) ?? [];
    const idx = siblings.indexOf(n.id);
    return { ...n, position: { x: l * X_GAP, y: idx * Y_GAP } };
  });
}

type Snapshot = { nodes: Node[]; edges: Edge[] };

function EditorInner({ workflowId }: { workflowId: string }) {
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const updateWorkflow = useUpdateWorkflow(workflowId);
  const publishWorkflow = usePublishWorkflow(workflowId);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const [name, setName] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [configNode, setConfigNode] = useState<Node | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const { data: runDetail } = useWorkflowRunDetail(selectedRunId ?? "");
  const t = useTranslations("workflowExt.editor");
  const tCommon = useTranslations("common");
  const tNodeTypes = useTranslations("workflowExt.nodeTypes");

  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const stateRef = useRef<Snapshot>({ nodes: [], edges: [] });
  stateRef.current = { nodes, edges };

  const pushHistory = useCallback(() => {
    setPast((p) => [...p.slice(-49), stateRef.current]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setFuture((f) => [stateRef.current, ...f]);
      setNodes(previous.nodes);
      setEdges(previous.edges);
      return p.slice(0, -1);
    });
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, stateRef.current]);
      setNodes(next.nodes);
      setEdges(next.edges);
      return f.slice(1);
    });
  }, [setNodes, setEdges]);

  const copyBufferRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  // 实时校验当前画布：仅在工具栏提示，不写回 node.data
  // （写回会形成 校验→setNodes→重算校验 的循环）
  const issues = useMemo(() => {
    if (!initialized) return [];
    return validateGraph(flowToGraph(nodes, edges));
  }, [nodes, edges, initialized]);

  /** 把选中节点（及其内部连线）写入剪贴缓存。 */
  const copySelection = useCallback(() => {
    const selectedNodes = stateRef.current.nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    const ids = new Set(selectedNodes.map((n) => n.id));
    copyBufferRef.current = {
      nodes: selectedNodes,
      edges: stateRef.current.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
    };
  }, []);

  /** 粘贴缓存节点：重新分配 id、位置偏移，保留内部连线。 */
  const pasteSelection = useCallback(() => {
    const buffer = copyBufferRef.current;
    if (!buffer || buffer.nodes.length === 0) return;

    const stamp = Date.now();
    const idMap = new Map<string, string>();
    const newNodes = buffer.nodes.map((n, i) => {
      const newId = `node_${stamp}_${i}`;
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        selected: true,
        position: { x: (n.position?.x ?? 0) + 40, y: (n.position?.y ?? 0) + 40 },
        data: { ...n.data, runStatus: undefined },
      };
    });
    const newEdges = buffer.edges.map((e, i) => ({
      ...e,
      id: `edge_${stamp}_${i}`,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
    }));

    pushHistory();
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  }, [pushHistory, setNodes, setEdges]);

  const deleteSelection = useCallback(() => {
    const selectedIds = new Set(stateRef.current.nodes.filter((n) => n.selected).map((n) => n.id));
    const hasSelectedEdge = stateRef.current.edges.some((e) => e.selected);
    if (selectedIds.size === 0 && !hasSelectedEdge) return;
    pushHistory();
    setNodes((nds) => nds.filter((n) => !selectedIds.has(n.id)));
    setEdges((eds) =>
      eds.filter((e) => !e.selected && !selectedIds.has(e.source) && !selectedIds.has(e.target)),
    );
  }, [pushHistory, setNodes, setEdges]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (isMod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (isMod && key === "c") {
        copySelection();
        return;
      }
      if (isMod && key === "v") {
        e.preventDefault();
        pasteSelection();
        return;
      }
      if (isMod && key === "d") {
        e.preventDefault();
        copySelection();
        pasteSelection();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, copySelection, pasteSelection, deleteSelection]);

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
    if (runDetail.run.currentNodeId && runDetail.run.status === "paused") {
      for (const nodeId of runDetail.run.currentNodeId.split(",")) {
        if (nodeId) statusMap[nodeId] = "paused";
      }
    }
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, runStatus: statusMap[n.id] } })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runDetail, initialized]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (changes.some((c) => c.type === "remove")) pushHistory();
      onNodesChangeBase(changes);
    },
    [onNodesChangeBase, pushHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((c) => c.type === "remove")) pushHistory();
      onEdgesChangeBase(changes);
    },
    [onEdgesChangeBase, pushHistory]
  );

  const onNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const onConnect = useCallback(
    (params: Connection) => {
      pushHistory();
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, pushHistory]
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

      pushHistory();
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: nodeType,
        position,
        data: { label: tNodeTypes(nodeTypeToKey(nodeType)), config: {} },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, tNodeTypes, pushHistory]
  );

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setConfigNode(node);
    setConfigOpen(true);
  }, []);

  function handleConfigSave(nodeId: string, newData: Record<string, unknown>) {
    pushHistory();
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: newData } : n)));
  }

  function handleAutoLayout() {
    pushHistory();
    setNodes((nds) => autoLayoutNodes(nds, edges));
  }

  function handleSave() {
    const graph = flowToGraph(nodes, edges);
    updateWorkflow.mutate(
      { name, graph },
      {
        // 工具栏空间紧张，且原行内提示一直停留不消失，改用 toast
        onSuccess: () => toast.success(t("saved")),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  /** 发布 = 先保存当前画布，再把已发布版本指向这份快照；正式运行从此锁定该版本。 */
  function handlePublish() {
    const graph = flowToGraph(nodes, edges);
    updateWorkflow.mutate(
      { name, graph },
      {
        onSuccess: () =>
          publishWorkflow.mutate(undefined, {
            onSuccess: (w) => toast.success(t("publishedToast", { version: w.publishedVersionNumber ?? 0 })),
            onError: (err) => toast.error(err.message),
          }),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-2 border-b">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="flex-1 rounded-none" />
      </div>
    );
  }
  if (!workflow) return <div className="p-8">{t("notFound")}</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href={`/workflows/${workflowId}`} aria-label={tCommon("back")}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Input
          className="max-w-[200px] h-8 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button size="sm" onClick={handleSave} disabled={updateWorkflow.isPending}>
          {updateWorkflow.isPending ? t("saving") : t("save")}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={handlePublish}
              disabled={publishWorkflow.isPending || updateWorkflow.isPending || issues.length > 0}
            >
              <Rocket className="h-3.5 w-3.5" />
              {publishWorkflow.isPending ? t("publishing") : t("publish")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {issues.length > 0
              ? t("publishBlocked")
              : workflow.publishedVersionNumber
                ? t("publishedVersion", { version: workflow.publishedVersionNumber })
                : t("unpublishedHint")}
          </TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-0.5 ml-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={past.length === 0}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("undo")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={future.length === 0}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("redo")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAutoLayout} disabled={nodes.length === 0}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("autoLayout")}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />
        <IssuesPopover issues={issues} />
        <Button
          size="sm"
          variant={showVersionHistory ? "secondary" : "ghost"}
          className="cursor-pointer"
          onClick={() => setShowVersionHistory((v) => !v)}
        >
          <History className="h-4 w-4" />
        </Button>
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
            onNodeDragStart={onNodeDragStart}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <Background />
            <MiniMap className="!bg-background" pannable zoomable />
          </ReactFlow>
        </div>
        {showVersionHistory && (
          <div className="w-[280px] border-l overflow-y-auto">
            <VersionHistoryPanel
              workflowId={workflowId}
              onRestored={() => {
                setShowVersionHistory(false);
                setInitialized(false);
              }}
            />
          </div>
        )}
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
