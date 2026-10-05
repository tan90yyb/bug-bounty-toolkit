---
name: research-dashboard
description: 展示 Bug Bounty Toolkit 的本地研究图谱、漏洞与八问、子技能执行轨迹；用于启动研究仪表盘、记录实际进展、导入项目 CSV/日志、导出复盘快照。仅处理本地记录，不扫描目标。
---

# 研究仪表盘

使用[本地仪表盘说明](../bug-bounty/references/dashboard.md)初始化或恢复当前 RECON_DIR，启动 ../../scripts/dashboard.mjs，并在 Codex 的浏览器面板打开实际输出的网址。

主工作流开始或恢复时默认执行启动与打开；子技能共用本轮页面，不重复启动。按说明取得实际运行地址，区分服务已启动、页面打开请求已排队和页面实际可见。

沿用[用户工作流](../../OPERATOR_POLICY.md)。重要实际操作仍写入 progress.jsonl；资产、线索、证据、关系边、八问和技能状态按说明记录到 dashboard-events.jsonl。选用某个技能时区分 loaded 与 running，按本次步骤事实记录 completed/blocked/failed/deferred。

页面展示已写入的事实。候选不能显示为确认漏洞，等待续测决定不能显示为已批准；不会自动识别聊天内容或推断未记录的执行。演示数据使用独立目录并明确标记。
