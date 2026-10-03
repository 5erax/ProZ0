/** Authored pixel art, measured against the 32×48 pioneer cell. No gameplay data. */
export interface LivingArt {
  readonly width: number;
  readonly height: number;
  readonly markup: string;
}
const shade = '#172c30';
const animals: Record<string, { width: number; height: number; body: string }> = {
  chicken: { width: 22, height: 23, body: `
    <path fill="#a7744c" d="M9 26 5 18h6l7 9z"/>
    <path fill="#e8d7a2" d="M12 23h5v-3h13v3h5v15H17v-4h-5zM29 13h12v18H29z"/>
    <path fill="#bc9a69" d="M16 29h12v8H16zM22 27h9v5h-9z"/>
    <path fill="#f5eac4" d="M18 22h12v4H18zM31 14h6v9h-6z"/>
    <path fill="#b9544d" d="M30 9h3V6h4v5h4v5H30zM36 27h3v6h-3z"/>
    <path fill="#d8a455" d="M41 19h8v4h-8zM22 38h3v10h-3zM34 38h3v10h-3zM18 47h11v3H18zM31 47h10v3H31z"/>
    <path fill="${shade}" d="M36 18h3v3h-3z"/>` },
  rabbit: { width: 24, height: 25, body: `
    <path fill="#9e9d91" d="M14 29h7v-5h18v4h8v18H14zM35 20h13v19H35zM32 5h6v20h-6zM44 3h6v22h-6z"/>
    <path fill="#d9d7c2" d="M17 28h15v8H17zM30 35h11v8H30zM10 34h6v8h-6zM38 22h7v7h-7z"/>
    <path fill="#c38d89" d="M34 8h2v14h-2zM46 6h2v15h-2zM48 31h4v3h-4z"/>
    <path fill="#7c8178" d="M19 37h10v10H19zM25 45h8v4h-8zM39 42h4v7h-4z"/>
    <path fill="${shade}" d="M44 27h3v3h-3z"/>` },
  goat: { width: 40, height: 40, body: `
    <path fill="#aeb8a0" d="M9 22h28v4h7v13H12v-4H7v-9h2zM34 15h14v17H34zM44 22h10v7H44z"/>
    <path fill="#dce0c4" d="M12 22h21v6H12zM36 15h8v6h-8zM13 34h25v5H13z"/>
    <path fill="#7d8d7c" d="M12 38h5v13h-5zM20 37h4v12h-4zM32 37h4v12h-4zM38 37h5v14h-5zM6 19h4v9H6z"/>
    <path fill="#c5ab79" d="M34 8h4v9h-4zM43 6h4v11h-4zM29 16h6v4h-6z"/>
    <path fill="#e7dfb7" d="M43 29h4v8h-4zM39 33h5v4h-5z"/>
    <path fill="${shade}" d="M44 20h3v3h-3zM12 49h6v4h-6zM37 49h7v4h-7zM21 47h4v4h-4zM32 47h4v4h-4z"/>` },
  boar: { width: 42, height: 30, body: `
    <path fill="#685346" d="M9 21h7v-4h20v4h8v7h9v12H11v-4H6V25h3z"/>
    <path fill="#947158" d="M14 21h20v4h8v8H12v-5h2zM42 29h13v8H42z"/>
    <path fill="#b38b69" d="M15 23h14v3H15zM46 29h7v4h-7z"/>
    <path fill="#4d423b" d="M16 13h3v8h-3zM23 14h3v7h-3zM30 15h3v6h-3zM38 18h5v9h-5zM13 39h6v10h-6zM34 39h6v10h-6z"/>
    <path fill="#e4d5a4" d="M48 37h4v-5h3v9h-7z"/>
    <path fill="${shade}" d="M44 27h3v3h-3zM51 34h2v2h-2zM13 48h7v4h-7zM34 48h7v4h-7z"/>` },
  fox: { width: 40, height: 28, body: `
    <path fill="#a66544" d="M8 25h8v9H6v-4H2v-9h6zM15 25h24v12H15zM36 18h12v14H36zM47 24h11v6H47z"/>
    <path fill="#cf975d" d="M16 24h17v7H16zM38 19h7v8h-7zM6 24h6v5H6z"/>
    <path fill="#e6ddba" d="M1 18h5v9H1zM39 30h14v4H39zM30 32h10v6H30z"/>
    <path fill="#825641" d="M36 11h5v10h-5zM45 11h5v10h-5zM17 36h4v13h-4zM33 36h4v13h-4z"/>
    <path fill="${shade}" d="M36 12h2v5h-2zM47 12h2v5h-2zM46 23h3v3h-3zM55 25h4v3h-4zM17 45h5v6h-5zM33 45h5v6h-5z"/>` },
  wolf: { width: 48, height: 37, body: `
    <path fill="#667b7b" d="M9 23h23v-5h10v4h6v13H12v-5H9zM37 15h12v14H37zM47 21h13v9H47zM5 24h7v12H5zM1 30h7v7H1z"/>
    <path fill="#96a7a0" d="M13 22h18v4H13zM33 18h8v10h-8zM40 16h6v6h-6zM17 30h22v6H17z"/>
    <path fill="#bcc5b3" d="M41 30h14v4H41zM33 29h7v10h-7z"/>
    <path fill="#51656a" d="M37 8h6v11h-6zM46 9h6v10h-6zM13 35h5v16h-5zM22 35h4v13h-4zM35 35h6v16h-6zM43 33h4v15h-4z"/>
    <path fill="${shade}" d="M48 21h3v3h-3zM58 22h4v4h-4zM13 49h6v4h-6zM35 49h7v4h-7zM22 47h5v4h-5zM43 47h5v4h-5z"/>` },
};

function plant(kind: string, stage: number): string {
  if (kind === 'empty') return '';
  if (kind === 'dead') return '<path fill="#a78e61" d="M21 34h3v13h-3zM33 31h3v16h-3zM41 37h3v10h-3zM19 33h8v3h-8zM31 29h8v3h-8z"/>';
  if (stage === 0) return '<path fill="#486747" d="M22 41h3v7h-3zM34 38h3v10h-3zM42 42h3v6h-3z"/><path fill="#8faa68" d="M17 39h7v4h-7zM35 35h7v5h-7zM43 39h5v4h-5z"/>';
  if (kind === 'wild-grass') return '<path fill="#496a50" d="M13 45v-8h3v-9h3v20h-6zM24 48V24h3v11h4v13zM36 47V30h3v-9h3v26zM45 48V34h3v-6h3v20z"/><path fill="#87a875" d="M16 37h3v10h-3zM26 29h2v12h-2zM40 26h2v15h-2zM47 37h2v8h-2z"/>';
  if (kind === 'root') return `<path fill="#688954" d="M17 32h10v5H17zM23 24h5v18h-5zM29 28h7v15h-7zM36 23h6v18h-6zM42 31h9v6h-9z"/><path fill="#98ad69" d="M18 29h6v3h-6zM29 24h5v8h-5zM39 21h4v9h-4z"/>${stage === 2 ? '<path fill="#bf9580" d="M21 42h9v6h-9zM36 41h9v8h-9z"/><path fill="#e0ba94" d="M22 42h4v3h-4zM37 41h4v3h-4z"/>' : ''}`;
  if (kind === 'herb' || kind === 'wild-herbs') return `<path fill="#426855" d="M14 33h12v7H14zM20 22h9v12h-9zM31 27h15v9H31zM39 19h7v14h-7zM22 39h23v6H22z"/><path fill="#89a77a" d="M16 30h9v4h-9zM22 24h5v5h-5zM33 28h9v5h-9zM41 20h4v5h-4zM26 37h12v4H26z"/>${stage === 2 ? '<path fill="#b49abb" d="M23 19h4v4h-4zM41 16h5v4h-5zM33 24h4v4h-4z"/>' : ''}`;
  if (kind === 'flax' || kind === 'wild-flax') return `<path fill="#608561" d="M20 24h2v24h-2zM30 15h2v33h-2zM42 20h2v28h-2zM16 30h6v3h-6zM31 22h7v3h-7zM38 32h6v3h-6zM25 36h7v3h-7z"/>${stage === 2 ? '<path fill="#78adbf" d="M17 21h8v4h-8zM28 12h7v5h-7zM39 17h8v4h-8z"/><path fill="#d4d9a0" d="M20 22h2v2h-2zM30 13h2v2h-2zM42 18h2v2h-2z"/>' : '<path fill="#90aa73" d="M18 22h5v4h-5zM29 14h5v4h-5z"/>'}`;
  // Grain has broad ears and narrow folded leaves, unlike branching flax.
  return `<path fill="#738651" d="M18 25h3v23h-3zM30 18h3v30h-3zM42 24h3v24h-3zM14 35h4v-4h3v9h-7zM32 30h7v4h-7zM40 37h5v4h-5z"/>${stage === 2 ? '<path fill="#c3b572" d="M16 16h7v13h-7zM28 8h7v16h-7zM40 14h7v14h-7z"/><path fill="#e1ce8c" d="M17 16h3v4h-3zM29 8h3v4h-3zM41 14h3v4h-3z"/><path fill="#927b46" d="M20 21h3v3h-3zM32 14h3v3h-3zM44 20h3v3h-3z"/>' : '<path fill="#a1af6e" d="M18 20h3v7h-3zM30 14h3v9h-3zM42 20h3v7h-3z"/>'}`;
}

const cache = new Map<string, LivingArt>();
export function livingArt(role: string, kind: string, progress: number, young = false, dead = false): LivingArt {
  const stageKey = progress >= 1 ? 2 : progress >= .5 ? 1 : 0;
  const key = [role, kind, stageKey, young, dead].join(':');
  const cached = cache.get(key);
  if (cached) return cached;
  const shadow = '<path fill="#172c30" opacity=".45" d="m6 50 25-6 27 7-25 7z"/>';
  let width = 34, height = 34, body: string;
  if (role === 'animal') {
    const a = animals[kind];
    if (!a) throw new Error('Missing living animal art: ' + kind);
    width = a.width; height = a.height;
    if (young) { width = Math.round(width * .65); height = Math.round(height * .65); }
    body = dead ? `<g transform="translate(0 70) scale(1 -.45)">${a.body}</g>` : a.body;
  } else if (kind === 'berry-bush') {
    width = 42; height = 38;
    body = '<path fill="#82674d" d="M29 29h5v22h-5zM23 39h12v4H23zM33 36h10v4H33z"/><path fill="#3e604b" d="M9 27h6v-9h14v-6h13v7h10v19H17v-4H9z"/><path fill="#628452" d="M16 19h12v7H16zM30 15h10v7H30zM36 24h13v8H36zM19 30h12v6H19z"/><path fill="#87a469" d="M18 19h7v3h-7zM31 15h6v3h-6zM39 24h6v3h-6z"/>' + (dead || stageKey < 2 ? '' : '<path fill="#b7797b" d="M18 26h4v4h-4zM22 29h4v4h-4zM37 22h4v4h-4zM41 25h4v4h-4zM30 34h4v4h-4z"/><path fill="#e0ada0" d="M18 26h2v2h-2zM37 22h2v2h-2z"/>');
    if (stageKey === 0) body = '<path fill="#82674d" d="M29 39h5v12h-5zM22 39h11v4H22zM33 37h9v4h-9z"/><path fill="#739363" d="M20 36h7v4h-7zM38 34h6v4h-6z"/>';
    else if (stageKey === 1) body = '<g transform="translate(8 12.5) scale(.75)">' + body + '</g>';
  } else if (kind === 'clay-bank') {
    width = 40; height = 26;
    body = '<path fill="#785e4f" d="m5 45 8-22h26l14 16-9 12H14z"/><path fill="#b28465" d="M14 24h23l9 13H10z"/><path fill="#c99f7b" d="M15 24h16v4H15zM11 33h25v4H11z"/><path fill="#997056" d="M10 39h37v5H10zM19 29h21v3H19z"/><path fill="#5c5749" d="M17 44h4v5h-4zM36 34h3v6h-3z"/>';
  } else if (kind === 'salt-stone') {
    width = 34; height = 29;
    body = '<path fill="#688b89" d="m9 46 5-11h32l8 11-21 8z"/><path fill="#bdd1c3" d="M15 24h9v23h-9zM28 12h12v35H28zM43 27h7v18h-7z"/><path fill="#e3e6ce" d="M15 24h4v17h-4zM28 12h5v26h-5zM43 27h3v12h-3z"/><path fill="#92b4ae" d="M35 17h5v30h-5zM21 29h3v17h-3z"/>';
  } else {
    const stage = dead ? 0 : stageKey;
    body = (role === 'plot' ? '<path fill="var(--plot-soil-color,#62563f)" d="m5 46 27-13 27 13-27 14z"/><path fill="#8d7751" opacity=".6" d="m13 45 20 10 17-9m-29-6 21 10"/>' : '') + plant(kind, stage);
    if (kind === 'empty') { width = 40; height = 22; }
  }
  const result = Object.freeze({ width, height, markup: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges" aria-hidden="true">${shadow}${body}</svg>` });
  cache.set(key, result);
  return result;
}
