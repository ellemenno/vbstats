import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';

const build_for_dev = process.env.BUILD_FOR_DEV && process.env.BUILD_FOR_DEV === 'true';
const build_for_prod = !build_for_dev;
console.log(`building a ${build_for_dev ? 'dev' : 'prod'} release`);

const std_output = (module_name) => ({
  file: `public/build/${module_name}.js`,
  format: 'iife', // self-executing function, i.e. bundle format; see https://rollupjs.org/guide/en/#outputformat
  name: module_name,
  sourcemap: true,
})

const get_plugins = (module_name) => {
  // start with the standard fare..
  const plugins = [
    svelte({ compilerOptions: { dev: build_for_dev } }), // enable run-time checks when building for dev
    resolve({ browser: true, dedupe: ['svelte'] }), // resolve and dedupe 3rd party modules in ./node_modules
    css({ output: `${module_name}.css` }), // extract component CSS into separate file for better performance
    build_for_prod && terser(), // in production mode, minify to reduce file size
  ];

  return plugins;
}

export default [
  {
    input: `src/main.js`,
    output: std_output('main'),
    plugins: get_plugins('main'),
  },
];
