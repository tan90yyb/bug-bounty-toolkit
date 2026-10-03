---
name: redteam-mindset
description: "Red-team operator discipline — the mindset corrections that separate offensive testing from defensive WAPT. Built from authorized red-team work where conservative defaults caused multiple findings to be missed and one to be incorrectly retracted. Use at the START of any red-team engagement and again whenever feeling stuck or considering \"stopping\" on a defended target. The single most important skill to load when scope is \"external red team\" not \"bug bounty / WAPT\"."
metadata:
  sources: authorized-engagement
  report_count: 1
---

> **工作流依据：** 限制仅使用[用户文件及已确认修改](../../OPERATOR_POLICY.md)，汇总见[共同规则](../../CODE_OF_CONDUCT.md)。本技能的技术步骤和证据方法供按需选用，正式报告统一回答八问。

## 共同执行规则

以[用户工作流](../../OPERATOR_POLICY.md)及本轮明确指令为准。取证读取[不同真实记录的 5 条计数规则](../bug-bounty/references/real-records.md)。登录与认证入口可以测试，正常登录不逐包审批；测试请求、改密与登出等操作遵循用户工作流。按共同时间规则继续有价值的方向，因时间暂停的候选登记[待续测表](../bug-bounty/references/time-deferred-findings.md)，任务结束时输出，由用户选择后续项目。

## When to use this skill

Trigger when:
- Engagement scope says "red team", "adversary emulation", "assume breach", "TIBER-style"
- You're tempted to retract a finding because reproducibility failed once
- You're tempted to call a defense "working as intended" instead of probing further
- You hit a blocker (captcha, rate limit, WAF, CA-block, lockout) and consider stopping
- You're about to spend time on IDOR/CSRF/XSS instead of access-yielding bugs
- You found a vuln on app A and there are sister apps B, C, D you haven't touched

其他任务可参考对应技能：
- Bug bounty programs (use bug-bounty skill — different scope rules)
- WAPT/PCI-style assessments (use OWASP-aligned skills)
- Pure compliance audits

---

## The one-line summary

**Red team scope = "gain access, prove impact". Bug bounty / WAPT scope = "find a bug, write a report".**

These produce DIFFERENT decisions at every blocker. Internalize the difference before starting.

---

## 在用户范围和时间内持续研究

下列研究建议服从用户文件、明确授权、业务红线和时间预算；它们不扩大范围或绕过停止条件。

### 范围、研究预算和行为准则持续适用

读取[共同价值与时间规则](../bug-bounty/references/value-and-time.md)。有必要深挖且时间不足时主动在聊天中申请加时；完整覆盖要求不能绕过已批准的时间盒。

执行范围、方法审批、数据计数、业务红线与时间要求使用用户文件，不再添加独立禁令。

### Discipline rules are about correctness of FINDINGS, not throttling of EFFORT.

Read this twice. The bundle's discipline rules — OOB evidence example, Marker Discipline, Body-Diff, eight-question evidence checks, Server-Policy-vs-State, Statistical Sampling — all answer one question: *"is this signal actually a finding?"*. Continue only with safe, non-disruptive probes inside scope. Stop the affected test when the conduct policy, a scope limit, a stop condition, service instability, or the user requires it.

### "Stop at PoC" means stop ESCALATING, not stop TESTING.

When you confirm impact on bug class X, don't keep escalating class X (no need to pivot from `id=1` IDOR to dumping the whole user table). But classes Y and Z have not been tested yet. Run Y. Then Z. Then the rest of the Pattern Library.

### 真实信息最小验证：同一漏洞累计最多 5 条

所有取证统一遵循[行为准则](../../CODE_OF_CONDUCT.md)。优先测试账号、自有数据和合成标记；为证明同一漏洞确有必要时，允许在授权范围内累计最多获取 5 条不同真实信息。取得足够证据后停止读取，不为凑满数量继续访问。

跨接口、账号、工具和重试共用同一上限，按不同真实记录去重计数，重复数据不增加计数。记录 finding_id、累计数量与证据位置；不批量提取敏感数据。意外返回的记录计入上限；出现超量返回时停止该读取路径并如实记录，不继续扩展。

请求、响应和截图允许脱敏，保留验证权限关系、字段结构及结果差异所需的信息。未证明影响的线索按价值与时间规则继续研究；需要加时就在聊天中申请，用户批准后继续。

---

## Mindset correction #1 — The blocker is data, not the stop sign

**Anti-pattern (what I did wrong):**
> "Recheck under load showed no timing differential — recanting the SQLi as indeterminate."

**The correct frame:**
> "The original 3-sample baseline (σ = 32 ms) with three distinct SLEEP payloads each adding +6 s is statistically definitive. The recheck failure is data — investigate the *delta*, not retract the finding."

When a defense suddenly appears mid-engagement:
1. **原始证据可用于对照，保存要求按用户文件执行** — capture them BEFORE recheck. Screenshots, request/response pairs, timing samples.
2. **Diff the response** — body size, headers, cookies, response time. The change tells you what the client deployed (WAF rule? Hotfix? Geo block?).
3. **The deployed mitigation is itself a finding** — positive operational observation about IR responsiveness.
4. **Try alternative vectors** — slower-paced timing, encoded keywords, different injection contexts, cookie injection, header injection.
5. **Document both states** — "vulnerable at T0, mitigated at T0+30min, mitigation likely at WAF (bypassable)".

复现失败可分析原因和反证；结论由统一八问决定，不强制保留已证伪发现。

---

## Mindset correction #2 — Sister-app pattern recognition

**Anti-pattern:**
> "I confirmed SQLi on /app-a/. Moving on to other tasks."

**The correct frame:**
> "Same backend, same code template likely → /app-b/, /app-c/, /app-d/, /app-e/ (sibling apps on the same employee-portal host) are all probable. Test them with the SAME payload."

When you confirm a vuln on app A:
1. **Identify shared infrastructure** — same IP, same load balancer, same TLS cert, same response headers, same session cookie name, same login form HTML.
2. **Identify shared code template** — same form fields, same error messages, same view structure, same framework version.
3. **Sweep all sisters with the SAME exploit payload immediately.**
4. **Document the class of vulnerability** — "vulnerability is in shared form-handler template across N apps", not just one finding.
5. **Recommend class-fix** — fix the shared template, not just one app.

The authorized-engagement case: SQLi confirmed on one sub-app (`<app-A>`); four sibling sub-apps (`<app-B>`, `<app-C>`, `<app-D>`, `<app-E>`) sit on the same employee-app host with similar form patterns — likely all share the same vulnerable template. Should have been a multi-app finding.

---

## 按用户价值分级选择方向

站点分类、漏洞价值与时间使用用户文件的 Tier 0–3。认证、越权、业务逻辑、注入等均按当前线索选择，不因红队/WAPT标签自动跳过某类漏洞。

## Mindset correction #4 — Aggressive default, not conservative default

**Anti-pattern:**
> "Tested 30% of the websites and called it comprehensive."

**The correct frame:**
> 按站点队列和本轮预算覆盖允许的业务入口，未执行项写明原因和下一步。

Aggressive defaults:
1. **Probe every live host** for top 20 paths (admin, api, login, /.git, /.env, server-status, swagger, openapi.json, robots.txt, /actuator, /healthz, etc.)
2. **For every login form discovered**, attempt 1-of-leaked + 1-of-spray-pattern + SQLi + auth-bypass-via-parameter-tampering
3. **For every JS bundle**, grep for hardcoded API keys, JWT, base URLs, hidden endpoints, admin paths
4. **For every API endpoint**, check OPTIONS preflight, missing-auth response, alg=none JWT, X-Forwarded-User header injection
5. **For every mobile app**, decompile + grep for secrets + check pinned certs + identify exported components
6. **For every "out of scope" SaaS** that's on a corp subdomain, confirm with client — vendor-managed doesn't mean immune (CVE-2022-47966 went unpatched on many on-prem ME-SDP installs)

**Rule:** report actual coverage and deferred entries. The queue and agreed budget determine completion; do not pretend that unresolved surfaces were tested.

---

## Mindset correction #5 — Persistence beats elegance

**Anti-pattern:**
> "Tesseract failed on 3 captchas, gave up, declared captcha bypass not feasible."

**The correct frame:**
> "Tesseract failed. Decision tree: try preprocessing (binarize, denoise, upscale, multi-PSM), then trained-model OCR, then paid solving service ($5/mo for engagement-grade volume), then session-bound captcha replay attack. A real attacker WILL invest the $5."

Decision-tree for blockers:

**Captcha:**
1. Omit field → check if required
2. Empty value → check validation
3. Reuse value across multiple submits → check session-bind
4. Tesseract with preprocessing
5. Trained-model OCR (deep-text-recognition-benchmark, calamari-OCR)
6. Paid solving service (2captcha API, anti-captcha)
7. Audio captcha if available (much weaker)

**WAF:**
1. Slower pace
2. Encode the payload (URL, hex, base64, mixed case)
3. Different injection context (cookie, header, JSON)
4. Different HTTP verb
5. Different content-type (multipart, application/json)
6. Bypass at the host level (X-Forwarded-Host, X-Original-URL)
7. Probe origin server directly (find via certificate transparency)

**Rate limit:**
1. IP rotation (multiple cloud regions)
2. User-Agent rotation
3. Slower pace + jitter
4. Distribute across multiple TLS sessions

**Slow target (timing-based exfil too slow):**
1. Different injection point (avoid per-row SLEEP context)
2. BENCHMARK or GET_LOCK as alternate timing oracle
3. Error-based extraction
4. OOB DNS callback (interactsh)
5. Faster network (cloud VM in same region as target)
6. If worthwhile validation needs more time, request a specific extension in chat; resume after approval and keep the same five-record cap.

**Rule:** when one path fails, the next move is "another vector to the same goal", not "documented as not vulnerable". Continue within the approved engagement window and the shared research budget.

---

## Mindset correction #6 — Real-time IR observation is a finding

When the client SOC patches mid-engagement (you observe a vulnerability disappear during your test):
- **Treat it as evidence**, not as a failure
- **Capture timestamps** before and after the change
- **Document as positive operational finding** — "client SOC detected and mitigated within X minutes; mitigation deployed at WAF/code level"
- **Verify the mitigation depth** — WAF rule (bypassable) vs code fix (real)
- **The original PoC remains the vulnerability finding** — patching doesn't erase it

This is its own skill: see `mid-engagement-ir-detection`.

---

## Mindset correction #7 — Multi-technique cross-validation

以下为可选交叉验证方法，按八问缺口选择，不要求固定两种技术：

| Vuln class | Primary | Cross-check |
|---|---|---|
| Time-based blind SQLi | SLEEP() differential | Different SLEEP variants (3 distinct payloads min) |
| Boolean blind SQLi | Body-size differential | Different boolean comparisons |
| Error-based SQLi | Error message reflection | UPDATEXML + EXTRACTVALUE both |
| RCE | Command output reflection | OOB callback (interactsh DNS) |
| LFI | File content reflection | Different file paths, different encodings |
| SSRF | Internal-only response | OOB callback (interactsh DNS) |
| Valid credential (M365) | ROPC + AADSTS53003 | SAML SSO browser flow + ConvergedConditionalAccess page |
| Auth bypass | Logged-in landing page | Session cookie persistence on subsequent request |

A single signal can be coincidence (network jitter, server hiccup, cache). Two distinct signals from the same root cause is definitive.

---

## Mindset correction #8 — Engagement journal discipline

Real-time, append-only, structured:

```jsonl
{"ts":"2026-05-08T14:40:53","ip":"<src-ip>","tool":"m365_validator","target":"login.microsoftonline.com","payload":"user1@<client>.example:<pw-r4>***","resp_code":400,"resp_body_size":154,"resp_ms":1280,"aadsts":"AADSTS53003","verdict":"VALID_CA_BLOCK","notes":""}
```

Why:
- Forensic record of what was tested and when
- Surfaces patterns (clustering, timing changes, error code distribution)
- Becomes evidence for the report
- Survives into next engagement as priors
- Differential analysis: "What changed between window A and window B?"

**Anti-pattern:** ad-hoc shell commands with no logging. You will lose the original PoC timestamp when you need it most (recheck failed, can't prove the original signal was real).

---

## Mindset correction #9 — Time is the constraint, not skill

A real adversary has months. You have an engagement window (weeks). Decisions:
- **Request time when justified** — follow the shared 30-45 minute deep-work budget. If a worthwhile lead needs longer, explain the evidence, remaining question, requested minutes and expected result in chat; continue that lead after approval.
- **Parallelize.** Run multi-target tests concurrently. Burn CPU, not wall-clock.
- **State persistence.** Engagements span multiple sessions. State files (`engagement_log/`) make Wednesday's work usable on Friday.
- **Bound long-running work** — fit each job within the approved time budget; pause it at the deadline. A time-extension approval must be recorded before the affected work continues.
- **Don't repeat yourself** — if you tested target X with payload Y on Tuesday, Wednesday you should know that without re-testing.

---

## Pre-engagement checklist

Before starting a red team engagement, confirm:

- [ ] Scope clear (subdomains in/out, SaaS in/out, phishing in/out, implant in/out)
- [ ] SOW + EL/RoE referenced
- [ ] Test IPs allocated and logged (IP_LOGS table or equivalent)
- [ ] State file initialized (`engagement_log/` with attempt counter, results JSONL, IP log)
- [ ] 请求、生产影响和数据读取按用户文件检查
- [ ] 记录实际锁定与错误现象，按用户规则决定下一步
- [ ] Crown-jewel target identified (what does winning look like?)
- [ ] Critical-finding-discuss protocol agreed (when to pause and notify)
- [ ] Burp proxy as default for evidence capture
- [ ] Engagement journal initialized

---

## During-engagement checklist

At the shared 20-minute no-progress review or deep-work deadline, ask:

- [ ] Am I making progress, or stuck?
- [ ] Have I logged the last test result to the engagement journal?
- [ ] Is the IP I'm testing from logged?
- [ ] If I confirmed a vuln: have I tested sister apps with same backend?
- [ ] If I hit a blocker: did I try the next vector in the decision tree?
- [ ] If I'm tempted to "stop" — am I sure scope is exhausted, or am I just tired?

---

## Post-engagement checklist

Before declaring done:

- [ ] All findings have at least 2 cross-technique confirmations
- [ ] Each formal finding passes the eight questions; reproduction records its actual prerequisites and waiting time
- [ ] Original PoC artifacts (screenshots, request/response, timing samples) preserved
- [ ] Mid-engagement IR observations documented as findings (positive ops)
- [ ] Active-attacker observations documented (lockout differentials, etc.)
- [ ] Sister-app sweep complete for every shared-infra finding
- [ ] State files preserved for future engagement
- [ ] Tooling gaps logged (what would have changed outcomes)

---

## Anti-patterns to flag immediately

If you catch yourself thinking any of these, STOP and reconsider:

- "It's not vulnerable" (have I tested 3 vectors? have I tested sister apps?)
- "The defense is working" (have I tried alternative payloads? slower pace? different protocol?)
- "Recheck failed so it must have been a false positive" (NO — investigate the delta)
- "OCR isn't reliable, can't bypass captcha" (paid service is $5; we're not on a personal-research budget)
- "Mobile app is years old, probably nothing useful" (hardcoded URLs and tokens often outlive the engineering team's memory)
- "SaaS, so nothing to test" (vendor patches centrally — usually true, but tenant config gaps are NOT central)
- 未完成的检查写入覆盖记录；时间不足的具体候选写入待续测表。

---

## 停止、暂停与收束

按用户文件执行：用户要求停止、资产不在范围、方法未批准、发生业务影响、达到真实记录额度时停止相关操作。已有足够证据时停止新增记录读取，保留允许的根因与影响面分析。深挖预算到期暂停该方向，按规则申请加时或写入待续测表；结束后由用户决定恢复哪些候选。不能以完整覆盖、阻碍尚未解决或“需要两种方法”强制绕过这些条件。已证伪的方向记录反证后调整；时间不足本身不证明不存在漏洞。

## Bridge to neighboring skills

After internalizing this mindset, layer the technique-specific skills:
- `m365-entra-attack` — M365 credential attack chain
- `mid-engagement-ir-detection` — turning client SOC patches into findings
- `hunt-sqli` — SQL injection across techniques
- `hunt-rce` — RCE across vectors
- `bug-bounty` — for distinguishing red-team vs bb scope when working dual-track

This skill is the operational discipline; those are the techniques.

---

## Related Skills & Chains

- **`recon-scope-triage`** — Before the "aggressive default, probe every live surface" directive can be applied safely, you must know which surfaces are actually the target's. Engagement flow: ASM/recon dataset received → `recon-scope-triage` clears namespace-collision noise + soft-404 false positives → only owned, verified assets enter the test queue. Skipping this wastes the engagement on other companies' assets (and risks attacking innocent third parties).
- **`hunt-spa-api`** — Operationalizes the "harvest JS bundles" cadence line into a full play: SPA JS → backend API map → unauthenticated broken-access-control testing. On a real engagement this play (not any scanner) found the apex Critical. Engagement flow: live SPA/`console`/`app`/`api` host identified → `hunt-spa-api` → test each route family unauthenticated against a gated-sibling control.
- **`hunt-dispatch`** — Once mindset is loaded, the `bug-bounty` orchestrator needs a mode answer (redteam vs wapt, blackbox vs greybox) before it routes to platform-specific skills. Engagement flow: red-team mindset triggered → confirm engagement mode (`bug-bounty` vs red-team vs pentest from the current authorization and scope) → invoke `hunt-dispatch` → load the right cluster (M365 / SharePoint / VPN / vCenter / APK).
- **`mid-engagement-ir-detection`** — Red-team mindset says "behavior changes ARE findings"; this skill operationalizes that. Engagement flow: red-team engagement underway → baseline established at session start → response patterns shift mid-test → `mid-engagement-ir-detection` captures the SOC-patch state as a NEW finding (defensive-action observed = client capability metric). Don't dismiss it as "the bug got fixed."
- **`redteam-report-template`** — Red-team deliverable is NOT a bug-bounty report; different audience, different tone, different cadence. Engagement flow: findings collected throughout engagement → at session close, package via `redteam-report-template` (Subject / Observations / Description / Impact / Recommendation / PoC) for client-facing DOCX, not `report-writing` which is for H1/Bugcrowd/Intigriti platforms.
- **`triage-validation`** — Red-team mindset includes "don't retract too fast" — the 4 retractions from an authorized engagement were mindset failures, not validation failures. Engagement flow: every finding through `triage-validation` 8-Question Gate, but with the red-team adjustment that "exploitable only with chain" is still a finding, not a no-finding.
- **`evidence-hygiene`** — Red-team engagements often span weeks; without disciplined evidence capture the deliverable suffers. Engagement flow: red-team mindset triggered → set up `evidence-hygiene` capture cadence (screenshots, request/response dumps, timestamped logs) at session start, not at session close.
