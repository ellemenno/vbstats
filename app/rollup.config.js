import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH; // based on --watch flag, absent from `npm run build`, present in `npm run start`

const serve = () => {
  let server;
  function toExit() { if (server) server.kill(0); }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    }
  };
}

const std_output = (module_name) => ({
  file: `public/build/${module_name}.js`,
  format: 'iife', // self-executing function, i.e. bundle format; see https://rollupjs.org/guide/en/#outputformat
  name: module_name,
  sourcemap: true,
})

const get_plugins = (module_name) => {
  // start with the standard fare..
  const plugins = [
    svelte({ compilerOptions: { dev: !production } }), // enable run-time checks when not in production
    resolve({ browser: true, dedupe: ['svelte'] }), // resolve and dedupe 3rd party modules in ./node_modules
    css({ output: `${module_name}.css` }), // extract component CSS into separate file for better performance
    !production && serve(), // start server if not in production mode
    !production && livereload('public'), // watch the `public` directory and rebuild on changes
    production && terser(), // in production mode, minify to reduce file size
  ];

  return plugins;
}

export default [
  {
    input: `src/main.js`,
    output: std_output('main'),
    plugins: get_plugins('main'),
    watch: { clearScreen: false },
  },
];
