import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@/types/agent";

export function AgentCard({ agent }: { agent: Agent }) {
  const t = useTranslations("agentsExt.card");

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{agent.avatar || "🤖"}</span>
            {agent.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {agent.description || t("noDescription")}
          </p>
          <div className="flex gap-1 mt-2 flex-wrap">
            {agent.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
