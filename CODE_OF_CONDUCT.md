# 授权安全测试行为准则 / Authorized Testing Code of Conduct

本准则适用于仓库中的全部 Skill、示例、测试流程和辅助脚本。它是强制性边界，优先于任何与之冲突的攻击示例、验证步骤、持续测试指令或影响证明要求。

This policy applies to every Skill, example, workflow, and helper in this repository. It is a mandatory boundary and overrides any conflicting payload, validation step, persistence directive, or impact-proof instruction.

## 一、禁止上传或部署恶意程序

禁止向任何测试目标上传、写入、部署、暂存或执行 WebShell、木马、病毒、蠕虫、勒索软件、挖矿程序、后门、Rootkit、恶意宏、持久化程序以及其他恶意代码或文件。

不得以“漏洞验证”“影响证明”或“红队测试”为理由绕过本条。涉及远程代码执行、文件上传或供应链攻击时，只能使用无害标记、不可执行文件、测试环境中的安全桩或静态证据证明风险。

Never upload, write, deploy, stage, or execute a web shell, Trojan, virus, worm, ransomware, miner, backdoor, rootkit, malicious macro, persistence agent, or other malicious program. Use inert markers, non-executable files, safe stubs in an isolated lab, or static evidence instead.

## 二、禁止利用漏洞获取系统数据

禁止利用任何漏洞读取、查询、枚举、下载、复制、导出、截获或外传目标系统、数据库、文件、密钥、令牌、日志、用户信息、客户信息或厂商数据。

漏洞验证应优先使用测试账号、自有数据、合成数据、预先放置的唯一标记、权限校验差异、响应结构或其他不接触真实系统数据的方法。如果响应意外返回真实数据，必须立即停止扩展测试，不继续翻页、枚举或下载；只记录最少必要的脱敏事实并通知授权方。

Never use a vulnerability to retrieve, enumerate, download, copy, export, intercept, or exfiltrate system, customer, user, credential, log, or vendor data. Validate with test accounts, synthetic data, planted markers, authorization differences, or non-sensitive metadata. If real data appears unexpectedly, stop immediately and do not expand the access.

## 三、禁止影响正常业务运行

禁止实施或继续任何可能降低可用性、破坏数据完整性、改变生产状态或影响正常业务的测试，包括拒绝服务、压力测试、资源耗尽、高并发爆破、缓存污染、批量写入、删除、重启服务及不可逆操作。

所有请求必须遵守书面范围、速率限制、测试窗口和停止条件。出现异常延迟、错误率上升、告警、服务不稳定或业务方要求停止时，应立即停止相关测试并保留时间线。

Never perform a test that could disrupt availability, degrade performance, alter production state, damage integrity, or interrupt normal business operations. This includes denial-of-service, stress testing, resource exhaustion, unsafe brute force, cache poisoning, bulk writes, deletion, restarts, and irreversible actions.

## 四、禁止私自保留漏洞及厂商数据

禁止在个人电脑、私人网盘、公共仓库、聊天记录或未经批准的存储位置私自保留漏洞细节、利用材料、原始响应、目标配置、账号凭据、厂商数据或客户信息。

只允许在授权方指定的位置保存完成报告所必需的最少、脱敏证据，并严格遵守约定的保存期限、返还和删除要求。不得将真实目标证据提交到本仓库。

Never privately retain vulnerability information, exploit material, raw responses, target configuration, credentials, vendor data, or customer information. Keep only the minimum redacted evidence in an approved location and follow the agreed retention, return, and deletion requirements.

## 执行要求

- 开始前确认书面授权、资产范围、允许的方法、速率、时间窗口和停止联系人。
- 上述四项禁令不得因“完整覆盖”“继续测试”“红队模式”或客户要求提供更多真实数据而放宽。
- Skill 中涉及数据外传、WebShell、恶意代码、拒绝服务或破坏性操作的内容，只能作为威胁原理和防御分析材料，不得在真实目标上执行。
- 无法在不违反本准则的情况下验证时，应记录为“未执行的风险路径”，说明缺少的验证条件，不得越界补证。
- 发现意外数据暴露或业务影响时，立即停止、最小化留存、脱敏记录并通知授权方。

Violation of this policy is a stop condition for the affected test. Document the unexecuted risk path rather than crossing the boundary.
