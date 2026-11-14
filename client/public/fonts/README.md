# Self-hosted site fonts

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
