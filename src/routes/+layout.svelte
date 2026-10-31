<script>
  import '../app.css';
  import Toast from '$lib/components/Toast.svelte';
  import TransferManager from '$lib/components/TransferManager.svelte';
  let { children } = $props();
</script>

<svelte:head>
  <title>MemoriS3</title>
</svelte:head>

{@render children()}
<TransferManager />
<Toast />
