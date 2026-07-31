"""Tripo3D integration: text-to-3D and image-to-3D generation.

Wraps the official `tripo3d` SDK (https://github.com/VAST-AI-Research/tripo-python-sdk).
"""

import os
from pathlib import Path
from typing import Optional

from tripo3d import TaskStatus, TripoClient


class TripoError(RuntimeError):
    """Raised when a Tripo3D API key is missing or a generation task fails."""


def _require_api_key(api_key: Optional[str]) -> str:
    key = api_key or os.environ.get("TRIPO_API_KEY")
    if not key:
        raise TripoError(
            "TRIPO_API_KEY is not set. Add it to a .env file or export it in your shell."
        )
    return key


async def generate_from_text(
    prompt: str,
    output_dir: str = "./output",
    negative_prompt: Optional[str] = None,
    api_key: Optional[str] = None,
) -> dict[str, Optional[str]]:
    """Generate a 3D model from a text prompt and download the result files."""
    key = _require_api_key(api_key)

    async with TripoClient(api_key=key) as client:
        task_id = await client.text_to_model(prompt=prompt, negative_prompt=negative_prompt)
        task = await client.wait_for_task(task_id, verbose=True)

        if task.status != TaskStatus.SUCCESS:
            raise TripoError(f"Tripo task {task_id} did not succeed: {task.status}")

        Path(output_dir).mkdir(parents=True, exist_ok=True)
        return await client.download_task_models(task, output_dir)


async def generate_from_image(
    image_path: str,
    output_dir: str = "./output",
    api_key: Optional[str] = None,
) -> dict[str, Optional[str]]:
    """Generate a 3D model from an image file and download the result files."""
    key = _require_api_key(api_key)

    async with TripoClient(api_key=key) as client:
        task_id = await client.image_to_model(image=image_path)
        task = await client.wait_for_task(task_id, verbose=True)

        if task.status != TaskStatus.SUCCESS:
            raise TripoError(f"Tripo task {task_id} did not succeed: {task.status}")

        Path(output_dir).mkdir(parents=True, exist_ok=True)
        return await client.download_task_models(task, output_dir)
