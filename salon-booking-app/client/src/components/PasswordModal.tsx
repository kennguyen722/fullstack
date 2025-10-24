import React from 'react';

type Props = {
  show: boolean;
  onClose: () => void;
  onSave: (password: string) => void;
  title?: string;
};

export default function PasswordModal({ show, onClose, onSave, title = 'Set admin password' }: Props) {
  const [pw, setPw] = React.useState('');
  const [confirm, setConfirm] = React.useState('');

  React.useEffect(() => {
    if (!show) {
      setPw(''); setConfirm('');
    }
  }, [show]);

  const valid = pw.length >= 6 && pw === confirm;

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-2">
              <label className="form-label">New password</label>
              <input className="form-control" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div>
              <label className="form-label">Confirm password</label>
              <input className="form-control" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
            </div>
            {!valid && pw.length > 0 && <div className="text-danger mt-2">Passwords must match and be at least 6 characters.</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(pw)}>Save password</button>
          </div>
        </div>
      </div>
    </div>
  );
}
