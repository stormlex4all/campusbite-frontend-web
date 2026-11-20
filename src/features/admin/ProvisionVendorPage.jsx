import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/endpoints';
import useForm from '../../hooks/useForm';
import { rules, validateAll } from '../../validation/rules';
import { SelectField, TextAreaField, TextField } from '../../components/fields';
import Button from '../../components/Button';
import FormErrorSummary from '../../components/FormErrorSummary';
import PageHeader from '../../components/PageHeader';

const ORDER = ['name', 'email', 'password', 'status', 'storeName', 'building', 'counterLocation', 'description', 'pickupInstructions'];

export default function ProvisionVendorPage() {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: { name: '', email: '', password: '', status: 'active', storeName: '', building: '', counterLocation: '', description: '', pickupInstructions: '' },
    fieldOrder: ORDER,
    mapServerField: (f) => f.replace(/^store\./, ''),
    validate: (v) =>
      validateAll(
        {
          name: rules.name,
          email: rules.email,
          password: rules.newPassword,
          storeName: rules.storeName,
          building: rules.building,
          counterLocation: rules.counterLocation,
          description: rules.description,
          pickupInstructions: rules.pickupInstructions,
        },
        v,
      ),
    onSubmit: async (v) => {
      const created = await adminApi.provisionVendor({
        name: v.name.trim(),
        email: v.email.trim(),
        password: v.password,
        status: v.status,
        store: {
          storeName: v.storeName.trim(),
          building: v.building.trim(),
          ...(v.counterLocation.trim() && { counterLocation: v.counterLocation.trim() }),
          ...(v.description.trim() && { description: v.description.trim() }),
          ...(v.pickupInstructions.trim() && { pickupInstructions: v.pickupInstructions.trim() }),
        },
      });
      navigate(`/admin/users/${created.id}`, { replace: true });
    },
  });

  return (
    <>
      <PageHeader title="Add a vendor" subtitle="Create the vendor's sign-in and store profile. Share the password with them securely; they can change it after signing in." />
      <p>
        <Link to="/admin/users">← Back to users</Link>
      </p>
      <form onSubmit={form.handleSubmit} noValidate aria-label="Add vendor" className="card">
        <FormErrorSummary {...form} />
        <fieldset>
          <legend>Account</legend>
          <TextField label="Contact name" autoComplete="off" required {...form.field('name')} />
          <TextField label="Email" type="email" autoComplete="off" required {...form.field('email')} />
          <TextField label="Temporary password" type="text" autoComplete="off" required hint="At least 8 characters, with a letter and a number." {...form.field('password')} />
          <SelectField
            label="Account status"
            hint="Choose “Pending” if the vendor should be approved in a separate step."
            options={[{ value: 'active', label: 'Active (approved now)' }, { value: 'pending', label: 'Pending approval' }]}
            {...form.field('status')}
          />
        </fieldset>
        <fieldset>
          <legend>Store</legend>
          <TextField label="Store name" required {...form.field('storeName')} />
          <TextField label="Building" required {...form.field('building')} />
          <TextField label="Counter or pickup spot" {...form.field('counterLocation')} />
          <TextAreaField label="Description" {...form.field('description')} />
          <TextAreaField label="Pickup instructions" {...form.field('pickupInstructions')} />
        </fieldset>
        <Button type="submit" loading={form.submitting} loadingText="Creating vendor">
          Create vendor
        </Button>
      </form>
    </>
  );
}
