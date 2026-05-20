#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const APP_PACKAGE = 'com.stockalert.mobile';
const APP_ACTIVITY = '.MainActivity';
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
const FIREBASE_API_KEY =
  process.env.E2E_FIREBASE_API_KEY ||
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyAlWOSo38QafST4DZhlR9Lg_VUuZw6Y51U';
const EMAIL = process.env.E2E_EMAIL?.trim();
const PASSWORD = process.env.E2E_PASSWORD?.trim();
const SYMBOL = (process.env.E2E_SYMBOL || 'NVDA').trim().toUpperCase();
const ALERT_THRESHOLD = Number(process.env.E2E_ALERT_THRESHOLD || '999.99');
const TIMEOUT_MS = Number(process.env.E2E_TIMEOUT_MS || '120000');

if (!EMAIL || !PASSWORD) {
  throw new Error('Set E2E_EMAIL and E2E_PASSWORD before running the emulator flow.');
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
  adb(['shell', 'uiautomator', 'dump', '/sdcard/e2e-ui.xml']);
  return adb(['exec-out', 'cat', '/sdcard/e2e-ui.xml']);
};

const parseNodes = (xml) => {
  const nodes = [];
  const nodeRegex = /<node\b([^>]*)\/>/g;
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
  adb(['shell', 'input', 'tap', String(point.x), String(point.y)]);
};

const typeText = async (label, value) => {
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

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${BACKEND_URL}${path}`, options);
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${await response.text()}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
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

const launchApp = () => {
  run('adb', ['shell', 'am', 'start', '-n', `${APP_PACKAGE}/${APP_ACTIVITY}`]);
};

const waitForAppReady = async () => {
  await waitForNode('login-email-input');
};

const main = async () => {
  ensureEmulator();
  adb(['shell', 'pm', 'clear', APP_PACKAGE]);
  launchApp();

  await waitForAppReady();
  await typeText('login-email-input', EMAIL);
  await typeText('login-password-input', PASSWORD);
  await tap('login-submit-button');

  await waitForNode('tab-watchlist');
  await tap('tab-watchlist');
  await waitForNode('watchlist-container');

  await tap('add-stock-button');
  await waitForNode('add-stock-symbol-input');
  await typeText('add-stock-symbol-input', SYMBOL);
  await tap('add-stock-submit');
  await waitForNode(`stock-item-${SYMBOL}`);

  await tap(`stock-item-${SYMBOL}`);
  await waitForNode('stock-detail-set-alert-button');
  await tap('stock-detail-set-alert-button');

  await waitForNode('create-alert-symbol-input');
  await tap('create-alert-threshold-input');
  adb(['shell', 'input', 'text', escapeUiText(String(ALERT_THRESHOLD))]);
  await tap('create-alert-submit-button');

  const idToken = await firebaseSignIn();
  const alerts = await apiFetch('/alerts', {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const createdAlert = Array.isArray(alerts)
    ? alerts.find(
        (alert) => alert.symbol?.toUpperCase() === SYMBOL && Number(alert.threshold) === ALERT_THRESHOLD,
      )
    : null;

  if (!createdAlert?.id) {
    throw new Error(`Created alert for ${SYMBOL} was not found in the backend.`);
  }

  await apiFetch(`/dev/trigger/${createdAlert.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ price: ALERT_THRESHOLD + 1 }),
  });

  const dispatches = await apiFetch('/dev/dispatches');
  const triggeredDispatch = Array.isArray(dispatches)
    ? dispatches.find((dispatch) => dispatch.alertId === createdAlert.id || dispatch.symbol?.toUpperCase() === SYMBOL)
    : null;

  if (!triggeredDispatch) {
    throw new Error(`Expected a dispatch to be created for ${SYMBOL}.`);
  }

  console.log(`E2E flow complete for ${SYMBOL} at ${BACKEND_URL}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
