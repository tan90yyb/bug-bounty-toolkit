# Security Policy

## Authorized use only

Use this plugin only against systems you own or are explicitly authorized to test. Respect the
written scope, excluded techniques, rate limits, data-handling requirements, and stop conditions of
each engagement.

Do not commit real target data, cookies, API keys, access tokens, credentials, private reports,
screenshots containing personal information, or customer evidence to this repository.

## Reporting a problem with this repository

For a documentation, packaging, or false-positive issue, open a normal GitHub issue without
including sensitive target information.

For a security issue, use GitHub private vulnerability reporting when available. If it is not
available, open an issue that contains no exploit details or secrets and request a private contact
channel.

## Testing expectations

- Start with read-only validation.
- Obtain explicit approval before destructive or state-changing tests.
- Redact cookies, tokens, credentials, personal data, and target-specific evidence.
- Restore test-created state and document anything that could not be restored.
- Validate findings before reporting them.
