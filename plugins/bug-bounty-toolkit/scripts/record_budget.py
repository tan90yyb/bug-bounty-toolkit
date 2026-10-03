"""Track distinct real records per finding without storing their contents.

This local ledger makes no network requests. Plan before reading; record all
identifiers actually returned, including unexpected excess, after reading.
"""
import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

LIMIT = 5


def track(database, finding, identifiers, action):
    if not finding.strip():
        raise ValueError('finding ID cannot be empty')
    if any(not isinstance(key, str) or not key.strip() for key in identifiers):
        raise ValueError('record keys must be nonempty canonical strings')
    fingerprints = {hashlib.sha256((finding + '\0' + key).encode()).hexdigest() for key in identifiers}
    Path(database).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(database, timeout=10) as db:
        db.execute('CREATE TABLE IF NOT EXISTS records (finding TEXT, fingerprint TEXT, PRIMARY KEY(finding, fingerprint))')
        db.execute('BEGIN IMMEDIATE')
        seen = {r[0] for r in db.execute('SELECT fingerprint FROM records WHERE finding=?', (finding,))}
        new = fingerprints - seen
        allowed = len(seen | fingerprints) <= LIMIT
        if action == 'record':
            db.executemany('INSERT OR IGNORE INTO records VALUES (?,?)', [(finding, fp) for fp in fingerprints])
            seen |= fingerprints
        result = {'finding_id': finding, 'distinct_real_records': len(seen), 'new_distinct_records': len(new),
                  'remaining': max(0, LIMIT-len(seen)), 'plan_allowed': allowed,
                  'over_limit': len(seen) > LIMIT, 'stop_new_record_reads': len(seen) >= LIMIT}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', required=True)
    parser.add_argument('--finding', required=True)
    parser.add_argument('--keys-file', help='JSON array of canonical record identities; no record contents')
    parser.add_argument('action', choices=('plan', 'record', 'status'))
    args = parser.parse_args()
    keys = []
    if args.keys_file:
        keys = json.loads(Path(args.keys_file).read_text(encoding='utf-8-sig'))
    if not isinstance(keys, list):
        parser.error('keys file must contain a JSON array')
    if args.action != 'status' and not args.keys_file:
        parser.error('plan and record require --keys-file')
    result = track(args.database, args.finding, keys, args.action)
    print(json.dumps(result, ensure_ascii=False))
    return 2 if result['over_limit'] or (args.action == 'plan' and not result['plan_allowed']) else 0


if __name__ == '__main__':
    raise SystemExit(main())
