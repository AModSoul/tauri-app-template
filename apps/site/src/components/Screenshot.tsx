import { Box, Image } from "@chakra-ui/react";

// One copy of each screenshot, shared with the README.
import resultsDark from "../../../../docs/screenshots/results-dark.png";
import resultsLight from "../../../../docs/screenshots/results-light.png";

/** An imported image's address. Vite (Storybook, tests) gives the address itself; Astro gives an
 * object with the address and the image's size. */
const urlOf = (image: string | { src: string }) => (typeof image === "string" ? image : image.src);

/** The app after a run, in whichever colour mode the page is in. */
export function Screenshot() {
  const alt =
    "The app after a run: each line typed on the left, and the file name it became on the right";
  return (
    <Box rounded="xl" overflow="hidden" borderWidth="1px" shadow="lg">
      <Image src={urlOf(resultsLight)} alt={alt} w="full" _dark={{ display: "none" }} />
      <Image
        src={urlOf(resultsDark)}
        alt={alt}
        w="full"
        display="none"
        _dark={{ display: "block" }}
      />
    </Box>
  );
}
