import React from "react";
import { Box, Text } from "ink";
import type { DeviceAuthInfo, SSOProfile } from "../../aws/sso.js";
import { formatCountdown } from "../../aws/duration.js";
import { Key, KeyBar } from "../components/KeyHint.js";
import { Link } from "../components/Link.js";
import { Spinner } from "../components/Spinner.js";
import { StatusMessage } from "../components/StatusMessage.js";
import { useContentWidth } from "../components/App.js";
import { useNow } from "../hooks/useNow.js";

export interface LoginPromptProps {
  profile: SSOProfile;
  deviceAuth: DeviceAuthInfo | null;
  authError?: string | null;
  copied?: boolean;
  copyFailed?: boolean;
  authorizing?: boolean;
}

function Frame({ profile, children }: { profile: SSOProfile; children: React.ReactNode }) {
  const width = useContentWidth();
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="yellow">⚠ SSO login required</Text>
        <Text dimColor>{"  —  "}</Text>
        <Text bold>{profile.name}</Text>
      </Box>
      <Box borderStyle="round" borderColor="yellow" paddingX={1} width={width} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}

export function LoginPrompt({
  profile,
  deviceAuth,
  authError = null,
  copied = false,
  copyFailed = false,
  authorizing = false,
}: LoginPromptProps) {
  const now = useNow(1000);

  if (authError) {
    return (
      <>
        <Frame profile={profile}>
          <StatusMessage type="error">{authError}</StatusMessage>
          <Text dimColor>Check your network connection and the sso_start_url in ~/.aws/config.</Text>
        </Frame>
        <Box marginTop={1}>
          <KeyBar>
            <Key k="Esc">back</Key>
          </KeyBar>
        </Box>
      </>
    );
  }

  if (!deviceAuth) {
    return (
      <>
        <Frame profile={profile}>
          <Spinner label="Requesting a device code…" />
        </Frame>
        <Box marginTop={1}>
          <KeyBar>
            <Key k="Esc">cancel</Key>
          </KeyBar>
        </Box>
      </>
    );
  }

  const expired = deviceAuth.expiresAt.getTime() <= now;

  return (
    <>
      <Frame profile={profile}>
        {/* The code comes first: it is the thing to check against the browser,
            and it is short enough to never wrap. */}
        <Box>
          <Box width={7} flexShrink={0}>
            <Text dimColor>code</Text>
          </Box>
          <Text bold color="magenta">
            {deviceAuth.userCode}
          </Text>
        </Box>

        {/* The URL gets a whole line to itself and is emitted as an OSC 8
            hyperlink, so it stays one clickable target even when it wraps —
            previously a wrapped URL opened only its first fragment. */}
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>url</Text>
          <Link url={deviceAuth.verificationUri} />
        </Box>

        <Box marginTop={1} flexDirection="column">
          {expired ? (
            <Text color="red">✗ This code has expired — press Esc and try again.</Text>
          ) : authorizing ? (
            <>
              <Spinner label="Waiting for browser authorization…" />
              {/* Its own line: side by side, this wrapped mid-word on narrow terminals. */}
              <Text dimColor>{`  code expires in ${formatCountdown(deviceAuth.expiresAt, now)}`}</Text>
            </>
          ) : (
            <Text dimColor>Approve the request in your browser to continue.</Text>
          )}
        </Box>
      </Frame>

      <Box marginTop={1}>
        <KeyBar>
          <Key k="⏎">open browser</Key>
          <Key k="c">copy URL</Key>
          <Key k="Esc">cancel</Key>
          {copied && <Text color="green">✓ copied</Text>}
          {copyFailed && <Text color="red">✗ no clipboard available</Text>}
        </KeyBar>
      </Box>
    </>
  );
}
