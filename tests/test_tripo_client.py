import os
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, MagicMock, patch

from tripo3d import TaskStatus

from integrations.tripo.client import TripoError, generate_from_text


class TripoClientTests(IsolatedAsyncioTestCase):
    async def test_generate_from_text_requires_api_key(self):
        os.environ.pop("TRIPO_API_KEY", None)
        with self.assertRaises(TripoError):
            await generate_from_text("a cute cat", api_key=None)

    @patch("integrations.tripo.client.TripoClient")
    async def test_generate_from_text_success(self, mock_client_cls):
        mock_task = MagicMock(status=TaskStatus.SUCCESS)
        mock_client = AsyncMock()
        mock_client.text_to_model.return_value = "task-123"
        mock_client.wait_for_task.return_value = mock_task
        mock_client.download_task_models.return_value = {"model": "/tmp/model.glb"}
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        result = await generate_from_text("a cute cat", output_dir="/tmp/out", api_key="tsk_test")

        mock_client.text_to_model.assert_awaited_once_with(prompt="a cute cat", negative_prompt=None)
        mock_client.wait_for_task.assert_awaited_once_with("task-123", verbose=True)
        self.assertEqual(result, {"model": "/tmp/model.glb"})

    @patch("integrations.tripo.client.TripoClient")
    async def test_generate_from_text_raises_on_failed_task(self, mock_client_cls):
        mock_task = MagicMock(status=TaskStatus.FAILED)
        mock_client = AsyncMock()
        mock_client.text_to_model.return_value = "task-123"
        mock_client.wait_for_task.return_value = mock_task
        mock_client_cls.return_value.__aenter__.return_value = mock_client

        with self.assertRaises(TripoError):
            await generate_from_text("a cute cat", api_key="tsk_test")
