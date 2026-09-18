# Bug Bounty Toolkit for Codex

面向 Codex 的授权安全测试插件，提供从范围确认、侦察、专项测试、证据整理、漏洞验证到报告输出的完整工作流。

This is an unofficial Codex-compatible adaptation of the MIT-licensed
[Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) skill bundle.
It preserves the upstream methodology while replacing Claude-specific routing and metadata with
Codex plugin conventions.

## 内容

- 83 个安全 Skill
- 58 个 `hunt-*` 专项测试 Skill
- 范围确认、覆盖矩阵和未覆盖项记录
- Web、API、云、身份平台、移动端和供应链测试方法
- 证据脱敏、误报过滤、漏洞验证和报告模板
- Codex 插件清单及可安装 marketplace

## 安装

先克隆本仓库，然后将它添加为 Codex marketplace：

```powershell
git clone https://github.com/tan90yyb/bug-bounty-toolkit.git
codex plugin marketplace add tan90yyb/bug-bounty-toolkit
codex plugin add bug-bounty-toolkit@bug-bounty-toolkit
```

安装后请新建一个 Codex 任务，使新增 Skill 被完整加载。

## 使用示例

```text
使用 bug-bounty-toolkit，对我明确授权的测试目标执行安全评估。
先确认范围并建立覆盖矩阵，再按证据验证结果，记录未覆盖项。
```

## 授权边界

本项目仅用于以下场景：

- 你拥有的系统或实验环境
- 已取得书面授权的渗透测试
- 明确列入范围的漏洞奖励计划
- CTF 或故意设计的靶场

不要将其用于未授权目标、批量攻击、持久化、破坏性操作或真实凭据滥用。执行任何主动测试前，应以目标方的书面范围和速率限制为准。

## 强制行为准则

所有 Skill 和测试示例均受 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 约束。以下禁令优先于任何漏洞验证或持续测试指令：

1. 禁止上传、部署或执行 WebShell、木马、病毒等恶意程序。
2. 禁止利用漏洞读取、枚举、下载、复制或外传任何系统及厂商数据。
3. 禁止实施任何可能影响系统正常业务运行的测试。
4. 禁止私自保留漏洞信息、利用材料及厂商或客户数据。

不能在这些边界内完成的验证，应记录为未执行的风险路径，不得越界补证。

## 来源与许可证

本仓库的大部分安全方法和 Skill 来自
[elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter)，
其上游 Credits 记录了原创、社区贡献和 vendored 内容的来源。
Codex 兼容修改与上游内容均按 MIT 许可证再分发。完整信息见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)、[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) 和 [LICENSE](LICENSE)。

## 免责声明

安全测试具有误报、漏报和环境影响风险。插件不能保证发现全部漏洞，也不能替代专业判断、测试授权、变更审批和人工复核。
