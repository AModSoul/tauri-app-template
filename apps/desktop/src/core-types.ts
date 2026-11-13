// The core's types, as the front end uses them. They come from the Rust core through ts-rs:
// regenerate them with `pnpm bindings`. Components import the core's types from here and its
// calls from `api.ts`, so these two files are the only ones that know where the core runs.

export type { JobInfo } from "@/bindings/JobInfo";
export type { JobStatus } from "@/bindings/JobStatus";
export type { NameCase } from "@/bindings/NameCase";
export type { RunEvent } from "@/bindings/RunEvent";
export type { RunSummary } from "@/bindings/RunSummary";
export type { Settings } from "@/bindings/Settings";
export type { Spaces } from "@/bindings/Spaces";
