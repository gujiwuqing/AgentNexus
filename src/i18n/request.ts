import { getRequestConfig } from "next-intl/server";
import { getLocale } from "./locale";

export default getRequestConfig(async () => {
  const locale = await getLocale();

  const [core, agentsExt, chatExt, workflowExt] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/agents-ext.${locale}.json`),
    import(`../../messages/chat-ext.${locale}.json`),
    import(`../../messages/workflow-ext.${locale}.json`),
  ]);

  return {
    locale,
    messages: {
      ...core.default,
      ...agentsExt.default,
      ...chatExt.default,
      ...workflowExt.default,
    },
  };
});
