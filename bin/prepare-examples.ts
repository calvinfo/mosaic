#! /usr/bin/env node
import { basename, extname, join, resolve } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { specToModule } from "@uwdata/vgplot";
import { parse } from "yaml";

const baseDir = "docs";
const yamlDir = join(baseDir, "public", "specs", "yaml");
const jsonDir = join(baseDir, "public", "specs", "json");
const esmDir = join(baseDir, "public", "specs", "esm");
const exampleDir = join(baseDir, "examples");

const files = await Promise.allSettled((await readdir(yamlDir))
    .filter((file) => extname(file) === ".yaml")
    .map(async (file) => {
      const base = basename(file, ".yaml");
      const text = await readFile(resolve(yamlDir, file), "utf8");
      const spec = parse(text);
      const code = await specToModule(spec);

      try {
        // write JSON spec
        await writeFile(
          resolve(jsonDir, `${base}.json`),
          JSON.stringify(spec, undefined, 2)
        );

        // write ESM DSL spec
        await writeFile(resolve(esmDir, `${base}.js`), code);

        // write examples page
        await writeFile(
          resolve(exampleDir, `${base}.md`),
          examplePage(base, spec.meta)
        );
      } catch (err) {
        console.error(err);
      }

      return base;
    })
);

// output successfully written examples
console.log(
  JSON.stringify(
    files
      .filter((x) => x.status === "fulfilled")
      .map((x) => (x as PromiseFulfilledResult<string>).value),
    undefined,
    2
  )
);

// output unsuccessful example errors
files
  .filter((x) => x.status === "rejected")
  .forEach((x) => console.error((x as PromiseRejectedResult).reason));

function examplePage(
  spec: string,
  {
    title = spec,
    description,
    credit,
  }: { title?: string; description?: string; credit?: string } = {}
) {
  return `<script setup>
  import { reset } from '@uwdata/vgplot';
  reset();
</script>

# ${title}
${description ? `\n${description.trim()}\n` : ""}
<Example spec="/specs/yaml/${spec}.yaml" />
${credit ? `\n**Credit**: ${credit}\n` : ""}
## Specification

::: code-group
<<< @/public/specs/esm/${spec}.js [JavaScript]
<<< @/public/specs/yaml/${spec}.yaml [YAML]
<<< @/public/specs/json/${spec}.json [JSON]
:::
`;
}
