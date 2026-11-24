import glob
import re
from pathlib import Path

REQUIRED_TESTIDS = [
    "chat-input",
    "send-button",
    "assistant-message",
    "meta-source",
    "meta-model",
    "meta-latency",
    "meta-input-tokens",
    "meta-output-tokens",
    "system-prompt-input"
]

def test_frontend_data_testids():
    """Verify that all required data-testid attributes exist in frontend source."""
    found = set()
    project_root = Path(__file__).resolve().parents[2]
    jsx_files = glob.glob(str(project_root / "frontend" / "src" / "**" / "*.jsx"), recursive=True)
    assert len(jsx_files) > 0, "No frontend JSX files found"

    for file_path in jsx_files:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            for tid in REQUIRED_TESTIDS:
                if f'data-testid="{tid}"' in content or f"data-testid='{tid}'" in content:
                    found.add(tid)

    missing = set(REQUIRED_TESTIDS) - found
    assert not missing, f"Missing required data-testids in frontend: {missing}"
    assert len(found) == len(REQUIRED_TESTIDS)
