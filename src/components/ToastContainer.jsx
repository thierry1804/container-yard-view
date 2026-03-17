export default function ToastContainer({ toasts }) {
  const icons = { success: '✓', error: '✗', info: 'ℹ' };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{icons[t.type] || ''}</span>
          <span className="toast-text" dangerouslySetInnerHTML={{ __html: t.html }}></span>
        </div>
      ))}
    </div>
  );
}
