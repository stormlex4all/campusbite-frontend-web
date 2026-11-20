import { describe, expect, test } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../auth/AuthContext';
import { failure, mockFetch, student, tokens, vendorStore, vendorUser } from './mockApi';

const renderApp = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
const asVendor = () => localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
const base = (user = vendorUser) => ({
  'POST /auth/refresh': { user, tokens: tokens(2) },
  'GET /auth/me': { user, vendor: vendorStore },
  'GET /meta/options': { images: { maxMb: 2, maxPerItem: 4, types: [] } },
});
const item = (over = {}) => ({ id: 'm1', name: 'Wrap', description: '', defaultPrice: 6.5, status: 'active', images: [], ...over });

describe('menu items (recurring items)', () => {
  test('validates before sending, then creates and opens the editor with photos', async () => {
    asVendor();
    const { calls } = mockFetch({
      ...base(),
      'POST /vendor/menu-items': (c) => item({ name: c.body.name, defaultPrice: c.body.defaultPrice }),
      'GET /vendor/menu-items/m1': item({ name: 'Butter Wrap' }),
    });
    const user = userEvent.setup();
    renderApp('/menu/new');
    await screen.findByRole('heading', { level: 1, name: 'Add menu item' });

    await user.click(screen.getByRole('button', { name: 'Add menu item' }));
    expect((await screen.findAllByText('Item name is required')).length).toBeGreaterThan(0);
    expect(calls.some((c) => c.method === 'POST' && c.path === '/vendor/menu-items')).toBe(false);

    await user.type(screen.getByLabelText(/^Item name/), 'Butter Wrap');
    await user.type(screen.getByLabelText(/^Usual price/), '6.999');
    await user.click(screen.getByRole('button', { name: 'Add menu item' }));
    expect((await screen.findAllByText('Price must be a number like 4.50')).length).toBeGreaterThan(0);

    await user.clear(screen.getByLabelText(/^Usual price/));
    await user.type(screen.getByLabelText(/^Usual price/), '6.5');
    await user.click(screen.getByRole('button', { name: 'Add menu item' }));
    await screen.findByRole('heading', { level: 1, name: 'Edit menu item' });
    expect(calls.find((c) => c.method === 'POST' && c.path === '/vendor/menu-items').body).toEqual({ name: 'Butter Wrap', description: '', defaultPrice: 6.5 });
    expect(await screen.findByRole('heading', { name: 'Photos' })).toBeInTheDocument();
  });

  test('photos: wrong type and oversize files are stopped on the client; remove asks first', async () => {
    asVendor();
    const withPhoto = item({ images: [{ id: 'i1', url: '/uploads/a.png', alt: 'Front view' }] });
    const { calls } = mockFetch({
      ...base(),
      'GET /vendor/menu-items/m1': withPhoto,
      'DELETE /vendor/menu-items/m1/images/i1': item(),
    });
    const user = userEvent.setup({ applyAccept: false });
    renderApp('/menu/m1');
    await screen.findByRole('heading', { name: 'Photos' });
    expect(screen.getByAltText('Front view')).toHaveAttribute('src', '/uploads/a.png');

    const input = screen.getByLabelText('Choose a photo');
    await user.upload(input, new File(['x'], 'doc.pdf', { type: 'application/pdf' }));
    await user.click(screen.getByRole('button', { name: 'Add photo' }));
    expect(await screen.findByText('Photos must be JPEG, PNG or WebP.')).toBeInTheDocument();

    await user.upload(input, new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Add photo' }));
    expect(await screen.findByText(/too large/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/images'))).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Remove photo: Front view' }));
    expect(screen.getByRole('dialog', { name: 'Remove this photo?' })).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Remove photo' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
    await waitFor(() => expect(screen.queryByAltText('Front view')).not.toBeInTheDocument());
  });

  test('archive from the list', async () => {
    asVendor();
    const { calls } = mockFetch({ ...base(), 'GET /vendor/menu-items': () => ({ __list: true }), 'POST /vendor/menu-items/m1/archive': item({ status: 'archived' }) });
    // list endpoints return { data, meta }: use a raw envelope
    mockFetch({
      ...base(),
      'GET /vendor/menu-items': () => new Response(JSON.stringify({ success: true, data: [item()], meta: { page: 1, totalPages: 1, total: 1 } }), { status: 200 }),
      'POST /vendor/menu-items/m1/archive': item({ status: 'archived' }),
    });
    const user = userEvent.setup();
    renderApp('/menu');
    await user.click(await screen.findByRole('button', { name: 'Archive Wrap' }));
    expect(await screen.findByText('Wrap was archived.')).toBeInTheDocument();
    expect(calls).toBeDefined();
  });
});

describe('new listing', () => {
  const list = (data) => () => new Response(JSON.stringify({ success: true, data, meta: { page: 1, totalPages: 1, total: data.length } }), { status: 200 });

  test('from a menu item: sends the item id, no price unless overridden, and ISO times', async () => {
    asVendor();
    const { calls } = mockFetch({ ...base(), 'GET /vendor/menu-items': list([item()]), 'POST /vendor/listings': { id: 'l1' }, 'GET /vendor/listings': list([]) });
    const user = userEvent.setup();
    renderApp('/listings/new');
    await screen.findByRole('heading', { level: 1, name: 'New listing' });
    expect(screen.getByLabelText(/One of my menu items/)).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Create listing' }));
    expect((await screen.findAllByText('Choose a menu item')).length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText(/^Menu item/), 'm1');
    await user.type(screen.getByLabelText(/^Number of portions/), '4');
    const soon = (h) => new Date(Date.now() + h * 3600e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
    await user.type(screen.getByLabelText(/^Pickup starts/), soon(1));
    await user.type(screen.getByLabelText(/^Pickup ends/), soon(2));
    await user.click(screen.getByRole('button', { name: 'Create listing' }));
    await screen.findByRole('heading', { level: 1, name: 'Listings' });
    const body = calls.find((c) => c.method === 'POST' && c.path === '/vendor/listings').body;
    expect(body).toMatchObject({ source: 'menu_item', menuItemId: 'm1', quantityTotal: 4 });
    expect(body.price).toBeUndefined();
    expect(body.pickupStart).toMatch(/Z$/);
  });

  test('one-off listing needs a name and price; server errors map back to fields', async () => {
    asVendor();
    mockFetch({
      ...base(),
      'GET /vendor/menu-items': list([]),
      'POST /vendor/listings': () => failure(400, 'VALIDATION_ERROR', 'Invalid', [{ field: 'pickupEnd', message: 'Pickup must end after it starts' }]),
    });
    const user = userEvent.setup();
    renderApp('/listings/new');
    await screen.findByRole('heading', { level: 1, name: 'New listing' });
    expect(screen.getByLabelText(/Something else/)).toBeChecked();
    expect(screen.getByLabelText(/One of my menu items/)).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Create listing' }));
    expect((await screen.findAllByText('Item name is required')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Price is required').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText(/^Item name/), 'Soup');
    await user.type(screen.getByLabelText(/^Price \(\$\)/), '2');
    await user.type(screen.getByLabelText(/^Number of portions/), '3');
    const soon = (h) => new Date(Date.now() + h * 3600e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
    await user.type(screen.getByLabelText(/^Pickup starts/), soon(1));
    await user.type(screen.getByLabelText(/^Pickup ends/), soon(2));
    await user.click(screen.getByRole('button', { name: 'Create listing' }));
    expect((await screen.findAllByText('Pickup must end after it starts')).length).toBeGreaterThan(0);
  });
});

describe('students and roles', () => {
  test('a student sees live listings on the store page and cannot open vendor pages', async () => {
    asVendor();
    mockFetch({
      ...base(student),
      'GET /vendors/st1': { ...vendorStore, openingHours: [] },
      'GET /vendors/st1/listings': () =>
        new Response(
          JSON.stringify({ success: true, data: [{ id: 'l1', title: 'Butter Wrap', description: 'Spicy', price: 6.5, quantityAvailable: 2, pickupStart: new Date().toISOString(), pickupEnd: new Date().toISOString(), images: [{ id: 'i', url: '/uploads/a.png', alt: 'A wrap' }] }], meta: {} }),
          { status: 200 },
        ),
    });
    renderApp('/stores/st1');
    expect(await screen.findByRole('heading', { name: 'Available now' })).toBeInTheDocument();
    expect(await screen.findByText('Butter Wrap')).toBeInTheDocument();
    expect(screen.getByAltText('A wrap')).toBeInTheDocument();
    expect(screen.getByText(/2 left/)).toBeInTheDocument();
  });

  test('students are sent away from /menu', async () => {
    asVendor();
    mockFetch({ ...base(student), 'GET /vendors': () => new Response(JSON.stringify({ success: true, data: [], meta: {} }), { status: 200 }) });
    renderApp('/menu');
    await screen.findByRole('heading', { level: 1, name: 'Campus stores' });
  });
});
