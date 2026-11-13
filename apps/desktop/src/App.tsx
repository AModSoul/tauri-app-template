import { Box, Grid } from "@chakra-ui/react";
import { useEffect } from "react";

import { AppHeader } from "@/components/AppHeader";
import { ListInput } from "@/components/ListInput";
import { RunTable } from "@/components/RunTable";
import { loadSettings } from "@/store";

export function App() {
  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <Grid templateRows="auto 1fr" h="100dvh">
      <AppHeader />
      <Grid
        as="main"
        templateColumns={{ base: "1fr", md: "minmax(18rem, 2fr) 3fr" }}
        gap="6"
        p="6"
        minH="0"
      >
        <Box minH="0">
          <ListInput />
        </Box>
        <Box minH="0">
          <RunTable />
        </Box>
      </Grid>
    </Grid>
  );
}
