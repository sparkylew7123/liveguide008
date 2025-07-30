export default function TestMinimalPage() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#111', color: 'white', minHeight: '100vh' }}>
      <h1>Minimal Test Page</h1>
      <p>If you can see this, the basic Next.js setup is working.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
    </div>
  );
}