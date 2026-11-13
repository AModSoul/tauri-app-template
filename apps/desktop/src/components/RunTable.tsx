import { Badge, Code, HStack, Stack, Table, Text } from "@chakra-ui/react";
import { LuListChecks } from "react-icons/lu";

import { EmptyState } from "@my-app/ui/empty-state";
import { ProgressBar, ProgressLabel, ProgressRoot, ProgressValueText } from "@my-app/ui/progress";
import { ScrollArea } from "@my-app/ui/scroll-area";
import { type Job, useRun } from "@/store";

/** The run's jobs and how each went, with the run's progress above them. */
export function RunTable() {
  const { jobs, starting, summary } = useRun();

  if (jobs.length === 0) {
    return (
      <EmptyState
        h="full"
        icon={<LuListChecks />}
        title={starting ? "Starting…" : "Nothing yet"}
        description="Type some names and press Make names. Each line's file name shows here."
      />
    );
  }

  const finished = jobs.filter(
    (job) => job.status.state === "done" || job.status.state === "failed",
  ).length;
  return (
    <Stack gap="3" h="full" minH="0">
      <ProgressRoot
        value={finished}
        max={jobs.length}
        size="sm"
        colorPalette={summary?.failed ? "orange" : undefined}
      >
        <HStack justify="space-between" mb="1">
          <ProgressLabel>
            {summary ? (summary.cancelled ? "Cancelled" : "Finished") : "Making names…"}
          </ProgressLabel>
          <ProgressValueText>
            {finished} of {jobs.length}
          </ProgressValueText>
        </HStack>
        <ProgressBar />
      </ProgressRoot>
      <ScrollArea flex="1" minH="0">
        <Table.Root size="sm" stickyHeader>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader w="12">#</Table.ColumnHeader>
              <Table.ColumnHeader>Line</Table.ColumnHeader>
              <Table.ColumnHeader>File name</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {jobs.map((job) => (
              <Table.Row key={job.id}>
                <Table.Cell color="fg.muted">{job.id}</Table.Cell>
                <Table.Cell>{job.line}</Table.Cell>
                <Table.Cell>
                  <Outcome job={job} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </ScrollArea>
    </Stack>
  );
}

function Outcome({ job: { status } }: { job: Job }) {
  switch (status.state) {
    case "queued":
      return <Badge variant="outline">Queued</Badge>;
    case "running":
      return <Badge colorPalette="blue">Working…</Badge>;
    case "done":
      return <Code>{status.name}</Code>;
    case "failed":
      return (
        <Text textStyle="sm" color="fg.error">
          {status.error}
        </Text>
      );
  }
}
