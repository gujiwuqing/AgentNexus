import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Workflow, Play, PenLine, CircleCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type WorkflowSummary = {
  id: string;
  name: string;
  description: string;
  graph: { nodes?: unknown[] } | null;
  publishedVersionNumber?: number | null;
};

/** 列表卡片：点卡片进运行视图；悬停浮现「运行」「编排」快捷入口。 */
export function WorkflowCard({ workflow }: { workflow: WorkflowSummary }) {
  const t = useTranslations("workflowExt.card");
  const router = useRouter();

  return (
    <Link href={`/workflows/${workflow.id}`} className="group block h-full">
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg brand-gradient flex items-center justify-center shrink-0">
              <Workflow className="h-4 w-4 text-white" />
            </div>
            <span className="truncate">{workflow.name}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {workflow.description || t("noDescription")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">{t("nodeCount", { count: workflow.graph?.nodes?.length ?? 0 })}</Badge>
            {workflow.publishedVersionNumber != null && (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <CircleCheck className="h-3 w-3 text-green-600" />
                {t("published", { version: workflow.publishedVersionNumber })}
              </Badge>
            )}
            <div className="flex-1" />
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2 gap-1 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/workflows/${workflow.id}`);
                }}
              >
                <Play className="h-3 w-3" />
                {t("run")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 gap-1 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/workflows/${workflow.id}/edit`);
                }}
              >
                <PenLine className="h-3 w-3" />
                {t("edit")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
