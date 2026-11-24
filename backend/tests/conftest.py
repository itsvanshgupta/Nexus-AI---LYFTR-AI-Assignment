"""Test process defaults that must be set before LiteLLM is imported."""

import os


os.environ.setdefault("LITELLM_LOCAL_MODEL_COST_MAP", "true")
