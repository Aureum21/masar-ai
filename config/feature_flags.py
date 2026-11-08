"""Future backend gates. Disabled unless explicitly enabled in the process.

Phase 0 does not wire these into existing routes or change current behaviour.
Never use frontend flags as a substitute for these gates or authorisation.
"""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class FeatureFlags:
    structured_planning: bool = False
    rewards: bool = False


def get_feature_flags() -> FeatureFlags:
    return FeatureFlags(
        structured_planning=os.getenv("MASAR_STRUCTURED_PLANNING") == "true",
        rewards=os.getenv("MASAR_REWARDS") == "true",
    )
