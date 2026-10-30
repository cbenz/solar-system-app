# SvelteKit in static export, rendered with Three.js

SvelteKit builds to a plain static directory, which keeps the no-install, no-backend promise, and gives us typed data modules for the activities and Svelte's compiler for the chrome. Three.js does the scene.

There is no router: the app is one page, and the hub is the 3D solar system itself. Hosted on Vercel for the git-connected deploy; because the output is a static directory, moving host is a one-line change and is not recorded here.
