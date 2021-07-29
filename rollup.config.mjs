import path from 'path'
import cp from 'child_process'
import common from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import {terser} from 'rollup-plugin-terser'

cp.execSync('rm -rf dist || true')
cp.execSync('rm *.cjs || true')

const entries = [
    ['index.mjs', 'stagnant']
    ,['honeycomb.mjs', 'stagnant-honeycomb']
]

const formats = entries.flatMap(
    ([input,outputName]) => [
        { format: 'umd', dir: './dist', extension: '.browser.js', sourcemap: true, input, outputName, plugins: [] }
        , { format: 'umd', dir: './dist', extension: '.browser.min.js', sourcemap: true, input, outputName, plugins: [terser()] }
        , { format: 'cjs', dir: './', extension: '.cjs', sourcemap: false, input, outputName, plugins: [] }
    ]
)

const config = formats.map( 
    ({ format, dir, extension, sourcemap, input, outputName, plugins }) => {

        const defaultPlugins = [
            common()
            ,resolve()
        ]

        if( format == 'cjs' ) {
            outputName = path.basename(input, '.mjs')
        }

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
                ,exports: ['default']
            }
        }

        return config
    }
)

export default config