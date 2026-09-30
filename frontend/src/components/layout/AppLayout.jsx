import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 px-4 md:px-8 py-8 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
