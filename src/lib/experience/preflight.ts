// ─────────────────────────────────────────────────────────────
// Entrance preflight — inlined in <head>, runs before first paint.
//
// Sets html[data-entrance] only when the cinematic entrance should
// play. Without JavaScript the attribute is never set, so the
// server-rendered creation canvas is what the visitor (and crawler)
// sees: the canvas is the zero-phase case of the entrance, not a
// separate crawler-only page.
//
// Never plays on: other routes, deep links (#hash), ?intro=0.
// Reduced motion → the non-spatial "reduced" variant.
// Touches no cookies and no storage.
// ─────────────────────────────────────────────────────────────

export const ENTRANCE_PREFLIGHT = `(function(){try{
var d=document.documentElement,l=location;
if(l.pathname!=="/")return;
if(l.hash&&l.hash.length>1)return;
if(/(^|&)intro=0(&|$)/.test(l.search.slice(1)))return;
var r=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
d.setAttribute("data-entrance",r?"reduced":"full");
}catch(e){}})();`;
