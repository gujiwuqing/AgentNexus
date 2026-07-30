"""一次性补齐本轮新增的 i18n 文案（幂等：已存在的 key 不覆盖）。"""
import json
from collections import OrderedDict

ADDITIONS = {
    "messages/zh-CN.json": {
        "agents": {
            "sortRecent": "最近活跃",
            "sortUsage": "使用最多",
            "sortName": "名称",
            "tagAll": "全部标签",
        }
    },
    "messages/en.json": {
        "agents": {
            "sortRecent": "Recently active",
            "sortUsage": "Most used",
            "sortName": "Name",
            "tagAll": "All tags",
        }
    },
    "messages/agents-ext.zh-CN.json": {
        "agentsExt": {
            "tools": {
                "items": {
                    "current_time": {"name": "当前时间", "description": "获取当前日期和时间"},
                    "http_request": {"name": "HTTP 请求", "description": "向指定 URL 发起 HTTP 请求（已拦截内网地址）"},
                    "web_search": {"name": "联网搜索", "description": "搜索互联网获取实时信息（需在设置中配置搜索服务）"},
                    "code_execute": {"name": "代码执行", "description": "在沙箱中执行 JavaScript 代码"},
                }
            }
        }
    },
    "messages/agents-ext.en.json": {
        "agentsExt": {
            "tools": {
                "items": {
                    "current_time": {"name": "Current Time", "description": "Get the current date and time"},
                    "http_request": {"name": "HTTP Request", "description": "Send HTTP requests to a URL (internal addresses blocked)"},
                    "web_search": {"name": "Web Search", "description": "Search the web for live information (configure a provider in Settings)"},
                    "code_execute": {"name": "Code Execute", "description": "Run JavaScript in a sandbox"},
                }
            }
        }
    },
    "messages/workflow-ext.zh-CN.json": {
        "workflowExt": {
            "runPanel": {
                "searchLogs": "搜索步骤日志...",
                "logMatches": "命中 {shown}/{total}",
                "exportLogs": "导出",
                "noLogMatch": "没有匹配的步骤日志。",
            },
            "editor": {
                "copy": "复制所选 (Ctrl+C)",
                "paste": "粘贴 (Ctrl+V)",
                "duplicate": "创建副本 (Ctrl+D)",
                "deleteSelection": "删除所选 (Delete)",
            },
            "validation": {
                "allGood": "配置完整",
                "issueCount": "{count} 项待完善",
                "hint": "以下问题会导致运行失败，保存不受影响。",
                "codes": {
                    "agent.missingAgent": "未选择智能体",
                    "agent.missingPrompt": "未填写 Prompt 模板",
                    "condition.missingExpression": "未填写判断表达式",
                    "condition.missingInput": "未选择输入节点",
                    "condition.missingBranch": "未设置 True/False 分支",
                    "condition.unknownBranch": "分支指向的节点已不存在",
                    "transform.missingOperation": "未选择操作类型",
                    "transform.missingTemplate": "模板拼接缺少 template 参数",
                    "http.missingUrl": "未填写请求 URL",
                    "http.invalidUrl": "URL 需以 http:// 或 https:// 开头",
                    "code.missingCode": "未填写代码",
                    "delay.invalidDuration": "延时需在 0–30000 毫秒之间",
                    "aggregate.missingSources": "未选择来源节点",
                    "graph.emptyGraph": "工作流还没有任何节点",
                    "graph.unknownEdge": "存在指向已删除节点的连线",
                },
            },
            "versionHistory": {
                "compare": "与当前对比",
                "diffTitle": "v{number} 与当前的差异",
                "diffIdentical": "与当前内容一致。",
                "diffAddedNodes": "新增节点",
                "diffRemovedNodes": "删除节点",
                "diffChangedNodes": "修改节点",
                "diffAddedEdges": "新增连线",
                "diffRemovedEdges": "删除连线",
                "diffLoadError": "加载差异失败。",
            },
        }
    },
    "messages/workflow-ext.en.json": {
        "workflowExt": {
            "runPanel": {
                "searchLogs": "Search step logs...",
                "logMatches": "{shown}/{total} matched",
                "exportLogs": "Export",
                "noLogMatch": "No step logs match this query.",
            },
            "editor": {
                "copy": "Copy selection (Ctrl+C)",
                "paste": "Paste (Ctrl+V)",
                "duplicate": "Duplicate (Ctrl+D)",
                "deleteSelection": "Delete selection (Delete)",
            },
            "validation": {
                "allGood": "Config complete",
                "issueCount": "{count} to fix",
                "hint": "These issues block running. Saving is unaffected.",
                "codes": {
                    "agent.missingAgent": "No agent selected",
                    "agent.missingPrompt": "Prompt template is empty",
                    "condition.missingExpression": "Condition expression is empty",
                    "condition.missingInput": "No input node selected",
                    "condition.missingBranch": "True/False branch not set",
                    "condition.unknownBranch": "A branch points to a node that no longer exists",
                    "transform.missingOperation": "No operation selected",
                    "transform.missingTemplate": "Template operation needs a template param",
                    "http.missingUrl": "Request URL is empty",
                    "http.invalidUrl": "URL must start with http:// or https://",
                    "code.missingCode": "Code is empty",
                    "delay.invalidDuration": "Delay must be between 0 and 30000 ms",
                    "aggregate.missingSources": "No source nodes selected",
                    "graph.emptyGraph": "This workflow has no nodes yet",
                    "graph.unknownEdge": "An edge points to a deleted node",
                },
            },
            "versionHistory": {
                "compare": "Compare with current",
                "diffTitle": "v{number} vs current",
                "diffIdentical": "Identical to the current graph.",
                "diffAddedNodes": "Added nodes",
                "diffRemovedNodes": "Removed nodes",
                "diffChangedNodes": "Changed nodes",
                "diffAddedEdges": "Added edges",
                "diffRemovedEdges": "Removed edges",
                "diffLoadError": "Failed to load diff.",
            },
        }
    },
}


def deep_merge(target: dict, additions: dict) -> int:
    added = 0
    for key, value in additions.items():
        if isinstance(value, dict):
            node = target.setdefault(key, OrderedDict())
            added += deep_merge(node, value)
        elif key not in target:
            target[key] = value
            added += 1
    return added


for path, additions in ADDITIONS.items():
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh, object_pairs_hook=OrderedDict)
    count = deep_merge(data, additions)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"{path}: +{count} keys")
