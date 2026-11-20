import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../../auth/AuthContext';
import useForm from '../../hooks/useForm';
import { rules, validateAll } from '../../validation/rules';
import { TextField } from '../../components/fields';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import FormErrorSummary from '../../components/FormErrorSummary';
import PageHeader from '../../components/PageHeader';

const validate = (v) => validateAll({ email: rules.email, password: rules.loginPassword }, v);

export default function LoginPage() {
  const { login, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate,
    fieldOrder: ['email', 'password'],
    onSubmit: async (values) => {
      const user = await login({ email: values.email.trim(), password: values.password });
      navigate(location.state?.from || homePathFor(user.role), { replace: true });
    },
  });

  return (
    <div className="narrow">
      <PageHeader title="Sign in" subtitle="Welcome back. Sign in to find surplus food or manage your store." />
      {notice && <Alert tone="warning">{notice}</Alert>}
      <form onSubmit={form.handleSubmit} noValidate aria-label="Sign in">
        <FormErrorSummary {...form} />
        <TextField label="Email" type="email" autoComplete="email" required {...form.field('email')} />
        <TextField label="Password" type="password" autoComplete="current-password" required {...form.field('password')} />
        <Button type="submit" loading={form.submitting} loadingText="Signing in">
          Sign in
        </Button>
      </form>
      <p className="muted">
        New here? <Link to="/register">Create a student account</Link>
      </p>
    </div>
  );
}
