// Checks the cookbook's recipes and wiring, and generates its index.
//
//   node scripts/cookbook-index.mjs               write cookbook/README.md
//   node scripts/cookbook-index.mjs --check       change nothing; fail on any
//                                                 problem, on a stale index
//                                                 and on a stale record
//   node scripts/cookbook-index.mjs --selftest    prove every check can fail
//   node scripts/cookbook-index.mjs --digest      print the sources' digest
//
//   --skip-record   with --check: leave cookbook/verified.json out. For work
//                   in progress only. CI never passes it.
//
// The type check (`tsc -p cookbook`) catches an API that does not exist. This
// script catches what types cannot: a header that drifted from its code, a
// value import from a declarations-only package, and an owner-bound domain
// reached through the wrong API object.
//
// Files are parsed with the TypeScript compiler API, so a call that appears
// only in a comment is never mistaken for code.
//
// Design: design/specifications/cookbook/cookbook-design.md §4.2–§4.4, §4.6.

import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'

import {
  checkRecord,
  computeDigest,
  COOKBOOK_DIR,
  listCases,
  listFiles,
  listRecipes,
  REPO_ROOT,
} from './cookbook-lib.mjs'

const FIXTURES_DIR = join(REPO_ROOT, 'scripts', 'cookbook-fixtures')

const REQUIRED_TAGS = ['recipe', 'aliases', 'apis', 'related']
const REQUIRED_SECTIONS = [
  'When to use',
  'Preconditions',
  'Side effects',
  'Pitfalls',
  "Don't",
  'Wiring',
]

/**
 * Domains whose per-app object differs from the anonymous one. A registration
 * made through `window.CyWebApi` is not removed when the app is disabled, and
 * its `panel.open` does not prefer the app's own tab.
 * Source: the host's `buildPerAppApis` (src/app-api/core/perAppApis.ts).
 */
const OWNER_BOUND = [
  'resource',
  'dialog',
  'appData',
  'contextMenu',
  'nodeGraphics',
  'panel',
]

const CATEGORY_ORDER = [
  'network',
  'elements',
  'data',
  'style',
  'selection',
  'layout',
  'events',
  'ui',
]

// ── Parsing ─────────────────────────────────────────────────────────────────

const parse = (path, text) =>
  ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

/** The file's leading doc comment, without its ` * ` gutter. */
const readHeader = (text) => {
  const first = (ts.getLeadingCommentRanges(text, 0) ?? [])[0]
  if (first === undefined || !text.startsWith('/**', first.pos)) return null
  return text
    .slice(first.pos + 3, first.end - 2)
    .split('\n')
    .map((line) => line.replace(/^\s*\* ?/, ''))
    .join('\n')
}

/** `@tag value`, where the value may continue on indented lines. */
const readTags = (header) => {
  const tags = {}
  let current = null
  for (const line of header.split('\n')) {
    const tag = /^@(\w+)\s*(.*)$/.exec(line)
    if (tag !== null) {
      current = tag[1]
      tags[current] = tag[2].trim()
    } else if (current !== null && /^\s+\S/.test(line)) {
      tags[current] += ` ${line.trim()}`
    } else {
      current = null
    }
  }
  return tags
}

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '')

const isExported = (node) =>
  (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0

/** `Pick<CyWebApiType, 'a' | 'b'>` → { base, domains }, or null. */
const readApisType = (typeNode) => {
  if (
    typeNode === undefined ||
    !ts.isTypeReferenceNode(typeNode) ||
    typeNode.typeName.getText() !== 'Pick' ||
    typeNode.typeArguments?.length !== 2
  ) {
    return null
  }
  const [base, keys] = typeNode.typeArguments
  const members = ts.isUnionTypeNode(keys) ? keys.types : [keys]
  const domains = []
  for (const member of members) {
    if (!ts.isLiteralTypeNode(member) || !ts.isStringLiteral(member.literal)) {
      return null
    }
    domains.push(member.literal.text)
  }
  return { base: base.getText(), domains }
}

/**
 * Read one recipe: its header, its one exported function, and every API
 * method it calls. `problems` collects what is wrong with it.
 */
const readRecipe = (cookbookDir, recipe, problems) => {
  const report = (code, message) =>
    problems.push({ code, file: recipe.path, message })

  const text = readFileSync(join(cookbookDir, recipe.path), 'utf8')
  const source = parse(recipe.path, text)
  const result = {
    ...recipe,
    title: '',
    aliases: [],
    apis: [],
    related: [],
    functionName: null,
    apisIndex: -1,
    ownerBound: false,
  }

  // Header: tags and sections.
  const header = readHeader(text)
  if (header === null) {
    report('missing-tag', 'the file does not start with a /** header */')
  } else {
    const tags = readTags(header)
    for (const tag of REQUIRED_TAGS) {
      if (tags[tag] === undefined) report('missing-tag', `no @${tag} tag`)
    }
    if (tags.recipe === '') report('missing-tag', '@recipe has no title')
    if (tags.aliases === '') report('missing-tag', '@aliases is empty')
    result.title = tags.recipe ?? ''
    result.aliases = splitList(tags.aliases ?? '')
    result.apis = splitList(tags.apis ?? '')
    result.related = splitList(tags.related ?? '')
    for (const section of REQUIRED_SECTIONS) {
      if (!header.split('\n').includes(`## ${section}`)) {
        report('missing-section', `no "## ${section}" section`)
      }
    }
  }

  // Imports: a core recipe takes every runtime value through `apis`.
  // @cytoscape-web/api-types ships declarations only, so a value import from
  // it compiles and then fails at run time.
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const from = statement.moduleSpecifier.text
    if (from.startsWith('.')) {
      report('foreign-import', `imports ${from}: a recipe is one file`)
    } else if (!recipe.isComponent) {
      if (statement.importClause?.isTypeOnly !== true) {
        report(
          'value-import',
          `imports a value from ${from}: use "import type", and take ` +
            `runtime values through apis`,
        )
      } else if (from !== 'cyweb/ApiTypes') {
        report('foreign-import', `imports types from ${from}`)
      }
    }
  }

  // The one exported function, and the functions of this file.
  const localFunctions = new Map()
  const exportedFunctions = []
  for (const statement of source.statements) {
    if (!ts.isFunctionDeclaration(statement) || statement.name === undefined) {
      continue
    }
    localFunctions.set(statement.name.text, statement)
    if (isExported(statement)) exportedFunctions.push(statement)
  }
  if (exportedFunctions.length !== 1) {
    report(
      'recipe-function',
      `a recipe exports exactly one function, and this file exports ` +
        `${exportedFunctions.length}`,
    )
  }
  const main = exportedFunctions[0]
  let apisType = null
  if (main !== undefined) {
    result.functionName = main.name.text
    result.apisIndex = main.parameters.findIndex(
      (p) => p.name.getText() === 'apis',
    )
    if (result.apisIndex === -1) {
      report('apis-signature', `${main.name.text} has no parameter named apis`)
    } else {
      apisType = readApisType(main.parameters[result.apisIndex].type)
      if (apisType === null) {
        report(
          'apis-signature',
          `the apis parameter must be typed Pick<CyWebApiType, …> or ` +
            `Pick<AppContextApis, …>`,
        )
      }
    }
  }

  // API calls: `apis.<domain>.<method>(…)`, anywhere in the file. Any other
  // use of `apis` is rejected, because the @apis check could not follow it.
  const called = new Set()
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === 'apis') {
      const parent = node.parent
      const isCallRoot =
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        ts.isPropertyAccessExpression(parent.parent) &&
        parent.parent.expression === parent &&
        ts.isCallExpression(parent.parent.parent) &&
        parent.parent.parent.expression === parent.parent
      const isDeclaration = ts.isParameter(parent) && parent.name === node
      // Handed on to another function of this file, in its own apis slot.
      const isPassedOn =
        ts.isCallExpression(parent) &&
        ts.isIdentifier(parent.expression) &&
        localFunctions
          .get(parent.expression.text)
          ?.parameters[parent.arguments.indexOf(node)]?.name.getText() ===
          'apis'
      if (isCallRoot) {
        called.add(`${parent.name.text}.${parent.parent.name.text}`)
      } else if (!isDeclaration && !isPassedOn) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart())
        report(
          'apis-untraceable',
          `line ${line + 1}: apis is used in a way the @apis check cannot ` +
            `follow. Call apis.<domain>.<method>(…) directly`,
        )
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  const listed = new Set(result.apis)
  const unlisted = [...called].filter((api) => !listed.has(api))
  const uncalled = [...listed].filter((api) => !called.has(api))
  if (unlisted.length > 0) {
    report('apis-mismatch', `called but not in @apis: ${unlisted.join(', ')}`)
  }
  if (uncalled.length > 0) {
    report('apis-mismatch', `in @apis but not called: ${uncalled.join(', ')}`)
  }

  // The parameter type states the recipe's dependencies, and an owner-bound
  // one must say so.
  const domains = new Set([...called].map((api) => api.split('.')[0]))
  result.ownerBound = [...domains].some((d) => OWNER_BOUND.includes(d))
  if (apisType !== null) {
    if (result.ownerBound && apisType.base !== 'AppContextApis') {
      report(
        'owner-bound-declaration',
        `calls ${[...domains].filter((d) => OWNER_BOUND.includes(d)).join(', ')}, ` +
          `which only an app's own API object provides: type apis as ` +
          `Pick<AppContextApis, …>`,
      )
    }
    if (!['CyWebApiType', 'AppContextApis'].includes(apisType.base)) {
      report('apis-signature', `apis is a Pick of ${apisType.base}`)
    }
    const declared = new Set(apisType.domains)
    const missing = [...domains].filter((d) => !declared.has(d))
    const unused = [...declared].filter((d) => !domains.has(d))
    if (missing.length > 0 || unused.length > 0) {
      report(
        'apis-signature',
        `the apis type names ${[...declared].join(', ') || 'nothing'}, and ` +
          `the code calls ${[...domains].join(', ') || 'nothing'}`,
      )
    }
  }

  return result
}

// ── Where `apis` comes from, in wiring and in the verification app ──────────

/** The nearest enclosing function-like node. */
const enclosingFunction = (node) => {
  let current = node.parent
  while (current !== undefined && !ts.isFunctionLike(current)) {
    current = current.parent
  }
  return current
}

const functionName = (fn) => {
  if (fn.name !== undefined) return fn.name.getText()
  const parent = fn.parent
  if (ts.isPropertyAssignment(parent) || ts.isVariableDeclaration(parent)) {
    return parent.name.getText()
  }
  return null
}

/**
 * Whether `argument` is one of the few ways an app's own API object may be
 * written. Anything else is rejected rather than traced: an alias, a
 * destructured name, `window.CyWebApi`, a `use*Api` hook.
 */
const isAllowedApisSource = (argument, source, allowHarness) => {
  // 1. `context.apis`, inside mount(context).
  if (
    ts.isPropertyAccessExpression(argument) &&
    argument.name.text === 'apis' &&
    ts.isIdentifier(argument.expression)
  ) {
    const owner = argument.expression.text
    let fn = enclosingFunction(argument)
    while (fn !== undefined) {
      if (
        functionName(fn) === 'mount' &&
        fn.parameters.some((p) => p.name.getText() === owner)
      ) {
        return true
      }
      fn = enclosingFunction(fn)
    }
    // 4. In the verification app only: the one harness field that mount()
    //    assigned from context.apis.
    return allowHarness && owner === 'harness'
  }
  if (!ts.isIdentifier(argument)) return false

  // 2. The parameter of an onClick arrow function.
  let fn = enclosingFunction(argument)
  while (fn !== undefined) {
    if (
      functionName(fn) === 'onClick' &&
      fn.parameters.some((p) => p.name.getText() === argument.text)
    ) {
      return true
    }
    fn = enclosingFunction(fn)
  }

  // 3. A const initialized from `useAppContext()?.apis`.
  let found = false
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === argument.text &&
      node.initializer !== undefined &&
      /^useAppContext\(\)\?\.apis$/.test(node.initializer.getText())
    ) {
      found = true
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

const readCallSites = (cookbookDir, dir, recipes, problems) => {
  const allowHarness = dir.startsWith('runner/app')
  const files = listFiles(join(cookbookDir, dir)).filter((path) =>
    /\.tsx?$/.test(path),
  )
  for (const file of files) {
    const path = `${dir}/${file}`
    const text = readFileSync(join(cookbookDir, path), 'utf8')
    const source = parse(path, text)

    // Local name → recipe, for every recipe function this file imports.
    const imported = new Map()
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement)) continue
      const match = /recipes\/([^/]+\/[^/.]+)$/.exec(
        statement.moduleSpecifier.text,
      )
      const bindings = statement.importClause?.namedBindings
      if (match === null || bindings === undefined) continue
      const recipe = recipes.find((r) => r.id === match[1])
      if (recipe === undefined || !ts.isNamedImports(bindings)) continue
      for (const element of bindings.elements) {
        const exported = (element.propertyName ?? element.name).text
        if (exported === recipe.functionName) {
          imported.set(element.name.text, recipe)
        }
      }
    }

    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const recipe = imported.get(node.expression.text)
        const argument = node.arguments[recipe?.apisIndex ?? -1]
        if (
          recipe?.ownerBound === true &&
          argument !== undefined &&
          !isAllowedApisSource(argument, source, allowHarness)
        ) {
          const { line } = source.getLineAndCharacterOfPosition(
            node.getStart(),
          )
          problems.push({
            code: 'apis-source',
            file: path,
            message:
              `line ${line + 1}: ${recipe.functionName} needs an app's own ` +
              `API object, and "${argument.getText()}" is not one of the ` +
              `allowed forms (context.apis in mount, the onClick parameter, ` +
              `a const from useAppContext()?.apis)`,
          })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
}

// ── The whole tree ──────────────────────────────────────────────────────────

/** Read a cookbook tree and report everything wrong with it. */
const readCookbook = (cookbookDir) => {
  const problems = []
  const recipes = listRecipes(cookbookDir).map((recipe) =>
    readRecipe(cookbookDir, recipe, problems),
  )

  const ids = new Set(recipes.map((r) => r.id))
  for (const recipe of recipes) {
    for (const related of recipe.related) {
      if (!ids.has(related)) {
        problems.push({
          code: 'unknown-related',
          file: recipe.path,
          message: `@related names ${related}, which is not a recipe`,
        })
      }
    }
  }

  // Every recipe has a case, and every case has a recipe. A case file is
  // named after its recipe and declares the recipe's id.
  const cases = listCases(cookbookDir)
  const caseIds = new Set()
  for (const file of cases) {
    const text = readFileSync(
      join(cookbookDir, 'runner', 'cases', file),
      'utf8',
    )
    const id = /\bid:\s*'([^']+)'/.exec(text)?.[1]
    if (id === undefined || !ids.has(id)) {
      problems.push({
        code: 'orphan-case',
        file: `runner/cases/${file}`,
        message: `declares id ${id ?? '(none)'}, which is not a recipe`,
      })
    } else if (id.split('/')[1] !== file.replace(/\.ts$/, '')) {
      problems.push({
        code: 'orphan-case',
        file: `runner/cases/${file}`,
        message: `is named differently from its recipe, ${id}`,
      })
    } else {
      caseIds.add(id)
    }
  }
  for (const recipe of recipes) {
    if (!caseIds.has(recipe.id)) {
      problems.push({
        code: 'missing-case',
        file: recipe.path,
        message:
          `no case at runner/cases/${recipe.id.split('/')[1]}.ts: a recipe ` +
          `without a passing real-host case is not in the catalog`,
      })
    }
  }

  readCallSites(cookbookDir, 'wiring', recipes, problems)
  readCallSites(cookbookDir, 'runner/app', recipes, problems)

  return { recipes, problems }
}

// ── The index ───────────────────────────────────────────────────────────────

const firstSentence = (cookbookDir, path) => {
  const header = readHeader(readFileSync(join(cookbookDir, path), 'utf8'))
  return (header ?? '').trim().split('\n')[0].trim()
}

const renderIndex = (cookbookDir, recipes) => {
  const categories = [...new Set(recipes.map((r) => r.category))].sort(
    (a, b) => {
      const [ia, ib] = [CATEGORY_ORDER.indexOf(a), CATEGORY_ORDER.indexOf(b)]
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1 || ib !== -1) return ia === -1 ? 1 : -1
      return a.localeCompare(b)
    },
  )
  const cell = (text) => text.replace(/\|/g, '\\|')

  const lines = [
    '<!-- Generated by scripts/cookbook-index.mjs from the recipes’ headers.',
    '     Do not edit: run `node scripts/cookbook-index.mjs`. -->',
    '',
    '# Cytoscape Web App Cookbook',
    '',
    'Task-oriented recipes for Cytoscape Web apps. Each recipe is one file:',
    'a function of `apis` that performs one task, with a header that says when',
    'to use it, what it changes, and what not to do.',
    '',
    '- **Using a recipe:** [USING-RECIPES.md](USING-RECIPES.md)',
    '- **Writing one:** [WRITING-RECIPES.md](WRITING-RECIPES.md)',
    '- **What these were verified with:** [verified.json](verified.json), and',
    '  [runner/README.md](runner/README.md) for how',
    '',
    `${recipes.length} recipes. Find one by the words in "Also asked as".`,
    '',
  ]
  for (const category of categories) {
    lines.push(`## ${category}`, '')
    lines.push('| Recipe | Also asked as | Calls |', '|---|---|---|')
    for (const recipe of recipes.filter((r) => r.category === category)) {
      lines.push(
        `| [${cell(recipe.title)}](${recipe.path}) ` +
          `| ${cell(recipe.aliases.join(', '))} ` +
          `| ${recipe.apis.map((api) => `\`${api}\``).join(', ')} |`,
      )
    }
    lines.push('')
  }

  lines.push('## Wiring', '')
  lines.push(
    'Every recipe takes `apis`. These files show where `apis` comes from at',
    'each call site.',
    '',
  )
  for (const file of listFiles(join(cookbookDir, 'wiring'))) {
    const path = `wiring/${file}`
    lines.push(`- [${path}](${path}) — ${firstSentence(cookbookDir, path)}`)
  }
  lines.push('')
  return lines.join('\n')
}

// ── Commands ────────────────────────────────────────────────────────────────

const printProblems = (problems) => {
  for (const problem of problems) {
    console.error(`  ✗ [${problem.code}] ${problem.file}: ${problem.message}`)
  }
}

/**
 * `ok` is a small cookbook tree with nothing wrong: the control. Every other
 * fixture holds only what differs from it (one changed file, or a
 * `remove.txt`), and names the problem codes it must produce in `expect.txt`.
 * A fixture that passes, or that fails for another reason, means a check has
 * stopped working.
 */
const selftest = () => {
  const names = readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const work = mkdtempSync(join(tmpdir(), 'cookbook-fixtures-'))
  let failed = 0
  try {
    for (const name of names) {
      const fixture = join(FIXTURES_DIR, name)
      const tree = join(work, name)
      cpSync(join(FIXTURES_DIR, 'ok'), tree, { recursive: true })
      cpSync(fixture, tree, { recursive: true })
      const removePath = join(fixture, 'remove.txt')
      if (existsSync(removePath)) {
        for (const path of readFileSync(removePath, 'utf8').split('\n')) {
          if (path.trim() !== '') rmSync(join(tree, path.trim()))
        }
      }

      const expected = readFileSync(join(fixture, 'expect.txt'), 'utf8').trim()
      const codes = [
        ...new Set(readCookbook(tree).problems.map((p) => p.code)),
      ]
      const got = codes.length === 0 ? 'ok' : codes.join(' ')
      const pass = got === expected
      if (!pass) failed += 1
      console.log(
        `  ${pass ? '✓' : '✗'} ${name}: expected ${expected}, got ${got}`,
      )
    }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
  if (failed > 0) {
    console.error(`\n✗ self-test FAILED: ${failed} of ${names.length} fixtures`)
    process.exit(1)
  }
  console.log(
    `\n✓ self-test passed: ${names.length} fixtures, each rejected for the ` +
      `reason it names\n`,
  )
}

const main = () => {
  const args = process.argv.slice(2)
  if (args.includes('--selftest')) return selftest()
  if (args.includes('--digest')) return console.log(computeDigest())

  const { recipes, problems } = readCookbook(COOKBOOK_DIR)
  if (problems.length > 0) {
    console.error(`\nCookbook — ${problems.length} problems\n`)
    printProblems(problems)
    process.exit(1)
  }

  const indexPath = join(COOKBOOK_DIR, 'README.md')
  const index = renderIndex(COOKBOOK_DIR, recipes)

  if (!args.includes('--check')) {
    writeFileSync(indexPath, index)
    console.log(`✓ wrote cookbook/README.md — ${recipes.length} recipes`)
    return
  }

  const current = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''
  const stale = []
  if (current.replace(/\r\n/g, '\n') !== index) {
    stale.push(
      'cookbook/README.md is not what the recipes generate: run ' +
        '`node scripts/cookbook-index.mjs` and commit the result',
    )
  }
  if (!args.includes('--skip-record')) stale.push(...checkRecord())
  if (stale.length > 0) {
    console.error(`\nCookbook — ${stale.length} problems\n`)
    for (const message of stale) console.error(`  ✗ ${message}`)
    process.exit(1)
  }
  console.log(
    `✓ cookbook: ${recipes.length} recipes, the index is current` +
      (args.includes('--skip-record') ? '' : ', the record is current'),
  )
}

main()
