// A simple centered message for loading, error and empty situations.
export default function StateMessage({ children, role = 'status', action }) {
  return (
    <div className="state-message" role={role}>
      <p>{children}</p>
      {action}
    </div>
  );
}
