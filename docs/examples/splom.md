<script setup>
  import { reset } from '@uwdata/vgplot';
  reset();
</script>

# Scatter Plot Matrix (SPLOM)

A scatter plot matrix enables inspection of pairwise bivariate distributions. Do points cluster or separate in some dimensions but not others? Select a region to highlight corresponding points across all plots.

<Example spec="/specs/yaml/splom.yaml" />

## Specification

::: code-group
<<< @/public/specs/esm/splom.js [JavaScript]
<<< @/public/specs/yaml/splom.yaml [YAML]
<<< @/public/specs/json/splom.json [JSON]
:::
