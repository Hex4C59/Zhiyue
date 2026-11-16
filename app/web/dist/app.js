// node_modules/@vue/shared/dist/shared.esm-bundler.js
// @__NO_SIDE_EFFECTS__
function e(e) {
	let t = /* @__PURE__ */ Object.create(null);
	for (let n of e.split(",")) t[n] = 1;
	return (e) => e in t;
}
var t = {}, n = [], r = () => {}, i = () => !1, a = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && (e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), o = (e) => e.startsWith("onUpdate:"), s = Object.assign, c = (e, t) => {
	let n = e.indexOf(t);
	n > -1 && e.splice(n, 1);
}, l = Object.prototype.hasOwnProperty, u = (e, t) => l.call(e, t), d = Array.isArray, f = (e) => x(e) === "[object Map]", p = (e) => x(e) === "[object Set]", m = (e) => x(e) === "[object Date]", h = (e) => typeof e == "function", g = (e) => typeof e == "string", _ = (e) => typeof e == "symbol", v = (e) => typeof e == "object" && !!e, y = (e) => (v(e) || h(e)) && h(e.then) && h(e.catch), b = Object.prototype.toString, x = (e) => b.call(e), S = (e) => x(e).slice(8, -1), C = (e) => x(e) === "[object Object]", w = (e) => g(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, ee = /* @__PURE__ */ e(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), te = (e) => {
	let t = /* @__PURE__ */ Object.create(null);
	return ((n) => t[n] || (t[n] = e(n)));
}, ne = /-\w/g, T = /* @__PURE__ */ te((e) => e.replace(ne, (e) => e.slice(1).toUpperCase())), re = /\B([A-Z])/g, ie = /* @__PURE__ */ te((e) => e.replace(re, "-$1").toLowerCase()), ae = /* @__PURE__ */ te((e) => e.charAt(0).toUpperCase() + e.slice(1)), oe = /* @__PURE__ */ te((e) => e ? `on${ae(e)}` : ""), se = (e, t) => !Object.is(e, t), ce = (e, ...t) => {
	for (let n = 0; n < e.length; n++) e[n](...t);
}, le = (e, t, n, r = !1) => {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		writable: r,
		value: n
	});
}, ue = (e) => {
	let t = parseFloat(e);
	return isNaN(t) ? e : t;
}, de, fe = () => de ||= typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
function pe(e) {
	if (d(e)) {
		let t = {};
		for (let n = 0; n < e.length; n++) {
			let r = e[n], i = g(r) ? _e(r) : pe(r);
			if (i) for (let e in i) t[e] = i[e];
		}
		return t;
	}
	if (g(e) || v(e)) return e;
}
var me = /;(?![^(]*\))/g, he = /:([^]+)/, ge = /"(?:[^"\\]|\\[^])*"|'(?:[^'\\]|\\[^])*'|\\[^]|\/\*[^]*?\*\//g;
function _e(e) {
	let t = {};
	return e.replace(ge, (e) => e.startsWith("/*") ? "" : e).split(me).forEach((e) => {
		if (e) {
			let n = e.split(he);
			n.length > 1 && (t[n[0].trim()] = n[1].trim());
		}
	}), t;
}
function E(e) {
	let t = "";
	if (g(e)) t = e;
	else if (d(e)) for (let n = 0; n < e.length; n++) {
		let r = E(e[n]);
		r && (t += r + " ");
	}
	else if (v(e)) for (let n in e) e[n] && (t += n + " ");
	return t.trim();
}
var ve = /* @__PURE__ */ e("itemscope,allowfullscreen,disablepictureinpicture,disableremoteplayback,formnovalidate,ismap,nomodule,novalidate,playsinline,readonly");
function ye(e) {
	return !!e || e === "";
}
function be(e, t, n) {
	if (e.length !== t.length) return !1;
	let r = !0;
	for (let i = 0; r && i < e.length; i++) r = D(e[i], t[i], n);
	return r;
}
function xe(e, t, n) {
	if (e.size !== t.size) return !1;
	let r = Array.from(t), i = new Uint8Array(r.length);
	for (let t of e) {
		let e = -1;
		for (let a = 0; a < r.length; a++) if (!i[a] && D(t, r[a], n)) {
			e = a;
			break;
		}
		if (e < 0) return !1;
		i[e] = 1;
	}
	return !0;
}
function Se(e, t, n) {
	let r = f(e), i = f(t);
	if (r || i || (r = p(e), i = p(t), r || i)) return r && i ? xe(e, t, n) : !1;
	if (Object.keys(e).length !== Object.keys(t).length) return !1;
	for (let r in e) {
		let i = e.hasOwnProperty(r), a = t.hasOwnProperty(r);
		if (i && !a || !i && a || !D(e[r], t[r], n)) return !1;
	}
	return String(e) === String(t);
}
function Ce(e, t, n, r) {
	n ||= [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
	let [i, a] = n;
	if (i.has(e) || a.has(t)) return i.get(e) === t && a.get(t) === e;
	i.set(e, t), a.set(t, e);
	let o = r(e, t, n);
	return i.delete(e), a.delete(t), o;
}
function D(e, t, n) {
	if (e === t) return !0;
	let r = m(e), i = m(t);
	return r || i ? r && i ? e.getTime() === t.getTime() : !1 : (r = _(e), i = _(t), r || i ? e === t : (r = d(e), i = d(t), r || i ? r && i ? Ce(e, t, n, be) : !1 : (r = v(e), i = v(t), r || i ? !r || !i ? !1 : Ce(e, t, n, Se) : String(e) === String(t))));
}
function we(e, t) {
	return e.findIndex((e) => D(e, t));
}
var Te = (e) => !!(e && e.__v_isRef === !0), O = (e) => g(e) ? e : e == null ? "" : d(e) || v(e) && (e.toString === b || !h(e.toString)) ? Te(e) ? O(e.value) : JSON.stringify(e, Ee, 2) : String(e), Ee = (e, t) => Te(t) ? Ee(e, t.value) : f(t) ? { [`Map(${t.size})`]: [...t.entries()].reduce((e, [t, n], r) => (e[De(t, r) + " =>"] = n, e), {}) } : p(t) ? { [`Set(${t.size})`]: [...t.values()].map((e) => De(e)) } : _(t) ? De(t) : v(t) && !d(t) && !C(t) ? String(t) : t, De = (e, t = "") => _(e) ? `Symbol(${e.description ?? t})` : e, k, Oe = class {
	constructor(e = !1) {
		this.detached = e, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this._warnOnRun = !0, this.__v_skip = !0, !e && k && (k.active ? (this.parent = k, this.index = (k.scopes || (k.scopes = [])).push(this) - 1) : (this._active = !1, this._warnOnRun = !1));
	}
	get active() {
		return this._active;
	}
	pause() {
		if (this._active) {
			this._isPaused = !0;
			let e, t;
			if (this.scopes) {
				let n = this.scopes.slice();
				for (e = 0, t = n.length; e < t; e++) n[e].pause();
			}
			for (e = 0, t = this.effects.length; e < t; e++) this.effects[e].pause();
		}
	}
	resume() {
		if (this._active && this._isPaused) {
			this._isPaused = !1;
			let e, t;
			if (this.scopes) {
				let n = this.scopes.slice();
				for (e = 0, t = n.length; e < t; e++) n[e].resume();
			}
			let n = this.effects.slice();
			for (e = 0, t = n.length; e < t; e++) n[e].resume();
		}
	}
	run(e) {
		if (this._active) {
			let t = k;
			try {
				return k = this, e();
			} finally {
				k = t;
			}
		}
	}
	on() {
		++this._on === 1 && (this.prevScope = k, k = this);
	}
	off() {
		if (this._on > 0 && --this._on === 0) {
			if (k === this) k = this.prevScope;
			else {
				let e = k;
				for (; e;) {
					if (e.prevScope === this) {
						e.prevScope = this.prevScope;
						break;
					}
					e = e.prevScope;
				}
			}
			this.prevScope = void 0;
		}
	}
	stop(e) {
		if (this._active) {
			this._active = !1;
			let t, n;
			for (t = 0, n = this.effects.length; t < n; t++) this.effects[t].stop();
			for (this.effects.length = 0, t = 0, n = this.cleanups.length; t < n; t++) this.cleanups[t]();
			if (this.cleanups.length = 0, this.scopes) {
				let e = this.scopes.slice();
				for (t = 0, n = e.length; t < n; t++) e[t].stop(!0);
				this.scopes.length = 0;
			}
			if (!this.detached && this.parent && !e) {
				let e = this.parent.scopes.pop();
				e && e !== this && (this.parent.scopes[this.index] = e, e.index = this.index);
			}
			this.parent = void 0;
		}
	}
};
function ke() {
	return k;
}
var A, Ae = /* @__PURE__ */ new WeakSet(), je = class {
	constructor(e) {
		this.fn = e, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, k && (k.active ? k.effects.push(this) : this.flags &= -2);
	}
	pause() {
		this.flags |= 64;
	}
	resume() {
		this.flags & 64 && (this.flags &= -65, Ae.has(this) && (Ae.delete(this), this.trigger()));
	}
	notify() {
		this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Fe(this);
	}
	run() {
		if (!(this.flags & 1)) return this.fn();
		this.flags |= 2, Je(this), Re(this);
		let e = A, t = We;
		A = this, We = !0;
		try {
			return this.fn();
		} finally {
			ze(this), A = e, We = t, this.flags &= -3;
		}
	}
	stop() {
		if (this.flags & 1) {
			for (let e = this.deps; e; e = e.nextDep) He(e);
			this.deps = this.depsTail = void 0, Je(this), this.onStop && this.onStop(), this.flags &= -2;
		}
	}
	trigger() {
		this.flags & 64 ? Ae.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
	}
	runIfDirty() {
		Be(this) && this.run();
	}
	get dirty() {
		return Be(this);
	}
}, Me = 0, Ne, Pe;
function Fe(e, t = !1) {
	e.flags |= 8, t ? (e.next = Pe, Pe = e) : (e.next = Ne, Ne = e);
}
function Ie() {
	Me++;
}
function Le() {
	if (--Me > 0) return;
	if (Pe) {
		let e = Pe;
		for (Pe = void 0; e;) {
			let t = e.next;
			e.next = void 0, e.flags &= -9, e = t;
		}
	}
	let e;
	for (; Ne;) {
		let t = Ne;
		for (Ne = void 0; t;) {
			let n = t.next;
			if (t.next = void 0, t.flags &= -9, t.flags & 1) try {
				t.trigger();
			} catch (t) {
				e ||= t;
			}
			t = n;
		}
	}
	if (e) throw e;
}
function Re(e) {
	for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function ze(e) {
	let t, n = e.depsTail, r = n;
	for (; r;) {
		let e = r.prevDep;
		r.version === -1 ? (r === n && (n = e), He(r), Ue(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = e;
	}
	e.deps = t, e.depsTail = n;
}
function Be(e) {
	for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Ve(t.dep.computed) || t.dep.version !== t.version)) return !0;
	return !!e._dirty;
}
function Ve(e) {
	if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Ye) || (e.globalVersion = Ye, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Be(e)))) return;
	e.flags |= 2;
	let t = e.dep, n = A, r = We;
	A = e, We = !0;
	try {
		Re(e);
		let n = e.fn(e._value);
		(t.version === 0 || se(n, e._value)) && (e.flags |= 128, e._value = n, t.version++);
	} catch (e) {
		throw t.version++, e;
	} finally {
		A = n, We = r, ze(e), e.flags &= -3;
	}
}
function He(e, t = !1) {
	let { dep: n, prevSub: r, nextSub: i } = e;
	if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
		n.computed.flags &= -5;
		for (let e = n.computed.deps; e; e = e.nextDep) He(e, !0);
	}
	!t && !--n.sc && n.map && n.map.delete(n.key);
}
function Ue(e) {
	let { prevDep: t, nextDep: n } = e;
	t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
var We = !0, Ge = [];
function Ke() {
	Ge.push(We), We = !1;
}
function qe() {
	let e = Ge.pop();
	We = e === void 0 || e;
}
function Je(e) {
	let { cleanup: t } = e;
	if (e.cleanup = void 0, t) {
		let e = A;
		A = void 0;
		try {
			t();
		} finally {
			A = e;
		}
	}
}
var Ye = 0, Xe = class {
	constructor(e, t) {
		this.sub = e, this.dep = t, this.version = t.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
	}
}, Ze = class {
	constructor(e) {
		this.computed = e, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
	}
	track(e) {
		if (!A || !We || A === this.computed) return;
		let t = this.activeLink;
		if (t === void 0 || t.sub !== A) t = this.activeLink = new Xe(A, this), A.deps ? (t.prevDep = A.depsTail, A.depsTail.nextDep = t, A.depsTail = t) : A.deps = A.depsTail = t, Qe(t);
		else if (t.version === -1 && (t.version = this.version, t.nextDep)) {
			let e = t.nextDep;
			e.prevDep = t.prevDep, t.prevDep && (t.prevDep.nextDep = e), t.prevDep = A.depsTail, t.nextDep = void 0, A.depsTail.nextDep = t, A.depsTail = t, A.deps === t && (A.deps = e);
		}
		return t;
	}
	trigger(e) {
		this.version++, Ye++, this.notify(e);
	}
	notify(e) {
		Ie();
		try {
			for (let e = this.subs; e; e = e.prevSub) e.sub.notify() && e.sub.dep.notify();
		} finally {
			Le();
		}
	}
};
function Qe(e) {
	if (e.dep.sc++, e.sub.flags & 4) {
		let t = e.dep.computed;
		if (t && !e.dep.subs) {
			t.flags |= 20;
			for (let e = t.deps; e; e = e.nextDep) Qe(e);
		}
		let n = e.dep.subs;
		n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
	}
}
var $e = /* @__PURE__ */ new WeakMap(), et = /* @__PURE__ */ Symbol(""), tt = /* @__PURE__ */ Symbol(""), nt = /* @__PURE__ */ Symbol("");
function j(e, t, n) {
	if (We && A) {
		let t = $e.get(e);
		t || $e.set(e, t = /* @__PURE__ */ new Map());
		let r = t.get(n);
		r || (t.set(n, r = new Ze()), r.map = t, r.key = n), r.track();
	}
}
function rt(e, t, n, r, i, a) {
	let o = $e.get(e);
	if (!o) {
		Ye++;
		return;
	}
	let s = (e) => {
		e && e.trigger();
	};
	if (Ie(), t === "clear") o.forEach(s);
	else {
		let i = d(e), a = i && w(n);
		if (i && n === "length") {
			let e = Number(r);
			o.forEach((t, n) => {
				(n === "length" || n === nt || !_(n) && n >= e) && s(t);
			});
		} else switch ((n !== void 0 || o.has(void 0)) && s(o.get(n)), a && s(o.get(nt)), t) {
			case "add":
				i ? a && s(o.get("length")) : (s(o.get(et)), f(e) && s(o.get(tt)));
				break;
			case "delete":
				i || (s(o.get(et)), f(e) && s(o.get(tt)));
				break;
			case "set": f(e) && s(o.get(et));
		}
	}
	Le();
}
function it(e) {
	let t = /* @__PURE__ */ N(e);
	return t === e || (j(t, "iterate", nt), /* @__PURE__ */ M(e)) ? t : /* @__PURE__ */ Ut(e) ? /* @__PURE__ */ Ht(e) ? t.map((e) => Kt(P(e))) : t.map(Kt) : t.map(P);
}
function at(e) {
	return j(e = /* @__PURE__ */ N(e), "iterate", nt), e;
}
function ot(e, t) {
	return /* @__PURE__ */ Ut(e) ? Kt(/* @__PURE__ */ Ht(e) ? P(t) : t) : P(t);
}
var st = {
	__proto__: null,
	[Symbol.iterator]() {
		return ct(this, Symbol.iterator, (e) => ot(this, e));
	},
	concat(...e) {
		return it(this).concat(...e.map((e) => d(e) ? it(e) : e));
	},
	entries() {
		return ct(this, "entries", (e) => (e[1] = ot(this, e[1]), e));
	},
	every(e, t) {
		return dt(this, "every", e, t, void 0, arguments);
	},
	filter(e, t) {
		return dt(this, "filter", e, t, (e) => e.map((e) => ot(this, e)), arguments);
	},
	find(e, t) {
		return dt(this, "find", e, t, (e) => ot(this, e), arguments);
	},
	findIndex(e, t) {
		return dt(this, "findIndex", e, t, void 0, arguments);
	},
	findLast(e, t) {
		return dt(this, "findLast", e, t, (e) => ot(this, e), arguments);
	},
	findLastIndex(e, t) {
		return dt(this, "findLastIndex", e, t, void 0, arguments);
	},
	forEach(e, t) {
		return dt(this, "forEach", e, t, void 0, arguments);
	},
	includes(...e) {
		return pt(this, "includes", e);
	},
	indexOf(...e) {
		return pt(this, "indexOf", e);
	},
	join(e) {
		return it(this).join(e);
	},
	lastIndexOf(...e) {
		return pt(this, "lastIndexOf", e);
	},
	map(e, t) {
		return dt(this, "map", e, t, void 0, arguments);
	},
	pop() {
		return mt(this, "pop");
	},
	push(...e) {
		return mt(this, "push", e);
	},
	reduce(e, ...t) {
		return ft(this, "reduce", e, t);
	},
	reduceRight(e, ...t) {
		return ft(this, "reduceRight", e, t);
	},
	shift() {
		return mt(this, "shift");
	},
	some(e, t) {
		return dt(this, "some", e, t, void 0, arguments);
	},
	splice(...e) {
		return mt(this, "splice", e);
	},
	toReversed() {
		return it(this).toReversed();
	},
	toSorted(e) {
		return it(this).toSorted(e);
	},
	toSpliced(...e) {
		return it(this).toSpliced(...e);
	},
	unshift(...e) {
		return mt(this, "unshift", e);
	},
	values() {
		return ct(this, "values", (e) => ot(this, e));
	}
};
function ct(e, t, n) {
	let r = at(e), i = r[t], a = i.call(r);
	if (r !== e && !/* @__PURE__ */ M(e)) {
		if (a[Symbol.toStringTag] === "Array Iterator") {
			let e = Object.create(Object.getPrototypeOf(a));
			return e.next = () => lt(a.next(), n), i !== ut[t] && Object.defineProperties(e, {
				return: { get() {
					let e = a.return;
					return typeof e == "function" ? e.bind(a) : e;
				} },
				throw: { get() {
					let e = a.throw;
					return typeof e == "function" ? e.bind(a) : e;
				} }
			}), e;
		}
		a._next = a.next, a.next = () => lt(a._next(), n);
	}
	return a;
}
function lt(e, t) {
	return e.done || (e.value = t(e.value)), e;
}
var ut = Array.prototype;
function dt(e, t, n, r, i, a) {
	let o = at(e), s = o !== e && !/* @__PURE__ */ M(e), c = o[t];
	if (c !== ut[t]) {
		let t = c.apply(e, a);
		return s ? P(t) : t;
	}
	let l = n;
	o !== e && (s ? l = function(t, r) {
		return n.call(this, ot(e, t), r, e);
	} : n.length > 2 && (l = function(t, r) {
		return n.call(this, t, r, e);
	}));
	let u = c.call(o, l, r);
	return s && i ? i(u) : u;
}
function ft(e, t, n, r) {
	let i = at(e), a = i !== e && !/* @__PURE__ */ M(e), o = n, s = !1;
	i !== e && (a ? (s = r.length === 0, o = function(t, r, i) {
		return s && (s = !1, t = ot(e, t)), n.call(this, t, ot(e, r), i, e);
	}) : n.length > 3 && (o = function(t, r, i) {
		return n.call(this, t, r, i, e);
	}));
	let c = i[t](o, ...r);
	return s ? ot(e, c) : c;
}
function pt(e, t, n) {
	let r = /* @__PURE__ */ N(e);
	j(r, "iterate", nt);
	let i = r[t](...n);
	return (i === -1 || i === !1) && /* @__PURE__ */ Wt(n[0]) ? (n[0] = /* @__PURE__ */ N(n[0]), r[t](...n)) : i;
}
function mt(e, t, n = []) {
	Ke(), Ie();
	let r = (/* @__PURE__ */ N(e))[t].apply(e, n);
	return Le(), qe(), r;
}
var ht = /* @__PURE__ */ e("__proto__,__v_isRef,__isVue"), gt = /* @__PURE__ */ new Set(/* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(_));
function _t(e) {
	_(e) || (e = String(e));
	let t = /* @__PURE__ */ N(this);
	return j(t, "has", e), t.hasOwnProperty(e);
}
var vt = class {
	constructor(e = !1, t = !1) {
		this._isReadonly = e, this._isShallow = t;
	}
	get(e, t, n) {
		if (t === "__v_skip") return e.__v_skip;
		let r = this._isReadonly, i = this._isShallow;
		if (t === "__v_isReactive") return !r;
		if (t === "__v_isReadonly") return r;
		if (t === "__v_isShallow") return i;
		if (t === "__v_raw") return n === (r ? i ? It : Ft : i ? Pt : Nt).get(e) || Object.getPrototypeOf(e) === Object.getPrototypeOf(n) ? e : void 0;
		let a = d(e);
		if (!r) {
			let e;
			if (a && (e = st[t])) return e;
			if (t === "hasOwnProperty") return _t;
		}
		let o = Reflect.get(e, t, /* @__PURE__ */ F(e) ? e : n);
		if ((_(t) ? gt.has(t) : ht(t)) || (r || j(e, "get", t), i)) return o;
		if (/* @__PURE__ */ F(o)) {
			let e = a && w(t) ? o : o.value;
			return r && v(e) ? /* @__PURE__ */ Bt(e) : e;
		}
		return v(o) ? r ? /* @__PURE__ */ Bt(o) : /* @__PURE__ */ Rt(o) : o;
	}
}, yt = class extends vt {
	constructor(e = !1) {
		super(!1, e);
	}
	set(e, t, n, r) {
		let i = e[t], a = d(e) && w(t);
		if (!this._isShallow) {
			let e = /* @__PURE__ */ Ut(i);
			if (!/* @__PURE__ */ M(n) && !/* @__PURE__ */ Ut(n) && (i = /* @__PURE__ */ N(i), n = /* @__PURE__ */ N(n)), !a && /* @__PURE__ */ F(i) && !/* @__PURE__ */ F(n)) return e || (i.value = n), !0;
		}
		let o = a ? Number(t) < e.length : u(e, t), s = Reflect.set(e, t, n, /* @__PURE__ */ F(e) ? e : r);
		return e === /* @__PURE__ */ N(r) && s && (o ? se(n, i) && rt(e, "set", t, n, i) : rt(e, "add", t, n)), s;
	}
	deleteProperty(e, t) {
		let n = u(e, t), r = e[t], i = Reflect.deleteProperty(e, t);
		return i && n && rt(e, "delete", t, void 0, r), i;
	}
	has(e, t) {
		let n = Reflect.has(e, t);
		return _(t) && gt.has(t) || j(e, "has", t), n;
	}
	ownKeys(e) {
		return j(e, "iterate", d(e) ? "length" : et), Reflect.ownKeys(e);
	}
}, bt = class extends vt {
	constructor(e = !1) {
		super(!0, e);
	}
	set(e, t) {
		return !0;
	}
	deleteProperty(e, t) {
		return !0;
	}
}, xt = /* @__PURE__ */ new yt(), St = /* @__PURE__ */ new bt(), Ct = /* @__PURE__ */ new yt(!0), wt = (e) => e, Tt = (e) => Reflect.getPrototypeOf(e);
function Et(e, t, n) {
	return function(...r) {
		let i = this.__v_raw, a = /* @__PURE__ */ N(i), o = f(a), c = e === "entries" || e === Symbol.iterator && o, l = e === "keys" && o, u = i[e](...r), d = n ? wt : t ? Kt : P;
		return !t && j(a, "iterate", l ? tt : et), s(Object.create(u), { next() {
			let { value: e, done: t } = u.next();
			return t ? {
				value: e,
				done: t
			} : {
				value: c ? [d(e[0]), d(e[1])] : d(e),
				done: t
			};
		} });
	};
}
function Dt(e) {
	return function(...t) {
		return e === "delete" ? !1 : e === "clear" ? void 0 : this;
	};
}
function Ot(e, t) {
	let n = {
		get(n) {
			let r = this.__v_raw, i = /* @__PURE__ */ N(r), a = /* @__PURE__ */ N(n);
			e || (se(n, a) && j(i, "get", n), j(i, "get", a));
			let { has: o } = Tt(i), s = t ? wt : e ? Kt : P;
			if (o.call(i, n)) return s(r.get(n));
			if (o.call(i, a)) return s(r.get(a));
			r !== i && r.get(n);
		},
		get size() {
			let t = this.__v_raw;
			return !e && j(/* @__PURE__ */ N(t), "iterate", et), t.size;
		},
		has(t) {
			let n = this.__v_raw, r = /* @__PURE__ */ N(n), i = /* @__PURE__ */ N(t);
			return e || (se(t, i) && j(r, "has", t), j(r, "has", i)), t === i ? n.has(t) : n.has(t) || n.has(i);
		},
		forEach(n, r) {
			let i = this, a = i.__v_raw, o = /* @__PURE__ */ N(a), s = t ? wt : e ? Kt : P;
			return !e && j(o, "iterate", et), a.forEach((e, t) => n.call(r, s(e), s(t), i));
		}
	};
	return s(n, e ? {
		add: Dt("add"),
		set: Dt("set"),
		delete: Dt("delete"),
		clear: Dt("clear")
	} : {
		add(e) {
			let n = /* @__PURE__ */ N(this), r = Tt(n), i = /* @__PURE__ */ N(e), a = !t && !/* @__PURE__ */ M(e) && !/* @__PURE__ */ Ut(e) ? i : e;
			return r.has.call(n, a) || se(e, a) && r.has.call(n, e) || se(i, a) && r.has.call(n, i) || (n.add(a), rt(n, "add", a, a)), this;
		},
		set(e, n) {
			t || /* @__PURE__ */ M(n) || /* @__PURE__ */ Ut(n) || (n = /* @__PURE__ */ N(n));
			let r = /* @__PURE__ */ N(this), { has: i, get: a } = Tt(r), o = i.call(r, e);
			o ||= (e = /* @__PURE__ */ N(e), i.call(r, e));
			let s = a.call(r, e);
			return r.set(e, n), o ? se(n, s) && rt(r, "set", e, n, s) : rt(r, "add", e, n), this;
		},
		delete(e) {
			let t = /* @__PURE__ */ N(this), { has: n, get: r } = Tt(t), i = n.call(t, e);
			i ||= (e = /* @__PURE__ */ N(e), n.call(t, e));
			let a = r ? r.call(t, e) : void 0, o = t.delete(e);
			return i && rt(t, "delete", e, void 0, a), o;
		},
		clear() {
			let e = /* @__PURE__ */ N(this), t = e.size !== 0, n = e.clear();
			return t && rt(e, "clear", void 0, void 0, void 0), n;
		}
	}), [
		"keys",
		"values",
		"entries",
		Symbol.iterator
	].forEach((r) => {
		n[r] = Et(r, e, t);
	}), n;
}
function kt(e, t) {
	let n = Ot(e, t);
	return (r, i, a) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_isShallow" ? t : i === "__v_raw" ? r : Reflect.get(u(n, i) && i in r ? n : r, i, a);
}
var At = { get: /* @__PURE__ */ kt(!1, !1) }, jt = { get: /* @__PURE__ */ kt(!1, !0) }, Mt = { get: /* @__PURE__ */ kt(!0, !1) }, Nt = /* @__PURE__ */ new WeakMap(), Pt = /* @__PURE__ */ new WeakMap(), Ft = /* @__PURE__ */ new WeakMap(), It = /* @__PURE__ */ new WeakMap();
function Lt(e) {
	switch (e) {
		case "Object":
		case "Array": return 1;
		case "Map":
		case "Set":
		case "WeakMap":
		case "WeakSet": return 2;
		default: return 0;
	}
}
// @__NO_SIDE_EFFECTS__
function Rt(e) {
	return /* @__PURE__ */ Ut(e) ? e : Vt(e, !1, xt, At, Nt);
}
// @__NO_SIDE_EFFECTS__
function zt(e) {
	return Vt(e, !1, Ct, jt, Pt);
}
// @__NO_SIDE_EFFECTS__
function Bt(e) {
	return Vt(e, !0, St, Mt, Ft);
}
function Vt(e, t, n, r, i) {
	if (!v(e) || e.__v_raw && !(t && e.__v_isReactive) || e.__v_skip || !Object.isExtensible(e)) return e;
	let a = i.get(e);
	if (a) return a;
	let o = Lt(S(e));
	if (o === 0) return e;
	let s = new Proxy(e, o === 2 ? r : n);
	return i.set(e, s), s;
}
// @__NO_SIDE_EFFECTS__
function Ht(e) {
	return /* @__PURE__ */ Ut(e) ? /* @__PURE__ */ Ht(e.__v_raw) : !!(e && e.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function Ut(e) {
	return !!(e && e.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function M(e) {
	return !!(e && e.__v_isShallow);
}
// @__NO_SIDE_EFFECTS__
function Wt(e) {
	return e ? !!e.__v_raw : !1;
}
// @__NO_SIDE_EFFECTS__
function N(e) {
	let t = e && e.__v_raw;
	return t ? /* @__PURE__ */ N(t) : e;
}
function Gt(e) {
	return !u(e, "__v_skip") && Object.isExtensible(e) && le(e, "__v_skip", !0), e;
}
var P = (e) => v(e) ? /* @__PURE__ */ Rt(e) : e, Kt = (e) => v(e) ? /* @__PURE__ */ Bt(e) : e;
// @__NO_SIDE_EFFECTS__
function F(e) {
	return e ? e.__v_isRef === !0 : !1;
}
// @__NO_SIDE_EFFECTS__
function qt(e) {
	return Jt(e, !1);
}
function Jt(e, t) {
	return /* @__PURE__ */ F(e) ? e : new Yt(e, t);
}
var Yt = class {
	constructor(e, t) {
		this.dep = new Ze(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = t ? e : /* @__PURE__ */ N(e), this._value = t ? e : P(e), this.__v_isShallow = t;
	}
	get value() {
		return this.dep.track(), this._value;
	}
	set value(e) {
		let t = this._rawValue, n = this.__v_isShallow || /* @__PURE__ */ M(e) || /* @__PURE__ */ Ut(e);
		e = n ? e : /* @__PURE__ */ N(e), se(e, t) && (this._rawValue = e, this._value = n ? e : P(e), this.dep.trigger());
	}
};
function I(e) {
	return /* @__PURE__ */ F(e) ? e.value : e;
}
var Xt = {
	get: (e, t, n) => t === "__v_raw" ? e : I(Reflect.get(e, t, n)),
	set: (e, t, n, r) => {
		let i = e[t];
		return /* @__PURE__ */ F(i) && !/* @__PURE__ */ F(n) ? (i.value = n, !0) : Reflect.set(e, t, n, r);
	}
};
function Zt(e) {
	return /* @__PURE__ */ Ht(e) ? e : new Proxy(e, Xt);
}
var Qt = class {
	constructor(e, t, n) {
		this.fn = e, this.setter = t, this._value = void 0, this.dep = new Ze(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Ye - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !t, this.isSSR = n;
	}
	notify() {
		if (this.flags |= 16, !(this.flags & 8) && A !== this) return Fe(this, !0), !0;
	}
	get value() {
		let e = this.dep.track();
		return Ve(this), e && (e.version = this.dep.version), this._value;
	}
	set value(e) {
		this.setter && this.setter(e);
	}
};
// @__NO_SIDE_EFFECTS__
function $t(e, t, n = !1) {
	let r, i;
	return h(e) ? r = e : (r = e.get, i = e.set), new Qt(r, i, n);
}
var en = {}, tn = /* @__PURE__ */ new WeakMap(), nn = void 0;
function rn(e, t = !1, n = nn) {
	if (n) {
		let t = tn.get(n);
		t || tn.set(n, t = []), t.push(e);
	}
}
function an(e, n, i = t) {
	let { immediate: a, deep: o, once: s, scheduler: l, augmentJob: u, call: f } = i, p = (e) => o ? e : /* @__PURE__ */ M(e) || o === !1 || o === 0 ? on(e, 1) : on(e), m, g, _, v, y = !1, b = !1;
	if (/* @__PURE__ */ F(e) ? (g = () => e.value, y = /* @__PURE__ */ M(e)) : /* @__PURE__ */ Ht(e) ? (g = () => p(e), y = !0) : d(e) ? (b = !0, y = e.some((e) => /* @__PURE__ */ Ht(e) || /* @__PURE__ */ M(e)), g = () => e.map((e) => {
		if (/* @__PURE__ */ F(e)) return e.value;
		if (/* @__PURE__ */ Ht(e)) return p(e);
		if (h(e)) return f ? f(e, 2) : e();
	})) : g = h(e) ? n ? f ? () => f(e, 2) : e : () => {
		if (_) {
			Ke();
			try {
				_();
			} finally {
				qe();
			}
		}
		let t = nn;
		nn = m;
		try {
			return f ? f(e, 3, [v]) : e(v);
		} finally {
			nn = t;
		}
	} : r, n && o) {
		let e = g, t = o === !0 ? Infinity : o;
		g = () => on(e(), t);
	}
	let x = ke(), S = () => {
		m.stop(), x && x.active && c(x.effects, m);
	};
	if (s && n) {
		let e = n;
		n = (...t) => {
			try {
				return e(...t);
			} finally {
				S();
			}
		};
	}
	let C = b ? Array(e.length).fill(en) : en, w = (e) => {
		if (m.flags & 1 && (m.dirty || e)) {
			if (n) {
				let t = m.run();
				if (e || o || y || (b ? t.some((e, t) => se(e, C[t])) : se(t, C))) {
					let e = nn;
					Ke();
					try {
						_ && _(), nn = m;
						let e = [
							t,
							C === en ? void 0 : b && C[0] === en ? [] : C,
							v
						];
						C = t, f ? f(n, 3, e) : n(...e);
					} finally {
						nn = e, qe();
					}
				}
			} else m.run();
		}
	};
	return u && u(w), m = new je(g), m.scheduler = l ? () => l(w, !1) : w, v = (e) => rn(e, !1, m), _ = m.onStop = () => {
		let e = tn.get(m);
		if (e) {
			if (f) f(e, 4);
			else for (let t of e) t();
			tn.delete(m);
		}
	}, n ? a ? w(!0) : C = m.run() : l ? l(w.bind(null, !0), !0) : m.run(), S.pause = m.pause.bind(m), S.resume = m.resume.bind(m), S.stop = S, S;
}
function on(e, t = Infinity, n) {
	if (t <= 0 || !v(e) || e.__v_skip || (n ||= /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
	if (n.set(e, t), t--, /* @__PURE__ */ F(e)) on(e.value, t, n);
	else if (d(e)) for (let r = 0; r < e.length; r++) on(e[r], t, n);
	else if (p(e) || f(e)) e.forEach((e) => {
		on(e, t, n);
	});
	else if (C(e)) {
		for (let r in e) on(e[r], t, n);
		for (let r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && on(e[r], t, n);
	}
	return e;
}
// node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js
function sn(e, t, n, r) {
	try {
		return r ? e(...r) : e();
	} catch (e) {
		ln(e, t, n);
	}
}
function cn(e, t, n, r) {
	if (h(e)) {
		let i = sn(e, t, n, r);
		return i && y(i) && i.catch((e) => {
			ln(e, t, n, void 0, !0);
		}), i;
	}
	if (d(e)) {
		let i = [];
		for (let a = 0; a < e.length; a++) i.push(cn(e[a], t, n, r));
		return i;
	}
}
function ln(e, n, r, i = !0, a = !1) {
	let o = n ? n.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: c } = n && n.appContext.config || t;
	if (n) {
		let t = n.parent, i = n.proxy, o = `https://vuejs.org/error-reference/#runtime-${r}`;
		for (; t;) {
			let n = t.ec;
			if (n && !t.isUnmounted && (!a || t.scope.active)) {
				for (let t = 0; t < n.length; t++) if (n[t](e, i, o) === !1) return;
			}
			t = t.parent;
		}
		if (s) {
			Ke(), sn(s, null, 10, [
				e,
				i,
				o
			]), qe();
			return;
		}
	}
	un(e, r, o, i, c);
}
function un(e, t, n, r = !0, i = !1) {
	if (i) throw e;
	console.error(e);
}
var L = [], dn = -1, fn = [], pn = null, mn = 0, hn = /* @__PURE__ */ Promise.resolve(), gn = null;
function _n(e) {
	let t = gn || hn;
	return e ? t.then(this ? e.bind(this) : e) : t;
}
function vn(e) {
	let t = dn + 1, n = L.length;
	for (; t < n;) {
		let r = t + n >>> 1, i = L[r], a = En(i);
		a < e || a === e && i.flags & 2 ? t = r + 1 : n = r;
	}
	return t;
}
function yn(e) {
	if (!(e.flags & 1)) {
		let t = En(e), n = L[L.length - 1];
		!n || !(e.flags & 2) && t >= En(n) ? L.push(e) : L.splice(vn(t), 0, e), e.flags |= 1, bn();
	}
}
function bn() {
	gn ||= hn.then(Dn);
}
function xn(e) {
	if (!d(e)) pn && e.id === -1 ? pn.splice(mn + 1, 0, e) : e.flags & 1 || (fn.push(e), e.flags |= 1);
	else for (let t = 0; t < e.length; t++) fn.push(e[t]);
	bn();
}
function Sn(e, t, n, r = dn + 1) {
	for (; r < L.length; r++) {
		let n = L[r];
		if (n && n.flags & 2) {
			if (e && n.id !== e.uid || t !== void 0 && !(n.id >= t)) continue;
			L.splice(r, 1), r = e ? r - 1 : dn, n.flags & 4 && (n.flags &= -2), n(), n.flags & 4 || (n.flags &= -2);
		}
	}
}
function Cn(e, t, n = 0) {
	if (fn.length) {
		let e = fn, r = 0;
		if (t) {
			e = [];
			for (let i = 0; i < fn.length; i++) {
				let a = fn[i];
				(a.i === void 0 ? t.has(a) : !a.i || a.i.uid < n) ? fn[r++] = a : e.push(a);
			}
		}
		let i = [...new Set(e)].sort((e, t) => En(e) - En(t));
		if (fn.length = r, pn) {
			for (let e = 0; e < i.length; e++) pn.push(i[e]);
			return;
		}
		for (pn = i, mn = 0; mn < pn.length; mn++) {
			let e = pn[mn];
			e.flags & 4 && (e.flags &= -2), e.flags & 8 || e(), e.flags &= -2;
		}
		pn = null, mn = 0;
	}
}
var wn = !1;
function Tn(e, t) {
	if (wn) {
		e();
		return;
	}
	let n = t === void 0 ? void 0 : new Set(fn);
	e(), wn = !0;
	try {
		Sn(void 0, t), Cn(void 0, n, t);
	} finally {
		wn = !1;
	}
}
var En = (e) => e.id == null ? e.flags & 2 ? -1 : Infinity : e.id;
function Dn(e) {
	try {
		for (dn = 0; dn < L.length; dn++) {
			let e = L[dn];
			e && !(e.flags & 8) && (e.flags & 4 && (e.flags &= -2), sn(e, e.i, e.i ? 15 : 14), e.flags & 4 || (e.flags &= -2));
		}
	} finally {
		for (; dn < L.length; dn++) {
			let e = L[dn];
			e && (e.flags &= -2);
		}
		dn = -1, L.length = 0, Cn(e), gn = null, (L.length || fn.length) && Dn(e);
	}
}
var On = null, kn = null;
function An(e) {
	let t = On;
	return On = e, kn = e && e.type.__scopeId || null, t;
}
function jn(e, t = On, n) {
	if (!t || e._n) return e;
	let r = (...n) => {
		r._d && oi(-1);
		let i = An(t), a = ri.length, o;
		try {
			o = e(...n);
		} finally {
			for (let e = ri.length; e > a; e--) ii();
			An(i), r._d && oi(1);
		}
		return o;
	};
	return r._n = !0, r._c = !0, r._d = !0, r;
}
function R(e, n) {
	if (On === null) return e;
	let r = zi(On), i = e.dirs ||= [];
	for (let e = 0; e < n.length; e++) {
		let [a, o, s, c = t] = n[e];
		a && (h(a) && (a = {
			mounted: a,
			updated: a
		}), a.deep && on(o), i.push({
			dir: a,
			instance: r,
			value: o,
			oldValue: void 0,
			arg: s,
			modifiers: c
		}));
	}
	return e;
}
function Mn(e, t, n, r) {
	let i = e;
	if (r === "beforeMount") e._mount = e;
	else if (r === "beforeUpdate") {
		let n = t && t._mount;
		n && (n._latest = e, e._mount = n);
	} else if (r === "mounted") {
		let t = e._latest;
		e._mount = e._latest = void 0, t && (i = t, t._mount = void 0);
	}
	let a = i.dirs, o = t && t.dirs;
	for (let c = 0; c < a.length; c++) {
		let l = a[c];
		o ? l.oldValue = o[c].value : r === "mounted" && l.oldValue !== void 0 && (l = s({}, l, { oldValue: void 0 }));
		let u = l.dir[r];
		u && (Ke(), cn(u, n, 8, [
			e.el,
			l,
			i,
			t
		]), qe());
	}
}
function Nn(e, t) {
	if (Y) {
		let n = Y.provides, r = Y.parent && Y.parent.provides;
		r === n && (n = Y.provides = Object.create(r)), n[e] = t;
	}
}
function Pn(e, t, n = !1) {
	let r = Ti();
	if (r || dr) {
		let i = dr ? dr._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
		if (i && e in i) return i[e];
		if (arguments.length > 1) return n && h(t) ? t.call(r && r.proxy) : t;
	}
}
var Fn = /* @__PURE__ */ Symbol.for("v-scx"), In = () => Pn(Fn);
function Ln(e, t, n) {
	return Rn(e, t, n);
}
function Rn(e, n, i = t) {
	let { immediate: a, deep: o, flush: c, once: l } = i, u = s({}, i), d = n && a || !n && c !== "post", f;
	if (ji) {
		if (c === "sync") {
			let e = In();
			f = e.__watcherHandles ||= [];
		} else if (!d) {
			let e = () => {};
			return e.stop = r, e.resume = r, e.pause = r, e;
		}
	}
	let p = Y;
	u.call = (e, t, n) => cn(e, p, t, n);
	let m = !1;
	c === "post" ? u.scheduler = (e) => {
		e.i = p, B(e, p && p.suspense);
	} : c !== "sync" && (m = !0, u.scheduler = (e, t) => {
		t ? e() : yn(e);
	}), u.augmentJob = (e) => {
		n && (e.flags |= 4), m && (e.flags |= 2, p && (e.id = p.uid, e.i = p));
	};
	let h = an(e, n, u);
	return ji && (f ? f.push(h) : d && h()), h;
}
var zn = /* @__PURE__ */ Symbol("_vte"), Bn = (e) => e.__isTeleport, Vn = /* @__PURE__ */ Symbol("_leaveCb");
function Hn(e) {
	let t = e[0];
	if (e.length > 1) {
		for (let n of e) if (n.type !== ti) {
			t = n;
			break;
		}
	}
	return t;
}
function Un(e) {
	if (!Qn(e)) return Bn(e.type) && e.children ? Hn(e.children) : e;
	if (e.component) return e.component.subTree;
	let { shapeFlag: t, children: n } = e;
	if (n) {
		if (t & 16) return n[0];
		if (t & 32 && h(n.default)) return n.default();
	}
}
function Wn(e, t) {
	if (e.shapeFlag & 6 && e.component) {
		e.transition = t;
		let n = e.component.subTree;
		Wn(Bn(n.type) && Un(n) || n, t);
	} else if (e.shapeFlag & 128) {
		let n = e.suspense;
		if (n) {
			let e = n.isHydrating ? n.pendingBranch : n.activeBranch;
			e && Wn(e, t.clone(e));
		} else e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback);
	} else if (e.transition = t, e.type === V && d(e.children)) {
		let n = _r(e.children, !1);
		n && Wn(n, t);
	}
}
function Gn(e) {
	if (e.component) return Gn(e.component.subTree);
	if (e.type === V) {
		let t = d(e.children) && _r(e.children, !1);
		return t ? Gn(t) : void 0;
	}
	if (e.type !== ti) return e;
}
function Kn(e) {
	e.ids = [
		e.ids[0] + e.ids[2]++ + "-",
		0,
		0
	];
}
function qn(e, t) {
	let n;
	return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
}
var Jn = /* @__PURE__ */ new WeakMap();
function Yn(e, n, r, a, o = !1) {
	if (d(e)) {
		e.forEach((e, t) => Yn(e, n && (d(n) ? n[t] : n), r, a, o));
		return;
	}
	if (Zn(a) && !o) {
		a.shapeFlag & 512 && a.type.__asyncResolved && a.component.subTree.component && Yn(e, n, r, a.component.subTree);
		return;
	}
	let s = a.shapeFlag & 4 ? zi(a.component) : a.el, l = o ? null : s, { i: f, r: p } = e, m = n && n.r, _ = f.refs === t ? f.refs = {} : f.refs, v = f.setupState, y = /* @__PURE__ */ N(v), b = v === t ? i : (e) => !qn(_, e) && u(y, e), x = (e, t) => !(t && qn(_, t));
	if (m != null && m !== p) {
		if (Xn(n), g(m)) _[m] = null, b(m) && (v[m] = null);
		else if (/* @__PURE__ */ F(m)) {
			let e = n;
			x(m, e.k) && (m.value = null), e.k && (_[e.k] = null);
		}
	}
	if (h(p)) sn(p, f, 12, [l, _]);
	else {
		let t = g(p), n = /* @__PURE__ */ F(p);
		if (t || n) {
			let i = () => {
				if (e.f) {
					let n = t ? b(p) ? v[p] : _[p] : x(p) || !e.k ? p.value : _[e.k];
					if (o) d(n) && c(n, s);
					else if (d(n)) n.includes(s) || n.push(s);
					else if (t) _[p] = [s], b(p) && (v[p] = _[p]);
					else {
						let t = [s];
						x(p, e.k) && (p.value = t), e.k && (_[e.k] = t);
					}
				} else t ? (_[p] = l, b(p) && (v[p] = l)) : n && (x(p, e.k) && (p.value = l), e.k && (_[e.k] = l));
			};
			if (l) {
				let t = () => {
					i(), Jn.delete(e);
				};
				t.id = -1, Jn.set(e, t), B(t, r);
			} else Xn(e), i();
		}
	}
}
function Xn(e) {
	let t = Jn.get(e);
	t && (t.flags |= 8, Jn.delete(e));
}
fe().requestIdleCallback, fe().cancelIdleCallback;
var Zn = (e) => !!e.type.__asyncLoader, Qn = (e) => e.type.__isKeepAlive;
function $n(e, t, n = Y, r = !1) {
	if (n) {
		let i = n[e] || (n[e] = []), a = t.__weh ||= (...r) => {
			Ke();
			let i = Oi(n), a = cn(t, n, e, r);
			return i(), qe(), a;
		};
		return r ? i.unshift(a) : i.push(a), a;
	}
}
var er = (e) => (t, n = Y) => {
	ji && e !== "sp" || $n(e, (...e) => t(...e), n);
}, tr = er("m"), nr = er("bum"), rr = /* @__PURE__ */ Symbol.for("v-ndc");
function z(e, t, n, r) {
	let i, a = n && n[r], o = d(e);
	if (o || g(e)) {
		let n = o && /* @__PURE__ */ Ht(e), r = !1, s = !1;
		n && (r = !/* @__PURE__ */ M(e), s = /* @__PURE__ */ Ut(e), e = at(e)), i = Array(e.length);
		for (let n = 0, o = e.length; n < o; n++) i[n] = t(r ? s ? Kt(P(e[n])) : P(e[n]) : e[n], n, void 0, a && a[n]);
	} else if (typeof e == "number") {
		if (!Number.isInteger(e) || e < 0) i = [];
		else {
			i = Array(e);
			for (let n = 0; n < e; n++) i[n] = t(n + 1, n, void 0, a && a[n]);
		}
	} else if (v(e)) {
		if (e[Symbol.iterator]) i = Array.from(e, (e, n) => t(e, n, void 0, a && a[n]));
		else {
			let n = Object.keys(e);
			i = Array(n.length);
			for (let r = 0, o = n.length; r < o; r++) {
				let o = n[r];
				i[r] = t(e[o], o, r, a && a[r]);
			}
		}
	} else i = [];
	return n && (n[r] = i), i;
}
var ir = (e) => e ? Ai(e) ? zi(e) : ir(e.parent) : null, ar = /* @__PURE__ */ s(/* @__PURE__ */ Object.create(null), {
	$: (e) => e,
	$el: (e) => e.vnode.el,
	$data: (e) => e.data,
	$props: (e) => e.props,
	$attrs: (e) => e.attrs,
	$slots: (e) => e.slots,
	$refs: (e) => e.refs,
	$parent: (e) => ir(e.parent),
	$root: (e) => ir(e.root),
	$host: (e) => e.ce,
	$emit: (e) => e.emit,
	$options: (e) => e.type,
	$forceUpdate: (e) => e.f ||= () => {
		yn(e.update);
	},
	$nextTick: (e) => e.n ||= _n.bind(e.proxy),
	$watch: (e) => r
}), or = (e, n) => e !== t && !e.__isScriptSetup && u(e, n), sr = {
	get({ _: e }, n) {
		if (n === "__v_skip") return !0;
		let { ctx: r, setupState: i, data: a, props: o, accessCache: s, type: c, appContext: l } = e;
		if (n[0] !== "$") {
			let e = s[n];
			if (e !== void 0) switch (e) {
				case 1: return i[n];
				case 2: return a[n];
				case 4: return r[n];
				case 3: return o[n];
			}
			else if (or(i, n)) return s[n] = 1, i[n];
			else if (u(o, n)) return s[n] = 3, o[n];
			else if (r !== t && u(r, n)) return s[n] = 4, r[n];
			else s[n] = 0;
		}
		let d = ar[n], f, p;
		if (d) return n === "$attrs" && j(e.attrs, "get", ""), d(e);
		if ((f = c.__cssModules) && (f = f[n])) return f;
		if (r !== t && u(r, n)) return s[n] = 4, r[n];
		if (p = l.config.globalProperties, u(p, n)) return p[n];
	},
	set({ _: e }, t, n) {
		let { data: r, setupState: i, ctx: a } = e;
		return or(i, t) ? (i[t] = n, !0) : u(e.props, t) || t[0] === "$" && t.slice(1) in e ? !1 : (a[t] = n, !0);
	},
	has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: a, type: o } }, s) {
		let c;
		return !!(n[s] || or(t, s) || u(a, s) || u(r, s) || u(ar, s) || u(i.config.globalProperties, s) || (c = o.__cssModules) && c[s]);
	},
	defineProperty(e, t, n) {
		return n.get == null ? u(n, "value") && this.set(e, t, n.value, null) : e._.accessCache[t] = 0, Reflect.defineProperty(e, t, n);
	}
};
function cr() {
	return {
		app: null,
		config: {
			isNativeTag: i,
			performance: !1,
			globalProperties: {},
			optionMergeStrategies: {},
			errorHandler: void 0,
			warnHandler: void 0,
			compilerOptions: {}
		},
		mixins: [],
		components: {},
		directives: {},
		provides: /* @__PURE__ */ Object.create(null),
		optionsCache: /* @__PURE__ */ new WeakMap(),
		propsCache: /* @__PURE__ */ new WeakMap(),
		emitsCache: /* @__PURE__ */ new WeakMap()
	};
}
var lr = 0;
function ur(e, t) {
	return function(n, r = null) {
		h(n) || (n = s({}, n)), r != null && !v(r) && (r = null);
		let i = cr(), a = /* @__PURE__ */ new WeakSet(), o = [], c = !1, l = i.app = {
			_uid: lr++,
			_component: n,
			_props: r,
			_container: null,
			_context: i,
			_instance: null,
			version: Vi,
			get config() {
				return i.config;
			},
			set config(e) {},
			use(e, ...t) {
				return a.has(e) || (e && h(e.install) ? (a.add(e), e.install(l, ...t)) : h(e) && (a.add(e), e(l, ...t))), l;
			},
			mixin(e) {
				return l;
			},
			component(e, t) {
				return t ? (i.components[e] = t, l) : i.components[e];
			},
			directive(e, t) {
				return t ? (i.directives[e] = t, l) : i.directives[e];
			},
			mount(a, o, s) {
				if (!c) {
					let u = l._ceVNode || K(n, r);
					return u.appContext = i, s === !0 ? s = "svg" : s === !1 && (s = void 0), o && t ? t(u, a) : e(u, a, s), c = !0, l._container = a, a.__vue_app__ = l, zi(u.component);
				}
			},
			onUnmount(e) {
				o.push(e);
			},
			unmount() {
				c && (cn(o, l._instance, 16), e(null, l._container), delete l._container.__vue_app__);
			},
			provide(e, t) {
				return i.provides[e] = t, l;
			},
			runWithContext(e) {
				let t = dr;
				dr = l;
				try {
					return e();
				} finally {
					dr = t;
				}
			}
		};
		return l;
	};
}
var dr = null, fr = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${T(t)}Modifiers`] || e[`${ie(t)}Modifiers`];
function pr(e, n, ...r) {
	if (e.isUnmounted) return;
	let i = e.vnode.props || t, a = r, o = n.startsWith("update:"), s = o && fr(i, n.slice(7));
	s && (s.trim && (a = r.map((e) => g(e) ? e.trim() : e)), s.number && (a = a.map(ue)));
	let c, l = i[c = oe(n)] || i[c = oe(T(n))];
	!l && o && (l = i[c = oe(ie(n))]), l && cn(l, e, 6, a);
	let u = i[c + "Once"];
	if (u) {
		if (!e.emitted) e.emitted = {};
		else if (e.emitted[c]) return;
		e.emitted[c] = !0, cn(u, e, 6, a);
	}
}
function mr(e, t, n = !1) {
	let r = t.emitsCache, i = r.get(e);
	if (i !== void 0) return i;
	let a = e.emits, o = {};
	return a ? (d(a) ? a.forEach((e) => o[e] = null) : s(o, a), v(e) && r.set(e, o), o) : (v(e) && r.set(e, null), null);
}
function hr(e, t) {
	return !e || !a(t) ? !1 : (t = t.slice(2), t = t === "Once" ? t : t.replace(/Once$/, ""), u(e, t[0].toLowerCase() + t.slice(1)) || u(e, ie(t)) || u(e, t));
}
function gr(e) {
	let { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [a], slots: s, attrs: c, emit: l, render: u, renderCache: d, props: f, data: p, setupState: m, ctx: h, inheritAttrs: g } = e, _ = An(e), v, y;
	try {
		if (n.shapeFlag & 4) {
			let e = i || r, t = e;
			v = gi(u.call(t, e, d, f, m, p, h)), y = c;
		} else {
			let e = t;
			v = gi(e.length > 1 ? e(f, {
				attrs: c,
				slots: s,
				emit: l
			}) : e(f, null)), y = t.props ? c : vr(c);
		}
	} catch (t) {
		ri.length = 0, ln(t, e, 1), v = K(ti);
	}
	let b = v;
	if (y && g !== !1) {
		let e = Object.keys(y), { shapeFlag: t } = b;
		e.length && t & 7 && (a && e.some(o) && (y = yr(y, a)), b = hi(b, y, !1, !0));
	}
	return n.dirs && (b = hi(b, null, !1, !0), b.dirs = b.dirs ? b.dirs.concat(n.dirs) : n.dirs), n.transition && Wn(Bn(b.type) && Un(b) || b, n.transition), v = b, An(_), v;
}
function _r(e, t = !0) {
	let n;
	for (let t = 0; t < e.length; t++) {
		let r = e[t];
		if (li(r)) {
			if (r.type !== ti || r.children === "v-if") {
				if (n) return;
				n = r;
			}
		} else return;
	}
	return n;
}
var vr = (e) => {
	let t;
	for (let n in e) (n === "class" || n === "style" || a(n)) && ((t ||= {})[n] = e[n]);
	return t;
}, yr = (e, t) => {
	let n = {};
	for (let r in e) o(r) && r.slice(9) in t || (n[r] = e[r]);
	return n;
};
function br(e, t, n) {
	let { props: r, children: i, component: a } = e, { props: o, children: s, patchFlag: c } = t, l = a.emitsOptions;
	if (t.dirs || t.transition) return !0;
	if (n && c >= 0) {
		if (c & 1024) return !0;
		if (c & 16) return r ? xr(r, o, l) : !!o;
		if (c & 8) {
			let e = t.dynamicProps;
			for (let t = 0; t < e.length; t++) {
				let n = e[t];
				if (Sr(o, r, n) && !hr(l, n)) return !0;
			}
		}
	} else return (i || s) && (!s || !s.$stable) ? !0 : r === o ? !1 : r ? !o || xr(r, o, l) : !!o;
	return !1;
}
function xr(e, t, n) {
	let r = Object.keys(t);
	if (r.length !== Object.keys(e).length) return !0;
	for (let i = 0; i < r.length; i++) {
		let a = r[i];
		if (!u(e, a) || Sr(t, e, a) && !hr(n, a)) return !0;
	}
	return !1;
}
function Sr(e, t, n) {
	let r = e[n], i = t[n];
	return n === "style" && v(r) && v(i) ? !D(r, i) : r !== i;
}
function Cr({ vnode: e, parent: t, suspense: n }, r) {
	for (; t;) {
		let n = t.subTree;
		if (n.suspense && n.suspense.activeBranch === e && (n.suspense.vnode.el = n.el = r, e = n), n === e) (e = t.vnode).el = r, t = t.parent;
		else break;
	}
	n && n.activeBranch === e && (n.vnode.el = r);
}
var wr = {}, Tr = () => Object.create(wr), Er = (e) => Object.getPrototypeOf(e) === wr;
function Dr(e, t, n, r = !1) {
	let i = {}, a = Tr();
	e.propsDefaults = /* @__PURE__ */ Object.create(null), kr(e, t, i, a);
	for (let t in e.propsOptions[0]) t in i || (i[t] = void 0);
	e.props = n ? r ? i : /* @__PURE__ */ zt(i) : e.type.props ? i : a, e.attrs = a;
}
function Or(e, t, n, r) {
	let { props: i, attrs: a, vnode: { patchFlag: o } } = e, s = /* @__PURE__ */ N(i), [c] = e.propsOptions, l = !1;
	if ((r || o > 0) && !(o & 16)) {
		if (o & 8) {
			let n = e.vnode.dynamicProps;
			for (let r = 0; r < n.length; r++) {
				let o = n[r];
				if (hr(e.emitsOptions, o)) continue;
				let d = t[o];
				if (c) {
					if (u(a, o)) d !== a[o] && (a[o] = d, l = !0);
					else {
						let t = T(o);
						i[t] = Ar(c, s, t, d, e, !1);
					}
				} else d !== a[o] && (a[o] = d, l = !0);
			}
		}
	} else {
		kr(e, t, i, a) && (l = !0);
		let r;
		for (let a in s) t && (u(t, a) || (r = ie(a)) !== a && u(t, r)) || (c ? n && (n[a] !== void 0 || n[r] !== void 0) && (i[a] = Ar(c, s, a, void 0, e, !0)) : delete i[a]);
		if (a !== s) for (let e in a) t && u(t, e) || (delete a[e], l = !0);
	}
	l && rt(e.attrs, "set", "");
}
function kr(e, n, r, i) {
	let [a, o] = e.propsOptions, s = !1, c;
	if (n) for (let t in n) {
		if (ee(t)) continue;
		let l = n[t], d;
		a && u(a, d = T(t)) ? !o || !o.includes(d) ? r[d] = l : (c ||= {})[d] = l : hr(e.emitsOptions, t) || t in i && l === i[t] || (i[t] = l, s = !0);
	}
	if (o) {
		let n = /* @__PURE__ */ N(r), i = c || t;
		for (let t = 0; t < o.length; t++) {
			let s = o[t];
			r[s] = Ar(a, n, s, i[s], e, !u(i, s));
		}
	}
	return s;
}
function Ar(e, t, n, r, i, a) {
	let o = e[n];
	if (o != null) {
		let e = u(o, "default");
		if (e && r === void 0) {
			let e = o.default;
			if (o.type !== Function && !o.skipFactory && h(e)) {
				let { propsDefaults: a } = i;
				if (n in a) r = a[n];
				else {
					let o = Oi(i);
					r = a[n] = e.call(null, t), o();
				}
			} else r = e;
			i.ce && i.ce._setProp(n, r);
		}
		o[0] && (a && !e ? r = !1 : o[1] && (r === "" || r === ie(n)) && (r = !0));
	}
	return r;
}
function jr(e, r, i = !1) {
	let a = r.propsCache, o = a.get(e);
	if (o) return o;
	let c = e.props, l = {}, f = [];
	if (!c) return v(e) && a.set(e, n), n;
	if (d(c)) for (let e = 0; e < c.length; e++) {
		let n = T(c[e]);
		Mr(n) && (l[n] = t);
	}
	else if (c) for (let e in c) {
		let t = T(e);
		if (Mr(t)) {
			let n = c[e], r = l[t] = d(n) || h(n) ? { type: n } : s({}, n), i = r.type, a = !1, o = !0;
			if (d(i)) for (let e = 0; e < i.length; ++e) {
				let t = i[e], n = h(t) && t.name;
				if (n === "Boolean") {
					a = !0;
					break;
				}
				n === "String" && (o = !1);
			}
			else a = h(i) && i.name === "Boolean";
			r[0] = a, r[1] = o, (a || u(r, "default")) && f.push(t);
		}
	}
	let p = [l, f];
	return v(e) && a.set(e, p), p;
}
function Mr(e) {
	return e[0] !== "$" && !ee(e);
}
var Nr = (e) => e === "_" || e === "_ctx" || e === "$stable", Pr = (e) => d(e) ? e.map(gi) : [gi(e)], Fr = (e, t, n) => {
	if (t._n) return t;
	let r = jn((...e) => Pr(t(...e)), n);
	return r._c = !1, r;
}, Ir = (e, t, n) => {
	let r = e._ctx;
	for (let n in e) {
		if (Nr(n)) continue;
		let i = e[n];
		if (h(i)) t[n] = Fr(n, i, r);
		else if (i != null) {
			let e = Pr(i);
			t[n] = () => e;
		}
	}
}, Lr = (e, t) => {
	let n = Pr(t);
	e.slots.default = () => n;
}, Rr = (e, t, n) => {
	for (let r in t) (n || !Nr(r)) && (e[r] = t[r]);
}, zr = (e, t, n) => {
	let r = e.slots = Tr();
	if (e.vnode.shapeFlag & 32) {
		let e = t._;
		e ? (Rr(r, t, n), n && le(r, "_", e, !0)) : Ir(t, r);
	} else t && Lr(e, t);
}, Br = (e, n, r) => {
	let { vnode: i, slots: a } = e, o = !0, s = t;
	if (i.shapeFlag & 32) {
		let e = n._;
		e ? r && e === 1 ? o = !1 : Rr(a, n, r) : (o = !n.$stable, Ir(n, a)), s = n;
	} else n && (Lr(e, n), s = { default: 1 });
	if (o) for (let e in a) !Nr(e) && s[e] == null && delete a[e];
}, B = $r;
function Vr(e) {
	return Hr(e);
}
function Hr(e, i) {
	let a = fe();
	a.__VUE__ = !0;
	let { insert: o, remove: s, patchProp: c, createElement: l, createText: u, createComment: d, setText: f, setElementText: p, parentNode: m, nextSibling: h, setScopeId: g = r, insertStaticContent: _ } = e, v = (e, t, r, i = null, a = null, o = null, s = void 0, c = null, l = !!t.dynamicChildren) => {
		if (e === t) return;
		e && !ui(e, t) && (i = Se(e), E(e, a, o, !0), e = null), t.patchFlag === -2 && (l = !1, t.dynamicChildren = null), t.dynamicChildren && e && e.dynamicChildren && e.dynamicChildren.hasOnce && (t.dynamicChildren === n && (t.dynamicChildren = []), t.dynamicChildren.hasOnce = !0);
		let { type: u, ref: d, shapeFlag: f } = t;
		switch (u) {
			case ei:
				y(e, t, r, i);
				break;
			case ti:
				b(e, t, r, i);
				break;
			case ni:
				e ?? x(t, r, i, s);
				break;
			case V:
				oe(e, t, r, i, a, o, s, c, l);
				break;
			default: f & 1 ? w(e, t, r, i, a, o, s, c, l) : f & 6 ? se(e, t, r, i, a, o, s, c, l) : (f & 64 || f & 128) && u.process(e, t, r, i, a, o, s, c, l, D);
		}
		d != null && a ? Yn(d, e && e.ref, o, t || e, !t) : d == null && e && e.ref != null && Yn(e.ref, null, o, e, !0);
	}, y = (e, t, n, r) => {
		if (e == null) o(t.el = u(t.children), n, r);
		else {
			let n = t.el = e.el;
			t.children !== e.children && f(n, t.children);
		}
	}, b = (e, t, n, r) => {
		e == null ? o(t.el = d(t.children || ""), n, r) : t.el = e.el;
	}, x = (e, t, n, r) => {
		[e.el, e.anchor] = _(e.children, t, n, r, e.el, e.anchor);
	}, S = ({ el: e, anchor: t }, n, r) => {
		let i;
		for (; e && e !== t;) i = h(e), o(e, n, r), e = i;
		o(t, n, r);
	}, C = ({ el: e, anchor: t }) => {
		let n;
		for (; e && e !== t;) n = h(e), s(e), e = n;
		s(t);
	}, w = (e, t, n, r, i, a, o, s, c) => {
		if (t.type === "svg" ? o = "svg" : t.type === "math" && (o = "mathml"), e == null) te(t, n, r, i, a, o, s, c);
		else {
			let n = e.el && e.el._isVueCE ? e.el : null;
			try {
				n && n._beginPatch(), re(e, t, i, a, o, s, c);
			} finally {
				n && n._endPatch();
			}
		}
	}, te = (e, t, n, r, i, a, s, u) => {
		let d, f, { props: m, shapeFlag: h, transition: g, dirs: _ } = e;
		if (d = e.el = l(e.type, a, m && m.is, m), h & 8 ? p(d, e.children) : h & 16 && T(e.children, d, null, r, i, Ur(e, a), s, u), _ && Mn(e, null, r, "created"), ne(d, e, e.scopeId, s, r), m) {
			for (let e in m) e !== "value" && !ee(e) && c(d, e, null, m[e], a, r);
			"value" in m && c(d, "value", null, m.value, a), (f = m.onVnodeBeforeMount) && bi(f, r, e);
		}
		_ && Mn(e, null, r, "beforeMount");
		let v = Gr(i, g);
		v ? g.beforeEnter(d) : g && !g.persisted && (d[Qr] = !0), o(d, t, n), ((f = m && m.onVnodeMounted) || v || _) && B(() => {
			try {
				f && bi(f, r, e), v && g.enter(d), _ && Mn(e, null, r, "mounted");
			} finally {}
		}, i);
	}, ne = (e, t, n, r, i) => {
		if (n && g(e, n), r) for (let t = 0; t < r.length; t++) g(e, r[t]);
		if (i) {
			let n = i.subTree;
			if (t === n || Zr(n.type) && (n.ssContent === t || n.ssFallback === t)) {
				let t = i.vnode;
				ne(e, t, t.scopeId, t.slotScopeIds, i.parent);
			}
		}
	}, T = (e, t, n, r, i, a, o, s, c = 0) => {
		for (let l = c; l < e.length; l++) {
			let c = e[l] = s ? _i(e[l]) : gi(e[l]);
			v(null, c, t, n, r, i, a, o, s);
		}
	}, re = (e, n, r, i, a, o, s) => {
		let l = n.el = e.el, { patchFlag: u, dynamicChildren: d, dirs: f } = n;
		u |= e.patchFlag & 16;
		let m = e.props || t, h = n.props || t, g;
		if (r && Wr(r, !1), (g = h.onVnodeBeforeUpdate) && bi(g, r, n, e), f && Mn(n, e, r, "beforeUpdate"), r && Wr(r, !0), d && (!e.dynamicChildren || e.dynamicChildren.length !== d.length) && (u = 0, s = !1, d = null), (m.innerHTML && h.innerHTML == null || m.textContent && h.textContent == null) && p(l, ""), d ? ie(e.dynamicChildren, d, l, r, i, Ur(n, a), o) : s || me(e, n, l, null, r, i, Ur(n, a), o, !1), u > 0) {
			if (u & 16) ae(l, m, h, r, a);
			else if (u & 2 && m.class !== h.class && c(l, "class", null, h.class, a), u & 4 && c(l, "style", m.style, h.style, a), u & 8) {
				let e = n.dynamicProps;
				for (let t = 0; t < e.length; t++) {
					let n = e[t], i = m[n], o = h[n];
					(o !== i || n === "value") && c(l, n, i, o, a, r);
				}
			}
			u & 1 && e.children !== n.children && p(l, n.children);
		} else !s && d == null && ae(l, m, h, r, a);
		((g = h.onVnodeUpdated) || f) && B(() => {
			g && bi(g, r, n, e), f && Mn(n, e, r, "updated");
		}, i);
	}, ie = (e, t, n, r, i, a, o) => {
		for (let s = 0; s < t.length; s++) {
			let c = e[s], l = t[s], u = c.el || Xr(c), d = u && (c.type === V || !ui(c, l) || c.shapeFlag & 198) ? m(u) : n;
			v(c, l, d, null, r, i, a, o, !0);
		}
	}, ae = (e, n, r, i, a) => {
		if (n !== r) {
			if (n !== t) for (let t in n) !ee(t) && !(t in r) && c(e, t, n[t], null, a, i);
			for (let t in r) {
				if (ee(t)) continue;
				let o = r[t], s = n[t];
				o !== s && t !== "value" && c(e, t, s, o, a, i);
			}
			"value" in r && c(e, "value", n.value, r.value, a);
		}
	}, oe = (e, t, n, r, i, a, s, c, l) => {
		let d = t.el = e ? e.el : u(""), f = t.anchor = e ? e.anchor : u(""), { patchFlag: p, dynamicChildren: m, slotScopeIds: h } = t;
		h && (c = c ? c.concat(h) : h), e == null ? (o(d, n, r), o(f, n, r), T(t.children || [], n, f, i, a, s, c, l)) : p > 0 && p & 64 && m && e.dynamicChildren && e.dynamicChildren.length === m.length ? (ie(e.dynamicChildren, m, n, i, a, s, c), (t.key != null || i && t === i.subTree) && Kr(e, t, !0)) : me(e, t, n, f, i, a, s, c, l);
	}, se = (e, t, n, r, i, a, o, s, c) => {
		t.slotScopeIds = s, e == null ? t.shapeFlag & 512 ? i.ctx.activate(t, n, r, o, c) : le(t, n, r, i, a, o, c) : ue(e, t, c);
	}, le = (e, t, n, r, i, a, o) => {
		let s = e.component = wi(e, r, i);
		if (Qn(e) && (s.ctx.renderer = D), Mi(s, !1, o), s.asyncDep) {
			if (i && i.registerDep(s, de, o, a), !e.el) {
				let r = s.subTree = K(ti);
				b(null, r, t, n), e.placeholder = r.el;
			}
		} else de(s, e, t, n, i, a, o);
	}, ue = (e, t, n) => {
		let r = t.component = e.component;
		if (br(e, t, n)) {
			if (r.asyncDep && !r.asyncResolved) {
				t.el = e.el, t.placeholder = e.placeholder, pe(r, t, n);
				return;
			}
			r.next = t, r.update();
		} else t.el = e.el, t.placeholder = e.placeholder, r.vnode = t;
	}, de = (e, t, n, r, i, a, o) => {
		let s = () => {
			if (e.isMounted) {
				let { next: t, bu: n, u: r, parent: s, vnode: c } = e;
				{
					let n = Jr(e);
					if (n) {
						t && (t.el = c.el, pe(e, t, o)), n.asyncDep.then(() => {
							let t = () => {
								e.job.flags & 8 || (i && i.pendingBranch ? B(t, i) : l());
							};
							t.flags = 48, B(t, i);
						});
						return;
					}
				}
				let u = t, d;
				Wr(e, !1), t ? (t.el = c.el, pe(e, t, o)) : t = c, n && ce(n), (d = t.props && t.props.onVnodeBeforeUpdate) && bi(d, s, t, c), Wr(e, !0);
				let f = gr(e), p = e.subTree;
				e.subTree = f, v(p, f, m(p.el || Xr(p)), Se(p), e, i, a), t.el = f.el, u === null && Cr(e, f.el), r && B(r, i), (d = t.props && t.props.onVnodeUpdated) && B(() => bi(d, s, t, c), i);
			} else {
				let o, { el: s, props: c } = t, { bm: l, m: u, parent: d, root: f, type: p } = e, m = Zn(t);
				if (Wr(e, !1), l && ce(l), !m && (o = c && c.onVnodeBeforeMount) && bi(o, d, t), Wr(e, !0), s && Te) {
					let t = () => {
						e.subTree = gr(e), Te(s, e.subTree, e, i, null);
					};
					m && p.__asyncHydrate ? p.__asyncHydrate(s, e, t) : t();
				} else {
					f.ce && f.ce._hasShadowRoot() && f.ce._injectChildStyle(p, e.parent ? e.parent.type : void 0);
					let o = e.subTree = gr(e);
					v(null, o, n, r, e, i, a), t.el = o.el;
				}
				if (u && B(u, i), !m && (o = c && c.onVnodeMounted)) {
					let e = t;
					B(() => bi(o, d, e), i);
				}
				(t.shapeFlag & 256 || d && Zn(d.vnode) && d.vnode.shapeFlag & 256) && e.a && B(e.a, i), e.isMounted = !0, t = n = r = null;
			}
		};
		e.scope.on();
		let c = e.effect = new je(s);
		e.scope.off();
		let l = e.update = c.run.bind(c), u = e.job = c.runIfDirty.bind(c);
		u.i = e, u.id = e.uid, c.scheduler = () => yn(u), Wr(e, !0), l();
	}, pe = (e, t, n) => {
		t.component = e;
		let r = e.vnode.props;
		e.vnode = t, e.next = null, Or(e, t.props, r, n), Br(e, t.children, n), Ke(), Sn(e), qe();
	}, me = (e, t, n, r, i, a, o, s, c = !1) => {
		let l = e && e.children, u = e ? e.shapeFlag : 0, d = t.children, { patchFlag: f, shapeFlag: m } = t;
		if (f > 0) {
			if (f & 128) {
				ge(l, d, n, r, i, a, o, s, c);
				return;
			}
			if (f & 256) {
				he(l, d, n, r, i, a, o, s, c);
				return;
			}
		}
		m & 8 ? (u & 16 && xe(l, i, a), d !== l && p(n, d)) : u & 16 ? m & 16 ? ge(l, d, n, r, i, a, o, s, c) : xe(l, i, a, !0) : (u & 8 && p(n, ""), m & 16 && T(d, n, r, i, a, o, s, c));
	}, he = (e, t, r, i, a, o, s, c, l) => {
		e ||= n, t ||= n;
		let u = e.length, d = t.length, f = Math.min(u, d), p = 0;
		for (; p < f; p++) {
			let n = t[p] = l ? _i(t[p]) : gi(t[p]);
			v(e[p], n, r, null, a, o, s, c, l);
		}
		u > d ? xe(e, a, o, !0, !1, f) : T(t, r, i, a, o, s, c, l, f);
	}, ge = (e, t, r, i, a, o, s, c, l) => {
		let u = 0, d = t.length, f = e.length - 1, p = d - 1;
		for (; u <= f && u <= p;) {
			let n = e[u], i = t[u] = l ? _i(t[u]) : gi(t[u]);
			if (ui(n, i)) v(n, i, r, null, a, o, s, c, l);
			else break;
			u++;
		}
		for (; u <= f && u <= p;) {
			let n = e[f], i = t[p] = l ? _i(t[p]) : gi(t[p]);
			if (ui(n, i)) v(n, i, r, null, a, o, s, c, l);
			else break;
			f--, p--;
		}
		if (u > f) {
			if (u <= p) {
				let e = p + 1, n = e < d ? t[e].el : i;
				for (; u <= p;) v(null, t[u] = l ? _i(t[u]) : gi(t[u]), r, n, a, o, s, c, l), u++;
			}
		} else if (u > p) for (; u <= f;) E(e[u], a, o, !0), u++;
		else {
			let m = u, h = u, g = /* @__PURE__ */ new Map();
			for (u = h; u <= p; u++) {
				let e = t[u] = l ? _i(t[u]) : gi(t[u]);
				e.key != null && g.set(e.key, u);
			}
			let _, y = 0, b = p - h + 1, x = !1, S = 0, C = Array(b);
			for (u = 0; u < b; u++) C[u] = 0;
			for (u = m; u <= f; u++) {
				let n = e[u];
				if (y >= b) {
					E(n, a, o, !0);
					continue;
				}
				let i;
				if (n.key != null) i = g.get(n.key);
				else for (_ = h; _ <= p; _++) if (C[_ - h] === 0 && ui(n, t[_])) {
					i = _;
					break;
				}
				i === void 0 ? E(n, a, o, !0) : (C[i - h] = u + 1, i >= S ? S = i : x = !0, v(n, t[i], r, null, a, o, s, c, l), y++);
			}
			let w = x ? qr(C) : n;
			for (_ = w.length - 1, u = b - 1; u >= 0; u--) {
				let e = h + u, n = t[e], f = t[e + 1], p = e + 1 < d ? f.el || Xr(f) : i;
				C[u] === 0 ? v(null, n, r, p, a, o, s, c, l) : x && (_ < 0 || u !== w[_] ? _e(n, r, p, 2) : _--);
			}
		}
	}, _e = (e, t, n, r, i = null) => {
		let { el: a, type: c, transition: l, children: u, shapeFlag: d } = e;
		if (d & 6) _e(e.component.subTree, t, n, r);
		else if (d & 128) e.suspense.move(t, n, r);
		else if (d & 64) c.move(e, t, n, D);
		else if (c === V) {
			o(a, t, n);
			for (let e = 0; e < u.length; e++) _e(u[e], t, n, r);
			o(e.anchor, t, n);
		} else if (c === ni) S(e, t, n);
		else if (r !== 2 && d & 1 && l) {
			if (r === 0) l.persisted && !a[Vn] ? o(a, t, n) : (l.beforeEnter(a), o(a, t, n), B(() => l.enter(a), i));
			else {
				let { leave: r, delayLeave: i, afterLeave: c } = l, u = () => {
					e.ctx.isUnmounted ? s(a) : o(a, t, n);
				}, d = () => {
					let e = a._isLeaving || !!a[Vn];
					a._isLeaving && a[Vn](!0), l.persisted && !e ? u() : r(a, () => {
						u(), c && c();
					});
				};
				i ? i(a, u, d) : d();
			}
		} else o(a, t, n);
	}, E = (e, t, n, r = !1, i = !1) => {
		let { type: a, props: o, ref: s, children: c, dynamicChildren: l, shapeFlag: u, patchFlag: d, dirs: f, cacheIndex: p, memo: m } = e;
		if ((d === -2 || l && l.hasOnce) && (i = !1), s != null && (Ke(), Yn(s, null, n, e, !0), qe()), p == null || e.ctx && e.ctx !== t || (t.renderCache[p] = void 0), u & 256 && t.ctx.deactivate(e)) return;
		let h = u & 1 && f, g = !Zn(e), _;
		if (g && (_ = o && o.onVnodeBeforeUnmount) && bi(_, t, e), u & 6) be(e.component, n, r);
		else {
			if (u & 128) {
				e.suspense.unmount(n, r);
				return;
			}
			h && Mn(e, null, t, "beforeUnmount"), u & 64 ? e.type.remove(e, t, n, D, r) : l && !l.hasOnce && (a !== V || d > 0 && d & 64) ? xe(l, t, n, !1, !0) : (a === V && d & 384 || !i && u & 16) && xe(c, t, n), r && ve(e);
		}
		let v = m != null && p == null;
		(g && (_ = o && o.onVnodeUnmounted) || h || v) && B(() => {
			_ && bi(_, t, e), h && Mn(e, null, t, "unmounted"), v && (e.el = null);
		}, n);
	}, ve = (e) => {
		let { type: t, el: n, anchor: r, transition: i } = e, a = t === V;
		if (a && !i) {
			ye(n, r);
			return;
		}
		if (t === ni) {
			C(e), i && !i.persisted && i.afterLeave && i.afterLeave();
			return;
		}
		let o = a ? Gn(e) : e, c = () => {
			a ? m(n) && ye(n, r) : s(n), i && !i.persisted && i.afterLeave && i.afterLeave();
		};
		if (o && o.shapeFlag & 1 && i && !i.persisted) {
			let { leave: e, delayLeave: t } = i, n = o.el, r = () => e(n, c);
			t ? t(n, c, r) : r();
		} else c();
	}, ye = (e, t) => {
		let n;
		for (; e !== t;) n = h(e), s(e), e = n;
		s(t);
	}, be = (e, t, n) => {
		let { bum: r, scope: i, job: a, subTree: o, um: s, m: c, a: l } = e;
		Yr(c), Yr(l), r && ce(r), i.stop(), a ? (a.flags |= 8, E(o, e, t, n)) : o && (o.transition = e.vnode.transition, E(o, e, t, n)), s && B(s, t);
		let u = () => {
			e.isUnmounted = !0;
		};
		u.flags = 16, B(u, t);
	}, xe = (e, t, n, r = !1, i = !1, a = 0) => {
		for (let o = a; o < e.length; o++) E(e[o], t, n, r, i);
	}, Se = (e) => {
		if (e.shapeFlag & 6) return Se(e.component.subTree);
		if (e.shapeFlag & 128) return e.suspense.next();
		let t = h(e.anchor || e.el), n = t && t[zn];
		return n ? h(n) : t;
	}, Ce = (e, t, n) => {
		Tn(() => {
			e == null ? t._vnode && E(t._vnode, null, null, !0) : v(t._vnode || null, e, t, null, null, null, n), t._vnode = e;
		}, e && t._vnode ? void 0 : e && e.component ? e.component.uid : Ci());
	}, D = {
		p: v,
		um: E,
		m: _e,
		r: ve,
		mt: le,
		mc: T,
		pc: me,
		pbc: ie,
		n: Se,
		o: e
	}, we, Te;
	return i && ([we, Te] = i(D)), {
		render: Ce,
		hydrate: we,
		createApp: ur(Ce, we)
	};
}
function Ur({ type: e, props: t }, n) {
	return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function Wr({ effect: e, job: t }, n) {
	n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Gr(e, t) {
	return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function Kr(e, t, n = !1) {
	let r = e.children, i = t.children;
	if (d(r) && d(i)) for (let e = 0; e < r.length; e++) {
		let t = r[e], a = i[e];
		a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[e] = _i(i[e]), a.el = t.el), !n && a.patchFlag !== -2 && Kr(t, a)), a.type === ei && (a.patchFlag === -1 && (a = i[e] = _i(a)), a.el = t.el), a.type === ti && !a.el && (a.el = t.el);
	}
}
function qr(e) {
	let t = e.slice(), n = [0], r, i, a, o, s, c = e.length;
	for (r = 0; r < c; r++) {
		let c = e[r];
		if (c !== 0) {
			if (i = n[n.length - 1], e[i] < c) {
				t[r] = i, n.push(r);
				continue;
			}
			for (a = 0, o = n.length - 1; a < o;) s = a + o >> 1, e[n[s]] < c ? a = s + 1 : o = s;
			c < e[n[a]] && (a > 0 && (t[r] = n[a - 1]), n[a] = r);
		}
	}
	for (a = n.length, o = n[a - 1]; a-- > 0;) n[a] = o, o = t[o];
	return n;
}
function Jr(e) {
	let t = e.subTree.component;
	if (t) return t.asyncDep && !t.asyncResolved ? t : Jr(t);
}
function Yr(e) {
	if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
function Xr(e) {
	if (e.placeholder) return e.placeholder;
	let t = e.component;
	if (t) return Xr(t.subTree);
	let n = e.suspense;
	return n && n.activeBranch ? Xr(n.activeBranch) : null;
}
var Zr = (e) => e.__isSuspense, Qr = /* @__PURE__ */ Symbol("_deferredEnter");
function $r(e, t) {
	t && t.pendingBranch ? d(e) ? t.effects.push(...e) : t.effects.push(e) : xn(e);
}
var V = /* @__PURE__ */ Symbol.for("v-fgt"), ei = /* @__PURE__ */ Symbol.for("v-txt"), ti = /* @__PURE__ */ Symbol.for("v-cmt"), ni = /* @__PURE__ */ Symbol.for("v-stc"), ri = [], H = null;
function U(e = !1) {
	ri.push(H = e ? null : []);
}
function ii() {
	ri.pop(), H = ri[ri.length - 1] || null;
}
var ai = 1;
function oi(e, t = !1) {
	ai += e, e < 0 && H && t && (H.hasOnce = !0);
}
function si(e) {
	return e.dynamicChildren = ai > 0 ? H || n : null, ii(), ai > 0 && H && H.push(e), e;
}
function W(e, t, n, r, i, a) {
	return si(G(e, t, n, r, i, a, !0));
}
function ci(e, t, n, r, i) {
	return si(K(e, t, n, r, i, !0));
}
function li(e) {
	return e ? e.__v_isVNode === !0 : !1;
}
function ui(e, t) {
	return e.type === t.type && e.key === t.key;
}
var di = ({ key: e }) => e ?? null, fi = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e == null ? null : g(e) || /* @__PURE__ */ F(e) || h(e) ? {
	i: On,
	r: e,
	k: t,
	f: !!n
} : e);
function G(e, t = null, n = null, r = 0, i = null, a = e === V ? 0 : 1, o = !1, s = !1) {
	let c = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e,
		props: t,
		key: t && di(t),
		ref: t && fi(t),
		scopeId: kn,
		slotScopeIds: null,
		children: n,
		component: null,
		suspense: null,
		ssContent: null,
		ssFallback: null,
		dirs: null,
		transition: null,
		el: null,
		anchor: null,
		target: null,
		targetStart: null,
		targetAnchor: null,
		staticCount: 0,
		shapeFlag: a,
		patchFlag: r,
		dynamicProps: i,
		dynamicChildren: null,
		appContext: null,
		ctx: On
	};
	return s ? (vi(c, n), a & 128 && e.normalize(c)) : n && (c.shapeFlag |= g(n) ? 8 : 16), ai > 0 && !o && H && (c.patchFlag > 0 || a & 6) && c.patchFlag !== 32 && H.push(c), c;
}
var K = pi;
function pi(e, t = null, n = null, r = 0, i = null, a = !1) {
	if (e && e !== rr || (e = ti), li(e)) {
		let r = hi(e, t, !0);
		return n && vi(r, n), ai > 0 && !a && H && (r.shapeFlag & 6 ? H[H.indexOf(e)] = r : H.push(r)), r.patchFlag = -2, r;
	}
	if (Bi(e) && (e = e.__vccOpts), t) {
		t = mi(t);
		let { class: e, style: n } = t;
		e && !g(e) && (t.class = E(e)), v(n) && (/* @__PURE__ */ Wt(n) && !d(n) && (n = s({}, n)), t.style = pe(n));
	}
	let o = g(e) ? 1 : Zr(e) ? 128 : Bn(e) ? 64 : v(e) ? 4 : h(e) ? 2 : 0;
	return G(e, t, n, r, i, o, a, !0);
}
function mi(e) {
	return e ? /* @__PURE__ */ Wt(e) ? s({}, e) : Er(e) ? s({}, e[Ii] || e) : e : null;
}
function hi(e, t, n = !1, r = !1) {
	let { props: i, ref: a, patchFlag: o, children: s, transition: c } = e, l = t ? yi(i || {}, t) : i, u = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e.type,
		props: l,
		key: l && di(l),
		ref: t && t.ref ? n && a ? d(a) ? a.concat(fi(t)) : [a, fi(t)] : fi(t) : a,
		scopeId: e.scopeId,
		slotScopeIds: e.slotScopeIds,
		children: s,
		target: e.target,
		targetStart: e.targetStart,
		targetAnchor: e.targetAnchor,
		staticCount: e.staticCount,
		shapeFlag: e.shapeFlag,
		patchFlag: t && e.type !== V ? o === -1 ? 16 : o | 16 : o,
		dynamicProps: e.dynamicProps,
		dynamicChildren: e.dynamicChildren,
		appContext: e.appContext,
		dirs: e.dirs,
		transition: c,
		component: e.component,
		suspense: e.suspense,
		ssContent: e.ssContent && hi(e.ssContent),
		ssFallback: e.ssFallback && hi(e.ssFallback),
		placeholder: e.placeholder,
		el: e.el,
		anchor: e.anchor,
		ctx: e.ctx,
		ce: e.ce,
		cacheIndex: e.cacheIndex
	};
	return c && r && Wn(u, c.clone(u)), u;
}
function q(e = " ", t = 0) {
	return K(ei, null, e, t);
}
function J(e = "", t = !1) {
	return t ? (U(), ci(ti, null, e)) : K(ti, null, e);
}
function gi(e) {
	return e == null || typeof e == "boolean" ? K(ti) : d(e) ? K(V, null, e.slice()) : li(e) ? _i(e) : K(ei, null, String(e));
}
function _i(e) {
	return e.el === null && e.patchFlag !== -1 || e.memo ? e : hi(e);
}
function vi(e, t) {
	let n = 0, { shapeFlag: r } = e;
	if (t == null) t = null;
	else if (d(t)) n = 16;
	else if (typeof t == "object") {
		if (r & 65) {
			let n = t.default;
			n && (n._c && (n._d = !1), vi(e, n()), n._c && (n._d = !0));
			return;
		}
		{
			n = 32;
			let r = t._;
			!r && !Er(t) ? t._ctx = On : r === 3 && On && (On.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
		}
	} else if (h(t)) {
		if (r & 65) {
			vi(e, { default: t });
			return;
		}
		t = {
			default: t,
			_ctx: On
		}, n = 32;
	} else t = String(t), r & 64 ? (n = 16, t = [q(t)]) : n = 8;
	e.children = t, e.shapeFlag |= n;
}
function yi(...e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		for (let e in r) if (e === "class") t.class !== r.class && (t.class = E([t.class, r.class]));
		else if (e === "style") t.style = pe([t.style, r.style]);
		else if (a(e)) {
			let n = t[e], i = r[e];
			i && n !== i && !(d(n) && n.includes(i)) ? t[e] = n ? [].concat(n, i) : i : i == null && n == null && !o(e) && (t[e] = i);
		} else e !== "" && (t[e] = r[e]);
	}
	return t;
}
function bi(e, t, n, r = null) {
	cn(e, t, 7, [n, r]);
}
var xi = /* @__PURE__ */ cr(), Si = 0;
function Ci() {
	return Si;
}
function wi(e, n, r) {
	let i = e.type, a = (n ? n.appContext : e.appContext) || xi, o = {
		uid: Si++,
		vnode: e,
		type: i,
		parent: n,
		appContext: a,
		root: null,
		next: null,
		subTree: null,
		effect: null,
		update: null,
		job: null,
		scope: new Oe(!0),
		render: null,
		proxy: null,
		exposed: null,
		exposeProxy: null,
		withProxy: null,
		provides: n ? n.provides : Object.create(a.provides),
		ids: n ? n.ids : [
			"",
			0,
			0
		],
		accessCache: null,
		renderCache: [],
		components: null,
		directives: null,
		propsOptions: jr(i, a),
		emitsOptions: mr(i, a),
		emit: null,
		emitted: null,
		propsDefaults: t,
		inheritAttrs: i.inheritAttrs,
		ctx: t,
		data: t,
		props: t,
		attrs: t,
		slots: t,
		refs: t,
		setupState: t,
		setupContext: null,
		suspense: r,
		suspenseId: r ? r.pendingId : 0,
		asyncDep: null,
		asyncResolved: !1,
		isMounted: !1,
		isUnmounted: !1,
		isDeactivated: !1,
		bc: null,
		c: null,
		bm: null,
		m: null,
		bu: null,
		u: null,
		um: null,
		bum: null,
		da: null,
		a: null,
		rtg: null,
		rtc: null,
		ec: null,
		sp: null
	};
	return o.ctx = { _: o }, o.root = n ? n.root : o, o.emit = pr.bind(null, o), e.ce && e.ce(o), o;
}
var Y = null, Ti = () => Y || On, Ei, Di;
{
	let e = fe(), t = (t, n) => {
		let r;
		return (r = e[t]) || (r = e[t] = []), r.push(n), (e) => {
			r.length > 1 ? r.forEach((t) => t(e)) : r[0](e);
		};
	};
	Ei = t("__VUE_INSTANCE_SETTERS__", (e) => Y = e), Di = t("__VUE_SSR_SETTERS__", (e) => ji = e);
}
var Oi = (e) => {
	let t = Y;
	return Ei(e), e.scope.on(), () => {
		e.scope.off(), Ei(t);
	};
}, ki = () => {
	Y && Y.scope.off(), Ei(null);
};
function Ai(e) {
	return e.vnode.shapeFlag & 4;
}
var ji = !1;
function Mi(e, t = !1, n = !1) {
	t && Di(t);
	let { props: r, children: i } = e.vnode, a = Ai(e);
	Dr(e, r, a, t), zr(e, i, n || t);
	let o = a ? Ni(e, t) : void 0;
	return t && Di(!1), o;
}
function Ni(e, t) {
	let n = e.type;
	e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, sr);
	let { setup: r } = n;
	if (r) {
		Ke();
		let n = e.setupContext = r.length > 1 ? Ri(e) : null, i = Oi(e), a = sn(r, e, 0, [e.props, n]), o = y(a);
		if (qe(), i(), (o || e.sp) && !Zn(e) && Kn(e), o) {
			if (a.then(ki, ki), t) return a.then((n) => {
				Di(!0);
				try {
					Pi(e, n, t);
				} finally {
					Di(!1);
				}
			}).catch((t) => {
				ln(t, e, 0, void 0, !0), e.ssrRender = (e, t) => t("<!---->");
			});
			e.asyncDep = a;
		} else Pi(e, a, t);
	} else Fi(e, t);
}
function Pi(e, t, n) {
	h(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : v(t) && (e.setupState = Zt(t)), Fi(e, n);
}
function Fi(e, t, n) {
	let i = e.type;
	e.render ||= i.render || r;
}
var Ii = /* @__PURE__ */ Symbol(), Li = { get(e, t) {
	return j(e, "get", ""), t === Ii ? e : e[t];
} };
function Ri(e) {
	return {
		attrs: new Proxy(e.attrs, Li),
		slots: e.slots,
		emit: e.emit,
		expose: (t) => {
			e.exposed = t || {};
		}
	};
}
function zi(e) {
	return e.exposed ? e.exposeProxy ||= new Proxy(Zt(Gt(e.exposed)), {
		get(t, n) {
			if (n in t) return t[n];
			if (n in ar) return ar[n](e);
		},
		has(e, t) {
			return t in e || t in ar;
		}
	}) : e.proxy;
}
function Bi(e) {
	return h(e) && "__vccOpts" in e;
}
var X = (e, t) => /* @__PURE__ */ $t(e, t, ji), Vi = "3.5.45", Hi = void 0, Ui = typeof window < "u" && window.trustedTypes;
if (Ui) try {
	Hi = /* @__PURE__ */ Ui.createPolicy("vue", { createHTML: (e) => e });
} catch {}
var Wi = Hi ? (e) => Hi.createHTML(e) : (e) => e, Gi = "http://www.w3.org/2000/svg", Ki = "http://www.w3.org/1998/Math/MathML", qi = typeof document < "u" ? document : null, Ji = qi && /* @__PURE__ */ qi.createElement("template"), Yi = {
	insert: (e, t, n) => {
		t.insertBefore(e, n || null);
	},
	remove: (e) => {
		let t = e.parentNode;
		t && t.removeChild(e);
	},
	createElement: (e, t, n, r) => {
		let i = t === "svg" ? qi.createElementNS(Gi, e) : t === "mathml" ? qi.createElementNS(Ki, e) : n ? qi.createElement(e, { is: n }) : qi.createElement(e);
		return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
	},
	createText: (e) => qi.createTextNode(e),
	createComment: (e) => qi.createComment(e),
	setText: (e, t) => {
		e.nodeValue = t;
	},
	setElementText: (e, t) => {
		e.textContent = t;
	},
	parentNode: (e) => e.parentNode,
	nextSibling: (e) => e.nextSibling,
	querySelector: (e) => qi.querySelector(e),
	setScopeId(e, t) {
		e.setAttribute(t, "");
	},
	insertStaticContent(e, t, n, r, i, a) {
		let o = n ? n.previousSibling : t.lastChild;
		if (i && (i === a || i.nextSibling)) for (; t.insertBefore(i.cloneNode(!0), n), i !== a && (i = i.nextSibling););
		else {
			Ji.innerHTML = Wi(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
			let i = Ji.content;
			if (r === "svg" || r === "mathml") {
				let e = i.firstChild;
				for (; e.firstChild;) i.appendChild(e.firstChild);
				i.removeChild(e);
			}
			t.insertBefore(i, n);
		}
		return [o ? o.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild];
	}
}, Xi = /* @__PURE__ */ Symbol("_vtc");
function Zi(e, t, n) {
	let r = e[Xi];
	r && (t = (t ? [t, ...r] : [...r]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
var Qi = /* @__PURE__ */ Symbol("_vod"), $i = /* @__PURE__ */ Symbol("_vsh"), ea = {
	name: "show",
	beforeMount(e, { value: t }, { transition: n }) {
		e[Qi] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : ta(e, t);
	},
	mounted(e, { value: t }, { transition: n }) {
		n && t && n.enter(e);
	},
	updated(e, { value: t, oldValue: n }, { transition: r }) {
		!t != !n && (r ? t ? (r.beforeEnter(e), ta(e, !0), r.enter(e)) : r.leave(e, () => {
			ta(e, !1);
		}) : ta(e, t));
	},
	beforeUnmount(e, { value: t }) {
		ta(e, t);
	}
};
function ta(e, t) {
	e.style.display = t ? e[Qi] : "none", e[$i] = !t;
}
var na = /* @__PURE__ */ Symbol(""), ra = /(?:^|;)\s*display\s*:/;
function ia(e, t, n) {
	let r = e.style, i = g(n), a = !1;
	if (n && !i) {
		if (t) {
			if (g(t)) for (let e of t.split(";")) {
				let t = e.slice(0, e.indexOf(":")).trim();
				n[t] ?? oa(r, t, "");
			}
			else for (let e in t) n[e] ?? oa(r, e, "");
		}
		for (let i in n) {
			i === "display" && (a = !0);
			let o = n[i];
			o == null ? oa(r, i, "") : ua(e, i, !g(t) && t ? t[i] : void 0, o) || oa(r, i, o);
		}
	} else if (i) {
		if (t !== n) {
			let e = r[na];
			e && (n += ";" + e), r.cssText = n, a = ra.test(n);
		}
	} else t && e.removeAttribute("style");
	Qi in e && (i && t === n || (e[Qi] = a ? r.display : ""), e[$i] && (r.display = "none"));
}
var aa = /\s*!important$/;
function oa(e, t, n) {
	if (d(n)) n.forEach((n) => oa(e, t, n));
	else if (n ??= "", t.startsWith("--")) aa.test(n) ? e.setProperty(t, n.replace(aa, ""), "important") : e.setProperty(t, n);
	else {
		let r = la(e, t);
		aa.test(n) ? e.setProperty(ie(r), n.replace(aa, ""), "important") : e[r] = n;
	}
}
var sa = [
	"Webkit",
	"Moz",
	"ms"
], ca = {};
function la(e, t) {
	let n = ca[t];
	if (n) return n;
	let r = T(t);
	if (r !== "filter" && r in e) return ca[t] = r;
	r = ae(r);
	for (let n = 0; n < sa.length; n++) {
		let i = sa[n] + r;
		if (i in e) return ca[t] = i;
	}
	return t;
}
function ua(e, t, n, r) {
	return e.tagName === "TEXTAREA" && (t === "width" || t === "height") && g(r) && n === r;
}
var da = "http://www.w3.org/1999/xlink";
function fa(e, t, n, r, i, a = ve(t)) {
	r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(da, t.slice(6, t.length)) : e.setAttributeNS(da, t, n) : n == null || a && !ye(n) ? e.removeAttribute(t) : e.setAttribute(t, a ? "" : _(n) ? String(n) : n);
}
function pa(e, t, n, r, i) {
	if (t === "innerHTML" || t === "textContent") {
		n != null && (e[t] = t === "innerHTML" ? Wi(n) : n);
		return;
	}
	let a = e.tagName;
	if (t === "value" && a !== "PROGRESS" && !a.includes("-")) {
		let r = a === "OPTION" ? e.getAttribute("value") || "" : e.value, i = n == null ? e.type === "checkbox" ? "on" : "" : String(n);
		r === i && "_value" in e || (e.value = i), n ?? e.removeAttribute(t), e._value = n;
		return;
	}
	let o = !1;
	if (n === "" || n == null) {
		let r = typeof e[t];
		r === "boolean" ? n = ye(n) : n == null && r === "string" ? (n = "", o = !0) : r === "number" && (n = 0, o = !0);
	}
	try {
		e[t] = n;
	} catch {}
	o && e.removeAttribute(i || t);
}
function ma(e, t, n, r) {
	e.addEventListener(t, n, r);
}
function ha(e, t, n, r) {
	e.removeEventListener(t, n, r);
}
var ga = /* @__PURE__ */ Symbol("_vei");
function _a(e, t, n, r, i = null) {
	let a = e[ga] || (e[ga] = {}), o = a[t];
	if (r && o) o.value = r;
	else {
		let [n, s] = ba(t);
		r ? ma(e, n, a[t] = wa(r, i), s) : o && (ha(e, n, o, s), a[t] = void 0);
	}
}
var va = /(Once|Passive|Capture)$/, ya = /^on:?(?:Once|Passive|Capture)$/;
function ba(e) {
	let t, n;
	for (; (n = e.match(va)) && !ya.test(e);) t ||= {}, e = e.slice(0, e.length - n[1].length), t[n[1].toLowerCase()] = !0;
	return [e[2] === ":" ? e.slice(3) : ie(e.slice(2)), t];
}
var xa = 0, Sa = /* @__PURE__ */ Promise.resolve(), Ca = () => xa ||= (Sa.then(() => xa = 0), Date.now());
function wa(e, t) {
	let n = (e) => {
		if (!e._vts) e._vts = Date.now();
		else if (e._vts <= n.attached) return;
		let r = n.value;
		if (d(r)) {
			let n = e.stopImmediatePropagation;
			e.stopImmediatePropagation = () => {
				n.call(e), e._stopped = !0;
			};
			let i = r.slice(), a = [e];
			for (let n = 0; n < i.length && !e._stopped; n++) {
				let e = i[n];
				e && cn(e, t, 5, a);
			}
		} else cn(r, t, 5, [e]);
	};
	return n.value = e, n.attached = Ca(), n;
}
var Ta = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Ea = (e, t, n, r, i, s) => {
	let c = i === "svg";
	t === "class" ? Zi(e, r, c) : t === "style" ? ia(e, n, r) : a(t) ? o(t) || _a(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), 1) : t[0] === "^" ? (t = t.slice(1), 0) : Da(e, t, r, c)) ? (pa(e, t, r), e.tagName.includes("-") || t !== "value" && t !== "checked" && t !== "selected" || fa(e, t, r, c, s, t !== "value")) : e._isVueCE && (Oa(e, t) || e._def.__asyncLoader && (/[A-Z]/.test(t) || !g(r))) ? pa(e, T(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), fa(e, t, r, c));
};
function Da(e, t, n, r) {
	if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Ta(t) && h(n));
	if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return !1;
	if (t === "width" || t === "height") {
		let t = e.tagName;
		if (t === "IMG" || t === "VIDEO" || t === "CANVAS" || t === "SOURCE") return !1;
	}
	return Ta(t) && g(n) ? !1 : t in e;
}
function Oa(e, t) {
	let n = e._def.props;
	if (!n) return !1;
	let r = T(t);
	return Array.isArray(n) ? n.some((e) => T(e) === r) : Object.keys(n).some((e) => T(e) === r);
}
var ka = (e) => {
	let t = e.props["onUpdate:modelValue"] || !1;
	return d(t) ? (e) => ce(t, e) : t;
};
function Aa(e) {
	e.target.composing = !0;
}
function ja(e) {
	let t = e.target;
	t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
var Ma = /* @__PURE__ */ Symbol("_assign"), Na = /* @__PURE__ */ Symbol("_initialValue");
function Pa(e, t, n) {
	return t && (e = e.trim()), n && (e = ue(e)), e;
}
var Fa = {
	created(e, { modifiers: { lazy: t, trim: n, number: r } }, i) {
		e.parentNode && (e.type === "text" ? e[Na] = e.defaultValue.replace(/[\r\n]/g, "") : e.type === "textarea" && (e[Na] = e.defaultValue.replace(/\r\n?/g, "\n"))), e[Ma] = ka(i);
		let a = r || i.props && i.props.type === "number";
		ma(e, t ? "change" : "input", (t) => {
			t.target.composing || e[Ma](Pa(e.value, n, a));
		}), (n || a) && ma(e, "change", () => {
			e.value = Pa(e.value, n, a);
		}), t || (ma(e, "compositionstart", Aa), ma(e, "compositionend", ja), ma(e, "change", ja));
	},
	mounted(e, { value: t, modifiers: { trim: n, number: r } }) {
		let i = t ?? "", a = e[Na];
		delete e[Na], a !== void 0 && (e.type === "text" || e.type === "textarea") && e.value !== a ? e[Ma](Pa(e.value, n, r)) : e.value = i;
	},
	beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: i, number: a } }, o) {
		if (e[Ma] = ka(o), e.composing) return;
		let s = (a || e.type === "number") && !/^0\d/.test(e.value) ? ue(e.value) : e.value, c = t ?? "";
		if (s === c) return;
		let l = e.getRootNode();
		(l instanceof Document || l instanceof ShadowRoot) && l.activeElement === e && e.type !== "range" && (r && t === n || i && e.value.trim() === c) || (e.value = c);
	}
}, Ia = {
	deep: !0,
	created(e, t, n) {
		e[Ma] = ka(n), ma(e, "change", () => {
			let t = e._modelValue, n = Va(e), r = e.checked, i = e[Ma];
			if (d(t)) {
				let e = we(t, n), a = e !== -1;
				if (r && !a) i(t.concat(n));
				else if (!r && a) {
					let n = [...t];
					n.splice(e, 1), i(n);
				}
			} else if (p(t)) {
				let e = new Set(t);
				r ? e.add(n) : e.delete(n), i(e);
			} else i(Ha(e, r));
		});
	},
	mounted: La,
	beforeUpdate(e, t, n) {
		e[Ma] = ka(n), La(e, t, n);
	}
};
function La(e, { value: t, oldValue: n }, r) {
	e._modelValue = t;
	let i;
	if (d(t)) i = we(t, r.props.value) > -1;
	else if (p(t)) i = t.has(r.props.value);
	else {
		if (t === n) return;
		i = D(t, Ha(e, !0));
	}
	e.checked !== i && (e.checked = i);
}
var Ra = {
	deep: !0,
	created(e, { value: t, modifiers: { number: n } }, r) {
		e._modelValue = t, ma(e, "change", () => {
			let t = Array.prototype.filter.call(e.options, (e) => e.selected).map((e) => n ? ue(Va(e)) : Va(e)), r = e.multiple, i = r ? p(e._modelValue) ? new Set(t) : t : t[0], a = e._pendingValue = [r, r ? d(i) ? t.slice() : t : i];
			try {
				e[Ma](i);
			} finally {
				_n(() => {
					e._pendingValue === a && (e._pendingValue = void 0);
				});
			}
		}), e[Ma] = ka(r);
	},
	mounted(e, { value: t, modifiers: { number: n } }) {
		Ba(e, t, n);
	},
	beforeUpdate(e, { value: t }, n) {
		e._modelValue = t, e[Ma] = ka(n);
	},
	updated(e, { value: t, modifiers: { number: n } }) {
		let r = e._pendingValue;
		e._pendingValue = void 0, r && r[0] === e.multiple && za(t, r[1], r[0]) || Ba(e, t, n);
	}
};
function za(e, t, n) {
	if (!n || d(e)) return D(e, t);
	if (p(e)) {
		if (e.size !== t.length) return !1;
		for (let n of t) if (!e.has(n)) return !1;
		return !0;
	}
	return !1;
}
function Ba(e, t, n = !1) {
	let r = e.multiple, i = d(t);
	if (!r || i || p(t)) {
		for (let a = 0, o = e.options.length; a < o; a++) {
			let o = e.options[a], s = Va(o);
			if (r) {
				if (i) {
					let e = typeof s;
					o.selected = e === "string" || e === "number" ? t.some((e) => String(e) === String(s)) : we(t, s) > -1;
				} else o.selected = t.has(s) || n && typeof s == "string" && t.has(ue(s));
			} else if (D(Va(o), t)) {
				e.selectedIndex !== a && (e.selectedIndex = a);
				return;
			}
		}
		!r && e.selectedIndex !== -1 && (e.selectedIndex = -1);
	}
}
function Va(e) {
	return "_value" in e ? e._value : e.value;
}
function Ha(e, t) {
	let n = t ? "_trueValue" : "_falseValue";
	return n in e ? e[n] : t;
}
var Ua = [
	"ctrl",
	"shift",
	"alt",
	"meta"
], Wa = {
	stop: (e) => e.stopPropagation(),
	prevent: (e) => e.preventDefault(),
	self: (e) => e.target !== e.currentTarget,
	ctrl: (e) => !e.ctrlKey,
	shift: (e) => !e.shiftKey,
	alt: (e) => !e.altKey,
	meta: (e) => !e.metaKey,
	left: (e) => "button" in e && e.button !== 0,
	middle: (e) => "button" in e && e.button !== 1,
	right: (e) => "button" in e && e.button !== 2,
	exact: (e, t) => Ua.some((n) => e[`${n}Key`] && !t.includes(n))
}, Ga = (e, t) => {
	if (!e) return e;
	let n = e._withMods ||= {}, r = t.join(".");
	return n[r] || (n[r] = ((n, ...r) => {
		for (let e = 0; e < t.length; e++) {
			let r = Wa[t[e]];
			if (r && r(n, t)) return;
		}
		return e(n, ...r);
	}));
}, Ka = {
	esc: "escape",
	space: " ",
	up: "arrow-up",
	left: "arrow-left",
	right: "arrow-right",
	down: "arrow-down",
	delete: "backspace"
}, qa = (e, t) => {
	let n = e._withKeys ||= {}, r = t.join(".");
	return n[r] || (n[r] = ((n) => {
		if (!("key" in n)) return;
		let r = ie(n.key);
		if (t.some((e) => e === r || Ka[e] === r)) return e(n);
	}));
}, Ja = /* @__PURE__ */ s({ patchProp: Ea }, Yi), Ya;
function Xa() {
	return Ya ||= Vr(Ja);
}
var Za = ((...e) => {
	let t = Xa().createApp(...e), { mount: n } = t;
	return t.mount = (e) => {
		let r = $a(e);
		if (!r) return;
		let i = t._component;
		h(i) || i.render || i.template || (i.template = r.innerHTML), r.nodeType === 1 && (r.textContent = "");
		let a = n(r, !1, Qa(r));
		return r instanceof Element && (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")), a;
	}, t;
});
function Qa(e) {
	if (e instanceof SVGElement) return "svg";
	if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
}
function $a(e) {
	return g(e) ? document.querySelector(e) : e;
}
// app/web/frontend/lib/layout.js
function eo(e) {
	let t = e.defaultView, n = new t.AbortController(), r = (e, t, r) => e.addEventListener(t, r, { signal: n.signal }), i = (t) => e.querySelector(t), a = (t) => [...e.querySelectorAll(t)], o = i(".shell"), s = e.documentElement, c = a("[data-resize-panel]"), l = "zhiyue.panel-widths.v1", u = {
		sidebar: [140, 360],
		papers: [200, 600],
		assistant: [260, 900]
	}, d = {
		sidebar: "--sidebar-width",
		papers: "--paper-list-width",
		assistant: "--assistant-width"
	}, f = {}, p = {}, m = null;
	try {
		let e = JSON.parse(t.localStorage.getItem(l));
		for (let t of Object.keys(u)) typeof e?.[t] == "number" && Number.isFinite(e[t]) && (f[t] = e[t]);
	} catch {}
	let h = (e, t, n) => Math.min(n, Math.max(t, e)), g = () => t.innerWidth >= 1700 ? {
		sidebar: 208,
		papers: 320,
		assistant: 380
	} : t.innerWidth <= 1250 ? {
		sidebar: 176,
		papers: 250,
		assistant: 310
	} : {
		sidebar: 196,
		papers: 300,
		assistant: 350
	}, _ = () => t.innerWidth > 1050;
	function v(e) {
		let t = Object.entries(p).filter(([t]) => t !== e).reduce((e, [, t]) => e + t, 0);
		return [u[e][0], Math.max(u[e][0], Math.min(u[e][1], o.clientWidth - 240 - t))];
	}
	function y() {
		let e = g();
		p = Object.fromEntries(Object.keys(u).map((t) => [t, h(f[t] ?? e[t], ...u[t])]));
		let t = o.clientWidth - 240, n = Object.values(u).reduce((e, [t]) => e + t, 0), r = Object.values(p).reduce((e, t) => e + t, 0);
		if (_() && r > t) {
			let e = h((t - n) / (r - n || 1), 0, 1);
			for (let t of Object.keys(p)) p[t] = u[t][0] + Math.floor((p[t] - u[t][0]) * e);
		}
		for (let [e, t] of Object.entries(p)) s.style.setProperty(d[e], `${t}px`);
		for (let e of c) {
			let t = e.dataset.resizePanel, [n, r] = v(t);
			e.setAttribute("aria-valuemin", String(n)), e.setAttribute("aria-valuemax", String(Math.round(r))), e.setAttribute("aria-valuenow", String(Math.round(p[t]))), e.setAttribute("aria-valuetext", `${Math.round(p[t])} 像素`);
		}
	}
	function b() {
		try {
			t.localStorage.setItem(l, JSON.stringify(f));
		} catch {}
	}
	function x(t = !1) {
		if (!m) return;
		let n = m;
		m = null, t && (f = n.previous), n.shield.remove(), n.handle.removeAttribute("data-dragging"), e.body.classList.remove("resizing-panels"), n.handle.hasPointerCapture(n.pointerId) && n.handle.releasePointerCapture(n.pointerId), y(), t || b();
	}
	for (let t of c) {
		let n = t.dataset.resizePanel;
		r(t, "pointerdown", (r) => {
			if (r.button !== 0 || !_() || m) return;
			r.preventDefault(), t.focus({ preventScroll: !0 });
			let i = e.createElement("div");
			i.className = "layout-resize-shield", i.setAttribute("aria-hidden", "true"), e.body.append(i), m = {
				handle: t,
				key: n,
				pointerId: r.pointerId,
				x: r.clientX,
				width: p[n],
				startWidths: { ...p },
				previous: { ...f },
				bounds: v(n),
				shield: i
			}, t.setAttribute("data-dragging", ""), e.body.classList.add("resizing-panels"), t.setPointerCapture(r.pointerId);
		}), r(t, "lostpointercapture", () => x()), r(t, "dblclick", () => {
			_() && (x(), delete f[n], y(), b());
		}), r(t, "keydown", (e) => {
			if (!_() || m || ![
				"ArrowLeft",
				"ArrowRight",
				"Home",
				"End"
			].includes(e.key)) return;
			e.preventDefault();
			let [t, r] = v(n), i = e.shiftKey ? 48 : 16, a = e.key === "Home" ? t : e.key === "End" ? r : p[n] + (e.key === "ArrowRight" ? i : -i);
			f = {
				...p,
				[n]: h(a, t, r)
			}, y(), b();
		});
	}
	return r(e, "pointermove", (e) => {
		if (!m || e.pointerId !== m.pointerId) return;
		let t = (e.clientX - m.x) * (m.key === "assistant" ? -1 : 1);
		f = {
			...m.startWidths,
			[m.key]: h(m.width + t, ...m.bounds)
		}, y();
	}), r(e, "pointerup", (e) => {
		e.pointerId === m?.pointerId && x();
	}), r(e, "pointercancel", (e) => {
		e.pointerId === m?.pointerId && x(!0);
	}), r(e, "keydown", (e) => {
		e.key === "Escape" && m && (e.preventDefault(), x(!0));
	}), r(t, "blur", () => x()), r(t, "resize", () => {
		x(), y();
	}), r(t, "pagehide", () => x()), y(), () => {
		x(), n.abort();
	};
}
// app/web/frontend/lib/content.js
var Z = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[e]), to = {
	book: "M4 4h6a3 3 0 0 1 2 2 3 3 0 0 1 2-2h6v15h-6a3 3 0 0 0-2 2 3 3 0 0 0-2-2H4z M12 6v15",
	library: "M4 4h4v16H4z M10 4h4v16h-4z M17 4l4 15-3 1-4-15z",
	search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
	download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
	refresh: "M20 7a8 8 0 1 0 1 8 M20 3v5h-5",
	shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
	star: "M12 3l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9z",
	spark: "M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z",
	plus: "M12 5v14 M5 12h14",
	history: "M4 4v6h6 M4 10a8 8 0 1 1 1 7 M12 7v5l3 2",
	link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
	attach: "M8 13l6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9a7 7 0 0 1 10 10l-9 9",
	arrow: "M12 20V4 M5 11l7-7 7 7",
	stop: "M6 6h12v12H6z",
	chevron: "M6 9l6 6 6-6",
	close: "M6 6l12 12 M18 6L6 18",
	check: "M5 12l4 4L19 6",
	external: "M14 3h7v7 M21 3L10 14 M10 4H4v16h16v-6",
	folder: "M3 5h7l2 3h9v12H3z",
	user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3"
}, no = (e) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${to[e] || to.book}"/></svg>`, ro = (e, t) => ({
	method: e,
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(t)
}), Q = (e) => encodeURIComponent(String(e)), io = (e) => `/api/file?path=${encodeURIComponent(e)}`, ao = (e) => e.title || e.literature_id || "未命名文献", oo = (e) => Array.isArray(e.authors) ? e.authors.map((e) => typeof e == "string" ? e : e.name || "").join(", ") : e.authors || "作者待核实";
function so(e, t = "") {
	let n = String(e || "").trim();
	if (!n || /[\u0000-\u001f\u007f]/.test(n) || n.startsWith("//")) return "";
	if (/^https?:\/\//i.test(n)) try {
		return new URL(n).href;
	} catch {
		return "";
	}
	if (n.startsWith("#")) return n;
	if (/^[a-z][a-z\d+.-]*:/i.test(n)) return "";
	if (/^\/api\/(file\?|uploads\/)/.test(n)) return n;
	let r = t.replace(/\\/g, "/").split("/").slice(0, -1).join("/"), i = n.replace(/\\/g, "/");
	if (i.startsWith("//")) return "";
	let a = (i.startsWith("/") ? i : `${r ? r + "/" : ""}${i}`).split("/"), o = [];
	for (let e of a) if (e && e !== ".") {
		if (e === "..") {
			if (!o.length) return "";
			o.pop();
		} else o.push(e);
	}
	return o.length ? io(o.join("/")) : "";
}
function co(e, t = "") {
	let n = [], r = (e) => `\u0001${n.push(e) - 1}\u0002`, i = String(e).replace(/[\u0001\u0002]/g, "");
	return i = i.replace(/`([^`]+)`/g, (e, t) => r(`<code>${Z(t)}</code>`)), i = i.replace(/(!?)\[([^\]\n]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, (e, n, i, a) => {
		let o = so(a, t);
		return r(o ? n ? `<img src="${Z(o)}" alt="${Z(i)}" loading="lazy" referrerpolicy="no-referrer">` : `<a href="${Z(o)}" target="_blank" rel="noopener noreferrer">${Z(i)}</a>` : Z(i));
	}), i = Z(i).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>").replace(/~~([^~\n]+)~~/g, "<del>$1</del>"), i.replace(/\u0001(\d+)\u0002/g, (e, t) => n[Number(t)] || "");
}
function lo(e, t = "") {
	let n = String(e || "").replace(/\r\n?/g, "\n").split("\n"), r = "", i = [], a = "", o = () => {
		i.length && (r += `<p>${i.map((e) => co(e, t)).join("<br>")}</p>`, i = []), a &&= (r += `</${a}>`, "");
	};
	for (let e = 0; e < n.length; e++) {
		let s = n[e];
		if (/^\s*```/.test(s)) {
			o();
			let t = [];
			for (; ++e < n.length && !/^\s*```/.test(n[e]);) t.push(n[e]);
			r += `<pre><code>${Z(t.join("\n"))}</code></pre>`;
			continue;
		}
		let c = /^(#{1,6})\s+(.+)$/.exec(s);
		if (c) {
			o(), r += `<h${c[1].length}>${co(c[2], t)}</h${c[1].length}>`;
			continue;
		}
		if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(s)) {
			o(), r += "<hr>";
			continue;
		}
		if (/^>\s?/.test(s)) {
			o(), r += `<blockquote>${co(s.replace(/^>\s?/, ""), t)}</blockquote>`;
			continue;
		}
		if (s.includes("|") && e + 1 < n.length && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(n[e + 1])) {
			o();
			let i = (e) => e.trim().replace(/^\||\|$/g, "").split("|");
			for (r += `<table><thead><tr>${i(s).map((e) => `<th>${co(e.trim(), t)}</th>`).join("")}</tr></thead><tbody>`, e++; e + 1 < n.length && n[e + 1].includes("|") && n[e + 1].trim();) e++, r += `<tr>${i(n[e]).map((e) => `<td>${co(e.trim(), t)}</td>`).join("")}</tr>`;
			r += "</tbody></table>";
			continue;
		}
		let l = /^\s*(?:([-+*])|\d+\.)\s+(.+)$/.exec(s);
		if (l) {
			let e = l[1] ? "ul" : "ol";
			(i.length || a && a !== e) && o(), a ||= (r += `<${e}>`, e), r += `<li>${co(l[2], t)}</li>`;
		} else s.trim() ? (a && o(), i.push(s)) : o();
	}
	return o(), r;
}
var uo = {
	unread: "未读",
	reading: "在读",
	read: "已读"
};
function fo(e) {
	return {
		未读: "unread",
		待标记: "unread",
		在读: "reading",
		阅读中: "reading",
		已读: "read",
		已读完: "read",
		completed: "read"
	}[e] || (e in uo ? e : "unread");
}
// app/web/frontend/components/Icon.vue
var po = {
	viewBox: "0 0 24 24",
	"aria-hidden": "true"
}, mo = ["d"], $ = {
	__name: "Icon",
	props: { name: {
		type: String,
		default: "book"
	} },
	setup(e) {
		return (t, n) => (U(), W("svg", po, [G("path", { d: I(to)[e.name] || I(to).book }, null, 8, mo)]));
	}
}, ho = [
	"data-resize-panel",
	"aria-label",
	"aria-controls",
	"title"
], go = {
	__name: "PanelHandle",
	props: { kind: {
		type: String,
		required: !0
	} },
	setup(e) {
		let t = e, n = {
			sidebar: ["navigation-panel", "分类栏"],
			papers: ["paper-panel", "文献列表"],
			assistant: ["assistant-panel", "助手栏"]
		}, r = X(() => n[t.kind]);
		return (t, n) => (U(), W("div", {
			class: E(["panel-resizer", { "panel-resizer-left": e.kind === "assistant" }]),
			"data-resize-panel": e.kind,
			role: "separator",
			"aria-orientation": "vertical",
			"aria-label": `调整${r.value[1]}宽度`,
			"aria-controls": r.value[0],
			tabindex: "0",
			title: `拖动调整${r.value[1]}宽度；双击恢复默认；方向键微调`
		}, null, 10, ho));
	}
}, _o = {
	id: "navigation-panel",
	class: "sidebar",
	"aria-label": "主导航"
}, vo = {
	class: "brand",
	href: "/",
	"aria-label": "Zhiyue 首页"
}, yo = { class: "brand-mark" }, bo = { class: "main-nav" }, xo = {
	id: "nav-total",
	class: "count"
}, So = {
	id: "categories",
	class: "categories"
}, Co = ["onClick"], wo = { class: "cat-name" }, To = { class: "cat-count" }, Eo = {
	__name: "Sidebar",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = X(() => {
			let e = /* @__PURE__ */ new Map();
			for (let t of n.papers) {
				let n = t.category || "未分类";
				e.set(n, (e.get(n) || 0) + 1);
			}
			let t = [{
				name: "",
				label: "全部文献",
				count: n.papers.length,
				child: ""
			}];
			for (let [r, i] of e) {
				if (t.push({
					name: r,
					label: r,
					count: i,
					child: ""
				}), n.category !== r) continue;
				let e = /* @__PURE__ */ new Map();
				for (let t of n.papers) t.category === r && t.subcategory && e.set(t.subcategory, (e.get(t.subcategory) || 0) + 1);
				for (let [n, i] of e) t.push({
					name: r,
					label: n,
					count: i,
					child: n
				});
			}
			return t;
		}), i = (e) => e.replace(/^\d+_/, "").replaceAll("_", " ");
		function a(e) {
			n.category = e.name, n.subcategory = e.child, t.setView("library"), t.setPanel("list");
		}
		return (e, o) => (U(), W("aside", _o, [
			G("a", vo, [G("span", yo, [K($)]), o[2] ||= G("span", null, "Zhiyue", -1)]),
			G("nav", bo, [G("button", {
				class: E(["nav-item", { active: I(n).view === "library" }]),
				"data-view": "library",
				onClick: o[0] ||= (e) => I(t).setView("library")
			}, [
				K($, { name: "library" }),
				o[3] ||= q("文献 ", -1),
				G("span", xo, O(I(n).papers.length), 1)
			], 2), G("button", {
				class: E(["nav-item", { active: I(n).view === "downloads" }]),
				"data-view": "downloads",
				onClick: o[1] ||= (e) => I(t).setView("downloads")
			}, [K($, { name: "download" }), o[4] ||= q("下载任务 ", -1)], 2)]),
			o[5] ||= G("div", { class: "section-label" }, "分类", -1),
			G("div", So, [(U(!0), W(V, null, z(r.value, (e) => (U(), W("button", {
				key: `${e.name}/${e.child}`,
				class: E(["category-button", {
					"category-child": e.child,
					active: I(n).category === e.name && I(n).subcategory === e.child
				}]),
				onClick: (t) => a(e)
			}, [
				e.child ? J("", !0) : (U(), ci($, {
					key: 0,
					name: "folder"
				})),
				G("span", wo, O(i(e.label)), 1),
				G("span", To, O(e.count), 1)
			], 10, Co))), 128))]),
			o[6] ||= G("div", { class: "sidebar-bottom" }, [G("span", { class: "workspace-dot" }), G("span", null, "本地工作区")], -1),
			K(go, { kind: "sidebar" })
		]));
	}
}, Do = {
	id: "paper-panel",
	class: "paper-panel",
	"aria-label": "文献筛选与列表"
}, Oo = { class: "list-controls" }, ko = { class: "search-box" }, Ao = { class: "filter-row" }, jo = ["value"], Mo = ["aria-pressed"], No = { class: "list-meta" }, Po = { id: "result-count" }, Fo = {
	id: "paper-list",
	class: "paper-list",
	tabindex: "0",
	"aria-label": "论文列表"
}, Io = {
	key: 0,
	class: "empty"
}, Lo = { class: "error-text" }, Ro = [
	"data-paper",
	"aria-label",
	"aria-current",
	"onClick",
	"onKeydown"
], zo = { class: "paper-top" }, Bo = { class: "paper-id" }, Vo = [
	"aria-pressed",
	"title",
	"aria-label",
	"disabled",
	"onClick"
], Ho = ["title"], Uo = { class: "paper-bottom" }, Wo = ["title"], Go = {
	key: 2,
	class: "empty"
}, Ko = {
	__name: "PaperList",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = X(() => [...new Set(n.papers.map((e) => e.year).filter(Boolean).map(String))].sort((e, t) => (Number(t) || 0) - (Number(e) || 0))), i = X(() => {
			let e = n.query.trim().toLocaleLowerCase(), t = n.papers.filter((t) => {
				let r = [
					t.title,
					t.titleZh,
					oo(t),
					t.literature_id,
					t.venue,
					t.category,
					t.subcategory
				].join(" ").toLocaleLowerCase();
				return (!e || r.includes(e)) && (!n.year || String(t.year) === n.year) && (!n.read || fo(t.readStatus) === n.read) && (!n.starred || t.starred) && (!n.category || (t.category || "未分类") === n.category) && (!n.subcategory || t.subcategory === n.subcategory);
			});
			return t.sort((e, t) => n.sort.startsWith("year") ? (Number(e.year) || 0) - (Number(t.year) || 0) : n.sort === "title" ? ao(e).localeCompare(ao(t)) : e.literature_id.localeCompare(t.literature_id, void 0, { numeric: !0 })), n.sort === "year-desc" ? t.reverse() : t;
		});
		return (e, a) => (U(), W("section", Do, [
			G("div", Oo, [
				G("label", ko, [
					K($, { name: "search" }),
					R(G("input", {
						id: "search",
						"onUpdate:modelValue": a[0] ||= (e) => I(n).query = e,
						type: "search",
						placeholder: "搜索题名、作者、编号…",
						"aria-label": "搜索文献"
					}, null, 512), [[Fa, I(n).query]]),
					a[7] ||= G("kbd", null, "/", -1)
				]),
				G("div", Ao, [
					R(G("select", {
						id: "year-filter",
						"onUpdate:modelValue": a[1] ||= (e) => I(n).year = e,
						"aria-label": "按年份筛选"
					}, [a[8] ||= G("option", { value: "" }, "全部年份", -1), (U(!0), W(V, null, z(r.value, (e) => (U(), W("option", { key: e }, O(e), 1))), 128))], 512), [[Ra, I(n).year]]),
					R(G("select", {
						id: "read-filter",
						"onUpdate:modelValue": a[2] ||= (e) => I(n).read = e,
						"aria-label": "按阅读状态筛选"
					}, [a[9] ||= G("option", { value: "" }, "全部进度", -1), (U(!0), W(V, null, z(I(uo), (e, t) => (U(), W("option", {
						key: t,
						value: t
					}, O(e), 9, jo))), 128))], 512), [[Ra, I(n).read]]),
					G("button", {
						id: "star-filter",
						class: E(["icon-button", { selected: I(n).starred }]),
						title: "仅看收藏",
						"aria-label": "仅看收藏",
						"aria-pressed": I(n).starred,
						onClick: a[3] ||= (e) => I(n).starred = !I(n).starred
					}, [K($, { name: "star" })], 10, Mo)
				]),
				G("div", No, [G("span", Po, O(I(n).libraryError ? "加载失败" : `${i.value.length} 篇文献`), 1), R(G("select", {
					id: "sort",
					"onUpdate:modelValue": a[4] ||= (e) => I(n).sort = e,
					"aria-label": "排序"
				}, [...a[10] ||= [
					G("option", { value: "id" }, "编号顺序", -1),
					G("option", { value: "year-desc" }, "年份从新到旧", -1),
					G("option", { value: "year-asc" }, "年份从旧到新", -1),
					G("option", { value: "title" }, "题名顺序", -1)
				]], 512), [[Ra, I(n).sort]])])
			]),
			G("div", Fo, [I(n).libraryError ? (U(), W("div", Io, [G("p", Lo, O(I(n).libraryError), 1), G("button", {
				class: "button subtle",
				onClick: a[5] ||= (...e) => I(t).loadLibrary && I(t).loadLibrary(...e)
			}, "重新连接")])) : (U(!0), W(V, { key: 1 }, z(i.value, (e) => (U(), W("article", {
				key: e.literature_id,
				class: E(["paper-card", { active: I(n).current === e.literature_id }]),
				"data-paper": e.literature_id,
				tabindex: "0",
				"aria-label": I(ao)(e),
				"aria-current": I(n).current === e.literature_id,
				onClick: (n) => I(t).selectPaper(e.literature_id),
				onKeydown: [qa(Ga((n) => I(t).selectPaper(e.literature_id), ["self", "prevent"]), ["enter"]), qa(Ga((n) => I(t).selectPaper(e.literature_id), ["self", "prevent"]), ["space"])]
			}, [
				G("div", zo, [
					G("span", Bo, O(e.literature_id), 1),
					G("span", null, "· " + O(e.year || "年份待核实"), 1),
					G("button", {
						class: E(["icon-button", { selected: e.starred }]),
						"aria-pressed": !!e.starred,
						title: e.starred ? "取消收藏" : "收藏论文",
						"aria-label": e.starred ? "取消收藏" : "收藏论文",
						disabled: I(n).pendingPatches.has(e.literature_id),
						onClick: Ga((n) => I(t).patchPaper(e.literature_id, { starred: !e.starred }), ["stop"])
					}, [K($, { name: "star" })], 10, Vo)
				]),
				G("h3", null, O(I(ao)(e)), 1),
				G("div", {
					class: "paper-authors",
					title: I(oo)(e)
				}, O(I(oo)(e)), 9, Ho),
				G("div", Uo, [G("span", {
					class: "tag",
					title: e.subcategory || e.venue || ""
				}, O((e.subcategory || e.venue || e.category || "未分类").replace(/^\d+_/, "")), 9, Wo), G("span", { class: E(I(fo)(e.readStatus)) }, [a[11] ||= G("i", { class: "read-dot" }, null, -1), q(O(I(uo)[I(fo)(e.readStatus)]), 1)], 2)])
			], 42, Ro))), 128)), !I(n).libraryError && !i.value.length ? (U(), W("div", Go, [a[12] ||= G("p", null, "没有匹配的文献", -1), G("button", {
				id: "reset-filters",
				class: "button subtle",
				onClick: a[6] ||= (...e) => I(t).resetFilters && I(t).resetFilters(...e)
			}, "清除筛选")])) : J("", !0)]),
			K(go, { kind: "papers" })
		]));
	}
};
// app/web/frontend/lib/reader.js
function qo({ state: e, api: t, toast: n, patchPaper: r, setPanel: i, setDraft: a, scope: o }) {
	let s = (e) => o.querySelector(e), c = (e) => [...o.querySelectorAll(e)], l = () => e.papers.find((t) => t.literature_id === e.current), u = new o.ownerDocument.defaultView.AbortController();
	function d() {
		let t = e.pdfSession;
		if (t) {
			t.disposed = !0, t.observer?.disconnect(), t.resizeObserver?.disconnect(), t.root.removeEventListener("scroll", t.onScroll), document.removeEventListener("copy", t.onCopy);
			for (let e of [
				"wheel",
				"touchstart",
				"pointerdown",
				"keydown"
			]) t.root.removeEventListener(e, t.onUserScroll);
			t.frame && cancelAnimationFrame(t.frame);
			for (let e of t.controllers.values()) e.abort();
			for (let e of t.urls.values()) URL.revokeObjectURL(e);
			t.queue = [];
		}
		e.pdfSession = null, e.previewLoading = !1;
	}
	function f() {
		let t = s("#pdf-controls");
		if (!t) return;
		let n = e.pdfSession?.textLayers.get(e.pdfPage)?.data, r = n ? n.error ? "文字层不可用" : n.hasText ? "可选中文字并按 Ctrl+C" : "本页无文字层" : "正在加载文字层…";
		t.innerHTML = `<button class="icon-button" data-pdf-step="-1" aria-label="上一页" title="上一页" ${e.pdfPage <= 1 || e.previewLoading ? "disabled" : ""}>‹</button><label class="pdf-page-label">PDF 物理页 <input id="pdf-page" type="number" min="1" ${e.pdfTotal ? `max="${e.pdfTotal}"` : ""} value="${e.pdfPage}" aria-label="PDF物理页序"></label><span class="pdf-total">/ ${e.pdfTotal || "…"}</span><button class="icon-button" data-pdf-step="1" aria-label="下一页" title="下一页" ${!e.pdfTotal || e.pdfPage >= e.pdfTotal || e.previewLoading ? "disabled" : ""}>›</button><span class="pdf-control-divider"></span><button class="icon-button" data-pdf-zoom="-50" aria-label="缩小" title="缩小" ${e.pdfZoom <= 100 ? "disabled" : ""}>−</button><button class="text-button pdf-zoom" id="pdf-fit" title="适合宽度">${e.pdfZoom === 100 ? "适宽 100%" : e.pdfZoom + "%"}</button><button class="icon-button" data-pdf-zoom="50" aria-label="放大" title="放大" ${e.pdfZoom >= 200 ? "disabled" : ""}>＋</button><button class="button subtle pdf-copy-page" id="copy-pdf-page" ${n?.hasText ? "" : "disabled"}>复制本页文字</button><span class="pdf-text-status" title="${Z(n?.error || (n?.hasText ? "" : "扫描页或无文字内容的页面需要 OCR 才能复制。"))}">${Z(r)}</span>`;
	}
	async function p() {
		let t = e.pdfSession?.textLayers.get(e.pdfPage)?.data.text;
		if (t) try {
			await navigator.clipboard.writeText(t), n("本页文字已复制");
		} catch {
			n("无法访问剪贴板，请在页面选中文字后按 Ctrl+C。", !0);
		}
	}
	function m(t) {
		let r = Number(t);
		if (!Number.isInteger(r) || r < 1 || e.pdfTotal && r > e.pdfTotal) {
			n("请输入有效的 PDF 物理页序。"), f();
			return;
		}
		let i = e.pdfSession;
		i?.pages.has(r) ? (e.pdfPage = r, i.root.scrollTop = Math.max(0, i.pages.get(r).offsetTop - 24), i.manualPage = {
			page: r,
			scrollTop: i.root.scrollTop
		}, f(), w(i), S(i, r, !0)) : r !== e.pdfPage && (e.pdfPage = r, te());
	}
	function h(t) {
		let n = e.pdfSession, r = n?.pages.get(e.pdfPage), i = r ? (n.root.scrollTop - r.offsetTop) / r.offsetHeight : 0;
		e.pdfZoom = Math.max(100, Math.min(200, e.pdfZoom + t));
		for (let t of c(".pdf-page-sheet")) t.style.width = `${e.pdfZoom}%`, t.style.setProperty("--pdf-zoom", e.pdfZoom / 100);
		n && v(n), r && (n.root.scrollTop = r.offsetTop + i * r.offsetHeight, n.manualPage && (n.manualPage.scrollTop = n.root.scrollTop), w(n)), f();
	}
	function g(t) {
		return !t.disposed && e.pdfSession === t && e.noteEpoch === t.epoch;
	}
	async function _(e, n) {
		let r = new AbortController();
		e.controllers.set(n, r);
		let i = setTimeout(() => r.abort(), 45e3), a = "";
		try {
			let i = t(`/api/papers/${Q(e.paper.literature_id)}/text-layer?page=${n}`, { signal: r.signal }).catch((e) => ({
				hasText: !1,
				text: "",
				error: e.message
			})), o = await fetch(`/api/papers/${Q(e.paper.literature_id)}/preview?page=${n}`, { signal: r.signal });
			if (!o.ok) {
				let e = `预览加载失败 (${o.status})`;
				if ((o.headers.get("content-type") || "").includes("json")) {
					let t = await o.json();
					e = t.error?.message || t.error || t.message || e;
				}
				throw Error(e);
			}
			if (!(o.headers.get("content-type") || "").startsWith("image/png")) throw Error("预览接口未返回 PNG 页面图片。");
			let s = Number(o.headers.get("X-PDF-Pages")), c = await o.blob();
			if (!g(e) || r.signal.aborted) throw new DOMException("已停止加载", "AbortError");
			a = URL.createObjectURL(c);
			let l = new Image();
			if (l.className = "pdf-page-image", l.alt = "", l.setAttribute("aria-hidden", "true"), l.draggable = !1, l.src = a, await l.decode(), !g(e) || r.signal.aborted) throw new DOMException("已停止加载", "AbortError");
			if (!Number.isSafeInteger(s) || s < n) throw Error("PDF总页数无效。");
			return {
				img: l,
				url: a,
				total: s,
				textLayer: await i
			};
		} catch (e) {
			throw r.abort(), a && URL.revokeObjectURL(a), e;
		} finally {
			clearTimeout(i), e.controllers.delete(n);
		}
	}
	function v(e) {
		for (let [t, { data: n, element: r }] of e.textLayers) {
			let i = e.pages.get(t);
			r && i && (r.style.transform = `scale(${i.clientWidth / n.width},${i.clientHeight / n.height})`);
		}
	}
	function y(e, t, n) {
		let r = e.pages.get(t);
		if (e.textLayers.set(t, {
			data: n,
			element: null
		}), !n?.hasText || n.error) return;
		let i = document.createElement("div");
		i.className = "pdf-text-layer", i.setAttribute("aria-label", `第 ${t} 页可选文字`), i.style.width = `${n.width}px`, i.style.height = `${n.height}px`;
		let a = document.createElement("canvas").getContext("2d");
		for (let e of n.lines) {
			let t = document.createElement("div");
			t.className = "pdf-text-line";
			let n = Math.min(...e.words.map((e) => e.y));
			t.style.top = `${n}px`;
			for (let [r, i] of e.words.entries()) {
				let o = document.createElement("span");
				o.textContent = i.text + (r === e.words.length - 1 ? "\n" : " "), o.dir = "auto";
				let s = i.rotation || 0, c = s === 90 || s === 270, l = c ? i.width : i.height, u = [
					"serif",
					"sans-serif",
					"monospace"
				].includes(i.fontFamily) ? i.fontFamily : "serif";
				o.style.fontFamily = u, o.style.fontWeight = i.bold ? "700" : "400", o.style.fontStyle = i.italic ? "italic" : "normal";
				let d = i.x + ([90, 180].includes(s) ? i.width : 0), f = i.y - n + ([180, 270].includes(s) ? i.height : 0);
				o.style.left = `${d}px`, o.style.top = `${f}px`, o.style.fontSize = `${l}px`, o.style.height = `${l}px`;
				let p = 1;
				if (a) {
					a.font = `${i.italic ? "italic " : ""}${i.bold ? "bold " : ""}${l}px ${u}`;
					let e = a.measureText(i.text).width;
					e > 0 && (p = (c ? i.height : i.width) / e);
				}
				o.style.transform = `rotate(${s}deg) scaleX(${p})`, t.append(o);
			}
			i.append(t);
		}
		r.append(i), e.textLayers.set(t, {
			data: n,
			element: i
		}), v(e);
	}
	function b(e) {
		let t = document.getSelection();
		if (!t || t.isCollapsed) return !1;
		for (let n = 0; n < t.rangeCount; n++) if (t.getRangeAt(n).intersectsNode(e)) return !0;
		return !1;
	}
	function x(t, n, { img: r, url: i, textLayer: a }) {
		if (!g(t)) {
			URL.revokeObjectURL(i);
			return;
		}
		let o = t.pages.get(n), s = o.offsetHeight, c = o.offsetTop + s < t.root.scrollTop;
		o.style.aspectRatio = `${r.naturalWidth} / ${r.naturalHeight}`, o.replaceChildren(r), o.dataset.loaded = "true", y(t, n, a), t.urls.set(n, i), t.errors.delete(n), c && (t.root.scrollTop += o.offsetHeight - s, t.manualPage && (t.manualPage.scrollTop = t.root.scrollTop)), n === e.pdfPage && f(), w(t);
	}
	function S(e, t, n = !1) {
		!g(e) || !e.pages.has(t) || e.urls.has(t) || e.controllers.has(t) || e.errors.has(t) || (e.queue.includes(t) || (n ? e.queue.unshift(t) : e.queue.push(t)), C(e));
	}
	function C(t) {
		if (g(t)) for (t.queue = t.queue.filter((t) => Math.abs(t - e.pdfPage) <= 3), t.queue.sort((t, n) => Math.abs(t - e.pdfPage) - Math.abs(n - e.pdfPage)); t.running < 2 && t.queue.length;) {
			let e = t.queue.shift();
			t.urls.has(e) || t.controllers.has(e) || (t.running++, _(t, e).then((n) => x(t, e, n)).catch((n) => {
				g(t) && n.name !== "AbortError" && (t.errors.add(e), t.pages.get(e).innerHTML = `<div class="pdf-page-placeholder"><span>第 ${e} 页加载失败</span><small>${Z(n.message)}</small><button class="button subtle" data-pdf-retry="${e}">重试第 ${e} 页</button></div>`);
			}).finally(() => {
				t.running--, g(t) && (C(t), w(t));
			}));
		}
	}
	function w(t) {
		g(t) && !t.frame && (t.frame = requestAnimationFrame(() => {
			if (t.frame = null, !g(t) || !t.pages.size || !t.root.clientHeight || !t.root.clientWidth) return;
			let n = t.root.scrollTop + Math.min(t.root.clientHeight * .3, 200), r = 1, i = t.pages.size;
			for (; r < i;) {
				let e = Math.floor((r + i) / 2), a = t.pages.get(e);
				a.offsetTop + a.offsetHeight < n ? r = e + 1 : i = e;
			}
			t.manualPage && Math.abs(t.root.scrollTop - t.manualPage.scrollTop) < 2 ? r = t.manualPage.page : (t.manualPage = null, t.root.scrollTop > 0 && t.root.scrollTop + t.root.clientHeight >= t.root.scrollHeight - 2 && (r = t.pages.size));
			let a = e.pdfPage !== r;
			e.pdfPage = r, a && f();
			let o = s("#pdf-page");
			o && document.activeElement !== o && (o.value = String(r));
			for (let t of c("[data-pdf-step]")) t.disabled = Number(t.dataset.pdfStep) < 0 ? r <= 1 : r >= e.pdfTotal;
			let l = t.pages.get(r);
			t.anchor = {
				page: r,
				offset: (t.root.scrollTop - l.offsetTop) / l.offsetHeight
			};
			for (let e of [
				r,
				r + 1,
				r - 1
			]) S(t, e, !0);
			for (let [e, n] of t.urls) if (Math.abs(e - r) > 3) {
				if (b(t.pages.get(e))) continue;
				t.pages.get(e).innerHTML = `<div class="pdf-page-placeholder">第 ${e} 页</div>`, delete t.pages.get(e).dataset.loaded, URL.revokeObjectURL(n), t.urls.delete(e), t.textLayers.delete(e);
			}
			for (let [e, n] of t.controllers) Math.abs(e - r) > 3 && n.abort();
		}));
	}
	async function ee(t, n) {
		let r = s("#reader-content"), i = {
			paper: t,
			epoch: n,
			root: r,
			disposed: !1,
			pages: /* @__PURE__ */ new Map(),
			urls: /* @__PURE__ */ new Map(),
			controllers: /* @__PURE__ */ new Map(),
			errors: /* @__PURE__ */ new Set(),
			textLayers: /* @__PURE__ */ new Map(),
			queue: [],
			running: 0,
			frame: null
		};
		e.pdfSession = Gt(i), e.previewLoading = !0;
		let a = e.pdfPage;
		f(), r.innerHTML = `<div class="loading"><span class="busy-spinner"></span>正在加载 PDF 第 ${a} 页…</div>`;
		try {
			let t = await _(i, a);
			if (!g(i)) {
				URL.revokeObjectURL(t.url);
				return;
			}
			e.pdfTotal = t.total;
			let n = document.createElement("div");
			n.className = "pdf-page-viewport", n.setAttribute("aria-label", "PDF连续阅读");
			for (let r = 1; r <= t.total; r++) {
				let a = document.createElement("div");
				a.className = "pdf-page-sheet", a.dataset.pdfPage = String(r), a.style.width = `${e.pdfZoom}%`, a.style.setProperty("--pdf-zoom", e.pdfZoom / 100), a.style.aspectRatio = `${t.img.naturalWidth} / ${t.img.naturalHeight}`, a.setAttribute("role", "group"), a.setAttribute("aria-label", `PDF物理页序 ${r}`), a.innerHTML = `<div class="pdf-page-placeholder">第 ${r} 页</div>`, n.append(a), i.pages.set(r, a);
			}
			r.replaceChildren(n), r.scrollLeft = 0, x(i, a, t), r.scrollTop = Math.max(0, i.pages.get(a).offsetTop - 24), i.manualPage = {
				page: a,
				scrollTop: r.scrollTop
			}, i.onScroll = () => w(i), r.addEventListener("scroll", i.onScroll, { passive: !0 }), i.onCopy = (e) => {
				if (e.defaultPrevented || e.target?.isContentEditable || e.target?.closest?.("input,textarea")) return;
				let t = document.getSelection();
				if (!t?.rangeCount || t.isCollapsed || !e.clipboardData) return;
				let n = t.getRangeAt(0);
				r.contains(n.commonAncestorContainer) && [...i.textLayers.values()].some(({ element: e }) => e && n.intersectsNode(e)) && (e.clipboardData.setData("text/plain", n.cloneContents().textContent), e.preventDefault());
			}, document.addEventListener("copy", i.onCopy), i.onUserScroll = (e) => {
				e.type === "keydown" && ![
					"ArrowUp",
					"ArrowDown",
					"PageUp",
					"PageDown",
					"Home",
					"End",
					" "
				].includes(e.key) || e.type === "pointerdown" && e.target !== r || (i.manualPage = null, w(i));
			};
			for (let e of [
				"wheel",
				"touchstart",
				"pointerdown",
				"keydown"
			]) r.addEventListener(e, i.onUserScroll, { passive: !0 });
			i.observer = new IntersectionObserver((e) => {
				for (let t of e) t.isIntersecting && S(i, Number(t.target.dataset.pdfPage));
			}, {
				root: r,
				rootMargin: "100% 0px",
				threshold: 0
			});
			for (let e of i.pages.values()) i.observer.observe(e);
			let o = r.clientWidth, s = !1;
			i.resizeObserver = new ResizeObserver(() => {
				let e = r.clientWidth;
				if (!e || !r.clientHeight) s = !0;
				else {
					if (v(i), (s || e !== o) && i.anchor) {
						let e = i.pages.get(i.anchor.page);
						r.scrollTop = e.offsetTop + i.anchor.offset * e.offsetHeight, i.manualPage && (i.manualPage.scrollTop = r.scrollTop);
					}
					s = !1, o = e, w(i);
				}
			}), i.resizeObserver.observe(r), w(i);
		} catch (e) {
			if (!g(i)) return;
			r.innerHTML = `<div class="empty"><h2>页面预览暂不可用</h2><p class="error-text">${Z(e.name === "AbortError" ? "预览请求超时，请重试。" : e.message)}</p><button id="retry-preview" class="button subtle">重新加载第 ${a} 页</button><p>也可使用工具栏的“单独打开”查看原 PDF。</p></div>`;
		} finally {
			g(i) && (e.previewLoading = !1, f());
		}
	}
	function te() {
		let n = l();
		if (!n) {
			d(), s("#reader-header").innerHTML = "<span class=\"muted\">阅读</span>", s("#reader-toolbar").hidden = !0, s("#reader-content").innerHTML = `<div class="empty reader-empty"><span class="empty-art">${no("book")}</span><h2>选择论文</h2><p>从左侧选择，查看原文或笔记。</p></div>`;
			return;
		}
		let r = ++e.noteEpoch;
		d(), s("#reader-header").innerHTML = `<div class="reader-heading"><h2>${Z(ao(n))}</h2><div class="reader-meta">${Z(n.literature_id)} · ${Z(n.year || "年份待核实")} · ${Z(n.pages ? n.pages + " 页" : "页数待核实")}<br>${Z(oo(n))}</div></div><select id="paper-read-status" aria-label="标记阅读进度">${Object.entries(uo).map(([e, t]) => `<option value="${e}" ${fo(n.readStatus) === e ? "selected" : ""}>${t}</option>`).join("")}</select>`;
		let i = Array.isArray(n.notes) ? n.notes : [];
		s("#reader-toolbar").hidden = !1, s("#reader-toolbar").innerHTML = `<div class="segmented"><button data-reader-mode="pdf" class="${e.readerMode === "pdf" ? "active" : ""}">原文 PDF</button><button data-reader-mode="note" class="${e.readerMode === "note" ? "active" : ""}">阅读笔记 <small>${i.length}</small></button></div>${e.readerMode === "pdf" && n.file ? `<select id="pdf-renderer" aria-label="PDF显示方式"><option value="preview" ${e.pdfBrowser ? "" : "selected"}>连续阅读</option><option value="browser" ${e.pdfBrowser ? "selected" : ""}>浏览器阅读器</option></select>` : ""}${e.readerMode === "note" && i.length ? `<select id="note-select" aria-label="选择笔记">${i.map((t) => `<option value="${Z(t.path)}" ${t.path === e.notePath ? "selected" : ""}>${Z(t.title || t.path.split(/[\\/]/).pop())}</option>`).join("")}</select>` : ""}${n.file ? `<a class="open-original" href="${Z(io(n.file))}" target="_blank" rel="noopener noreferrer">单独打开${no("external")}</a>` : ""}${e.readerMode === "pdf" && n.file && !e.pdfBrowser ? "<div id=\"pdf-controls\" class=\"pdf-controls\" role=\"group\" aria-label=\"PDF翻页与缩放\"></div>" : ""}`, e.readerMode === "pdf" ? n.file ? e.pdfBrowser ? s("#reader-content").innerHTML = `<iframe class="pdf-frame" title="${Z(ao(n))} PDF原文" src="${Z(io(n.file))}"></iframe>` : ee(n, r) : s("#reader-content").innerHTML = "<div class=\"empty\"><p>该条目尚无可用原文文件。</p></div>" : i.length ? (e.notePath = i.some((t) => t.path === e.notePath) ? e.notePath : i[0].path, s("#reader-content").innerHTML = "<div class=\"loading\"><span class=\"busy-spinner\"></span>正在读取笔记…</div>", t(`/api/text?path=${encodeURIComponent(e.notePath)}`).then((t) => {
			r === e.noteEpoch && (s("#reader-content").innerHTML = `<article class="note-document markdown">${lo(t.text, e.notePath)}</article>`);
		}).catch((t) => {
			r === e.noteEpoch && (s("#reader-content").innerHTML = `<div class="empty"><p class="error-text">${Z(t.message)}</p><button id="retry-note" class="button subtle">重试</button></div>`);
		})) : s("#reader-content").innerHTML = "<div class=\"empty\"><h2>阅读笔记尚待积累</h2><p>可以向研究助手提问，整理阅读笔记。</p><button id=\"ask-note\" class=\"button subtle\">请助手帮我精读</button></div>";
	}
	return o.addEventListener("click", (t) => {
		let n = t.target.closest("button");
		if (n) {
			if (n.dataset.readerMode && (e.readerMode = n.dataset.readerMode), n.dataset.pdfStep && m(e.pdfPage + Number(n.dataset.pdfStep)), n.dataset.pdfZoom && h(Number(n.dataset.pdfZoom)), n.id === "pdf-fit" && h(100 - e.pdfZoom), n.id === "copy-pdf-page" && p(), ["retry-preview", "retry-note"].includes(n.id) && te(), n.dataset.pdfRetry && e.pdfSession) {
				let t = Number(n.dataset.pdfRetry);
				e.pdfSession.errors.delete(t), S(e.pdfSession, t, !0);
			}
			n.id === "ask-note" && (a("请精读当前论文，解释核心方法、证据和局限，给出原文定位，并整理阅读笔记。"), i("chat"));
		}
	}, { signal: u.signal }), o.addEventListener("change", async (t) => {
		if (t.target.id === "paper-read-status") {
			let n = t.target, i = e.current;
			n.disabled = !0, !await r(i, { readStatus: n.value }) && e.current === i && (n.value = fo(l()?.readStatus)), n.disabled = !1;
		}
		t.target.id === "note-select" && (e.notePath = t.target.value), t.target.id === "pdf-renderer" && (e.pdfBrowser = t.target.value === "browser"), t.target.id === "pdf-page" && m(t.target.value);
	}, { signal: u.signal }), o.addEventListener("keydown", (e) => {
		e.target.id === "pdf-page" && e.key === "Enter" && (e.preventDefault(), m(e.target.value));
	}, { signal: u.signal }), window.addEventListener("pagehide", () => {
		++e.noteEpoch, d();
	}, { signal: u.signal }), window.addEventListener("pageshow", (t) => {
		t.persisted && l() && e.readerMode === "pdf" && te();
	}, { signal: u.signal }), {
		render: te,
		dispose: () => {
			++e.noteEpoch, d(), u.abort();
		}
	};
}
// app/web/frontend/components/ReaderPane.vue
var Jo = {
	__name: "ReaderPane",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ qt(null), i;
		return tr(() => {
			i = qo({
				state: n,
				scope: r.value,
				api: t.api,
				toast: t.toast,
				patchPaper: t.patchPaper,
				setPanel: t.setPanel,
				setDraft: t.setDraft
			}), i.render();
		}), Ln([
			() => t.currentPaper.value?.file,
			() => n.current,
			() => n.readerMode,
			() => n.notePath,
			() => n.pdfBrowser
		], () => i?.render(), { flush: "post" }), nr(() => i?.dispose()), (e, t) => (U(), W("section", {
			ref_key: "scope",
			ref: r,
			class: "reader-panel",
			"aria-label": "阅读区"
		}, [...t[0] ||= [
			G("div", {
				id: "reader-header",
				class: "reader-header"
			}, null, -1),
			G("div", {
				id: "reader-toolbar",
				class: "reader-toolbar",
				hidden: ""
			}, null, -1),
			G("div", {
				id: "reader-content",
				class: "reader-content",
				tabindex: "0",
				"aria-label": "论文阅读内容"
			}, null, -1)
		]], 512));
	}
}, Yo = [
	"disabled",
	"aria-label",
	"aria-expanded",
	"title"
], Xo = { id: "model-name" }, Zo = { class: "model-search" }, Qo = [
	"data-model-value",
	"aria-selected",
	"title",
	"onClick"
], $o = {
	key: 0,
	class: "model-empty"
}, es = {
	__name: "ModelPicker",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ qt(!1), i = /* @__PURE__ */ qt(""), a = /* @__PURE__ */ qt(null), o = /* @__PURE__ */ qt(null), s = /* @__PURE__ */ qt(null), c = X(() => [{
			id: "",
			label: "默认模型"
		}, ...t.models.value]), l = X(() => c.value.filter((e) => `${e.label} ${e.id}`.toLocaleLowerCase().includes(i.value.trim().toLocaleLowerCase()))), u = X(() => c.value.find((e) => e.id === n.model) || c.value[0]), d = X(() => t.busy.value || n.creating || t.agent.value.available !== !0 || !t.models.value.length);
		Ln(c, () => {
			c.value.some((e) => e.id === n.model) || (n.model = "");
		}), Ln(d, (e) => {
			e && (r.value = !1);
		});
		function f(e = !1) {
			r.value = !1, e && a.value?.focus();
		}
		async function p() {
			if (r.value) return f();
			i.value = "", r.value = !0, await _n(), o.value?.focus();
		}
		function m(e) {
			n.model = e, f(), n.focusComposer++;
		}
		function h(e) {
			if (e.key === "Escape") {
				e.preventDefault(), f(!0);
				return;
			}
			let t = [...s.value?.querySelectorAll("[role=\"option\"]") || []];
			if (e.key === "Enter" && e.target === o.value) e.preventDefault(), l.value[0] && m(l.value[0].id);
			else {
				if (["ArrowDown", "ArrowUp"].includes(e.key)) {
					e.preventDefault();
					let n = t.indexOf(document.activeElement);
					t[n < 0 ? e.key === "ArrowDown" ? 0 : t.length - 1 : (n + (e.key === "ArrowDown" ? 1 : -1) + t.length) % t.length]?.focus();
				}
				["Home", "End"].includes(e.key) && e.target.getAttribute("role") === "option" && (e.preventDefault(), t[e.key === "Home" ? 0 : t.length - 1]?.focus());
			}
		}
		function g(e) {
			e.target.closest?.("#model-menu,#model-trigger") || f();
		}
		return tr(() => {
			document.addEventListener("pointerdown", g), document.addEventListener("focusin", g);
		}), nr(() => {
			document.removeEventListener("pointerdown", g), document.removeEventListener("focusin", g);
		}), (e, t) => (U(), W(V, null, [G("button", {
			id: "model-trigger",
			ref_key: "trigger",
			ref: a,
			type: "button",
			class: "model-trigger",
			disabled: d.value,
			"aria-label": `选择模型：${u.value.label}`,
			"aria-haspopup": "listbox",
			"aria-expanded": r.value,
			"aria-controls": "model-list",
			title: u.value.label,
			onClick: p
		}, [G("span", Xo, O(u.value.label.replace(/ · 默认$/, "").split(" · ")[0]), 1), K($, { name: "chevron" })], 8, Yo), r.value ? (U(), W("div", {
			key: 0,
			id: "model-menu",
			class: "model-menu",
			onKeydown: h
		}, [G("div", Zo, [K($, { name: "search" }), R(G("input", {
			id: "model-search",
			ref_key: "search",
			ref: o,
			"onUpdate:modelValue": t[0] ||= (e) => i.value = e,
			type: "search",
			placeholder: "搜索模型",
			"aria-label": "搜索模型",
			"aria-controls": "model-list",
			autocomplete: "off"
		}, null, 512), [[Fa, i.value]])]), G("div", {
			id: "model-list",
			ref_key: "list",
			ref: s,
			class: "model-list",
			role: "listbox",
			"aria-label": "模型"
		}, [(U(!0), W(V, null, z(l.value, (e) => (U(), W("button", {
			key: e.id,
			type: "button",
			role: "option",
			tabindex: "-1",
			class: "model-option",
			"data-model-value": e.id,
			"aria-selected": e.id === I(n).model,
			title: e.id || e.label,
			onClick: (t) => m(e.id)
		}, [G("span", null, O(e.label.replace(/ · 默认$/, "")), 1), e.id === I(n).model ? (U(), ci($, {
			key: 0,
			name: "check"
		})) : J("", !0)], 8, Qo))), 128)), l.value.length ? J("", !0) : (U(), W("div", $o, "未找到模型"))], 512)], 32)) : J("", !0)], 64));
	}
}, ts = {
	id: "attachments",
	class: "attachments"
}, ns = ["src", "alt"], rs = ["title"], is = ["onClick"], as = ["aria-label", "onClick"], os = { class: "composer-toolbar" }, ss = { class: "composer-tools" }, cs = {
	class: "icon-button upload-button",
	title: "添加附件"
}, ls = ["disabled"], us = ["disabled"], ds = {
	__name: "Composer",
	setup(e) {
		let t = Pn("workspace"), n = t.state, { canSend: r, generating: i } = t, a = /* @__PURE__ */ qt(null), o = /* @__PURE__ */ qt(null), s = /* @__PURE__ */ qt(!1);
		function c() {
			a.value && (a.value.style.height = "0px", a.value.style.height = `${Math.min(200, Math.max(58, a.value.scrollHeight))}px`, a.value.style.overflowY = a.value.scrollHeight > 200 ? "auto" : "hidden");
		}
		Ln(() => n.draft, c, { flush: "post" }), Ln(() => n.focusComposer, async () => {
			await _n(), a.value?.focus();
		}), tr(c);
		function l(e) {
			e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && (e.preventDefault(), r.value && o.value.requestSubmit());
		}
		function u(e) {
			let n = [...e.clipboardData?.items || []].filter((e) => e.kind === "file").map((e) => e.getAsFile()).filter(Boolean);
			n.length && (e.preventDefault(), t.uploadFiles(n));
		}
		function d(e) {
			let n = [...e.target.files];
			e.target.value = "", t.uploadFiles(n);
		}
		function f(e) {
			n.attachments = n.attachments.filter((t) => t.key !== e);
		}
		async function p() {
			s.value = !0;
			try {
				await t.interrupt();
			} finally {
				s.value = !1;
			}
		}
		return (e, c) => (U(), W("form", {
			id: "chat-form",
			ref_key: "form",
			ref: o,
			class: "composer",
			onSubmit: c[1] ||= Ga((...e) => I(t).sendMessage && I(t).sendMessage(...e), ["prevent"]),
			onDragover: c[2] ||= Ga(() => {}, ["prevent"]),
			onDrop: c[3] ||= Ga((e) => I(t).uploadFiles([...e.dataTransfer?.files || []]), ["prevent"])
		}, [
			G("div", ts, [(U(!0), W(V, null, z(I(n).attachments, (e) => (U(), W("div", {
				key: e.key,
				class: E(["attachment", { error: e.status === "error" }])
			}, [
				e.id && e.mime?.startsWith("image/") ? (U(), W("img", {
					key: 0,
					src: `/api/uploads/${I(Q)(e.id)}`,
					alt: e.name
				}, null, 8, ns)) : (U(), ci($, {
					key: 1,
					name: "attach"
				})),
				G("span", {
					class: "attachment-name",
					title: e.error || e.name
				}, O(e.name) + " " + O(e.status === "uploading" ? " · 上传中" : e.status === "error" ? " · 失败" : ""), 9, rs),
				e.status === "error" ? (U(), W("button", {
					key: 2,
					type: "button",
					onClick: (n) => I(t).uploadOne(e)
				}, "重试", 8, is)) : J("", !0),
				G("button", {
					type: "button",
					"aria-label": `移除附件 ${e.name}`,
					onClick: (t) => f(e.key)
				}, "×", 8, as)
			], 2))), 128))]),
			c[4] ||= G("label", {
				class: "sr-only",
				for: "chat-input"
			}, "向研究助手提问", -1),
			R(G("textarea", {
				id: "chat-input",
				ref_key: "input",
				ref: a,
				"onUpdate:modelValue": c[0] ||= (e) => I(n).draft = e,
				rows: "2",
				placeholder: "输入问题…",
				onKeydown: l,
				onPaste: u
			}, null, 544), [[Fa, I(n).draft]]),
			G("div", os, [G("div", ss, [G("label", cs, [K($, { name: "plus" }), G("input", {
				id: "file-input",
				type: "file",
				multiple: "",
				"aria-label": "添加图片或文件",
				onChange: d
			}, null, 32)]), K(es)]), I(i) ? (U(), W("button", {
				key: 0,
				id: "interrupt",
				type: "button",
				class: "send-button stop-button",
				title: "停止生成",
				"aria-label": "停止生成",
				disabled: s.value,
				onClick: p
			}, [K($, { name: "stop" })], 8, ls)) : (U(), W("button", {
				key: 1,
				id: "send",
				type: "submit",
				class: "send-button",
				title: "发送",
				"aria-label": "发送消息",
				disabled: !I(r)
			}, [K($, { name: "arrow" })], 8, us))])
		], 544));
	}
};
// app/web/frontend/lib/api.js
async function fs(e, t = {}) {
	let n = new AbortController(), r = setTimeout(() => n.abort(), 45e3);
	try {
		let r = await fetch(e, {
			...t,
			signal: t.signal || n.signal
		}), i = (r.headers.get("content-type") || "").includes("json") ? await r.json() : await r.text();
		if (!r.ok) throw Error(typeof i == "object" && (i.error?.message || i.error || i.message) || `请求失败 (${r.status})`);
		return i;
	} catch (e) {
		throw e.name === "AbortError" && !t.signal?.aborted ? Error("请求超时，请检查本地服务后重试") : e;
	} finally {
		clearTimeout(r);
	}
}
// app/web/frontend/lib/workspace.js
var ps = [
	"streaming",
	"pending",
	"running",
	"in_progress",
	"inProgress",
	"queued"
], ms = {
	queued: "排队中",
	pending: "等待中",
	running: "进行中",
	completed: "流程结束",
	complete: "已完成",
	success: "已完成",
	succeeded: "已完成",
	failed: "失败",
	error: "错误",
	cancelled: "已取消",
	interrupted: "已停止",
	archived: "已归档",
	downloaded: "已下载",
	verified: "已核验",
	needs_access: "待获取权限",
	needs_review: "待人工核对",
	unknown: "状态待核实"
}, hs = (e) => [
	"queued",
	"pending",
	"running",
	"in_progress"
].includes(e.status);
function gs({ api: e = fs, EventSourceImpl: t = globalThis.EventSource, pollInterval: n = 8e3 } = {}) {
	let r = /* @__PURE__ */ Rt({
		papers: [],
		categories: [],
		stats: {},
		current: null,
		category: "",
		subcategory: "",
		starred: !1,
		query: "",
		year: "",
		read: "",
		sort: "id",
		libraryError: "",
		downloadsError: "",
		readerMode: "pdf",
		notePath: "",
		chat: null,
		chats: [],
		context: /* @__PURE__ */ new Set(),
		attachments: [],
		approvals: /* @__PURE__ */ new Map(),
		resolvedApprovals: /* @__PURE__ */ new Set(),
		status: {},
		statusError: "",
		eventsOpen: !1,
		model: "",
		draft: "",
		focusComposer: 0,
		historyOpen: !1,
		jobs: /* @__PURE__ */ new Map(),
		batches: [],
		sending: !1,
		creating: !1,
		chatEpoch: 0,
		noteEpoch: 0,
		view: "library",
		panel: "list",
		pdfPage: 1,
		pdfTotal: null,
		pdfZoom: 100,
		pdfBrowser: !1,
		pdfSession: null,
		previewLoading: !1,
		toasts: [],
		pendingPatches: /* @__PURE__ */ new Set(),
		refreshing: !1
	}), i = (e, t) => {
		try {
			t == null ? localStorage.removeItem(e) : localStorage.setItem(e, t);
		} catch {}
	}, a = (e) => {
		try {
			return localStorage.getItem(e);
		} catch {
			return null;
		}
	}, o = X(() => r.papers.find((e) => e.literature_id === r.current)), s = X(() => r.status.agents?.pi || {}), c = X(() => (s.value.models || []).map((e) => {
		if (typeof e == "string") return {
			id: e,
			label: e
		};
		let t = e.model || e.id || e.name;
		return {
			id: t,
			label: e.displayName || e.display_name || e.name || t,
			isDefault: e.isDefault
		};
	}).filter((e) => e.id)), l = X(() => r.chat?.messages?.some((e) => ps.includes(e.status)) || !1), u = X(() => r.sending || l.value), d = X(() => !r.statusError && !u.value && !r.creating && !!(r.draft.trim() || r.attachments.length) && r.attachments.every((e) => e.status === "ready") && s.value.available === !0 && s.value.authenticated === !0 && r.eventsOpen), f, p = !1, m, h = 0, g = 0, _ = !1, v = /* @__PURE__ */ new Set();
	function y(e, t = !1) {
		let n = ++g;
		r.toasts.push({
			id: n,
			message: e,
			error: t
		});
		let i = setTimeout(() => {
			r.toasts = r.toasts.filter((e) => e.id !== n), v.delete(i);
		}, t ? 1e4 : 5e3);
		v.add(i);
	}
	function b(e) {
		r.panel = e;
	}
	function x(e) {
		r.draft = e, r.focusComposer++;
	}
	function S(e) {
		r.view = e, e === "downloads" && fe();
	}
	function C(e) {
		r.current = e, r.readerMode = "pdf", r.notePath = "", r.pdfPage = 1, r.pdfTotal = null, r.pdfZoom = 100, r.pdfBrowser = !1, r.context.size < 6 || r.context.has(e) ? r.context.add(e) : y("最多附带 6 篇论文；请先移除不需要的上下文。", !0), window.matchMedia("(max-width:680px)").matches && b("reader");
	}
	function w() {
		Object.assign(r, {
			query: "",
			year: "",
			read: "",
			starred: !1,
			category: "",
			subcategory: ""
		});
	}
	async function ee() {
		try {
			let t = await e("/api/library");
			r.papers = Array.isArray(t.papers) ? t.papers : [], r.categories = t.categories || [], r.stats = t.stats || {}, r.libraryError = "";
		} catch (e) {
			r.libraryError = e.message;
		}
	}
	async function te(t, n) {
		if (r.pendingPatches.has(t)) return !1;
		r.pendingPatches.add(t);
		try {
			await e(`/api/papers/${Q(t)}`, ro("PATCH", n));
			let i = r.papers.find((e) => e.literature_id === t);
			return i && Object.assign(i, n), !0;
		} catch (e) {
			return y(e.message, !0), !1;
		} finally {
			r.pendingPatches.delete(t);
		}
	}
	async function ne() {
		try {
			r.status = await e("/api/status"), r.statusError = "";
		} catch (e) {
			r.statusError = e.message;
		}
	}
	async function T() {
		r.status.agents = {
			...r.status.agents,
			pi: {
				...r.status.agents?.pi,
				loading: !0
			}
		};
		try {
			await e("/api/agents/pi/connect", ro("POST", {}));
		} catch (e) {
			y(e.message, !0);
		} finally {
			await ne();
		}
	}
	async function re() {
		try {
			r.chats = await e("/api/chats");
		} catch (e) {
			y(e.message, !0);
		}
	}
	function ie() {
		r.sending || (r.chatEpoch++, r.chat = null, i("zhiyue.chat", null), r.focusComposer++);
	}
	async function ae(t) {
		if (r.sending) return;
		let n = ++r.chatEpoch;
		try {
			let a = await e(`/api/chats/${Q(t)}`);
			if (n !== r.chatEpoch || _) return;
			r.chat = a, r.context = new Set(a.paperIds || []), i("zhiyue.chat", a.id), s.value.available !== !0 && T();
		} catch (e) {
			y(e.message, !0);
		}
	}
	async function oe(t) {
		let n = r.chatEpoch, i = await e(`/api/chats/${Q(t)}`);
		if (n !== r.chatEpoch || r.chat?.id !== t || _) return;
		let a = new Map((r.chat.messages || []).map((e) => [e.id, e]));
		i.messages = (i.messages || []).map((e) => {
			let t = a.get(e.id);
			return a.delete(e.id), t && (t.text || "").length > (e.text || "").length ? {
				...t,
				...e,
				text: t.text
			} : e;
		}), i.messages.push(...a.values()), r.chat = i;
	}
	async function se() {
		if (!d.value) return !1;
		let t = r.draft.trim(), n = [...r.attachments], a = [...r.context];
		r.sending = !0;
		try {
			if (!r.chat) {
				r.creating = !0;
				try {
					let n = await e("/api/chats", ro("POST", {
						paperIds: a,
						title: t.slice(0, 50) || ao(o.value || {})
					}));
					r.chat = {
						...n,
						messages: n.messages || []
					}, i("zhiyue.chat", n.id), r.chats.unshift(n);
				} finally {
					r.creating = !1;
				}
			}
			let s = r.chat.id, c = {
				text: t,
				paperIds: a,
				attachmentIds: n.map((e) => e.id)
			};
			r.model && (c.model = r.model), await e(`/api/chats/${Q(s)}/messages`, ro("POST", c)), r.draft.trim() === t && (r.draft = "");
			let l = new Set(n.map((e) => e.key));
			r.attachments = r.attachments.filter((e) => !l.has(e.key));
			try {
				await oe(s);
			} catch {
				y("消息已提交；正在等待会话同步，请勿重复发送。", !0);
			}
			return re(), !0;
		} catch (e) {
			return y(`消息未能确认提交：${e.message}。请检查会话后重试。`, !0), !1;
		} finally {
			r.sending = !1;
		}
	}
	async function ce() {
		if (r.chat) try {
			let t = r.chat.id;
			await e(`/api/chats/${Q(t)}/interrupt`, ro("POST", {})), await oe(t);
		} catch (e) {
			y(e.message, !0);
		}
	}
	async function le(t) {
		t.status = "uploading", t.error = "";
		try {
			let n = await e("/api/uploads", {
				method: "POST",
				headers: {
					"X-Filename": encodeURIComponent(t.file.name),
					"Content-Type": t.file.type || "application/octet-stream"
				},
				body: t.file
			});
			if (!n.id) throw Error("上传接口没有返回附件编号");
			Object.assign(t, n, { status: "ready" });
		} catch (e) {
			t.status = "error", t.error = e.message, y(`上传 ${t.name} 失败：${e.message}`, !0);
		}
	}
	async function ue(e) {
		for (let t of e) {
			if (r.attachments.length >= 8) {
				y("每次最多附加 8 个文件。", !0);
				break;
			}
			if (t.size > 26214400) {
				y(`${t.name} 超过 25 MB 上传限制。`, !0);
				continue;
			}
			let e = /* @__PURE__ */ Rt({
				key: String(++h),
				name: t.name,
				file: Gt(t),
				status: "uploading"
			});
			r.attachments.push(e), await le(e);
		}
	}
	async function de(t, n, i = {}) {
		let a = r.approvals.get(t);
		if (a && !a.submitting) {
			a.submitting = !0;
			try {
				let o = { decision: n };
				n === "accept" && a.params?.questions?.length && (o.answers = i), await e(`/api/approvals/${Q(t)}`, ro("POST", o)), r.resolvedApprovals.add(t), r.approvals.delete(t);
			} catch (e) {
				a.submitting = !1, y(e.message, !0);
			}
		}
	}
	async function fe() {
		try {
			let t = await e("/api/downloads");
			for (let e of t.jobs || []) r.jobs.set(e.id, e);
			r.batches = t.batches || [], r.downloadsError = "";
		} catch (e) {
			r.downloadsError = e.message;
		}
	}
	async function pe(t) {
		try {
			let n = await e("/api/downloads", ro("POST", t));
			return r.jobs.set(n.id, n), y("下载任务已创建"), !0;
		} catch (e) {
			return y(e.message, !0), !1;
		}
	}
	async function me(t, n) {
		try {
			let i = await e("/api/downloads/action", ro("POST", {
				batch: t,
				action: n,
				...n === "ieee" ? { submit: !0 } : {}
			}));
			return r.jobs.set(i.id, i), y("批次操作已提交"), !0;
		} catch (e) {
			return y(e.message, !0), !1;
		}
	}
	async function he() {
		r.refreshing = !0;
		try {
			let t = await e("/api/catalog/refresh", ro("POST", {}));
			r.jobs.set(t.id, t), y("索引刷新任务已提交，可在任务中心查看");
		} catch (e) {
			y(e.message, !0);
		} finally {
			r.refreshing = !1;
		}
	}
	function ge(e) {
		let t = r.chat.messages ||= [], n = t.findIndex((t) => t.id === e.id);
		n < 0 ? t.push(e) : Object.assign(t[n], e);
	}
	function _e(e) {
		if (!_) {
			if (e.type === "connected" && Array.isArray(e.approvals)) {
				r.approvals.clear();
				for (let t of e.approvals) r.resolvedApprovals.has(t.id) || r.approvals.set(t.id, t);
			}
			if (e.type === "approvalResolved" && (r.approvals.delete(e.id), r.resolvedApprovals.add(e.id)), e.type === "message" && e.chatId === r.chat?.id && e.message?.id && ge(e.message), e.type === "delta" && e.chatId === r.chat?.id) {
				let t = r.chat.messages?.find((t) => t.id === e.messageId);
				t ||= (ge({
					id: e.messageId,
					role: "assistant",
					text: "",
					status: "streaming"
				}), r.chat.messages.find((t) => t.id === e.messageId)), t.text = (t.text || "") + String(e.delta || ""), t.status = "streaming";
			}
			if (e.type === "approval" && e.approval?.id && !r.resolvedApprovals.has(e.approval.id) && r.approvals.set(e.approval.id, {
				...r.approvals.get(e.approval.id),
				...e.approval,
				chatId: e.chatId
			}), e.type === "status") {
				let t = e.status || e;
				r.status = {
					...r.status,
					...t,
					agents: {
						...r.status.agents,
						...t.agents
					}
				};
			}
			if (e.type === "job" && e.job?.id) {
				let t = r.jobs.get(e.job.id);
				r.jobs.set(e.job.id, {
					...t,
					...e.job
				}), t && hs(t) && !hs(e.job) && (y(`任务${ms[e.job.status] || e.job.status}：${e.job.title || e.job.id}`, ["error", "failed"].includes(e.job.status)), ee(), r.view === "downloads" && fe());
			}
		}
	}
	async function E() {
		if (!(document.hidden || p || _)) {
			p = !0;
			try {
				let t = [ne()];
				r.chat && (!r.eventsOpen || u.value) && t.push(oe(r.chat.id));
				for (let n of r.jobs.values()) hs(n) && t.push(e(`/api/jobs/${Q(n.id)}`).then((e) => {
					r.jobs.set(e.id, e), hs(e) || (ee(), r.view === "downloads" && fe());
				}));
				await Promise.allSettled(t);
			} finally {
				p = !1;
			}
		}
	}
	async function ve() {
		if (t && (f = new t("/api/events"), f.onopen = () => {
			r.eventsOpen = !0, ne(), r.chat && oe(r.chat.id).catch(() => {});
		}, f.onerror = () => {
			r.eventsOpen = !1;
		}, f.onmessage = (e) => {
			let t;
			try {
				t = JSON.parse(e.data);
			} catch {
				return;
			}
			_e(t);
		}), await Promise.allSettled([
			ee(),
			ne(),
			re(),
			fe()
		]), _) return;
		let e = a("zhiyue.chat");
		e && r.chats.some((t) => t.id === e) && await ae(e), n && (m = setInterval(E, n));
	}
	function ye() {
		_ = !0, f?.close(), clearInterval(m);
		for (let e of v) clearTimeout(e);
	}
	return {
		state: r,
		api: e,
		currentPaper: o,
		agent: s,
		models: c,
		busy: u,
		generating: l,
		canSend: d,
		toast: y,
		setView: S,
		setPanel: b,
		setDraft: x,
		selectPaper: C,
		resetFilters: w,
		loadLibrary: ee,
		patchPaper: te,
		loadStatus: ne,
		reconnectAgent: T,
		loadChats: re,
		openChat: ae,
		syncChat: oe,
		newChat: ie,
		sendMessage: se,
		interrupt: ce,
		uploadFiles: ue,
		uploadOne: le,
		decideApproval: de,
		loadDownloads: fe,
		createDownload: pe,
		batchAction: me,
		refreshCatalog: he,
		receive: _e,
		start: ve,
		stop: ye
	};
}
// app/web/frontend/components/ChatMessage.vue
var _s = ["data-message"], vs = { class: "message-label sr-only" }, ys = {
	key: 0,
	class: "message-body"
}, bs = ["innerHTML"], xs = {
	key: 2,
	class: "message-attachments"
}, Ss = ["href"], Cs = ["src", "alt"], ws = {
	key: 3,
	class: "message-status",
	role: "status",
	"aria-label": "正在生成"
}, Ts = {
	key: 4,
	class: "message-status"
}, Es = {
	__name: "ChatMessage",
	props: { message: {
		type: Object,
		required: !0
	} },
	setup(e) {
		let t = e, n = X(() => [
			"user",
			"assistant",
			"tool",
			"system"
		].includes(t.message.role) ? t.message.role : "assistant"), r = X(() => ({
			user: "你",
			assistant: "Pi Agent",
			tool: "工具",
			system: "系统"
		})[n.value]), i = X(() => ps.includes(t.message.status)), a = X(() => ["error", "failed"].includes(t.message.status)), o = X(() => lo(t.message.text)), s = X(() => t.message.error?.message || t.message.error), c = X(() => ["interrupted", "cancelled"].includes(t.message.status)), l = X(() => (t.message.attachments || t.message.attachmentIds || []).map((e) => typeof e == "string" ? { id: e } : e).filter((e) => e.id));
		return (t, u) => (U(), W("article", {
			class: E(["message", [n.value, {
				streaming: i.value,
				error: a.value
			}]]),
			"data-message": e.message.id
		}, [
			G("div", vs, O(r.value), 1),
			n.value === "user" ? (U(), W("div", ys, O(e.message.text), 1)) : (U(), W("div", {
				key: 1,
				class: "message-body markdown",
				innerHTML: o.value
			}, null, 8, bs)),
			l.value.length ? (U(), W("div", xs, [(U(!0), W(V, null, z(l.value, (e) => (U(), W("a", {
				key: e.id,
				href: `/api/uploads/${I(Q)(e.id)}`,
				target: "_blank",
				rel: "noopener noreferrer"
			}, [(e.mime || e.mimeType || "").startsWith("image/") ? (U(), W("img", {
				key: 0,
				src: `/api/uploads/${I(Q)(e.id)}`,
				alt: e.name || "上传的图片",
				loading: "lazy"
			}, null, 8, Cs)) : (U(), W(V, { key: 1 }, [q(O(e.name || "附件"), 1)], 64))], 8, Ss))), 128))])) : J("", !0),
			i.value && !s.value ? (U(), W("div", ws, [...u[0] ||= [G("span", {
				class: "typing-indicator",
				"aria-hidden": "true"
			}, [
				G("i"),
				G("i"),
				G("i")
			], -1)]])) : s.value || a.value || c.value ? (U(), W("div", Ts, O(s.value || (a.value ? "生成失败" : "已停止")), 1)) : J("", !0)
		], 10, _s));
	}
}, Ds = ["data-approval"], Os = { class: "approval-question" }, ks = [
	"onUpdate:modelValue",
	"data-answer",
	"aria-label"
], As = {
	key: 0,
	class: "question-options"
}, js = ["title", "onClick"], Ms = { key: 1 }, Ns = { class: "approval-actions" }, Ps = ["disabled"], Fs = ["disabled"], Is = {
	__name: "ApprovalCard",
	props: { approval: {
		type: Object,
		required: !0
	} },
	setup(e) {
		let t = e, n = Pn("workspace"), r = /* @__PURE__ */ Rt({}), i = X(() => (t.approval.params?.questions || []).map((e, t) => ({
			...e,
			id: String(e.id ?? e.questionId ?? t),
			text: e.question || e.text || e.label || "请补充信息"
		}))), a = (e) => typeof e == "string" ? e : e.label || e.title || e.value || "";
		function o() {
			let e = Object.fromEntries(i.value.map((e) => [e.id, { answers: [(r[e.id] || "").trim()] }]));
			n.decideApproval(t.approval.id, "accept", e);
		}
		return (t, s) => (U(), W("form", {
			class: "approval",
			"data-approval": e.approval.id,
			onSubmit: Ga(o, ["prevent"])
		}, [
			G("h4", null, O(i.value.length ? "需要你的回答" : "等待你的审批"), 1),
			i.value.length ? (U(!0), W(V, { key: 0 }, z(i.value, (e) => (U(), W("div", { key: e.id }, [G("label", Os, [G("strong", null, O(e.text), 1), R(G("textarea", {
				"onUpdate:modelValue": (t) => r[e.id] = t,
				"data-answer": e.id,
				rows: "2",
				required: "",
				"aria-label": e.text,
				placeholder: "输入你的回答…"
			}, null, 8, ks), [[Fa, r[e.id]]])]), e.options?.length ? (U(), W("div", As, [(U(!0), W(V, null, z(e.options, (t, n) => (U(), W("button", {
				key: n,
				type: "button",
				class: "button subtle",
				title: t.description || "",
				onClick: (n) => r[e.id] = a(t)
			}, O(a(t)), 9, js))), 128))])) : J("", !0)]))), 128)) : (U(), W("pre", Ms, O(JSON.stringify(e.approval.params || {}, null, 2)), 1)),
			G("div", Ns, [G("button", {
				class: "button primary",
				type: "submit",
				disabled: e.approval.submitting
			}, O(i.value.length ? "提交回答" : "允许本次"), 9, Ps), G("button", {
				class: "button subtle",
				type: "button",
				disabled: e.approval.submitting,
				onClick: s[0] ||= (t) => I(n).decideApproval(e.approval.id, "decline")
			}, " 拒绝 ", 8, Fs)])
		], 40, Ds));
	}
}, Ls = {
	id: "assistant-panel",
	class: "chat-panel",
	"aria-label": "文献研究助手"
}, Rs = { class: "chat-header" }, zs = { class: "assistant-title" }, Bs = [
	"aria-label",
	"title",
	"data-state"
], Vs = { class: "chat-actions" }, Hs = ["aria-expanded"], Us = ["disabled"], Ws = {
	key: 0,
	id: "chat-history",
	class: "chat-history"
}, Gs = ["data-chat", "onClick"], Ks = {
	key: 0,
	class: "empty"
}, qs = {
	key: 1,
	id: "auth-banner",
	class: "auth-banner"
}, Js = {
	key: 2,
	class: "chat-context"
}, Ys = { id: "context-papers" }, Xs = [
	"data-context-remove",
	"title",
	"aria-label",
	"onClick"
], Zs = {
	key: 0,
	class: "chat-empty"
}, Qs = { class: "presets" }, $s = ["data-prompt", "onClick"], ec = {
	id: "approvals",
	class: "approvals",
	"aria-live": "polite"
}, tc = {
	__name: "AssistantPane",
	setup(e) {
		let t = Pn("workspace"), n = t.state, { agent: r } = t, i = /* @__PURE__ */ qt(null), a = X(() => r.value.loading === !0 || r.value.available == null || r.value.authenticated == null || r.value.available === "loading"), o = X(() => r.value.available === !0 && r.value.authenticated === !0), s = X(() => n.statusError || r.value.available === !1 ? "error" : a.value || !n.eventsOpen || !o.value ? "loading" : "connected"), c = X(() => n.statusError || r.value.error || (o.value && n.eventsOpen ? "已连接" : a.value ? "正在连接" : "等待配置")), l = X(() => n.statusError || !a.value && !o.value), u = X(() => [...n.approvals.values()].filter((e) => e.chatId === n.chat?.id && !n.resolvedApprovals.has(e.id))), d = [
			[
				"book",
				"概括论文",
				"请结合当前选中的论文，解释它的研究问题、核心贡献与证据，并给出原文定位。"
			],
			[
				"spark",
				"解释方法",
				"请详细解释当前论文的核心方法、输入输出和关键假设，区分作者报告与补充解释。"
			],
			[
				"link",
				"比较论文",
				"请比较选中论文的研究任务、数据、评价条件和局限；不可比的指标请明确指出。"
			],
			[
				"download",
				"查找与下载",
				"请帮我检索并下载相关论文，先核对来源与版本，按项目约定归档并更新索引。"
			]
		], f = (e) => ao(n.papers.find((t) => t.literature_id === e) || { literature_id: e });
		Ln(() => {
			let e = n.chat?.messages || [], t = e.at(-1);
			return [
				n.chat?.id,
				e.length,
				t?.id,
				t?.text?.length,
				t?.status,
				n.historyOpen
			];
		}, async (e, t) => {
			let n = i.value, r = !n || n.scrollHeight - n.scrollTop - n.clientHeight < 100;
			await _n(), i.value && (e[0] !== t?.[0] || r) && (i.value.scrollTop = i.value.scrollHeight);
		});
		function p() {
			n.historyOpen = !n.historyOpen, n.historyOpen && t.loadChats();
		}
		return (e, a) => (U(), W("aside", Ls, [
			K(go, { kind: "assistant" }),
			G("div", Rs, [G("div", zs, [a[3] ||= G("span", { class: "agent-name" }, "Pi Agent", -1), G("span", {
				id: "connection-status",
				class: "connection-indicator",
				role: "status",
				"aria-label": c.value,
				title: c.value,
				"data-state": s.value
			}, null, 8, Bs)]), G("div", Vs, [G("button", {
				id: "chat-history-toggle",
				class: "icon-button",
				title: "会话列表",
				"aria-label": "会话列表",
				"aria-expanded": I(n).historyOpen,
				onClick: p
			}, [K($, { name: "history" })], 8, Hs), G("button", {
				id: "new-chat",
				class: "icon-button",
				title: "新建会话",
				"aria-label": "新建会话",
				disabled: I(n).creating || I(n).sending,
				onClick: a[0] ||= (...e) => I(t).newChat && I(t).newChat(...e)
			}, [K($, { name: "plus" })], 8, Us)])]),
			I(n).historyOpen ? (U(), W("div", Ws, [(U(!0), W(V, null, z(I(n).chats, (e) => (U(), W("button", {
				key: e.id,
				class: E(["history-item", { active: I(n).chat?.id === e.id }]),
				"data-chat": e.id,
				onClick: (n) => I(t).openChat(e.id)
			}, [q(O(e.title || "新会话") + " ", 1), G("small", null, O(new Date(e.createdAt).toLocaleString("zh-CN")) + " " + O((e.paperIds || []).join(" · ")), 1)], 10, Gs))), 128)), I(n).chats.length ? J("", !0) : (U(), W("div", Ks, "暂无会话"))])) : J("", !0),
			l.value ? (U(), W("div", qs, [q(O(I(n).statusError || I(r).error || "请在终端运行 pi 配置模型或登录。") + " ", 1), G("button", {
				id: "retry-status",
				onClick: a[1] ||= (...e) => I(t).reconnectAgent && I(t).reconnectAgent(...e)
			}, "重新检测")])) : J("", !0),
			I(n).context.size ? (U(), W("div", Js, [G("div", Ys, [(U(!0), W(V, null, z(I(n).context, (e) => (U(), W("button", {
				key: e,
				class: "context-chip",
				"data-context-remove": e,
				title: f(e),
				"aria-label": `移除 ${e}`,
				onClick: (t) => I(n).context.delete(e)
			}, [q(O(e), 1), K($, { name: "close" })], 8, Xs))), 128))]), G("button", {
				id: "clear-context",
				class: "icon-button",
				title: "清空论文上下文",
				"aria-label": "清空论文上下文",
				onClick: a[2] ||= (e) => I(n).context.clear()
			}, [K($, { name: "close" })])])) : J("", !0),
			G("div", {
				id: "messages",
				ref_key: "messages",
				ref: i,
				class: "messages",
				role: "log",
				"aria-label": "对话消息",
				"aria-live": "off"
			}, [(U(!0), W(V, null, z(I(n).chat?.messages || [], (e) => (U(), ci(Es, {
				key: e.id,
				message: e
			}, null, 8, ["message"]))), 128)), I(n).chat?.messages?.length ? J("", !0) : (U(), W("div", Zs, [a[4] ||= G("h2", null, "从一个问题开始", -1), G("div", Qs, [(U(), W(V, null, z(d, ([e, n, r]) => G("button", {
				key: n,
				class: "preset",
				"data-prompt": r,
				onClick: (e) => I(t).setDraft(r)
			}, [K($, { name: e }, null, 8, ["name"]), q(O(n), 1)], 8, $s)), 64))])]))], 512),
			G("div", ec, [(U(!0), W(V, null, z(u.value, (e) => (U(), ci(Is, {
				key: e.id,
				approval: e
			}, null, 8, ["approval"]))), 128))]),
			K(ds)
		]));
	}
}, nc = {
	id: "downloads-view",
	class: "downloads-view"
}, rc = { class: "download-columns" }, ic = { class: "surface-heading" }, ac = ["value"], oc = { class: "download-options" }, sc = { class: "check-label" }, cc = ["disabled"], lc = { class: "download-results" }, uc = { class: "section-heading" }, dc = { id: "download-jobs" }, fc = {
	key: 0,
	class: "surface empty"
}, pc = { class: "job-heading" }, mc = {
	key: 0,
	class: "error-text"
}, hc = {
	key: 1,
	class: "job-counts"
}, gc = ["data-job-details"], _c = { class: "job-log" }, vc = {
	key: 2,
	class: "surface empty"
}, yc = { class: "empty-art" }, bc = { id: "download-batches" }, xc = {
	key: 0,
	class: "section-heading"
}, Sc = { class: "job-heading" }, Cc = { class: "status-badge" }, wc = { class: "batch-actions" }, Tc = ["disabled", "onClick"], Ec = "papers/09_情感综述调研/网站导入", Dc = {
	__name: "DownloadPanel",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ Rt({
			title: "",
			input: "",
			category: Ec,
			channel: "public",
			autoArchive: !1
		}), i = /* @__PURE__ */ qt(!1), a = /* @__PURE__ */ Rt(/* @__PURE__ */ new Set()), o = X(() => {
			let e = /* @__PURE__ */ new Map([[Ec, "情感综述调研 / 网站导入（默认）"]]);
			for (let t of n.categories) {
				let n = typeof t == "string" ? t : t.id || t.name;
				if (!n) continue;
				let r = String(n).replace(/\\/g, "/").replace(/^papers\//, "").split("/")[0], i = `papers/${r}/网站导入`;
				e.has(i) || e.set(i, `${String(typeof t == "string" ? t : t.name || r).replace(/^\d+_/, "")} / 网站导入`);
			}
			return [...e];
		}), s = X(() => [...n.jobs.values()].reverse()), c = (e) => Object.entries(e || {}).map(([e, t]) => `${ms[e] || e} ${t}`).join(" · "), l = (e) => typeof e == "string" ? e : JSON.stringify(e), u = (e) => Array.isArray(e) ? e.map((e) => typeof e == "string" ? e : JSON.stringify(e)).join("\n") : e || "暂无日志", d = [
			["download", "继续下载"],
			["verify", "核验文件"],
			["archive", "归档入库"],
			["ieee", "提交IEEE获取"],
			["collect", "收集机构下载"]
		];
		async function f() {
			if (r.input.trim() && !i.value) {
				i.value = !0;
				try {
					await t.createDownload({
						...r,
						title: r.title.trim(),
						input: r.input.trim()
					});
				} finally {
					i.value = !1;
				}
			}
		}
		async function p(e, n) {
			let r = `${e}:${n}`;
			if (!a.has(r)) {
				a.add(r);
				try {
					await t.batchAction(e, n);
				} finally {
					a.delete(r);
				}
			}
		}
		return (e, m) => (U(), W("section", nc, [m[21] ||= G("div", { class: "download-intro" }, [G("h2", null, "添加论文"), G("p", null, "输入 DOI 或题名，查看下载、核验与归档进度。")], -1), G("div", rc, [G("form", {
			id: "download-form",
			class: "surface download-form",
			onSubmit: Ga(f, ["prevent"])
		}, [
			G("div", ic, [K($, { name: "download" }), m[7] ||= G("h3", null, "新建下载任务", -1)]),
			m[12] ||= G("label", { for: "download-title" }, [q("任务名称 "), G("span", { class: "muted" }, "可选")], -1),
			R(G("input", {
				id: "download-title",
				"onUpdate:modelValue": m[0] ||= (e) => r.title = e,
				placeholder: "例如：语音情感识别 · 经典文献"
			}, null, 512), [[Fa, r.title]]),
			m[13] ||= G("label", { for: "download-input" }, "论文信息", -1),
			R(G("textarea", {
				id: "download-input",
				"onUpdate:modelValue": m[1] ||= (e) => r.input = e,
				rows: "7",
				required: "",
				placeholder: "粘贴 DOI、论文题名或 JSON 清单\n每行一项"
			}, null, 512), [[Fa, r.input]]),
			m[14] ||= G("label", { for: "download-category" }, "归档分类", -1),
			R(G("select", {
				id: "download-category",
				"onUpdate:modelValue": m[2] ||= (e) => r.category = e
			}, [(U(!0), W(V, null, z(o.value, ([e, t]) => (U(), W("option", {
				key: e,
				value: e
			}, O(t), 9, ac))), 128))], 512), [[Ra, r.category]]),
			G("div", oc, [G("label", null, [m[9] ||= q("获取渠道", -1), R(G("select", {
				id: "download-channel",
				"onUpdate:modelValue": m[3] ||= (e) => r.channel = e
			}, [...m[8] ||= [
				G("option", { value: "public" }, "公开来源", -1),
				G("option", { value: "auto" }, "自动选择", -1),
				G("option", { value: "ieee" }, "IEEE / 机构渠道", -1)
			]], 512), [[Ra, r.channel]])]), G("label", sc, [R(G("input", {
				id: "auto-archive",
				"onUpdate:modelValue": m[4] ||= (e) => r.autoArchive = e,
				type: "checkbox"
			}, null, 512), [[Ia, r.autoArchive]]), m[10] ||= q("核验后自动归档", -1)])]),
			G("button", {
				id: "start-download",
				type: "submit",
				class: "button primary",
				disabled: i.value
			}, [K($, { name: "plus" }), m[11] ||= q("创建下载任务 ", -1)], 8, cc),
			m[15] ||= G("p", { class: "muted form-note" }, "机构认证与需要确认的操作，由后端工具返回状态。", -1)
		], 32), G("div", lc, [
			G("div", uc, [m[17] ||= G("h3", null, "任务与批次", -1), G("button", {
				id: "refresh-downloads",
				class: "button subtle",
				onClick: m[5] ||= (...e) => I(t).loadDownloads && I(t).loadDownloads(...e)
			}, [K($, { name: "refresh" }), m[16] ||= q("刷新 ", -1)])]),
			G("div", dc, [I(n).downloadsError ? (U(), W("div", fc, [G("p", null, O(I(n).downloadsError), 1), G("button", {
				class: "button subtle",
				onClick: m[6] ||= (...e) => I(t).loadDownloads && I(t).loadDownloads(...e)
			}, "重试")])) : (U(!0), W(V, { key: 1 }, z(s.value, (e) => (U(), W("article", {
				key: e.id,
				class: "job-card"
			}, [
				G("div", pc, [G("h4", null, O(e.title || e.batch || e.id), 1), G("span", { class: E(["status-badge", { failed: ["error", "failed"].includes(e.status) }]) }, O(I(ms)[e.status] || e.status || "状态待确认"), 3)]),
				e.error ? (U(), W("p", mc, O(l(e.error)), 1)) : J("", !0),
				G("p", null, O(e.message || e.action || ""), 1),
				e.result?.counts ? (U(), W("p", hc, " 批次结果：" + O(c(e.result.counts) || "暂无计数"), 1)) : J("", !0),
				G("details", { "data-job-details": e.id }, [m[18] ||= G("summary", null, "查看任务日志", -1), G("pre", _c, O(u(e.log)), 1)], 8, gc)
			]))), 128)), !I(n).downloadsError && !s.value.length ? (U(), W("div", vc, [G("span", yc, [K($, { name: "download" })]), m[19] ||= G("p", null, "暂无下载任务", -1)])) : J("", !0)]),
			G("div", bc, [I(n).batches.length ? (U(), W("div", xc, [...m[20] ||= [G("h3", null, "已有下载批次", -1)]])) : J("", !0), (U(!0), W(V, null, z(I(n).batches, (e) => (U(), W("article", {
				key: e.batch,
				class: "batch-card"
			}, [
				G("div", Sc, [G("h4", null, O(e.batch), 1), G("span", Cc, O(Array.isArray(e.entries) ? e.entries.length : e.entries ?? "—") + " 条", 1)]),
				G("p", null, O(c(e.counts)), 1),
				G("div", wc, [(U(), W(V, null, z(d, ([t, n]) => G("button", {
					key: t,
					class: "button subtle",
					disabled: a.has(`${e.batch}:${t}`),
					onClick: (n) => p(e.batch, t)
				}, O(n), 9, Tc)), 64))])
			]))), 128))])
		])])]));
	}
}, Oc = {
	class: "shell",
	"data-framework": "vue"
}, kc = { class: "main" }, Ac = { class: "topbar" }, jc = { id: "page-title" }, Mc = { class: "top-actions" }, Nc = {
	id: "library-summary",
	class: "muted"
}, Pc = ["disabled"], Fc = {
	class: "mobile-tabs",
	"aria-label": "工作面板"
}, Ic = ["data-panel", "onClick"], Lc = ["data-panel"], Rc = {
	id: "toast-region",
	class: "toast-region",
	role: "status",
	"aria-live": "polite"
}, zc = {
	__name: "Workspace",
	props: { workspace: {
		type: Object,
		required: !0
	} },
	setup(e) {
		let t = e;
		Nn("workspace", t.workspace);
		let n = t.workspace, r = n.state, i = X(() => r.papers.filter((e) => e.notes?.length).length), a, o;
		return tr(() => {
			a = eo(document), o = new window.AbortController(), document.addEventListener("keydown", (e) => {
				e.key !== "/" || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable || (e.preventDefault(), n.setView("library"), n.setPanel("list"), document.querySelector("#search")?.focus());
			}, { signal: o.signal });
		}), nr(() => {
			a?.(), o?.abort(), n.stop();
		}), (e, t) => (U(), W(V, null, [G("div", Oc, [K(Eo), G("main", kc, [
			G("header", Ac, [G("h1", jc, O(I(r).view === "library" ? "文献" : "下载任务"), 1), G("div", Mc, [G("span", Nc, O(I(r).papers.length) + " 篇文献 · " + O(i.value) + " 篇有笔记", 1), G("button", {
				id: "refresh-catalog",
				class: "button subtle",
				title: "重新扫描目录并更新索引",
				disabled: I(r).refreshing,
				onClick: t[0] ||= (...e) => I(n).refreshCatalog && I(n).refreshCatalog(...e)
			}, [K($, { name: "refresh" }), t[1] ||= G("span", null, "刷新索引", -1)], 8, Pc)])]),
			R(G("div", Fc, [(U(), W(V, null, z([
				["list", "文献"],
				["reader", "阅读"],
				["chat", "研究助手"]
			], ([e, t]) => G("button", {
				key: e,
				class: E({ active: I(r).panel === e }),
				"data-panel": e,
				onClick: (t) => I(n).setPanel(e)
			}, O(t), 11, Ic)), 64))], 512), [[ea, I(r).view === "library"]]),
			R(G("section", {
				id: "library-view",
				class: "library-layout",
				"data-panel": I(r).panel
			}, [
				K(Ko),
				K(Jo),
				K(tc)
			], 8, Lc), [[ea, I(r).view === "library"]]),
			R(K(Dc, null, null, 512), [[ea, I(r).view === "downloads"]])
		])]), G("div", Rc, [(U(!0), W(V, null, z(I(r).toasts, (e) => (U(), W("div", {
			key: e.id,
			class: E(["toast", { error: e.error }])
		}, O(e.message), 3))), 128))])], 64));
	}
};
// app/web/frontend/main.js
function Bc(e, t = {}) {
	let n = gs(t), r = Za(zc, { workspace: n });
	return r.mount(e), {
		app: r,
		workspace: n,
		ready: n.start(),
		version: Vi,
		unmount: () => r.unmount()
	};
}
typeof document < "u" && document.querySelector("#app") && Bc("#app");
export { gs as createWorkspace, Bc as mountWorkspace };
