import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Workaround for flowbite-svelte Arrow.svelte CSS incompatibility with Tailwind CSS v4.
 * The Arrow.svelte component's <style> block triggers a CssSyntaxError ("Invalid declaration: `Side`")
 * when processed by @tailwindcss/vite. This plugin intercepts the virtual CSS module at the load stage
 * and rewrites the problematic CSS to be valid, preventing the Tailwind CSS parser from choking.
 */
function flowbiteArrowCssFix(): Plugin {
	return {
		name: 'flowbite-arrow-css-fix',
		enforce: 'pre',
		load(id) {
			if (id.includes('Arrow.svelte') && id.includes('lang.css')) {
				// Return valid CSS that replaces the problematic Arrow.svelte styles
				return `.clip { clip-path: polygon(0 0, 0% 100%, 100% 100%, 100% 85%, 15% 0); }`;
			}
		}
	};
}

export default defineConfig(({ mode }) => {
	// Load .env / .env.local / .env.<mode> into process.env so the
	// SvelteKit server runtime can read S3_* etc. via process.env.*.
	// Vite normally only exposes VITE_-prefixed vars to client code;
	// here we explicitly forward everything to the Node process.
	const env = loadEnv(mode, process.cwd(), '');
	for (const [key, value] of Object.entries(env)) {
		if (process.env[key] === undefined) {
			process.env[key] = value;
		}
	}

	return {
		plugins: [flowbiteArrowCssFix(), tailwindcss(), sveltekit()]
	};
});
