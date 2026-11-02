import * as THREE from 'three';
import { mulberry32 } from '$lib/random';

/**
 * A decorative starfield: one Points object, therefore one draw call.
 *
 * The stars are not an astronomical sky. The night sky ticket owns the real one
 * drawn above an observer; this is only the backdrop of the space view.
 */

const STAR_COUNT = 3000;

type LonLat = readonly [lon: number, lat: number];

/** Coarse continent outlines in longitude/latitude degrees, enough to read as Earth. */
const CONTINENTS: readonly (readonly LonLat[])[] = [
	// North America
	[
		[-168, 65],
		[-150, 70],
		[-120, 72],
		[-95, 73],
		[-80, 72],
		[-60, 60],
		[-55, 50],
		[-65, 45],
		[-70, 42],
		[-75, 35],
		[-82, 25],
		[-90, 29],
		[-97, 26],
		[-105, 20],
		[-110, 23],
		[-115, 30],
		[-125, 40],
		[-125, 49],
		[-135, 58],
		[-150, 60]
	],
	// Central America
	[
		[-105, 20],
		[-95, 15],
		[-85, 10],
		[-77, 7],
		[-80, 9],
		[-88, 15],
		[-95, 18]
	],
	// South America
	[
		[-80, 10],
		[-70, 12],
		[-60, 10],
		[-50, 0],
		[-35, -5],
		[-38, -15],
		[-48, -25],
		[-58, -35],
		[-62, -40],
		[-65, -50],
		[-70, -55],
		[-73, -45],
		[-71, -30],
		[-70, -18],
		[-78, -5]
	],
	// Africa
	[
		[-17, 15],
		[-16, 22],
		[-10, 30],
		[0, 36],
		[10, 37],
		[20, 32],
		[32, 31],
		[35, 25],
		[43, 12],
		[51, 12],
		[48, 2],
		[40, -8],
		[40, -18],
		[35, -25],
		[25, -34],
		[18, -34],
		[14, -22],
		[9, -1],
		[9, 4],
		[-8, 5]
	],
	// Eurasia
	[
		[-10, 36],
		[-9, 43],
		[-2, 48],
		[2, 51],
		[8, 54],
		[12, 58],
		[20, 60],
		[28, 65],
		[30, 70],
		[45, 70],
		[60, 72],
		[80, 74],
		[100, 76],
		[130, 72],
		[160, 70],
		[180, 66],
		[170, 60],
		[160, 58],
		[150, 48],
		[140, 42],
		[128, 35],
		[122, 30],
		[118, 22],
		[108, 18],
		[105, 10],
		[100, 8],
		[95, 15],
		[90, 22],
		[80, 10],
		[72, 8],
		[70, 22],
		[62, 25],
		[58, 38],
		[45, 40],
		[35, 36],
		[28, 41],
		[20, 40],
		[14, 38],
		[10, 44],
		[3, 43]
	],
	// Australia
	[
		[113, -22],
		[114, -32],
		[118, -35],
		[129, -32],
		[138, -35],
		[146, -38],
		[150, -34],
		[153, -27],
		[146, -19],
		[142, -11],
		[132, -12],
		[125, -15],
		[118, -20]
	],
	// Greenland
	[
		[-45, 60],
		[-52, 68],
		[-58, 76],
		[-45, 82],
		[-25, 82],
		[-20, 75],
		[-30, 68]
	],
	// Madagascar
	[
		[43, -12],
		[50, -15],
		[50, -25],
		[45, -25],
		[43, -20]
	],
	// British Isles
	[
		[-5, 50],
		[-6, 55],
		[-3, 58],
		[0, 54],
		[1, 51]
	],
	// Japan
	[
		[130, 31],
		[135, 34],
		[140, 36],
		[142, 42],
		[145, 44],
		[141, 38],
		[136, 33]
	],
	// New Zealand
	[
		[172, -34],
		[176, -38],
		[178, -40],
		[174, -42],
		[170, -46],
		[166, -46],
		[170, -41]
	]
];

/** Warm patches clipped to the land, so the continents are not one flat green. */
const DESERTS: readonly { lon: number; lat: number; radiusX: number; radiusY: number }[] = [
	{ lon: 15, lat: 21, radiusX: 30, radiusY: 12 },
	{ lon: 45, lat: 22, radiusX: 12, radiusY: 9 },
	{ lon: 133, lat: -25, radiusX: 18, radiusY: 10 },
	{ lon: 95, lat: 42, radiusX: 20, radiusY: 9 },
	{ lon: 22, lat: -23, radiusX: 10, radiusY: 8 }
];

const LAND_COLOURS = ['#3f7d3a', '#4a8341', '#557f3f', '#487a3b', '#5b8845'];

export function createEarthTexture(maxAnisotropy = 1): THREE.CanvasTexture {
	const width = 2048;
	const height = 1024;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	const context = canvas.getContext('2d');

	if (context === null) {
		throw new Error('The browser did not provide a 2D canvas context for the Earth texture.');
	}

	const toX = (lon: number) => ((lon + 180) / 360) * width;
	const toY = (lat: number) => ((90 - lat) / 180) * height;

	// Ocean, slightly darker toward the poles.
	const ocean = context.createLinearGradient(0, 0, 0, height);
	ocean.addColorStop(0, '#0a2c4d');
	ocean.addColorStop(0.3, '#0f4c81');
	ocean.addColorStop(0.5, '#1263a0');
	ocean.addColorStop(0.7, '#0f4c81');
	ocean.addColorStop(1, '#0a2c4d');
	context.fillStyle = ocean;
	context.fillRect(0, 0, width, height);

	// All continents as one path, reused to clip the detail passes.
	const landPath = new Path2D();

	CONTINENTS.forEach((polygon, polygonIndex) => {
		context.beginPath();

		polygon.forEach(([lon, lat], index) => {
			const x = toX(lon);
			const y = toY(lat);

			if (index === 0) {
				context.moveTo(x, y);
			} else {
				context.lineTo(x, y);
			}
		});

		context.closePath();
		context.fillStyle =
			LAND_COLOURS[polygonIndex % LAND_COLOURS.length] ?? '#3f7d3a';
		context.fill();
		context.strokeStyle = 'rgba(20, 55, 30, 0.65)';
		context.lineWidth = 2;
		context.stroke();

		polygon.forEach(([lon, lat], index) => {
			const x = toX(lon);
			const y = toY(lat);

			if (index === 0) {
				landPath.moveTo(x, y);
			} else {
				landPath.lineTo(x, y);
			}
		});

		landPath.closePath();
	});

	context.save();
	context.clip(landPath);

	const random = mulberry32(0x5e1a3);

	// Deserts.
	for (const desert of DESERTS) {
		context.beginPath();
		context.ellipse(
			toX(desert.lon),
			toY(desert.lat),
			(desert.radiusX / 360) * width,
			(desert.radiusY / 180) * height,
			0,
			0,
			Math.PI * 2
		);
		context.fillStyle = 'rgba(176, 154, 94, 0.65)';
		context.fill();
	}

	// Speckle the land so it does not look like flat paper.
	for (let index = 0; index < 2400; index += 1) {
		const x = random() * width;
		const y = random() * height;
		const radius = 1 + random() * 5;

		context.beginPath();
		context.arc(x, y, radius, 0, Math.PI * 2);
		context.fillStyle = random() > 0.5 ? 'rgba(30, 70, 35, 0.35)' : 'rgba(120, 140, 80, 0.28)';
		context.fill();
	}

	context.restore();

	// Antarctic ice, with a wavy coast so it is not a straight band.
	context.beginPath();
	context.moveTo(0, height);

	for (let x = 0; x <= width; x += 16) {
		const coastLat = -68 + Math.sin((x / width) * Math.PI * 6) * 4 + Math.sin((x / width) * Math.PI * 22) * 1.5;
		context.lineTo(x, toY(coastLat));
	}

	context.lineTo(width, height);
	context.closePath();
	context.fillStyle = '#e6eef1';
	context.fill();

	// Arctic sea ice, fading into the ocean.
	const arctic = context.createLinearGradient(0, 0, 0, toY(68));
	arctic.addColorStop(0, 'rgba(235, 243, 246, 0.95)');
	arctic.addColorStop(1, 'rgba(235, 243, 246, 0)');
	context.fillStyle = arctic;
	context.fillRect(0, 0, width, toY(68));

	// A soft blue haze over the oceans keeps the contrast with the land low.
	context.fillStyle = 'rgba(20, 80, 130, 0.08)';
	context.fillRect(0, 0, width, height);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = maxAnisotropy;
	texture.needsUpdate = true;

	return texture;
}
