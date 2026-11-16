#!/usr/bin/env python3
"""Build a deterministic, allowlisted user package without private local files."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PREFIXES = ('plugins/bunch-character-studio/', 'chatgpt/')
EXACT = {'.agents/plugins/marketplace.json', 'START_HERE.md'}


def build(destination: Path) -> Path:
    paths = subprocess.check_output(
        ['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        cwd=ROOT,
    ).decode().split('\0')
    names = sorted({p for p in paths if p and
                    (p in EXACT or p.startswith(PREFIXES))})
    files = {}
    for name in names:
        path = ROOT / name
        if path.is_symlink() or not path.is_file():
            raise ValueError(f'Not a regular release file: {name}')
        if any(part in {'.git', 'node_modules', '__pycache__', 'outputs'}
               or part.startswith('.env') for part in path.relative_to(ROOT).parts):
            raise ValueError(f'Unexpected private/development path: {name}')
        files[name] = path.read_bytes()
    required = EXACT | {
        'plugins/bunch-character-studio/.codex-plugin/plugin.json',
        'plugins/bunch-character-studio/skills/make-tf-comic/SKILL.md',
        'chatgpt/PROJECT_INSTRUCTIONS.md', 'chatgpt/PROJECT_LIBRARY.md',
    }
    if required - files.keys():
        raise ValueError(f'Missing required files: {required - files.keys()}')
    manifest = json.loads(files['plugins/bunch-character-studio/.codex-plugin/plugin.json'])
    info = {
        'name': manifest['name'], 'version': manifest['version'],
        'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip(),
        'working_tree_changes': bool(subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=ROOT)),
        'entry_point': 'START_HERE.md',
        'validation': 'See VALIDATION.md; this is a preview, not a production certification.',
    }
    files['PACKAGE_INFO.json'] = (json.dumps(info, indent=2)+'\n').encode()
    validation = ROOT / 'release/VALIDATION.md'
    files['VALIDATION.md'] = validation.read_bytes()
    files['SHA256SUMS.txt'] = ''.join(
        f'{hashlib.sha256(data).hexdigest()}  {name}\n'
        for name, data in sorted(files.items())
    ).encode()
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / f"bunch-character-studio-{manifest['version']}.zip"
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            entry = zipfile.ZipInfo('bunch-character-studio/'+name, (2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data)
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise ValueError('Archive integrity check failed')
        for name, data in files.items():
            assert archive.read('bunch-character-studio/'+name) == data
    print(f'{target.resolve()} ({len(files)} files, {target.stat().st_size} bytes)')
    return target


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    build(parser.parse_args().output)
