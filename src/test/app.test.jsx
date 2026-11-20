import { describe, expect, test } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../auth/AuthContext';
import Modal from '../components/Modal';
import { admin, failure, mockFetch, student, tokens, vendorStore, vendorUser } from './mockApi';
import { useState } from 'react';

const renderApp = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

const META = { 'GET /meta/options': { roles: [], schoolEmailDomains: ['rdpolytech.ca'] } };

describe('sign in (features 1 and 12)', () => {
  test('empty submit shows a focused error summary, links to fields, and marks inputs invalid', async () => {
    mockFetch(META);
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveFocus();
    expect(within(summary).getByText('There are 2 problems to fix')).toBeInTheDocument();

    const email = screen.getByLabelText(/^Email/);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    const describedBy = email.getAttribute('aria-describedby');
    expect(document.getElementById(describedBy)).toHaveTextContent('Email is required');

    await user.click(within(summary).getByRole('link', { name: 'Password is required' }));
    expect(screen.getByLabelText(/^Password/)).toHaveFocus();
  });

  test('typing in a field clears its error', async () => {
    mockFetch(META);
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('alert');
    await user.type(screen.getByLabelText(/^Email/), 'a');
    expect(screen.getByLabelText(/^Email/)).not.toHaveAttribute('aria-invalid');
    // regression: clearing an error while typing must not pull focus out of the input
    expect(screen.getByLabelText(/^Email/)).toHaveFocus();
  });

  test('server rejection is shown in plain language; nothing is stored', async () => {
    mockFetch({ ...META, 'POST /auth/login': () => failure(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.') });
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(screen.getByLabelText(/^Email/), 'sam@rdpolytech.ca');
    await user.type(screen.getByLabelText(/^Password/), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
    expect(localStorage.getItem('campusbite.refreshToken')).toBeNull();
  });

  test('student signs in and lands on the stores page', async () => {
    mockFetch({
      ...META,
      'POST /auth/login': { user: student, tokens: tokens(1) },
      'GET /vendors': () => new Response(JSON.stringify({ success: true, data: [{ id: 'st1', storeName: 'Campus Cafe', building: 'Main Building' }], meta: { total: 1, page: 1, totalPages: 1 } })),
    });
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(screen.getByLabelText(/^Email/), 'sam@rdpolytech.ca');
    await user.type(screen.getByLabelText(/^Password/), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Campus stores' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Campus Cafe' })).toBeInTheDocument();
    expect(localStorage.getItem('campusbite.refreshToken')).toBe(tokens(1).refreshToken);
  });
});

describe('registration', () => {
  test('client check for the school email domain, and server field errors map back onto fields', async () => {
    mockFetch({
      ...META,
      'POST /auth/register': () => failure(400, 'VALIDATION_ERROR', 'Please check the form', [{ source: 'body', field: 'email', message: 'Server says no to this email' }]),
    });
    const user = userEvent.setup();
    renderApp('/register');
    await user.type(await screen.findByLabelText(/^Full name/), 'Sam Student');
    await user.type(screen.getByLabelText(/^School email/), 'sam@gmail.com');
    await user.type(screen.getByLabelText(/^Password/), 'Password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findAllByText(/Use your school email \(@rdpolytech\.ca\)/)).not.toHaveLength(0);

    await user.clear(screen.getByLabelText(/^School email/));
    await user.type(screen.getByLabelText(/^School email/), 'sam@rdpolytech.ca');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect((await screen.findAllByText('Server says no to this email')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^School email/)).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('route guards (feature 1: roles)', () => {
  test('anonymous visitors are redirected to sign in', async () => {
    mockFetch(META);
    renderApp('/stores');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });

  test('a restored session lets a student in, but admin pages send them home', async () => {
    localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
    mockFetch({
      ...META,
      'POST /auth/refresh': { user: student, tokens: tokens(2) },
      'GET /auth/me': { user: student },
      'GET /vendors': () => new Response(JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, totalPages: 1 } })),
    });
    renderApp('/admin/users');
    expect(await screen.findByRole('heading', { level: 1, name: 'Campus stores' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument();
  });

  test('a vendor only reaches their own store editor', async () => {
    localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
    mockFetch({
      'POST /auth/refresh': { user: vendorUser, tokens: tokens(2) },
      'GET /auth/me': { user: vendorUser, vendor: vendorStore },
    });
    renderApp('/my-store');
    expect(await screen.findByRole('heading', { level: 1, name: 'My store' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Store name/)).toHaveValue('Campus Cafe');
  });

  test('an expired session returns to sign-in with an explanation', async () => {
    localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
    mockFetch({ 'POST /auth/refresh': () => failure(401, 'INVALID_REFRESH_TOKEN', 'nope') });
    renderApp('/stores');
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('vendor store profile (feature 2)', () => {
  test('hours problems are caught before sending; a valid save sends the right payload', async () => {
    localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
    const { calls } = mockFetch({
      'POST /auth/refresh': { user: vendorUser, tokens: tokens(2) },
      'GET /auth/me': { user: vendorUser, vendor: vendorStore },
      'PATCH /vendor/profile': (c) => ({ ...vendorStore, ...c.body }),
    });
    const user = userEvent.setup();
    renderApp('/my-store');
    await screen.findByRole('heading', { level: 1, name: 'My store' });

    await user.type(screen.getByLabelText('Monday opens'), '18:00');
    await user.type(screen.getByLabelText('Monday closes'), '09:00');
    await user.click(screen.getByRole('button', { name: 'Save store profile' }));
    expect((await screen.findAllByText('Monday: closing time must be after opening time')).length).toBeGreaterThan(0);
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false);

    await user.clear(screen.getByLabelText('Monday closes'));
    await user.type(screen.getByLabelText('Monday closes'), '20:00');
    await user.click(screen.getByLabelText('Sunday opens').closest('.hours-row').querySelector('input[type=checkbox]'));
    await user.click(screen.getByRole('button', { name: 'Save store profile' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH');
    expect(patch.body.openingHours).toEqual([
      { day: 'monday', closed: false, opens: '18:00', closes: '20:00' },
      { day: 'sunday', closed: true },
    ]);
    expect(await screen.findByText('Your store profile was saved.')).toBeInTheDocument();
  });
});

describe('admin panel (feature 13)', () => {
  function adminRoutes(extra = {}) {
    const list = (data) => () => new Response(JSON.stringify({ success: true, data, meta: { total: data.length, page: 1, totalPages: 1 } }));
    return {
      'POST /auth/refresh': { user: admin, tokens: tokens(2) },
      'GET /auth/me': { user: admin },
      'GET /admin/users': list([
        { ...vendorUser, status: 'pending', createdAt: '2026-01-01T00:00:00Z' },
        { ...student, createdAt: '2026-01-01T00:00:00Z' },
      ]),
      ...extra,
    };
  }

  test('lists users with status shown as text and links to each detail page', async () => {
    localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
    mockFetch(adminRoutes());
    renderApp('/admin/users');
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('link', { name: 'Val Vendor' })).toHaveAttribute('href', '/admin/users/v1');
    expect(within(table).getByText(/Pending approval/)).toBeInTheDocument();
  });

  test('suspend requires a reason inside an accessible dialog, then calls the API', async () => {
    localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
    let suspended = false;
    const { calls } = mockFetch(
      adminRoutes({
        'GET /admin/users/s1': () => ({ ...student, status: suspended ? 'suspended' : 'active', statusReason: suspended ? 'Spam account' : undefined, createdAt: '2026-01-01T00:00:00Z' }),
        'POST /admin/users/s1/suspend': (c) => {
          suspended = true;
          return { ...student, status: 'suspended', reason: c.body.reason };
        },
      }),
    );
    const user = userEvent.setup();
    renderApp('/admin/users/s1');
    await user.click(await screen.findByRole('button', { name: /Suspend account…/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Suspend Sam Student?' });
    expect(within(dialog).getByLabelText(/^Reason/)).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Suspend account' }));
    expect((await within(dialog).findAllByText('Reason is required')).length).toBeGreaterThan(0);
    expect(calls.some((c) => c.path.endsWith('/suspend'))).toBe(false);

    await user.type(within(dialog).getByLabelText(/^Reason/), 'Spam account');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend account' }));
    expect(await screen.findByText('Sam Student was suspended and signed out.')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/suspend')).body).toEqual({ reason: 'Spam account' });
    expect(await screen.findByRole('button', { name: 'Reactivate account' })).toBeInTheDocument();
  });

  test('an administrator is never offered a suspend button', async () => {
    localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
    mockFetch(adminRoutes({ 'GET /admin/users/a1': () => ({ ...admin, createdAt: '2026-01-01T00:00:00Z' }) }));
    renderApp('/admin/users/a1');
    await screen.findByRole('heading', { level: 1, name: 'Ada Admin' });
    expect(screen.queryByRole('button', { name: /Suspend/ })).not.toBeInTheDocument();
  });

  test('vendor provisioning maps server errors on store.* fields back to the form', async () => {
    localStorage.setItem('campusbite.refreshToken', tokens(1).refreshToken);
    mockFetch(
      adminRoutes({
        'POST /admin/vendors': () => failure(409, 'EMAIL_TAKEN', 'An account with this email already exists.'),
      }),
    );
    const user = userEvent.setup();
    renderApp('/admin/vendors/new');
    await screen.findByRole('heading', { level: 1, name: 'Add a vendor' });
    await user.type(screen.getByLabelText(/^Contact name/), 'Val Vendor');
    await user.type(screen.getByLabelText(/^Email/), 'val@campusbite.test');
    await user.type(screen.getByLabelText(/^Temporary password/), 'Password123');
    await user.type(screen.getByLabelText(/^Store name/), 'Campus Cafe');
    await user.type(screen.getByLabelText(/^Building/), 'Main Building');
    await user.click(screen.getByRole('button', { name: 'Create vendor' }));
    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
  });
});

describe('Modal accessibility', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        {open && (
          <Modal title="Confirm" onClose={() => setOpen(false)}>
            <button>First</button>
            <button>Last</button>
          </Modal>
        )}
      </>
    );
  }

  test('traps focus, closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Confirm' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus(); // wrapped, not escaped
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
