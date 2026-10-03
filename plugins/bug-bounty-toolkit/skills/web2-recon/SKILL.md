---
name: web2-recon
description: "Web2 recon pipeline — subdomain enumeration (subfinder, Chaos API, assetfinder), live host discovery (dnsx, httpx), URL crawling (katana, waybackurls, gau), directory fuzzing (ffuf), JS analysis (LinkFinder, SecretFinder), continuous monitoring (new subdomain alerts, JS change detection, GitHub commit watch). Use when starting recon on any web2 target or when asked about asset discovery, subdomain enum, or attack surface mapping."
metadata:
  sources: community, public_research
---

> **工作流依据：** 限制仅使用[用户文件及已确认修改](../../OPERATOR_POLICY.md)，汇总见[共同规则](../../CODE_OF_CONDUCT.md)。本技能的技术步骤和证据方法供按需选用，正式报告统一回答八问。

# WEB2 RECON PIPELINE

## 信息收集：ARL 主采集，Toolkit 补充与逐站分析

默认流程：**提供目标公司与起始域名 → ARL 收集 → 导入与去重 → 核对归属和在线证据 → 生成站点清单 → 按业务逐站深入收集 → 输出覆盖情况与后续计划。**

本节是主工作流、ARL 导入和后续分发共同遵守的信息收集流程。遵守用户本次允许的方法、范围和请求预算；已有授权和偏好沿用，不重复询问。用户只要求信息收集时，完成到收集结果和后续计划，不自动进入漏洞验证。

### 1. 使用 ARL 建立基础资产清单

- ARL 为默认的批量资产收集来源。优先复用范围相符、时间合适的已完成任务；记录任务 ID、目标、选项、完成时间、域名和站点数量。
- 使用 [`arl-results`](../arl-results/SKILL.md) 读取任务以及 domain/site/ip 结果；分页读完，核对导入数量与 API 总数。运行中、失败或部分导出的任务标记为 `partial`，不能当作完整结果。
- 当前 ARL 连接脚本只能读取结果，不能创建或重跑任务。没有合适任务时，给出本次任务配置，待用户执行后读取；若现有授权允许 Toolkit 补充收集，可继续可执行的补充工作并记录来源，不能宣称 ARL 已执行。
- ARL 不可用、数据源缺少 API Key、工具缺失或网络失败时，记录具体缺口；用已验证可用的 Toolkit 工具补充允许的部分。Skill 写有命令不代表工具已安装。
- 保留每条候选资产的来源、任务 ID 和时间。去重不丢失来源。不同域名共用 CDN/IP 不合并成同一资产，也不由一个域名推出整段 CDN/IP 均属于目标公司。

### 2. 核对归属、在线证据与数据质量

- 使用 [`recon-scope-triage`](../recon-scope-triage/SKILL.md) 核对归属。按用户已确定的公司范围规则，ICP备案主体属于指定公司的域名纳入范围，记录备案主体、查询来源和时间；其他公司或归属未确认的候选进入待确认列表。
- 已有明确授权的起始资产保留授权依据。新发现的其他域名、接口主机和跳转目标重新核对归属与范围，不因页面引用或名称相近自动跟进。
- 将“发现域名”“DNS 成功”“得到 HTTP 响应”“业务可访问”分别记录。ARL 历史站点记录附带原始时间，不能直接宣称当前仍在线。
- 对范围内资产，按已允许的方式、速率和本轮时效要求补充最小 DNS/HTTP 确认；纯被动收集模式保留历史或未知状态，不自动探测。记录 HTTP 状态、页面标题和跳转位置；401/403 记录为已响应但访问受限，不直接当作离线或没有价值。
- 网络错误、TLS 错误、验证码和鉴权阻碍分别记录。发现 `198.18.0.0/15` 等代理合成地址或明显泛解析时，隔离异常记录、查明解析环境并重新确认，不能把这些 IP 当作目标公网资产继续扫描。修复前的异常历史任务不直接回灌。

### 3. 生成统一交接文件和逐站队列

在本次批准的工作目录内确定唯一的 `RECON_DIR`，默认 `recon/<起始域名>/`；所有生产者和消费者使用同一个绝对目录。不同轮次的来源、状态和时间必须可区分，避免混用旧清单。

| 文件 | 内容与格式 |
|---|---|
| `asset-inventory.csv` | 所有候选及来源；至少包含 hostname、source、task_id、collected_at、owner、ownership_evidence、scope_status、dns_status、http_status、observed_at、error。无证据的字段明确记为 unknown。 |
| `pending-assets.csv` | 归属未确认、属于其他公司或等待用户范围决定的候选，附原因和已知公司名称。 |
| `subdomains.txt` | 已确认在范围内的域名，每行一个，纯域名；不把原始候选直接送进探测器。 |
| `live-sites.txt` | 当前轮已确认响应且在范围内的 HTTP(S) origin，每行一个，例如 `https://app.example.com` 或 `http://query.example.com:8080`；无路径、标题、状态码、凭据或其他注释。保留协议和非默认端口。 |
| `live-hosts.txt` | 从同一批 `live-sites.txt` 用 URL 解析器提取并去重的 hostname，每行一个纯主机名；后续 HTTP 请求必须读取 `live-sites.txt`，避免丢失协议/端口或重复拼接 https。 |
| `site-queue.csv` | 每个已纳入范围的候选站点一条队列记录；多协议/端口按 origin 区分。尚无在线证据的候选保留 hostname、空 origin 和原因，不假造在线 URL。字段至少含 hostname、origin、business_types、value_tier、value_reason、priority、status、reason、evidence_path、next_action、updated_at，以及 current_mode、lead_id、started_at、elapsed_work_seconds、last_progress_at、planned_minutes、extension_count、extension_status；计时与状态沿用共同规则。 |
| `urls.txt` / `jsfiles.txt` | 去重的 URL/JS 线索。新主机先回到归属核对；历史 URL 不等于当前接口存在，也不代表获准自动访问。 |
| `progress.jsonl` | 追加记录逐站动作、来源、结果、失败原因与下一步；每条关联 hostname/origin，包含共同规则中的分级、模式、时间、进展与延长事件字段。凭据不写入队列或进度。 |

`live-sites.txt` 与 `live-hosts.txt` 必须实际写出并验证格式、范围、来源轮次和队列一致性；不能只在文档中画出 `/tmp` 文件的搬运箭头。原始工具 JSON/标题输出单独保存。没有在线站点时写出明确的零结果和失败/待确认状态。

### 4. 按业务分类，逐站深入收集

先读取[网站价值分类与时间安排](../bug-bounty/references/value-and-time.md)，为每个站点记录业务类型（可多选）、暂定 Tier 0–3/unknown、证据理由及阶段时间。优先 Tier 0/1，信息不足的站点保留分类待办；优先级决定顺序，未处理子站保留覆盖记录。按用户后续提供的业务思路调整；当前默认收集重点如下：

| 业务类型 | 默认收集重点 |
|---|---|
| 支付、订单、余额 | 页面与流程步骤、角色、正常业务请求中的接口关系、金额/订单/状态字段；收集阶段不提交真实付款、退款或修改订单。 |
| 企业介绍、内容展示 | 站点结构、公开链接、JS 引用、公开文档和关联业务入口；静态页面仍记录检查结果。 |
| 业务系统、管理平台 | 功能模块、已有合法会话下的角色边界、前端接口、数据流与关键操作入口。 |
| 查询、搜索、报表 | 查询条件、分页、结果字段、公开 API 和导出入口的描述；不以批量下载数据代替接口梳理。 |
| 登录、身份、SSO | 登录/回调页面、正常跳转链、会话边界和身份服务关系；登录按既有规则执行。 |
| API、文件、其他或未知 | 文档、请求格式、上传/下载/预览入口与 JS 线索；无法分类时记录原因和待补信息。 |

- 对每站在许可范围内收集页面、技术信息、接口、JS、历史 URL 和业务关系。Toolkit 的被动多源检索补充 ARL 缺口，页面/JS 分析服务于具体业务梳理；避免无目的重复全量枚举。
- 新子资产持续追加到清单，经过归属核对后入队。访问新主机前检查范围；跟随重定向也遵守此规则。
- 队列状态使用 `queued`、`in_progress`、`completed`、`blocked`、`failed`、`deferred`。`completed` 只表示约定收集步骤有证据，不表示没有漏洞或已完成测试。其他状态必须写明原因；`deferred` 需要记录用户指定的缩小范围、时间/请求预算或其他实际依据。
- 遵守共同规则中的 20 分钟无进展复盘、≤3 分钟异常快验和 30～45 分钟深挖安排；收集模式只记录研究线索。静态页、403 或价值较低时记录实际证据与处理理由，按队列继续其他可执行站点，受阻和延期项保留待办。

### 5. 完成信息收集并交给下一阶段

- 输出候选总数、范围内资产数、待确认数、已响应 origin 数，以及队列各状态数量；队列总数必须等于各状态数量之和。
- 逐站列出业务类型、value_tier 与分级理由、研究模式、实际投入时间、延长状态、已执行步骤、证据位置、信息缺口和后续计划。只检查起始域名不能写成全部子资产已覆盖；有排队/受阻/失败/延期项时明确说明未完成范围。
- 交接时提供 `RECON_DIR`、站点清单与状态记录。仅当用户任务包含后续测试时，才由 `hunt-dispatch` 选择已在范围内且符合本次方法要求的站点继续；纯信息收集到此交付结果。
- 清单缺失或格式错误时，先修复导出/路径；清单为空时检查归属、解析和抓取结果。禁止静默退回仅处理 `$TARGET`。确为单站点任务时也先将它核对并写入同一清单。

以下技术示例为按需选用的工具参考；变量均使用已确定的 `RECON_DIR`。目录/参数 fuzzing、Nuclei 和漏洞验证属于后续测试，不因完成收集而自动执行。周期监控仅在用户明确要求时配置。

---

## ATTACK SURFACE TRIAGE

### Find Interesting Targets in URL List

```bash
# Parameters worth testing
cat "$RECON_DIR/urls.txt" | grep -E "[?&](id|user|file|path|url|redirect|next|src|token|key|api_key)=" | tee "$RECON_DIR/interesting-params.txt"

# API endpoints
cat "$RECON_DIR/urls.txt" | grep -E "/api/|/v1/|/v2/|/v3/|/graphql|/rest/|/gql" | tee "$RECON_DIR/api-endpoints.txt"

# File upload endpoints
cat "$RECON_DIR/urls.txt" | grep -E "upload|file|attachment|document|image|avatar|photo|media" | tee "$RECON_DIR/uploads.txt"

# Admin/internal paths
cat "$RECON_DIR/urls.txt" | grep -E "/admin|/internal|/debug|/test|/staging|/dev|/management|/console" | tee "$RECON_DIR/admin-paths.txt"

# Authentication endpoints
cat "$RECON_DIR/urls.txt" | grep -E "/oauth|/login|/auth|/sso|/saml|/oidc|/callback|/token" | tee "$RECON_DIR/auth-paths.txt"
```

### gf Patterns (Quick Classification)

```bash
# Install gf patterns: https://github.com/tomnomnom/gf
cat "$RECON_DIR/urls.txt" | gf xss | tee "$RECON_DIR/xss-candidates.txt"
cat "$RECON_DIR/urls.txt" | gf ssrf | tee "$RECON_DIR/ssrf-candidates.txt"
cat "$RECON_DIR/urls.txt" | gf idor | tee "$RECON_DIR/idor-candidates.txt"
cat "$RECON_DIR/urls.txt" | gf sqli | tee "$RECON_DIR/sqli-candidates.txt"
cat "$RECON_DIR/urls.txt" | gf redirect | tee "$RECON_DIR/redirect-candidates.txt"
cat "$RECON_DIR/urls.txt" | gf lfi | tee "$RECON_DIR/lfi-candidates.txt"
cat "$RECON_DIR/urls.txt" | gf rce | tee "$RECON_DIR/rce-candidates.txt"
```

---

## JS ANALYSIS

### SecretFinder (API keys, tokens in JS bundles)

```bash
# Activate venv
source ~/tools/SecretFinder/.venv/bin/activate

# Scan a single JS file
python3 ~/tools/SecretFinder/SecretFinder.py -i "https://target.com/static/js/main.js" -o cli

# Scan all JS URLs found in recon
cat "$RECON_DIR/urls.txt" | grep "\.js$" | head -50 | while read url; do
  echo "=== $url ==="
  python3 ~/tools/SecretFinder/SecretFinder.py -i "$url" -o cli 2>/dev/null
done

deactivate
```

### LinkFinder (Endpoints hidden in JS)

```bash
source ~/tools/LinkFinder/.venv/bin/activate

# Single JS file
python3 ~/tools/LinkFinder/linkfinder.py -i "https://target.com/app.js" -o cli

# All pages (crawls JS from HTML)
python3 ~/tools/LinkFinder/linkfinder.py -i "https://target.com" -d -o cli

deactivate
```

---

## DIRECTORY FUZZING

### ffuf — Standard Fuzzing

```bash
# Directory discovery on a live host
ffuf -u "https://target.com/FUZZ" \
     -w ~/wordlists/common.txt \
     -mc 200,201,204,301,302,307,401,403 \
     -ac \
     -t 40 \
     -o "$RECON_DIR/ffuf-dirs.json"

# API endpoint discovery
ffuf -u "https://target.com/api/FUZZ" \
     -w ~/wordlists/api-endpoints.txt \
     -mc 200,201,204,301,302 \
     -ac \
     -t 20

# IDOR fuzzing with authenticated request
# Create req.txt with Authorization: Bearer TOKEN
ffuf -request /tmp/req.txt \
     -request-proto https \
     -w <(seq 1 10000) \
     -fc 404 \
     -ac \
     -t 10
```

---

## 网站价值排序

按[共同价值与时间规则](../bug-bounty/references/value-and-time.md)使用 Tier 0 → Tier 1 → Tier 2 → Tier 3 选择可执行站点，保存业务入口、分级理由与证据。未知价值先补分类；低价值配置保留基础收集结果，有直接业务影响链时重新评估。赏金金额、公司规模或静态页面本身不能删除队列中的站点。研究安排使用用户的阶段时间盒，逐站交接剩余问题。

---

## TECH STACK DETECTION（按需，计入当前阶段）

```bash
# Response headers reveal backend
curl -sI https://target.com | grep -iE "server|x-powered-by|x-aspnet|x-runtime|x-generator"

# Common signals:
# Server: nginx + X-Powered-By: PHP/7.4 → PHP backend
# Server: gunicorn OR X-Powered-By: Express → Python/Node.js
# X-Powered-By: ASP.NET → .NET
# Server: Apache Tomcat → Java
# X-Runtime: Ruby → Ruby on Rails

# Framework from JS bundle paths:
# /_next/static/ → Next.js
# /static/js/main.chunk.js → CRA (React)
# /packs/ → Ruby on Rails + Webpacker
# /__nuxt/ → Nuxt.js (Vue)
```

### Stack → Primary Bug Class Map

| Stack | Hunt First | Hunt Second |
|---|---|---|
| Ruby on Rails | Mass assignment | IDOR (`:id` routes) |
| Django | IDOR (ModelViewSet, no object perms) | SSTI (mark_safe) |
| Flask | SSTI (render_template_string) | SSRF (requests lib) |
| Laravel | Mass assignment ($fillable) | IDOR (Eloquent, no ownership) |
| Express (Node.js) | Prototype pollution | Path traversal |
| Spring Boot | Actuator endpoints (/actuator/env) | SSTI (Thymeleaf) |
| ASP.NET | ViewState deserialization | Open redirect (ReturnUrl) |
| Next.js | SSRF via Server Actions | Open redirect via redirect() |
| GraphQL | Introspection → auth bypass on mutations | IDOR via node(id:) |
| WordPress | Plugin SQLi | REST API auth bypass |

---

## CONTINUOUS MONITORING SETUP

Only configure recurring monitoring when the user explicitly requests it. These are reference examples, not automatic steps of information collection.

### New Subdomain Alerts (daily cron)

```bash
#!/bin/bash
TARGET="target.com"
KNOWN="/tmp/$TARGET-subs-known.txt"

subfinder -d $TARGET -silent > /tmp/$TARGET-subs-fresh.txt
curl -s "https://dns.projectdiscovery.io/dns/$TARGET/subdomains" \
  -H "Authorization: $CHAOS_API_KEY" \
  | jq -r '.[]' >> /tmp/$TARGET-subs-fresh.txt

# Diff against known
NEW=$(comm -23 <(sort /tmp/$TARGET-subs-fresh.txt) <(sort $KNOWN 2>/dev/null))

if [ -n "$NEW" ]; then
  echo "NEW SUBDOMAINS: $NEW"
  echo "$NEW" >> $KNOWN
fi

# Schedule: crontab -e → 0 8 * * * /bin/bash ~/monitors/subs-watch.sh
```

### GitHub Commit Watch

```bash
#!/bin/bash
REPO="TargetOrg/target-app"
LAST_SHA="/tmp/$REPO-last-sha.txt"

CURRENT=$(curl -s "https://api.github.com/repos/$REPO/commits?per_page=1" | jq -r '.[0].sha')
KNOWN=$(cat $LAST_SHA 2>/dev/null)

if [ "$CURRENT" != "$KNOWN" ]; then
  echo "New commit on $REPO: $CURRENT"
  echo $CURRENT > $LAST_SHA
  # Get changed files
  curl -s "https://api.github.com/repos/$REPO/commits/$CURRENT" \
    | jq -r '.files[].filename' | grep -E "auth|middleware|route|permission|role|admin"
fi

# Schedule: */30 * * * * /bin/bash ~/monitors/github-watch.sh
```

---

## PORT SCANNING (often skipped — don't skip)

```bash
# naabu — fast port scanner from ProjectDiscovery
# Finds non-standard ports: 8080, 8443, 3000, 8888, 9000, etc.
cat "$RECON_DIR/live-hosts.txt" | naabu -port 80,443,8080,8443,3000,4000,5000,8000,8888,9000,9090,9200,6379 -silent | tee "$RECON_DIR/open-ports.txt"

# Why this matters: admin panels, debug services, internal APIs often run on alt ports
# Example wins: :8080/actuator/env (Spring Boot), :9200/_cat/indices (Elasticsearch), :6379 (Redis)
```

## SECRET SCANNING IN JS BUNDLES

```bash
# trufflehog — high-signal secret detection with entropy analysis
# Scans JS files and git repos
pip install trufflehog3 2>/dev/null || true
trufflehog filesystem --only-verified recon/$TARGET/ 2>/dev/null

# SecretFinder — manual JS bundle scan (already in tools/)
source ~/tools/SecretFinder/.venv/bin/activate
cat "$RECON_DIR/urls.txt" | grep "\.js$" | head -100 | while read url; do
  python3 ~/tools/SecretFinder/SecretFinder.py -i "$url" -o cli 2>/dev/null
done
deactivate

# Quick grep for common patterns in downloaded JS
wget -q -r -l 1 -A "*.js" -P /tmp/js-files/ "https://$TARGET" 2>/dev/null
grep -rn "api_key\|apiKey\|client_secret\|access_token\|private_key\|AWS_SECRET\|AKIA" /tmp/js-files/ 2>/dev/null
```

## GITHUB DORKING FOR TARGET

```bash
# Search GitHub for hardcoded secrets before hunting the app
TARGET_ORG="TargetOrgName"  # Check their GitHub org

# Useful dorks (search on github.com):
# org:TARGET_ORG password
# org:TARGET_ORG api_key
# org:TARGET_ORG "Authorization: Bearer"
# org:TARGET_ORG .env
# org:TARGET_ORG "BEGIN RSA PRIVATE KEY"

# CLI with gh (GitHub CLI):
gh search code "api_key" --owner "$TARGET_ORG" --json path,repository 2>/dev/null | jq '.'
gh search code "password" --owner "$TARGET_ORG" --json path,repository 2>/dev/null | head -20

# GitDorker (if installed):
python3 ~/tools/GitDorker/GitDorker.py -t GITHUB_TOKEN -d ~/tools/GitDorker/Dorks/alldorksv3 -q "$TARGET" -org
```

## 逐站收集与研究安排

使用[共同价值与时间规则](../bug-bounty/references/value-and-time.md)，先对每站写 30 秒～1 分钟的轻量计划，再按业务需要收集允许的页面、JS、接口关系与正常流程证据。ARL 的外部任务耗时单独记录，导入后沿用统一站点清单和价值队列。

连续 20 分钟无有效进展时复盘并记录下一步。发现高价值线索，且本轮任务包含测试时，立即评估并宣布 30～45 分钟深挖，追踪完整数据流；到期收束或申请一次延长。仅收集的任务保存线索和计划后交付。每站保留时间、模式、分级、覆盖结果和未完成原因，切换站点时继续其他可执行队列项。

---

## Toolchain fallback (when `dnsx` / `httpx` crash)

The projectdiscovery Go binaries (`dnsx`, `httpx`, `naabu`) occasionally `SIGSEGV` on macOS arm64 due to a cgo / system-resolver interaction. The crash signature is identical regardless of install method — both `brew install` and `go install github.com/projectdiscovery/<tool>@latest` produce binaries that segfault at the same address. Smoke-test once before relying on them in a real engagement:

```bash
dnsx -version   # if SIGSEGV: use the dig fallback below
httpx -version  # if SIGSEGV: use the curl fallback below
```

### `dnsx` → `dig` fallback

```bash
# Replaces: dnsx -l subs.txt -a -resp -silent
while read s; do
  ips=$(dig +short +tries=1 +time=3 "$s" \
    | grep -E '^[0-9.]+$' \
    | paste -sd, -)
  [ -n "$ips" ] && echo "$s|$ips"
done < subs.txt
```

### `httpx` → `curl` fallback

```bash
# Replaces: httpx -l subs.txt -silent -status-code -title -tech-detect
while read s; do
  resp=$(curl -s -L -m 5 -o /tmp/body \
    -w "%{http_code}|%{url_effective}|%{header_server}" \
    "https://$s")
  code=$(echo "$resp" | cut -d'|' -f1)
  if [ "$code" != "000" ]; then
    title=$(grep -oE '<title[^>]*>[^<]*</title>' /tmp/body | head -1 | sed 's/<[^>]*>//g')
    echo "$s|$resp|$title"
  fi
done < subs.txt
```

**Trade-off:** Serial vs. concurrent. The fallback handles ~24 subdomains in 14 seconds; the same workload on `httpx` with default 50 threads finishes in 2-3 seconds. For VDP-scale recon (< 100 subdomains) the fallback is fine. For mass recon (1000+) fix the toolchain first.

Verified against HackerOne's own VDP in `docs/verification/recon-hackerone-vdp.md`.

---

## API Spec / Swagger / OpenAPI Discovery (2024-2026 surface)

API spec endpoints are the single highest-leverage recon target on any modern .NET / Node / Python / Java backend. The spec discloses every endpoint, HTTP methods, parameter names + types + formats, models, validation rules — a complete attack-map in JSON. Default routes are commonly left enabled in production. **Add this wordlist to the directory-fuzzing phase** (after the standard `common.txt` pass).

### Default discovery path wordlist (paste into `swagger-paths.txt`)

```
# NSwag / Swashbuckle (ASP.NET Core)
/swagger
/swagger/
/swagger/index.html
/swagger/ui/index.html
/swagger/v1/swagger.json
/swagger/v2/swagger.json
/swagger/v3/swagger.json
/swagger/docs/v1
/swagger/docs/v2
/swagger-ui
/swagger-ui/
/swagger-ui.html
/swagger-resources
/swagger-resources/configuration/ui
/nswag
/nswag/index.html
/api/swagger
/api/swagger.json
/api/swagger/v1/swagger.json
/api/openapi
/api/openapi.json
/api/v1/swagger.json
/api/v2/swagger.json
/api-docs
/api-docs/swagger.json

# OpenAPI generic
/openapi
/openapi.json
/openapi.yaml
/openapi.yml
/openapi/v1.json
/openapi/v2.json
/openapi/v3.json
/.well-known/openapi.json

# Java / Spring (Springfox / springdoc)
/v2/api-docs
/v3/api-docs
/v3/api-docs.yaml
/v3/api-docs/swagger-config
/swagger-ui/index.html

# Python (FastAPI / Flask-RESTPlus / Connexion / DRF)
/docs
/docs/
/redoc
/redoc/
/openapi.json
/swagger.json
/swagger/?format=openapi
/swagger.yaml

# Express / Node / Hapi
/api-docs
/api-docs.json
/swagger.json
/swagger-stats
/graphql-docs

# GraphQL adjacent (often co-located)
/graphql
/graphiql
/playground
/altair
/voyager
/graphql/console
/graphql-explorer

# ReDoc / RapiDoc / Stoplight / alt UIs
/redoc
/redoc.html
/redoc-ui.html
/rapidoc
/rapidoc.html
/stoplight
/elements

# Misc / dev-leftover
/actuator
/actuator/openapi
/actuator/mappings
/q/openapi
/q/swagger-ui
/docs/swagger.json
/api/v1/docs
/api/v2/docs
/internal/swagger
/admin/swagger
/management/swagger
```

### Integration with the standard pipeline

```bash
# After live-hosts.txt is built (Phase 1 / 2), run:
ffuf -w swagger-paths.txt -u "https://FUZZ.target.com" -mc 200,302 -fs 0 -t 50 -o swagger-hits.json
# Or with httpx for content-aware filtering:
httpx -l live-hosts.txt -path swagger-paths.txt -mc 200 -mr "swagger|openapi" -json | tee swagger-hits.jsonl
# For every hit:
jq '.paths | keys' swagger.json > endpoints.txt
jq '.components.schemas' swagger.json > schemas.json   # mass-assignment field candidates
```

### Why this matters for recon-to-hunting handoff

- **Spec → mass IDOR/BOLA** — `jq '.paths | keys' swagger.json` becomes the input list for `Autorize`/`ffuf` per-user testing.
- **Spec → mass-assignment payload construction** — `components.schemas.UserUpdateDto` enumerates `isAdmin`, `emailVerified`, `tenantId`, `role`.
- **Spec → hidden endpoint discovery** — `/internal/*`, `/debug/*`, `/v0/*`, `/legacy/*` routes documented but never auth-gated.
- **Spec → injection-class seeding** — every parameter's type + format + enum + max-length means payloads pass validation before reaching the sink. Especially valuable against ASP.NET Core where the model binder rejects malformed input before any controller logic.

### Tools

- `kiterunner` — natively ingests OpenAPI spec, generates requests against the API.
- `sj` (Swagger Jacker) — purpose-built for Swagger spec exploitation.
- `apidetector` (brinhosa) — Swagger-UI mass scanner.
- `XSSwagger` (vavkamil) — detects vulnerable Swagger UI versions (CVE-2018-25031 family).
- `nuclei -t http/exposures/apis/` — built-in templates for default spec paths.

### Anti-pattern reminder

A 404/403 on `/swagger` does NOT mean no spec is exposed. Many .NET projects route the spec under `/api/swagger/v1/swagger.json` rather than `/swagger`. Always test the full path list, not just the root.

Full attack-chain analysis is in `hunt-api-misconfig` → `NSwag / Swagger / OpenAPI Spec Exposure`.

---

## Related Skills & Chains

- **`offensive-osint`** — When recon needs concrete probes / wordlists / regexes beyond the basic pipeline. Workflow primitive: this skill produces the URL set; `offensive-osint` provides the secret regexes, GraphQL/Swagger paths, and identity-fabric probes you apply to that URL set.
- **`osint-methodology`** — When you need a severity rubric for what you discovered. Workflow primitive: after recon outputs `subdomains.txt` / `live-hosts.txt` / `urls.txt`, score each asset against `osint-methodology`'s findings rubric to decide what gets a finding versus what stays in the asset graph.
- **`hunt-subdomain`** — When recon surfaces stale CNAMEs / dangling DNS. Workflow primitive: any subdomain in `subdomains.txt` whose CNAME points to S3 / GitHub Pages / Heroku / Shopify / Azure should auto-route to `hunt-subdomain` for takeover validation.
- **`security-arsenal`** — When the URL set is classified by `gf` and ready for active testing. Workflow primitive: `gf xss/ssrf/sqli/idor` output names become payload-class queries against `security-arsenal`'s payload library.
- **`bb-methodology`** — When recon completes and Phase 1 transitions to Phase 2 (Mapping). Workflow primitive: hand the live host + URL set back to `bb-methodology` Phase 2 for endpoint mapping and Phase 3 vulnerability discovery routing.

---

## Operator Notes

> Engagement-derived + 2026-specific additions to the vendored foundation.
> Wisdom from real authorized engagements + Phase 2 verification across
> this repo's 31+ skill-area live tests. The upstream pipeline covers the WHAT;
> this layer covers the WHEN-IT-WORKS-vs-WHEN-IT-DOESN'T.

### Cross-TLD pivot discipline

Phase 2C's HackerOne VDP recon walked from `hackerone.com` (24 subdomains) into a sister TLD `hacker.one` (12 more subdomains found in JS bundle references). Operators who only enumerate `*.target.com` miss attack surface that the target legitimately operates on a different domain.

Always grep JS bundles for plausible sibling TLDs:

```bash
# pull all JS, grep for sibling-TLD candidates
for url in $(cat live-hosts.txt); do
  curl -s "$url" | grep -oE 'src="[^"]+\.js"' | sed 's/src="//;s/"//'
done | sort -u > js-urls.txt

# then on each JS file
for j in $(cat js-urls.txt); do
  curl -s "$j" | grep -oE '[a-z0-9.-]+\.(io|app|one|dev|test|cloud|ai|co)' | sort -u
done | sort -u > sibling-tld-candidates.txt
```

Common sibling-TLD patterns: `target.com → target.io / target.app / target.one / target.dev / target.test / target-corp.com / target-cdn.net`. Always validate via WHOIS or by checking if the cert chain trusts the same internal CA before treating the sister TLD as in-scope.

### Subdomain wordlist priorities by 2026

Top discovery prefixes by hit rate against enterprise VDPs in our 2024-2026 corpus:

```
mta-sts.*          api.*              docs.*
dev-*              staging-*          *-qa
*-stage            *-uat              events.*
portal.*           customer.*         partner.*
vendor.*           internal-*         admin-*
employee-*         hr.*               jobs.*
sso.*              auth.*             id.*
```

Internal-looking subdomains often expose more surface than the marketing site — `partner.target.com` and `vendor-portal.target.com` frequently have weaker auth than the main app because they're scoped for "trusted" external users. Always send a probe to the long-tail wordlist after the standard subfinder run completes.

### Live-host probe: how to fingerprint stack quickly

`curl -sI <host>` headers are 80% of the fingerprint:

- `Server:` — apache / nginx / cloudflare / kestrel (= .NET Core) / openresty / envoy
- `X-Powered-By:` — PHP version, ASP.NET version, Express.js
- `X-Drupal-Cache`, `X-Generator: Drupal 9` — Drupal
- `X-Generator: WordPress` — WordPress
- `Via:` — CDN chain (1.1 varnish, 1.1 cloudfront)
- `Set-Cookie:` names — `JSESSIONID` (Java), `PHPSESSID` (PHP), `ASP.NET_SessionId` (.NET), `connect.sid` (Express), `laravel_session` (Laravel)

JS bundle filename patterns:

- `/_next/static/` = Next.js
- `/_nuxt/` = Nuxt
- `/assets/static/` with hash filenames = Vite
- `/static/js/main.*.chunk.js` = Create React App
- `runtime.*.js + polyfills.*.js + main.*.js` = Angular CLI

The first 10s of recon should yield a stack guess; the rest is targeting. If your fingerprint contradicts itself (Server says nginx, Set-Cookie says ASP.NET) you've found a reverse proxy front-end — note the origin app for later smuggling/cache attacks.

### GitHub Pages 404 vs takeover signal

Critical distinction operators get wrong:

- **"Page not found · GitHub Pages"** with HTTP 404 means the repo EXISTS — NOT a takeover.
- **"There isn't a GitHub Pages site here"** means the repo was deleted — TAKEOVER candidate.

Same distinction for CloudFront:

- **"Error - 404"** with `Server: CloudFront` = distribution exists, origin returned 404 — NOT a takeover.
- **"The request could not be satisfied"** with `X-Cache: Error from cloudfront` = origin missing entirely — potential takeover.

Phase 2C verified both patterns live. Always check the EXACT response body string before filing a takeover finding — the takeover-scanner tools (subzy, subjack) match on multiple fingerprints and frequently false-positive on the "still owned, just empty" case.

### Toolchain fallback

Already covered in this file's Phase 2C addition. Quick reminder: dnsx/httpx may segfault on macOS arm64; the dig+curl fallback works for < 100-host runs in ~14 seconds. Don't burn an hour debugging Go binary panics when the fallback gets you to the same URL set.
