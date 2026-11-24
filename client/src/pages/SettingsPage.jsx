import { useAuth } from '../auth/AuthContext.jsx';
import ChangePasswordForm from '../components/ChangePasswordForm.jsx';
import DeleteAccountForm from '../components/DeleteAccountForm.jsx';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <section className="settings">
      <h1>Settings</h1>

      <section className="settings__card">
        <h2>Account</h2>
        <dl className="stats">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>{user.timezone}</dd>
          </div>
        </dl>
      </section>

      <section className="settings__card">
        <h2>Change password</h2>
        <ChangePasswordForm />
      </section>

      <section className="settings__card danger-zone">
        <h2>Delete account</h2>
        <DeleteAccountForm />
      </section>
    </section>
  );
}
