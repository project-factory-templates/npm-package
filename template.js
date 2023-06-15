import chalk from 'chalk'
import { $, execaCommand } from 'execa'

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

export default {
    message: 'Select a module type:',
    routes: [
        {
            directory: 'esm',
            message: chalk.red('EcmaScript')
        },
        {
            directory: 'mixed',
            message: chalk.hex('#ffa500')('Mixed')
        },
        {
            directory: 'cjs',
            message: chalk.yellow('CommonJS')
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
        }
    ],
    onResolving: async (vars, dir) => {
        vars.YEAR = new Date().getFullYear()
        vars.AUTHOR = (await $`npm profile get name`).stdout
        vars.ESLINTRC_IGNORE = dir === 'mixed'
            ? '"*.js", "*.mjs", "*.cjs"'
            : '"*.js"'
    },
    onScaffolded: async dir => {
        await execaCommand(`npm i -D ${DEV_DEPS}`, {cwd: dir, stderr: 'inherit'})
    },
    sharedDirectories: ['shared']
}
