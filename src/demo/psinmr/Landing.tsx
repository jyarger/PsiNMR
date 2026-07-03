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

const Title = styled.h1`
  color: var(--psi-text);
  font-size: 40px;
  font-weight: 700;
  letter-spacing: 0.01em;
  margin: 18px 0 0;

  span {
    color: var(--psi-accent);
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
      <PsiMark size={84} />
      <Title>
        Psi<span>NMR</span>
      </Title>
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
