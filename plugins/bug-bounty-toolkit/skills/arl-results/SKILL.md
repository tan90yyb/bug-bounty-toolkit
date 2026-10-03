---
name: arl-results
description: Read completed ARL Lighthouse tasks and asset results from an existing ARL server using a local, interactive login. Use when the operator has ARL running and asks to import its task, domain, site, or IP results into an authorized assessment.
---

# Read ARL results



Run `scripts/arl_read.py` from the local Windows machine that can reach ARL. The script reads ARL's own API; it never starts a scan or sends requests to discovered hosts. On the first successful login it saves the username and password as a generic credential in that user's Windows Credential Manager, scoped to the ARL host and port. Later runs use the saved login automatically; the ARL session token stays in memory. The operator can run `forget` to remove the saved credential or use `--no-remember` for a one-off login. 凭据可通过现有本地提示和 Windows 凭据管理器配置。

For the operator's self-signed ARL certificate, pass the server certificate PEM with `--server-cert`. Keep that certificate outside this plugin. 现有连接脚本使用证书校验；自签名证书使用 --server-cert 参数。

```
python scripts/arl_read.py --base-url https://192.168.1.128:5003 --server-cert PATH_TO_ARL_CERT health
python scripts/arl_read.py --base-url https://192.168.1.128:5003 --server-cert PATH_TO_ARL_CERT doctor
python scripts/arl_read.py --base-url https://192.168.1.128:5003 --server-cert PATH_TO_ARL_CERT tasks
python scripts/arl_read.py --base-url https://192.168.1.128:5003 --server-cert PATH_TO_ARL_CERT assets --kind domain --task-id TASK_ID
python scripts/arl_read.py --base-url https://192.168.1.128:5003 status
python scripts/arl_read.py --base-url https://192.168.1.128:5003 forget
```

`health` checks API availability without login. `doctor`, `tasks`, and `assets` prompt locally only when no credential is saved. `assets` supports `domain`, `site`, and `ip`; use `--page` and `--size` for pagination. Outputs can contain target data: 按用户文件保存证据；需要时可脱敏再分享。

Treat ARL's asset claims as leads. For this operator's company-based scope, a candidate domain enters the testing range when its ICP filing registrant belongs to the user-named target company. Record the filing evidence. Put domains registered to another company or with unconfirmed ownership on the pending list; do not test them automatically. ARL collection alone does not prove a host is online, and this skill does not probe discovered hosts.

## Handoff to information collection

Follow [web2-recon's shared information-collection workflow](../web2-recon/SKILL.md) after
reading ARL results. Import all pages for the selected tasks and domain/site/ip kinds;
reconcile totals, preserve source task IDs/options/timestamps, and mark partial reads explicitly.
Exclude known polluted historic task results from automatic reuse until revalidated.

Build the inventory and pending list, then the per-site business queue and canonical origin/
hostname exports under the same `RECON_DIR` consumed by `hunt-dispatch`. An ARL site record
is time-stamped evidence, not a guarantee of current reachability. Probe only where the
current collection request permits it. DNS success alone never creates an online-site claim.

The connector itself still only reads ARL results; it does not perform ownership checks,
create these handoff files automatically, launch tasks, or probe target websites. The
orchestrating skill performs the permitted normalization and analysis and records any
missing capability as a gap. Reading this skill does not authorize vulnerability testing.
