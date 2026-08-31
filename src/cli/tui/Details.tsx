import React from "react";
import { Box, Text, useInput } from "ink";
import type { ProfileState } from "../../aws/profileState.js";
import { formatClock, formatTimeLeft } from "../../aws/duration.js";
import { Key, KeyBar } from "../components/KeyHint.js";
import { Link } from "../components/Link.js";
import { useContentWidth } from "../components/App.js";
import { useNow } from "../hooks/useNow.js";

interface Props {
  profile: ProfileState;
  roleName?: string;
  region?: string;
  startUrl?: string;
  onBack: () => void;
  onRefresh: (name: string) => void;
  onCopyExport: (name: string) => void;
  onCopyName: (name: string) => void;
  onOpenConsole: (name: string) => void;
  onToggleAuto: (name: string) => void;
}

const LABEL_WIDTH = 12;

const STATUS_COLOR: Record<ProfileState["status"], string> = {
  valid: "green",
  refreshing: "cyan",
  expired: "yellow",
  "needs-login": "yellow",
  error: "red",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Box width={LABEL_WIDTH} flexShrink={0}>
        <Text dimColor>{label}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text>{children}</Text>
      </Box>
    </Box>
  );
}

export function Details({
  profile,
  roleName,
  region,
  startUrl,
  onBack,
  onRefresh,
  onCopyExport,
  onCopyName,
  onOpenConsole,
  onToggleAuto,
}: Props) {
  const now = useNow(1000);
  const width = useContentWidth();

  useInput((input, key) => {
    if (key.escape || key.leftArrow || input === "q") onBack();
    else if (input === "r") onRefresh(profile.name);
    else if (input === "c") onCopyExport(profile.name);
    else if (input === "y") onCopyName(profile.name);
    else if (input === "o") onOpenConsole(profile.name);
    else if (input === "a") onToggleAuto(profile.name);
  });

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="gray" paddingX={1} width={width} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {profile.name}
          </Text>
          {profile.favorite && <Text color="cyan">{"  ⟳ auto-refresh"}</Text>}
        </Box>

        <Row label="status">
          <Text color={STATUS_COLOR[profile.status]}>{profile.status}</Text>
        </Row>
        <Row label="creds">
          {/* Was a raw ISO timestamp; now the answer people actually want first. */}
          {profile.expiresAt ? (
            <Text>
              {formatTimeLeft(profile.expiresAt, now)}
              <Text dimColor>{`  (${formatClock(profile.expiresAt)})`}</Text>
            </Text>
          ) : (
            <Text dimColor>—</Text>
          )}
        </Row>
        <Row label="sso login">
          {/* Distinct from the row above: role credentials last about an hour,
              the SSO token many hours — this is when a browser login is due. */}
          {profile.ssoExpiresAt ? (
            <Text>
              {formatTimeLeft(profile.ssoExpiresAt, now)}
              <Text dimColor>{`  (${formatClock(profile.ssoExpiresAt)})`}</Text>
            </Text>
          ) : (
            <Text color="yellow">required</Text>
          )}
        </Row>
        <Row label="account">{profile.accountId ?? <Text dimColor>—</Text>}</Row>
        <Row label="role">{roleName ?? <Text dimColor>—</Text>}</Row>
        <Row label="region">{region ?? <Text dimColor>—</Text>}</Row>
        <Row label="sso url">
          {startUrl ? <Link url={startUrl} /> : <Text dimColor>—</Text>}
        </Row>
        {profile.error && (
          <Box marginTop={1}>
            <Text color="red">{`✗ ${profile.error}`}</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <KeyBar>
        <Key k="r">refresh</Key>
        <Key k="c">copy env</Key>
        <Key k="y">name</Key>
        <Key k="o">console</Key>
        <Key k="a">⟳ auto</Key>
        <Key k="Esc">back</Key>
        </KeyBar>
      </Box>
    </Box>
  );
}
