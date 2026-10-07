export type Locale = 'en' | 'vi';
export const LOCALE_STORAGE_KEY = 'proz0.locale.v1';
type MessageParams = Readonly<Record<string, string | number>>;
export interface MessageDictionary { readonly en: Readonly<Record<string, string>>; readonly vi: Readonly<Record<string, string>> }
const listeners = new Set<() => void>();
let current: Locale = 'en';
try { if (globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY) === 'vi') current = 'vi'; } catch { /* Storage is optional. */ }
if (typeof document !== 'undefined') document.documentElement.lang = current;
export const locale = (): Locale => current;
export function setLocale(next: Locale): void {
  if (next !== 'en' && next !== 'vi') throw Error('Unsupported locale');
  if (current === next) return;
  current = next;
  try { globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, next); } catch { /* The current session still changes. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  for (const listener of listeners) listener();
}
export function onLocaleChange(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
/** Plain text only. Parameters never become HTML, IDs or operation fields. */
export function message(dictionary: MessageDictionary, key: string, params: MessageParams = {}, fallback = ''): string {
  const value = dictionary[current][key] ?? dictionary.en[key] ?? fallback;
  return value.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (_match, name: string) => String(params[name] ?? ''));
}
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(current === 'vi' ? 'vi-VN' : 'en-US', options).format(value);
}
/** Shared inventory precision: retain small item masses, avoid floating-point noise. */
export const formatInventoryAmount = (value: number) => formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
export const formatSeconds = (value: number) => formatNumber(value, { style: 'unit', unit: 'second', unitDisplay: 'short', maximumFractionDigits: 1 });
export const formatMetres = (value: number) => formatNumber(value, { style: 'unit', unit: 'meter', unitDisplay: 'short', maximumFractionDigits: 1 });
export function assertDictionaryParity(dictionary: MessageDictionary): void {
  const en = Object.keys(dictionary.en).sort(), vi = Object.keys(dictionary.vi).sort();
  if (JSON.stringify(en) !== JSON.stringify(vi)) throw Error('Locale dictionary keys differ');
  for (const key of en) {
    const params = (value: string) => [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m => m[1]).sort();
    if (JSON.stringify(params(dictionary.en[key]!)) !== JSON.stringify(params(dictionary.vi[key]!))) throw Error('Locale message parameters differ: ' + key);
  }
}
/** Source-owned bindings, with one reader per element/attribute. No DOM text search. */
const bindings = new Map<WeakRef<Element>, Map<string, () => string>>();
const references = new WeakMap<Element, WeakRef<Element>>();
const textNodes = new WeakMap<Element, Text>();
function applyBinding(element: Element, attribute: string, read: () => string): void {
  const value = read();
  if (attribute === 'textContent') {
    let text = textNodes.get(element);
    if (!text || text.parentNode !== element) { text = element.ownerDocument.createTextNode(value); element.replaceChildren(text); textNodes.set(element,text); }
    else if (text.data !== value) text.data = value;
  } else if (element.getAttribute(attribute) !== value) element.setAttribute(attribute,value);
}
export function bindLocalized(element: Element, attribute: 'textContent' | 'title' | 'aria-label' | 'placeholder', read: () => string): void {
  let reference = references.get(element);
  if (!reference) { reference = new WeakRef(element); references.set(element, reference); bindings.set(reference, new Map()); }
  if (!bindings.has(reference)) bindings.set(reference,new Map());
  bindings.get(reference)!.set(attribute, read);
  applyBinding(element,attribute,read);
  if (bindings.size > 2048) for (const [ref] of bindings) { const node=ref.deref(); if (!node || !node.isConnected) bindings.delete(ref); }
}
onLocaleChange(() => {
  for (const [reference, readers] of bindings) {
    const element = reference.deref();
    if (!element || !element.isConnected) { bindings.delete(reference); continue; }
    for (const [attribute, read] of readers) applyBinding(element,attribute,read);
  }
});
