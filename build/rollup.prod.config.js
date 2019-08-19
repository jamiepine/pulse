import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import replace from 'rollup-plugin-replace';
import babel from 'rollup-plugin-babel';

const prod = process.env.PRODUCTION;

export default {
  input: './lib/index.js',
  output: [
    {
      file: 'dist/pulse.min.js',
      name: 'Pulse',
      format: 'umd',
      freeze: false,
      sourcemap: true
    },
    {
      file: 'dist/pulse.cjs.min.js',
      name: 'Pulse',
      format: 'cjs',
      freeze: false,
      sourcemap: true
    },
    {
      file: 'dist/pulse.esm.min.js',
      name: 'Pulse',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve({
      browser: true
    }),
    commonjs(),
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**'
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        prod ? 'production' : 'development'
      )
    }),
    terser()
  ]
};
