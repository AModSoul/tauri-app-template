import type { Preview } from "@storybook/react-vite";

import { basePreview, resetUi } from "@my-app/ui/storybook";

const preview: Preview = {
  ...basePreview,
  beforeEach: () => {
    resetUi();
  },
};

export default preview;
