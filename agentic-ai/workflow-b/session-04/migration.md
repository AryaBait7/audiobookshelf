# Workflow B, session 04: htmlEntities (large data module) + htmlSanitizer + parseComicInfoMetadata

## Deviation from the plan table
Plan row 04 listed six L0 files including `htmlEntities` (2,236 lines). The batch-size rule says a file over 1,000 lines is its own batch with at most two small companions. So this session is `utils/htmlEntities` + its only consumer `utils/htmlSanitizer` (L1, 14 dependants) + `utils/parsers/parseComicInfoMetadata` (35 lines). The rest of row 04 (notifications, parseFullName, hls/opml generators) moves to session 05.

The growth condition is met (sessions 02 and 03 were green on the first full gate run with no recipe change), so the 12-file / 2,500-line limit now applies. This batch has 3 files, 2,320 lines.

## Typing decisions
* **htmlEntities:** `entities: Record<string, string>`. A string-keyed lookup table is how it is used (`entity in entities`, `entities[entity]`). Annotating it also stops TS from inferring a 2,000-property literal type. `module.exports.entities = …` → `export = { entities }`.
* **htmlSanitizer:**
  * imports: `import sanitizeHtml = require(...)`, plus `import htmlEntities = require('./htmlEntities'); const { entities } = htmlEntities` (the first-party destructure stays a load-time snapshot, as in the recipe);
  * `sanitize(html: unknown)` and `stripAllTags(html: unknown, …)`: both check `typeof html !== 'string'` at runtime and return `''`, so `unknown` is the honest input type;
  * `decodeHTMLEntities(strToDecode: string)`;
  * exports: `export = { sanitize, stripAllTags }`, the same keys in the same order.
* **parseComicInfoMetadata:** new `ComicInfoJson` (xml2js shape: every element is a `string[]`) and `ComicInfoMetadata` interfaces. The JSDoc pointed at the `BookScanner` typedef `BookMetadataObject`. A local interface avoids a type edge from a leaf parser up to the L8 scanner. The structural shape is compatible.
