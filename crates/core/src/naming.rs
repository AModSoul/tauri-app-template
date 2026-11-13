//! File names: a line of text made safe as one path component on Windows, macOS and Linux, and
//! styled as the user's settings say. The example run is built on it; keep [`sanitize`] for
//! every file name the app ever writes, whatever replaces the example.

use crate::settings::{NameCase, Settings, Spaces};

/// `line` as a file name (without an extension), styled by `settings`; `None` when nothing
/// usable is left of it.
pub fn file_name(line: &str, settings: &Settings) -> Option<String> {
    let name = sanitize(line);
    let name = match settings.case {
        NameCase::Keep => name,
        NameCase::Lower => name.to_lowercase(),
        NameCase::Upper => name.to_uppercase(),
    };
    let name = match spacer(settings.spaces) {
        Some(spacer) => name.replace(' ', spacer),
        None => name,
    };
    let max = settings.max_length.max(1) as usize;
    let mut name: String = name.chars().take(max).collect();
    while name.ends_with(['.', ' ', '-', '_']) {
        name.pop();
    }
    if name.is_empty() {
        return None;
    }
    if is_reserved(&name) {
        name.insert(0, '_');
    }
    Some(name)
}

/// `name` numbered as the `n`th of its name (`n` ≥ 2), in the settings' style.
pub fn numbered(name: &str, n: u32, settings: &Settings) -> String {
    match spacer(settings.spaces) {
        Some(spacer) => format!("{name}{spacer}{n}"),
        None => format!("{name} ({n})"),
    }
}

/// What a space becomes, or `None` to keep it.
fn spacer(spaces: Spaces) -> Option<&'static str> {
    match spaces {
        Spaces::Keep => None,
        Spaces::Dash => Some("-"),
        Spaces::Underscore => Some("_"),
    }
}

/// A string made safe as one path component on Windows, macOS and Linux: no characters any of
/// them refuses, no control characters, single spaces, and no trailing dots or spaces (Windows
/// drops them). May be empty.
pub fn sanitize(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    let mut space = false;
    for c in name.chars() {
        if matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') || c.is_control() {
            continue;
        }
        if c.is_whitespace() {
            space = !out.is_empty();
            continue;
        }
        if space {
            out.push(' ');
            space = false;
        }
        out.push(c);
    }
    while out.ends_with(['.', ' ']) {
        out.pop();
    }
    out
}

/// Names Windows won't create a file as, with any extension.
fn is_reserved(name: &str) -> bool {
    let base = name.split('.').next().unwrap_or_default().to_ascii_uppercase();
    matches!(base.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (base.len() == 4
            && (base.starts_with("COM") || base.starts_with("LPT"))
            && base.as_bytes()[3].is_ascii_digit()
            && base.as_bytes()[3] != b'0')
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings(case: NameCase, spaces: Spaces, max_length: u32) -> Settings {
        Settings {
            case,
            spaces,
            max_length,
            ..Settings::default()
        }
    }

    #[test]
    fn sanitizes() {
        assert_eq!(sanitize("Fire / Ice"), "Fire Ice");
        assert_eq!(sanitize(r#"Say "hello""#), "Say hello");
        assert_eq!(sanitize("  a \t b  "), "a b");
        assert_eq!(sanitize("notes..."), "notes");
        assert_eq!(sanitize("?*<>"), "");
    }

    #[test]
    fn styles_a_name() {
        let line = "  Quarterly Report: Q3 / Final ";
        let keep = Settings::default();
        assert_eq!(file_name(line, &keep).as_deref(), Some("Quarterly Report Q3 Final"));
        let kebab = settings(NameCase::Lower, Spaces::Dash, 80);
        assert_eq!(file_name(line, &kebab).as_deref(), Some("quarterly-report-q3-final"));
        let shout = settings(NameCase::Upper, Spaces::Underscore, 80);
        assert_eq!(file_name(line, &shout).as_deref(), Some("QUARTERLY_REPORT_Q3_FINAL"));
    }

    #[test]
    fn shortens_without_leaving_a_separator_at_the_end() {
        let kebab = settings(NameCase::Lower, Spaces::Dash, 10);
        assert_eq!(file_name("Quarterly report", &kebab).as_deref(), Some("quarterly"));
    }

    #[test]
    fn refuses_what_leaves_nothing_and_guards_reserved_names() {
        assert_eq!(file_name("???", &Settings::default()), None);
        assert_eq!(file_name("con", &Settings::default()).as_deref(), Some("_con"));
        assert_eq!(
            file_name("COM1.txt", &Settings::default()).as_deref(),
            Some("_COM1.txt")
        );
        assert_eq!(file_name("Compass", &Settings::default()).as_deref(), Some("Compass"));
    }

    #[test]
    fn numbers_in_the_settings_style() {
        assert_eq!(numbered("Report", 2, &Settings::default()), "Report (2)");
        let kebab = settings(NameCase::Lower, Spaces::Dash, 80);
        assert_eq!(numbered("report", 3, &kebab), "report-3");
    }
}
