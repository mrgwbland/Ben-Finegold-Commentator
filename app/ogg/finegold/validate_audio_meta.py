#!/usr/bin/env python3
"""
Validate audio references in a commentator folder.

Checks:
1) Every referenced file in meta.json exists on disk.
2) Every .ogg file on disk is referenced in meta.json (flags unused files).

Usage:
  python validate_audio_meta.py
  python validate_audio_meta.py --meta meta.json --audio-root .
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Set


def normalize_rel(path_text: str) -> str:
    return path_text.replace("\\", "/").lstrip("./")


def load_meta(meta_path: Path) -> Dict:
    try:
        with meta_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"ERROR: meta file not found: {meta_path}")
        sys.exit(2)
    except json.JSONDecodeError as exc:
        print(f"ERROR: invalid JSON in {meta_path}: {exc}")
        sys.exit(2)


def iter_referenced_files(meta: Dict) -> Iterable[str]:
    sounds = meta.get("sounds", {})
    if not isinstance(sounds, dict):
        return []

    refs: List[str] = []
    for key, value in sounds.items():
        if not isinstance(value, list):
            continue
        for item in value:
            if isinstance(item, str) and item.strip():
                refs.append(item.strip())
    return refs


def collect_ogg_files(audio_root: Path) -> Set[str]:
    files: Set[str] = set()
    for p in audio_root.rglob("*"):
        if p.is_file() and p.suffix.lower() == ".ogg":
            rel = p.relative_to(audio_root).as_posix()
            files.add(rel)
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate meta.json audio references.")
    parser.add_argument("--meta", default="meta.json", help="Path to meta.json")
    parser.add_argument(
        "--audio-root",
        default=".",
        help="Root folder to scan for .ogg files (defaults to current directory)",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent

    def resolve_from_script_dir(path_value: str) -> Path:
        p = Path(path_value)
        return p if p.is_absolute() else (script_dir / p)

    meta_path = resolve_from_script_dir(args.meta).resolve()
    audio_root = resolve_from_script_dir(args.audio_root).resolve()

    meta = load_meta(meta_path)
    raw_refs = list(iter_referenced_files(meta))
    referenced = {normalize_rel(r) for r in raw_refs}

    existing_ogg = collect_ogg_files(audio_root)

    # Missing = referenced but file does not exist.
    missing = sorted(
        r for r in referenced if not (audio_root / r).is_file()
    )

    # Unused = file exists but not referenced in meta.
    unused = sorted(existing_ogg - referenced)

    print("=== Audio Meta Validation ===")
    print(f"Meta file      : {meta_path}")
    print(f"Audio root     : {audio_root}")
    print(f"Referenced keys: {len(referenced)}")
    print(f"Existing .ogg  : {len(existing_ogg)}")
    print()

    if missing:
        print(f"Missing referenced files ({len(missing)}):")
        for item in missing:
            print(f"  - {item}")
        print()
    else:
        print("Missing referenced files: none")

    if unused:
        print(f"Unused .ogg files ({len(unused)}):")
        for item in unused:
            print(f"  - {item}")
        print()
    else:
        print("Unused .ogg files: none")

    is_ok = not missing and not unused
    print("Result:", "OK" if is_ok else "ISSUES FOUND")
    return 0 if is_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
