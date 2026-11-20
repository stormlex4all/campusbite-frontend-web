import { useRef, useState } from 'react';
import { menuApi } from '../../api/endpoints';
import { ApiError } from '../../api/ApiError';
import config from '../../config';
import { rules } from '../../validation/rules';
import { TextField } from '../../components/fields';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import Modal from '../../components/Modal';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Photos of one menu item: add (with a description for screen readers), remove (with confirmation). */
export default function ImageManager({ itemId, images, limits, onChange }) {
  const maxPerItem = limits?.maxPerItem ?? 4;
  const maxMb = limits?.maxMb ?? 2;
  const fileRef = useRef(null);
  const [alt, setAlt] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const full = images.length >= maxPerItem;

  const add = async () => {
    setProblem('');
    const file = fileRef.current?.files?.[0];
    if (!file) return setProblem('Choose a photo first.');
    if (!TYPES.includes(file.type)) return setProblem('Photos must be JPEG, PNG or WebP.');
    if (file.size > maxMb * 1024 * 1024) return setProblem(`That photo is too large. The limit is ${maxMb} MB.`);
    const altProblem = rules.imageAlt(alt);
    if (altProblem) return setProblem(altProblem);
    setBusy(true);
    try {
      onChange(await menuApi.addImage(itemId, file, alt.trim()));
      setAlt('');
      fileRef.current.value = '';
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not upload the photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const image = toRemove;
    setToRemove(null);
    setProblem('');
    try {
      onChange(await menuApi.removeImage(itemId, image.id));
    } catch (err) {
      setProblem(err instanceof ApiError ? err.message : 'Could not remove the photo.');
    }
  };

  return (
    <section className="card" aria-labelledby="photos-h">
      <h2 id="photos-h">Photos</h2>
      <p className="hint">
        Up to {maxPerItem} photos (JPEG, PNG or WebP, {maxMb} MB each). Listings made from this item show them to students.
      </p>
      {problem && <Alert tone="error">{problem}</Alert>}
      {images.length === 0 ? (
        <p className="empty">No photos yet.</p>
      ) : (
        <ul className="photo-grid">
          {images.map((img) => (
            <li key={img.id}>
              <img src={config.assetUrl(img.url)} alt={img.alt} width="160" height="120" />
              <p className="muted">{img.alt}</p>
              <Button variant="secondary" onClick={() => setToRemove(img)} aria-label={`Remove photo: ${img.alt}`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="muted">You have reached the limit of {maxPerItem} photos. Remove one to add another.</p>
      ) : (
        <div className="stack">
          <div className="field">
            <label htmlFor="photo-file">Choose a photo</label>
            <input id="photo-file" type="file" accept={TYPES.join(',')} ref={fileRef} />
          </div>
          <TextField label="Describe the photo" hint="For people who cannot see it, e.g. “Wrap cut in half on a white plate”." value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={140} />
          <Button onClick={add} loading={busy} loadingText="Uploading">
            Add photo
          </Button>
        </div>
      )}
      {toRemove && (
        <Modal title="Remove this photo?" onClose={() => setToRemove(null)}>
          <p>“{toRemove.alt}” will be removed from this menu item. Listings that already use it keep showing it.</p>
          <div className="actions">
            <Button variant="danger" onClick={remove}>
              Remove photo
            </Button>
            <Button variant="secondary" onClick={() => setToRemove(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
