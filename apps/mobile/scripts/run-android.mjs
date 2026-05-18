import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2];

if (!mode || !['dev', 'android'].includes(mode)) {
  console.error('Usage: node scripts/run-android.mjs <dev|android>');
  process.exit(1);
}

const sdkRoots = [
  process.env.ANDROID_SDK_ROOT,
  process.env.ANDROID_HOME,
  path.join(os.homedir(), 'Library', 'Android', 'sdk'),
  path.join(os.homedir(), 'Android', 'Sdk'),
].filter(Boolean);

const jdkRoots = [
  process.env.JAVA_HOME,
  path.join('/Applications', 'Android Studio.app', 'Contents', 'jbr', 'Contents', 'Home'),
  path.join('/Applications', 'Android Studio Preview.app', 'Contents', 'jbr', 'Contents', 'Home'),
  path.join(os.homedir(), '.jdks'),
].filter(Boolean);

const sdkRoot = sdkRoots.find((candidate) => candidate && fs.existsSync(candidate));
const javaHome = jdkRoots.find((candidate) => candidate && fs.existsSync(candidate));

if (!sdkRoot) {
  throw new Error(
    'Android SDK not found. Set ANDROID_SDK_ROOT or ANDROID_HOME, or install Android Studio with the SDK.',
  );
}

if (!javaHome) {
  throw new Error(
    'Java runtime not found. Install Android Studio or set JAVA_HOME to a JDK 17 installation.',
  );
}

const adb = path.join(sdkRoot, 'platform-tools', 'adb');
const emulator = path.join(sdkRoot, 'emulator', 'emulator');

const run = (command, args) => execFileSync(command, args, { encoding: 'utf8' });
const commandEnv = {
  ...process.env,
  ...(javaHome ? { JAVA_HOME: javaHome } : {}),
  ...(javaHome ? { PATH: `${path.join(javaHome, 'bin')}:${process.env.PATH || ''}` } : {}),
};

const listConnectedDevices = () => {
  const output = run(adb, ['devices']);
  return output
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === 'device')
    .map(([serial]) => serial);
};

const waitForEmulatorBoot = async (serial) => {
  const timeoutMs = 180000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const booted = run(adb, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']).trim();
      if (booted === '1') {
        return;
      }
    } catch {
      // Keep waiting while the emulator is booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`Timed out waiting for emulator ${serial} to boot.`);
};

const startEmulatorIfNeeded = async () => {
  const devices = listConnectedDevices();
  if (devices.length > 0) {
    return devices[0];
  }

  const avds = run(emulator, ['-list-avds'])
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (avds.length === 0) {
    throw new Error(
      'No Android device is connected and no AVDs are configured. Create an emulator in Android Studio first.',
    );
  }

  const avdName = avds[0];
  const child = spawn(emulator, ['-avd', avdName], {
    detached: true,
    stdio: 'ignore',
    env: commandEnv,
  });

  child.unref();

  execFileSync(adb, ['wait-for-device'], { stdio: 'ignore' });

  const bootWaitStarted = Date.now();
  while (Date.now() - bootWaitStarted < 180000) {
    const serials = listConnectedDevices();
    if (serials.length > 0) {
      await waitForEmulatorBoot(serials[0]);
      return serials[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`Timed out waiting for emulator ${avdName} to start.`);
};

const main = async () => {
  await startEmulatorIfNeeded();

  if (mode === 'dev') {
    // Uninstall old app to avoid signature mismatch errors
    console.log('Checking for existing installation...');
    try {
      run(adb, ['-s', 'emulator-5554', 'uninstall', 'com.stockalert.mobile']);
    } catch (e) {
      // Ignore error if app not installed
    }

    const install = spawn('npx', ['--yes', 'expo', 'run:android'], {
      stdio: 'inherit',
      env: commandEnv,
    });

    const installCode = await new Promise((resolve) => {
      install.on('exit', (code, signal) => {
        if (signal) {
          process.kill(process.pid, signal);
          return;
        }

        resolve(code ?? 1);
      });
    });

    if (installCode !== 0) {
      process.exit(installCode);
    }
  }

  const expoArgs =
    mode === 'dev' ? ['--yes', 'expo', 'start', '--dev-client', '--android'] : ['--yes', 'expo', 'run:android'];

  const child = spawn('npx', expoArgs, { stdio: 'inherit', env: commandEnv });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
