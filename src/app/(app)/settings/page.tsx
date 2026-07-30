"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageFormSkeleton } from "@/components/ui/page-skeleton";
import { useProviderConfig, useSaveProviderConfig, useTestProviderConfig } from "@/hooks/use-provider-config";

const BASE_URL_PLACEHOLDERS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  azure: "https://{resource}.openai.azure.com",
  ollama: "http://localhost:11434/v1",
};

export default function SettingsPage() {
  const { data: config, isLoading } = useProviderConfig();
  const saveConfig = useSaveProviderConfig();
  const testConfig = useTestProviderConfig();
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [providerType, setProviderType] = useState<"openai" | "anthropic" | "azure" | "ollama">("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [webSearchProvider, setWebSearchProvider] = useState("");
  const [webSearchApiKey, setWebSearchApiKey] = useState("");
  const [testResult, setTestResult] = useState<"success" | "failed" | null>(null);

  useEffect(() => {
    if (config) {
      setProviderType(config.providerType ?? "openai");
      setBaseUrl(config.baseUrl);
      setModel(config.model);
      setApiKey(config.apiKey);
      setEmbeddingModel(config.embeddingModel ?? "");
      setWebSearchProvider(config.webSearchProvider ?? "");
      setWebSearchApiKey(config.webSearchApiKey ?? "");
    }
  }, [config]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveConfig.mutate(
      { providerType, baseUrl, model, apiKey, embeddingModel, webSearchProvider, webSearchApiKey },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleTest() {
    setTestResult(null);
    testConfig.mutate(
      { providerType: providerType as "openai" | "anthropic" | "azure" | "ollama", baseUrl, model, apiKey },
      {
        onSuccess: (result) => {
          if (result.success) {
            setTestResult("success");
            toast.success(tc("testSuccess"));
          } else {
            setTestResult("failed");
            toast.error(result.message ?? tc("testFailed"));
          }
        },
        onError: (err) => {
          setTestResult("failed");
          toast.error(err.message);
        },
      }
    );
  }

  if (isLoading) return <PageFormSkeleton className="max-w-4xl" />;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-8 lg:px-10 animate-in fade-in duration-300">
      <h1 className="text-2xl font-semibold mb-8">{t("title")}</h1>

      <Tabs defaultValue="model">
        <TabsList>
          <TabsTrigger value="model">{t("tabModel")}</TabsTrigger>
          <TabsTrigger value="search">{t("tabSearch")}</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="model" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="providerType">{t("providerType")}</Label>
              <Select
                value={providerType}
                onValueChange={(v) => setProviderType(v as "openai" | "anthropic" | "azure" | "ollama")}
              >
                <SelectTrigger id="providerType" className="max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">{t("providerTypeOpenai")}</SelectItem>
                  <SelectItem value="anthropic">{t("providerTypeAnthropic")}</SelectItem>
                  <SelectItem value="azure">{t("providerTypeAzure")}</SelectItem>
                  <SelectItem value="ollama">{t("providerTypeOllama")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">{t("baseUrl")}</Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={BASE_URL_PLACEHOLDERS[providerType] ?? "https://api.openai.com/v1"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">{t("model")}</Label>
                <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" required />
              </div>
            </div>
            <div className="max-w-lg space-y-2">
              <Label htmlFor="apiKey">{t("apiKey")}</Label>
              <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testConfig.isPending || !baseUrl || !model || !apiKey}
              >
                {testConfig.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {testConfig.isPending ? tc("testing") : tc("testConnection")}
              </Button>
              {testResult === "success" && (
                <span className="flex items-center gap-1 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  {tc("testSuccess")}
                </span>
              )}
              {testResult === "failed" && (
                <span className="flex items-center gap-1 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  {tc("testFailed")}
                </span>
              )}
            </div>

            <div className="border-t pt-6 space-y-4">
              <h2 className="text-lg font-semibold">{t("embeddingTitle")}</h2>
              <div className="max-w-lg space-y-2">
                <Label htmlFor="embeddingModel">{t("embeddingModel")}</Label>
                <Input
                  id="embeddingModel"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  placeholder="text-embedding-3-small"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="webSearchProvider">{t("searchProvider")}</Label>
                <Input
                  id="webSearchProvider"
                  value={webSearchProvider}
                  onChange={(e) => setWebSearchProvider(e.target.value)}
                  placeholder="tavily"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webSearchApiKey">{t("searchApiKey")}</Label>
                <Input
                  id="webSearchApiKey"
                  type="password"
                  value={webSearchApiKey}
                  onChange={(e) => setWebSearchApiKey(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <div className="flex items-center gap-4 pt-6 mt-6 border-t">
            <Button type="submit" disabled={saveConfig.isPending}>
              {saveConfig.isPending ? tc("saving") : tc("save")}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
