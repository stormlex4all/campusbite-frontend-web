import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { authApi } from '../../api/endpoints';
import useForm from '../../hooks/useForm';
import { rules, validateAll } from '../../validation/rules';
import { TextField } from '../../components/fields';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import FormErrorSummary from '../../components/FormErrorSummary';
import PageHeader from '../../components/PageHeader';
import { RoleBadge } from '../../components/StatusBadge';

function NameForm() {
  const { user, refreshProfile } = useAuth();
  const [saved, setSaved] = useState(false);
  const form = useForm({
    initialValues: { name: user.name },
    validate: (v) => validateAll({ name: rules.name }, v),
    onSubmit: async (v) => {
      setSaved(false);
      await authApi.updateName(v.name.trim());
      await refreshProfile();
      setSaved(true);
    },
  });
  return (
    <section aria-labelledby="profile-heading" className="card">
      <h2 id="profile-heading">Your details</h2>
      <dl className="details">
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Role</dt>
        <dd>
          <RoleBadge role={user.role} />
        </dd>
      </dl>
      <form onSubmit={form.handleSubmit} noValidate aria-label="Update your name">
        <FormErrorSummary {...form} />
        {saved && <Alert tone="success">Your name was updated.</Alert>}
        <TextField label="Full name" autoComplete="name" required {...form.field('name')} />
        <Button type="submit" loading={form.submitting} loadingText="Saving">
          Save name
        </Button>
      </form>
    </section>
  );
}

function PasswordForm() {
  const { adoptTokens } = useAuth();
  const [saved, setSaved] = useState(false);
  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validate: (v) => {
      const errors = validateAll({ currentPassword: rules.loginPassword, newPassword: rules.newPassword }, v);
      if (!errors.newPassword && v.newPassword === v.currentPassword) errors.newPassword = 'New password must be different from the current password';
      if (!errors.newPassword && v.confirmPassword !== v.newPassword) errors.confirmPassword = 'The two new passwords do not match';
      return errors;
    },
    fieldOrder: ['currentPassword', 'newPassword', 'confirmPassword'],
    onSubmit: async (v) => {
      setSaved(false);
      const { tokens } = await authApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      adoptTokens(tokens); // other devices are signed out; this one continues
      form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaved(true);
    },
  });
  return (
    <section aria-labelledby="password-heading" className="card">
      <h2 id="password-heading">Change password</h2>
      <form onSubmit={form.handleSubmit} noValidate aria-label="Change password">
        <FormErrorSummary {...form} />
        {saved && <Alert tone="success">Password changed. Other devices have been signed out.</Alert>}
        <TextField label="Current password" type="password" autoComplete="current-password" required {...form.field('currentPassword')} />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, with at least one letter and one number."
          {...form.field('newPassword')}
        />
        <TextField label="Confirm new password" type="password" autoComplete="new-password" required {...form.field('confirmPassword')} />
        <Button type="submit" loading={form.submitting} loadingText="Changing">
          Change password
        </Button>
      </form>
    </section>
  );
}

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Your account" />
      <div className="stack">
        <NameForm />
        <PasswordForm />
      </div>
    </>
  );
}
