const componentImports = {
  HorizontalBarChart: '$lib/components/HorizontalBarChart.svelte',
  StackedBarChart: '$lib/components/StackedBarChart.svelte'
};

function walk(node, visit) {
  visit(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visit);
  }
}

/**
 * Make shared MDsveX components available only when a document uses them.
 */
export default function remarkComponents() {
  return (tree) => {
    const used = new Set();
    const imported = new Set();

    walk(tree, (node) => {
      if (node.type === 'html') {
        for (const [name, path] of Object.entries(componentImports)) {
          if (node.value.includes(`<${name}`)) used.add(name);
          if (node.value.includes(`from '${path}'`) || node.value.includes(`from "${path}"`)) {
            imported.add(name);
          }
        }
      }
    });

    const imports = [...used]
      .filter((name) => !imported.has(name))
      .map((name) => `  import ${name} from '${componentImports[name]}';`);

    if (imports.length) {
      tree.children.unshift({
        type: 'html',
        value: `<script>
${imports.join('\n')}
</script>`
      });
    }
  };
}
