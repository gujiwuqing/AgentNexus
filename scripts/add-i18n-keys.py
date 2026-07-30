"""补齐工作流队列相关 i18n（幂等）。"""
import json
from collections import OrderedDict

ADDITIONS = {
    "messages/workflow-ext.zh-CN.json": {
        "workflowExt": {
            "status": {"queued": "排队中"},
            "runPanel": {
                "queuedHint": "已加入执行队列，进度会自动刷新。",
                "activeHint": "正在后台执行，可离开页面稍后回来查看。",
            },
        }
    },
    "messages/workflow-ext.en.json": {
        "workflowExt": {
            "status": {"queued": "Queued"},
            "runPanel": {
                "queuedHint": "Queued for execution. Progress refreshes automatically.",
                "activeHint": "Running in the background — you can leave this page and come back.",
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
