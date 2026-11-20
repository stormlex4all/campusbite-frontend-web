import { Link, useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../../auth/AuthContext';
import useForm from '../../hooks/useForm';
import useAsync from '../../hooks/useAsync';
import { metaApi } from '../../api/endpoints';
import { rules, validateAll } from '../../validation/rules';
import { TextField } from '../../components/fields';
import Button from '../../components/Button';
import FormErrorSummary from '../../components/FormErrorSummary';
import PageHeader from '../../components/PageHeader';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { data: meta } = useAsync(() => metaApi.options(), []);
  const domains = meta?.schoolEmailDomains || [];

  const form = useForm({
    initialValues: { name: '', email: '', password: '' },
    validate: (v) => {
      const errors = validateAll({ name: rules.name, email: rules.email, password: rules.newPassword }, v);
      const domain = v.email.trim().toLowerCase().split('@')[1];
      if (!errors.email && domains.length && !domains.includes(domain)) {
        errors.email = `Use your school email (${domains.map((d) => `@${d}`).join(' or ')})`;
      }
      return errors;
    },
    fieldOrder: ['name', 'email', 'password'],
    onSubmit: async (v) => {
      const user = await register({ name: v.name.trim(), email: v.email.trim(), password: v.password });
      navigate(homePathFor(user.role), { replace: true });
    },
  });

  return (
    <div className="narrow">
      <PageHeader title="Create your student account" subtitle="Reserve discounted surplus food from campus vendors." />
      <form onSubmit={form.handleSubmit} noValidate aria-label="Create account">
        <FormErrorSummary {...form} />
        <TextField label="Full name" autoComplete="name" required {...form.field('name')} />
        <TextField
          label="School email"
          type="email"
          autoComplete="email"
          required
          hint={domains.length ? `Use your ${domains.map((d) => `@${d}`).join(' or ')} address.` : undefined}
          {...form.field('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, with at least one letter and one number."
          {...form.field('password')}
        />
        <Button type="submit" loading={form.submitting} loadingText="Creating account">
          Create account
        </Button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
      <p className="muted">Vendor accounts are created by the CampusBite team.</p>
    </div>
  );
}
