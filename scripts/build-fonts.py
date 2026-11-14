#!/usr/bin/env python3
"""Build the self-hosted woff2 font subsets used by the site.

Source TTFs are intentionally kept outside Git in `.fontsrc/` because the
original families are large. The generated files are committed so a normal
install/deploy does not need font tooling.

Requires:
    python -m pip install fonttools brotli

Usage:
    python scripts/build-fonts.py
"""

from __future__ import annotations

import pathlib
import subprocess
import sys

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
FONT_SRC = ROOT / ".fontsrc"
FONT_OUT = ROOT / "client" / "public" / "fonts"
CHARSET_FILE = FONT_SRC / "subset-chars.txt"


SOURCE_FONTS = {
    "lxgw-wenkai-gb-subset.woff2": (
        FONT_SRC / "LXGWWenKaiGB" / "LXGWWenKaiGB-Regular.ttf",
        "ESRS WenKai",
    ),
    "maple-mono-subset.woff2": (
        FONT_SRC / "MapleMono" / "MapleMonoNormal-NF-CN-Regular.ttf",
        "ESRS Maple Mono",
    ),
}

TEXT_SUFFIXES = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".service",
    ".ts",
    ".txt",
    ".vue",
    ".yml",
}
SKIP_DIRS = {
    ".git",
    ".fontsrc",
    ".pnpm-store",
    "backups",
    "coverage",
    "data",
    "dist",
    "docs",
    "node_modules",
    "uploads",
}
SKIP_FILES = {"client/public/fonts/lxgw-wenkai-gb-subset.woff2", "client/public/fonts/maple-mono-subset.woff2"}
EXTRA_RANGES = [
    (0x0020, 0x007E),  # basic Latin
    (0x00A0, 0x00FF),  # Latin-1 supplement
    (0x2000, 0x206F),  # general punctuation
    (0x20A0, 0x20CF),  # currency symbols
    (0x2100, 0x214F),  # letterlike symbols
    (0x2190, 0x21FF),  # arrows
    (0x2200, 0x22FF),  # mathematical operators
    (0x2500, 0x257F),  # box drawing
    (0x25A0, 0x25FF),  # geometric shapes
    (0x2600, 0x26FF),  # miscellaneous symbols
    (0x3000, 0x303F),  # CJK punctuation
    (0xFF00, 0xFFEF),  # full-width forms
]


def add_range(target: set[str], start: int, end: int) -> None:
    for code in range(start, end + 1):
        target.add(chr(code))


def is_skipped(relative: str) -> bool:
    if relative in SKIP_FILES:
        return True
    return any(part in SKIP_DIRS for part in relative.split("/"))


def collect_chars() -> set[str]:
    chars: set[str] = set()
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT).as_posix()
        if is_skipped(relative):
            continue
        if path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        chars.update(ch for ch in text if ch.isprintable() or ch == " ")

    for start, end in EXTRA_RANGES:
        add_range(chars, start, end)

    # GB2312 level-1 characters cover the overwhelming majority of
    # simplified-Chinese article text without shipping the full 20k+ glyph set.
    for high in range(0xB0, 0xD8):
        for low in range(0xA1, 0xFF):
            try:
                chars.add(bytes((high, low)).decode("gb2312"))
            except UnicodeDecodeError:
                continue

    chars.discard("\n")
    chars.discard("\r")
    chars.discard("\t")
    return chars


def write_charset(chars: set[str]) -> None:
    FONT_SRC.mkdir(parents=True, exist_ok=True)
    CHARSET_FILE.write_text("".join(sorted(chars)), encoding="utf-8")


def run_subset(source: pathlib.Path, target: pathlib.Path) -> None:
    if not source.exists():
        raise SystemExit(f"Missing source font: {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable,
        "-m",
        "fontTools.subset",
        str(source),
        f"--text-file={CHARSET_FILE}",
        f"--output-file={target}",
        "--flavor=woff2",
        "--layout-features=*",
        "--name-IDs=*",
        "--name-legacy",
        "--name-languages=*",
        "--no-hinting",
        "--symbol-cmap",
        "--legacy-cmap",
        "--notdef-glyph",
        "--notdef-outline",
        "--recommended-glyphs",
    ]
    print(" ".join(command))
    subprocess.run(command, check=True)


def rename_subset(target: pathlib.Path, family: str) -> None:
    """Use a non-reserved family name for the modified OFL font."""
    font = TTFont(target)
    try:
        for record in font["name"].names:
            if record.nameID not in {1, 3, 4, 6, 16, 18, 21}:
                continue
            if record.nameID == 3:
                value = f"{family}; subset"
            elif record.nameID == 6:
                value = family.replace(" ", "")
            else:
                value = family
            record.string = value
        font.flavor = "woff2"
        font.save(target)
    finally:
        font.close()


def write_licenses() -> None:
    maple_license = FONT_SRC / "MapleMono" / "LICENSE.txt"
    if not maple_license.exists():
        raise SystemExit(f"Missing license file: {maple_license}")
    license_text = maple_license.read_text(encoding="utf-8")
    (FONT_OUT / "LICENSE-MapleMono.txt").write_text(license_text, encoding="utf-8")

    separator = "-----------------------------------------------------------"
    ofl_start = license_text.find(separator)
    if ofl_start == -1:
        raise SystemExit("Could not find the OFL body in the Maple Mono license")
    ofl = license_text[ofl_start:]

    lxgw = TTFont(FONT_SRC / "LXGWWenKaiGB" / "LXGWWenKaiGB-Regular.ttf", lazy=True)
    try:
        copyright_notice = next(
            record.toUnicode()
            for record in lxgw["name"].names
            if record.nameID == 0
        )
    finally:
        lxgw.close()

    # Some original name records use a legacy encoding; keep the notice
    # readable instead of copying mojibake from the source font.
    copyright_notice = "\n".join(
        line.split(", with Reserved Font Name")[0]
        for line in copyright_notice.splitlines()
    )
    copyright_notice += (
        "\nReserved Font Names are as declared in the original font.\n"
    )

    (FONT_OUT / "LICENSE-LXGW-WenKai-GB.txt").write_text(
        f"{copyright_notice}\n\n{ofl}", encoding="utf-8"
    )

    (FONT_OUT / "README.md").write_text(
        """# Self-hosted site fonts

These files are woff2 subsets generated from the original TTFs in `.fontsrc/`.

- `ESRS WenKai`: subset of LXGW WenKai GB Regular
  (<https://github.com/lxgw/LxgwWenKaiGB>), SIL Open Font License 1.1.
- `ESRS Maple Mono`: subset of Maple Mono Normal NF CN Regular
  (<https://github.com/subframe7536/maple-font>), SIL Open Font License 1.1.

The subsets are generated from the project's UI/article character set and
GB2312 level-1 characters. Characters outside the subset fall back to the
system font. Because these are modified fonts, the internal family names are
renamed to `ESRS WenKai` and `ESRS Maple Mono` in accordance with the OFL
reserved-name clause. The original copyright and license notices are preserved
in the adjacent license files.

Rebuild with:

```bash
python -m pip install fonttools brotli
python scripts/build-fonts.py
```

The original TTF source folders are not committed to Git; place them back in
`.fontsrc/` before rebuilding.
""",
        encoding="utf-8",
    )


def main() -> None:
    chars = collect_chars()
    write_charset(chars)
    print(f"Subset charset: {len(chars)} characters")

    for target_name, (source, family) in SOURCE_FONTS.items():
        target = FONT_OUT / target_name
        run_subset(source, target)
        rename_subset(target, family)
        print(f"Wrote {target} ({target.stat().st_size / 1024 / 1024:.2f} MiB)")

    write_licenses()
    print(f"Wrote font licenses to {FONT_OUT}")


if __name__ == "__main__":
    main()
