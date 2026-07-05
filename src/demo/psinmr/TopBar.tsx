import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';
import {
  FaBars,
  FaBook,
  FaCaretDown,
  FaFlask,
  FaMoon,
  FaSun,
  FaWaveSquare,
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';

import PsiLogo from './PsiLogo.js';
import { useEngineBackend } from './engineStatus.js';
import { togglePsiTheme, usePsiTheme } from './themeStatus.js';

const Bar = styled.header`
  align-items: center;
  background: var(--psi-chrome);
  border-bottom: 1px solid var(--psi-chrome-border);
  display: flex;
  gap: 8px;
  height: 52px;
  padding: 0 14px;
  position: relative;
  z-index: 30;
`;

const IconButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--psi-text-on-chrome-muted);
  cursor: pointer;
  display: flex;
  font-size: 16px;
  height: 34px;
  justify-content: center;
  width: 34px;

  &:hover {
    background: var(--psi-chrome-raised);
    color: var(--psi-text-on-chrome);
  }
`;

const BrandLink = styled(Link)`
  align-items: center;
  display: flex;
  margin-right: 12px;
  text-decoration: none;
`;

const PrimaryAction = styled(Link)`
  background: var(--psi-accent);
  border-radius: var(--psi-radius);
  color: #fff;
  font-size: 12.5px;
  font-weight: 650;
  letter-spacing: 0.08em;
  padding: 8px 16px;
  text-decoration: none;

  &:hover {
    background: var(--psi-accent-strong);
    color: #fff;
  }
`;

const MenuWrapper = styled.div`
  position: relative;
`;

const MenuButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--psi-text-on-chrome);
  cursor: pointer;
  display: flex;
  font-family: var(--psi-font);
  font-size: 13.5px;
  font-weight: 550;
  gap: 6px;
  padding: 8px 12px;

  &:hover {
    background: var(--psi-chrome-raised);
  }
`;

const Dropdown = styled.div`
  background: var(--psi-chrome-raised);
  border: 1px solid var(--psi-chrome-border);
  border-radius: var(--psi-radius);
  box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
  min-width: 190px;
  padding: 6px;
  position: absolute;
  right: auto;
  top: calc(100% + 6px);
`;

const DropdownItem = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--psi-text-on-chrome);
  cursor: pointer;
  display: flex;
  font-family: var(--psi-font);
  font-size: 13.5px;
  gap: 10px;
  padding: 9px 12px;
  text-align: left;
  width: 100%;

  svg {
    color: var(--psi-accent-on-chrome);
  }

  &:hover {
    background: var(--psi-accent-soft);
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

const EngineChip = styled.span<{ backend: string }>`
  border: 1px solid var(--psi-chrome-border);
  border-radius: 999px;
  color: ${({ backend }) =>
    backend === 'wasm'
      ? 'var(--psi-accent-on-chrome)'
      : 'var(--psi-text-on-chrome-muted)'};
  font-size: 11.5px;
  padding: 4px 10px;
  user-select: none;
  white-space: nowrap;
`;

interface TopBarProps {
  onDataPanelToggle: () => void;
}

export default function TopBar(props: TopBarProps) {
  const { onDataPanelToggle } = props;
  const [toolsOpen, setToolsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const backend = useEngineBackend();
  const theme = usePsiTheme();

  useEffect(() => {
    if (!toolsOpen) return;
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    }
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [toolsOpen]);

  function go(path: string) {
    setToolsOpen(false);
    void navigate(path);
  }

  return (
    <Bar className="psi-chrome">
      <IconButton
        type="button"
        title="Toggle data panel"
        onClick={onDataPanelToggle}
      >
        <FaBars />
      </IconButton>
      <BrandLink to="/">
        <PsiLogo size={34} spin="intro" wordmark="ketmark" />
      </BrandLink>

      <PrimaryAction to="/nmr">INTERACTIVE NMR</PrimaryAction>

      <MenuWrapper ref={menuRef}>
        <MenuButton type="button" onClick={() => setToolsOpen(!toolsOpen)}>
          Tools
          <FaCaretDown size={11} />
        </MenuButton>
        {toolsOpen && (
          <Dropdown>
            <DropdownItem type="button" onClick={() => go('/tools/predict')}>
              <FaFlask />
              Predict
            </DropdownItem>
            <DropdownItem type="button" onClick={() => go('/tools/simulate')}>
              <FaWaveSquare />
              Simulate
            </DropdownItem>
          </Dropdown>
        )}
      </MenuWrapper>

      <MenuButton type="button" onClick={() => go('/docs')}>
        <FaBook size={12} />
        Docs
      </MenuButton>

      <Spacer />

      <EngineChip
        backend={backend}
        title="Compute engine used for heavy processing (contours, FFT)"
      >
        Ψ engine:{' '}
        {backend === 'wasm' ? 'Rust/Wasm' : backend === 'js' ? 'JS' : '…'}
      </EngineChip>

      <IconButton
        type="button"
        title={
          theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
        }
        onClick={togglePsiTheme}
      >
        {theme === 'dark' ? <FaSun /> : <FaMoon />}
      </IconButton>
    </Bar>
  );
}
