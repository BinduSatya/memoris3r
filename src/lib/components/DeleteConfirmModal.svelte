<script lang="ts">
  import { Modal, Button } from 'flowbite-svelte';
  import { ExclamationCircleOutline, FolderSolid } from 'flowbite-svelte-icons';
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    open = $bindable(false),
    keys,
    bucket,
    onconfirm,
  }: {
    open: boolean;
    keys: string[];
    bucket: string;
    onconfirm: () => void;
  } = $props();

  let loading = $state(false);

  // S3 has no real folders — a "folder" is just a key ending in "/".
  const isFolderKey = (key: string) => key.endsWith('/');
  const folderCount = $derived(keys.filter(isFolderKey).length);
  const hasFolder = $derived(folderCount > 0);
  const isSingleFolder = $derived(keys.length === 1 && folderCount === 1);

  /** Last path segment of a folder prefix, without surrounding slashes. */
  function folderName(key: string): string {
    const trimmed = key.replace(/\/+$/, '');
    const segments = trimmed.split('/');
    return segments[segments.length - 1] || trimmed;
  }

  const title = $derived(
    isSingleFolder
      ? `Delete folder "${folderName(keys[0])}"?`
      : `Delete ${keys.length} item${keys.length !== 1 ? 's' : ''}?`
  );

  async function handleDelete() {
    loading = true;
    try {
      const res = await fetch('/api/s3/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, keys }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      // Use the server-reported count — for folders this reflects every object
      // removed, not just the number of selected items.
      const count = typeof data.deleted === 'number' ? data.deleted : keys.length;
      addToast(`${count} item${count !== 1 ? 's' : ''} deleted successfully`, 'success');
      open = false;
      onconfirm();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      loading = false;
    }
  }
</script>

<Modal bind:open size="sm" title="Confirm Delete">
  <div class="text-center">
    <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
      <ExclamationCircleOutline class="h-8 w-8 text-red-500 dark:text-red-400" />
    </div>
    <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
      {title}
    </h3>
    {#if hasFolder}
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {isSingleFolder ? 'This folder' : 'Folders'} and <strong>everything inside</strong>
        will be permanently deleted. This action cannot be undone.
      </p>
    {:else}
      <p class="text-sm text-gray-500 dark:text-gray-400">
        This action cannot be undone.
      </p>
    {/if}
    {#if keys.length <= 5}
      <ul class="mt-3 space-y-1 text-left text-sm text-gray-600 dark:text-gray-400">
        {#each keys as key}
          <li class="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 dark:bg-gray-700/50">
            {#if isFolderKey(key)}
              <FolderSolid class="h-4 w-4 flex-shrink-0 text-amber-400" />
            {/if}
            <span class="truncate">{isFolderKey(key) ? key : `• ${key}`}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Including: {keys[0]}, {keys[1]}, and {keys.length - 2} more...
      </p>
    {/if}
  </div>

  {#snippet footer()}
    <div class="flex w-full justify-center gap-3">
      <Button color="alternative" onclick={() => { open = false; }}>Cancel</Button>
      <Button color="red" onclick={handleDelete} disabled={loading}>
        {loading ? 'Deleting...' : 'Delete'}
      </Button>
    </div>
  {/snippet}
</Modal>
