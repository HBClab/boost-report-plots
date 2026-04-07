import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const shared: esbuild.BuildOptions = {
  entryPoints: ['src/main.ts'],
  outfile: 'public/bundle.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  logLevel: 'info'
};

async function run(): Promise<void> {
  if (watch) {
    const context = await esbuild.context(shared);
    await context.watch();
    console.log('[esbuild] watching plots/hr/src/main.ts');
    return;
  }

  await esbuild.build(shared);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
