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
import { join, posix } from 'node:path'

import ts from 'typescript'

import {
  checkRecord,
  computeDigest,
  existsAt,
  git,
  pinnedCommit,
  readApiTypes,
  readHosts,
  uncommittedSources,
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

/** Whether a binding name or pattern declares `name`. */
const bindsName = (nameNode, name) => {
  if (ts.isIdentifier(nameNode)) return nameNode.text === name
  return nameNode.elements.some(
    (element) => !ts.isOmittedExpression(element) && bindsName(element.name, name),
  )
}

/**
 * The declaration an identifier refers to, found by walking out through its
 * lexical scopes, as the compiler would. Returns
 * `{ kind: 'parameter', fn }`, `{ kind: 'const', declaration }`, `{ kind:
 * 'other' }` for any other binding (let, var, a destructured name, an import,
 * a loop or catch variable), or null when nothing in the file declares it.
 */
const resolveBinding = (identifier) => {
  const name = identifier.text
  const declaresIn = (list) =>
    list.declarations.find((d) => bindsName(d.name, name))
  for (let scope = identifier.parent; scope !== undefined; scope = scope.parent) {
    if (ts.isFunctionLike(scope)) {
      const parameter = scope.parameters.find((p) => bindsName(p.name, name))
      if (parameter !== undefined) {
        return ts.isIdentifier(parameter.name)
          ? { kind: 'parameter', fn: scope }
          : { kind: 'other' }
      }
    }
    if (
      (ts.isForStatement(scope) ||
        ts.isForOfStatement(scope) ||
        ts.isForInStatement(scope)) &&
      scope.initializer !== undefined &&
      ts.isVariableDeclarationList(scope.initializer) &&
      declaresIn(scope.initializer) !== undefined
    ) {
      return { kind: 'other' }
    }
    if (
      ts.isCatchClause(scope) &&
      scope.variableDeclaration !== undefined &&
      bindsName(scope.variableDeclaration.name, name)
    ) {
      return { kind: 'other' }
    }
    if (!('statements' in scope)) continue
    for (const statement of scope.statements) {
      if (ts.isVariableStatement(statement)) {
        const declaration = declaresIn(statement.declarationList)
        if (declaration === undefined) continue
        const isConst =
          (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
        return isConst && ts.isIdentifier(declaration.name)
          ? { kind: 'const', declaration }
          : { kind: 'other' }
      }
      if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement)) &&
        statement.name?.text === name
      ) {
        return { kind: 'other' }
      }
      if (
        ts.isImportDeclaration(statement) &&
        statement.importClause !== undefined &&
        (statement.importClause.name?.text === name ||
          (statement.importClause.namedBindings !== undefined &&
            (ts.isNamespaceImport(statement.importClause.namedBindings)
              ? statement.importClause.namedBindings.name.text === name
              : statement.importClause.namedBindings.elements.some(
                  (element) => element.name.text === name,
                ))))
      ) {
        return { kind: 'other' }
      }
    }
  }
  return null
}

/**
 * Whether `argument` is one of the few ways an app's own API object may be
 * written. Anything else is rejected rather than traced: an alias, a
 * destructured name, `window.CyWebApi`, a `use*Api` hook. Each form is checked
 * against the declaration the argument actually refers to, so a name declared
 * correctly in one function does not vouch for the same name in another.
 */
const isAllowedApisSource = (argument, allowHarness) => {
  // 1. `context.apis`, where `context` is the parameter of mount().
  if (
    ts.isPropertyAccessExpression(argument) &&
    argument.name.text === 'apis' &&
    ts.isIdentifier(argument.expression)
  ) {
    const owner = resolveBinding(argument.expression)
    if (owner?.kind === 'parameter' && functionName(owner.fn) === 'mount') {
      return true
    }
    // 4. In the verification app only: the one harness field that mount()
    //    assigned from context.apis.
    return allowHarness && argument.expression.text === 'harness'
  }
  if (!ts.isIdentifier(argument)) return false

  const binding = resolveBinding(argument)
  // 2. The parameter of an onClick function.
  if (binding?.kind === 'parameter') {
    return functionName(binding.fn) === 'onClick'
  }
  // 3. A const initialized from `useAppContext()?.apis`.
  return (
    binding?.kind === 'const' &&
    binding.declaration.initializer !== undefined &&
    /^useAppContext\(\)\?\.apis$/.test(
      binding.declaration.initializer.getText(),
    )
  )
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
          !isAllowedApisSource(argument, allowHarness)
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
  // The minimal runner gives every case the anonymous window.CyWebApi, which
  // is never an allowed source: an owner-bound recipe's case cannot live
  // here until Phase 3 gives it an app's own API object.
  readCallSites(cookbookDir, 'runner/cases', recipes, problems)
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

// ── llms.txt and llms-full.txt ──────────────────────────────────────────────
//
// Pages serves main:/docs as committed, so both files are generated here and
// committed into docs/, never generated by a workflow (design D-13). Every link
// is pinned: examples files to the last commit that changed cookbook/ or
// guides/, the host's API reference to the floor release's tag commit.

const LLMS_PATH = join(REPO_ROOT, 'docs', 'llms.txt')
const LLMS_FULL_PATH = join(REPO_ROOT, 'docs', 'llms-full.txt')
const EXAMPLES_REPO = 'cytoscape/cytoscape-web-app-examples'
const HOST_REPO = 'cytoscape/cytoscape-web'
const PAGES_URL = 'https://cytoscape.org/cytoscape-web-app-examples'

const rawUrl = (commit, path) =>
  `https://raw.githubusercontent.com/${EXAMPLES_REPO}/${commit}/${path}`
const hostUrl = (commit, path) =>
  `https://raw.githubusercontent.com/${HOST_REPO}/${commit}/${path}`
const treeUrl = (commit, path) =>
  `https://github.com/${EXAMPLES_REPO}/tree/${commit}/${path}`

/** `repo/(blob|tree)/<ref>/path` or raw `repo/<ref>/path` → { ref, path }. */
const githubTarget = (url, repo) => {
  const match =
    new RegExp(`^https://github\\.com/${repo}/(?:blob|tree)/([^/]+)/?(.*)$`).exec(url) ??
    new RegExp(`^https://raw\\.githubusercontent\\.com/${repo}/([^/]+)/?(.*)$`).exec(url)
  return match === null ? null : { ref: match[1], path: match[2] }
}

/** Markdown outside fenced code, where a link is a link. */
const outsideFences = (text) => text.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '')

/**
 * A Markdown document from `cookbook/`, with every link made absolute and
 * pinned: relative paths to the pinned commit (raw for a file, the tree page
 * for a directory), and links into either repository's branches to the pin
 * or to the floor's commit. llms-full.txt is read away from the repository,
 * where a relative link or a branch name points at nothing, or at something
 * else later.
 */
const pinLinks = (markdown, base, sources) => {
  const { pinned, floor } = sources
  return markdown.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    if (target.startsWith('#')) return whole
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      const host = githubTarget(target, HOST_REPO)
      if (host !== null) return `](${hostUrl(floor.commit, host.path)})`
      const examples = githubTarget(target, EXAMPLES_REPO)
      if (examples !== null) return `](${rawUrl(pinned, examples.path)})`
      return whole
    }
    const [path, hash] = target.split('#')
    const resolved = posix.normalize(posix.join(base, path)).replace(/\/$/, '')
    const isTree = git(['cat-file', '-t', `${pinned}:${resolved}`]) === 'tree'
    const url = isTree ? treeUrl(pinned, resolved) : rawUrl(pinned, resolved)
    return `](${url}${hash === undefined ? '' : `#${hash}`})`
  })
}

const GUIDES = [
  ['getting-started.md', 'Scaffold, configure and run an app'],
  ['architecture-overview.md', 'Module Federation, the type system, API layers'],
  ['registration-patterns.md', 'Panels, menus and context menus'],
  ['lifecycle-and-cleanup.md', 'mount, unmount and what the host cleans up'],
  ['troubleshooting.md', 'Build and runtime errors'],
]

/** Everything both files say, read from the working tree (see --llms). */
const readLlmsSources = (recipes) => {
  const pinned = pinnedCommit()
  const record = JSON.parse(
    readFileSync(join(COOKBOOK_DIR, 'verified.json'), 'utf8'),
  )
  const hosts = readHosts()
  const floor = hosts.find((h) => h.role === 'floor') ?? hosts[0]
  const wiring = listFiles(join(COOKBOOK_DIR, 'wiring')).map(
    (file) => `wiring/${file}`,
  )
  return { pinned, record, hosts, floor, wiring, recipes }
}

const renderHeader = ({ pinned, record, hosts }) => [
  '# Cytoscape Web App Cookbook',
  '',
  '> Task-oriented recipes for Cytoscape Web apps: one TypeScript function per',
  '> task, with a header that says when to use it, what it changes, and what',
  '> not to do. Each compiles against the published API types and passed a',
  '> case in a running Cytoscape Web.',
  '',
  `- Examples commit: \`${pinned}\`. Every link below is pinned to it.`,
  `- Verified on: ${hosts
    .map((h) => `Cytoscape Web ${h.version} (\`${h.commit.slice(0, 8)}\`)`)
    .join(' and ')}. Supported: ${hosts[0].version} and later.`,
  `- API types: \`@cytoscape-web/api-types@${record.apiTypes.version}\`.`,
  '',
]

const renderLlms = (sources) => {
  const { pinned, floor, wiring, recipes } = sources
  const lines = [
    ...renderHeader(sources),
    'Read [Using a recipe](' +
      rawUrl(pinned, 'cookbook/USING-RECIPES.md') +
      ') first: how to give a recipe `apis`, and what not to pass it.',
    '',
  ]
  const categories = [...new Set(recipes.map((r) => r.category))]
  for (const category of categories) {
    lines.push(`## Recipes: ${category}`, '')
    for (const recipe of recipes.filter((r) => r.category === category)) {
      lines.push(
        `- [${recipe.title}](${rawUrl(pinned, `cookbook/${recipe.path}`)}): ` +
          `also asked as ${recipe.aliases.join(', ')}`,
      )
    }
    lines.push('')
  }
  lines.push('## Wiring: where `apis` comes from', '')
  for (const path of wiring) {
    lines.push(
      `- [${path}](${rawUrl(pinned, `cookbook/${path}`)}): ` +
        firstSentence(COOKBOOK_DIR, path),
    )
  }
  lines.push('', '## API reference', '')
  lines.push(
    `- [App API reference](${hostUrl(floor.commit, 'src/app-api/api_docs/Api.md')}): ` +
      `every method and event, as of Cytoscape Web ${floor.version}`,
  )
  lines.push('', '## Optional', '')
  lines.push(
    `- [Writing a recipe](${rawUrl(pinned, 'cookbook/WRITING-RECIPES.md')}): ` +
      'the contract every recipe meets',
  )
  for (const [file, about] of GUIDES) {
    lines.push(`- [${file}](${rawUrl(pinned, `guides/${file}`)}): ${about}`)
  }
  lines.push(
    `- [llms-full.txt](${PAGES_URL}/llms-full.txt): this file's recipes and ` +
      'wiring, in full',
    '',
  )
  return lines.join('\n')
}

const renderLlmsFull = (sources) => {
  const { pinned, floor, wiring, recipes } = sources
  const fenced = (path) => {
    const text = readFileSync(join(COOKBOOK_DIR, path), 'utf8')
    return [
      `Source: ${rawUrl(pinned, `cookbook/${path}`)}`,
      '',
      '````typescript',
      text.replace(/\n$/, ''),
      '````',
      '',
    ]
  }
  const lines = [...renderHeader(sources)]
  lines.push(
    '---',
    '',
    pinLinks(
      readFileSync(join(COOKBOOK_DIR, 'USING-RECIPES.md'), 'utf8').trim(),
      'cookbook',
      sources,
    ),
    '',
    '---',
    '',
    '# Wiring',
    '',
  )
  for (const path of wiring) lines.push(`## cookbook/${path}`, '', ...fenced(path))
  lines.push('# Recipes', '')
  for (const recipe of recipes) {
    lines.push(`## ${recipe.title}`, '', ...fenced(recipe.path))
  }
  lines.push(
    '# API reference',
    '',
    `- App API reference, as of Cytoscape Web ${floor.version}: ` +
      hostUrl(floor.commit, 'src/app-api/api_docs/Api.md'),
    '',
  )
  return lines.join('\n')
}

/**
 * What must hold for the generated files, whatever produced them: every
 * recipe and wiring file is linked, every examples link names a path that
 * exists at the pinned commit, and every host link names the floor's commit.
 */
const checkLlmsStructure = (llms, full, sources, pathExists) => {
  const { pinned, floor, wiring, recipes } = sources
  const problems = []
  for (const path of [...recipes.map((r) => r.path), ...wiring]) {
    const url = rawUrl(pinned, `cookbook/${path}`)
    if (!llms.includes(`](${url})`)) {
      problems.push(`llms.txt does not link cookbook/${path}`)
    }
    if (!full.includes(`Source: ${url}`)) {
      problems.push(`llms-full.txt does not hold cookbook/${path}`)
    }
  }
  // Read away from the repository, a relative link leads nowhere.
  for (const [name, text] of [['llms.txt', llms], ['llms-full.txt', full]]) {
    for (const [, target] of outsideFences(text).matchAll(/\]\(([^)\s]+)\)/g)) {
      if (!/^(https?:|mailto:|#)/.test(target)) {
        problems.push(`${name} has a relative link, ${target}`)
      }
    }
  }
  for (const url of new Set(`${llms}\n${full}`.match(/https:\/\/[^\s)>\]]+/g) ?? [])) {
    const examples = githubTarget(url, EXAMPLES_REPO)
    const host = githubTarget(url, HOST_REPO)
    if (examples !== null) {
      if (examples.ref !== pinned) {
        problems.push(`${url} is not pinned to ${pinned}`)
      } else if (!pathExists(examples.ref, examples.path)) {
        problems.push(`${url} names a path that does not exist at ${examples.ref}`)
      }
    } else if (host !== null && host.ref !== floor.commit) {
      problems.push(`${url} is not pinned to the floor, ${floor.commit}`)
    }
  }
  return problems
}

/**
 * Whether llms.txt can be generated now: the linked sources are committed, and
 * the record says those exact sources passed on every supported host with the
 * registry's api-types. A record made from other sources, or from a local
 * tarball, is never published as verified.
 */
const llmsBlockers = () => {
  const dirty = uncommittedSources()
  const blockers = []
  if (dirty.length > 0) {
    blockers.push(
      `cookbook/ or guides/ has uncommitted changes (${dirty.length}), which ` +
        `the pinned commit would not hold: commit them first`,
    )
  }
  return [...blockers, ...checkRecord()]
}

/**
 * On a pull request, CI checks the merge GitHub would make. If both sides
 * changed a linked source, the merge commit itself becomes the last commit to
 * change one, and the pin committed on the branch is stale the moment it
 * merges.
 */
const checkMerge = (ref) => {
  const merge = git(['rev-parse', ref])
  const pinned = pinnedCommit(ref)
  if (pinned === merge) {
    console.error(
      `\n✗ the merge ${merge.slice(0, 8)} is itself the last commit to change ` +
        `cookbook/ or guides/: both sides changed them, so the llms.txt ` +
        `committed on the branch would be stale once merged. Merge the target ` +
        `branch into this one, run \`node scripts/cookbook-index.mjs --llms\`, ` +
        `and commit the result\n`,
    )
    process.exit(1)
  }
  console.log(
    `✓ the merge keeps the pin: the last commit to change cookbook/ or ` +
      `guides/ is ${pinned.slice(0, 8)}, not the merge`,
  )
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

  // The structure check of llms.txt, on texts written for the purpose: a
  // control that passes, and one fault each.
  const pinned = 'a'.repeat(40)
  const floorCommit = 'b'.repeat(40)
  const files = ['recipes/x/one.ts', 'recipes/x/two.ts', 'wiring/from-mount.ts']
  const sources = {
    pinned,
    floor: { commit: floorCommit, version: '1.1.0' },
    wiring: ['wiring/from-mount.ts'],
    recipes: [{ path: 'recipes/x/one.ts' }, { path: 'recipes/x/two.ts' }],
  }
  const link = (path) => `- [t](${rawUrl(pinned, `cookbook/${path}`)}): x`
  const api = `- [api](${hostUrl(floorCommit, 'src/app-api/api_docs/Api.md')})`
  const llms = [...files.map(link), api].join('\n')
  const full = files
    .map((path) => `Source: ${rawUrl(pinned, `cookbook/${path}`)}`)
    .join('\n')
  const exists = (_commit, path) => files.some((f) => `cookbook/${f}` === path)
  const structureFixtures = [
    ['llms-control', llms, full, 'ok'],
    [
      'llms-missing-recipe',
      llms.replace(`${link('recipes/x/two.ts')}\n`, ''),
      full,
      'does not link cookbook/recipes/x/two.ts',
    ],
    [
      'llms-nonexistent-path',
      `${llms}\n- [g](${rawUrl(pinned, 'guides/no-such-guide.md')})`,
      full,
      'names a path that does not exist',
    ],
    [
      'llms-wrong-pin',
      `${llms}\n- [g](${rawUrl('c'.repeat(40), 'cookbook/recipes/x/one.ts')})`,
      full,
      'is not pinned to',
    ],
    [
      'llms-host-not-floor',
      `${llms}\n- [h](${hostUrl('d'.repeat(40), 'src/app-api/api_docs/Api.md')})`,
      full,
      'is not pinned to the floor',
    ],
    [
      'llms-relative-link',
      llms,
      `${full}\nSee [the wiring](wiring/from-mount.ts).`,
      'has a relative link, wiring/from-mount.ts',
    ],
    [
      'llms-host-branch-link',
      llms,
      `${full}\n[ref](https://github.com/${HOST_REPO}/blob/development/src/app-api/api_docs/Api.md)`,
      'is not pinned to the floor',
    ],
    [
      'llms-examples-branch-link',
      llms,
      `${full}\n[x](https://github.com/${EXAMPLES_REPO}/blob/development/cookbook/README.md)`,
      'is not pinned to',
    ],
    [
      'llms-link-in-code-is-not-a-link',
      llms,
      `${full}\n\`\`\`\`typescript\nconst a = b[0](c)\n\`\`\`\``,
      'ok',
    ],
  ]
  for (const [name, text, fullText, expected] of structureFixtures) {
    const problems = checkLlmsStructure(text, fullText, sources, exists)
    const got = problems.length === 0 ? 'ok' : problems.join('; ')
    const pass =
      expected === 'ok' ? problems.length === 0 : got.includes(expected)
    if (!pass) failed += 1
    console.log(`  ${pass ? '✓' : '✗'} ${name}: expected ${expected}, got ${got}`)
  }
  const total = names.length + structureFixtures.length
  if (failed > 0) {
    console.error(`\n✗ self-test FAILED: ${failed} of ${total} fixtures`)
    process.exit(1)
  }
  console.log(
    `\n✓ self-test passed: ${total} fixtures, each rejected for the reason ` +
      `it names\n`,
  )
}

const main = () => {
  const args = process.argv.slice(2)
  if (args.includes('--selftest')) return selftest()
  if (args.includes('--digest')) return console.log(computeDigest())
  const mergeFlag = args.indexOf('--check-merge')
  if (mergeFlag !== -1) return checkMerge(args[mergeFlag + 1] ?? 'HEAD')

  const { recipes, problems } = readCookbook(COOKBOOK_DIR)
  if (problems.length > 0) {
    console.error(`\nCookbook — ${problems.length} problems\n`)
    printProblems(problems)
    process.exit(1)
  }

  const indexPath = join(COOKBOOK_DIR, 'README.md')
  const index = renderIndex(COOKBOOK_DIR, recipes)

  if (args.includes('--llms')) {
    const blockers = llmsBlockers()
    if (blockers.length > 0) {
      console.error('\n✗ not writing docs/llms*.txt:\n')
      for (const message of blockers) console.error(`  ✗ ${message}`)
      process.exit(1)
    }
    const sources = readLlmsSources(recipes)
    const llms = renderLlms(sources)
    const full = renderLlmsFull(sources)
    const problems = checkLlmsStructure(llms, full, sources, existsAt)
    if (problems.length > 0) {
      for (const message of problems) console.error(`  ✗ ${message}`)
      process.exit(1)
    }
    writeFileSync(LLMS_PATH, llms)
    writeFileSync(LLMS_FULL_PATH, full)
    console.log(
      `✓ wrote docs/llms.txt and docs/llms-full.txt, pinned to ` +
        `${sources.pinned.slice(0, 8)}. Commit them on their own: the commit ` +
        `must change nothing under cookbook/ or guides/`,
    )
    return
  }

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

  // llms.txt: regenerate in memory for the pinned commit, and compare.
  let llmsChecked = false
  if (args.includes('--skip-record')) {
    // Work in progress: the record is not checked, so neither is llms.txt.
  } else if (uncommittedSources().length > 0) {
    console.log(
      '  (docs/llms*.txt not checked: cookbook/ or guides/ has uncommitted ' +
        'changes. Commit them, then run --llms)',
    )
  } else if (!existsSync(LLMS_PATH) || !existsSync(LLMS_FULL_PATH)) {
    stale.push('docs/llms.txt or docs/llms-full.txt is missing: run --llms')
  } else {
    const sources = readLlmsSources(recipes)
    const llms = renderLlms(sources)
    const full = renderLlmsFull(sources)
    const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
    if (read(LLMS_PATH) !== llms || read(LLMS_FULL_PATH) !== full) {
      stale.push(
        `docs/llms*.txt are not what the sources at ` +
          `${sources.pinned.slice(0, 8)} generate: run ` +
          '`node scripts/cookbook-index.mjs --llms` and commit the result',
      )
    }
    // On what the sources generate: a stale committed file is reported once,
    // above, not once per link.
    stale.push(...checkLlmsStructure(llms, full, sources, existsAt))
    llmsChecked = true
  }
  if (stale.length > 0) {
    console.error(`\nCookbook — ${stale.length} problems\n`)
    for (const message of stale) console.error(`  ✗ ${message}`)
    process.exit(1)
  }
  console.log(
    `✓ cookbook: ${recipes.length} recipes, the index is current` +
      (args.includes('--skip-record') ? '' : ', the record is current') +
      (llmsChecked ? ', docs/llms*.txt are current' : ''),
  )
}

main()
