'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var runtimeCore = require('@vue/runtime-core');

const doc = document;
const svgNS = 'http://www.w3.org/2000/svg';
const nodeOps = {
    insert: (child, parent, anchor) => {
        if (anchor != null) {
            parent.insertBefore(child, anchor);
        }
        else {
            parent.appendChild(child);
        }
    },
    remove: (child) => {
        const parent = child.parentNode;
        if (parent != null) {
            parent.removeChild(child);
        }
    },
    createElement: (tag, isSVG) => isSVG ? doc.createElementNS(svgNS, tag) : doc.createElement(tag),
    createText: (text) => doc.createTextNode(text),
    createComment: (text) => doc.createComment(text),
    setText: (node, text) => {
        node.nodeValue = text;
    },
    setElementText: (el, text) => {
        el.textContent = text;
    },
    parentNode: (node) => node.parentNode,
    nextSibling: (node) => node.nextSibling,
    querySelector: (selector) => doc.querySelector(selector)
};

// compiler should normalize class + :class bindings on the same element
// into a single binding ['staticClass', dynamic]
function patchClass(el, value, isSVG) {
    // directly setting className should be faster than setAttribute in theory
    if (isSVG) {
        el.setAttribute('class', value);
    }
    else {
        el.className = value;
    }
}

const globalsWhitelist = new Set(('Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,' +
    'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,' +
    'Object,Boolean,String,RegExp,Map,Set,JSON,Intl').split(','));

const isOn = (key) => key[0] === 'o' && key[1] === 'n';
const isArray = Array.isArray;
const isString = (val) => typeof val === 'string';

function patchStyle(el, prev, next) {
    const { style } = el;
    if (!next) {
        el.removeAttribute('style');
    }
    else if (isString(next)) {
        style.cssText = next;
    }
    else {
        for (const key in next) {
            style[key] = next[key];
        }
        if (prev && !isString(prev)) {
            for (const key in prev) {
                if (!next[key]) {
                    style[key] = '';
                }
            }
        }
    }
}

const xlinkNS = 'http://www.w3.org/1999/xlink';
function isXlink(name) {
    return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink';
}
function getXlinkProp(name) {
    return isXlink(name) ? name.slice(6, name.length) : '';
}
function patchAttr(el, key, value, isSVG) {
    // isSVG short-circuits isXlink check
    if (isSVG && isXlink(key)) {
        if (value == null) {
            el.removeAttributeNS(xlinkNS, getXlinkProp(key));
        }
        else {
            el.setAttributeNS(xlinkNS, key, value);
        }
    }
    else {
        if (value == null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, value);
        }
    }
}

function patchDOMProp(el, key, value, 
// the following args are passed only due to potential innerHTML/textContent
// overriding existing VNodes, in which case the old tree must be properly
// unmounted.
prevChildren, parentComponent, parentSuspense, unmountChildren) {
    if ((key === 'innerHTML' || key === 'textContent') && prevChildren != null) {
        unmountChildren(prevChildren, parentComponent, parentSuspense);
    }
    el[key] = value == null ? '' : value;
}

// Async edge case fix requires storing an event listener's attach timestamp.
let _getNow = Date.now;
// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res ( relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
if (typeof document !== 'undefined' &&
    _getNow() > document.createEvent('Event').timeStamp) {
    // if the low-res timestamp which is bigger than the event timestamp
    // (which is evaluated AFTER) it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listeners as well.
    _getNow = () => performance.now();
}
// To avoid the overhead of repeatedly calling performance.now(), we cache
// and use the same timestamp for all event listeners attached in the same tick.
let cachedNow = 0;
const p = Promise.resolve();
const reset = () => {
    cachedNow = 0;
};
const getNow = () => cachedNow || (p.then(reset), (cachedNow = _getNow()));
function patchEvent(el, name, prevValue, nextValue, instance = null) {
    const invoker = prevValue && prevValue.invoker;
    if (nextValue) {
        if (invoker) {
            prevValue.invoker = null;
            invoker.value = nextValue;
            nextValue.invoker = invoker;
            invoker.lastUpdated = getNow();
        }
        else {
            el.addEventListener(name, createInvoker(nextValue, instance));
        }
    }
    else if (invoker) {
        el.removeEventListener(name, invoker);
    }
}
function createInvoker(initialValue, instance) {
    const invoker = ((e) => {
        // async edge case #6566: inner click event triggers patch, event handler
        // attached to outer element during patch, and triggered again. This
        // happens because browsers fire microtask ticks between event propagation.
        // the solution is simple: we save the timestamp when a handler is attached,
        // and the handler would only fire if the event passed to it was fired
        // AFTER it was attached.
        if (e.timeStamp >= invoker.lastUpdated) {
            const args = [e];
            const value = invoker.value;
            if (isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    runtimeCore.callWithAsyncErrorHandling(value[i], instance, 5 /* NATIVE_EVENT_HANDLER */, args);
                }
            }
            else {
                runtimeCore.callWithAsyncErrorHandling(value, instance, 5 /* NATIVE_EVENT_HANDLER */, args);
            }
        }
    });
    invoker.value = initialValue;
    initialValue.invoker = invoker;
    invoker.lastUpdated = getNow();
    return invoker;
}

function patchProp(el, key, nextValue, prevValue, isSVG, prevChildren, parentComponent, parentSuspense, unmountChildren) {
    switch (key) {
        // special
        case 'class':
            patchClass(el, nextValue, isSVG);
            break;
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        default:
            if (isOn(key)) {
                patchEvent(el, key.slice(2).toLowerCase(), prevValue, nextValue, parentComponent);
            }
            else if (!isSVG && key in el) {
                patchDOMProp(el, key, nextValue, prevChildren, parentComponent, parentSuspense, unmountChildren);
            }
            else {
                patchAttr(el, key, nextValue, isSVG);
            }
            break;
    }
}

const { render, createApp } = runtimeCore.createRenderer({
    patchProp,
    ...nodeOps
});

Object.keys(runtimeCore).forEach(function (k) {
  if (k !== 'default') Object.defineProperty(exports, k, {
    enumerable: true,
    get: function () {
      return runtimeCore[k];
    }
  });
});
exports.createApp = createApp;
exports.render = render;
