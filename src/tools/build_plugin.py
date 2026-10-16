"""Build the browser half: template + embedded artwork -> lib/client.mjs.

Reads  <package>/lib/client.template.mjs
       <package>/art.jpg
Writes <package>/lib/client.mjs

The bundle is named `.mjs` rather than `.js` on purpose: `.js` is on Windows'
list of high-risk extensions, so an archive containing it makes Explorer warn
"these files might be harmful" on download. `.mjs` is not on that list, and the
client module system serves the file by path, so the extension is irrelevant to
the app.

Every path is resolved relative to this file, so the package stays portable.
Verify the result with:  node --check lib/client.mjs
"""
import base64
import pathlib

PACKAGE = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = PACKAGE / "lib" / "client.template.mjs"
ART = PACKAGE / "art.jpg"
DEST = PACKAGE / "lib" / "client.mjs"
PLACEHOLDER = "__ART__"


def main() -> None:
    for path in (TEMPLATE, ART):
        if not path.exists():
            raise SystemExit(f"missing input: {path}")

    template = TEMPLATE.read_text(encoding="utf-8")
    if PLACEHOLDER not in template:
        raise SystemExit(f"template has no {PLACEHOLDER} placeholder; is it already built?")

    encoded = base64.b64encode(ART.read_bytes()).decode("ascii")
    bundle = template.replace(PLACEHOLDER, encoded)
    if PLACEHOLDER in bundle:
        raise SystemExit("placeholder left unfilled")

    DEST.write_text(bundle, encoding="utf-8")
    print(f"embedded {ART.name} as {len(encoded)} base64 chars")
    print(f"wrote {DEST} ({DEST.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
