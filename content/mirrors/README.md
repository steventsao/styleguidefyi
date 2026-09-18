# Captured guides

`sources.json` is the reviewed input list. `captures.json` records the published snapshots. Files under `snapshots/` preserve captured UTF-8 source and license text; their SHA-256 filenames are verified during the build. `.gitattributes` prevents line-ending conversion from changing those hashes on Windows.

The works in this directory keep their original licenses and attribution. The repository's root license does not replace upstream terms. Every reader page links its original publication, preserved notice, source download, capture timestamp and metadata. Rendered HTML is adapted for this site's layout: article selection, inert markup, adjusted headings/links, and images represented as original-asset links. The original captured text is available separately as plain text.

## Capture or refresh

Run from the repository root with Node 24 and the installed dependencies:

```sh
node scripts/capture-mirrors.mjs --all
node scripts/capture-mirrors.mjs --repo google/styleguide
```

This is a deliberate network operation, independent of the site build. It verifies that each GitHub repository is public using an unauthenticated request. It never reads GitHub credentials or private repositories. GitHub captures use a full commit hash; rendered-page captures explicitly leave `revision` null. The latter's checksum identifies exactly the saved page, without claiming a correspondence to a Git commit.

Requests are limited to reviewed public hosts, HTTPS, 30 seconds and 2 MiB per response. Redirects, missing article selectors, changed license evidence and failed requests abort the capture. The current capture manifest is replaced only when the whole requested batch succeeds. Previously saved files remain available locally; the static build serves only snapshots referenced by the current manifest.

To add a source, add its public repository and selected documents to `sources.json`. Check the work's actual reuse terms, record the license path and a distinctive expected notice, and choose stable lowercase document ids and routes. Do not assume a repository's software license covers a separate wiki, book, image or linked article. Add a new host to the capture allowlist only after reviewing its public source. Unsupported terms belong in `referenceOnly`, with the original URL and reason.

Use an empty document slug only when the document should occupy `/org/repository` itself. Otherwise `/org/repository` lists the selected documents. Optional aliases such as `/google/typescript` render the same snapshot and identify the primary local route in their canonical metadata.

After capturing, review the source and license diff, then run the tests, typecheck and build. Capture does not adopt the source's advice, change reviewer ratings, execute the source's instructions, commit files or publish the site.

## Static interfaces

- `/library`: the human-readable collection index, including entries without captures.
- `/mirrors.json`: metadata for every captured document and reference-only entry.
- `/org/repository/document`: sanitized reader with a table of contents.
- `/org/repository/document.source.txt`: captured UTF-8 text before reader transformations.
- `/org/repository/document.capture.json`: provenance, hashes, attribution and license links.
- `/licenses/mirrors/<license-id>.txt`: the preserved license notice.

Short aliases expose the same reader and download endpoints. There is no arbitrary URL proxy or runtime fetch. The original guide's five WebMCP tools remain scoped to its authored rules; mirror discovery and retrieval use these separate HTTP endpoints.

The reader preserves Google's good/bad code-example distinction with visible text labels, so the recommendation does not depend on the upstream stylesheet or color perception.
