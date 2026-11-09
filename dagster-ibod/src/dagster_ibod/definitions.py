# definitions.py

from pathlib import Path

from dagster import definitions, load_from_defs_folder

# from .config import *
# from .utils import *


@definitions
def defs():
    return load_from_defs_folder(path_within_project=Path(__file__).parent)
