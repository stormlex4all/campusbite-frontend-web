import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { menuApi, metaApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import useForm from '../../hooks/useForm';
import { rules, validateAll } from '../../validation/rules';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import FormErrorSummary from '../../components/FormErrorSummary';
import { TextAreaField, TextField } from '../../components/fields';
import ImageManager from './ImageManager';

function ItemForm({ item, onSaved }) {
  const form = useForm({
    initialValues: { name: item?.name || '', description: item?.description || '', defaultPrice: item ? String(item.defaultPrice) : '' },
    fieldOrder: ['name', 'defaultPrice', 'description'],
    validate: (v) => validateAll({ name: rules.itemName, description: rules.itemDescription, defaultPrice: rules.itemPrice }, v),
    onSubmit: async (v) => {
      const body = { name: v.name.trim(), description: v.description.trim(), defaultPrice: Number(v.defaultPrice) };
      onSaved(await (item ? menuApi.update(item.id, body) : menuApi.create(body)), !item);
    },
  });
  return (
    <form onSubmit={form.handleSubmit} noValidate aria-label="Menu item" className="card">
      <FormErrorSummary {...form} />
      <TextField label="Item name" required {...form.field('name')} />
      <TextField label="Usual price ($)" required inputMode="decimal" hint="Used when you list this item. You can change it per listing." {...form.field('defaultPrice')} />
      <TextAreaField label="Description" hint="Ingredients, size, anything students should know (up to 500 characters)." {...form.field('description')} />
      <Button type="submit" loading={form.submitting} loadingText="Saving">
        {item ? 'Save changes' : 'Add menu item'}
      </Button>
    </form>
  );
}

export default function MenuItemFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [override, setOverride] = useState(null); // latest item after saving or changing photos
  const { data: item, error, loading, reload } = useAsync(() => (id ? menuApi.get(id) : null), [id]);
  const { data: options } = useAsync(() => metaApi.options(), []);
  const current = override && override.id === id ? override : item;

  const onSaved = (next, created) => {
    if (created) return navigate(`/menu/${next.id}`, { state: { justCreated: true } });
    setOverride(next);
    setSaved(true);
  };

  return (
    <QueryState loading={Boolean(id) && loading} error={error} onRetry={reload} loadingLabel="Loading menu item">
      <PageHeader title={id ? 'Edit menu item' : 'Add menu item'} />
      <div className="stack">
        <p><Link to="/menu">← Back to menu items</Link></p>
        {saved && <Alert tone="success">Menu item saved.</Alert>}
        {current?.status === 'archived' && <Alert tone="info">This item is archived. Restore it from the list to use it in new listings.</Alert>}
        <ItemForm key={current?.id || 'new'} item={current} onSaved={onSaved} />
        {current ? (
          <ImageManager itemId={current.id} images={current.images} limits={options?.images} onChange={setOverride} />
        ) : (
          <p className="muted">Save the item first, then you can add photos.</p>
        )}
      </div>
    </QueryState>
  );
}
