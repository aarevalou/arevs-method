import logo from '../assets/logo.png'

export default function Layout({ pages, current, onChange, children }) {
  return (
    <>
      <header className="av-header d-flex align-items-center gap-4 px-4">
        <div className="d-flex align-items-center gap-2 py-2">
          <img src={logo} alt="" className="av-logo" />
          <strong className="av-brand">Arevs Method</strong>
        </div>
        <nav className="av-nav d-flex">
          {pages.map((p) => (
            <button key={p.id} className={p.id === current ? 'active' : ''} onClick={() => onChange(p.id)}>{p.label}</button>
          ))}
        </nav>
      </header>
      <main className="container-fluid p-4">{children}</main>
    </>
  )
}
