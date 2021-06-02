import path from 'path'
import common from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import {terser} from 'rollup-plugin-terser'

const entries = [
    'index.js'
    ,'honeycomb.js'
]

const formats = entries.flatMap(
    input => [
        { format: 'umd', dir: './dist', extension: '.browser.js', sourcemap: true, input, plugins: [] }
        , { format: 'umd', dir: './dist', extension: '.browser.min.js', sourcemap: true, input, plugins: [terser()] }
        , { format: 'cjs', dir: './', extension: '.cjs', sourcemap: false, input, plugins: [] }
    ]
)

const config = formats.map( 
    ({ format, dir, extension, sourcemap, input, plugins }) => {

        const defaultPlugins = [
            common()
            ,resolve()
        ]

        const rawFilename = path.basename(input, '.js')
        const filename = rawFilename + extension

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