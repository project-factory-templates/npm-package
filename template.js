import chalk from 'chalk'
import { $, execaCommand } from 'execa'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

const DEV_DEPS = [
    'typescript',
    'eslint',
    'eslint-plugin-deprecation',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'rollup',
    '@rollup/plugin-terser',
    '@rollup/plugin-typescript',
    'rollup-plugin-dts'
].join(' ')
const ROLLUP_CONFIG_JS_NSSUPPORT_IMPORTS = `
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'`
const ROLLUP_CONFIG_JS_NSSUPPORT_VARS = `
const PACKAGE_JSON_IN = readFileSync('share/package.json.in', {encoding: 'utf-8'})
const NAMESPACES = [$NSLIST]`
const ROLLUP_CONFIG_JS_NSSUPPORT_CODE = `
function createNamespace(ns) {
    let package_json = PACKAGE_JSON_IN
    const variables = {
        NSPATH: ns,
        ROOT: ns
            .split('/')
            .map(() => '..')
            .join('/')
    }

    for (const variableName in variables)
        package_json = package_json.replaceAll(\`<(\${variableName})\`, variables[variableName])

    mkdirSync(ns, {recursive: true})
    writeFileSync(\`\${ns}/package.json\`, package_json, {encoding: 'utf-8'})
}

NAMESPACES.forEach(createNamespace)`
const ROLLUP_CONFIG_JS_NSSUPPORT_CREATE_INPUT_ARG = `
            '',
            ...NAMESPACES
        `
const PACKAGE_JSON_NSSUPPORT_ESM_EXPORT_TEMPLATE = `
    "./$NSPATH": {
      "types": "./$BUILDDIR/$NSPATH.d.ts",
      "import": "./$BUILDDIR/$NSPATH.js"
    },`
const PACKAGE_JSON_NSSUPPORT_MIXED_EXPORT_TEMPLATE = `
    "./$NSPATH": {
      "types": "./$BUILDDIR/$NSPATH.d.ts",
      "import": "./$BUILDDIR/$NSPATH.mjs",
      "require": "./$BUILDDIR/$NSPATH.cjs"
    },`

export default {
    message: 'Select a module type:',
    routes: [
        {
            directory: 'esm',
            message: chalk.red('EcmaScript'),
            tag: 'esm'
        },
        {
            directory: 'mixed',
            message: chalk.hex('#ffa500')('Mixed'),
            tag: 'mixed'
        },
        {
            directory: 'cjs',
            message: chalk.yellow('CommonJS'),
            tag: 'cjs'
        }
    ],
    promptScript: [
        {
            name: 'PKGNAME',
            type: 'text',
            message: 'Package name:'
        },
        {
            name: 'BUILDDIR',
            type: 'text',
            message: 'Build directory:',
            initial: 'build'
        },
        {
            name: 'NAMESPACES',
            type: 'list',
            message: 'Node16 namespaces (empty line for none):',
            separator: ' '
        }
    ],
    onResolving: async (vars, tag) => {
        vars.NAMESPACES = vars.NAMESPACES
            .filter(ns => ns.length > 0.5)
        vars.NAMESPACES.sort()
        const exportTemplate = tag === 'mixed'
            ? PACKAGE_JSON_NSSUPPORT_MIXED_EXPORT_TEMPLATE
            : PACKAGE_JSON_NSSUPPORT_ESM_EXPORT_TEMPLATE
        let secondNamespaces = vars.NAMESPACES
            .map(ns => ns.split('/')[0])
        secondNamespaces = [...new Set(secondNamespaces)]
        secondNamespaces.sort()

        vars.YEAR = new Date().getFullYear()
        vars.AUTHOR = (await $`npm profile get name`).stdout
        vars.ESLINTRC_IGNORE = tag === 'mixed'
            ? '"*.js", "*.mjs", "*.cjs"'
            : '"*.js"'
        vars.USENS = vars.NAMESPACES.length > 0.5
        vars.GITIGNORE_APPENDIX = vars.NAMESPACES
            .map(ns => '/' + ns)
            .join('\n')
            + '\n'
        vars.ROLLUP_CONFIG_JS_NSSUPPORT_IMPORTS = vars.USENS
            ? ROLLUP_CONFIG_JS_NSSUPPORT_IMPORTS
            : ''
        vars.ROLLUP_CONFIG_JS_NSSUPPORT_VARS = vars.USENS
            ? ROLLUP_CONFIG_JS_NSSUPPORT_VARS
                .replaceAll('$NSLIST', '\n' + vars.NAMESPACES
                    .map(ns => `    '${ns}'`)
                    .join(',\n')
                    + '\n')
            : ''
        vars.ROLLUP_CONFIG_JS_NSSUPPORT_CODE = vars.USENS
            ? ROLLUP_CONFIG_JS_NSSUPPORT_CODE
            : ''
        vars.ROLLUP_CONFIG_JS_CREATE_INPUT_ARG = vars.USENS
            ? ROLLUP_CONFIG_JS_NSSUPPORT_CREATE_INPUT_ARG
            : '\'\''
        vars.PACKAGE_JSON_EXPORTS = vars.USENS
            ? vars.NAMESPACES
                .map(ns => exportTemplate
                    .replaceAll('$NSPATH', ns)
                    .replaceAll('$BUILDDIR', vars.BUILDDIR))
                .join('')
            : ''
        vars.PACKAGE_JSON_CLEANDIRS = vars.NAMESPACES.length > 0.5
            ? ' ' + secondNamespaces.join(' ')
            : vars.NAMESPACES
        vars.NAMESPACES = vars.NAMESPACES.join(' ')
    },
    onScaffolded: async (dir, vars) => {
        if (!vars.USENS) await rm(join(dir, 'share'), {recursive: true, force: true})

        await execaCommand(`npm i -D ${DEV_DEPS}`, {cwd: dir, stderr: 'inherit'})
    },
    sharedDirectories: ['share']
}
