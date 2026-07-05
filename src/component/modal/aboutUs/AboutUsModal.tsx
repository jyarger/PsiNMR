import styled from '@emotion/styled';
import { Toolbar, useOnOff } from 'react-science/ui';

import versionInfo from '../../../versionInfo.js';
import Logo from '../../elements/Logo.js';
import { StandardDialog } from '../../elements/StandardDialog.tsx';
import { StyledDialogBody } from '../../elements/StyledDialogBody.js';
import { CoreSlot } from '../../utility/CoreSlot.tsx';

const FallbackDialogContents = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  user-select: none;

  button:focus {
    outline: none;
  }

  ul {
    list-style-type: disc;
    margin-left: 20px;
  }

  span,
  li {
    user-select: text;
  }

  span.title {
    color: var(--psi-accent, #ea580c);
    font-weight: bold;
  }

  span.content,
  div.content {
    color: var(--psi-text, #2b143e);
    font-size: 14px;
    text-align: left;
  }

  /* Highlighted tagline — larger and in the accent colour so it's clearly
     visible in either theme. */
  span.tagline {
    color: var(--psi-accent, #3d8f85);
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
    text-align: center;
  }

  p.credit {
    color: var(--psi-text, #2b143e);
    font-size: 14.5px;
    margin: 0;
  }

  p.fineprint {
    color: var(--psi-text-muted, #7a7a7a);
    font-size: 11.5px;
    line-height: 1.45;
    margin: 6px 0 0;
  }

  a {
    color: var(--psi-accent, #969696);
  }

  a:hover,
  a:focus {
    color: var(--psi-accent-strong, #00bcd4);
  }
`;

const InfoBlock = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
`;

const Separator = styled.span`
  border-bottom: 1px solid gray;
  height: 1px;
  margin: 10px 0;
  width: 15px;
`;

const modalContentFallback = (
  <FallbackDialogContents>
    <InfoBlock>
      <Logo width={160} height={50} />
      Version <VersionInfo />
      <Separator />
      <a
        href="https://github.com/jyarger/PsiNMR"
        target="_blank"
        rel="noreferrer"
      >
        GitHub ( github.com/jyarger/PsiNMR )
      </a>
    </InfoBlock>
    <InfoBlock>
      <Separator />
    </InfoBlock>
    <span className="tagline">
      PsiNMR (ΨNMR) is part of the Psi scientific-data platform: process,
      analyze and visualize NMR data directly in your browser.
    </span>
    <InfoBlock>
      <Separator />
    </InfoBlock>
    <div className="content">
      <p className="credit">
        PsiNMR (MIT License) developed by Prof. Jeff Yarger (
        <a href="mailto:jyarger@proton.me">jyarger@proton.me</a>)
      </p>
      <p className="fineprint">
        development started with open source code from{' '}
        <a
          href="https://github.com/cheminfo/nmrium"
          target="_blank"
          rel="noreferrer"
        >
          NMRium
        </a>{' '}
        (MIT license), developed by Zakodium Sàrl (Switzerland), the University
        of Cologne (Germany), Johannes Gutenberg University Mainz (Germany),
        Universidad del Valle (Colombia) and Zakodium Sàrl (Switzerland).
      </p>
    </div>
  </FallbackDialogContents>
);

function AboutUsModal() {
  const [isOpenDialog, openDialog, closeDialog] = useOnOff(false);

  return (
    <>
      <Toolbar.Item
        onClick={openDialog}
        id="logo"
        tooltip="About PsiNMR"
        icon={
          <span style={{ fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
            Ψ
          </span>
        }
      />
      <StandardDialog
        isOpen={isOpenDialog}
        onClose={closeDialog}
        style={{
          maxWidth: 1000,
          width: '40vw',
          minWidth: '500px',
        }}
        title="About PsiNMR"
      >
        <StyledDialogBody>
          <CoreSlot
            slot="topbar.about_us.modal"
            fallback={modalContentFallback}
          />
        </StyledDialogBody>
      </StandardDialog>
    </>
  );
}

export default AboutUsModal;

function VersionInfo() {
  const { version } = versionInfo;
  if (version === 'HEAD') {
    return 'HEAD';
  } else if (version.startsWith('git-')) {
    return (
      <a
        href={`https://github.com/cheminfo/nmrium/tree/${version.slice(4)}`}
        target="_blank"
        rel="noreferrer"
      >
        git-{version.slice(4, 14)}
      </a>
    );
  } else {
    return (
      <a
        href={`https://github.com/cheminfo/nmrium/tree/${version}`}
        target="_blank"
        rel="noreferrer"
      >
        {version}
      </a>
    );
  }
}
