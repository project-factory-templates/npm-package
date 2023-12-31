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
    routes: [
        {
            directory: 'template',
        },
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
    onResolving: async vars => {
        vars.YEAR = new Date().getFullYear()
        vars.AUTHOR = (await $`npm profile get name`).stdout
    },
    onScaffolded: async dir => {
        await execaCommand(`npm i -D ${DEV_DEPS}`, {cwd: dir, stderr: 'inherit'})
    }
}
