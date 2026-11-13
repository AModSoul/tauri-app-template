//! A run: the user's input worked through job by job, its progress reported as [`RunEvent`]s.
//!
//! The example names files: each line of the input is a job, which turns into a file name
//! ([`naming::file_name`]). Replace the job's work with the app's own and keep the shape: plan
//! the jobs, report each one's status as it changes, stop between jobs when cancelled, and
//! always end with [`RunEvent::Finished`].

use std::{collections::HashMap, time::Duration};

use serde::Serialize;
use tokio_util::sync::CancellationToken;
use ts_rs::TS;

use crate::{naming, settings::Settings};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
#[ts(export)]
pub enum RunEvent {
    /// The jobs the run will work through, all queued.
    Planned { jobs: Vec<JobInfo> },
    /// A job's status changed.
    Job { id: u32, status: JobStatus },
    /// The run is over, cancelled or not. Always the last event.
    Finished { summary: RunSummary },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct JobInfo {
    pub id: u32,
    /// The line of input the job is for.
    pub line: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[serde(tag = "state", rename_all = "camelCase")]
#[ts(export)]
pub enum JobStatus {
    Running,
    Done { name: String },
    Failed { error: String },
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub struct RunSummary {
    pub done: u32,
    pub failed: u32,
    /// Stopped before every job was done.
    pub cancelled: bool,
}

/// Works through `lines`, one job each, skipping blank ones. `pace` is how long each job takes:
/// the example's work is instant, so the desktop app slows it down to show its progress. Real
/// work doesn't need it; drop it then.
pub async fn run(
    lines: &[String],
    settings: &Settings,
    pace: Duration,
    cancel: &CancellationToken,
    emit: &impl Fn(RunEvent),
) -> RunSummary {
    let jobs: Vec<JobInfo> = lines
        .iter()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .zip(1..)
        .map(|(line, id)| JobInfo {
            id,
            line: line.to_owned(),
        })
        .collect();
    emit(RunEvent::Planned { jobs: jobs.clone() });

    let mut summary = RunSummary::default();
    // How many times each name (in lower case, as Windows and macOS compare them) was given.
    let mut given: HashMap<String, u32> = HashMap::new();
    for job in &jobs {
        if cancel.is_cancelled() {
            summary.cancelled = true;
            break;
        }
        emit(RunEvent::Job {
            id: job.id,
            status: JobStatus::Running,
        });
        tokio::select! {
            () = tokio::time::sleep(pace) => {}
            () = cancel.cancelled() => {}
        }
        let status = match naming::file_name(&job.line, settings) {
            None => JobStatus::Failed {
                error: "Nothing is left of it to name a file by".into(),
            },
            Some(name) => {
                let times = given.entry(name.to_lowercase()).or_default();
                *times += 1;
                match *times {
                    1 => JobStatus::Done { name },
                    n if settings.number_duplicates => JobStatus::Done {
                        name: naming::numbered(&name, n, settings),
                    },
                    _ => JobStatus::Failed {
                        error: format!("{name} is already taken"),
                    },
                }
            }
        };
        match status {
            JobStatus::Failed { .. } => summary.failed += 1,
            _ => summary.done += 1,
        }
        emit(RunEvent::Job { id: job.id, status });
    }
    emit(RunEvent::Finished {
        summary: summary.clone(),
    });
    summary
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;

    async fn events_of(lines: &[&str], settings: &Settings, cancel: &CancellationToken) -> Vec<RunEvent> {
        let events = Mutex::new(Vec::new());
        let lines: Vec<String> = lines.iter().map(|line| line.to_string()).collect();
        run(&lines, settings, Duration::ZERO, cancel, &|event| {
            events.lock().unwrap().push(event)
        })
        .await;
        events.into_inner().unwrap()
    }

    fn done(id: u32, name: &str) -> RunEvent {
        RunEvent::Job {
            id,
            status: JobStatus::Done { name: name.into() },
        }
    }

    #[tokio::test]
    async fn names_each_line_and_numbers_repeats() {
        let events = events_of(
            &["Report", "", "  report ", "???"],
            &Settings::default(),
            &CancellationToken::new(),
        )
        .await;
        let finished: Vec<_> = events
            .iter()
            .filter(|event| matches!(event, RunEvent::Job { status, .. } if *status != JobStatus::Running))
            .cloned()
            .collect();
        assert_eq!(
            finished,
            [
                done(1, "Report"),
                done(2, "report (2)"),
                RunEvent::Job {
                    id: 3,
                    status: JobStatus::Failed {
                        error: "Nothing is left of it to name a file by".into()
                    }
                },
            ]
        );
        assert_eq!(
            events.last(),
            Some(&RunEvent::Finished {
                summary: RunSummary {
                    done: 2,
                    failed: 1,
                    cancelled: false
                }
            })
        );
    }

    #[tokio::test]
    async fn reports_a_repeat_when_told_not_to_number_it() {
        let settings = Settings {
            number_duplicates: false,
            ..Settings::default()
        };
        let events = events_of(&["Report", "Report"], &settings, &CancellationToken::new()).await;
        assert!(events.contains(&RunEvent::Job {
            id: 2,
            status: JobStatus::Failed {
                error: "Report is already taken".into()
            }
        }));
    }

    #[tokio::test]
    async fn a_cancelled_run_plans_its_jobs_and_finishes_without_doing_them() {
        let cancel = CancellationToken::new();
        cancel.cancel();
        let events = events_of(&["a", "b"], &Settings::default(), &cancel).await;
        assert!(matches!(&events[0], RunEvent::Planned { jobs } if jobs.len() == 2));
        assert_eq!(
            events[1..],
            [RunEvent::Finished {
                summary: RunSummary {
                    done: 0,
                    failed: 0,
                    cancelled: true
                }
            }]
        );
    }
}
