---
name: triage-validation
description: "Validate candidate findings before a formal vulnerability report using the unified eight-question gate, reproducibility checks, evidence review, and severity assessment. Keep incomplete leads as research notes with an evidence plan and the shared time budget."
metadata:
  sources: community, operator_experience
---

> **Mandatory testing conduct:** Before taking any action, read and follow [`../../CODE_OF_CONDUCT.md`](../../CODE_OF_CONDUCT.md). It overrides any conflicting payload, proof, persistence, exploitation, availability, or data-handling instruction in this skill.

# TRIAGE & VALIDATION

## 统一八问（唯一问题定义）

读取[统一八问验证门](references/eight-question-gate.md)，按 Q1–Q8 的通过标准逐项回答并附证据。全部通过才输出正式漏洞报告。未通过题项形成补证计划；按[价值与时间规则](../bug-bounty/references/value-and-time.md)继续有价值的研究，需要加时就在聊天中说明理由、预计时长和目标，获得用户同意后继续。

取证使用行为准则的统一规则：自建/合成数据优先；必要的授权验证中，同一漏洞累计最多 5 条真实信息，足够即止，跨接口、账号与重试共用上限；允许脱敏并保留复现所需结构。未证明的影响不得写成确认结论。

---

## THE LAYER-ORDERING TRAP — read before claiming any auth bypass

**A validation error does NOT prove you passed authentication.**

This is the highest-confidence false positive in the auth-bypass class, because the
evidence looks concrete. The reasoning that fails:

> "I sent an unauthenticated request and got back `400 — field X is required`.
> A validation error means the request cleared auth and reached business logic.
> Therefore auth is missing."

That inference is only valid if auth runs *before* input handling. Many stacks put a
**global input sanitiser, body parser, or schema filter in front of the auth
middleware.** A malformed body is then rejected before auth is ever consulted, and
the response is indistinguishable from "auth passed, validation failed."

**The test: re-send with a minimal WELL-FORMED body.**

```bash
# malformed body — trips the sanitiser, which runs FIRST
curl -s -X POST https://target/api/v1/resource -d '{'
# 400 {"code":"ERR-INPUT-0001","message":"Invalid text. Only permitted
#      characters are allowed"}                      <- looks like auth bypass

# same endpoint, well-formed empty object — now auth is reached
curl -s -X POST https://target/api/v1/resource -H 'Content-Type: application/json' -d '{}'
# 401 {"code":"ERR-AUTH-0001","message":"Not authenticated. Please log in."}
```

**Only the second response tells you where the auth layer sits.**

**Lesson from an authorized engagement.** On a production API, a malformed body
returned a validation-shaped `400` on the large majority of endpoints tested. Read
as an auth bypass, that is a Critical filed against production infrastructure
covering financial and administrative operations. It was a sanitiser reacting to
the `{` character before auth ran — every one of those endpoints returned `401` to
a well-formed `{}`. The false Critical was avoided only because someone re-tested.

**Rules:**
- Layer ordering is not observable from a single response. Never infer it.
- Probe auth with the *simplest valid* body the parser will accept, not a malformed one.
- If the error text is about **input shape or character class**, you are talking to a
  parser or sanitiser, not to business logic.
- If the error text names a **domain field** (`accountId is required`) AND a
  well-formed body still returns it, that is a real signal — proceed to Q4 and Q5.
- Applies equally to WAF and CDN layers: an edge block is not an origin response.

---

## 4 PRE-SUBMISSION GATES

Run in sequence. ALL 4 must PASS.

### Gate 0: Reality Check (30 seconds)
```
[ ] Bug is REAL — confirmed with actual HTTP requests, not code reading alone
[ ] Bug is IN SCOPE — checked program scope page explicitly
[ ] Reproducible from scratch — can reproduce starting from fresh session
[ ] Evidence ready — screenshot, response body, or video
```

### Gate 1: Impact Validation (2 minutes)
```
[ ] Can answer: "What can attacker DO that they couldn't before?"
[ ] Answer is more than "see non-sensitive data" (unless program pays for info disclosure)
[ ] Real victim: another user's data, company's data, financial loss
[ ] Not relying on victim doing something unlikely
```

### Gate 2: Deduplication Check (5 minutes)
```
[ ] Searched HackerOne Hacktivity for this program + similar bug title/endpoint
[ ] Searched GitHub issues for target repo
[ ] Read most recent 5 disclosed reports for this program
[ ] Not a "known issue" in their changelog or public docs
[ ] Google: "TARGET_NAME ENDPOINT_NAME bug bounty"
```

### Gate 3: Report Quality (10 minutes)
```
[ ] Title: [Bug Class] in [Endpoint] allows [actor] to [impact]
[ ] Steps to Reproduce: copy-pasteable HTTP request
[ ] Evidence: screenshot/video of actual impact (not just 200 status)
[ ] Severity: matches CVSS 3.1 score AND program's severity definitions
[ ] Remediation: 1-2 sentences of concrete fix
[ ] NEVER used "could potentially" or "may allow"
```

---

## NEVER SUBMIT LIST

Submitting these destroys your validity ratio.

```
Missing CSP / HSTS / security headers
Missing SPF / DKIM / DMARC
GraphQL introspection alone (no auth bypass, no IDOR demonstrated)
Banner / version disclosure without working CVE exploit
Clickjacking on non-sensitive pages (no sensitive action PoC)
Tabnabbing
CSV injection (no actual code execution shown)
CORS wildcard (*) without credential exfil proof of concept
Logout CSRF
Self-XSS (only exploits own account)
Open redirect alone (no ATO or OAuth theft chain)
OAuth client_secret in mobile app (known, expected)
SSRF DNS callback only (no internal service access or data)
Host header injection alone (no password reset poisoning PoC)
Rate limit on non-critical forms (search, contact, login with Cloudflare)
Session not invalidated on logout
Concurrent sessions
Internal IP in error message
Mixed content
SSL weak ciphers
Missing HttpOnly / Secure cookie flags alone
Broken external links
Autocomplete on password fields
Pre-account takeover (usually — very specific conditions required)
```

---

## CONDITIONALLY VALID — CHAIN REQUIRED

Build the chain first, prove it works end to end, THEN report.

| Standalone Finding | Chain Required | Valid Result |
|---|---|---|
| Open redirect | + OAuth redirect_uri → auth code theft | ATO (Critical) |
| Clickjacking | + sensitive action + working PoC | Medium |
| CORS wildcard | + credentialed request exfils user PII | High |
| CSRF | + sensitive action (transfer funds, change email, delete account) | High |
| Rate limit bypass | + OTP/reset token brute force succeeds | Medium/High |
| SSRF DNS-only | + internal service access + data returned | Medium |
| Host header injection | + password reset email uses injected host | High |
| Prompt injection | + reads other user's data (IDOR) | High |
| S3 bucket listing | + JS bundles contain API keys or OAuth secrets | Medium/High |
| Self-XSS | + CSRF to trigger it on victim without their knowledge | Medium |
| Subdomain takeover | + OAuth redirect_uri registered at that subdomain | Critical |
| GraphQL introspection | + auth bypass mutation or IDOR on node() | High |

---

## CVSS 3.1 QUICK REFERENCE

### Common Score Examples

| Finding | Score | Severity | Vector |
|---|---|---|---|
| IDOR read PII, any user, auth required | 6.5 | Medium | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N |
| IDOR write/delete, any user | 7.5 | High | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N |
| Auth bypass → admin panel | 9.8 | Critical | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H |
| Stored XSS → cookie theft, stored | 8.5 | High | AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:L/A:N |
| SQLi → full DB dump | 9.1 | Critical | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N |
| SSRF → cloud metadata | 9.1 | Critical | AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N |
| Race → double spend | 7.5 | High | AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:N |
| GraphQL auth bypass | 8.1 | High | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N |
| JWT none algorithm | 9.1 | Critical | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H |

> **UI for stored XSS is a judgment call.** Stored XSS that fires on page view is a long-standing CVSS gray area — NVD/FIRST frequently score it UI:R (which drops the stored-XSS row above to ~7.6). The UI:N above models "no extra action beyond normal page use"; if your triager expects UI:R, defend the choice or re-score before copying the number into a report.

### Metric Quick Guide

| What you have | Metric | Value |
|---|---|---|
| Exploitable over internet | AV | Network (N) |
| No special timing or race | AC | Low (L) |
| Free account needed | PR | Low (L) |
| No login needed | PR | None (N) |
| Admin needed | PR | High (H) |
| No victim action | UI | None (N) |
| Victim must click | UI | Required (R) |
| Reads all data | C | High (H) |
| Reads some data | C | Low (L) |
| Modifies all data | I | High (H) |
| Crashes service | A | High (H) |
| Affects only app | S | Unchanged (U) |
| Affects browser/OS/cloud | S | Changed (C) |

---

## 研究进度与报告判断

未能立即写出完整 PoC 时，记录具体证据缺口与下一步，按共同规则执行 20 分钟无进展复盘和 30～45 分钟深挖。值得继续且时间不足时，在聊天中申请加时。不得仅凭五分钟或三十分钟过去就认定线索无效。

现实前提、设计行为、项目规则和负面对照纳入八问判断。已经证明不成立的候选记录反证后换方向；尚待补证的候选保留研究状态。

---

## PRE-SEVERITY GATE

Before labelling any finding **Critical** or **High** anywhere in your notes or report — write out the answer to each of these as a one-liner. If you can't answer concretely, **the severity is wrong**.

1. **Have I validated the FULL chain to attacker-attainable impact, or only one primitive in the middle?**
   — "Primitive confirmed at layer N" ≠ exploitable. Multi-stage chains require ALL stages validated before the severity matches the chain's top end.
2. **What does the attacker walk away with, in one concrete sentence?**
   — "RCE on the SP front-end web server" is concrete. "Could lead to RCE" is not — that's High at best, often Medium.
3. **Have I personally reproduced the full chain end-to-end at least twice?**
   — Twice = once during discovery, once for the report screenshot/PoC. Not "I'm sure it would work."
4. **Is there an inheritance gate, signature check, audience check, or other validation step still gating the chain?**
   — If yes, the chain is not Critical. Document it as "primitive present" at lower severity until the gate is bypassed.
5. **Has the program rejected this severity class before?**
   — Many programs cap "info disclosure with no concrete impact" at Low/Info regardless of the data type. Read the program scope.

**Lesson from an authorized engagement:** JWT `alg:none` was initially labelled **Critical** based on the signature-bypass primitive being confirmed at the audience-validation layer. Subsequent testing showed the issuer-trust check still rejected unsigned tokens — the full ATO chain did not complete. Finding had to be retracted. If the Pre-Severity Gate had been run on the original draft, the impact and severity checks would have corrected the Critical label before submission.

---

## ANTI-PATTERNS THAT LOSE MONEY

```
Writing a report before confirming the bug exists (most common)
Submitting theoretical impact without proof
"The API returns more fields than necessary" (sensitivity matters — is it actually sensitive?)
Chaining A+B into one report when they're separate bugs (two separate payouts)
Reporting B saying "similar to A in my other report" — fresh Gate 0 for every bug
Overclaiming severity — triagers trust you less next time
Under-describing impact — triager doesn't understand why it matters
```

---

## RETRACTION DISCIPLINE

When a previously-claimed finding fails reproduction — **never silently drop it.** Document the retraction in the report's appendix. This proves to the triager that you validate your own work, and it saves them from chasing a phantom you've already disproved.

**Retraction entry template:**

```markdown
### Retracted: <finding name>

- **Original signal:** <one-line description of what looked like a bug>
- **Disproving evidence:** <concrete reproduction-step + observation that disproves it>
- **Why it looked like a bug:** <root cause of the false positive — e.g., natural marker collision, network jitter, status-code-only confidence>
- **Retraction date:** <YYYY-MM-DD>
```

**Concrete retractions from an authorized engagement — pattern reference:**

- **X-Forwarded-Proto reflection** — looked like header reflection across 4 pages; was the literal word `javascript` in SP help-link hrefs. Cause: non-unique marker.
- **Host header `:80@evil` bypass** — 200 OK on a path that normally 403s; body byte-identical to baseline (8341 bytes). Cause: status-code-only confidence; ELB Host normalisation dropped the `@evil` portion.
- **`download.aspx` file-existence oracle** — looked like a file-existence differentiator across path types; was SP's file-extension blocklist (`.ashx`/`.asmx`/`.svc`/`.config` always blocked regardless of existence). Cause: confusing server-side policy with file state.
- **`Administrator` timing leak** — single-shot 1527 ms vs ~700 ms control on Authentication.asmx Login; n=80 interleaved reproduction collapsed every group to 685-716 ms. Cause: single-sample statistical claim.

**Why this matters:** retracted findings put in an appendix demonstrate methodological honesty. Silently dropping them looks like you cherry-picked. A clean 11-finding report with a retraction appendix is more trustworthy than a 13-finding report where 2 fall apart at triage.

---

## Related Skills & Chains

- **`report-writing`** — When all 8 questions pass and the Pre-Severity Gate is clean. Workflow primitive: this skill is the gate that runs BEFORE `report-writing`; only findings that clear all 8Q + 4 pre-submission gates get the report-template handoff.
- **`bugcrowd-reporting`** — When a Bugcrowd VRT mapping is needed for an accepted finding. Workflow primitive: after this skill validates the finding, `bugcrowd-reporting` decides the VRT category and severity-request paragraph.
- **`evidence-hygiene`** — When the validated finding needs PoC evidence captured. Workflow primitive: this skill says "Q4 requires proof of impact"; `evidence-hygiene` provides the capture-and-redact protocol for that proof.
- **`security-arsenal`** — When checking the always-rejected / conditionally-valid tables. Workflow primitive: this skill's "Never Submit List" and `security-arsenal`'s "Always Rejected" table are aligned; either entry-point lookup decides whether a primitive is reportable alone or only with a chain.
- **`bb-methodology`** — When Phase 5 (Validate & Report) starts. Workflow primitive: Phase 5's pre-report gate explicitly invokes `/validate` (this skill's 8Q gate) before any report is drafted.

---

## Operator Notes

> Engagement-derived additions to the vendored foundation. Wisdom from real
> authorized engagements + Phase 2 verification across this repo's 31+
> skill-area live tests. The upstream methodology covers the WHAT; this
> layer covers the WHEN-IT-ACTUALLY-WORKS and the FAILURE-MODES.

### 八问中的常见证据误判

- URL 回显或自然词命中不直接证明注入执行；用 Q2 的复现证据和 Q5 的基线比较核对。
- 扩展名拒绝策略不直接证明文件存在；用 Q3 的因果证据和 Q5 的负面对照核对。
- HTTP 200 且响应体与拒绝页面一致，不直接证明数据泄露；用 Q4 的影响与 Q5 的结果判断。
- 报告 Critical/High 时，按 Q3、Q4、Q7、Q8 检查完整链、已证影响、实际范围及等级依据。

### Retraction discipline

If a finding stops reproducing 24h after submission — retract preemptively. Two reasons:

1. **Triagers retract for you with downgraded scoring.** A self-retraction reads "the researcher validates their own work." A triager-retraction reads "the researcher submitted noise."
2. **Validation rate is platform-tracked.** Self-retractions don't hit the same metric as triager-closed-as-N/A. Your reputation signal stays cleaner.

The retraction template in the RETRACTION DISCIPLINE section above is the canonical format. Don't silently delete — append a retraction appendix to the engagement report instead.

### 待补证时继续研究

某题暂时无法通过时，明确缺少哪项证据及可执行的下一步，沿用研究预算并按需要申请加时，再重新验证。问题定义和所有题号以[八问表](references/eight-question-gate.md)为准。
