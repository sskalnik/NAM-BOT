# Settings System

The Settings page manages global configuration for NAM-BOT, including backend paths, default metadata, and general application behavior.

## Auto-save Behavior

Settings in NAM-BOT are **automatically saved** as you type. There is no manual "Save" button.

- A short debounce (approx. 1 second) is applied to prevent constant disk writes while typing.
- Backend configuration changes (like Conda or Python paths) are saved immediately, but **validation** of these paths must be triggered manually using the "Validate Backend" button.

## Configuration Categories

### Backend Configuration

- **Conda Executable Path**: Path to `conda.exe` or `mamba.exe`.
- **Backend Mode**: Choose between using a named Conda environment, a prefix path, or a direct Python executable.
- **Environment/Python Path**: Specific identifiers for your NAM environment.

### User Information

- **Default Author Name**: Auto-filled into the "Modeled By" field when creating new Jobs or "Created By" when creating new Presets.
- **Default Author URL**: Auto-filled into the "Website / Profile" field for new Presets.

### Output Configuration

- **Default Output Root**: Where trained NAM models are saved by default.
- **Workspace Root**: Where temporary training files and logs are stored.

### Application Settings

- **Automatically open results folder**: Triggers a file explorer window once training completes.
- **Persist queue on exit**: Saves the current job queue to disk so it can be restored on next launch.
- **Log Retention**: How many days to keep training logs before cleanup.
