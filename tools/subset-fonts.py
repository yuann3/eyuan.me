# Cuts the Latin text fonts down to the characters below, to fit the 64 kB
# font Budget (yuanme#15). Run on the files Google Fonts serves, which are
# what fonts/ held before (git history), with fontTools 4.68 and brotli:
#
#   python3 tools/subset-fonts.py ORIGINALS_DIR
#
# It changes nothing else in a font: its bounds, metrics, glyph names and
# OS/2 ranges stay as Google wrote them. Recomputed, they move text by
# fractions of a pixel in Chromium on macOS.
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

PUNCTUATION = "U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026,U+2039-203A,U+20AC,U+2122,U+2190-2193,U+2197,U+2212,U+2264-2265"
# Geist sets prose, so it keeps Latin-1's letters too; Geist Mono and IBM
# Plex Mono set code, labels and one headline.
FONTS = {
    "geist-latin": "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153," + PUNCTUATION,
    "geist-mono-latin": "U+0020-007E,U+00A0,U+00B7,U+00D7," + PUNCTUATION,
    "ibm-plex-mono-500-latin": "U+0020-007E,U+00A0,U+00B7,U+00D7," + PUNCTUATION,
}

for name, unicodes in FONTS.items():
    font = TTFont(f"{sys.argv[1]}/{name}.woff2")
    options = subset.Options(
        flavor="woff2",
        layout_features=["*"],
        layout_scripts=["*"],
        name_IDs=["*"],
        notdef_outline=True,
        glyph_names=True,
        legacy_kern=True,
        drop_tables=[],
        recalc_bounds=False,
        recalc_timestamp=False,
        recalc_max_context=False,
        prune_unicode_ranges=False,
        prune_codepage_ranges=False,
    )
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(unicodes))
    subsetter.subset(font)
    font.save(f"fonts/{name}.woff2")
    cmap = sorted(font.getBestCmap())
    print(name, len(cmap), "characters")
