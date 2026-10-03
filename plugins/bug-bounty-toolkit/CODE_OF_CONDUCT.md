# 授权安全测试行为准则 / Authorized Testing Code of Conduct

本准则适用于仓库中的全部 Skill、示例、测试流程和辅助脚本。它是强制性边界，优先于任何与之冲突的攻击示例、验证步骤、持续测试指令或影响证明要求。

This policy applies to every Skill, example, workflow, and helper in this repository. It is a mandatory boundary and overrides any conflicting payload, validation step, persistence directive, or impact-proof instruction.

## 一、禁止上传或部署恶意程序

禁止向任何测试目标上传、写入、部署、暂存或执行 WebShell、木马、病毒、蠕虫、勒索软件、挖矿程序、后门、Rootkit、恶意宏、持久化程序以及其他恶意代码或文件。

不得以“漏洞验证”“影响证明”或“红队测试”为理由绕过本条。涉及远程代码执行、文件上传或供应链攻击时，只能使用无害标记、不可执行文件、测试环境中的安全桩或静态证据证明风险。

Never upload, write, deploy, stage, or execute a web shell, Trojan, virus, worm, ransomware, miner, backdoor, rootkit, malicious macro, persistence agent, or other malicious program. Use inert markers, non-executable files, safe stubs in an isolated lab, or static evidence instead.

## 二、越权读取的最小验证

优先使用测试账号、自有数据、合成数据或预先放置的唯一标记验证越权。确需读取真实记录证明影响时，同一个漏洞在已授权的验证中累计最多获取 5 条真实信息（记录）；取得足够证据后立即停止，不批量枚举、下载、导出或外传。

上限按同一漏洞跨接口、账号、工具和重试累计，重复返回也计入获取条次。记录 finding_id 与累计数量；设置能够限制返回量的请求参数。无法控制返回量时先使用测试数据或其他证据；意外超量返回后停止该读取路径并如实记录。

不得以密码、密钥、令牌等秘密作为越权验证样本。意外返回真实数据时，将其计入上述 5 条上限，评估是否已足够证明问题，不继续无目的扩展。

Prefer test accounts, self-owned or synthetic data, and planted markers. If real records are needed to prove unauthorized access, read no more than five real records in total per finding within the authorized validation, stop once sufficient evidence exists, and do not bulk-enumerate, download, export, or exfiltrate data. Do not use passwords, keys, or tokens as samples. Count unexpected real records against the same limit.

## 三、禁止影响正常业务运行

禁止实施或继续任何可能降低可用性、破坏数据完整性、改变生产状态或影响正常业务的测试，包括拒绝服务、压力测试、资源耗尽、高并发爆破、缓存污染、批量写入、删除、重启服务及不可逆操作。

所有请求必须遵守已确认的资产范围、速率限制、测试窗口和停止条件。出现异常延迟、错误率上升、告警、服务不稳定或业务方要求停止时，应立即停止相关测试并保留时间线。

Never perform a test that could disrupt availability, degrade performance, alter production state, damage integrity, or interrupt normal business operations. This includes denial-of-service, stress testing, resource exhaustion, unsafe brute force, cache poisoning, bulk writes, deletion, restarts, and irreversible actions.

## 四、禁止私自保留漏洞及厂商数据

禁止在个人电脑、私人网盘、公共仓库、聊天记录或未经批准的存储位置私自保留漏洞细节、利用材料、原始响应、目标配置、账号凭据、厂商数据或客户信息。

只允许在授权方指定的位置保存完成报告所必需的最少证据。测试请求、响应和截图允许脱敏；保留方法、字段结构、角色关系、关键差异及复现说明。授权方指定的受控位置可按复现需要保留最少原始证据；公开副本中的凭据与真实个人信息必须脱敏；响应中的真实数据遵守上述读取上限和最小必要原则。按约定限制访问、用途、保存期限、返还和删除。不得将真实目标证据提交到本仓库。

Never privately retain vulnerability information, exploit material, raw responses, target configuration, credentials, vendor data, or customer information outside an approved location. Keep only the minimum evidence needed for a report. Requests, responses and screenshots may be redacted while preserving reproducibility. Minimum originals may be retained only in an approved controlled location when necessary; public copies must mask credentials and personal data; real data in responses remains subject to the five-record cap and minimum-necessary rule. Follow agreed access, retention, return, and deletion rules. Never commit real target evidence to this repository.

## 执行要求

- 开始前确认用户提供的目标公司与起始域名、允许的方法、速率、时间窗口和停止联系人。ICP备案主体属于该公司的候选域名自动纳入本次测试范围；属于其他公司或无法确认的资产不自动测试。
- 正常登录（包括 ARL 与测试账号登录）不受测试请求的 POST 事前审批限制。其他 POST / PUT / PATCH / DELETE 测试请求先展示完整请求并取得批准；DELETE 只构造，不发送。
- 上述四项禁令不得因“完整覆盖”“继续测试”“红队模式”或客户要求提供更多真实数据而放宽。
- Skill 中涉及数据外传、WebShell、恶意代码、拒绝服务或破坏性操作的内容，只能作为威胁原理和防御分析材料，不得在真实目标上执行。
- 无法在不违反本准则的情况下验证时，应记录为“未执行的风险路径”，说明缺少的验证条件，不得越界补证。
- 意外返回的真实记录计入同一漏洞的 5 条上限；足够证明问题、达到上限、发生超量返回或业务影响时停止相关读取/测试，最小化留存并按约定通知授权方。

Violation of this policy is a stop condition for the affected test. Document the unexecuted risk path rather than crossing the boundary.
