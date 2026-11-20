import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { vendorProfileApi } from '../../api/endpoints';
import useForm from '../../hooks/useForm';
import { rules, validateAll } from '../../validation/rules';
import { TextField, TextAreaField } from '../../components/fields';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import FormErrorSummary from '../../components/FormErrorSummary';
import PageHeader from '../../components/PageHeader';
import { OpeningHoursEditor, OpeningHoursList, validateWeek, weekFromApi, weekToApi } from './OpeningHours';

const FIELD_ORDER = ['storeName', 'building', 'counterLocation', 'description', 'pickupInstructions', 'hours'];

export default function VendorProfilePage() {
  const { vendor, refreshProfile } = useAuth();
  const [saved, setSaved] = useState(false);

  const initialValues = useMemo(
    () => ({
      storeName: vendor.storeName || '',
      building: vendor.building || '',
      counterLocation: vendor.counterLocation || '',
      description: vendor.description || '',
      pickupInstructions: vendor.pickupInstructions || '',
      hours: weekFromApi(vendor.openingHours),
    }),
    [vendor],
  );

  const form = useForm({
    initialValues,
    fieldOrder: FIELD_ORDER,
    mapServerField: (f) => (f.startsWith('openingHours') ? 'hours' : f),
    validate: (v) => {
      const errors = validateAll(
        {
          storeName: rules.storeName,
          building: rules.building,
          counterLocation: rules.counterLocation,
          description: rules.description,
          pickupInstructions: rules.pickupInstructions,
        },
        v,
      );
      const weekProblem = validateWeek(v.hours);
      if (weekProblem) errors.hours = weekProblem;
      return errors;
    },
    onSubmit: async (v) => {
      setSaved(false);
      await vendorProfileApi.update({
        storeName: v.storeName.trim(),
        building: v.building.trim(),
        counterLocation: v.counterLocation.trim(),
        description: v.description.trim(),
        pickupInstructions: v.pickupInstructions.trim(),
        openingHours: weekToApi(v.hours),
      });
      await refreshProfile();
      setSaved(true);
    },
  });

  return (
    <>
      <PageHeader title="My store" subtitle="This is what students see when they browse CampusBite." />
      <div className="two-col">
        <form onSubmit={form.handleSubmit} noValidate aria-label="Store profile" className="card">
          <FormErrorSummary {...form} />
          {saved && <Alert tone="success">Your store profile was saved.</Alert>}
          <TextField label="Store name" required {...form.field('storeName')} />
          <TextField label="Building" required hint="Where on campus students collect their food." {...form.field('building')} />
          <TextField label="Counter or pickup spot" {...form.field('counterLocation')} />
          <TextAreaField label="Description" hint="A short introduction (up to 500 characters)." {...form.field('description')} />
          <TextAreaField label="Pickup instructions" hint="For example: show your pickup code at the till." {...form.field('pickupInstructions')} />
          <OpeningHoursEditor value={form.values.hours} onChange={(hours) => form.setValue('hours', hours)} error={form.errors.hours} />
          <Button type="submit" loading={form.submitting} loadingText="Saving">
            Save store profile
          </Button>
        </form>
        <aside className="card" aria-labelledby="preview-h">
          <h2 id="preview-h">Saved version</h2>
          <p>
            <strong>{vendor.storeName}</strong>
            <br />
            <span className="muted">{vendor.building}{vendor.counterLocation ? ` · ${vendor.counterLocation}` : ''}</span>
          </p>
          <OpeningHoursList hours={vendor.openingHours} />
        </aside>
      </div>
    </>
  );
}
