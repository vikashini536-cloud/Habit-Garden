import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

// Keyboard: Enter/Space or ArrowDown opens the menu and focuses the first item.
// Arrow keys move between items. Escape or Tab closes it. Escape returns focus to the button.
// Touch and mouse: tapping outside the menu closes it.
export default function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const items = () => Array.from(panelRef.current?.querySelectorAll('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return undefined;
    items()[0]?.focus();

    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function closeMenu({ returnFocus }) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onPanelKeyDown(event) {
    const list = items();
    const index = list.indexOf(document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ returnFocus: true });
    } else if (event.key === 'Tab') {
      closeMenu({ returnFocus: false });
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      list[(index + step + list.length) % list.length]?.focus();
    }
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
      >
        {user.name}
      </button>

      {open && (
        <div ref={panelRef} className="account-menu__panel" role="menu" onKeyDown={onPanelKeyDown}>
          <p className="account-menu__identity">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </p>
          <Link role="menuitem" to="/settings" className="account-menu__item" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button role="menuitem" type="button" className="account-menu__item" onClick={signOut}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
