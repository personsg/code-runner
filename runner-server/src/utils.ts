export function extractDependencies(code: string): string[] {
  const fileContent = code
  const importRegex = /import\s+.*\s+from\s+['"](.+)['"];/g
  const requireRegex = /require\(['"](.+)['"]\)/g

  let match
  const dependencies = new Set()

  // Extracting dependencies from import statements
  while ((match = importRegex.exec(fileContent)) !== null) {
    dependencies.add(match[1])
  }

  // Extracting dependencies from require statements
  while ((match = requireRegex.exec(fileContent)) !== null) {
    dependencies.add(match[1])
  }

  return Array.from(dependencies) as string[]
}

export function stripDependencies(code: string, seenDependencies: string[]) {
  let fileContent = code

  seenDependencies.forEach(dep => {
    const requireRegex = new RegExp(
      `(?:let|const|var) .* = require\\((?:'|")${dep}(?:'|")\\);?`,
      'g',
    )
    const importRegex = new RegExp(`import .* from (?:'|")${dep}(?:'|");?`, 'g')

    fileContent = fileContent.replace(requireRegex, '')
    fileContent = fileContent.replace(importRegex, '')
  })

  return fileContent
}

export function replaceConstWithLet(code: string) {
  return code.replace(/const /g, 'var ')
}
