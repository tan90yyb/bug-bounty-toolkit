# 因时间限制未完成的线索表

仅因时间盒到期、本轮总预算不足、加时未批准或需要等待异步处理而未完成的候选，暂停前记入 `RECON_DIR/time-deferred-findings.csv`；已有证据和复现材料按约定保存。未通过八问的内容称候选线索，不写成确认漏洞。已明确证伪的方向保留反证，不归入待续测候选。

开始研究时用[空白 CSV 模板](time-deferred-findings.template.csv)在本轮 `RECON_DIR` 创建记录表；恢复任务时读取已有表，不覆盖历史行。不预填虚构候选。

## 表格字段

| 字段 | 内容 |
|---|---|
| finding_id / lead_id | 稳定编号；恢复使用原编号与真实记录计数 |
| origin / endpoint / suspected_class | 站点、入口、疑似漏洞类型 |
| potential_impact | 待验证影响，明确未证实边界 |
| evidence_paths / observed_facts | 证据位置、已观察事实 |
| existence_likelihood / likelihood_reason | 高、中、低、未知；附判断依据和反证 |
| missing_questions / remaining_checks | 尚未通过的八问题号和剩余步骤 |
| elapsed_work_minutes / pause_reason / paused_at | 实际活动时间、暂停原因和带时区时间 |
| estimated_remaining_minutes / next_action | 继续预计用时和可执行下一步 |
| distinct_real_records / record_ledger | 已接触的不同真实记录数和原台账路径 |
| user_decision / approved_minutes / status | pending/continue/decline，批准分钟数，paused/resumed/resolved/refuted |

高：关键异常已可重复或关键边界已显示不一致，但影响链仍缺少步骤；中：有具体异常和可执行假设，替代解释尚未排除；低：证据弱或有明显反证，仍有具体可检查条件；未知：证据不足以分级。可能性与价值分级、严重性分别记录；不编造百分比，也不把高可能性等同已确认。

## 结束时交付

渗透结束时必定输出该表的 Markdown 展示，并交付 CSV，包括编号、站点/入口、疑似问题、可能性及理由、已有证据、剩余步骤、已用时/暂停原因、预计续测用时和用户决定。没有条目时明确“因时间未完成的候选：0”。按可能性和潜在业务价值排序，不能隐藏低可能性或未知条目。

表格模板（开始时无真实候选，不预填虚构漏洞）：

| 编号 | 站点/入口 | 疑似问题及待证影响 | 可能性及理由 | 已有证据/缺口 | 已用时/暂停原因 | 预计续测 | 用户决定 |
|---|---|---|---|---|---|---|---|

本轮中值得继续的线索仍按共同规则申请一次加时。结束后由用户选择续测哪些编号并确定新增预算，未经选择不自动恢复。用户明确批准的后续轮次沿用原编号、证据、资产范围、方法审批和 5 条不同记录台账；记录新增预算及决定，不能自动重置上限。用户选择续测属于明确的新指令，不因上一轮已用过一次加时就拒绝续测。
