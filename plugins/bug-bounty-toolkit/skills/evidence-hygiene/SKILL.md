---
name: evidence-hygiene
description: "Capture reproducible vulnerability evidence and optionally redact requests, responses, HAR files and screenshots while preserving role relationships and result differences."
metadata:
  sources: community, operator_experience
---

> **工作流依据：** 限制仅使用[用户文件及已确认修改](../../OPERATOR_POLICY.md)，汇总见[共同规则](../../CODE_OF_CONDUCT.md)。

# 证据采集与可选脱敏

测试请求、响应和截图允许脱敏。按复现需要选择原文或脱敏副本，保留方法、路径、字段结构、角色关系、关键差异与证据位置。必要原文的保存位置沿用用户文件七的要求。

## 采集方法

- 在 Burp Repeater 保存请求与响应；记录账号角色、对象 ID、预期和实际结果。
- 浏览器 PoC 可保存 Console、Network、页面状态变化或截图；选择能展示结果的位置。
- HAR 可作为多请求流程的附件，并附关键请求编号和时序。
- 对照截图可显示授权账号与测试账号访问同一对象的差异。
- 将采集结果用于八问 Q2–Q7；不存在必须打开某个面板、固定截图数量或逐次轮换凭据的要求。

## 选择脱敏时的做法

- Cookie、Authorization、令牌和口令可替换为稳定占位符，如 `<ACCOUNT_A_TOKEN>`。
- 同一账号或对象在各份证据中使用一致占位符，以便核对权限关系。
- 人名、邮箱、电话、地址和账号号段可遮盖，保留字段类型与归属差异。
- 编辑 HAR 副本的 Cookie/Set-Cookie/Authorization 字段；用副本展示流程。
- 截图可使用不透明遮挡块；附文字说明被替换的字段及其复现用途。
- 脱敏不改变实际测试请求；保存证据时选择副本编辑或截图标注即可。

## 数据与交付

真实信息沿用同一漏洞最多 5 条不同业务记录、重复不计数和足够证明即停止新增读取的规则。脱敏是允许使用的方法，不是取证或报告的额外通过门槛。

报告流程见 `report-writing` 与 `triage-validation`；正式报告仅使用统一八问。
