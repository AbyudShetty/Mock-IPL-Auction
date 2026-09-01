export default function FieldError({ message }) {
  if (!message) return null;
  return <small className="error-message-text">{message}</small>;
}
