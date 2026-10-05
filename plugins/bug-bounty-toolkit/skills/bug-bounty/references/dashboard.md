# 本地研究仪表盘

仪表盘在 Codex 的内置浏览器中展示“渗透 / 漏洞 / 轨迹”，不改动 Codex 原生菜单。脚本只处理本地记录，不扫描目标；页面只读取记录。图谱和漏洞状态不能替代实际请求、证据、授权、八问或用户的续测决定。

## 启动与恢复

使用插件实际位置的 scripts/dashboard.mjs；需要 Node.js 20 或以上，无额外 npm 依赖。命令中的 PLUGIN_ROOT 与 RECON_DIR 换成当前绝对路径，包含空格时加引号。先检查已有记录，恢复时不要用演示或初始化命令覆盖项目。

    node "PLUGIN_ROOT/scripts/dashboard.mjs" init --dir "RECON_DIR" --title "项目名称" --target "起始域名"
    node "PLUGIN_ROOT/scripts/dashboard.mjs" ingest --dir "RECON_DIR"
    node "PLUGIN_ROOT/scripts/dashboard.mjs" serve --dir "RECON_DIR" --port 8765

保持服务运行，在 Codex 的 browser 面板打开脚本输出的 http://127.0.0.1:端口。端口占用时换端口，或传 --port 0 自动选择。服务仅监听本机回环地址，不需 ARL 持续运行。记录留在 RECON_DIR/dashboard-events.jsonl；关闭浏览器和服务不清除记录，后续用同一路径恢复。

页面每 3 秒读取已经写入的记录。已有 CSV 和 progress.jsonl 发生变化后再次运行 ingest；它不会在浏览器中自动扫描或读取聊天历史。八问详情、技能状态、关系边必须由执行者明确记录，不能凭技能名称、目录存在或口头计划推断已执行。


## 默认自动打开

主 bug-bounty 工作流开始或恢复研究时，默认启动本项目仪表盘并请求在当前聊天的右侧浏览器面板打开，不等待用户另行要求。用户明确关闭仪表盘时遵从其选择。子技能继续使用本轮同一服务和 RECON_DIR，不为每个技能重复启动页面。

优先在可持续运行的本地终端启动 serve 并取得实际输出 URL；Windows 后台启动使用 Start-Process -WindowStyle Hidden。如果终端启动被限制，而可用的 Node.js 持久工具允许读取脚本、写入本项目与监听本机端口，可导入 dashboard.mjs 并调用 createStore(RECON_DIR)、ingest(store)、startServer(store,{port:0})，保留返回的 server 对象。导入本身不启动服务。该方法的服务随持久工具环境结束而停止。

取得实际 URL 后，使用可用的 open_in_codex 工具，target={type:"browser",url:实际URL}，placement="right"。仅有文件说明、URL 字符串或 queued 返回不能证明页面已经可见；queued 表示等待当前聊天显示时打开。工具缺失或系统拒绝时说明启动/打开状态和可点击 URL，不宣称已经自动打开；继续既有研究记录与正常交付。

## 记录操作

为一次真实操作生成本地 JSON 文件，格式为单个事件或事件数组；先写节点，再写依赖节点的关系边。同一对象沿用 id。给可重试的事件提供稳定 eventId，可避免重复落库；新的状态变化用新的 eventId。

    node "PLUGIN_ROOT/scripts/dashboard.mjs" append --dir "RECON_DIR" --file "本次事件.json"

事件公共字段：type、data、可选 timestamp（带时区 ISO 时间）、可选 eventId。
- run.meta：title、target；demo 仅演示项目为 true。
- node.upsert：id、kind（goal/asset/business/lead/evidence/finding）、title；可附 status、assetId、detail、businessType、tier、scope、evidencePaths、nextPlan。
- edge.upsert：id、from、to、label；边的语义按事实填写，如“包含业务”“提出假设”“产生证据”“证实结果”。候选关联写“支持候选”，不能提前写“证实漏洞”。
- finding.upsert：id、title、status（candidate/validating/confirmed/refuted/deferred）；可附 assetId、severity、tier、observedFacts、impact、evidencePaths、likelihood、likelihoodReason、remainingChecks、nextPlan、pauseReason、elapsedMinutes、estimatedMinutes、userDecision。
- skill.event：id（本次执行编号）、skill（真实技能目录名）、status（loaded/running/completed/blocked/failed/deferred）；可附 assetId、summary、reason、elapsedSeconds（实际活动耗时）。
- progress：data 放入已有进度字段，展示 action、brief_result、next_plan 等。

同一技能在不同资产或不同轮次执行应有独立执行编号；同一次执行的加载、运行与结束沿用该编号。只读完技能说明记 loaded；实际开始执行该技能步骤后记 running；completed 仅描述本次具体步骤完成，不能自动等于整站完成。受阻、失败、延期说明原因。无计时记录时显示“耗时未记录”，不编造活动时长。

示例结构（这是记录格式，不代表已执行测试）：

~~~json
[
  {"type":"node.upsert","data":{"id":"goal-main","kind":"goal","title":"当前研究目标"}},
  {"type":"node.upsert","data":{"id":"asset-001","kind":"asset","title":"已确认的资产","status":"in_progress"}},
  {"type":"edge.upsert","data":{"id":"scope-001","from":"goal-main","to":"asset-001","label":"纳入队列"}},
  {"type":"skill.event","data":{"id":"recon-001","skill":"web2-recon","status":"loaded","assetId":"asset-001","summary":"已读取信息收集技能"}}
]
~~~

实际八问定义沿用 triage-validation 的唯一问题定义。finding 的 questions 对象用 Q1 至 Q8，每项 answer 为 yes/no/pending，包含 reason 和 evidence（证据位置或说明）。只有实际完成验证才能填“是”；confirmed 记录要求八题均为 yes 且附理由和证据。全部填“是”也不会自动升级状态，需要执行者根据实际结果明确记录 confirmed。候选影响、存在可能性和严重性分别填写。

## 兼容现有记录

ingest 读取本项目目录的 asset-inventory.csv、site-queue.csv、progress.jsonl、time-deferred-findings.csv，保留已有文件。CSV 支持 UTF-8/BOM、带引号的逗号、多行与双引号。资产识别列为 origin/url/domain/hostname/host；不把未确认域名伪造为在线 URL，也不凭导入扩大测试范围。导入操作返回未识别行或解析缺口，不宣称数据齐全。

progress.jsonl 的普通动作进入操作时间线。只有明确写了 skill 与 skill_status 的记录才进入技能卡片；推荐写 skill_run_id 将一次运行的状态串联。缺少明确技能状态的历史日志保留为普通操作，不反推技能执行。

待续测表仍按用户流程维护并在结束时输出；仪表盘显示其候选、可能性及理由、已用/预计时间、暂停原因和用户决定。pending 是待决定，不是允许继续。对表的修改需再导入；页面筛选和节点点击不触发测试或续测。

## 导出、异常与演示

页面“导出记录”保存当前 JSON 快照。也可执行：

    node "PLUGIN_ROOT/scripts/dashboard.mjs" export --dir "RECON_DIR" --file "快照.json"

原始事件日志用于恢复，快照用于复盘；不要用快照覆盖事件日志。连接中断时保留上一次成功内容并显示提示；损坏的事件行显示行号警告，不静默宣称完整，也不继续向损坏日志追加。写入锁残留时，先确认没有写入进程运行再移除 RECON_DIR/.dashboard-write.lock。

演示只允许独立空目录：

    node "PLUGIN_ROOT/scripts/dashboard.mjs" demo --dir "独立演示目录"

演示资产使用保留的 .example 域名，页面始终标注虚构数据。不能把演示导入真实项目。页面不读取或上传证据原文，仅展示记录中的位置与摘要；按原有证据与脱敏规则准备这些摘要。

如果没有可用 Node.js 或浏览器面板，保留实际 CSV、progress.jsonl、待续测表与正常交付，并明确仪表盘不可用；展示失败不成为额外报告门槛。
