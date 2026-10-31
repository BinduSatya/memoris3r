<script lang="ts">
  import ThemeToggle from './ThemeToggle.svelte';

  let {
    bucket = '',
    prefix = '',
    searchQuery = $bindable(''),
    searchMode = 'filter',
    authMode = 'manual',
    userEmail = '',
    userName = '',
    onsearchmodechange,
    onupload,
    onback,
    onlogout,
    ontoggleSidebar,
  }: {
    bucket: string;
    prefix: string;
    searchQuery?: string;
    searchMode?: 'filter' | 'search';
    authMode?: 'manual' | 'fixed' | 'oidc';
    userEmail?: string;
    userName?: string;
    onsearchmodechange?: (mode: 'filter' | 'search') => void;
    onupload?: () => void;
    onback?: () => void;
    onlogout: () => void;
    ontoggleSidebar: () => void;
  } = $props();

  let inputEl: HTMLInputElement | undefined = $state();

  /** Derive the current folder name for the search badge */
  let currentFolderName = $derived(() => {
    if (!prefix) return bucket ? bucket + '/' : '/';
    const parts = prefix.split('/').filter(Boolean);
    return parts[parts.length - 1] + '/';
  });

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      searchQuery = '';
      inputEl?.blur();
    }
  }

  function clearSearch() {
    searchQuery = '';
    inputEl?.focus();
  }

  function toggleSearchMode() {
    const newMode = searchMode === 'filter' ? 'search' : 'filter';
    onsearchmodechange?.(newMode);
  }

  let searchPlaceholder = $derived(
    searchMode === 'search'
      ? 'Search recursively...'
      : `Filter in ${currentFolderName()}...`
  );

  /** Programmatically focus the search input */
  export function focusSearch() {
    inputEl?.focus();
  }

  let displayName = $derived(userName || userEmail || '');
</script>

<header class="flex h-[60px] items-center justify-between border-b border-gray-200 bg-white/90 px-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90 sm:h-[52px] sm:px-4">
  <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
    <button
      onclick={ontoggleSidebar}
      class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden"
      aria-label="Open sidebar"
      type="button"
    >
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </button>

    {#if onback && prefix}
      <button
        onclick={onback}
        class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label="Go back"
        type="button"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    {/if}

    <div class="flex min-w-0 items-center gap-2 sm:gap-3">
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 shadow-sm shadow-primary-600/30">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 11V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3"/>
          <path d="M8 4v16"/>
          <circle cx="15" cy="12" r="3"/>
          <path d="M15 9v6"/>
        </svg>
      </div>
      <div class="min-w-0">
        <div class="hidden text-sm font-semibold text-primary-600 dark:text-primary-400 sm:block">MemoriS3</div>
        {#if bucket}
          <div class="truncate text-xs font-medium text-gray-600 dark:text-gray-300 sm:text-sm">
            {bucket}{prefix ? ` / ${prefix.replace(/\/$/, '')}` : ''}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if bucket}
    <div class="hidden flex-1 justify-center px-2 sm:flex sm:px-4 md:px-8">
      <div class="relative flex w-full max-w-2xl items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm transition-all duration-150 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 dark:border-gray-600 dark:bg-gray-800/80">
        <div class="flex h-9 shrink-0 items-center gap-1.5 border-r border-gray-200 bg-gray-100 px-2.5 text-[11px] font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
          <svg class="h-3.5 w-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2 7.5V18a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-6.5l-2-2.5H4a2 2 0 00-2 2z" />
          </svg>
          <span class="max-w-[120px] truncate">{currentFolderName()}</span>
        </div>

        <button
          data-testid="search-mode-toggle"
          onclick={toggleSearchMode}
          class="flex h-9 w-9 shrink-0 items-center justify-center border-r border-gray-200 transition-colors dark:border-gray-600
            {searchMode === 'search'
              ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
              : 'bg-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}"
          title={searchMode === 'search' ? 'Recursive search (all subfolders)' : 'Filter current folder'}
          type="button"
        >
          {#if searchMode === 'search'}
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          {:else}
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          {/if}
        </button>

        <div class="relative flex-1">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            bind:this={inputEl}
            bind:value={searchQuery}
            type="text"
            placeholder={searchPlaceholder}
            onkeydown={handleSearchKeydown}
            class="w-full bg-transparent py-2 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white dark:placeholder-gray-500"
          />
          {#if searchQuery}
            <button
              onclick={clearSearch}
              class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
              type="button"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <div class="flex items-center gap-2 shrink-0">
    {#if onupload && bucket}
      <button
        onclick={onupload}
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-xl bg-primary-600 px-3 text-sm font-semibold text-white shadow-sm shadow-primary-600/25 transition-colors hover:bg-primary-700 sm:h-9 sm:px-3"
      >
        <svg class="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18.5h14" />
        </svg>
        <span class="hidden sm:inline">Upload</span>
      </button>
    {/if}

    <ThemeToggle />

    {#if authMode === 'fixed'}
      <div
        class="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 sm:flex"
        title="Using server-configured credentials"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span class="hidden md:inline">Server credentials</span>
      </div>
    {:else if authMode === 'oidc'}
      <div class="flex items-center gap-2">
        {#if displayName}
          <span class="hidden max-w-[120px] truncate text-xs text-gray-600 dark:text-gray-300 lg:inline" title={displayName}>
            {displayName}
          </span>
        {/if}
        <button
          onclick={onlogout}
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          title="Logout"
          type="button"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    {:else}
      <button
        onclick={onlogout}
        class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        title="Account / Logout"
        type="button"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
      </button>
    {/if}
  </div>
</header>
