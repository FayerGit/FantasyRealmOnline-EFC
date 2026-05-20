const envApiUrl = import.meta.env.VITE_API_URL?.trim();

const inferBasePathFromAssets = (): string => {
	if (typeof document === 'undefined') {
		return '';
	}

	// Le build Vite injecte un script de module tel que : /assets/index-xxxx.js
	// Si l'app est hébergée dans un sous-dossier : /MyProject/assets/index-xxxx.js
	const moduleScript = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null;
	if (!moduleScript?.src) {
		return '';
	}

	try {
		const url = new URL(moduleScript.src);
		const path = url.pathname;
		const marker = '/assets/';
		const idx = path.indexOf(marker);
		if (idx === -1) {
			return '';
		}
		const basePath = path.slice(0, idx);
		return basePath === '/' ? '' : basePath;
	} catch {
		return '';
	}
};

const inferApiUrlFromWindow = (): string => {
	// Dans les contextes SSR/tests, window peut être indéfini.
	if (typeof window === 'undefined') {
		return 'http://localhost:8000';
	}

	const { origin } = window.location;
	const basePath = inferBasePathFromAssets();
	return `${origin}${basePath}/backend`;
};

export const API_URL = (envApiUrl || inferApiUrlFromWindow()).replace(/\/+$/, '');
