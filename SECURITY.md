# Security Policy

## Authorized use only

Use this plugin only against systems you own or are explicitly authorized to test. Respect the
written scope, excluded techniques, rate limits, data-handling requirements, and stop conditions of
each engagement.

Do not commit real target data, cookies, API keys, access tokens, credentials, private reports,
screenshots containing personal information, or customer evidence to this repository.

## Mandatory conduct

The repository-wide [Authorized Testing Code of Conduct](CODE_OF_CONDUCT.md) applies to every Skill
and overrides conflicting payload or proof instructions. In particular:

1. Never upload, deploy, stage, or execute web shells, Trojans, viruses, or other malicious programs.
2. Never exploit a vulnerability to obtain, enumerate, copy, download, or exfiltrate system or vendor data.
3. Never perform testing that could affect normal business operations or service availability.
4. Never privately retain vulnerability information, exploit material, or vendor/customer data.

If a risk cannot be validated within these boundaries, document the unexecuted path rather than
crossing the boundary.

## Reporting a problem with this repository

For a documentation, packaging, or false-positive issue, open a normal GitHub issue without
including sensitive target information.

For a security issue, use GitHub private vulnerability reporting when available. If it is not
available, open an issue that contains no exploit details or secrets and request a private contact
channel.

## Testing expectations

- Start with read-only validation.
- Do not perform destructive, availability-impacting, or unauthorized state-changing tests.
- Redact cookies, tokens, credentials, personal data, and target-specific evidence.
- Restore test-created state and document anything that could not be restored.
- Validate findings before reporting them.
