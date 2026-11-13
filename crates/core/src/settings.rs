//! The user's settings, kept as JSON in the app's config folder. The desktop app and the command
//! line tool read the same file.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{Result, APP_ID};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(default, rename_all = "camelCase")]
#[ts(export)]
pub struct Settings {
    /// The case a name is put in.
    pub case: NameCase,
    /// What the spaces in a name become.
    pub spaces: Spaces,
    /// The longest name kept, in characters.
    pub max_length: u32,
    /// Number a name that's already been given (`Report (2)`), rather than reporting it.
    pub number_duplicates: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum NameCase {
    Keep,
    Lower,
    Upper,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export)]
pub enum Spaces {
    Keep,
    Dash,
    Underscore,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            case: NameCase::Keep,
            spaces: Spaces::Keep,
            max_length: 80,
            number_duplicates: true,
        }
    }
}

impl Settings {
    /// Reads settings from `path`, or the defaults if there is no file yet. Settings missing
    /// from the file take their defaults.
    pub fn load(path: &Path) -> Result<Self> {
        match std::fs::read_to_string(path) {
            Ok(json) => Ok(serde_json::from_str(&json)?),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(Self::default()),
            Err(error) => Err(error.into()),
        }
    }

    /// Writes settings to `path`, through a temporary file so a crash can't leave half a file
    /// behind.
    pub fn save(&self, path: &Path) -> Result<()> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let temp = path.with_extension("json.tmp");
        std::fs::write(&temp, serde_json::to_string_pretty(self)?)?;
        std::fs::rename(&temp, path)?;
        Ok(())
    }
}

/// Where the settings file lives: `<config dir>/<APP_ID>/settings.json`, which is also the
/// desktop app's config folder.
pub fn default_settings_path() -> Option<PathBuf> {
    dirs::config_dir().map(|dir| dir.join(APP_ID).join("settings.json"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_and_fills_in_missing_settings() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("settings.json");
        assert_eq!(Settings::load(&path).unwrap(), Settings::default());

        let settings = Settings {
            case: NameCase::Lower,
            spaces: Spaces::Dash,
            ..Settings::default()
        };
        settings.save(&path).unwrap();
        assert_eq!(Settings::load(&path).unwrap(), settings);

        std::fs::write(&path, r#"{ "maxLength": 20 }"#).unwrap();
        let loaded = Settings::load(&path).unwrap();
        assert_eq!(loaded.max_length, 20);
        assert_eq!(loaded.case, NameCase::Keep);
        assert!(loaded.number_duplicates);
    }
}
