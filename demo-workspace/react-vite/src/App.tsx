import "./index.css";

export default function App() {
  return (
    <div className="app">
      <header className="hero">
        <h1>Rigger React Demo</h1>
        <p>Adjust parameters from the Rigger panel to watch styles shift.</p>
        <button>Ship it</button>
      </header>
      <section className="grid">
        {Array.from({ length: 3 }).map((_, idx) => (
          <article key={idx}>
            <h3>Panel {idx + 1}</h3>
            <p>Spacing, radius, and typography are perfect rig candidates.</p>
          </article>
        ))}
      </section>
    </div>
  );
}
