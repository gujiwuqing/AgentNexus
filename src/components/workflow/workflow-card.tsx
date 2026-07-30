import Link from "next/link";
import { useTranslations } from "next-intl";
import { Workflow } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WorkflowGraph } from "@/types/workflow";

type WorkflowSummary = {
  id: string;
  name: string;
  description: string;
  graph: WorkflowGraph;
};

export function WorkflowCard({ workflow }: { workflow: WorkflowSummary }) {
  const t = useTranslations("workflowExt.card");

  return (
    <Link href={`/workflows/${workflow.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
              <Workflow className="h-4 w-4 text-white" />
            </div>
            {workflow.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {workflow.description || t("noDescription")}
          </p>
          <div className="mt-2">
            <Badge variant="secondary">{t("nodeCount", { count: workflow.graph?.nodes?.length ?? 0 })}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
