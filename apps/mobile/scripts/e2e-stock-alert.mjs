#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const APP_PACKAGE = 'com.stockalert.mobile';
const APP_ACTIVITY = '.MainActivity';
const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:3000';
const FIREBASE_API_KEY =
  process.env.E2E_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const DEV_BEARER_TOKEN = process.env.E2E_BEARER_TOKEN || 'dev-test-token-12345';
const EMAIL = process.env.E2E_EMAIL?.trim();
const PASSWORD = process.env.E2E_PASSWORD?.trim();
const SYMBOL = process.env.E2E_SYMBOL?.trim().toUpperCase() || null;
const SYMBOL_CANDIDATES = ['NVDA', 'AMD', 'PLTR', 'ORCL', 'INTC', 'CRM', 'UBER', 'SNOW', 'SHOP'];
const ALERT_THRESHOLD = Number(process.env.E2E_ALERT_THRESHOLD || '999.99');
const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS || '120000');

if (!EMAIL || !PASSWORD) {
  throw new Error('Set E2E_EMAIL and E2E_PASSWORD before running the emulator flow.');
}

if (!FIREBASE_API_KEY) {
  throw new Error(
    'Set E2E_FIREBASE_API_KEY (or EXPO_PUBLIC_FIREBASE_API_KEY) in your environment before running the emulator flow.',
  );
}

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();

const adb = (args) => run('adb', args);

const escapeUiText = (value) => value.replace(/ /g, '%s');

const parseBounds = (bounds) => {
  const match = bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) {
    return null;
  }

  const [, left, top, right, bottom] = match.map(Number);
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2),
  };
};

const dumpUi = () => {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      adb(['shell', 'uiautomator', 'dump', '/sdcard/e2e-ui.xml']);
      return adb(['exec-out', 'cat', '/sdcard/e2e-ui.xml']);
    } catch (error) {
      lastError = error;
      if (attempt === 5) {
        break;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }

  throw lastError;
};

const parseNodes = (xml) => {
  const nodes = [];
  const nodeRegex = /<node\b([^>]*)\/?>/g;
  let match;

  while ((match = nodeRegex.exec(xml))) {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
    );
    nodes.push(attributes);
  }

  return nodes;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForNode = async (label, timeout = TIMEOUT_MS) => {
  const deadline = Date.now() + timeout;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const nodes = parseNodes(dumpUi());
      const node = nodes.find(
        (entry) =>
          entry['content-desc'] === label ||
          entry.text === label ||
          entry['resource-id'] === label ||
          entry['content-desc']?.includes(label) ||
          entry.text?.includes(label),
      );

      if (node?.bounds) {
        const point = parseBounds(node.bounds);
        if (point) {
          return { node, point };
        }
      }
    } catch (error) {
      lastError = error;
    }

    await wait(750);
  }

  throw new Error(`Timed out waiting for "${label}". ${lastError ? String(lastError) : ''}`);
};

const tap = async (label) => {
  const { point } = await waitForNode(label);
  console.log(`tap:${label}`);
  adb(['shell', 'input', 'tap', String(point.x), String(point.y)]);
};

const tapIfPresent = async (label, timeout = 5000) => {
  try {
    await waitForNode(label, timeout);
    await tap(label);
    return true;
  } catch {
    return false;
  }
};

const typeText = async (label, value) => {
  console.log(`type:${label}`);
  await tap(label);
  adb(['shell', 'input', 'text', escapeUiText(value)]);
};

const firebaseSignIn = async () => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Firebase sign-in failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  if (!payload.idToken) {
    throw new Error('Firebase sign-in did not return an idToken.');
  }

  return payload.idToken;
};

const pickWatchlistSymbol = async (idToken) => {
  if (SYMBOL) {
    return SYMBOL;
  }

  const response = await fetch(`${BACKEND_URL}/watchlist`, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load watchlist: ${response.status} ${await response.text()}`);
  }

  const items = await response.json();
  const occupied = new Set(
    Array.isArray(items)
      ? items.map((item) => String(item?.symbol || '').toUpperCase()).filter(Boolean)
      : [],
  );

  const nextSymbol = SYMBOL_CANDIDATES.find((candidate) => !occupied.has(candidate));
  if (!nextSymbol) {
    throw new Error('No unused candidate stock symbols remain for the demo flow.');
  }

  return nextSymbol;
};

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${BACKEND_URL}${path}`, options);
  if (!response.ok) {
    throw new Error(
      `${options.method || 'GET'} ${path} failed: ${response.status} ${await response.text()}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

const waitForCreatedAlert = async (idToken, selectedSymbol, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const alerts = await apiFetch('/alerts', {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    const createdAlert = Array.isArray(alerts)
      ? alerts.find(
          (alert) =>
            alert.symbol?.toUpperCase() === selectedSymbol &&
            Number(alert.threshold) === ALERT_THRESHOLD,
        )
      : null;

    if (createdAlert?.id) {
      return createdAlert;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return null;
};

const ensureEmulator = () => {
  const devices = adb(['devices']);
  const connected = devices
    .split('\n')
    .slice(1)
    .some((line) => line.trim().endsWith('\tdevice'));

  if (!connected) {
    throw new Error('No Android emulator/device is connected.');
  }
};

const openNotificationShade = async () => {
  try {
    adb(['shell', 'cmd', 'statusbar', 'expand-notifications']);
  } catch {
    adb(['shell', 'input', 'swipe', '540', '0', '540', '1600']);
  }

  await wait(1000);
};

const launchApp = () => {
  run('adb', ['shell', 'am', 'start', '-n', `${APP_PACKAGE}/${APP_ACTIVITY}`]);
};

const waitForAppReady = async () => {
  await tapIfPresent('http://10.0.2.2:8081', 15000);
  await waitForNode('login-email-input');
};

const main = async () => {
  ensureEmulator();
  adb(['shell', 'pm', 'clear', APP_PACKAGE]);
  launchApp();

  console.log('waiting:login');
  await waitForAppReady();
  await typeText('login-email-input', EMAIL);
  await typeText('login-password-input', PASSWORD);
  // Dismiss keyboard and wait before submitting
  adb(['shell', 'input', 'keyevent', '111']);
  await wait(500);
  await tap('login-submit-button');
  await wait(2000);

  console.log('waiting:watchlist');
  await waitForNode('tab-watchlist');
  await tap('tab-watchlist');
  await waitForNode('watchlist-container');

  const idToken = await firebaseSignIn();
  const selectedSymbol = await pickWatchlistSymbol(idToken);

  console.log(`adding:${selectedSymbol}`);
  await tap('add-stock-button');
  await waitForNode('add-stock-symbol-input');
  await typeText('add-stock-symbol-input', selectedSymbol);
  await tap('add-stock-submit');
  await waitForNode(`stock-item-${selectedSymbol}`);

  console.log(`opening:${selectedSymbol}`);
  await tap(`stock-item-${selectedSymbol}`);
  await waitForNode('stock-detail-set-alert-button');
  await tap('stock-detail-set-alert-button');

  console.log('creating-alert');
  await waitForNode('create-alert-symbol-input');
  // Ensure symbol is filled (even if prefilled, make sure it's set)
  // await typeText('create-alert-symbol-input', selectedSymbol);
  await typeText('create-alert-threshold-input', String(ALERT_THRESHOLD));
  // Dismiss keyboard before submitting
  adb(['shell', 'input', 'keyevent', '111']);
  await wait(500);

  // Scroll down to ensure submit button is visible
  adb(['shell', 'input', 'swipe', '540', '1000', '540', '400']);
  await wait(300);

  // Attempt primary selector with retries
  let submitSuccess = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.log(`submit-attempt:${attempt}`);
      await tap('create-alert-submit-button');
      submitSuccess = true;
      break;
    } catch (err) {
      console.warn(`Attempt ${attempt} failed, retrying...`);
      if (attempt === 3) {
        console.warn('All primary attempts failed, trying text selector...');
        try {
          await tap('Create Alert');
          submitSuccess = true;
        } catch (err2) {
          console.warn('Text selector also failed');
        }
      }
      await wait(500);
    }
  }

  console.log('verifying-alert');
  const createdAlert = await waitForCreatedAlert(idToken, selectedSymbol);

  if (!createdAlert?.id) {
    throw new Error(`Created alert for ${selectedSymbol} was not found in the backend.`);
  }

  await wait(200);

  console.log('going-home');
  await tap('tab-home');
  await waitForNode('Welcome!');

  console.log('sending-test-notification');
  await apiFetch('/notifications/test', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEV_BEARER_TOKEN}`,
      'Content-Type': 'application/json',
      accept: '*/*',
    },
    body: JSON.stringify({
      title: 'Stock Alert Test Notification',
      body: `Notification for ${selectedSymbol}`,
      data: {
        route: 'Home',
      },
    }),
  });

  await waitForNode('Stock Alert Test Notification');

  console.log(`E2E flow complete for ${selectedSymbol} at ${BACKEND_URL}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
