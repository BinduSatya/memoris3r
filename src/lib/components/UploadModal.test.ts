// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/svelte';
import UploadModal from './UploadModal.svelte';

describe('UploadModal', () => {
	it('opens the native file picker when the upload area is clicked', async () => {
		const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});

		render(UploadModal, {
			props: {
				open: true,
				bucket: 'demo-bucket',
				prefix: 'folder/',
				onsubmit: vi.fn(),
			},
		});

		await fireEvent.click(screen.getByText('Click to upload'));

		expect(clickSpy).toHaveBeenCalled();
		clickSpy.mockRestore();
	});
});
