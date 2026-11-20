import { Link, useNavigate } from 'react-router-dom';
import { listingsApi, menuApi } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import useForm from '../../hooks/useForm';
import { rules, validateAll } from '../../validation/rules';
import PageHeader from '../../components/PageHeader';
import QueryState from '../../components/QueryState';
import FormErrorSummary from '../../components/FormErrorSummary';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { SelectField, TextAreaField, TextField } from '../../components/fields';
import { money } from '../../utils';

const toIso = (local) => new Date(local).toISOString();

function validate(v) {
  const rulesByField = { quantityTotal: rules.quantity };
  if (v.source === 'menu_item') {
    if (v.price.trim()) rulesByField.price = rules.itemPrice;
  } else {
    Object.assign(rulesByField, { title: rules.itemName, description: rules.itemDescription, price: rules.itemPrice });
  }
  const errors = validateAll(rulesByField, v);
  if (v.source === 'menu_item' && !v.menuItemId) errors.menuItemId = 'Choose a menu item';
  if (!v.pickupStart) errors.pickupStart = 'Pickup start is required';
  if (!v.pickupEnd) errors.pickupEnd = 'Pickup end is required';
  if (v.pickupStart && v.pickupEnd) {
    if (new Date(v.pickupEnd) <= new Date(v.pickupStart)) errors.pickupEnd = 'Pickup must end after it starts';
    else if (new Date(v.pickupEnd) <= new Date()) errors.pickupEnd = 'Choose a pickup time in the future';
  }
  return errors;
}

function ListingForm({ menuItems }) {
  const navigate = useNavigate();
  const hasMenu = menuItems.length > 0;
  const form = useForm({
    initialValues: { source: hasMenu ? 'menu_item' : 'one_off', menuItemId: '', title: '', description: '', price: '', quantityTotal: '', pickupStart: '', pickupEnd: '' },
    fieldOrder: ['menuItemId', 'title', 'price', 'description', 'quantityTotal', 'pickupStart', 'pickupEnd'],
    validate,
    onSubmit: async (v) => {
      const window = { quantityTotal: Number(v.quantityTotal), pickupStart: toIso(v.pickupStart), pickupEnd: toIso(v.pickupEnd) };
      await listingsApi.create(
        v.source === 'menu_item'
          ? { source: 'menu_item', menuItemId: v.menuItemId, ...(v.price.trim() && { price: Number(v.price) }), ...window }
          : { source: 'one_off', title: v.title.trim(), description: v.description.trim(), price: Number(v.price), ...window },
      );
      navigate('/listings');
    },
  });
  const fromMenu = form.values.source === 'menu_item';
  const chosen = menuItems.find((m) => m.id === form.values.menuItemId);

  return (
    <form onSubmit={form.handleSubmit} noValidate aria-label="New listing" className="card">
      <FormErrorSummary {...form} />
      <fieldset className="field">
        <legend>What are you listing?</legend>
        <label className="choice">
          <input type="radio" name="source" value="menu_item" checked={fromMenu} onChange={form.handleChange} disabled={!hasMenu} /> One of my menu items
        </label>
        <label className="choice">
          <input type="radio" name="source" value="one_off" checked={!fromMenu} onChange={form.handleChange} /> Something else, just this once
        </label>
        {!hasMenu && <p className="hint">You have no menu items yet. <Link to="/menu/new">Add one</Link> to reuse it in future listings.</p>}
      </fieldset>

      {fromMenu ? (
        <>
          <SelectField
            label="Menu item"
            required
            options={[{ value: '', label: 'Choose an item…' }, ...menuItems.map((m) => ({ value: m.id, label: `${m.name} (${money(m.defaultPrice)})` }))]}
            {...form.field('menuItemId')}
          />
          <TextField label="Price for this listing ($)" inputMode="decimal" hint={chosen ? `Leave empty to use the usual price, ${money(chosen.defaultPrice)}.` : 'Leave empty to use the item’s usual price.'} {...form.field('price')} />
        </>
      ) : (
        <>
          <TextField label="Item name" required {...form.field('title')} />
          <TextField label="Price ($)" required inputMode="decimal" {...form.field('price')} />
          <TextAreaField label="Description" {...form.field('description')} />
        </>
      )}
      <TextField label="Number of portions" required inputMode="numeric" {...form.field('quantityTotal')} />
      <TextField label="Pickup starts" type="datetime-local" required {...form.field('pickupStart')} />
      <TextField label="Pickup ends" type="datetime-local" required hint="Pickup windows can be up to 12 hours long." {...form.field('pickupEnd')} />
      <div className="actions">
        <Button type="submit" loading={form.submitting} loadingText="Creating">
          Create listing
        </Button>
        <Button variant="secondary" onClick={() => navigate('/listings')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function NewListingPage() {
  const { data, error, loading, reload } = useAsync(() => menuApi.list({ status: 'active' }), []);
  return (
    <>
      <PageHeader title="New listing" subtitle="Pick one of your saved menu items, or list something one-off." />
      <QueryState loading={loading} error={error} onRetry={reload} loadingLabel="Loading menu items">
        {data && (
          <>
            {data.data.length === 0 && <Alert tone="info">Tip: saved menu items let you create listings in seconds.</Alert>}
            <ListingForm menuItems={data.data} />
          </>
        )}
      </QueryState>
    </>
  );
}
