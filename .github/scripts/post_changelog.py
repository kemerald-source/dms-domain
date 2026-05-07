#!/usr/bin/env python3
"""Post the newest CHANGELOG.md entry to Discord as an embed."""

import json
import os
import subprocess
import sys
import urllib.request


def get_top_section(content: str):
    """Return (title, body) of the first ## section, or (None, None) if absent."""
    if not content:
        return None, None
    lines = content.splitlines()
    title, body_lines, in_section = None, [], False
    for line in lines:
        if line.startswith('## '):
            if in_section:
                break  # hit the next section
            in_section = True
            title = line[3:].strip()
            continue
        if in_section:
            body_lines.append(line)
    body = '\n'.join(body_lines).strip()
    return title, body


def main():
    webhook = os.environ['DISCORD_WEBHOOK_URL']
    repo_name = os.environ.get('REPO_DISPLAY_NAME', 'Repository')
    color = int(os.environ.get('EMBED_COLOR', '5814783'))
    repo_url = os.environ.get('REPO_URL', '')
    commit_sha = os.environ.get('COMMIT_SHA', '')

    try:
        with open('CHANGELOG.md', 'r', encoding='utf-8') as f:
            current = f.read()
    except FileNotFoundError:
        print('CHANGELOG.md not found, nothing to post.')
        return

    try:
        prev = subprocess.check_output(
            ['git', 'show', 'HEAD~1:CHANGELOG.md'],
            text=True, stderr=subprocess.DEVNULL
        )
    except subprocess.CalledProcessError:
        prev = ''  # first commit or file didn't exist before

    cur_title, cur_body = get_top_section(current)
    prev_title, prev_body = get_top_section(prev)

    if cur_title is None:
        print('No ## section found in CHANGELOG.md, skipping.')
        return

    if cur_title == prev_title and cur_body == prev_body:
        print('Top section unchanged, skipping.')
        return

    if len(cur_body) > 4000:
        cur_body = cur_body[:3997] + '...'

    embed = {
        'title': f'📝 {cur_title}',
        'description': cur_body or '_No details provided._',
        'color': color,
        'footer': {'text': repo_name},
    }
    if repo_url and commit_sha:
        embed['url'] = f'{repo_url}/blob/{commit_sha}/CHANGELOG.md'

    payload = {'embeds': [embed]}
    print(f'Payload: {json.dumps(payload, indent=2)}')
    req = urllib.request.Request(
        webhook,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'User-Agent': 'DiscordBot (https://github.com/kemerald-source/dms-domain, 1.0)',
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f'Discord response: {resp.status}')
    except urllib.error.HTTPError as e:
        print(f'HTTP {e.code}: {e.reason}')
        print(f'Response body: {e.read().decode("utf-8", errors="replace")}')
        raise


if __name__ == '__main__':
    sys.exit(main())
