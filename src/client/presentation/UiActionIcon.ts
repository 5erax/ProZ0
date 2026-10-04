const paths:Record<string,string>={
 'open-inventory':'M5 7h14v14H5ZM9 7V3h6v4M5 12h14M10 12v3h4v-3',
 'open-craft':'m5 20 9-9M12 4l4-2 6 6-4 4ZM2 17l5 5',
 'open-build':'M3 9 12 3l9 6v12H3ZM3 9h18M9 21v-8h6v8',
 'open-map':'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16',
 'open-colony':'M12 21V10M12 15C3 16 2 9 3 5c7 0 10 4 9 10ZM12 11c0-6 4-9 9-9 1 6-2 10-9 9Z',
 'open-farm':'M12 21V10M12 15C3 16 2 9 3 5c7 0 10 4 9 10ZM12 11c0-6 4-9 9-9 1 6-2 10-9 9Z',
};
export function actionGlyph(document:Document,action:string):SVGSVGElement {const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[action]??paths['open-map']!);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.5');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;}
