from __future__ import annotations

import json
from pathlib import Path

import pytest

from situ.harness.cli import commands as cli


@pytest.fixture(autouse=True)
def isolated_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("HOME", str(home))
    return home


def test_compute_add_cuda_visible_devices_sets_target_metadata(
    capsys: pytest.CaptureFixture[str],
) -> None:
    code = cli.main(
        [
            "compute",
            "add",
            "--pool",
            "local",
            "--label",
            "gpu0",
            "--cuda-visible-devices",
            "0",
            "--json",
        ]
    )

    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert code == 0
    assert captured.err == ""
    assert payload["pool"] == "local"
    assert payload["label"] == "gpu0"
    assert payload["metadata"] == {"cuda_visible_devices": "0"}


def test_compute_list_human_output_shows_cuda_placement(
    capsys: pytest.CaptureFixture[str],
) -> None:
    pinned_code = cli.main(
        [
            "compute",
            "add",
            "--pool",
            "local",
            "--label",
            "gpu0",
            "--cuda-visible-devices",
            "0",
        ]
    )
    capsys.readouterr()

    unpinned_code = cli.main(
        [
            "compute",
            "add",
            "--pool",
            "local",
            "--label",
            "Local",
        ]
    )
    capsys.readouterr()

    list_code = cli.main(["compute", "list"])
    captured = capsys.readouterr()

    assert pinned_code == 0
    assert unpinned_code == 0
    assert list_code == 0
    assert "label=gpu0 cuda=0" in captured.out
    assert "label=Local cuda=-" in captured.out
