import { IconButton, Input, Stack } from "@chakra-ui/react";
import { useState } from "react";
import { LuSettings } from "react-icons/lu";

import type { NameCase, Settings, Spaces } from "@/core-types";
import {
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { HEADER_BUTTON } from "@/layout";
import { updateSettings, useSettings } from "@/store";
import { findOption, type Option } from "@/utils/options";
import { Field } from "@my-app/ui/field";
import { NativeSelectField, NativeSelectRoot } from "@my-app/ui/native-select";
import { SegmentedControl } from "@my-app/ui/segmented-control";
import { SwitchField } from "@my-app/ui/switch-field";
import { Tooltip } from "@my-app/ui/tooltip";

const CASES: Option<NameCase>[] = [
  { value: "keep", label: "As typed" },
  { value: "lower", label: "lower case" },
  { value: "upper", label: "UPPER CASE" },
];

const SPACES: Option<Spaces>[] = [
  { value: "keep", label: "Keep" },
  { value: "dash", label: "Dash" },
  { value: "underscore", label: "Underscore" },
];

/** The settings button in the header, and the drawer it opens. Each change is saved at once. */
export function SettingsDrawer() {
  const settings = useSettings((state) => state.settings);

  return (
    <DrawerRoot size="sm">
      <Tooltip content="Settings">
        <DrawerTrigger asChild>
          <IconButton {...HEADER_BUTTON} aria-label="Settings" disabled={!settings}>
            <LuSettings />
          </IconButton>
        </DrawerTrigger>
      </Tooltip>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
        </DrawerHeader>
        <DrawerBody>{settings && <SettingsForm settings={settings} />}</DrawerBody>
        <DrawerCloseTrigger />
      </DrawerContent>
    </DrawerRoot>
  );
}

export function SettingsForm({ settings }: { settings: Settings }) {
  return (
    <Stack gap="6">
      <Field label="Case">
        <NativeSelectRoot>
          <NativeSelectField
            value={settings.case}
            items={CASES}
            onChange={(event) => {
              const chosen = findOption(CASES, event.target.value);
              if (chosen) void updateSettings({ case: chosen });
            }}
          />
        </NativeSelectRoot>
      </Field>
      <Field label="Spaces become">
        <SegmentedControl
          size="sm"
          value={settings.spaces}
          items={SPACES}
          onValueChange={(event) => {
            const spaces = findOption(SPACES, event.value);
            if (spaces) void updateSettings({ spaces });
          }}
        />
      </Field>
      <LongestName value={settings.maxLength} />
      <SwitchField
        label="Number repeated names"
        helperText="A name that's already been made gets a number. Off, it's reported instead."
        checked={settings.numberDuplicates}
        onCheckedChange={(event) => void updateSettings({ numberDuplicates: event.checked })}
      />
    </Stack>
  );
}

const MAX_LENGTH = 255;

/** The longest name, saved as soon as what's typed is a length; until then, what's typed is
 * kept, and said to be wrong, so the field can be cleared to type another. */
function LongestName({ value }: { value: number }) {
  const [draft, setDraft] = useState(String(value));
  const length = Number(draft);
  const valid = Number.isInteger(length) && length >= 1 && length <= MAX_LENGTH;

  return (
    <Field
      label="Longest name"
      helperText="In characters. Longer names are cut short."
      invalid={!valid}
      errorText={`A whole number from 1 to ${MAX_LENGTH}`}
    >
      <Input
        inputMode="numeric"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= 1 && next <= MAX_LENGTH && next !== value) {
            void updateSettings({ maxLength: next });
          }
        }}
      />
    </Field>
  );
}
