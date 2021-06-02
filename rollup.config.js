import common from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import {terser} from 'rollup-plugin-terser'

export default [
    {
        plugins: [
            common()
            ,resolve()
        ]
        ,input: './index.js'
        ,output: {
            name: 'stagnant'
            ,format: 'umd'
            ,file: './dist/stagnant.umd.js'
            ,sourcemap: true
        }
    }
    ,{
        plugins: [
            common()
            ,resolve()
            ,terser()
        ]
        ,input: './index.js'
        ,output: {
            name: 'stagnant'
            ,format: 'umd'
            ,file: './dist/stagnant.umd.min.js'
            ,sourcemap: true
        }
    }
    ,{
        plugins: [
            common()
            ,resolve()
            ,terser()
        ]
        ,external: [
            'node-fetch'
        ]
        ,input: './index.js'
        ,output: {
            name: 'stagnant'
            ,format: 'umd'
            ,file: './dist/stagnant-honey.browser.min.js'
            ,sourcemap: true
        }
    }
    ,{
        plugins: [
            common()
            ,resolve()
        ]
        ,input: './honeycomb.js'
        ,output: {
            format: 'cjs'
            ,file: './honeycomb.cjs'
            ,exports: 'default'
        }
    }
    ,{
        plugins: [
            common()
            ,resolve()
        ]
        ,input: './index.js'
        ,output: {
            format: 'cjs'
            ,file: './index.cjs'
            ,exports: 'default'
        }
    }
]