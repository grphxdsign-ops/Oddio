const { spawnSync } = require('node:child_process');

const platform = process.argv[2];
const isWindows = process.platform === 'win32';

if (!['android', 'ios'].includes(platform)) {
  console.error('Usage: node scripts/detox-build.js <android|ios>');
  process.exit(1);
}

if (platform === 'ios' && process.platform !== 'darwin') {
  console.error('iOS Detox builds require macOS with Xcode and an iOS Simulator.');
  process.exit(1);
}

run('npx', ['expo', 'prebuild', '--platform', platform]);

if (platform === 'ios') {
  run('npx', ['pod-install']);
  run('xcodebuild', [
    '-workspace',
    'ios/OddioAI.xcworkspace',
    '-scheme',
    'OddioAI',
    '-configuration',
    'Debug',
    '-sdk',
    'iphonesimulator',
    '-derivedDataPath',
    'ios/build',
  ]);
} else {
  run(isWindows ? 'gradlew.bat' : './gradlew', ['assembleDebug', 'assembleAndroidTest', '-DtestBuildType=debug'], {
    cwd: 'android',
  });
}

function run(command, args, options = {}) {
  const executable = isWindows && command === 'npx' ? 'npx.cmd' : command;
  const result = spawnSync(executable, args, {
    cwd: options.cwd ?? process.cwd(),
    env: process.env,
    shell: false,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
