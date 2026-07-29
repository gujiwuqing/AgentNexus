"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProviderConfig, useSaveProviderConfig } from "@/hooks/use-provider-config";

const BASE_URL_PLACEHOLDERS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  azure: "https://{resource}.openai.azure.com",
  ollama: "http://localhost:11434/v1",
};

export default function SettingsPage() {
  const { data: config, isLoading } = useProviderConfig();
  const saveConfig = useSaveProviderConfig();
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [providerType, setProviderType] = useState("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [webSearchProvider, setWebSearchProvider] = useState("");
  const [webSearchApiKey, setWebSearchApiKey] = useState("");

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
    saveConfig.mutate({ providerType, baseUrl, model, apiKey, embeddingModel, webSearchProvider, webSearchApiKey });
  }

  if (isLoading) return <div className="p-8">{tc("loading")}</div>;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-10">
      <h1 className="text-2xl font-semibold mb-8">{t("title")}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="providerType">{t("providerType")}</Label>
          <select
            id="providerType"
            value={providerType}
            onChange={(e) => setProviderType(e.target.value)}
            className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
          >
            <option value="openai">{t("providerTypeOpenai")}</option>
            <option value="anthropic">{t("providerTypeAnthropic")}</option>
            <option value="azure">{t("providerTypeAzure")}</option>
            <option value="ollama">{t("providerTypeOllama")}</option>
          </select>
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

        <div className="border-t pt-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("searchTitle")}</h2>
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
        </div>

        <div className="flex items-center gap-4 pt-2 border-t">
          <Button type="submit" disabled={saveConfig.isPending}>
            {tc("save")}
          </Button>
          {saveConfig.isError && <p className="text-destructive text-sm">{saveConfig.error.message}</p>}
          {saveConfig.isSuccess && <p className="text-green-600 text-sm">{t("saved")}</p>}
        </div>
      </form>
    </div>
  );
}
