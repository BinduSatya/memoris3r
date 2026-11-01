<script lang="ts">
  import type { S3Object, ObjectMetadata } from '$lib/types';
  import PreviewPane from './PreviewPane.svelte';
  import MetadataPanel from './MetadataPanel.svelte';
  import Spinner from './Spinner.svelte';
  import { addToast } from '$lib/components/Toast.svelte';

  let {
    object,
    bucket,
    open = $bindable(false),
    ondownload,
    bucketVersioning,
  }: {
    object: S3Object | null;
    bucket: string;
    open?: boolean;
    ondownload: (key: string) => void;
    bucketVersioning?: 'Enabled' | 'Suspended' | 'Disabled';
  } = $props();

  let metadata = $state<ObjectMetadata | null>(null);
  let previewUrl = $state('');
  let loadingMeta = $state(false);
  let lastLoadedKey = $state('');
  let activeTab = $state<'preview' | 'details'>('preview');

  // Load metadata and preview URL when object changes
  $effect(() => {
    if (object && !object.isFolder && open) {
      const key = `${bucket}:${object.key}`;
      if (key !== lastLoadedKey) {
        lastLoadedKey = key;
        activeTab = 'preview';
        loadMetadata(object.key);
      }
    } else {
      metadata = null;
      previewUrl = '';
      lastLoadedKey = '';
    }
  });

  async function loadMetadata(key: string) {
    loadingMeta = true;
    metadata = null;
    previewUrl = '';

    try {
      // Fetch metadata and presigned URL in parallel
      const [metaRes, urlRes] = await Promise.all([
        fetch(`/api/s3/head?${new URLSearchParams({ bucket, key })}`),
        fetch(`/api/s3/download?${new URLSearchParams({ bucket, key })}`)
      ]);

      if (metaRes.ok) {
        metadata = await metaRes.json();
      } else {
        addToast('Failed to load file metadata', 'error');
      }

      if (urlRes.ok) {
        const data = await urlRes.json();
        previewUrl = data.url || '';
      } else {
        addToast('Failed to load preview', 'error');
      }
    } catch (err) {
      console.error('Failed to load object details:', err);
      addToast('Failed to load object details', 'error');
    } finally {
      loadingMeta = false;
    }
  }

  let fileName = $derived(
    object ? object.name : ''
  );

  function isMobileLayout(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 768;
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  function getFileType(name: string): string {
    const ext = name.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  }

  function getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, string> = {
      json: 'data_object',
      js: 'javascript',
      ts: 'code',
      html: 'html',
      css: 'css',
      svg: 'image',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      webp: 'image',
      pdf: 'picture_as_pdf',
      zip: 'folder_zip',
      gz: 'folder_zip',
      tar: 'folder_zip',
      md: 'description',
      txt: 'description',
      csv: 'table_chart',
      xml: 'code',
      yaml: 'settings',
      yml: 'settings',
      env: 'settings',
      log: 'receipt_long',
    };
    return iconMap[ext] || 'draft';
  }

  async function copyURI(key: string) {
    const uri = `s3://${bucket}/${key}`;
    try {
      await navigator.clipboard.writeText(uri);
      addToast('S3 URI copied to clipboard', 'success');
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = uri;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      addToast('S3 URI copied to clipboard', 'success');
    }
  }
</script>

{#if open && object && !object.isFolder}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" onclick={() => { open = false; }}>
    <div
      class="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
    >
      <div class="flex items-start justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              {#if getFileIcon(object.name) === 'image'}
                <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              {:else if getFileIcon(object.name) === 'data_object'}
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
              {:else if getFileIcon(object.name) === 'code' || getFileIcon(object.name) === 'javascript'}
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
              {:else if getFileIcon(object.name) === 'picture_as_pdf'}
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              {:else if getFileIcon(object.name) === 'folder_zip'}
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              {/if}
            </svg>
          </div>
          <div>
            <h2 class="max-w-[28rem] truncate text-sm font-bold text-gray-900 dark:text-white" title={fileName}>{fileName}</h2>
            <p class="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {formatSize(object.size)} • {getFileType(object.name)}
            </p>
          </div>
        </div>
        <button
          onclick={() => { open = false; }}
          class="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Close preview"
          title="Close preview"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onclick={() => { activeTab = 'preview'; }}
          class="flex-1 py-2 text-xs font-semibold transition-all
            {activeTab === 'preview'
              ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/10 dark:text-blue-400'
              : 'border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'}"
        >
          Preview
        </button>
        <button
          onclick={() => { activeTab = 'details'; }}
          class="flex-1 py-2 text-xs font-semibold transition-all
            {activeTab === 'details'
              ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/10 dark:text-blue-400'
              : 'border-b-2 border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300'}"
        >
          Details
        </button>
      </div>

      <div class="max-h-[68vh] overflow-y-auto bg-gray-50 dark:bg-gray-800/50">
        {#if loadingMeta}
          <div class="flex min-h-[220px] items-center justify-center p-8">
            <Spinner size="md" color="primary" />
          </div>
        {:else if activeTab === 'preview'}
          <div class="p-4">
            <PreviewPane contentType={metadata?.contentType || ''} {previewUrl} {fileName} />
          </div>
        {:else}
          <MetadataPanel {metadata} {bucketVersioning} />
        {/if}
      </div>

      <div class="flex gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <button
          onclick={() => copyURI(object.key)}
          class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800"
        >
          Copy URI
        </button>
        <button
          onclick={() => ondownload(object.key)}
          class="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Download
        </button>
      </div>
    </div>
  </div>
{/if}
