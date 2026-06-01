import { Outlet } from 'react-router-dom';
import Menu from './components/menu';

export default function Layout() {
  return (
    <>
      <Menu />
      <main className="p-6">
        <Outlet />
      </main>
    </>
  );
}
