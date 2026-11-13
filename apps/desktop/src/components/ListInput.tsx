import { Button, HStack, Stack, Text, Textarea } from "@chakra-ui/react";
import { LuPlay, LuSquare } from "react-icons/lu";

import { Field } from "@my-app/ui/field";
import { cancelRun, isRunning, startRun, useInput, useRun, useSettings } from "@/store";

/** What the run works through: one name a line, and the buttons that start and cancel it. */
export function ListInput() {
  const text = useInput((state) => state.text);
  const running = useRun(isRunning);
  const loaded = useSettings((state) => state.settings !== null);
  const lines = text.split(/\r?\n/u).filter((line) => line.trim() !== "").length;

  return (
    <Stack gap="3" h="full">
      <Field label="Names" helperText="One a line. Each becomes a safe file name." flex="1">
        <Textarea
          flex="1"
          resize="none"
          fontFamily="mono"
          placeholder={"Quarterly Report: Q3 / Final\nMeeting notes 12/11"}
          value={text}
          onChange={(event) => useInput.setState({ text: event.target.value })}
        />
      </Field>
      <HStack justify="space-between">
        <Text textStyle="sm" color="fg.muted">
          {lines} {lines === 1 ? "line" : "lines"}
        </Text>
        {running ? (
          <Button variant="outline" onClick={() => void cancelRun()}>
            <LuSquare /> Cancel
          </Button>
        ) : (
          <Button disabled={!loaded || lines === 0} onClick={() => void startRun()}>
            <LuPlay /> Make names
          </Button>
        )}
      </HStack>
    </Stack>
  );
}
