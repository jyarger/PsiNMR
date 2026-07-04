import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';

import { PsiMark } from './PsiLogo.js';

const Wrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  padding: 24px;
  text-align: center;
`;

// Slide-and-fade the |NMR⟩ ket in from the right just as the Ψ finishes
// its intro spin, forming Ψ|NMR⟩.
const revealKet = keyframes`
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const Hero = styled.h1`
  align-items: center;
  display: flex;
  gap: 6px;
  margin: 0;
`;

const Ket = styled.span`
  animation: ${revealKet} 0.55s ease-out 1.5s both;
  color: var(--psi-text);
  font-size: 72px;
  font-weight: 700;
  line-height: 1;

  span {
    color: var(--psi-accent);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Tagline = styled.p`
  color: var(--psi-text-muted);
  font-size: 16.5px;
  margin: 12px 0 34px;
  max-width: 560px;
`;

const Cta = styled(Link)`
  background: var(--psi-accent);
  border-radius: var(--psi-radius);
  box-shadow: 0 4px 14px rgb(61 143 133 / 30%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 14px 34px;
  text-decoration: none;

  &:hover {
    background: var(--psi-accent-strong);
    color: #fff;
  }
`;

const Hint = styled.p`
  color: var(--psi-text-muted);
  font-size: 13px;
  margin-top: 26px;
`;

export default function Landing() {
  return (
    <Wrapper>
      <Hero>
        <PsiMark size={84} spin="intro" />
        <Ket>
          |<span>NMR</span>⟩
        </Ket>
      </Hero>
      <Tagline>
        Process, analyze and visualize 1D &amp; 2D NMR data directly in your
        browser — drag in your datasets, or point PsiNMR at a public data
        repository.
      </Tagline>
      <Cta to="/nmr">INTERACTIVE NMR</Cta>
      <Hint>
        Open the data panel (top-left) to browse the sample library, drop in zip
        datasets, or load data from a URL.
      </Hint>
    </Wrapper>
  );
}
