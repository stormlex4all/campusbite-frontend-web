import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import axios from 'axios';
import api from '../api/axios';
import TokenStore from '../auth/tokenStore';

const realAdapter = axios.defaults.adapter;
const realApiAdapter = api.defaults.adapter;

beforeEach(() => {
  localStorage.clear();
  TokenStore.reset();
});

afterEach(() => {
  axios.defaults.adapter = realAdapter; // undo the fake network installed by mockFetch()
  api.defaults.adapter = realApiAdapter;
  cleanup();
  vi.restoreAllMocks();
});
