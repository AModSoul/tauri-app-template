// The site's React components as its Astro pages use them. Astro renders each one on a page as a
// root of its own, so each gets the shared provider (theme, colour mode) here. Pages import from
// this file, never a component directly; stories use the components, which the Storybook preview
// wraps instead.
//
// On a page, a component is rendered to HTML when the site is built and sends no JavaScript,
// unless the page marks it `client:load` (or another `client:` directive): then it's an island,
// hydrated in the browser. Keep islands to what must run there.

import type { ComponentType } from "react";

import { Provider } from "@my-app/ui/provider";

import { Footer as FooterContent } from "@/components/Footer";
import { Header as HeaderContent } from "@/components/Header";
import { Home as HomeContent } from "@/components/Home";
import { NotFound as NotFoundContent } from "@/components/NotFound";
// site:download:start
import { Downloads as DownloadsContent } from "@/components/Downloads";
// site:download:end

/** `Component` inside the shared provider. */
function withUi<P extends object>(Component: ComponentType<P>) {
  function WithUi(props: P) {
    return (
      <Provider>
        <Component {...props} />
      </Provider>
    );
  }
  WithUi.displayName = `WithUi(${Component.displayName ?? Component.name})`;
  return WithUi;
}

/** An island on every page, for its colour mode button. */
export const Header = withUi(HeaderContent);
export const Footer = withUi(FooterContent);
export const Home = withUi(HomeContent);
export const NotFound = withUi(NotFoundContent);
// site:download:start
/** An island: it asks GitHub for the latest release. */
export const Downloads = withUi(DownloadsContent);
// site:download:end
