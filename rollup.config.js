import path from 'path'
import cp from 'child_process'
import common from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import {terser} from 'rollup-plugin-terser'

cp.execSync('rm -rf dist')

const entries = [
    ['index.js', 'stagnant']
    ,['honeycomb.js', 'stagnant-honeycomb']
]

const formats = entries.flatMap(
    ([input,output]) => [
        { format: 'umd', dir: './dist', extension: '.browser.js', sourcemap: true, input, output, plugins: [] }
        , { format: 'umd', dir: './dist', extension: '.browser.min.js', sourcemap: true, input, output, plugins: [terser()] }
        , { format: 'cjs', dir: './', extension: '.cjs', sourcemap: false, input, output, plugins: [] }
    ]
)

const config = formats.map( 
    ({ format, dir, extension, sourcemap, input, output: outputName, plugins }) => {

        const defaultPlugins = [
            common()
            ,resolve()
        ]

        const filename = outputName + extension

        const config = {
            plugins: defaultPlugins.concat(plugins)
            ,input
            ,external: format == 'umd' ? [
                'node-fetch'
            ] : []
            ,output: {
                name: format == 'umd' ? 'stagnant' : undefined
                ,globals: format == 'umd' ? {
                    'node-fetch': 'fetch'
                } : {}
                ,sourcemap
                ,format
                ,file: path.resolve(dir, filename)
                ,exports: 'default'
            }
        }

        return config
    }
)

export default config