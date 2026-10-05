---
name: hunt-dispatch
description: "Codex-native skill-set router for the bug-bounty orchestrator. Fingerprints an authorized target, selects platform attack skills, and loads the Red Team or WAPT skill set using the current task mode and blackbox or greybox context."
metadata:
  sources: community
  report_count: 0
---

> **工作流依据：** 限制仅使用[用户文件及已确认修改](../../OPERATOR_POLICY.md)，汇总见[共同规则](../../CODE_OF_CONDUCT.md)。本技能的技术步骤和证据方法供按需选用，正式报告统一回答八问。

## 共同执行规则

以[用户工作流](../../OPERATOR_POLICY.md)及本轮明确指令为准。取证读取[不同真实记录的 5 条计数规则](../bug-bounty/references/real-records.md)。登录与认证入口可以测试，正常登录不逐包审批；测试请求、改密与登出等操作遵循用户工作流。按共同时间规则继续有价值的方向，因时间暂停的候选登记[待续测表](../bug-bounty/references/time-deferred-findings.md)，任务结束时输出，由用户选择后续项目。


## 研究仪表盘

本地“渗透 / 漏洞 / 轨迹”视图使用 [research-dashboard](../research-dashboard/SKILL.md)。主工作流负责启动或恢复本项目仪表盘；记录本技能的加载、实际运行与结束状态，重要操作仍写入进度日志。资产、线索、证据关系和八问按实际结果更新；图谱展示不替代现有测试与报告规则。

# hunt-dispatch

skill-set loader for the `bug-bounty` orchestrator. one concept (which skills to load), one place.

## engagement context

范围、请求审批、数据读取、时间、证据保存与报告判断使用用户文件和最新明确修改。平台与任务类型帮助选择方法，不增加测试进入门槛；足够证据后停止新增真实记录读取，根因扩散与其他研究继续按用户安排执行。

invocation contract:

```
hunt-dispatch mode=redteam
hunt-dispatch mode=wapt box=blackbox
hunt-dispatch mode=wapt box=greybox
```

## recon handoff (ALL modes, before step 0)

Load the [shared information-collection contract](../web2-recon/SKILL.md) and the current
`site-queue.csv`. This router runs only when the requested task includes testing; a
collection-only task is delivered before dispatch. Use the producer's exact `RECON_DIR`.

`live-sites.txt` contains one validated, in-scope HTTP(S) origin per line, including scheme
and any non-default port. `live-hosts.txt` contains bare hostnames for tools that need them.
Check the list's scope, observation time, format, and queue correspondence before requests.
Repair missing/invalid exports; if no eligible origins exist, report the queue's reasons and
continue other permitted collection work. Never silently substitute `$TARGET` for a missing list.

Before selecting or resuming a site, read the [shared value/time policy](../bug-bounty/references/value-and-time.md). Carry its provisional value tier and evidence reason, current mode, lead ID, actual elapsed time, last progress and extension status forward from the queue. Prioritize eligible Tier 0/1 leads; keep unknown sites for classification. Declare deep work before entering its 30-45 minute time box; preserve the same lead timer on resume and follow the one-extension approval process at the deadline. Record every rotation and remaining coverage item.

Platform skill loading tiers later in this file rank context-loading precedence. Website value Tier 0–3 and research timing follow the shared policy above, including when a routed `hunt-*` skill contains different generic timing advice.

The shell examples below assume Bash and the established absolute `RECON_DIR`:

```bash
LIVE_SITES="$RECON_DIR/live-sites.txt"
if [ ! -s "$LIVE_SITES" ]; then
  printf '%s\n' 'No live-site handoff: review inventory and queue before dispatch.' >&2
  exit 1
fi
```

Keep each sub-site's business type, evidence, result, and next action linked to its own queue
entry. A failure or pause on one origin does not mark the remaining origins complete.

## step 0 — 404 baseline (ALL modes, mandatory, before any enumeration)

run this for **every** host before probing a single path. the example takes two requests per
origin and it is the cheapest false-positive kill in the whole toolkit.

many modern estates (SPA / Next.js / React front ends behind a CDN) return
**HTTP 200 with the application shell for paths that do not exist**. a status code
therefore proves nothing. without a recorded control, `/.well-known/security.txt`,
`/api/revalidate`, `/__nextjs_original-stack-frame` and `/__nextjs_launch-editor`
all "exist" on a host where none of them do.

```bash
BASELINE_BODY=$(mktemp)
while IFS= read -r SITE; do
  SITE=${SITE%$'\r'}
  [ -n "$SITE" ] || continue
  for P in /zzz-nope-12345 /qqq-other-98765; do
    printf "%-34s %-20s " "$SITE" "$P"
    if curl -sS -m 12 -o "$BASELINE_BODY" -w "%{http_code} %{size_download} " "${SITE%/}$P"; then
      shasum "$BASELINE_BODY" | cut -c1-12
    else
      printf '%s\n' 'request failed; record the error for this origin'
    fi
  done
done < "$LIVE_SITES"
rm -f "$BASELINE_BODY"
```

record per host: **status, byte length, body hash**. that triple is the control.

**the rule: no path is "found" until its response differs from the control.**
a 200 that matches the control hash is a soft 404. a 404 whose body differs from
the control may be a real handler. compare bodies, never status codes alone.

re-derive the baseline per host — it differs across an estate. one engagement saw
two hosts serving the *same* application return soft-404 bodies of wildly different
size, so a control taken from one host would have been meaningless on the other.
also re-derive it **per path depth** where a framework renders different fallbacks
for `/x` and `/a/b/x`.

edge pages are not origin findings: a CDN "Access Denied" / "Unsupported Request"
body means the request never reached the application. classify it as edge
behaviour and move on.

## step 1 — fingerprint (red team only)

fingerprint **every** live host, not just the apex. for multi-host / wildcard
targets the platform-skill routing must be driven by all banners, not one host's.

Inspect redirect Location headers and follow only destinations already covered by the
confirmed scope; record unknown destinations for ownership triage first. Collect headers and
HTML for each eligible origin. Redirects and body-only framework markers can affect routing.
The example reads the initial response; allowed follow-up hops are recorded separately.

```bash
FP_BODY=$(mktemp)
while IFS= read -r SITE; do
  SITE=${SITE%$'\r'}
  [ -n "$SITE" ] || continue
  printf '=== %s ===\n' "$SITE"
  if curl -sS -m 12 -D - -o "$FP_BODY" "$SITE"; then
    grep -aoE '__NEXT_DATA__|/_next/|VIEWSTATE|rO0[AB]|laravel_session|Ignition|Telescope|Whitelabel|/actuator|application/grpc|socket\.io|swagger|\.js\.map' \
      "$FP_BODY" | sort -u
  else
    printf '%s\n' 'fingerprint request failed; record error and continue the queue' >&2
  fi
done < "$LIVE_SITES"
rm -f "$FP_BODY"
```

Record which signal came from which origin and update its queue entry. A platform skill
matched on site B does not imply site A runs that stack. Scheme and port come from the
origin list, so an HTTP site or non-default port is not silently converted to HTTPS/443.

look for the following signals → platform skill mapping:

```
okta.com | auth0.com | pingidentity         →  okta-attack
login.microsoftonline.com | outlook | sts   →  m365-entra-attack
pulse | fortinet | ivanti | citrix          →  enterprise-vpn-attack
vsphere | vcenter | :9443                   →  vmware-vcenter-attack
amazonaws | azure | googleapis | gcp        →  cloud-iam-deep
github.com/<org>/                           →  supply-chain-attack-recon
.apk | play.google.com                      →  apk-redteam-pipeline
MongoDB | mongoose | CouchDB | Redis        →  hunt-nosqli
?page= | ?file= | ?path= | php wrapper      →  hunt-lfi
rO0A | VIEWSTATE | rememberMe cookie        →  hunt-deserialization
Access-Control-Allow-Origin header          →  hunt-cors
/forgot-password | /reset | X-Forwarded    →  hunt-host-header
?redirect= | ?next= | ?return= | ?url=     →  hunt-open-redirect
OTP | /verify | /2fa | no-rate-limit        →  hunt-brute-force
Set-Cookie session | PHPSESSID              →  hunt-session
Active Directory | LDAP | OpenLDAP | ADFS  →  hunt-ldap
__NEXT_DATA__ | /_next/ | buildId           →  hunt-nextjs
X-Powered-By: Express | Node.js | .js stack →  hunt-nodejs
postMessage | dangerouslySetInnerHTML        →  hunt-dom
WebSocket | ws:// | socket.io               →  hunt-websocket
gRPC | :50051 | application/grpc            →  hunt-grpc
laravel_session | Ignition | Telescope       →  hunt-laravel
X-Application-Context | Whitelabel | /actuator → hunt-springboot
:6443 | :10250 | :2379 | kubectl            →  hunt-k8s
.github/workflows | Jenkins | GitLab CI     →  hunt-cicd
.js.map | swagger.json | /.env              →  hunt-source-leak
HSTS missing | SPF | DMARC | AXFR           →  hunt-tls-network
```

### conflict resolution & load budget

real targets almost always return multiple signals at once — e.g. a single host
can show Cloudflare (CDN) + `login.microsoftonline.com` (redirect) + `__NEXT_DATA__`
(Next.js front end) + `amazonaws` (origin) simultaneously. loading every match
blindly can pull 20-plus skills and blow the context window, drowning the
high-signal skill in noise. 可参考以下优先顺序：

**priority order (load according to current evidence):**

```
tier 1  identity / SSO fabric    okta-attack, m365-entra-attack
        (own the auth boundary — highest blast radius if compromised)
tier 2  perimeter appliances     enterprise-vpn-attack, vmware-vcenter-attack
        (pre-auth RCE / direct internal foothold)
tier 3  cloud / IAM              cloud-iam-deep, hunt-cloud-misconfig
        (credential → lateral movement)
tier 4  app framework / stack    hunt-nextjs, hunt-nodejs, hunt-laravel,
        hunt-springboot, hunt-aspnet, hunt-sharepoint
tier 5  protocol / class signals hunt-nosqli, hunt-lfi, hunt-deserialization,
        hunt-cors, hunt-host-header, hunt-open-redirect, hunt-grpc,
        hunt-websocket, hunt-dom, hunt-k8s, hunt-cicd, hunt-source-leak,
        hunt-tls-network, hunt-ldap, hunt-brute-force, hunt-session
```

根据当前线索按需加载技能；优先顺序可作参考，不设置固定 8 个技能上限。

**de-dup rules (avoid loading two skills for the same evidence):**

- CDN banner alone (Cloudflare/Akamai/Fastly) is **not** a platform match — it
  fingerprints the edge, not the app. do not load a skill for it; note it for
  `hunt-cache-poison` / `hunt-http-smuggling`, which the mode set already carries.
- `amazonaws` / `azure` / `googleapis` in a **header/origin** → `cloud-iam-deep`.
  the same string found as a **leaked key/JSON in a JS bundle or APK** → still
  `cloud-iam-deep`, but flag it as a live-credential lead (higher priority, tier 3
  becomes tier 1 for that host).
- a framework marker (`__NEXT_DATA__`, `laravel_session`) and a generic class
  signal (`?redirect=`, `Access-Control-Allow-Origin`) on the same host → load the
  framework skill (tier 4) and keep the class skill as needed for the evidence;
  the WAPT/redteam mode set already loads the common class skills unconditionally.

## step 2 — load skill set

invoke each skill in order via the Skill tool.

### mode=redteam

always-on (load first):

```
redteam-mindset
mid-engagement-ir-detection
```

platform (load second, conditional on fingerprint matches from step 1):

```
okta-attack
m365-entra-attack
enterprise-vpn-attack
vmware-vcenter-attack
cloud-iam-deep
supply-chain-attack-recon
apk-redteam-pipeline
```

high-impact hunt-* set (load third):

```
hunt-rce
hunt-sqli
hunt-ssrf
hunt-ato
hunt-auth-bypass
hunt-saml
hunt-oauth
hunt-mfa-bypass
hunt-file-upload
hunt-http-smuggling
hunt-cloud-misconfig
hunt-sharepoint
hunt-aspnet
```

report format: `redteam-report-template` (subject / observations / description / impact / recommendation / poc).

### mode=wapt

always-on:

```
bb-methodology
security-arsenal
triage-validation
```

full hunt-* set (all OWASP-relevant):

```
hunt-xss             hunt-sqli            hunt-ssrf            hunt-idor
hunt-csrf            hunt-xxe             hunt-rce             hunt-graphql
hunt-oauth           hunt-saml            hunt-mfa-bypass      hunt-auth-bypass
hunt-ato             hunt-file-upload     hunt-business-logic  hunt-race-condition
hunt-llm-ai          hunt-api-misconfig   hunt-ssti            hunt-cache-poison
hunt-http-smuggling  hunt-subdomain       hunt-cloud-misconfig hunt-misc
hunt-aspnet          hunt-sharepoint      hunt-ntlm-info
hunt-lfi             hunt-nosqli          hunt-deserialization
hunt-cors            hunt-host-header     hunt-open-redirect
hunt-brute-force     hunt-session         hunt-ldap
hunt-nextjs          hunt-nodejs          hunt-dom
hunt-websocket       hunt-grpc            hunt-laravel
hunt-springboot      hunt-k8s             hunt-cicd
hunt-source-leak     hunt-tls-network
```

report format: `report-writing` (`bugcrowd-reporting` if the target is on bugcrowd).

box=greybox: credentials are provided for the engagement; evidence storage follows the user file.

可先检查登录状态、账号角色与 MFA 状态，便于选择认证或授权测试；这不是额外进入门槛。示例：

```bash
# session-cookie creds: one authenticated GET against an identity echo endpoint
curl -sS -m 12 -b "$SESSION_COOKIE" "https://$TARGET/api/me" -w '\n%{http_code}\n'
#   200 + your username/email  → live session, role visible in body
#   401/403                    → session absent or insufficient; record actual state

# bearer/JWT creds: same probe with Authorization
curl -sS -m 12 -H "Authorization: Bearer $TOKEN" \
  "https://$TARGET/api/me" -w '\n%{http_code}\n'

# raw user/pass: drive the real login flow once, capture Set-Cookie, then echo
#   watch for an MFA / step-up challenge in the response — if present, the creds
#   alone do not yield an authenticated session (record actual session state)
```

confirm three things from the preflight, and record them for the hunt-\* skills:

1. **live** — auth probe returns 200, not 401/403.
2. **role/privilege** — the `/api/me` (or equivalent) body shows the expected
   role/tenant/scopes. IDOR and authz tests need a known baseline identity; a
   silently-admin or silently-readonly cred skews every authz finding.
3. **not MFA-gated** — login did not stop at a 2fa/step-up challenge. if it did,
   you hold creds but **not** a session — default to least capability and confirm
   with the operator before claiming authenticated reach.

登录状态未知或失败时记录事实，可继续用户允许的未认证方向；需要有效会话的测试按实际会话状态安排。

## step 3 — taxonomy print (once, at session start)

emit a deterministic block. plain text, lowercase, colon-delimited, no decoration.

### mode=redteam

```
loaded for red team: {N} skills
  mindset:    redteam-mindset
  platform:   {fingerprint-matched skills, or "none detected"}
  deferred:   {skills not yet needed, or omit line if none}
  auth:       hunt-ato, hunt-auth-bypass, hunt-saml, hunt-oauth, hunt-mfa-bypass
  inj:        hunt-rce, hunt-sqli, hunt-ssrf, hunt-file-upload
  infra:      hunt-http-smuggling, hunt-cloud-misconfig
  stack:      hunt-sharepoint, hunt-aspnet
  ir:         mid-engagement-ir-detection
```

### mode=wapt

```
loaded for wapt ({blackbox|greybox}): {N} skills
  inj:        hunt-xss, hunt-sqli, hunt-ssrf, hunt-rce, hunt-xxe, hunt-ssti, hunt-file-upload
  authz:      hunt-idor, hunt-auth-bypass, hunt-ato
  auth:       hunt-oauth, hunt-saml, hunt-mfa-bypass
  api:        hunt-graphql, hunt-api-misconfig
  logic:      hunt-business-logic, hunt-race-condition
  infra:      hunt-http-smuggling, hunt-cache-poison
  recon:      hunt-subdomain
  cloud:      hunt-cloud-misconfig
  ai:         hunt-llm-ai
  stack:      hunt-aspnet, hunt-sharepoint, hunt-ntlm-info
  misc:       hunt-misc, hunt-csrf
  reporting:  bb-methodology, security-arsenal, triage-validation
```

## 委派时交接用户规则

如实际使用子代理，将当前资产清单、用户文件、已批准请求、时间预算、真实记录台账和待续测表一同交接。公司ICP备案符合用户规则的资产纳入范围，其他公司或未知归属待确认。各代理共用同一漏洞的数据计数，不新增按路径关键词拒绝测试的 deny-list。

## step 4 — return control to the bug-bounty orchestrator

After permitted baseline and fingerprint requests and taxonomy output, return the evidence and queue to `bug-bounty` for focused testing. Record each request and follow the same scope, methods and time budget.

## 证据保存

保存位置与可选脱敏按用户文件七执行。

## Related Skills & Chains

- **`bb-methodology`** — When PART 0 mode confirmation completes. Workflow primitive: `bb-methodology` confirms engagement type (red team vs WAPT vs bug bounty); the answer feeds directly into this skill's `mode=redteam` / `mode=wapt` invocation.
- **`redteam-mindset`** + **`mid-engagement-ir-detection`** — When `mode=redteam` is loaded. Workflow primitive: these are the always-on skills loaded first by step 2 of the redteam flow before any platform skill or hunt-* skill.
- **`okta-attack`** / **`m365-entra-attack`** / **`enterprise-vpn-attack`** / **`vmware-vcenter-attack`** / **`cloud-iam-deep`** / **`supply-chain-attack-recon`** / **`apk-redteam-pipeline`** — When fingerprint signals match. Workflow primitive: step 1's curl fingerprint scan against `RECON_DIR/live-sites.txt` maps banner / domain signals to one or more of these platform skills.
- **`hunt-rce`** / **`hunt-sqli`** / **`hunt-ssrf`** / **`hunt-ato`** / **all other hunt-* skills`** — When the mode-specific skill set is being printed. Workflow primitive: this skill is the loader; it names the hunt-* skills but performs permitted baseline probes and returns evidence to `bug-bounty` for focused hunting.
- **`report-writing`** vs **`redteam-report-template`** — When the taxonomy print specifies the report format. Workflow primitive: `mode=wapt` ends with `report-writing` as the deliverable format; `mode=redteam` ends with `redteam-report-template` instead.
