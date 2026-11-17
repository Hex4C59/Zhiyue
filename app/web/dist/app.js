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
}, l = Object.prototype.hasOwnProperty, u = (e, t) => l.call(e, t), d = Array.isArray, f = (e) => x(e) === "[object Map]", p = (e) => x(e) === "[object Set]", m = (e) => x(e) === "[object Date]", h = (e) => typeof e == "function", g = (e) => typeof e == "string", _ = (e) => typeof e == "symbol", v = (e) => typeof e == "object" && !!e, y = (e) => (v(e) || h(e)) && h(e.then) && h(e.catch), b = Object.prototype.toString, x = (e) => b.call(e), S = (e) => x(e).slice(8, -1), C = (e) => x(e) === "[object Object]", w = (e) => g(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, T = /* @__PURE__ */ e(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), ee = (e) => {
	let t = /* @__PURE__ */ Object.create(null);
	return ((n) => t[n] || (t[n] = e(n)));
}, te = /-\w/g, E = /* @__PURE__ */ ee((e) => e.replace(te, (e) => e.slice(1).toUpperCase())), ne = /\B([A-Z])/g, D = /* @__PURE__ */ ee((e) => e.replace(ne, "-$1").toLowerCase()), re = /* @__PURE__ */ ee((e) => e.charAt(0).toUpperCase() + e.slice(1)), ie = /* @__PURE__ */ ee((e) => e ? `on${re(e)}` : ""), O = (e, t) => !Object.is(e, t), ae = (e, ...t) => {
	for (let n = 0; n < e.length; n++) e[n](...t);
}, oe = (e, t, n, r = !1) => {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		writable: r,
		value: n
	});
}, se = (e) => {
	let t = parseFloat(e);
	return isNaN(t) ? e : t;
}, ce, le = () => ce ||= typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
function ue(e) {
	if (d(e)) {
		let t = {};
		for (let n = 0; n < e.length; n++) {
			let r = e[n], i = g(r) ? me(r) : ue(r);
			if (i) for (let e in i) t[e] = i[e];
		}
		return t;
	}
	if (g(e) || v(e)) return e;
}
var de = /;(?![^(]*\))/g, fe = /:([^]+)/, pe = /"(?:[^"\\]|\\[^])*"|'(?:[^'\\]|\\[^])*'|\\[^]|\/\*[^]*?\*\//g;
function me(e) {
	let t = {};
	return e.replace(pe, (e) => e.startsWith("/*") ? "" : e).split(de).forEach((e) => {
		if (e) {
			let n = e.split(fe);
			n.length > 1 && (t[n[0].trim()] = n[1].trim());
		}
	}), t;
}
function k(e) {
	let t = "";
	if (g(e)) t = e;
	else if (d(e)) for (let n = 0; n < e.length; n++) {
		let r = k(e[n]);
		r && (t += r + " ");
	}
	else if (v(e)) for (let n in e) e[n] && (t += n + " ");
	return t.trim();
}
var he = /* @__PURE__ */ e("itemscope,allowfullscreen,disablepictureinpicture,disableremoteplayback,formnovalidate,ismap,nomodule,novalidate,playsinline,readonly");
function ge(e) {
	return !!e || e === "";
}
function _e(e, t, n) {
	if (e.length !== t.length) return !1;
	let r = !0;
	for (let i = 0; r && i < e.length; i++) r = A(e[i], t[i], n);
	return r;
}
function ve(e, t, n) {
	if (e.size !== t.size) return !1;
	let r = Array.from(t), i = new Uint8Array(r.length);
	for (let t of e) {
		let e = -1;
		for (let a = 0; a < r.length; a++) if (!i[a] && A(t, r[a], n)) {
			e = a;
			break;
		}
		if (e < 0) return !1;
		i[e] = 1;
	}
	return !0;
}
function ye(e, t, n) {
	let r = f(e), i = f(t);
	if (r || i || (r = p(e), i = p(t), r || i)) return r && i ? ve(e, t, n) : !1;
	if (Object.keys(e).length !== Object.keys(t).length) return !1;
	for (let r in e) {
		let i = e.hasOwnProperty(r), a = t.hasOwnProperty(r);
		if (i && !a || !i && a || !A(e[r], t[r], n)) return !1;
	}
	return String(e) === String(t);
}
function be(e, t, n, r) {
	n ||= [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
	let [i, a] = n;
	if (i.has(e) || a.has(t)) return i.get(e) === t && a.get(t) === e;
	i.set(e, t), a.set(t, e);
	let o = r(e, t, n);
	return i.delete(e), a.delete(t), o;
}
function A(e, t, n) {
	if (e === t) return !0;
	let r = m(e), i = m(t);
	return r || i ? r && i ? e.getTime() === t.getTime() : !1 : (r = _(e), i = _(t), r || i ? e === t : (r = d(e), i = d(t), r || i ? r && i ? be(e, t, n, _e) : !1 : (r = v(e), i = v(t), r || i ? !r || !i ? !1 : be(e, t, n, ye) : String(e) === String(t))));
}
function xe(e, t) {
	return e.findIndex((e) => A(e, t));
}
var Se = (e) => !!(e && e.__v_isRef === !0), j = (e) => g(e) ? e : e == null ? "" : d(e) || v(e) && (e.toString === b || !h(e.toString)) ? Se(e) ? j(e.value) : JSON.stringify(e, Ce, 2) : String(e), Ce = (e, t) => Se(t) ? Ce(e, t.value) : f(t) ? { [`Map(${t.size})`]: [...t.entries()].reduce((e, [t, n], r) => (e[we(t, r) + " =>"] = n, e), {}) } : p(t) ? { [`Set(${t.size})`]: [...t.values()].map((e) => we(e)) } : _(t) ? we(t) : v(t) && !d(t) && !C(t) ? String(t) : t, we = (e, t = "") => _(e) ? `Symbol(${e.description ?? t})` : e, M, Te = class {
	constructor(e = !1) {
		this.detached = e, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this._warnOnRun = !0, this.__v_skip = !0, !e && M && (M.active ? (this.parent = M, this.index = (M.scopes || (M.scopes = [])).push(this) - 1) : (this._active = !1, this._warnOnRun = !1));
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
			let t = M;
			try {
				return M = this, e();
			} finally {
				M = t;
			}
		}
	}
	on() {
		++this._on === 1 && (this.prevScope = M, M = this);
	}
	off() {
		if (this._on > 0 && --this._on === 0) {
			if (M === this) M = this.prevScope;
			else {
				let e = M;
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
function Ee() {
	return M;
}
var N, De = /* @__PURE__ */ new WeakSet(), Oe = class {
	constructor(e) {
		this.fn = e, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, M && (M.active ? M.effects.push(this) : this.flags &= -2);
	}
	pause() {
		this.flags |= 64;
	}
	resume() {
		this.flags & 64 && (this.flags &= -65, De.has(this) && (De.delete(this), this.trigger()));
	}
	notify() {
		this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Me(this);
	}
	run() {
		if (!(this.flags & 1)) return this.fn();
		this.flags |= 2, Ge(this), Fe(this);
		let e = N, t = Ve;
		N = this, Ve = !0;
		try {
			return this.fn();
		} finally {
			Ie(this), N = e, Ve = t, this.flags &= -3;
		}
	}
	stop() {
		if (this.flags & 1) {
			for (let e = this.deps; e; e = e.nextDep) ze(e);
			this.deps = this.depsTail = void 0, Ge(this), this.onStop && this.onStop(), this.flags &= -2;
		}
	}
	trigger() {
		this.flags & 64 ? De.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
	}
	runIfDirty() {
		Le(this) && this.run();
	}
	get dirty() {
		return Le(this);
	}
}, ke = 0, Ae, je;
function Me(e, t = !1) {
	e.flags |= 8, t ? (e.next = je, je = e) : (e.next = Ae, Ae = e);
}
function Ne() {
	ke++;
}
function Pe() {
	if (--ke > 0) return;
	if (je) {
		let e = je;
		for (je = void 0; e;) {
			let t = e.next;
			e.next = void 0, e.flags &= -9, e = t;
		}
	}
	let e;
	for (; Ae;) {
		let t = Ae;
		for (Ae = void 0; t;) {
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
function Fe(e) {
	for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Ie(e) {
	let t, n = e.depsTail, r = n;
	for (; r;) {
		let e = r.prevDep;
		r.version === -1 ? (r === n && (n = e), ze(r), Be(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = e;
	}
	e.deps = t, e.depsTail = n;
}
function Le(e) {
	for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Re(t.dep.computed) || t.dep.version !== t.version)) return !0;
	return !!e._dirty;
}
function Re(e) {
	if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Ke) || (e.globalVersion = Ke, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !Le(e)))) return;
	e.flags |= 2;
	let t = e.dep, n = N, r = Ve;
	N = e, Ve = !0;
	try {
		Fe(e);
		let n = e.fn(e._value);
		(t.version === 0 || O(n, e._value)) && (e.flags |= 128, e._value = n, t.version++);
	} catch (e) {
		throw t.version++, e;
	} finally {
		N = n, Ve = r, Ie(e), e.flags &= -3;
	}
}
function ze(e, t = !1) {
	let { dep: n, prevSub: r, nextSub: i } = e;
	if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
		n.computed.flags &= -5;
		for (let e = n.computed.deps; e; e = e.nextDep) ze(e, !0);
	}
	!t && !--n.sc && n.map && n.map.delete(n.key);
}
function Be(e) {
	let { prevDep: t, nextDep: n } = e;
	t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
var Ve = !0, He = [];
function Ue() {
	He.push(Ve), Ve = !1;
}
function We() {
	let e = He.pop();
	Ve = e === void 0 || e;
}
function Ge(e) {
	let { cleanup: t } = e;
	if (e.cleanup = void 0, t) {
		let e = N;
		N = void 0;
		try {
			t();
		} finally {
			N = e;
		}
	}
}
var Ke = 0, qe = class {
	constructor(e, t) {
		this.sub = e, this.dep = t, this.version = t.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
	}
}, Je = class {
	constructor(e) {
		this.computed = e, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
	}
	track(e) {
		if (!N || !Ve || N === this.computed) return;
		let t = this.activeLink;
		if (t === void 0 || t.sub !== N) t = this.activeLink = new qe(N, this), N.deps ? (t.prevDep = N.depsTail, N.depsTail.nextDep = t, N.depsTail = t) : N.deps = N.depsTail = t, Ye(t);
		else if (t.version === -1 && (t.version = this.version, t.nextDep)) {
			let e = t.nextDep;
			e.prevDep = t.prevDep, t.prevDep && (t.prevDep.nextDep = e), t.prevDep = N.depsTail, t.nextDep = void 0, N.depsTail.nextDep = t, N.depsTail = t, N.deps === t && (N.deps = e);
		}
		return t;
	}
	trigger(e) {
		this.version++, Ke++, this.notify(e);
	}
	notify(e) {
		Ne();
		try {
			for (let e = this.subs; e; e = e.prevSub) e.sub.notify() && e.sub.dep.notify();
		} finally {
			Pe();
		}
	}
};
function Ye(e) {
	if (e.dep.sc++, e.sub.flags & 4) {
		let t = e.dep.computed;
		if (t && !e.dep.subs) {
			t.flags |= 20;
			for (let e = t.deps; e; e = e.nextDep) Ye(e);
		}
		let n = e.dep.subs;
		n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
	}
}
var Xe = /* @__PURE__ */ new WeakMap(), Ze = /* @__PURE__ */ Symbol(""), Qe = /* @__PURE__ */ Symbol(""), $e = /* @__PURE__ */ Symbol("");
function P(e, t, n) {
	if (Ve && N) {
		let t = Xe.get(e);
		t || Xe.set(e, t = /* @__PURE__ */ new Map());
		let r = t.get(n);
		r || (t.set(n, r = new Je()), r.map = t, r.key = n), r.track();
	}
}
function et(e, t, n, r, i, a) {
	let o = Xe.get(e);
	if (!o) {
		Ke++;
		return;
	}
	let s = (e) => {
		e && e.trigger();
	};
	if (Ne(), t === "clear") o.forEach(s);
	else {
		let i = d(e), a = i && w(n);
		if (i && n === "length") {
			let e = Number(r);
			o.forEach((t, n) => {
				(n === "length" || n === $e || !_(n) && n >= e) && s(t);
			});
		} else switch ((n !== void 0 || o.has(void 0)) && s(o.get(n)), a && s(o.get($e)), t) {
			case "add":
				i ? a && s(o.get("length")) : (s(o.get(Ze)), f(e) && s(o.get(Qe)));
				break;
			case "delete":
				i || (s(o.get(Ze)), f(e) && s(o.get(Qe)));
				break;
			case "set": f(e) && s(o.get(Ze));
		}
	}
	Pe();
}
function tt(e) {
	let t = /* @__PURE__ */ F(e);
	return t === e || (P(t, "iterate", $e), /* @__PURE__ */ Vt(e)) ? t : /* @__PURE__ */ Bt(e) ? /* @__PURE__ */ zt(e) ? t.map((e) => Gt(Wt(e))) : t.map(Gt) : t.map(Wt);
}
function nt(e) {
	return P(e = /* @__PURE__ */ F(e), "iterate", $e), e;
}
function rt(e, t) {
	return /* @__PURE__ */ Bt(e) ? Gt(/* @__PURE__ */ zt(e) ? Wt(t) : t) : Wt(t);
}
var it = {
	__proto__: null,
	[Symbol.iterator]() {
		return at(this, Symbol.iterator, (e) => rt(this, e));
	},
	concat(...e) {
		return tt(this).concat(...e.map((e) => d(e) ? tt(e) : e));
	},
	entries() {
		return at(this, "entries", (e) => (e[1] = rt(this, e[1]), e));
	},
	every(e, t) {
		return ct(this, "every", e, t, void 0, arguments);
	},
	filter(e, t) {
		return ct(this, "filter", e, t, (e) => e.map((e) => rt(this, e)), arguments);
	},
	find(e, t) {
		return ct(this, "find", e, t, (e) => rt(this, e), arguments);
	},
	findIndex(e, t) {
		return ct(this, "findIndex", e, t, void 0, arguments);
	},
	findLast(e, t) {
		return ct(this, "findLast", e, t, (e) => rt(this, e), arguments);
	},
	findLastIndex(e, t) {
		return ct(this, "findLastIndex", e, t, void 0, arguments);
	},
	forEach(e, t) {
		return ct(this, "forEach", e, t, void 0, arguments);
	},
	includes(...e) {
		return ut(this, "includes", e);
	},
	indexOf(...e) {
		return ut(this, "indexOf", e);
	},
	join(e) {
		return tt(this).join(e);
	},
	lastIndexOf(...e) {
		return ut(this, "lastIndexOf", e);
	},
	map(e, t) {
		return ct(this, "map", e, t, void 0, arguments);
	},
	pop() {
		return dt(this, "pop");
	},
	push(...e) {
		return dt(this, "push", e);
	},
	reduce(e, ...t) {
		return lt(this, "reduce", e, t);
	},
	reduceRight(e, ...t) {
		return lt(this, "reduceRight", e, t);
	},
	shift() {
		return dt(this, "shift");
	},
	some(e, t) {
		return ct(this, "some", e, t, void 0, arguments);
	},
	splice(...e) {
		return dt(this, "splice", e);
	},
	toReversed() {
		return tt(this).toReversed();
	},
	toSorted(e) {
		return tt(this).toSorted(e);
	},
	toSpliced(...e) {
		return tt(this).toSpliced(...e);
	},
	unshift(...e) {
		return dt(this, "unshift", e);
	},
	values() {
		return at(this, "values", (e) => rt(this, e));
	}
};
function at(e, t, n) {
	let r = nt(e), i = r[t], a = i.call(r);
	if (r !== e && !/* @__PURE__ */ Vt(e)) {
		if (a[Symbol.toStringTag] === "Array Iterator") {
			let e = Object.create(Object.getPrototypeOf(a));
			return e.next = () => ot(a.next(), n), i !== st[t] && Object.defineProperties(e, {
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
		a._next = a.next, a.next = () => ot(a._next(), n);
	}
	return a;
}
function ot(e, t) {
	return e.done || (e.value = t(e.value)), e;
}
var st = Array.prototype;
function ct(e, t, n, r, i, a) {
	let o = nt(e), s = o !== e && !/* @__PURE__ */ Vt(e), c = o[t];
	if (c !== st[t]) {
		let t = c.apply(e, a);
		return s ? Wt(t) : t;
	}
	let l = n;
	o !== e && (s ? l = function(t, r) {
		return n.call(this, rt(e, t), r, e);
	} : n.length > 2 && (l = function(t, r) {
		return n.call(this, t, r, e);
	}));
	let u = c.call(o, l, r);
	return s && i ? i(u) : u;
}
function lt(e, t, n, r) {
	let i = nt(e), a = i !== e && !/* @__PURE__ */ Vt(e), o = n, s = !1;
	i !== e && (a ? (s = r.length === 0, o = function(t, r, i) {
		return s && (s = !1, t = rt(e, t)), n.call(this, t, rt(e, r), i, e);
	}) : n.length > 3 && (o = function(t, r, i) {
		return n.call(this, t, r, i, e);
	}));
	let c = i[t](o, ...r);
	return s ? rt(e, c) : c;
}
function ut(e, t, n) {
	let r = /* @__PURE__ */ F(e);
	P(r, "iterate", $e);
	let i = r[t](...n);
	return (i === -1 || i === !1) && /* @__PURE__ */ Ht(n[0]) ? (n[0] = /* @__PURE__ */ F(n[0]), r[t](...n)) : i;
}
function dt(e, t, n = []) {
	Ue(), Ne();
	let r = (/* @__PURE__ */ F(e))[t].apply(e, n);
	return Pe(), We(), r;
}
var ft = /* @__PURE__ */ e("__proto__,__v_isRef,__isVue"), pt = /* @__PURE__ */ new Set(/* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(_));
function mt(e) {
	_(e) || (e = String(e));
	let t = /* @__PURE__ */ F(this);
	return P(t, "has", e), t.hasOwnProperty(e);
}
var ht = class {
	constructor(e = !1, t = !1) {
		this._isReadonly = e, this._isShallow = t;
	}
	get(e, t, n) {
		if (t === "__v_skip") return e.__v_skip;
		let r = this._isReadonly, i = this._isShallow;
		if (t === "__v_isReactive") return !r;
		if (t === "__v_isReadonly") return r;
		if (t === "__v_isShallow") return i;
		if (t === "__v_raw") return n === (r ? i ? Nt : Mt : i ? jt : At).get(e) || Object.getPrototypeOf(e) === Object.getPrototypeOf(n) ? e : void 0;
		let a = d(e);
		if (!r) {
			let e;
			if (a && (e = it[t])) return e;
			if (t === "hasOwnProperty") return mt;
		}
		let o = Reflect.get(e, t, /* @__PURE__ */ I(e) ? e : n);
		if ((_(t) ? pt.has(t) : ft(t)) || (r || P(e, "get", t), i)) return o;
		if (/* @__PURE__ */ I(o)) {
			let e = a && w(t) ? o : o.value;
			return r && v(e) ? /* @__PURE__ */ Lt(e) : e;
		}
		return v(o) ? r ? /* @__PURE__ */ Lt(o) : /* @__PURE__ */ Ft(o) : o;
	}
}, gt = class extends ht {
	constructor(e = !1) {
		super(!1, e);
	}
	set(e, t, n, r) {
		let i = e[t], a = d(e) && w(t);
		if (!this._isShallow) {
			let e = /* @__PURE__ */ Bt(i);
			if (!/* @__PURE__ */ Vt(n) && !/* @__PURE__ */ Bt(n) && (i = /* @__PURE__ */ F(i), n = /* @__PURE__ */ F(n)), !a && /* @__PURE__ */ I(i) && !/* @__PURE__ */ I(n)) return e || (i.value = n), !0;
		}
		let o = a ? Number(t) < e.length : u(e, t), s = Reflect.set(e, t, n, /* @__PURE__ */ I(e) ? e : r);
		return e === /* @__PURE__ */ F(r) && s && (o ? O(n, i) && et(e, "set", t, n, i) : et(e, "add", t, n)), s;
	}
	deleteProperty(e, t) {
		let n = u(e, t), r = e[t], i = Reflect.deleteProperty(e, t);
		return i && n && et(e, "delete", t, void 0, r), i;
	}
	has(e, t) {
		let n = Reflect.has(e, t);
		return _(t) && pt.has(t) || P(e, "has", t), n;
	}
	ownKeys(e) {
		return P(e, "iterate", d(e) ? "length" : Ze), Reflect.ownKeys(e);
	}
}, _t = class extends ht {
	constructor(e = !1) {
		super(!0, e);
	}
	set(e, t) {
		return !0;
	}
	deleteProperty(e, t) {
		return !0;
	}
}, vt = /* @__PURE__ */ new gt(), yt = /* @__PURE__ */ new _t(), bt = /* @__PURE__ */ new gt(!0), xt = (e) => e, St = (e) => Reflect.getPrototypeOf(e);
function Ct(e, t, n) {
	return function(...r) {
		let i = this.__v_raw, a = /* @__PURE__ */ F(i), o = f(a), c = e === "entries" || e === Symbol.iterator && o, l = e === "keys" && o, u = i[e](...r), d = n ? xt : t ? Gt : Wt;
		return !t && P(a, "iterate", l ? Qe : Ze), s(Object.create(u), { next() {
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
function wt(e) {
	return function(...t) {
		return e === "delete" ? !1 : e === "clear" ? void 0 : this;
	};
}
function Tt(e, t) {
	let n = {
		get(n) {
			let r = this.__v_raw, i = /* @__PURE__ */ F(r), a = /* @__PURE__ */ F(n);
			e || (O(n, a) && P(i, "get", n), P(i, "get", a));
			let { has: o } = St(i), s = t ? xt : e ? Gt : Wt;
			if (o.call(i, n)) return s(r.get(n));
			if (o.call(i, a)) return s(r.get(a));
			r !== i && r.get(n);
		},
		get size() {
			let t = this.__v_raw;
			return !e && P(/* @__PURE__ */ F(t), "iterate", Ze), t.size;
		},
		has(t) {
			let n = this.__v_raw, r = /* @__PURE__ */ F(n), i = /* @__PURE__ */ F(t);
			return e || (O(t, i) && P(r, "has", t), P(r, "has", i)), t === i ? n.has(t) : n.has(t) || n.has(i);
		},
		forEach(n, r) {
			let i = this, a = i.__v_raw, o = /* @__PURE__ */ F(a), s = t ? xt : e ? Gt : Wt;
			return !e && P(o, "iterate", Ze), a.forEach((e, t) => n.call(r, s(e), s(t), i));
		}
	};
	return s(n, e ? {
		add: wt("add"),
		set: wt("set"),
		delete: wt("delete"),
		clear: wt("clear")
	} : {
		add(e) {
			let n = /* @__PURE__ */ F(this), r = St(n), i = /* @__PURE__ */ F(e), a = !t && !/* @__PURE__ */ Vt(e) && !/* @__PURE__ */ Bt(e) ? i : e;
			return r.has.call(n, a) || O(e, a) && r.has.call(n, e) || O(i, a) && r.has.call(n, i) || (n.add(a), et(n, "add", a, a)), this;
		},
		set(e, n) {
			t || /* @__PURE__ */ Vt(n) || /* @__PURE__ */ Bt(n) || (n = /* @__PURE__ */ F(n));
			let r = /* @__PURE__ */ F(this), { has: i, get: a } = St(r), o = i.call(r, e);
			o ||= (e = /* @__PURE__ */ F(e), i.call(r, e));
			let s = a.call(r, e);
			return r.set(e, n), o ? O(n, s) && et(r, "set", e, n, s) : et(r, "add", e, n), this;
		},
		delete(e) {
			let t = /* @__PURE__ */ F(this), { has: n, get: r } = St(t), i = n.call(t, e);
			i ||= (e = /* @__PURE__ */ F(e), n.call(t, e));
			let a = r ? r.call(t, e) : void 0, o = t.delete(e);
			return i && et(t, "delete", e, void 0, a), o;
		},
		clear() {
			let e = /* @__PURE__ */ F(this), t = e.size !== 0, n = e.clear();
			return t && et(e, "clear", void 0, void 0, void 0), n;
		}
	}), [
		"keys",
		"values",
		"entries",
		Symbol.iterator
	].forEach((r) => {
		n[r] = Ct(r, e, t);
	}), n;
}
function Et(e, t) {
	let n = Tt(e, t);
	return (r, i, a) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_isShallow" ? t : i === "__v_raw" ? r : Reflect.get(u(n, i) && i in r ? n : r, i, a);
}
var Dt = { get: /* @__PURE__ */ Et(!1, !1) }, Ot = { get: /* @__PURE__ */ Et(!1, !0) }, kt = { get: /* @__PURE__ */ Et(!0, !1) }, At = /* @__PURE__ */ new WeakMap(), jt = /* @__PURE__ */ new WeakMap(), Mt = /* @__PURE__ */ new WeakMap(), Nt = /* @__PURE__ */ new WeakMap();
function Pt(e) {
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
function Ft(e) {
	return /* @__PURE__ */ Bt(e) ? e : Rt(e, !1, vt, Dt, At);
}
// @__NO_SIDE_EFFECTS__
function It(e) {
	return Rt(e, !1, bt, Ot, jt);
}
// @__NO_SIDE_EFFECTS__
function Lt(e) {
	return Rt(e, !0, yt, kt, Mt);
}
function Rt(e, t, n, r, i) {
	if (!v(e) || e.__v_raw && !(t && e.__v_isReactive) || e.__v_skip || !Object.isExtensible(e)) return e;
	let a = i.get(e);
	if (a) return a;
	let o = Pt(S(e));
	if (o === 0) return e;
	let s = new Proxy(e, o === 2 ? r : n);
	return i.set(e, s), s;
}
// @__NO_SIDE_EFFECTS__
function zt(e) {
	return /* @__PURE__ */ Bt(e) ? /* @__PURE__ */ zt(e.__v_raw) : !!(e && e.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function Bt(e) {
	return !!(e && e.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function Vt(e) {
	return !!(e && e.__v_isShallow);
}
// @__NO_SIDE_EFFECTS__
function Ht(e) {
	return e ? !!e.__v_raw : !1;
}
// @__NO_SIDE_EFFECTS__
function F(e) {
	let t = e && e.__v_raw;
	return t ? /* @__PURE__ */ F(t) : e;
}
function Ut(e) {
	return !u(e, "__v_skip") && Object.isExtensible(e) && oe(e, "__v_skip", !0), e;
}
var Wt = (e) => v(e) ? /* @__PURE__ */ Ft(e) : e, Gt = (e) => v(e) ? /* @__PURE__ */ Lt(e) : e;
// @__NO_SIDE_EFFECTS__
function I(e) {
	return e ? e.__v_isRef === !0 : !1;
}
// @__NO_SIDE_EFFECTS__
function L(e) {
	return Kt(e, !1);
}
function Kt(e, t) {
	return /* @__PURE__ */ I(e) ? e : new qt(e, t);
}
var qt = class {
	constructor(e, t) {
		this.dep = new Je(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = t ? e : /* @__PURE__ */ F(e), this._value = t ? e : Wt(e), this.__v_isShallow = t;
	}
	get value() {
		return this.dep.track(), this._value;
	}
	set value(e) {
		let t = this._rawValue, n = this.__v_isShallow || /* @__PURE__ */ Vt(e) || /* @__PURE__ */ Bt(e);
		e = n ? e : /* @__PURE__ */ F(e), O(e, t) && (this._rawValue = e, this._value = n ? e : Wt(e), this.dep.trigger());
	}
};
function R(e) {
	return /* @__PURE__ */ I(e) ? e.value : e;
}
var Jt = {
	get: (e, t, n) => t === "__v_raw" ? e : R(Reflect.get(e, t, n)),
	set: (e, t, n, r) => {
		let i = e[t];
		return /* @__PURE__ */ I(i) && !/* @__PURE__ */ I(n) ? (i.value = n, !0) : Reflect.set(e, t, n, r);
	}
};
function Yt(e) {
	return /* @__PURE__ */ zt(e) ? e : new Proxy(e, Jt);
}
var Xt = class {
	constructor(e, t, n) {
		this.fn = e, this.setter = t, this._value = void 0, this.dep = new Je(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Ke - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !t, this.isSSR = n;
	}
	notify() {
		if (this.flags |= 16, !(this.flags & 8) && N !== this) return Me(this, !0), !0;
	}
	get value() {
		let e = this.dep.track();
		return Re(this), e && (e.version = this.dep.version), this._value;
	}
	set value(e) {
		this.setter && this.setter(e);
	}
};
// @__NO_SIDE_EFFECTS__
function Zt(e, t, n = !1) {
	let r, i;
	return h(e) ? r = e : (r = e.get, i = e.set), new Xt(r, i, n);
}
var Qt = {}, $t = /* @__PURE__ */ new WeakMap(), en = void 0;
function tn(e, t = !1, n = en) {
	if (n) {
		let t = $t.get(n);
		t || $t.set(n, t = []), t.push(e);
	}
}
function nn(e, n, i = t) {
	let { immediate: a, deep: o, once: s, scheduler: l, augmentJob: u, call: f } = i, p = (e) => o ? e : /* @__PURE__ */ Vt(e) || o === !1 || o === 0 ? rn(e, 1) : rn(e), m, g, _, v, y = !1, b = !1;
	if (/* @__PURE__ */ I(e) ? (g = () => e.value, y = /* @__PURE__ */ Vt(e)) : /* @__PURE__ */ zt(e) ? (g = () => p(e), y = !0) : d(e) ? (b = !0, y = e.some((e) => /* @__PURE__ */ zt(e) || /* @__PURE__ */ Vt(e)), g = () => e.map((e) => {
		if (/* @__PURE__ */ I(e)) return e.value;
		if (/* @__PURE__ */ zt(e)) return p(e);
		if (h(e)) return f ? f(e, 2) : e();
	})) : g = h(e) ? n ? f ? () => f(e, 2) : e : () => {
		if (_) {
			Ue();
			try {
				_();
			} finally {
				We();
			}
		}
		let t = en;
		en = m;
		try {
			return f ? f(e, 3, [v]) : e(v);
		} finally {
			en = t;
		}
	} : r, n && o) {
		let e = g, t = o === !0 ? Infinity : o;
		g = () => rn(e(), t);
	}
	let x = Ee(), S = () => {
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
	let C = b ? Array(e.length).fill(Qt) : Qt, w = (e) => {
		if (m.flags & 1 && (m.dirty || e)) {
			if (n) {
				let t = m.run();
				if (e || o || y || (b ? t.some((e, t) => O(e, C[t])) : O(t, C))) {
					let e = en;
					Ue();
					try {
						_ && _(), en = m;
						let e = [
							t,
							C === Qt ? void 0 : b && C[0] === Qt ? [] : C,
							v
						];
						C = t, f ? f(n, 3, e) : n(...e);
					} finally {
						en = e, We();
					}
				}
			} else m.run();
		}
	};
	return u && u(w), m = new Oe(g), m.scheduler = l ? () => l(w, !1) : w, v = (e) => tn(e, !1, m), _ = m.onStop = () => {
		let e = $t.get(m);
		if (e) {
			if (f) f(e, 4);
			else for (let t of e) t();
			$t.delete(m);
		}
	}, n ? a ? w(!0) : C = m.run() : l ? l(w.bind(null, !0), !0) : m.run(), S.pause = m.pause.bind(m), S.resume = m.resume.bind(m), S.stop = S, S;
}
function rn(e, t = Infinity, n) {
	if (t <= 0 || !v(e) || e.__v_skip || (n ||= /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
	if (n.set(e, t), t--, /* @__PURE__ */ I(e)) rn(e.value, t, n);
	else if (d(e)) for (let r = 0; r < e.length; r++) rn(e[r], t, n);
	else if (p(e) || f(e)) e.forEach((e) => {
		rn(e, t, n);
	});
	else if (C(e)) {
		for (let r in e) rn(e[r], t, n);
		for (let r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && rn(e[r], t, n);
	}
	return e;
}
// node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js
function an(e, t, n, r) {
	try {
		return r ? e(...r) : e();
	} catch (e) {
		sn(e, t, n);
	}
}
function on(e, t, n, r) {
	if (h(e)) {
		let i = an(e, t, n, r);
		return i && y(i) && i.catch((e) => {
			sn(e, t, n, void 0, !0);
		}), i;
	}
	if (d(e)) {
		let i = [];
		for (let a = 0; a < e.length; a++) i.push(on(e[a], t, n, r));
		return i;
	}
}
function sn(e, n, r, i = !0, a = !1) {
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
			Ue(), an(s, null, 10, [
				e,
				i,
				o
			]), We();
			return;
		}
	}
	cn(e, r, o, i, c);
}
function cn(e, t, n, r = !0, i = !1) {
	if (i) throw e;
	console.error(e);
}
var z = [], ln = -1, un = [], dn = null, fn = 0, pn = /* @__PURE__ */ Promise.resolve(), mn = null;
function hn(e) {
	let t = mn || pn;
	return e ? t.then(this ? e.bind(this) : e) : t;
}
function gn(e) {
	let t = ln + 1, n = z.length;
	for (; t < n;) {
		let r = t + n >>> 1, i = z[r], a = wn(i);
		a < e || a === e && i.flags & 2 ? t = r + 1 : n = r;
	}
	return t;
}
function _n(e) {
	if (!(e.flags & 1)) {
		let t = wn(e), n = z[z.length - 1];
		!n || !(e.flags & 2) && t >= wn(n) ? z.push(e) : z.splice(gn(t), 0, e), e.flags |= 1, vn();
	}
}
function vn() {
	mn ||= pn.then(Tn);
}
function yn(e) {
	if (!d(e)) dn && e.id === -1 ? dn.splice(fn + 1, 0, e) : e.flags & 1 || (un.push(e), e.flags |= 1);
	else for (let t = 0; t < e.length; t++) un.push(e[t]);
	vn();
}
function bn(e, t, n, r = ln + 1) {
	for (; r < z.length; r++) {
		let n = z[r];
		if (n && n.flags & 2) {
			if (e && n.id !== e.uid || t !== void 0 && !(n.id >= t)) continue;
			z.splice(r, 1), r = e ? r - 1 : ln, n.flags & 4 && (n.flags &= -2), n(), n.flags & 4 || (n.flags &= -2);
		}
	}
}
function xn(e, t, n = 0) {
	if (un.length) {
		let e = un, r = 0;
		if (t) {
			e = [];
			for (let i = 0; i < un.length; i++) {
				let a = un[i];
				(a.i === void 0 ? t.has(a) : !a.i || a.i.uid < n) ? un[r++] = a : e.push(a);
			}
		}
		let i = [...new Set(e)].sort((e, t) => wn(e) - wn(t));
		if (un.length = r, dn) {
			for (let e = 0; e < i.length; e++) dn.push(i[e]);
			return;
		}
		for (dn = i, fn = 0; fn < dn.length; fn++) {
			let e = dn[fn];
			e.flags & 4 && (e.flags &= -2), e.flags & 8 || e(), e.flags &= -2;
		}
		dn = null, fn = 0;
	}
}
var Sn = !1;
function Cn(e, t) {
	if (Sn) {
		e();
		return;
	}
	let n = t === void 0 ? void 0 : new Set(un);
	e(), Sn = !0;
	try {
		bn(void 0, t), xn(void 0, n, t);
	} finally {
		Sn = !1;
	}
}
var wn = (e) => e.id == null ? e.flags & 2 ? -1 : Infinity : e.id;
function Tn(e) {
	try {
		for (ln = 0; ln < z.length; ln++) {
			let e = z[ln];
			e && !(e.flags & 8) && (e.flags & 4 && (e.flags &= -2), an(e, e.i, e.i ? 15 : 14), e.flags & 4 || (e.flags &= -2));
		}
	} finally {
		for (; ln < z.length; ln++) {
			let e = z[ln];
			e && (e.flags &= -2);
		}
		ln = -1, z.length = 0, xn(e), mn = null, (z.length || un.length) && Tn(e);
	}
}
var En = null, Dn = null;
function On(e) {
	let t = En;
	return En = e, Dn = e && e.type.__scopeId || null, t;
}
function kn(e, t = En, n) {
	if (!t || e._n) return e;
	let r = (...n) => {
		r._d && ai(-1);
		let i = On(t), a = ti.length, o;
		try {
			o = e(...n);
		} finally {
			for (let e = ti.length; e > a; e--) ri();
			On(i), r._d && ai(1);
		}
		return o;
	};
	return r._n = !0, r._c = !0, r._d = !0, r;
}
function B(e, n) {
	if (En === null) return e;
	let r = zi(En), i = e.dirs ||= [];
	for (let e = 0; e < n.length; e++) {
		let [a, o, s, c = t] = n[e];
		a && (h(a) && (a = {
			mounted: a,
			updated: a
		}), a.deep && rn(o), i.push({
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
function An(e, t, n, r) {
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
		u && (Ue(), on(u, n, 8, [
			e.el,
			l,
			i,
			t
		]), We());
	}
}
function jn(e, t) {
	if (wi) {
		let n = wi.provides, r = wi.parent && wi.parent.provides;
		r === n && (n = wi.provides = Object.create(r)), n[e] = t;
	}
}
function Mn(e, t, n = !1) {
	let r = Ti();
	if (r || lr) {
		let i = lr ? lr._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
		if (i && e in i) return i[e];
		if (arguments.length > 1) return n && h(t) ? t.call(r && r.proxy) : t;
	}
}
var Nn = /* @__PURE__ */ Symbol.for("v-scx"), Pn = () => Mn(Nn);
function Fn(e, t, n) {
	return In(e, t, n);
}
function In(e, n, i = t) {
	let { immediate: a, deep: o, flush: c, once: l } = i, u = s({}, i), d = n && a || !n && c !== "post", f;
	if (ji) {
		if (c === "sync") {
			let e = Pn();
			f = e.__watcherHandles ||= [];
		} else if (!d) {
			let e = () => {};
			return e.stop = r, e.resume = r, e.pause = r, e;
		}
	}
	let p = wi;
	u.call = (e, t, n) => on(e, p, t, n);
	let m = !1;
	c === "post" ? u.scheduler = (e) => {
		e.i = p, H(e, p && p.suspense);
	} : c !== "sync" && (m = !0, u.scheduler = (e, t) => {
		t ? e() : _n(e);
	}), u.augmentJob = (e) => {
		n && (e.flags |= 4), m && (e.flags |= 2, p && (e.id = p.uid, e.i = p));
	};
	let h = nn(e, n, u);
	return ji && (f ? f.push(h) : d && h()), h;
}
var Ln = /* @__PURE__ */ Symbol("_vte"), Rn = (e) => e.__isTeleport, zn = /* @__PURE__ */ Symbol("_leaveCb");
function Bn(e) {
	let t = e[0];
	if (e.length > 1) {
		for (let n of e) if (n.type !== $r) {
			t = n;
			break;
		}
	}
	return t;
}
function Vn(e) {
	if (!Xn(e)) return Rn(e.type) && e.children ? Bn(e.children) : e;
	if (e.component) return e.component.subTree;
	let { shapeFlag: t, children: n } = e;
	if (n) {
		if (t & 16) return n[0];
		if (t & 32 && h(n.default)) return n.default();
	}
}
function Hn(e, t) {
	if (e.shapeFlag & 6 && e.component) {
		e.transition = t;
		let n = e.component.subTree;
		Hn(Rn(n.type) && Vn(n) || n, t);
	} else if (e.shapeFlag & 128) {
		let n = e.suspense;
		if (n) {
			let e = n.isHydrating ? n.pendingBranch : n.activeBranch;
			e && Hn(e, t.clone(e));
		} else e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback);
	} else if (e.transition = t, e.type === U && d(e.children)) {
		let n = hr(e.children, !1);
		n && Hn(n, t);
	}
}
function Un(e) {
	if (e.component) return Un(e.component.subTree);
	if (e.type === U) {
		let t = d(e.children) && hr(e.children, !1);
		return t ? Un(t) : void 0;
	}
	if (e.type !== $r) return e;
}
function Wn(e) {
	e.ids = [
		e.ids[0] + e.ids[2]++ + "-",
		0,
		0
	];
}
function Gn(e, t) {
	let n;
	return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
}
var Kn = /* @__PURE__ */ new WeakMap();
function qn(e, n, r, a, o = !1) {
	if (d(e)) {
		e.forEach((e, t) => qn(e, n && (d(n) ? n[t] : n), r, a, o));
		return;
	}
	if (Yn(a) && !o) {
		a.shapeFlag & 512 && a.type.__asyncResolved && a.component.subTree.component && qn(e, n, r, a.component.subTree);
		return;
	}
	let s = a.shapeFlag & 4 ? zi(a.component) : a.el, l = o ? null : s, { i: f, r: p } = e, m = n && n.r, _ = f.refs === t ? f.refs = {} : f.refs, v = f.setupState, y = /* @__PURE__ */ F(v), b = v === t ? i : (e) => !Gn(_, e) && u(y, e), x = (e, t) => !(t && Gn(_, t));
	if (m != null && m !== p) {
		if (Jn(n), g(m)) _[m] = null, b(m) && (v[m] = null);
		else if (/* @__PURE__ */ I(m)) {
			let e = n;
			x(m, e.k) && (m.value = null), e.k && (_[e.k] = null);
		}
	}
	if (h(p)) an(p, f, 12, [l, _]);
	else {
		let t = g(p), n = /* @__PURE__ */ I(p);
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
					i(), Kn.delete(e);
				};
				t.id = -1, Kn.set(e, t), H(t, r);
			} else Jn(e), i();
		}
	}
}
function Jn(e) {
	let t = Kn.get(e);
	t && (t.flags |= 8, Kn.delete(e));
}
le().requestIdleCallback, le().cancelIdleCallback;
var Yn = (e) => !!e.type.__asyncLoader, Xn = (e) => e.type.__isKeepAlive;
function Zn(e, t, n = wi, r = !1) {
	if (n) {
		let i = n[e] || (n[e] = []), a = t.__weh ||= (...r) => {
			Ue();
			let i = Oi(n), a = on(t, n, e, r);
			return i(), We(), a;
		};
		return r ? i.unshift(a) : i.push(a), a;
	}
}
var Qn = (e) => (t, n = wi) => {
	ji && e !== "sp" || Zn(e, (...e) => t(...e), n);
}, $n = Qn("m"), er = Qn("bum"), tr = /* @__PURE__ */ Symbol.for("v-ndc");
function V(e, t, n, r) {
	let i, a = n && n[r], o = d(e);
	if (o || g(e)) {
		let n = o && /* @__PURE__ */ zt(e), r = !1, s = !1;
		n && (r = !/* @__PURE__ */ Vt(e), s = /* @__PURE__ */ Bt(e), e = nt(e)), i = Array(e.length);
		for (let n = 0, o = e.length; n < o; n++) i[n] = t(r ? s ? Gt(Wt(e[n])) : Wt(e[n]) : e[n], n, void 0, a && a[n]);
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
var nr = (e) => e ? Ai(e) ? zi(e) : nr(e.parent) : null, rr = /* @__PURE__ */ s(/* @__PURE__ */ Object.create(null), {
	$: (e) => e,
	$el: (e) => e.vnode.el,
	$data: (e) => e.data,
	$props: (e) => e.props,
	$attrs: (e) => e.attrs,
	$slots: (e) => e.slots,
	$refs: (e) => e.refs,
	$parent: (e) => nr(e.parent),
	$root: (e) => nr(e.root),
	$host: (e) => e.ce,
	$emit: (e) => e.emit,
	$options: (e) => e.type,
	$forceUpdate: (e) => e.f ||= () => {
		_n(e.update);
	},
	$nextTick: (e) => e.n ||= hn.bind(e.proxy),
	$watch: (e) => r
}), ir = (e, n) => e !== t && !e.__isScriptSetup && u(e, n), ar = {
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
			else if (ir(i, n)) return s[n] = 1, i[n];
			else if (u(o, n)) return s[n] = 3, o[n];
			else if (r !== t && u(r, n)) return s[n] = 4, r[n];
			else s[n] = 0;
		}
		let d = rr[n], f, p;
		if (d) return n === "$attrs" && P(e.attrs, "get", ""), d(e);
		if ((f = c.__cssModules) && (f = f[n])) return f;
		if (r !== t && u(r, n)) return s[n] = 4, r[n];
		if (p = l.config.globalProperties, u(p, n)) return p[n];
	},
	set({ _: e }, t, n) {
		let { data: r, setupState: i, ctx: a } = e;
		return ir(i, t) ? (i[t] = n, !0) : u(e.props, t) || t[0] === "$" && t.slice(1) in e ? !1 : (a[t] = n, !0);
	},
	has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: a, type: o } }, s) {
		let c;
		return !!(n[s] || ir(t, s) || u(a, s) || u(r, s) || u(rr, s) || u(i.config.globalProperties, s) || (c = o.__cssModules) && c[s]);
	},
	defineProperty(e, t, n) {
		return n.get == null ? u(n, "value") && this.set(e, t, n.value, null) : e._.accessCache[t] = 0, Reflect.defineProperty(e, t, n);
	}
};
function or() {
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
var sr = 0;
function cr(e, t) {
	return function(n, r = null) {
		h(n) || (n = s({}, n)), r != null && !v(r) && (r = null);
		let i = or(), a = /* @__PURE__ */ new WeakSet(), o = [], c = !1, l = i.app = {
			_uid: sr++,
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
					let u = l._ceVNode || q(n, r);
					return u.appContext = i, s === !0 ? s = "svg" : s === !1 && (s = void 0), o && t ? t(u, a) : e(u, a, s), c = !0, l._container = a, a.__vue_app__ = l, zi(u.component);
				}
			},
			onUnmount(e) {
				o.push(e);
			},
			unmount() {
				c && (on(o, l._instance, 16), e(null, l._container), delete l._container.__vue_app__);
			},
			provide(e, t) {
				return i.provides[e] = t, l;
			},
			runWithContext(e) {
				let t = lr;
				lr = l;
				try {
					return e();
				} finally {
					lr = t;
				}
			}
		};
		return l;
	};
}
var lr = null, ur = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${E(t)}Modifiers`] || e[`${D(t)}Modifiers`];
function dr(e, n, ...r) {
	if (e.isUnmounted) return;
	let i = e.vnode.props || t, a = r, o = n.startsWith("update:"), s = o && ur(i, n.slice(7));
	s && (s.trim && (a = r.map((e) => g(e) ? e.trim() : e)), s.number && (a = a.map(se)));
	let c, l = i[c = ie(n)] || i[c = ie(E(n))];
	!l && o && (l = i[c = ie(D(n))]), l && on(l, e, 6, a);
	let u = i[c + "Once"];
	if (u) {
		if (!e.emitted) e.emitted = {};
		else if (e.emitted[c]) return;
		e.emitted[c] = !0, on(u, e, 6, a);
	}
}
function fr(e, t, n = !1) {
	let r = t.emitsCache, i = r.get(e);
	if (i !== void 0) return i;
	let a = e.emits, o = {};
	return a ? (d(a) ? a.forEach((e) => o[e] = null) : s(o, a), v(e) && r.set(e, o), o) : (v(e) && r.set(e, null), null);
}
function pr(e, t) {
	return !e || !a(t) ? !1 : (t = t.slice(2), t = t === "Once" ? t : t.replace(/Once$/, ""), u(e, t[0].toLowerCase() + t.slice(1)) || u(e, D(t)) || u(e, t));
}
function mr(e) {
	let { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [a], slots: s, attrs: c, emit: l, render: u, renderCache: d, props: f, data: p, setupState: m, ctx: h, inheritAttrs: g } = e, _ = On(e), v, y;
	try {
		if (n.shapeFlag & 4) {
			let e = i || r, t = e;
			v = hi(u.call(t, e, d, f, m, p, h)), y = c;
		} else {
			let e = t;
			v = hi(e.length > 1 ? e(f, {
				attrs: c,
				slots: s,
				emit: l
			}) : e(f, null)), y = t.props ? c : gr(c);
		}
	} catch (t) {
		ti.length = 0, sn(t, e, 1), v = q($r);
	}
	let b = v;
	if (y && g !== !1) {
		let e = Object.keys(y), { shapeFlag: t } = b;
		e.length && t & 7 && (a && e.some(o) && (y = _r(y, a)), b = mi(b, y, !1, !0));
	}
	return n.dirs && (b = mi(b, null, !1, !0), b.dirs = b.dirs ? b.dirs.concat(n.dirs) : n.dirs), n.transition && Hn(Rn(b.type) && Vn(b) || b, n.transition), v = b, On(_), v;
}
function hr(e, t = !0) {
	let n;
	for (let t = 0; t < e.length; t++) {
		let r = e[t];
		if (ci(r)) {
			if (r.type !== $r || r.children === "v-if") {
				if (n) return;
				n = r;
			}
		} else return;
	}
	return n;
}
var gr = (e) => {
	let t;
	for (let n in e) (n === "class" || n === "style" || a(n)) && ((t ||= {})[n] = e[n]);
	return t;
}, _r = (e, t) => {
	let n = {};
	for (let r in e) o(r) && r.slice(9) in t || (n[r] = e[r]);
	return n;
};
function vr(e, t, n) {
	let { props: r, children: i, component: a } = e, { props: o, children: s, patchFlag: c } = t, l = a.emitsOptions;
	if (t.dirs || t.transition) return !0;
	if (n && c >= 0) {
		if (c & 1024) return !0;
		if (c & 16) return r ? yr(r, o, l) : !!o;
		if (c & 8) {
			let e = t.dynamicProps;
			for (let t = 0; t < e.length; t++) {
				let n = e[t];
				if (br(o, r, n) && !pr(l, n)) return !0;
			}
		}
	} else return (i || s) && (!s || !s.$stable) ? !0 : r === o ? !1 : r ? !o || yr(r, o, l) : !!o;
	return !1;
}
function yr(e, t, n) {
	let r = Object.keys(t);
	if (r.length !== Object.keys(e).length) return !0;
	for (let i = 0; i < r.length; i++) {
		let a = r[i];
		if (!u(e, a) || br(t, e, a) && !pr(n, a)) return !0;
	}
	return !1;
}
function br(e, t, n) {
	let r = e[n], i = t[n];
	return n === "style" && v(r) && v(i) ? !A(r, i) : r !== i;
}
function xr({ vnode: e, parent: t, suspense: n }, r) {
	for (; t;) {
		let n = t.subTree;
		if (n.suspense && n.suspense.activeBranch === e && (n.suspense.vnode.el = n.el = r, e = n), n === e) (e = t.vnode).el = r, t = t.parent;
		else break;
	}
	n && n.activeBranch === e && (n.vnode.el = r);
}
var Sr = {}, Cr = () => Object.create(Sr), wr = (e) => Object.getPrototypeOf(e) === Sr;
function Tr(e, t, n, r = !1) {
	let i = {}, a = Cr();
	e.propsDefaults = /* @__PURE__ */ Object.create(null), Dr(e, t, i, a);
	for (let t in e.propsOptions[0]) t in i || (i[t] = void 0);
	e.props = n ? r ? i : /* @__PURE__ */ It(i) : e.type.props ? i : a, e.attrs = a;
}
function Er(e, t, n, r) {
	let { props: i, attrs: a, vnode: { patchFlag: o } } = e, s = /* @__PURE__ */ F(i), [c] = e.propsOptions, l = !1;
	if ((r || o > 0) && !(o & 16)) {
		if (o & 8) {
			let n = e.vnode.dynamicProps;
			for (let r = 0; r < n.length; r++) {
				let o = n[r];
				if (pr(e.emitsOptions, o)) continue;
				let d = t[o];
				if (c) {
					if (u(a, o)) d !== a[o] && (a[o] = d, l = !0);
					else {
						let t = E(o);
						i[t] = Or(c, s, t, d, e, !1);
					}
				} else d !== a[o] && (a[o] = d, l = !0);
			}
		}
	} else {
		Dr(e, t, i, a) && (l = !0);
		let r;
		for (let a in s) t && (u(t, a) || (r = D(a)) !== a && u(t, r)) || (c ? n && (n[a] !== void 0 || n[r] !== void 0) && (i[a] = Or(c, s, a, void 0, e, !0)) : delete i[a]);
		if (a !== s) for (let e in a) t && u(t, e) || (delete a[e], l = !0);
	}
	l && et(e.attrs, "set", "");
}
function Dr(e, n, r, i) {
	let [a, o] = e.propsOptions, s = !1, c;
	if (n) for (let t in n) {
		if (T(t)) continue;
		let l = n[t], d;
		a && u(a, d = E(t)) ? !o || !o.includes(d) ? r[d] = l : (c ||= {})[d] = l : pr(e.emitsOptions, t) || t in i && l === i[t] || (i[t] = l, s = !0);
	}
	if (o) {
		let n = /* @__PURE__ */ F(r), i = c || t;
		for (let t = 0; t < o.length; t++) {
			let s = o[t];
			r[s] = Or(a, n, s, i[s], e, !u(i, s));
		}
	}
	return s;
}
function Or(e, t, n, r, i, a) {
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
		o[0] && (a && !e ? r = !1 : o[1] && (r === "" || r === D(n)) && (r = !0));
	}
	return r;
}
function kr(e, r, i = !1) {
	let a = r.propsCache, o = a.get(e);
	if (o) return o;
	let c = e.props, l = {}, f = [];
	if (!c) return v(e) && a.set(e, n), n;
	if (d(c)) for (let e = 0; e < c.length; e++) {
		let n = E(c[e]);
		Ar(n) && (l[n] = t);
	}
	else if (c) for (let e in c) {
		let t = E(e);
		if (Ar(t)) {
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
function Ar(e) {
	return e[0] !== "$" && !T(e);
}
var jr = (e) => e === "_" || e === "_ctx" || e === "$stable", Mr = (e) => d(e) ? e.map(hi) : [hi(e)], Nr = (e, t, n) => {
	if (t._n) return t;
	let r = kn((...e) => Mr(t(...e)), n);
	return r._c = !1, r;
}, Pr = (e, t, n) => {
	let r = e._ctx;
	for (let n in e) {
		if (jr(n)) continue;
		let i = e[n];
		if (h(i)) t[n] = Nr(n, i, r);
		else if (i != null) {
			let e = Mr(i);
			t[n] = () => e;
		}
	}
}, Fr = (e, t) => {
	let n = Mr(t);
	e.slots.default = () => n;
}, Ir = (e, t, n) => {
	for (let r in t) (n || !jr(r)) && (e[r] = t[r]);
}, Lr = (e, t, n) => {
	let r = e.slots = Cr();
	if (e.vnode.shapeFlag & 32) {
		let e = t._;
		e ? (Ir(r, t, n), n && oe(r, "_", e, !0)) : Pr(t, r);
	} else t && Fr(e, t);
}, Rr = (e, n, r) => {
	let { vnode: i, slots: a } = e, o = !0, s = t;
	if (i.shapeFlag & 32) {
		let e = n._;
		e ? r && e === 1 ? o = !1 : Ir(a, n, r) : (o = !n.$stable, Pr(n, a)), s = n;
	} else n && (Fr(e, n), s = { default: 1 });
	if (o) for (let e in a) !jr(e) && s[e] == null && delete a[e];
}, H = Zr;
function zr(e) {
	return Br(e);
}
function Br(e, i) {
	let a = le();
	a.__VUE__ = !0;
	let { insert: o, remove: s, patchProp: c, createElement: l, createText: u, createComment: d, setText: f, setElementText: p, parentNode: m, nextSibling: h, setScopeId: g = r, insertStaticContent: _ } = e, v = (e, t, r, i = null, a = null, o = null, s = void 0, c = null, l = !!t.dynamicChildren) => {
		if (e === t) return;
		e && !li(e, t) && (i = ye(e), k(e, a, o, !0), e = null), t.patchFlag === -2 && (l = !1, t.dynamicChildren = null), t.dynamicChildren && e && e.dynamicChildren && e.dynamicChildren.hasOnce && (t.dynamicChildren === n && (t.dynamicChildren = []), t.dynamicChildren.hasOnce = !0);
		let { type: u, ref: d, shapeFlag: f } = t;
		switch (u) {
			case Qr:
				y(e, t, r, i);
				break;
			case $r:
				b(e, t, r, i);
				break;
			case ei:
				e ?? x(t, r, i, s);
				break;
			case U:
				ie(e, t, r, i, a, o, s, c, l);
				break;
			default: f & 1 ? w(e, t, r, i, a, o, s, c, l) : f & 6 ? O(e, t, r, i, a, o, s, c, l) : (f & 64 || f & 128) && u.process(e, t, r, i, a, o, s, c, l, A);
		}
		d != null && a ? qn(d, e && e.ref, o, t || e, !t) : d == null && e && e.ref != null && qn(e.ref, null, o, e, !0);
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
		if (t.type === "svg" ? o = "svg" : t.type === "math" && (o = "mathml"), e == null) ee(t, n, r, i, a, o, s, c);
		else {
			let n = e.el && e.el._isVueCE ? e.el : null;
			try {
				n && n._beginPatch(), ne(e, t, i, a, o, s, c);
			} finally {
				n && n._endPatch();
			}
		}
	}, ee = (e, t, n, r, i, a, s, u) => {
		let d, f, { props: m, shapeFlag: h, transition: g, dirs: _ } = e;
		if (d = e.el = l(e.type, a, m && m.is, m), h & 8 ? p(d, e.children) : h & 16 && E(e.children, d, null, r, i, Vr(e, a), s, u), _ && An(e, null, r, "created"), te(d, e, e.scopeId, s, r), m) {
			for (let e in m) e !== "value" && !T(e) && c(d, e, null, m[e], a, r);
			"value" in m && c(d, "value", null, m.value, a), (f = m.onVnodeBeforeMount) && yi(f, r, e);
		}
		_ && An(e, null, r, "beforeMount");
		let v = Ur(i, g);
		v ? g.beforeEnter(d) : g && !g.persisted && (d[Xr] = !0), o(d, t, n), ((f = m && m.onVnodeMounted) || v || _) && H(() => {
			try {
				f && yi(f, r, e), v && g.enter(d), _ && An(e, null, r, "mounted");
			} finally {}
		}, i);
	}, te = (e, t, n, r, i) => {
		if (n && g(e, n), r) for (let t = 0; t < r.length; t++) g(e, r[t]);
		if (i) {
			let n = i.subTree;
			if (t === n || Yr(n.type) && (n.ssContent === t || n.ssFallback === t)) {
				let t = i.vnode;
				te(e, t, t.scopeId, t.slotScopeIds, i.parent);
			}
		}
	}, E = (e, t, n, r, i, a, o, s, c = 0) => {
		for (let l = c; l < e.length; l++) {
			let c = e[l] = s ? gi(e[l]) : hi(e[l]);
			v(null, c, t, n, r, i, a, o, s);
		}
	}, ne = (e, n, r, i, a, o, s) => {
		let l = n.el = e.el, { patchFlag: u, dynamicChildren: d, dirs: f } = n;
		u |= e.patchFlag & 16;
		let m = e.props || t, h = n.props || t, g;
		if (r && Hr(r, !1), (g = h.onVnodeBeforeUpdate) && yi(g, r, n, e), f && An(n, e, r, "beforeUpdate"), r && Hr(r, !0), d && (!e.dynamicChildren || e.dynamicChildren.length !== d.length) && (u = 0, s = !1, d = null), (m.innerHTML && h.innerHTML == null || m.textContent && h.textContent == null) && p(l, ""), d ? D(e.dynamicChildren, d, l, r, i, Vr(n, a), o) : s || de(e, n, l, null, r, i, Vr(n, a), o, !1), u > 0) {
			if (u & 16) re(l, m, h, r, a);
			else if (u & 2 && m.class !== h.class && c(l, "class", null, h.class, a), u & 4 && c(l, "style", m.style, h.style, a), u & 8) {
				let e = n.dynamicProps;
				for (let t = 0; t < e.length; t++) {
					let n = e[t], i = m[n], o = h[n];
					(o !== i || n === "value") && c(l, n, i, o, a, r);
				}
			}
			u & 1 && e.children !== n.children && p(l, n.children);
		} else !s && d == null && re(l, m, h, r, a);
		((g = h.onVnodeUpdated) || f) && H(() => {
			g && yi(g, r, n, e), f && An(n, e, r, "updated");
		}, i);
	}, D = (e, t, n, r, i, a, o) => {
		for (let s = 0; s < t.length; s++) {
			let c = e[s], l = t[s], u = c.el || Jr(c), d = u && (c.type === U || !li(c, l) || c.shapeFlag & 198) ? m(u) : n;
			v(c, l, d, null, r, i, a, o, !0);
		}
	}, re = (e, n, r, i, a) => {
		if (n !== r) {
			if (n !== t) for (let t in n) !T(t) && !(t in r) && c(e, t, n[t], null, a, i);
			for (let t in r) {
				if (T(t)) continue;
				let o = r[t], s = n[t];
				o !== s && t !== "value" && c(e, t, s, o, a, i);
			}
			"value" in r && c(e, "value", n.value, r.value, a);
		}
	}, ie = (e, t, n, r, i, a, s, c, l) => {
		let d = t.el = e ? e.el : u(""), f = t.anchor = e ? e.anchor : u(""), { patchFlag: p, dynamicChildren: m, slotScopeIds: h } = t;
		h && (c = c ? c.concat(h) : h), e == null ? (o(d, n, r), o(f, n, r), E(t.children || [], n, f, i, a, s, c, l)) : p > 0 && p & 64 && m && e.dynamicChildren && e.dynamicChildren.length === m.length ? (D(e.dynamicChildren, m, n, i, a, s, c), (t.key != null || i && t === i.subTree) && Wr(e, t, !0)) : de(e, t, n, f, i, a, s, c, l);
	}, O = (e, t, n, r, i, a, o, s, c) => {
		t.slotScopeIds = s, e == null ? t.shapeFlag & 512 ? i.ctx.activate(t, n, r, o, c) : oe(t, n, r, i, a, o, c) : se(e, t, c);
	}, oe = (e, t, n, r, i, a, o) => {
		let s = e.component = Ci(e, r, i);
		if (Xn(e) && (s.ctx.renderer = A), Mi(s, !1, o), s.asyncDep) {
			if (i && i.registerDep(s, ce, o, a), !e.el) {
				let r = s.subTree = q($r);
				b(null, r, t, n), e.placeholder = r.el;
			}
		} else ce(s, e, t, n, i, a, o);
	}, se = (e, t, n) => {
		let r = t.component = e.component;
		if (vr(e, t, n)) {
			if (r.asyncDep && !r.asyncResolved) {
				t.el = e.el, t.placeholder = e.placeholder, ue(r, t, n);
				return;
			}
			r.next = t, r.update();
		} else t.el = e.el, t.placeholder = e.placeholder, r.vnode = t;
	}, ce = (e, t, n, r, i, a, o) => {
		let s = () => {
			if (e.isMounted) {
				let { next: t, bu: n, u: r, parent: s, vnode: c } = e;
				{
					let n = Kr(e);
					if (n) {
						t && (t.el = c.el, ue(e, t, o)), n.asyncDep.then(() => {
							let t = () => {
								e.job.flags & 8 || (i && i.pendingBranch ? H(t, i) : l());
							};
							t.flags = 48, H(t, i);
						});
						return;
					}
				}
				let u = t, d;
				Hr(e, !1), t ? (t.el = c.el, ue(e, t, o)) : t = c, n && ae(n), (d = t.props && t.props.onVnodeBeforeUpdate) && yi(d, s, t, c), Hr(e, !0);
				let f = mr(e), p = e.subTree;
				e.subTree = f, v(p, f, m(p.el || Jr(p)), ye(p), e, i, a), t.el = f.el, u === null && xr(e, f.el), r && H(r, i), (d = t.props && t.props.onVnodeUpdated) && H(() => yi(d, s, t, c), i);
			} else {
				let o, { el: s, props: c } = t, { bm: l, m: u, parent: d, root: f, type: p } = e, m = Yn(t);
				if (Hr(e, !1), l && ae(l), !m && (o = c && c.onVnodeBeforeMount) && yi(o, d, t), Hr(e, !0), s && Se) {
					let t = () => {
						e.subTree = mr(e), Se(s, e.subTree, e, i, null);
					};
					m && p.__asyncHydrate ? p.__asyncHydrate(s, e, t) : t();
				} else {
					f.ce && f.ce._hasShadowRoot() && f.ce._injectChildStyle(p, e.parent ? e.parent.type : void 0);
					let o = e.subTree = mr(e);
					v(null, o, n, r, e, i, a), t.el = o.el;
				}
				if (u && H(u, i), !m && (o = c && c.onVnodeMounted)) {
					let e = t;
					H(() => yi(o, d, e), i);
				}
				(t.shapeFlag & 256 || d && Yn(d.vnode) && d.vnode.shapeFlag & 256) && e.a && H(e.a, i), e.isMounted = !0, t = n = r = null;
			}
		};
		e.scope.on();
		let c = e.effect = new Oe(s);
		e.scope.off();
		let l = e.update = c.run.bind(c), u = e.job = c.runIfDirty.bind(c);
		u.i = e, u.id = e.uid, c.scheduler = () => _n(u), Hr(e, !0), l();
	}, ue = (e, t, n) => {
		t.component = e;
		let r = e.vnode.props;
		e.vnode = t, e.next = null, Er(e, t.props, r, n), Rr(e, t.children, n), Ue(), bn(e), We();
	}, de = (e, t, n, r, i, a, o, s, c = !1) => {
		let l = e && e.children, u = e ? e.shapeFlag : 0, d = t.children, { patchFlag: f, shapeFlag: m } = t;
		if (f > 0) {
			if (f & 128) {
				pe(l, d, n, r, i, a, o, s, c);
				return;
			}
			if (f & 256) {
				fe(l, d, n, r, i, a, o, s, c);
				return;
			}
		}
		m & 8 ? (u & 16 && ve(l, i, a), d !== l && p(n, d)) : u & 16 ? m & 16 ? pe(l, d, n, r, i, a, o, s, c) : ve(l, i, a, !0) : (u & 8 && p(n, ""), m & 16 && E(d, n, r, i, a, o, s, c));
	}, fe = (e, t, r, i, a, o, s, c, l) => {
		e ||= n, t ||= n;
		let u = e.length, d = t.length, f = Math.min(u, d), p = 0;
		for (; p < f; p++) {
			let n = t[p] = l ? gi(t[p]) : hi(t[p]);
			v(e[p], n, r, null, a, o, s, c, l);
		}
		u > d ? ve(e, a, o, !0, !1, f) : E(t, r, i, a, o, s, c, l, f);
	}, pe = (e, t, r, i, a, o, s, c, l) => {
		let u = 0, d = t.length, f = e.length - 1, p = d - 1;
		for (; u <= f && u <= p;) {
			let n = e[u], i = t[u] = l ? gi(t[u]) : hi(t[u]);
			if (li(n, i)) v(n, i, r, null, a, o, s, c, l);
			else break;
			u++;
		}
		for (; u <= f && u <= p;) {
			let n = e[f], i = t[p] = l ? gi(t[p]) : hi(t[p]);
			if (li(n, i)) v(n, i, r, null, a, o, s, c, l);
			else break;
			f--, p--;
		}
		if (u > f) {
			if (u <= p) {
				let e = p + 1, n = e < d ? t[e].el : i;
				for (; u <= p;) v(null, t[u] = l ? gi(t[u]) : hi(t[u]), r, n, a, o, s, c, l), u++;
			}
		} else if (u > p) for (; u <= f;) k(e[u], a, o, !0), u++;
		else {
			let m = u, h = u, g = /* @__PURE__ */ new Map();
			for (u = h; u <= p; u++) {
				let e = t[u] = l ? gi(t[u]) : hi(t[u]);
				e.key != null && g.set(e.key, u);
			}
			let _, y = 0, b = p - h + 1, x = !1, S = 0, C = Array(b);
			for (u = 0; u < b; u++) C[u] = 0;
			for (u = m; u <= f; u++) {
				let n = e[u];
				if (y >= b) {
					k(n, a, o, !0);
					continue;
				}
				let i;
				if (n.key != null) i = g.get(n.key);
				else for (_ = h; _ <= p; _++) if (C[_ - h] === 0 && li(n, t[_])) {
					i = _;
					break;
				}
				i === void 0 ? k(n, a, o, !0) : (C[i - h] = u + 1, i >= S ? S = i : x = !0, v(n, t[i], r, null, a, o, s, c, l), y++);
			}
			let w = x ? Gr(C) : n;
			for (_ = w.length - 1, u = b - 1; u >= 0; u--) {
				let e = h + u, n = t[e], f = t[e + 1], p = e + 1 < d ? f.el || Jr(f) : i;
				C[u] === 0 ? v(null, n, r, p, a, o, s, c, l) : x && (_ < 0 || u !== w[_] ? me(n, r, p, 2) : _--);
			}
		}
	}, me = (e, t, n, r, i = null) => {
		let { el: a, type: c, transition: l, children: u, shapeFlag: d } = e;
		if (d & 6) me(e.component.subTree, t, n, r);
		else if (d & 128) e.suspense.move(t, n, r);
		else if (d & 64) c.move(e, t, n, A);
		else if (c === U) {
			o(a, t, n);
			for (let e = 0; e < u.length; e++) me(u[e], t, n, r);
			o(e.anchor, t, n);
		} else if (c === ei) S(e, t, n);
		else if (r !== 2 && d & 1 && l) {
			if (r === 0) l.persisted && !a[zn] ? o(a, t, n) : (l.beforeEnter(a), o(a, t, n), H(() => l.enter(a), i));
			else {
				let { leave: r, delayLeave: i, afterLeave: c } = l, u = () => {
					e.ctx.isUnmounted ? s(a) : o(a, t, n);
				}, d = () => {
					let e = a._isLeaving || !!a[zn];
					a._isLeaving && a[zn](!0), l.persisted && !e ? u() : r(a, () => {
						u(), c && c();
					});
				};
				i ? i(a, u, d) : d();
			}
		} else o(a, t, n);
	}, k = (e, t, n, r = !1, i = !1) => {
		let { type: a, props: o, ref: s, children: c, dynamicChildren: l, shapeFlag: u, patchFlag: d, dirs: f, cacheIndex: p, memo: m } = e;
		if ((d === -2 || l && l.hasOnce) && (i = !1), s != null && (Ue(), qn(s, null, n, e, !0), We()), p == null || e.ctx && e.ctx !== t || (t.renderCache[p] = void 0), u & 256 && t.ctx.deactivate(e)) return;
		let h = u & 1 && f, g = !Yn(e), _;
		if (g && (_ = o && o.onVnodeBeforeUnmount) && yi(_, t, e), u & 6) _e(e.component, n, r);
		else {
			if (u & 128) {
				e.suspense.unmount(n, r);
				return;
			}
			h && An(e, null, t, "beforeUnmount"), u & 64 ? e.type.remove(e, t, n, A, r) : l && !l.hasOnce && (a !== U || d > 0 && d & 64) ? ve(l, t, n, !1, !0) : (a === U && d & 384 || !i && u & 16) && ve(c, t, n), r && he(e);
		}
		let v = m != null && p == null;
		(g && (_ = o && o.onVnodeUnmounted) || h || v) && H(() => {
			_ && yi(_, t, e), h && An(e, null, t, "unmounted"), v && (e.el = null);
		}, n);
	}, he = (e) => {
		let { type: t, el: n, anchor: r, transition: i } = e, a = t === U;
		if (a && !i) {
			ge(n, r);
			return;
		}
		if (t === ei) {
			C(e), i && !i.persisted && i.afterLeave && i.afterLeave();
			return;
		}
		let o = a ? Un(e) : e, c = () => {
			a ? m(n) && ge(n, r) : s(n), i && !i.persisted && i.afterLeave && i.afterLeave();
		};
		if (o && o.shapeFlag & 1 && i && !i.persisted) {
			let { leave: e, delayLeave: t } = i, n = o.el, r = () => e(n, c);
			t ? t(n, c, r) : r();
		} else c();
	}, ge = (e, t) => {
		let n;
		for (; e !== t;) n = h(e), s(e), e = n;
		s(t);
	}, _e = (e, t, n) => {
		let { bum: r, scope: i, job: a, subTree: o, um: s, m: c, a: l } = e;
		qr(c), qr(l), r && ae(r), i.stop(), a ? (a.flags |= 8, k(o, e, t, n)) : o && (o.transition = e.vnode.transition, k(o, e, t, n)), s && H(s, t);
		let u = () => {
			e.isUnmounted = !0;
		};
		u.flags = 16, H(u, t);
	}, ve = (e, t, n, r = !1, i = !1, a = 0) => {
		for (let o = a; o < e.length; o++) k(e[o], t, n, r, i);
	}, ye = (e) => {
		if (e.shapeFlag & 6) return ye(e.component.subTree);
		if (e.shapeFlag & 128) return e.suspense.next();
		let t = h(e.anchor || e.el), n = t && t[Ln];
		return n ? h(n) : t;
	}, be = (e, t, n) => {
		Cn(() => {
			e == null ? t._vnode && k(t._vnode, null, null, !0) : v(t._vnode || null, e, t, null, null, null, n), t._vnode = e;
		}, e && t._vnode ? void 0 : e && e.component ? e.component.uid : Si());
	}, A = {
		p: v,
		um: k,
		m: me,
		r: he,
		mt: oe,
		mc: E,
		pc: de,
		pbc: D,
		n: ye,
		o: e
	}, xe, Se;
	return i && ([xe, Se] = i(A)), {
		render: be,
		hydrate: xe,
		createApp: cr(be, xe)
	};
}
function Vr({ type: e, props: t }, n) {
	return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function Hr({ effect: e, job: t }, n) {
	n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Ur(e, t) {
	return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function Wr(e, t, n = !1) {
	let r = e.children, i = t.children;
	if (d(r) && d(i)) for (let e = 0; e < r.length; e++) {
		let t = r[e], a = i[e];
		a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[e] = gi(i[e]), a.el = t.el), !n && a.patchFlag !== -2 && Wr(t, a)), a.type === Qr && (a.patchFlag === -1 && (a = i[e] = gi(a)), a.el = t.el), a.type === $r && !a.el && (a.el = t.el);
	}
}
function Gr(e) {
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
function Kr(e) {
	let t = e.subTree.component;
	if (t) return t.asyncDep && !t.asyncResolved ? t : Kr(t);
}
function qr(e) {
	if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
function Jr(e) {
	if (e.placeholder) return e.placeholder;
	let t = e.component;
	if (t) return Jr(t.subTree);
	let n = e.suspense;
	return n && n.activeBranch ? Jr(n.activeBranch) : null;
}
var Yr = (e) => e.__isSuspense, Xr = /* @__PURE__ */ Symbol("_deferredEnter");
function Zr(e, t) {
	t && t.pendingBranch ? d(e) ? t.effects.push(...e) : t.effects.push(e) : yn(e);
}
var U = /* @__PURE__ */ Symbol.for("v-fgt"), Qr = /* @__PURE__ */ Symbol.for("v-txt"), $r = /* @__PURE__ */ Symbol.for("v-cmt"), ei = /* @__PURE__ */ Symbol.for("v-stc"), ti = [], ni = null;
function W(e = !1) {
	ti.push(ni = e ? null : []);
}
function ri() {
	ti.pop(), ni = ti[ti.length - 1] || null;
}
var ii = 1;
function ai(e, t = !1) {
	ii += e, e < 0 && ni && t && (ni.hasOnce = !0);
}
function oi(e) {
	return e.dynamicChildren = ii > 0 ? ni || n : null, ri(), ii > 0 && ni && ni.push(e), e;
}
function G(e, t, n, r, i, a) {
	return oi(K(e, t, n, r, i, a, !0));
}
function si(e, t, n, r, i) {
	return oi(q(e, t, n, r, i, !0));
}
function ci(e) {
	return e ? e.__v_isVNode === !0 : !1;
}
function li(e, t) {
	return e.type === t.type && e.key === t.key;
}
var ui = ({ key: e }) => e ?? null, di = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e == null ? null : g(e) || /* @__PURE__ */ I(e) || h(e) ? {
	i: En,
	r: e,
	k: t,
	f: !!n
} : e);
function K(e, t = null, n = null, r = 0, i = null, a = e === U ? 0 : 1, o = !1, s = !1) {
	let c = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e,
		props: t,
		key: t && ui(t),
		ref: t && di(t),
		scopeId: Dn,
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
		ctx: En
	};
	return s ? (_i(c, n), a & 128 && e.normalize(c)) : n && (c.shapeFlag |= g(n) ? 8 : 16), ii > 0 && !o && ni && (c.patchFlag > 0 || a & 6) && c.patchFlag !== 32 && ni.push(c), c;
}
var q = fi;
function fi(e, t = null, n = null, r = 0, i = null, a = !1) {
	if (e && e !== tr || (e = $r), ci(e)) {
		let r = mi(e, t, !0);
		return n && _i(r, n), ii > 0 && !a && ni && (r.shapeFlag & 6 ? ni[ni.indexOf(e)] = r : ni.push(r)), r.patchFlag = -2, r;
	}
	if (Bi(e) && (e = e.__vccOpts), t) {
		t = pi(t);
		let { class: e, style: n } = t;
		e && !g(e) && (t.class = k(e)), v(n) && (/* @__PURE__ */ Ht(n) && !d(n) && (n = s({}, n)), t.style = ue(n));
	}
	let o = g(e) ? 1 : Yr(e) ? 128 : Rn(e) ? 64 : v(e) ? 4 : h(e) ? 2 : 0;
	return K(e, t, n, r, i, o, a, !0);
}
function pi(e) {
	return e ? /* @__PURE__ */ Ht(e) ? s({}, e) : wr(e) ? s({}, e[Ii] || e) : e : null;
}
function mi(e, t, n = !1, r = !1) {
	let { props: i, ref: a, patchFlag: o, children: s, transition: c } = e, l = t ? vi(i || {}, t) : i, u = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e.type,
		props: l,
		key: l && ui(l),
		ref: t && t.ref ? n && a ? d(a) ? a.concat(di(t)) : [a, di(t)] : di(t) : a,
		scopeId: e.scopeId,
		slotScopeIds: e.slotScopeIds,
		children: s,
		target: e.target,
		targetStart: e.targetStart,
		targetAnchor: e.targetAnchor,
		staticCount: e.staticCount,
		shapeFlag: e.shapeFlag,
		patchFlag: t && e.type !== U ? o === -1 ? 16 : o | 16 : o,
		dynamicProps: e.dynamicProps,
		dynamicChildren: e.dynamicChildren,
		appContext: e.appContext,
		dirs: e.dirs,
		transition: c,
		component: e.component,
		suspense: e.suspense,
		ssContent: e.ssContent && mi(e.ssContent),
		ssFallback: e.ssFallback && mi(e.ssFallback),
		placeholder: e.placeholder,
		el: e.el,
		anchor: e.anchor,
		ctx: e.ctx,
		ce: e.ce,
		cacheIndex: e.cacheIndex
	};
	return c && r && Hn(u, c.clone(u)), u;
}
function J(e = " ", t = 0) {
	return q(Qr, null, e, t);
}
function Y(e = "", t = !1) {
	return t ? (W(), si($r, null, e)) : q($r, null, e);
}
function hi(e) {
	return e == null || typeof e == "boolean" ? q($r) : d(e) ? q(U, null, e.slice()) : ci(e) ? gi(e) : q(Qr, null, String(e));
}
function gi(e) {
	return e.el === null && e.patchFlag !== -1 || e.memo ? e : mi(e);
}
function _i(e, t) {
	let n = 0, { shapeFlag: r } = e;
	if (t == null) t = null;
	else if (d(t)) n = 16;
	else if (typeof t == "object") {
		if (r & 65) {
			let n = t.default;
			n && (n._c && (n._d = !1), _i(e, n()), n._c && (n._d = !0));
			return;
		}
		{
			n = 32;
			let r = t._;
			!r && !wr(t) ? t._ctx = En : r === 3 && En && (En.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
		}
	} else if (h(t)) {
		if (r & 65) {
			_i(e, { default: t });
			return;
		}
		t = {
			default: t,
			_ctx: En
		}, n = 32;
	} else t = String(t), r & 64 ? (n = 16, t = [J(t)]) : n = 8;
	e.children = t, e.shapeFlag |= n;
}
function vi(...e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		for (let e in r) if (e === "class") t.class !== r.class && (t.class = k([t.class, r.class]));
		else if (e === "style") t.style = ue([t.style, r.style]);
		else if (a(e)) {
			let n = t[e], i = r[e];
			i && n !== i && !(d(n) && n.includes(i)) ? t[e] = n ? [].concat(n, i) : i : i == null && n == null && !o(e) && (t[e] = i);
		} else e !== "" && (t[e] = r[e]);
	}
	return t;
}
function yi(e, t, n, r = null) {
	on(e, t, 7, [n, r]);
}
var bi = /* @__PURE__ */ or(), xi = 0;
function Si() {
	return xi;
}
function Ci(e, n, r) {
	let i = e.type, a = (n ? n.appContext : e.appContext) || bi, o = {
		uid: xi++,
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
		scope: new Te(!0),
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
		propsOptions: kr(i, a),
		emitsOptions: fr(i, a),
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
	return o.ctx = { _: o }, o.root = n ? n.root : o, o.emit = dr.bind(null, o), e.ce && e.ce(o), o;
}
var wi = null, Ti = () => wi || En, Ei, Di;
{
	let e = le(), t = (t, n) => {
		let r;
		return (r = e[t]) || (r = e[t] = []), r.push(n), (e) => {
			r.length > 1 ? r.forEach((t) => t(e)) : r[0](e);
		};
	};
	Ei = t("__VUE_INSTANCE_SETTERS__", (e) => wi = e), Di = t("__VUE_SSR_SETTERS__", (e) => ji = e);
}
var Oi = (e) => {
	let t = wi;
	return Ei(e), e.scope.on(), () => {
		e.scope.off(), Ei(t);
	};
}, ki = () => {
	wi && wi.scope.off(), Ei(null);
};
function Ai(e) {
	return e.vnode.shapeFlag & 4;
}
var ji = !1;
function Mi(e, t = !1, n = !1) {
	t && Di(t);
	let { props: r, children: i } = e.vnode, a = Ai(e);
	Tr(e, r, a, t), Lr(e, i, n || t);
	let o = a ? Ni(e, t) : void 0;
	return t && Di(!1), o;
}
function Ni(e, t) {
	let n = e.type;
	e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, ar);
	let { setup: r } = n;
	if (r) {
		Ue();
		let n = e.setupContext = r.length > 1 ? Ri(e) : null, i = Oi(e), a = an(r, e, 0, [e.props, n]), o = y(a);
		if (We(), i(), (o || e.sp) && !Yn(e) && Wn(e), o) {
			if (a.then(ki, ki), t) return a.then((n) => {
				Di(!0);
				try {
					Pi(e, n, t);
				} finally {
					Di(!1);
				}
			}).catch((t) => {
				sn(t, e, 0, void 0, !0), e.ssrRender = (e, t) => t("<!---->");
			});
			e.asyncDep = a;
		} else Pi(e, a, t);
	} else Fi(e, t);
}
function Pi(e, t, n) {
	h(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : v(t) && (e.setupState = Yt(t)), Fi(e, n);
}
function Fi(e, t, n) {
	let i = e.type;
	e.render ||= i.render || r;
}
var Ii = /* @__PURE__ */ Symbol(), Li = { get(e, t) {
	return P(e, "get", ""), t === Ii ? e : e[t];
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
	return e.exposed ? e.exposeProxy ||= new Proxy(Yt(Ut(e.exposed)), {
		get(t, n) {
			if (n in t) return t[n];
			if (n in rr) return rr[n](e);
		},
		has(e, t) {
			return t in e || t in rr;
		}
	}) : e.proxy;
}
function Bi(e) {
	return h(e) && "__vccOpts" in e;
}
var X = (e, t) => /* @__PURE__ */ Zt(e, t, ji), Vi = "3.5.45", Hi = void 0, Ui = typeof window < "u" && window.trustedTypes;
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
		aa.test(n) ? e.setProperty(D(r), n.replace(aa, ""), "important") : e[r] = n;
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
	let r = E(t);
	if (r !== "filter" && r in e) return ca[t] = r;
	r = re(r);
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
function fa(e, t, n, r, i, a = he(t)) {
	r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(da, t.slice(6, t.length)) : e.setAttributeNS(da, t, n) : n == null || a && !ge(n) ? e.removeAttribute(t) : e.setAttribute(t, a ? "" : _(n) ? String(n) : n);
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
		r === "boolean" ? n = ge(n) : n == null && r === "string" ? (n = "", o = !0) : r === "number" && (n = 0, o = !0);
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
	return [e[2] === ":" ? e.slice(3) : D(e.slice(2)), t];
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
				e && on(e, t, 5, a);
			}
		} else on(r, t, 5, [e]);
	};
	return n.value = e, n.attached = Ca(), n;
}
var Ta = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Ea = (e, t, n, r, i, s) => {
	let c = i === "svg";
	t === "class" ? Zi(e, r, c) : t === "style" ? ia(e, n, r) : a(t) ? o(t) || _a(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), 1) : t[0] === "^" ? (t = t.slice(1), 0) : Da(e, t, r, c)) ? (pa(e, t, r), e.tagName.includes("-") || t !== "value" && t !== "checked" && t !== "selected" || fa(e, t, r, c, s, t !== "value")) : e._isVueCE && (Oa(e, t) || e._def.__asyncLoader && (/[A-Z]/.test(t) || !g(r))) ? pa(e, E(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), fa(e, t, r, c));
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
	let r = E(t);
	return Array.isArray(n) ? n.some((e) => E(e) === r) : Object.keys(n).some((e) => E(e) === r);
}
var ka = (e) => {
	let t = e.props["onUpdate:modelValue"] || !1;
	return d(t) ? (e) => ae(t, e) : t;
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
	return t && (e = e.trim()), n && (e = se(e)), e;
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
		let s = (a || e.type === "number") && !/^0\d/.test(e.value) ? se(e.value) : e.value, c = t ?? "";
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
				let e = xe(t, n), a = e !== -1;
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
	if (d(t)) i = xe(t, r.props.value) > -1;
	else if (p(t)) i = t.has(r.props.value);
	else {
		if (t === n) return;
		i = A(t, Ha(e, !0));
	}
	e.checked !== i && (e.checked = i);
}
var Ra = {
	deep: !0,
	created(e, { value: t, modifiers: { number: n } }, r) {
		e._modelValue = t, ma(e, "change", () => {
			let t = Array.prototype.filter.call(e.options, (e) => e.selected).map((e) => n ? se(Va(e)) : Va(e)), r = e.multiple, i = r ? p(e._modelValue) ? new Set(t) : t : t[0], a = e._pendingValue = [r, r ? d(i) ? t.slice() : t : i];
			try {
				e[Ma](i);
			} finally {
				hn(() => {
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
	if (!n || d(e)) return A(e, t);
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
					o.selected = e === "string" || e === "number" ? t.some((e) => String(e) === String(s)) : xe(t, s) > -1;
				} else o.selected = t.has(s) || n && typeof s == "string" && t.has(se(s));
			} else if (A(Va(o), t)) {
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
}, Z = (e, t) => {
	if (!e) return e;
	let n = e._withMods ||= {}, r = t.join(".");
	return n[r] || (n[r] = ((n, ...r) => {
		for (let e = 0; e < t.length; e++) {
			let r = Wa[t[e]];
			if (r && r(n, t)) return;
		}
		return e(n, ...r);
	}));
}, Ga = {
	esc: "escape",
	space: " ",
	up: "arrow-up",
	left: "arrow-left",
	right: "arrow-right",
	down: "arrow-down",
	delete: "backspace"
}, Ka = (e, t) => {
	let n = e._withKeys ||= {}, r = t.join(".");
	return n[r] || (n[r] = ((n) => {
		if (!("key" in n)) return;
		let r = D(n.key);
		if (t.some((e) => e === r || Ga[e] === r)) return e(n);
	}));
}, qa = /* @__PURE__ */ s({ patchProp: Ea }, Yi), Ja;
function Ya() {
	return Ja ||= zr(qa);
}
var Xa = ((...e) => {
	let t = Ya().createApp(...e), { mount: n } = t;
	return t.mount = (e) => {
		let r = Qa(e);
		if (!r) return;
		let i = t._component;
		h(i) || i.render || i.template || (i.template = r.innerHTML), r.nodeType === 1 && (r.textContent = "");
		let a = n(r, !1, Za(r));
		return r instanceof Element && (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")), a;
	}, t;
});
function Za(e) {
	if (e instanceof SVGElement) return "svg";
	if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
}
function Qa(e) {
	return g(e) ? document.querySelector(e) : e;
}
// app/web/frontend/lib/layout.js
function $a(e) {
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
var Q = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[e]), eo = {
	book: "M4 4h6a3 3 0 0 1 2 2 3 3 0 0 1 2-2h6v15h-6a3 3 0 0 0-2 2 3 3 0 0 0-2-2H4z M12 6v15",
	library: "M4 4h4v16H4z M10 4h4v16h-4z M17 4l4 15-3 1-4-15z",
	search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
	download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
	upload: "M12 16V4 M7 9l5-5 5 5 M4 20h16",
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
	edit: "M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4",
	user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3"
}, to = (e) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${eo[e] || eo.book}"/></svg>`, no = (e, t) => ({
	method: e,
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(t)
}), ro = (e) => encodeURIComponent(String(e)), io = (e) => `/api/file?path=${encodeURIComponent(e)}`, ao = (e) => e.title || e.literature_id || "未命名文献", oo = (e) => Array.isArray(e.authors) ? e.authors.map((e) => typeof e == "string" ? e : e.name || "").join(", ") : e.authors || "作者待核实";
function so(e, t = "papers/09_情感综述调研/网站导入") {
	let n = /* @__PURE__ */ new Map([[t, "情感综述调研 / 网站导入（默认）"]]);
	for (let t of e) {
		let e = typeof t == "string" ? t : t.id || t.name;
		if (!e) continue;
		let r = String(e).replace(/\\/g, "/").replace(/^papers\//, "").split("/")[0], i = `papers/${r}/网站导入`;
		n.has(i) || n.set(i, `${String(typeof t == "string" ? t : t.name || r).replace(/^\d+_/, "")} / 网站导入`);
	}
	return [...n];
}
function co(e, t = "") {
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
function lo(e, t = "") {
	let n = [], r = (e) => `\u0001${n.push(e) - 1}\u0002`, i = String(e).replace(/[\u0001\u0002]/g, "");
	return i = i.replace(/`([^`]+)`/g, (e, t) => r(`<code>${Q(t)}</code>`)), i = i.replace(/(!?)\[([^\]\n]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, (e, n, i, a) => {
		let o = co(a, t);
		return r(o ? n ? `<img src="${Q(o)}" alt="${Q(i)}" loading="lazy" referrerpolicy="no-referrer">` : `<a href="${Q(o)}" target="_blank" rel="noopener noreferrer">${Q(i)}</a>` : Q(i));
	}), i = Q(i).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>").replace(/~~([^~\n]+)~~/g, "<del>$1</del>"), i.replace(/\u0001(\d+)\u0002/g, (e, t) => n[Number(t)] || "");
}
function uo(e, t = "") {
	let n = String(e || "").replace(/\r\n?/g, "\n").split("\n"), r = "", i = [], a = "", o = () => {
		i.length && (r += `<p>${i.map((e) => lo(e, t)).join("<br>")}</p>`, i = []), a &&= (r += `</${a}>`, "");
	};
	for (let e = 0; e < n.length; e++) {
		let s = n[e];
		if (/^\s*```/.test(s)) {
			o();
			let t = [];
			for (; ++e < n.length && !/^\s*```/.test(n[e]);) t.push(n[e]);
			r += `<pre><code>${Q(t.join("\n"))}</code></pre>`;
			continue;
		}
		let c = /^(#{1,6})\s+(.+)$/.exec(s);
		if (c) {
			o(), r += `<h${c[1].length}>${lo(c[2], t)}</h${c[1].length}>`;
			continue;
		}
		if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(s)) {
			o(), r += "<hr>";
			continue;
		}
		if (/^>\s?/.test(s)) {
			o(), r += `<blockquote>${lo(s.replace(/^>\s?/, ""), t)}</blockquote>`;
			continue;
		}
		if (s.includes("|") && e + 1 < n.length && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(n[e + 1])) {
			o();
			let i = (e) => e.trim().replace(/^\||\|$/g, "").split("|");
			for (r += `<table><thead><tr>${i(s).map((e) => `<th>${lo(e.trim(), t)}</th>`).join("")}</tr></thead><tbody>`, e++; e + 1 < n.length && n[e + 1].includes("|") && n[e + 1].trim();) e++, r += `<tr>${i(n[e]).map((e) => `<td>${lo(e.trim(), t)}</td>`).join("")}</tr>`;
			r += "</tbody></table>";
			continue;
		}
		let l = /^\s*(?:([-+*])|\d+\.)\s+(.+)$/.exec(s);
		if (l) {
			let e = l[1] ? "ul" : "ol";
			(i.length || a && a !== e) && o(), a ||= (r += `<${e}>`, e), r += `<li>${lo(l[2], t)}</li>`;
		} else s.trim() ? (a && o(), i.push(s)) : o();
	}
	return o(), r;
}
var fo = {
	unread: "未读",
	reading: "在读",
	read: "已读"
};
function po(e) {
	return {
		未读: "unread",
		待标记: "unread",
		在读: "reading",
		阅读中: "reading",
		已读: "read",
		已读完: "read",
		completed: "read"
	}[e] || (e in fo ? e : "unread");
}
// app/web/frontend/components/Icon.vue
var mo = {
	viewBox: "0 0 24 24",
	"aria-hidden": "true"
}, ho = ["d"], $ = {
	__name: "Icon",
	props: { name: {
		type: String,
		default: "book"
	} },
	setup(e) {
		return (t, n) => (W(), G("svg", mo, [K("path", { d: R(eo)[e.name] || R(eo).book }, null, 8, ho)]));
	}
}, go = [
	"data-resize-panel",
	"aria-label",
	"aria-controls",
	"title"
], _o = {
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
		return (t, n) => (W(), G("div", {
			class: k(["panel-resizer", { "panel-resizer-left": e.kind === "assistant" }]),
			"data-resize-panel": e.kind,
			role: "separator",
			"aria-orientation": "vertical",
			"aria-label": `调整${r.value[1]}宽度`,
			"aria-controls": r.value[0],
			tabindex: "0",
			title: `拖动调整${r.value[1]}宽度；双击恢复默认；方向键微调`
		}, null, 10, go));
	}
}, vo = {
	id: "navigation-panel",
	class: "sidebar",
	"aria-label": "主导航"
}, yo = {
	class: "brand",
	href: "/",
	"aria-label": "Zhiyue 首页"
}, bo = { class: "brand-mark" }, xo = { class: "main-nav" }, So = {
	id: "nav-total",
	class: "count"
}, Co = { class: "section-head" }, wo = ["disabled"], To = {
	id: "categories",
	class: "categories"
}, Eo = ["onSubmit"], Do = {
	key: 1,
	class: "category-row"
}, Oo = ["onClick"], ko = ["title"], Ao = { class: "cat-count" }, jo = ["disabled", "onClick"], Mo = {
	__name: "Sidebar",
	setup(e) {
		let t = Mn("workspace"), n = t.state, r = X(() => {
			let e = [{
				category: "",
				child: "",
				label: "全部文献",
				name: "",
				count: n.papers.length
			}];
			for (let t of n.categories || []) if (t.id && (e.push({
				category: t.id,
				child: "",
				label: t.name,
				name: t.name,
				count: t.count
			}), n.category === t.id)) for (let n of t.children || []) e.push({
				category: t.id,
				child: n.name,
				label: n.name,
				name: n.name,
				count: n.count
			});
			return e;
		}), i = (e) => e.replace(/^\d+_/, "").replaceAll("_", " "), a = /* @__PURE__ */ L(!1), o = /* @__PURE__ */ L(null), s = /* @__PURE__ */ L(""), c = /* @__PURE__ */ L(!1), l = /* @__PURE__ */ L(null), u = (e) => {
			e && (l.value = e);
		};
		function d(e) {
			n.category = e.category, n.subcategory = e.child, t.setView("library"), t.setPanel("list");
		}
		async function f() {
			await hn(), l.value?.focus(), l.value?.select();
		}
		async function p() {
			c.value || (o.value = null, s.value = "", a.value = !0, await f());
		}
		function m(e) {
			c.value || (a.value = !1, o.value = {
				category: e.category,
				child: e.child
			}, s.value = e.name.replace(/^\d+_/, ""), f());
		}
		function h() {
			c.value || (a.value = !1, o.value = null, s.value = "");
		}
		function g(e) {
			return !!o.value && o.value.category === e.category && o.value.child === e.child;
		}
		async function _() {
			let e = s.value.trim();
			if (!e || c.value) return;
			c.value = !0;
			let r = await t.createCategory(e);
			c.value = !1, r && (a.value = !1, s.value = "", n.category = r.category, n.subcategory = "", t.setView("library"), t.setPanel("list"), t.toast(`已新建文件夹「${i(r.category)}」`));
		}
		async function v(e) {
			let r = s.value.trim();
			if (!r || c.value) return;
			c.value = !0;
			let a = await t.renameCategory(e.category, e.child, r);
			c.value = !1, a && (o.value = null, s.value = "", e.child ? n.category === e.category && n.subcategory === e.child && (n.subcategory = a.subcategory) : n.category === e.category && (n.category = a.category), t.toast(`文件夹已重命名为「${i(a.subcategory || a.category)}」`));
		}
		return (e, o) => (W(), G("aside", vo, [
			K("a", yo, [K("span", bo, [q($)]), o[4] ||= K("span", null, "Zhiyue", -1)]),
			K("nav", xo, [K("button", {
				class: k(["nav-item", { active: R(n).view === "library" }]),
				"data-view": "library",
				onClick: o[0] ||= (e) => R(t).setView("library")
			}, [
				q($, { name: "library" }),
				o[5] ||= J("文献 ", -1),
				K("span", So, j(R(n).papers.length), 1)
			], 2), K("button", {
				class: k(["nav-item", { active: R(n).view === "downloads" }]),
				"data-view": "downloads",
				onClick: o[1] ||= (e) => R(t).setView("downloads")
			}, [q($, { name: "download" }), o[6] ||= J("下载任务 ", -1)], 2)]),
			K("div", Co, [o[7] ||= K("span", { class: "section-label" }, "分类", -1), K("button", {
				class: "category-add",
				type: "button",
				title: "新建文件夹",
				"aria-label": "新建文件夹",
				disabled: c.value,
				onClick: p
			}, [q($, { name: "plus" })], 8, wo)]),
			K("div", To, [a.value ? (W(), G("form", {
				key: 0,
				class: "category-editor",
				onSubmit: Z(_, ["prevent"])
			}, [B(K("input", {
				ref: u,
				"onUpdate:modelValue": o[2] ||= (e) => s.value = e,
				maxlength: "60",
				placeholder: "文件夹名称",
				"aria-label": "文件夹名称",
				onKeydown: Ka(h, ["esc"]),
				onBlur: h
			}, null, 544), [[Fa, s.value]])], 32)) : Y("", !0), (W(!0), G(U, null, V(r.value, (e) => (W(), G(U, { key: `${e.category}/${e.child}` }, [g(e) ? (W(), G("form", {
				key: 0,
				class: k(["category-editor", { "category-child": e.child }]),
				onSubmit: Z((t) => v(e), ["prevent"])
			}, [B(K("input", {
				ref_for: !0,
				ref: u,
				"onUpdate:modelValue": o[3] ||= (e) => s.value = e,
				maxlength: "60",
				placeholder: "文件夹名称",
				"aria-label": "文件夹名称",
				onKeydown: Ka(h, ["esc"]),
				onBlur: h
			}, null, 544), [[Fa, s.value]])], 42, Eo)) : (W(), G("div", Do, [K("button", {
				class: k(["category-button", {
					"category-child": e.child,
					active: R(n).category === e.category && R(n).subcategory === e.child
				}]),
				onClick: (t) => d(e)
			}, [
				e.child ? Y("", !0) : (W(), si($, {
					key: 0,
					name: "folder"
				})),
				K("span", {
					class: "cat-name",
					title: i(e.label)
				}, j(i(e.label)), 9, ko),
				K("span", Ao, j(e.count), 1)
			], 10, Oo), e.category ? (W(), G("button", {
				key: 0,
				class: "category-action",
				type: "button",
				title: "重命名文件夹",
				"aria-label": "重命名文件夹",
				disabled: c.value,
				onClick: (t) => m(e)
			}, [q($, { name: "edit" })], 8, jo)) : Y("", !0)]))], 64))), 128))]),
			o[8] ||= K("div", { class: "sidebar-bottom" }, [K("span", { class: "workspace-dot" }), K("span", null, "本地工作区")], -1),
			q(_o, { kind: "sidebar" })
		]));
	}
}, No = {
	id: "paper-panel",
	class: "paper-panel",
	"aria-label": "文献筛选与列表"
}, Po = { class: "list-controls" }, Fo = { class: "search-box" }, Io = { class: "filter-row" }, Lo = ["value"], Ro = ["aria-pressed"], zo = { class: "list-meta" }, Bo = { class: "list-meta-info" }, Vo = { id: "result-count" }, Ho = { class: "list-meta-actions" }, Uo = ["disabled"], Wo = {
	id: "paper-list",
	class: "paper-list",
	tabindex: "0",
	"aria-label": "论文列表"
}, Go = {
	key: 0,
	class: "empty"
}, Ko = { class: "error-text" }, qo = [
	"data-paper",
	"aria-label",
	"aria-current",
	"onClick",
	"onKeydown"
], Jo = { class: "paper-top" }, Yo = { class: "paper-id" }, Xo = [
	"aria-pressed",
	"title",
	"aria-label",
	"disabled",
	"onClick"
], Zo = ["title"], Qo = { class: "paper-bottom" }, $o = ["title"], es = {
	key: 2,
	class: "empty"
}, ts = {
	key: 0,
	class: "empty-art"
}, ns = {
	key: 1,
	class: "empty-actions"
}, rs = {
	__name: "PaperList",
	setup(e) {
		let t = Mn("workspace"), n = t.state, r = X(() => [...new Set(n.papers.map((e) => e.year).filter(Boolean).map(String))].sort((e, t) => (Number(t) || 0) - (Number(e) || 0))), i = X(() => !!(n.query.trim() || n.year || n.read || n.starred)), a = X(() => i.value ? "没有匹配的文献" : n.category ? "这个文件夹还没有文献" : "文献库还没有文献"), o = X(() => {
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
				return (!e || r.includes(e)) && (!n.year || String(t.year) === n.year) && (!n.read || po(t.readStatus) === n.read) && (!n.starred || t.starred) && (!n.category || (t.category || "未分类") === n.category) && (!n.subcategory || t.subcategory === n.subcategory);
			});
			return t.sort((e, t) => n.sort.startsWith("year") ? (Number(e.year) || 0) - (Number(t.year) || 0) : n.sort === "title" ? ao(e).localeCompare(ao(t)) : e.literature_id.localeCompare(t.literature_id, void 0, { numeric: !0 })), n.sort === "year-desc" ? t.reverse() : t;
		});
		return (e, s) => (W(), G("section", No, [
			K("div", Po, [
				K("label", Fo, [
					q($, { name: "search" }),
					B(K("input", {
						id: "search",
						"onUpdate:modelValue": s[0] ||= (e) => R(n).query = e,
						type: "search",
						placeholder: "搜索题名、作者、编号…",
						"aria-label": "搜索文献"
					}, null, 512), [[Fa, R(n).query]]),
					s[9] ||= K("kbd", null, "/", -1)
				]),
				K("div", Io, [
					B(K("select", {
						id: "year-filter",
						"onUpdate:modelValue": s[1] ||= (e) => R(n).year = e,
						"aria-label": "按年份筛选"
					}, [s[10] ||= K("option", { value: "" }, "全部年份", -1), (W(!0), G(U, null, V(r.value, (e) => (W(), G("option", { key: e }, j(e), 1))), 128))], 512), [[Ra, R(n).year]]),
					B(K("select", {
						id: "read-filter",
						"onUpdate:modelValue": s[2] ||= (e) => R(n).read = e,
						"aria-label": "按阅读状态筛选"
					}, [s[11] ||= K("option", { value: "" }, "全部进度", -1), (W(!0), G(U, null, V(R(fo), (e, t) => (W(), G("option", {
						key: t,
						value: t
					}, j(e), 9, Lo))), 128))], 512), [[Ra, R(n).read]]),
					K("button", {
						id: "star-filter",
						class: k(["icon-button", { selected: R(n).starred }]),
						title: "仅看收藏",
						"aria-label": "仅看收藏",
						"aria-pressed": R(n).starred,
						onClick: s[3] ||= (e) => R(n).starred = !R(n).starred
					}, [q($, { name: "star" })], 10, Ro)
				]),
				K("div", zo, [K("div", Bo, [K("span", Vo, j(R(n).libraryError ? "加载失败" : `${o.value.length} 篇文献`), 1), B(K("select", {
					id: "sort",
					"onUpdate:modelValue": s[4] ||= (e) => R(n).sort = e,
					"aria-label": "排序"
				}, [...s[12] ||= [
					K("option", { value: "id" }, "编号顺序", -1),
					K("option", { value: "year-desc" }, "年份从新到旧", -1),
					K("option", { value: "year-asc" }, "年份从旧到新", -1),
					K("option", { value: "title" }, "题名顺序", -1)
				]], 512), [[Ra, R(n).sort]])]), K("div", Ho, [K("button", {
					id: "import-paper",
					class: "list-action",
					title: "从本机导入 PDF 并归档",
					onClick: s[5] ||= (e) => R(n).importOpen = !0
				}, [q($, { name: "upload" }), s[13] ||= K("span", null, "导入 PDF", -1)]), K("button", {
					id: "refresh-catalog",
					class: k(["icon-button compact", { refreshing: R(n).refreshing }]),
					title: "重新扫描目录并更新索引",
					"aria-label": "刷新索引",
					disabled: R(n).refreshing,
					onClick: s[6] ||= (...e) => R(t).refreshCatalog && R(t).refreshCatalog(...e)
				}, [q($, { name: "refresh" })], 10, Uo)])])
			]),
			K("div", Wo, [R(n).libraryError ? (W(), G("div", Go, [K("p", Ko, j(R(n).libraryError), 1), K("button", {
				class: "button subtle",
				onClick: s[7] ||= (...e) => R(t).loadLibrary && R(t).loadLibrary(...e)
			}, "重新连接")])) : (W(!0), G(U, { key: 1 }, V(o.value, (e) => (W(), G("article", {
				key: e.literature_id,
				class: k(["paper-card", { active: R(n).current === e.literature_id }]),
				"data-paper": e.literature_id,
				tabindex: "0",
				"aria-label": R(ao)(e),
				"aria-current": R(n).current === e.literature_id,
				onClick: (n) => R(t).selectPaper(e.literature_id),
				onKeydown: [Ka(Z((n) => R(t).selectPaper(e.literature_id), ["self", "prevent"]), ["enter"]), Ka(Z((n) => R(t).selectPaper(e.literature_id), ["self", "prevent"]), ["space"])]
			}, [
				K("div", Jo, [
					K("span", Yo, j(e.literature_id), 1),
					K("span", null, "· " + j(e.year || "年份待核实"), 1),
					K("button", {
						class: k(["icon-button", { selected: e.starred }]),
						"aria-pressed": !!e.starred,
						title: e.starred ? "取消收藏" : "收藏论文",
						"aria-label": e.starred ? "取消收藏" : "收藏论文",
						disabled: R(n).pendingPatches.has(e.literature_id),
						onClick: Z((n) => R(t).patchPaper(e.literature_id, { starred: !e.starred }), ["stop"])
					}, [q($, { name: "star" })], 10, Xo)
				]),
				K("h3", null, j(R(ao)(e)), 1),
				K("div", {
					class: "paper-authors",
					title: R(oo)(e)
				}, j(R(oo)(e)), 9, Zo),
				K("div", Qo, [K("span", {
					class: "tag",
					title: e.subcategory || e.venue || ""
				}, j((e.subcategory || e.venue || e.category || "未分类").replace(/^\d+_/, "")), 9, $o), K("span", { class: k(R(po)(e.readStatus)) }, [s[14] ||= K("i", { class: "read-dot" }, null, -1), J(j(R(fo)[R(po)(e.readStatus)]), 1)], 2)])
			], 42, qo))), 128)), !R(n).libraryError && !o.value.length ? (W(), G("div", es, [
				!i.value && !R(n).category ? (W(), G("span", ts, [q($, { name: "library" })])) : Y("", !0),
				K("p", null, j(a.value), 1),
				i.value || R(n).category ? (W(), G("div", ns, [K("button", {
					id: "reset-filters",
					class: "button subtle",
					onClick: s[8] ||= (...e) => R(t).resetFilters && R(t).resetFilters(...e)
				}, j(i.value ? "清除筛选" : "查看全部文献"), 1)])) : Y("", !0)
			])) : Y("", !0)]),
			q(_o, { kind: "papers" })
		]));
	}
};
// app/web/frontend/lib/reader.js
function is({ state: e, api: t, toast: n, patchPaper: r, setPanel: i, setDraft: a, scope: o }) {
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
		t.innerHTML = `<button class="icon-button" data-pdf-step="-1" aria-label="上一页" title="上一页" ${e.pdfPage <= 1 || e.previewLoading ? "disabled" : ""}>‹</button><label class="pdf-page-label">PDF 物理页 <input id="pdf-page" type="number" min="1" ${e.pdfTotal ? `max="${e.pdfTotal}"` : ""} value="${e.pdfPage}" aria-label="PDF物理页序"></label><span class="pdf-total">/ ${e.pdfTotal || "…"}</span><button class="icon-button" data-pdf-step="1" aria-label="下一页" title="下一页" ${!e.pdfTotal || e.pdfPage >= e.pdfTotal || e.previewLoading ? "disabled" : ""}>›</button><span class="pdf-control-divider"></span><button class="icon-button" data-pdf-zoom="-50" aria-label="缩小" title="缩小" ${e.pdfZoom <= 100 ? "disabled" : ""}>−</button><button class="text-button pdf-zoom" id="pdf-fit" title="适合宽度">${e.pdfZoom === 100 ? "适宽 100%" : e.pdfZoom + "%"}</button><button class="icon-button" data-pdf-zoom="50" aria-label="放大" title="放大" ${e.pdfZoom >= 200 ? "disabled" : ""}>＋</button><button class="button subtle pdf-copy-page" id="copy-pdf-page" ${n?.hasText ? "" : "disabled"}>复制本页文字</button><span class="pdf-text-status" title="${Q(n?.error || (n?.hasText ? "" : "扫描页或无文字内容的页面需要 OCR 才能复制。"))}">${Q(r)}</span>`;
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
		}, f(), w(i), S(i, r, !0)) : r !== e.pdfPage && (e.pdfPage = r, ee());
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
			let i = t(`/api/papers/${ro(e.paper.literature_id)}/text-layer?page=${n}`, { signal: r.signal }).catch((e) => ({
				hasText: !1,
				text: "",
				error: e.message
			})), o = await fetch(`/api/papers/${ro(e.paper.literature_id)}/preview?page=${n}`, { signal: r.signal });
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
				g(t) && n.name !== "AbortError" && (t.errors.add(e), t.pages.get(e).innerHTML = `<div class="pdf-page-placeholder"><span>第 ${e} 页加载失败</span><small>${Q(n.message)}</small><button class="button subtle" data-pdf-retry="${e}">重试第 ${e} 页</button></div>`);
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
	async function T(t, n) {
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
		e.pdfSession = Ut(i), e.previewLoading = !0;
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
			r.innerHTML = `<div class="empty"><h2>页面预览暂不可用</h2><p class="error-text">${Q(e.name === "AbortError" ? "预览请求超时，请重试。" : e.message)}</p><button id="retry-preview" class="button subtle">重新加载第 ${a} 页</button><p>也可使用工具栏的“单独打开”查看原 PDF。</p></div>`;
		} finally {
			g(i) && (e.previewLoading = !1, f());
		}
	}
	function ee() {
		let n = l();
		if (!n) {
			d(), s("#reader-header").innerHTML = "<span class=\"muted\">阅读</span>", s("#reader-toolbar").hidden = !0, s("#reader-content").innerHTML = `<div class="empty reader-empty"><span class="empty-art">${to("book")}</span><h2>选择论文</h2><p>从左侧选择，查看原文或笔记。</p></div>`;
			return;
		}
		let r = ++e.noteEpoch;
		d(), s("#reader-header").innerHTML = `<div class="reader-heading"><h2>${Q(ao(n))}</h2><div class="reader-meta">${Q(n.literature_id)} · ${Q(n.year || "年份待核实")} · ${Q(n.pages ? n.pages + " 页" : "页数待核实")}<br>${Q(oo(n))}</div></div><select id="paper-read-status" aria-label="标记阅读进度">${Object.entries(fo).map(([e, t]) => `<option value="${e}" ${po(n.readStatus) === e ? "selected" : ""}>${t}</option>`).join("")}</select>`;
		let i = Array.isArray(n.notes) ? n.notes : [];
		s("#reader-toolbar").hidden = !1, s("#reader-toolbar").innerHTML = `<div class="segmented"><button data-reader-mode="pdf" class="${e.readerMode === "pdf" ? "active" : ""}">原文 PDF</button><button data-reader-mode="note" class="${e.readerMode === "note" ? "active" : ""}">阅读笔记 <small>${i.length}</small></button></div>${e.readerMode === "pdf" && n.file ? `<select id="pdf-renderer" aria-label="PDF显示方式"><option value="preview" ${e.pdfBrowser ? "" : "selected"}>连续阅读</option><option value="browser" ${e.pdfBrowser ? "selected" : ""}>浏览器阅读器</option></select>` : ""}${e.readerMode === "note" && i.length ? `<select id="note-select" aria-label="选择笔记">${i.map((t) => `<option value="${Q(t.path)}" ${t.path === e.notePath ? "selected" : ""}>${Q(t.title || t.path.split(/[\\/]/).pop())}</option>`).join("")}</select>` : ""}${n.file ? `<a class="open-original" href="${Q(io(n.file))}" target="_blank" rel="noopener noreferrer">单独打开${to("external")}</a>` : ""}${e.readerMode === "pdf" && n.file && !e.pdfBrowser ? "<div id=\"pdf-controls\" class=\"pdf-controls\" role=\"group\" aria-label=\"PDF翻页与缩放\"></div>" : ""}`, e.readerMode === "pdf" ? n.file ? e.pdfBrowser ? s("#reader-content").innerHTML = `<iframe class="pdf-frame" title="${Q(ao(n))} PDF原文" src="${Q(io(n.file))}"></iframe>` : T(n, r) : s("#reader-content").innerHTML = "<div class=\"empty\"><p>该条目尚无可用原文文件。</p></div>" : i.length ? (e.notePath = i.some((t) => t.path === e.notePath) ? e.notePath : i[0].path, s("#reader-content").innerHTML = "<div class=\"loading\"><span class=\"busy-spinner\"></span>正在读取笔记…</div>", t(`/api/text?path=${encodeURIComponent(e.notePath)}`).then((t) => {
			r === e.noteEpoch && (s("#reader-content").innerHTML = `<article class="note-document markdown">${uo(t.text, e.notePath)}</article>`);
		}).catch((t) => {
			r === e.noteEpoch && (s("#reader-content").innerHTML = `<div class="empty"><p class="error-text">${Q(t.message)}</p><button id="retry-note" class="button subtle">重试</button></div>`);
		})) : s("#reader-content").innerHTML = "<div class=\"empty\"><h2>阅读笔记尚待积累</h2><p>可以向研究助手提问，整理阅读笔记。</p><button id=\"ask-note\" class=\"button subtle\">请助手帮我精读</button></div>";
	}
	return o.addEventListener("click", (t) => {
		let n = t.target.closest("button");
		if (n) {
			if (n.dataset.readerMode && (e.readerMode = n.dataset.readerMode), n.dataset.pdfStep && m(e.pdfPage + Number(n.dataset.pdfStep)), n.dataset.pdfZoom && h(Number(n.dataset.pdfZoom)), n.id === "pdf-fit" && h(100 - e.pdfZoom), n.id === "copy-pdf-page" && p(), ["retry-preview", "retry-note"].includes(n.id) && ee(), n.dataset.pdfRetry && e.pdfSession) {
				let t = Number(n.dataset.pdfRetry);
				e.pdfSession.errors.delete(t), S(e.pdfSession, t, !0);
			}
			n.id === "ask-note" && (a("请精读当前论文，解释核心方法、证据和局限，给出原文定位，并整理阅读笔记。"), i("chat"));
		}
	}, { signal: u.signal }), o.addEventListener("change", async (t) => {
		if (t.target.id === "paper-read-status") {
			let n = t.target, i = e.current;
			n.disabled = !0, !await r(i, { readStatus: n.value }) && e.current === i && (n.value = po(l()?.readStatus)), n.disabled = !1;
		}
		t.target.id === "note-select" && (e.notePath = t.target.value), t.target.id === "pdf-renderer" && (e.pdfBrowser = t.target.value === "browser"), t.target.id === "pdf-page" && m(t.target.value);
	}, { signal: u.signal }), o.addEventListener("keydown", (e) => {
		e.target.id === "pdf-page" && e.key === "Enter" && (e.preventDefault(), m(e.target.value));
	}, { signal: u.signal }), window.addEventListener("pagehide", () => {
		++e.noteEpoch, d();
	}, { signal: u.signal }), window.addEventListener("pageshow", (t) => {
		t.persisted && l() && e.readerMode === "pdf" && ee();
	}, { signal: u.signal }), {
		render: ee,
		dispose: () => {
			++e.noteEpoch, d(), u.abort();
		}
	};
}
// app/web/frontend/components/ReaderPane.vue
var as = {
	__name: "ReaderPane",
	setup(e) {
		let t = Mn("workspace"), n = t.state, r = /* @__PURE__ */ L(null), i;
		return $n(() => {
			i = is({
				state: n,
				scope: r.value,
				api: t.api,
				toast: t.toast,
				patchPaper: t.patchPaper,
				setPanel: t.setPanel,
				setDraft: t.setDraft
			}), i.render();
		}), Fn([
			() => t.currentPaper.value?.file,
			() => n.current,
			() => n.readerMode,
			() => n.notePath,
			() => n.pdfBrowser
		], () => i?.render(), { flush: "post" }), er(() => i?.dispose()), (e, t) => (W(), G("section", {
			ref_key: "scope",
			ref: r,
			class: "reader-panel",
			"aria-label": "阅读区"
		}, [...t[0] ||= [
			K("div", {
				id: "reader-header",
				class: "reader-header"
			}, null, -1),
			K("div", {
				id: "reader-toolbar",
				class: "reader-toolbar",
				hidden: ""
			}, null, -1),
			K("div", {
				id: "reader-content",
				class: "reader-content",
				tabindex: "0",
				"aria-label": "论文阅读内容"
			}, null, -1)
		]], 512));
	}
}, os = [
	"disabled",
	"aria-label",
	"aria-expanded",
	"title"
], ss = { id: "model-name" }, cs = { class: "model-search" }, ls = [
	"data-model-value",
	"aria-selected",
	"title",
	"onClick"
], us = {
	key: 0,
	class: "model-empty"
}, ds = {
	__name: "ModelPicker",
	setup(e) {
		let t = Mn("workspace"), n = t.state, r = /* @__PURE__ */ L(!1), i = /* @__PURE__ */ L(""), a = /* @__PURE__ */ L(null), o = /* @__PURE__ */ L(null), s = /* @__PURE__ */ L(null), c = X(() => [{
			id: "",
			label: "默认模型"
		}, ...t.models.value]), l = X(() => c.value.filter((e) => `${e.label} ${e.id}`.toLocaleLowerCase().includes(i.value.trim().toLocaleLowerCase()))), u = X(() => c.value.find((e) => e.id === n.model) || c.value[0]), d = X(() => t.busy.value || n.creating || t.agent.value.available !== !0 || !t.models.value.length);
		Fn(c, () => {
			c.value.some((e) => e.id === n.model) || (n.model = "");
		}), Fn(d, (e) => {
			e && (r.value = !1);
		});
		function f(e = !1) {
			r.value = !1, e && a.value?.focus();
		}
		async function p() {
			if (r.value) return f();
			i.value = "", r.value = !0, await hn(), o.value?.focus();
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
		return $n(() => {
			document.addEventListener("pointerdown", g), document.addEventListener("focusin", g);
		}), er(() => {
			document.removeEventListener("pointerdown", g), document.removeEventListener("focusin", g);
		}), (e, t) => (W(), G(U, null, [K("button", {
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
		}, [K("span", ss, j(u.value.label.replace(/ · 默认$/, "").split(" · ")[0]), 1), q($, { name: "chevron" })], 8, os), r.value ? (W(), G("div", {
			key: 0,
			id: "model-menu",
			class: "model-menu",
			onKeydown: h
		}, [K("div", cs, [q($, { name: "search" }), B(K("input", {
			id: "model-search",
			ref_key: "search",
			ref: o,
			"onUpdate:modelValue": t[0] ||= (e) => i.value = e,
			type: "search",
			placeholder: "搜索模型",
			"aria-label": "搜索模型",
			"aria-controls": "model-list",
			autocomplete: "off"
		}, null, 512), [[Fa, i.value]])]), K("div", {
			id: "model-list",
			ref_key: "list",
			ref: s,
			class: "model-list",
			role: "listbox",
			"aria-label": "模型"
		}, [(W(!0), G(U, null, V(l.value, (e) => (W(), G("button", {
			key: e.id,
			type: "button",
			role: "option",
			tabindex: "-1",
			class: "model-option",
			"data-model-value": e.id,
			"aria-selected": e.id === R(n).model,
			title: e.id || e.label,
			onClick: (t) => m(e.id)
		}, [K("span", null, j(e.label.replace(/ · 默认$/, "")), 1), e.id === R(n).model ? (W(), si($, {
			key: 0,
			name: "check"
		})) : Y("", !0)], 8, ls))), 128)), l.value.length ? Y("", !0) : (W(), G("div", us, "未找到模型"))], 512)], 32)) : Y("", !0)], 64));
	}
}, fs = {
	id: "attachments",
	class: "attachments"
}, ps = ["src", "alt"], ms = ["title"], hs = ["onClick"], gs = ["aria-label", "onClick"], _s = { class: "composer-toolbar" }, vs = { class: "composer-tools" }, ys = {
	class: "icon-button upload-button",
	title: "添加附件"
}, bs = ["disabled"], xs = ["disabled"], Ss = {
	__name: "Composer",
	setup(e) {
		let t = Mn("workspace"), n = t.state, { canSend: r, generating: i } = t, a = /* @__PURE__ */ L(null), o = /* @__PURE__ */ L(null), s = /* @__PURE__ */ L(!1);
		function c() {
			a.value && (a.value.style.height = "0px", a.value.style.height = `${Math.min(200, Math.max(58, a.value.scrollHeight))}px`, a.value.style.overflowY = a.value.scrollHeight > 200 ? "auto" : "hidden");
		}
		Fn(() => n.draft, c, { flush: "post" }), Fn(() => n.focusComposer, async () => {
			await hn(), a.value?.focus();
		}), $n(c);
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
		return (e, c) => (W(), G("form", {
			id: "chat-form",
			ref_key: "form",
			ref: o,
			class: "composer",
			onSubmit: c[1] ||= Z((...e) => R(t).sendMessage && R(t).sendMessage(...e), ["prevent"]),
			onDragover: c[2] ||= Z(() => {}, ["prevent"]),
			onDrop: c[3] ||= Z((e) => R(t).uploadFiles([...e.dataTransfer?.files || []]), ["prevent"])
		}, [
			K("div", fs, [(W(!0), G(U, null, V(R(n).attachments, (e) => (W(), G("div", {
				key: e.key,
				class: k(["attachment", { error: e.status === "error" }])
			}, [
				e.id && e.mime?.startsWith("image/") ? (W(), G("img", {
					key: 0,
					src: `/api/uploads/${R(ro)(e.id)}`,
					alt: e.name
				}, null, 8, ps)) : (W(), si($, {
					key: 1,
					name: "attach"
				})),
				K("span", {
					class: "attachment-name",
					title: e.error || e.name
				}, j(e.name) + " " + j(e.status === "uploading" ? " · 上传中" : e.status === "error" ? " · 失败" : ""), 9, ms),
				e.status === "error" ? (W(), G("button", {
					key: 2,
					type: "button",
					onClick: (n) => R(t).uploadOne(e)
				}, "重试", 8, hs)) : Y("", !0),
				K("button", {
					type: "button",
					"aria-label": `移除附件 ${e.name}`,
					onClick: (t) => f(e.key)
				}, "×", 8, gs)
			], 2))), 128))]),
			c[4] ||= K("label", {
				class: "sr-only",
				for: "chat-input"
			}, "向研究助手提问", -1),
			B(K("textarea", {
				id: "chat-input",
				ref_key: "input",
				ref: a,
				"onUpdate:modelValue": c[0] ||= (e) => R(n).draft = e,
				rows: "2",
				placeholder: "输入问题…",
				onKeydown: l,
				onPaste: u
			}, null, 544), [[Fa, R(n).draft]]),
			K("div", _s, [K("div", vs, [K("label", ys, [q($, { name: "plus" }), K("input", {
				id: "file-input",
				type: "file",
				multiple: "",
				"aria-label": "添加图片或文件",
				onChange: d
			}, null, 32)]), q(ds)]), R(i) ? (W(), G("button", {
				key: 0,
				id: "interrupt",
				type: "button",
				class: "send-button stop-button",
				title: "停止生成",
				"aria-label": "停止生成",
				disabled: s.value,
				onClick: p
			}, [q($, { name: "stop" })], 8, bs)) : (W(), G("button", {
				key: 1,
				id: "send",
				type: "submit",
				class: "send-button",
				title: "发送",
				"aria-label": "发送消息",
				disabled: !R(r)
			}, [q($, { name: "arrow" })], 8, xs))])
		], 544));
	}
};
// app/web/frontend/lib/api.js
async function Cs(e, t = {}) {
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
var ws = [
	"streaming",
	"pending",
	"running",
	"in_progress",
	"inProgress",
	"queued"
], Ts = {
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
}, Es = (e) => [
	"queued",
	"pending",
	"running",
	"in_progress"
].includes(e.status);
function Ds({ api: e = Cs, EventSourceImpl: t = globalThis.EventSource, pollInterval: n = 8e3 } = {}) {
	let r = /* @__PURE__ */ Ft({
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
		noteSaving: "",
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
		refreshing: !1,
		importOpen: !1
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
	}).filter((e) => e.id)), l = X(() => r.chat?.messages?.some((e) => ws.includes(e.status)) || !1), u = X(() => r.sending || l.value), d = X(() => !r.statusError && !u.value && !r.creating && !!(r.draft.trim() || r.attachments.length) && r.attachments.every((e) => e.status === "ready") && s.value.available === !0 && s.value.authenticated === !0 && r.eventsOpen), f, p = !1, m, h = 0, g = 0, _ = !1, v = /* @__PURE__ */ new Set();
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
		r.view = e, e === "downloads" && he();
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
	async function T() {
		try {
			let t = await e("/api/library");
			r.papers = Array.isArray(t.papers) ? t.papers : [], r.categories = t.categories || [], r.stats = t.stats || {}, r.libraryError = "";
		} catch (e) {
			r.libraryError = e.message;
		}
	}
	async function ee(t) {
		try {
			let n = await e("/api/categories", no("POST", { name: t }));
			return await T(), n;
		} catch (e) {
			return y(e.message, !0), null;
		}
	}
	async function te(t, n, r) {
		try {
			let i = await e("/api/categories/rename", no("POST", {
				category: t,
				subcategory: n,
				name: r
			}));
			return await T(), i;
		} catch (e) {
			return y(e.message, !0), null;
		}
	}
	async function E(t, n) {
		if (r.pendingPatches.has(t)) return !1;
		r.pendingPatches.add(t);
		try {
			await e(`/api/papers/${ro(t)}`, no("PATCH", n));
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
	async function D() {
		r.status.agents = {
			...r.status.agents,
			pi: {
				...r.status.agents?.pi,
				loading: !0
			}
		};
		try {
			await e("/api/agents/pi/connect", no("POST", {}));
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
	async function O(t) {
		if (r.sending) return;
		let n = ++r.chatEpoch;
		try {
			let a = await e(`/api/chats/${ro(t)}`);
			if (n !== r.chatEpoch || _) return;
			r.chat = a, r.context = new Set(a.paperIds || []), i("zhiyue.chat", a.id), s.value.available !== !0 && D();
		} catch (e) {
			y(e.message, !0);
		}
	}
	async function ae(t) {
		let n = r.chatEpoch, i = await e(`/api/chats/${ro(t)}`);
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
	async function oe() {
		if (!d.value) return !1;
		let t = r.draft.trim(), n = [...r.attachments], a = [...r.context];
		r.sending = !0;
		try {
			if (!r.chat) {
				r.creating = !0;
				try {
					let n = await e("/api/chats", no("POST", {
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
			r.model && (c.model = r.model), await e(`/api/chats/${ro(s)}/messages`, no("POST", c)), r.draft.trim() === t && (r.draft = "");
			let l = new Set(n.map((e) => e.key));
			r.attachments = r.attachments.filter((e) => !l.has(e.key));
			try {
				await ae(s);
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
	async function se() {
		if (r.chat) try {
			let t = r.chat.id;
			await e(`/api/chats/${ro(t)}/interrupt`, no("POST", {})), await ae(t);
		} catch (e) {
			y(e.message, !0);
		}
	}
	async function ce(t) {
		let n = await e("/api/uploads", {
			method: "POST",
			headers: {
				"X-Filename": encodeURIComponent(t.name),
				"Content-Type": t.type || "application/octet-stream"
			},
			body: t
		});
		if (!n.id) throw Error("上传接口没有返回附件编号");
		return n;
	}
	async function le(e) {
		e.status = "uploading", e.error = "";
		try {
			Object.assign(e, await ce(e.file), { status: "ready" });
		} catch (t) {
			e.status = "error", e.error = t.message, y(`上传 ${e.name} 失败：${t.message}`, !0);
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
			let e = /* @__PURE__ */ Ft({
				key: String(++h),
				name: t.name,
				file: Ut(t),
				status: "uploading"
			});
			r.attachments.push(e), await le(e);
		}
	}
	async function de({ uploads: t, category: n }) {
		let { job: i, skipped: a } = await e("/api/library/import", no("POST", {
			uploads: t,
			category: n
		}));
		return r.jobs.set(i.id, i), {
			job: i,
			skipped: a
		};
	}
	async function fe(t, n) {
		let i = r.chat;
		if ((i?.noteDrafts || []).find((e) => e.id === t) && !r.noteSaving) {
			r.noteSaving = t;
			try {
				let r = await e(`/api/note-drafts/${ro(t)}`, no("POST", { action: n }));
				i.noteDrafts = (i.noteDrafts || []).filter((e) => e.id !== t), n === "save" ? (y(`笔记已保存：${r.path}`), await T()) : y("已丢弃笔记草稿");
			} catch (e) {
				y(e.message, !0);
			} finally {
				r.noteSaving = "";
			}
		}
	}
	let pe = (e) => fe(e, "save"), me = (e) => fe(e, "discard");
	async function k(t, n, i = {}) {
		let a = r.approvals.get(t);
		if (a && !a.submitting) {
			a.submitting = !0;
			try {
				let o = { decision: n };
				n === "accept" && a.params?.questions?.length && (o.answers = i), await e(`/api/approvals/${ro(t)}`, no("POST", o)), r.resolvedApprovals.add(t), r.approvals.delete(t);
			} catch (e) {
				a.submitting = !1, y(e.message, !0);
			}
		}
	}
	async function he() {
		try {
			let t = await e("/api/downloads");
			for (let e of t.jobs || []) r.jobs.set(e.id, e);
			r.batches = t.batches || [], r.downloadsError = "";
		} catch (e) {
			r.downloadsError = e.message;
		}
	}
	async function ge(t) {
		try {
			let n = await e("/api/downloads", no("POST", t));
			return r.jobs.set(n.id, n), y("下载任务已创建"), !0;
		} catch (e) {
			return y(e.message, !0), !1;
		}
	}
	async function _e(t, n) {
		try {
			let i = await e("/api/downloads/action", no("POST", {
				batch: t,
				action: n,
				...n === "ieee" ? { submit: !0 } : {}
			}));
			return r.jobs.set(i.id, i), y("批次操作已提交"), !0;
		} catch (e) {
			return y(e.message, !0), !1;
		}
	}
	async function ve() {
		r.refreshing = !0;
		try {
			let t = await e("/api/catalog/refresh", no("POST", {}));
			r.jobs.set(t.id, t), y("索引刷新任务已提交，可在任务中心查看");
		} catch (e) {
			y(e.message, !0);
		} finally {
			r.refreshing = !1;
		}
	}
	function ye(e) {
		let t = r.chat.messages ||= [], n = t.findIndex((t) => t.id === e.id);
		n < 0 ? t.push(e) : Object.assign(t[n], e);
	}
	function be(e) {
		if (!_) {
			if (e.type === "connected" && Array.isArray(e.approvals)) {
				r.approvals.clear();
				for (let t of e.approvals) r.resolvedApprovals.has(t.id) || r.approvals.set(t.id, t);
			}
			if (e.type === "approvalResolved" && (r.approvals.delete(e.id), r.resolvedApprovals.add(e.id)), e.type === "noteDraft" && e.chatId === r.chat?.id && e.draft?.id) {
				let t = r.chat.noteDrafts ||= [], n = t.findIndex((t) => t.id === e.draft.id);
				n < 0 ? t.push(e.draft) : t[n] = e.draft;
			}
			if (e.type === "noteDraftResolved" && e.chatId === r.chat?.id && (r.chat.noteDrafts = (r.chat.noteDrafts || []).filter((t) => t.id !== e.id)), e.type === "message" && e.chatId === r.chat?.id && e.message?.id && ye(e.message), e.type === "delta" && e.chatId === r.chat?.id) {
				let t = r.chat.messages?.find((t) => t.id === e.messageId);
				t ||= (ye({
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
				}), t && Es(t) && !Es(e.job) && (y(`任务${Ts[e.job.status] || e.job.status}：${e.job.title || e.job.id}`, ["error", "failed"].includes(e.job.status)), T(), r.view === "downloads" && he());
			}
		}
	}
	async function A() {
		if (!(document.hidden || p || _)) {
			p = !0;
			try {
				let t = [ne()];
				r.chat && (!r.eventsOpen || u.value) && t.push(ae(r.chat.id));
				for (let n of r.jobs.values()) Es(n) && t.push(e(`/api/jobs/${ro(n.id)}`).then((e) => {
					r.jobs.set(e.id, e), Es(e) || (T(), r.view === "downloads" && he());
				}));
				await Promise.allSettled(t);
			} finally {
				p = !1;
			}
		}
	}
	async function xe() {
		if (t && (f = new t("/api/events"), f.onopen = () => {
			r.eventsOpen = !0, ne(), r.chat && ae(r.chat.id).catch(() => {});
		}, f.onerror = () => {
			r.eventsOpen = !1;
		}, f.onmessage = (e) => {
			let t;
			try {
				t = JSON.parse(e.data);
			} catch {
				return;
			}
			be(t);
		}), await Promise.allSettled([
			T(),
			ne(),
			re(),
			he()
		]), _) return;
		let e = a("zhiyue.chat");
		e && r.chats.some((t) => t.id === e) && await O(e), n && (m = setInterval(A, n));
	}
	function Se() {
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
		loadLibrary: T,
		createCategory: ee,
		renameCategory: te,
		patchPaper: E,
		loadStatus: ne,
		reconnectAgent: D,
		loadChats: re,
		openChat: O,
		syncChat: ae,
		newChat: ie,
		sendMessage: oe,
		interrupt: se,
		uploadFile: ce,
		uploadFiles: ue,
		uploadOne: le,
		importPdfs: de,
		decideApproval: k,
		saveNoteDraft: pe,
		discardNoteDraft: me,
		loadDownloads: he,
		createDownload: ge,
		batchAction: _e,
		refreshCatalog: ve,
		receive: be,
		start: xe,
		stop: Se
	};
}
// app/web/frontend/components/ChatMessage.vue
var Os = ["data-message"], ks = { class: "message-label sr-only" }, As = {
	key: 0,
	class: "message-body"
}, js = ["innerHTML"], Ms = {
	key: 2,
	class: "message-attachments"
}, Ns = ["href"], Ps = ["src", "alt"], Fs = {
	key: 3,
	class: "message-status",
	role: "status",
	"aria-label": "正在生成"
}, Is = {
	key: 4,
	class: "message-status"
}, Ls = {
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
		})[n.value]), i = X(() => ws.includes(t.message.status)), a = X(() => ["error", "failed"].includes(t.message.status)), o = X(() => uo(t.message.text)), s = X(() => t.message.error?.message || t.message.error), c = X(() => ["interrupted", "cancelled"].includes(t.message.status)), l = X(() => (t.message.attachments || t.message.attachmentIds || []).map((e) => typeof e == "string" ? { id: e } : e).filter((e) => e.id));
		return (t, u) => (W(), G("article", {
			class: k(["message", [n.value, {
				streaming: i.value,
				error: a.value
			}]]),
			"data-message": e.message.id
		}, [
			K("div", ks, j(r.value), 1),
			n.value === "user" ? (W(), G("div", As, j(e.message.text), 1)) : (W(), G("div", {
				key: 1,
				class: "message-body markdown",
				innerHTML: o.value
			}, null, 8, js)),
			l.value.length ? (W(), G("div", Ms, [(W(!0), G(U, null, V(l.value, (e) => (W(), G("a", {
				key: e.id,
				href: `/api/uploads/${R(ro)(e.id)}`,
				target: "_blank",
				rel: "noopener noreferrer"
			}, [(e.mime || e.mimeType || "").startsWith("image/") ? (W(), G("img", {
				key: 0,
				src: `/api/uploads/${R(ro)(e.id)}`,
				alt: e.name || "上传的图片",
				loading: "lazy"
			}, null, 8, Ps)) : (W(), G(U, { key: 1 }, [J(j(e.name || "附件"), 1)], 64))], 8, Ns))), 128))])) : Y("", !0),
			i.value && !s.value ? (W(), G("div", Fs, [...u[0] ||= [K("span", {
				class: "typing-indicator",
				"aria-hidden": "true"
			}, [
				K("i"),
				K("i"),
				K("i")
			], -1)]])) : s.value || a.value || c.value ? (W(), G("div", Is, j(s.value || (a.value ? "生成失败" : "已停止")), 1)) : Y("", !0)
		], 10, Os));
	}
}, Rs = ["data-approval"], zs = { class: "approval-question" }, Bs = [
	"onUpdate:modelValue",
	"data-answer",
	"aria-label"
], Vs = {
	key: 0,
	class: "question-options"
}, Hs = ["title", "onClick"], Us = { key: 1 }, Ws = { class: "approval-actions" }, Gs = ["disabled"], Ks = ["disabled"], qs = {
	__name: "ApprovalCard",
	props: { approval: {
		type: Object,
		required: !0
	} },
	setup(e) {
		let t = e, n = Mn("workspace"), r = /* @__PURE__ */ Ft({}), i = X(() => (t.approval.params?.questions || []).map((e, t) => ({
			...e,
			id: String(e.id ?? e.questionId ?? t),
			text: e.question || e.text || e.label || "请补充信息"
		}))), a = (e) => typeof e == "string" ? e : e.label || e.title || e.value || "";
		function o() {
			let e = Object.fromEntries(i.value.map((e) => [e.id, { answers: [(r[e.id] || "").trim()] }]));
			n.decideApproval(t.approval.id, "accept", e);
		}
		return (t, s) => (W(), G("form", {
			class: "approval",
			"data-approval": e.approval.id,
			onSubmit: Z(o, ["prevent"])
		}, [
			K("h4", null, j(i.value.length ? "需要你的回答" : "等待你的审批"), 1),
			i.value.length ? (W(!0), G(U, { key: 0 }, V(i.value, (e) => (W(), G("div", { key: e.id }, [K("label", zs, [K("strong", null, j(e.text), 1), B(K("textarea", {
				"onUpdate:modelValue": (t) => r[e.id] = t,
				"data-answer": e.id,
				rows: "2",
				required: "",
				"aria-label": e.text,
				placeholder: "输入你的回答…"
			}, null, 8, Bs), [[Fa, r[e.id]]])]), e.options?.length ? (W(), G("div", Vs, [(W(!0), G(U, null, V(e.options, (t, n) => (W(), G("button", {
				key: n,
				type: "button",
				class: "button subtle",
				title: t.description || "",
				onClick: (n) => r[e.id] = a(t)
			}, j(a(t)), 9, Hs))), 128))])) : Y("", !0)]))), 128)) : (W(), G("pre", Us, j(JSON.stringify(e.approval.params || {}, null, 2)), 1)),
			K("div", Ws, [K("button", {
				class: "button primary",
				type: "submit",
				disabled: e.approval.submitting
			}, j(i.value.length ? "提交回答" : "允许本次"), 9, Gs), K("button", {
				class: "button subtle",
				type: "button",
				disabled: e.approval.submitting,
				onClick: s[0] ||= (t) => R(n).decideApproval(e.approval.id, "decline")
			}, " 拒绝 ", 8, Ks)])
		], 40, Rs));
	}
}, Js = ["data-note-draft"], Ys = ["data-note-preview"], Xs = ["innerHTML"], Zs = { class: "note-draft-actions" }, Qs = ["data-note-save", "disabled"], $s = ["data-note-discard", "disabled"], ec = {
	__name: "NoteDraftCard",
	props: { draft: {
		type: Object,
		required: !0
	} },
	setup(e) {
		let t = e, n = Mn("workspace"), r = /* @__PURE__ */ L(!0), i = X(() => uo(t.draft.content || "")), a = X(() => n.state.noteSaving === t.draft.id);
		return (t, o) => (W(), G("section", {
			class: "note-draft",
			"data-note-draft": e.draft.id
		}, [
			K("header", null, [K("div", null, [K("strong", null, j(e.draft.title), 1), K("small", null, j(e.draft.paperId) + " · " + j(e.draft.path), 1)]), K("button", {
				class: "button subtle",
				type: "button",
				"data-note-preview": e.draft.id,
				onClick: o[0] ||= (e) => r.value = !r.value
			}, j(r.value ? "收起" : "预览"), 9, Ys)]),
			r.value ? (W(), G("div", {
				key: 0,
				class: "markdown note-preview",
				innerHTML: i.value
			}, null, 8, Xs)) : Y("", !0),
			K("div", Zs, [K("button", {
				class: "button primary",
				type: "button",
				"data-note-save": e.draft.id,
				disabled: a.value,
				onClick: o[1] ||= (t) => R(n).saveNoteDraft(e.draft.id)
			}, j(a.value ? "保存中…" : "保存为笔记"), 9, Qs), K("button", {
				class: "button subtle",
				type: "button",
				"data-note-discard": e.draft.id,
				disabled: a.value,
				onClick: o[2] ||= (t) => R(n).discardNoteDraft(e.draft.id)
			}, " 丢弃 ", 8, $s)])
		], 8, Js));
	}
}, tc = {
	id: "assistant-panel",
	class: "chat-panel",
	"aria-label": "文献研究助手"
}, nc = { class: "chat-header" }, rc = { class: "assistant-title" }, ic = [
	"aria-label",
	"title",
	"data-state"
], ac = { class: "chat-actions" }, oc = ["aria-expanded"], sc = ["disabled"], cc = {
	key: 0,
	id: "chat-history",
	class: "chat-history"
}, lc = ["data-chat", "onClick"], uc = {
	key: 0,
	class: "empty"
}, dc = {
	key: 1,
	id: "auth-banner",
	class: "auth-banner"
}, fc = {
	key: 2,
	class: "chat-context"
}, pc = { id: "context-papers" }, mc = [
	"data-context-remove",
	"title",
	"aria-label",
	"onClick"
], hc = {
	key: 0,
	class: "chat-empty"
}, gc = { class: "presets" }, _c = ["data-prompt", "onClick"], vc = {
	key: 3,
	id: "note-drafts",
	class: "note-drafts",
	"aria-live": "polite"
}, yc = {
	id: "approvals",
	class: "approvals",
	"aria-live": "polite"
}, bc = {
	__name: "AssistantPane",
	setup(e) {
		let t = Mn("workspace"), n = t.state, { agent: r } = t, i = /* @__PURE__ */ L(null), a = X(() => r.value.loading === !0 || r.value.available == null || r.value.authenticated == null || r.value.available === "loading"), o = X(() => r.value.available === !0 && r.value.authenticated === !0), s = X(() => n.statusError || r.value.available === !1 ? "error" : a.value || !n.eventsOpen || !o.value ? "loading" : "connected"), c = X(() => n.statusError || r.value.error || (o.value && n.eventsOpen ? "已连接" : a.value ? "正在连接" : "等待配置")), l = X(() => n.statusError || !a.value && !o.value), u = X(() => [...n.approvals.values()].filter((e) => e.chatId === n.chat?.id && !n.resolvedApprovals.has(e.id))), d = X(() => n.chat?.noteDrafts || []), f = [
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
		], p = (e) => ao(n.papers.find((t) => t.literature_id === e) || { literature_id: e });
		Fn(() => {
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
			await hn(), i.value && (e[0] !== t?.[0] || r) && (i.value.scrollTop = i.value.scrollHeight);
		});
		function m() {
			n.historyOpen = !n.historyOpen, n.historyOpen && t.loadChats();
		}
		return (e, a) => (W(), G("aside", tc, [
			q(_o, { kind: "assistant" }),
			K("div", nc, [K("div", rc, [a[3] ||= K("span", { class: "agent-name" }, "Pi Agent", -1), K("span", {
				id: "connection-status",
				class: "connection-indicator",
				role: "status",
				"aria-label": c.value,
				title: c.value,
				"data-state": s.value
			}, null, 8, ic)]), K("div", ac, [K("button", {
				id: "chat-history-toggle",
				class: "icon-button",
				title: "会话列表",
				"aria-label": "会话列表",
				"aria-expanded": R(n).historyOpen,
				onClick: m
			}, [q($, { name: "history" })], 8, oc), K("button", {
				id: "new-chat",
				class: "icon-button",
				title: "新建会话",
				"aria-label": "新建会话",
				disabled: R(n).creating || R(n).sending,
				onClick: a[0] ||= (...e) => R(t).newChat && R(t).newChat(...e)
			}, [q($, { name: "plus" })], 8, sc)])]),
			R(n).historyOpen ? (W(), G("div", cc, [(W(!0), G(U, null, V(R(n).chats, (e) => (W(), G("button", {
				key: e.id,
				class: k(["history-item", { active: R(n).chat?.id === e.id }]),
				"data-chat": e.id,
				onClick: (n) => R(t).openChat(e.id)
			}, [J(j(e.title || "新会话") + " ", 1), K("small", null, j(new Date(e.createdAt).toLocaleString("zh-CN")) + " " + j((e.paperIds || []).join(" · ")), 1)], 10, lc))), 128)), R(n).chats.length ? Y("", !0) : (W(), G("div", uc, "暂无会话"))])) : Y("", !0),
			l.value ? (W(), G("div", dc, [J(j(R(n).statusError || R(r).error || "请在终端运行 pi 配置模型或登录。") + " ", 1), K("button", {
				id: "retry-status",
				onClick: a[1] ||= (...e) => R(t).reconnectAgent && R(t).reconnectAgent(...e)
			}, "重新检测")])) : Y("", !0),
			R(n).context.size ? (W(), G("div", fc, [K("div", pc, [(W(!0), G(U, null, V(R(n).context, (e) => (W(), G("button", {
				key: e,
				class: "context-chip",
				"data-context-remove": e,
				title: p(e),
				"aria-label": `移除 ${e}`,
				onClick: (t) => R(n).context.delete(e)
			}, [J(j(e), 1), q($, { name: "close" })], 8, mc))), 128))]), K("button", {
				id: "clear-context",
				class: "icon-button",
				title: "清空论文上下文",
				"aria-label": "清空论文上下文",
				onClick: a[2] ||= (e) => R(n).context.clear()
			}, [q($, { name: "close" })])])) : Y("", !0),
			K("div", {
				id: "messages",
				ref_key: "messages",
				ref: i,
				class: "messages",
				role: "log",
				"aria-label": "对话消息",
				"aria-live": "off"
			}, [(W(!0), G(U, null, V(R(n).chat?.messages || [], (e) => (W(), si(Ls, {
				key: e.id,
				message: e
			}, null, 8, ["message"]))), 128)), R(n).chat?.messages?.length ? Y("", !0) : (W(), G("div", hc, [a[4] ||= K("h2", null, "从一个问题开始", -1), K("div", gc, [(W(), G(U, null, V(f, ([e, n, r]) => K("button", {
				key: n,
				class: "preset",
				"data-prompt": r,
				onClick: (e) => R(t).setDraft(r)
			}, [q($, { name: e }, null, 8, ["name"]), J(j(n), 1)], 8, _c)), 64))])]))], 512),
			d.value.length ? (W(), G("div", vc, [(W(!0), G(U, null, V(d.value, (e) => (W(), si(ec, {
				key: e.id,
				draft: e
			}, null, 8, ["draft"]))), 128))])) : Y("", !0),
			K("div", yc, [(W(!0), G(U, null, V(u.value, (e) => (W(), si(qs, {
				key: e.id,
				approval: e
			}, null, 8, ["approval"]))), 128))]),
			q(Ss)
		]));
	}
}, xc = {
	id: "downloads-view",
	class: "downloads-view"
}, Sc = { class: "download-columns" }, Cc = { class: "surface-heading" }, wc = ["value"], Tc = { class: "download-options" }, Ec = { class: "check-label" }, Dc = ["disabled"], Oc = { class: "download-results" }, kc = { class: "section-heading" }, Ac = { id: "download-jobs" }, jc = {
	key: 0,
	class: "surface empty"
}, Mc = { class: "job-heading" }, Nc = {
	key: 0,
	class: "error-text"
}, Pc = {
	key: 1,
	class: "job-counts"
}, Fc = ["data-job-details"], Ic = { class: "job-log" }, Lc = {
	key: 2,
	class: "surface empty"
}, Rc = { class: "empty-art" }, zc = { id: "download-batches" }, Bc = {
	key: 0,
	class: "section-heading"
}, Vc = { class: "job-heading" }, Hc = { class: "status-badge" }, Uc = { class: "batch-actions" }, Wc = ["disabled", "onClick"], Gc = "papers/09_情感综述调研/网站导入", Kc = {
	__name: "DownloadPanel",
	setup(e) {
		let t = Mn("workspace"), n = t.state, r = /* @__PURE__ */ Ft({
			title: "",
			input: "",
			category: Gc,
			channel: "public",
			autoArchive: !1
		}), i = /* @__PURE__ */ L(!1), a = /* @__PURE__ */ Ft(/* @__PURE__ */ new Set()), o = X(() => so(n.categories, Gc)), s = X(() => [...n.jobs.values()].reverse()), c = (e) => Object.entries(e || {}).map(([e, t]) => `${Ts[e] || e} ${t}`).join(" · "), l = (e) => typeof e == "string" ? e : JSON.stringify(e), u = (e) => Array.isArray(e) ? e.map((e) => typeof e == "string" ? e : JSON.stringify(e)).join("\n") : e || "暂无日志", d = [
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
		return (e, m) => (W(), G("section", xc, [m[21] ||= K("div", { class: "download-intro" }, [K("h2", null, "添加论文"), K("p", null, "输入 DOI 或题名，查看下载、核验与归档进度。")], -1), K("div", Sc, [K("form", {
			id: "download-form",
			class: "surface download-form",
			onSubmit: Z(f, ["prevent"])
		}, [
			K("div", Cc, [q($, { name: "download" }), m[7] ||= K("h3", null, "新建下载任务", -1)]),
			m[12] ||= K("label", { for: "download-title" }, [J("任务名称 "), K("span", { class: "muted" }, "可选")], -1),
			B(K("input", {
				id: "download-title",
				"onUpdate:modelValue": m[0] ||= (e) => r.title = e,
				placeholder: "例如：语音情感识别 · 经典文献"
			}, null, 512), [[Fa, r.title]]),
			m[13] ||= K("label", { for: "download-input" }, "论文信息", -1),
			B(K("textarea", {
				id: "download-input",
				"onUpdate:modelValue": m[1] ||= (e) => r.input = e,
				rows: "7",
				required: "",
				placeholder: "粘贴 DOI、论文题名或 JSON 清单\n每行一项"
			}, null, 512), [[Fa, r.input]]),
			m[14] ||= K("label", { for: "download-category" }, "归档分类", -1),
			B(K("select", {
				id: "download-category",
				"onUpdate:modelValue": m[2] ||= (e) => r.category = e
			}, [(W(!0), G(U, null, V(o.value, ([e, t]) => (W(), G("option", {
				key: e,
				value: e
			}, j(t), 9, wc))), 128))], 512), [[Ra, r.category]]),
			K("div", Tc, [K("label", null, [m[9] ||= J("获取渠道", -1), B(K("select", {
				id: "download-channel",
				"onUpdate:modelValue": m[3] ||= (e) => r.channel = e
			}, [...m[8] ||= [
				K("option", { value: "public" }, "公开来源", -1),
				K("option", { value: "auto" }, "自动选择", -1),
				K("option", { value: "ieee" }, "IEEE / 机构渠道", -1)
			]], 512), [[Ra, r.channel]])]), K("label", Ec, [B(K("input", {
				id: "auto-archive",
				"onUpdate:modelValue": m[4] ||= (e) => r.autoArchive = e,
				type: "checkbox"
			}, null, 512), [[Ia, r.autoArchive]]), m[10] ||= J("核验后自动归档", -1)])]),
			K("button", {
				id: "start-download",
				type: "submit",
				class: "button primary",
				disabled: i.value
			}, [q($, { name: "plus" }), m[11] ||= J("创建下载任务 ", -1)], 8, Dc),
			m[15] ||= K("p", { class: "muted form-note" }, "机构认证与需要确认的操作，由后端工具返回状态。", -1)
		], 32), K("div", Oc, [
			K("div", kc, [m[17] ||= K("h3", null, "任务与批次", -1), K("button", {
				id: "refresh-downloads",
				class: "button subtle",
				onClick: m[5] ||= (...e) => R(t).loadDownloads && R(t).loadDownloads(...e)
			}, [q($, { name: "refresh" }), m[16] ||= J("刷新 ", -1)])]),
			K("div", Ac, [R(n).downloadsError ? (W(), G("div", jc, [K("p", null, j(R(n).downloadsError), 1), K("button", {
				class: "button subtle",
				onClick: m[6] ||= (...e) => R(t).loadDownloads && R(t).loadDownloads(...e)
			}, "重试")])) : (W(!0), G(U, { key: 1 }, V(s.value, (e) => (W(), G("article", {
				key: e.id,
				class: "job-card"
			}, [
				K("div", Mc, [K("h4", null, j(e.title || e.batch || e.id), 1), K("span", { class: k(["status-badge", { failed: ["error", "failed"].includes(e.status) }]) }, j(R(Ts)[e.status] || e.status || "状态待确认"), 3)]),
				e.error ? (W(), G("p", Nc, j(l(e.error)), 1)) : Y("", !0),
				K("p", null, j(e.message || e.action || ""), 1),
				e.result?.counts ? (W(), G("p", Pc, " 批次结果：" + j(c(e.result.counts) || "暂无计数"), 1)) : Y("", !0),
				K("details", { "data-job-details": e.id }, [m[18] ||= K("summary", null, "查看任务日志", -1), K("pre", Ic, j(u(e.log)), 1)], 8, Fc)
			]))), 128)), !R(n).downloadsError && !s.value.length ? (W(), G("div", Lc, [K("span", Rc, [q($, { name: "download" })]), m[19] ||= K("p", null, "暂无下载任务", -1)])) : Y("", !0)]),
			K("div", zc, [R(n).batches.length ? (W(), G("div", Bc, [...m[20] ||= [K("h3", null, "已有下载批次", -1)]])) : Y("", !0), (W(!0), G(U, null, V(R(n).batches, (e) => (W(), G("article", {
				key: e.batch,
				class: "batch-card"
			}, [
				K("div", Vc, [K("h4", null, j(e.batch), 1), K("span", Hc, j(Array.isArray(e.entries) ? e.entries.length : e.entries ?? "—") + " 条", 1)]),
				K("p", null, j(c(e.counts)), 1),
				K("div", Uc, [(W(), G(U, null, V(d, ([t, n]) => K("button", {
					key: t,
					class: "button subtle",
					disabled: a.has(`${e.batch}:${t}`),
					onClick: (n) => p(e.batch, t)
				}, j(n), 9, Wc)), 64))])
			]))), 128))])
		])])]));
	}
}, qc = { class: "import-head" }, Jc = ["disabled"], Yc = { class: "import-body" }, Xc = { class: "import-pick" }, Zc = ["disabled"], Qc = { class: "import-file-icon" }, $c = { class: "import-file-text" }, el = ["disabled"], tl = {
	key: 0,
	class: "import-list"
}, nl = { class: "import-list-head" }, rl = ["disabled"], il = { class: "import-items" }, al = { class: "import-item-head" }, ol = { class: "import-item-index" }, sl = { class: "import-item-main" }, cl = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], ll = { class: "import-item-file" }, ul = {
	key: 0,
	class: "import-item-badge"
}, dl = {
	key: 1,
	class: "import-item-badge failed"
}, fl = [
	"title",
	"aria-label",
	"aria-expanded",
	"disabled",
	"onClick"
], pl = ["disabled", "onClick"], ml = {
	key: 0,
	class: "import-item-extra"
}, hl = { class: "import-field wide" }, gl = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], _l = { class: "import-field" }, vl = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], yl = { class: "import-field" }, bl = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], xl = { class: "import-fields" }, Sl = { class: "import-field wide" }, Cl = ["disabled"], wl = ["value"], Tl = {
	key: 1,
	class: "import-check"
}, El = ["disabled"], Dl = {
	key: 2,
	class: "import-error",
	role: "alert"
}, Ol = {
	key: 3,
	class: "import-summary",
	role: "status"
}, kl = {
	key: 4,
	class: "import-progress",
	role: "status"
}, Al = {
	key: 5,
	class: "import-log-wrap"
}, jl = { class: "import-log" }, Ml = { class: "import-actions" }, Nl = ["disabled"], Pl = ["disabled"], Fl = 100, Il = {
	__name: "ImportPaperDialog",
	emits: ["close", "imported"],
	setup(e, { emit: t }) {
		let n = Mn("workspace"), r = n.state, i = t, a = /* @__PURE__ */ L(null), o = /* @__PURE__ */ L(null), s = /* @__PURE__ */ L(null), c = /* @__PURE__ */ Ft({
			category: "papers/09_情感综述调研/网站导入",
			confirmed: !1
		}), l = /* @__PURE__ */ Ft([]), u = /* @__PURE__ */ L(""), d = /* @__PURE__ */ L(!1), f = /* @__PURE__ */ L(null), p = /* @__PURE__ */ L(!1), m = /* @__PURE__ */ L("idle"), h = /* @__PURE__ */ L(""), g = /* @__PURE__ */ L(0), _ = /* @__PURE__ */ L([]), v = /* @__PURE__ */ L(null), y = /* @__PURE__ */ L(null), b = 0, x = X(() => {
			let e = so(r.categories), t = f.value;
			return t && !e.some(([e]) => e === t[0]) && e.push(t), e;
		}), S = X(() => m.value === "uploading" || m.value === "processing"), C = X(() => {
			let e = y.value?.log;
			return (Array.isArray(e) ? e.join("") : e || "").slice(-4e3);
		}), w = X(() => l.length - _.value.length), T = X(() => {
			let e = y.value?.steps || [], t = e.filter((e) => e.action === "attach" && e.status === "completed").length, n = e.some((e) => e.action === "archive");
			return Math.min(t + +!!n, w.value);
		}), ee = X(() => m.value === "uploading" ? "正在上传…" : m.value === "processing" ? "正在归档…" : m.value === "failed" ? "重试" : l.length > 1 ? `导入并归档 ${l.length} 篇` : "导入并归档");
		$n(() => {
			let e = a.value;
			typeof e?.showModal == "function" ? e.showModal() : e?.setAttribute("open", "");
		});
		function te() {
			if (S.value) return;
			let e = a.value;
			typeof e?.close == "function" && e.close(), i("close");
		}
		function E(e) {
			e.target === a.value && !S.value && te();
		}
		function ne(e) {
			let t = e / 1024 / 1024;
			return t >= 1 ? `${t.toFixed(1)} MB` : `${Math.max(1, Math.round(e / 1024))} KB`;
		}
		function D() {
			for (let e of [o.value, s.value]) e && (e.value = "");
		}
		function re(e) {
			ce(e.target.files), D();
		}
		function ie() {
			o.value?.click();
		}
		function O() {
			s.value?.click();
		}
		function ae(e) {
			let t = /* @__PURE__ */ new Set();
			for (let n of e) {
				let e = n.webkitRelativePath || "";
				e.includes("/") && t.add(e.split("/")[0]);
			}
			return t.size === 1 ? [...t][0] : "";
		}
		function oe(e) {
			let t = (e) => String(e).replace(/^\d+_/, "").trim().toLocaleLowerCase(), n = x.value, r = n.find(([t]) => t.split("/")[1] === e);
			if (r) return r[0];
			let i = n.find(([n]) => t(n.split("/")[1]) === t(e));
			return i ? i[0] : "";
		}
		function se(e) {
			let t = String(e || "").trim();
			return !t || t === "." || t === ".." || t.includes("..") || /[\\/:*?"<>|\x00-\x1f\x7f]/.test(t) || /[. ]$/.test(t) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(t) ? null : {
				value: `papers/${t}/网站导入`,
				label: `${t.replace(/^\d+_/, "")} / 网站导入（新建）`
			};
		}
		function ce(e, t = "") {
			if (S.value) return;
			h.value = "";
			let n = !l.length, r = ae(e) || t, i = [], a = 0, o = 0;
			for (let t of Array.from(e || [])) {
				if (!t || !/\.pdf$/i.test(t.name)) continue;
				if (t.size > 26214400) {
					i.push(`${t.name} 超过 25 MB`);
					continue;
				}
				if (t.size === 0) {
					i.push(`${t.name} 为空`);
					continue;
				}
				if (l.length >= Fl) {
					o += 1;
					continue;
				}
				let e = t.webkitRelativePath || t.name;
				if (l.some((n) => n.relative === e && n.size === t.size && n.lastModified === t.lastModified)) continue;
				let n = `f${++b}`, r = t.name.replace(/\.pdf$/i, "").replace(/[_\s]+/g, " ").trim();
				l.push({
					key: n,
					file: Ut(t),
					name: t.name,
					relative: e,
					size: t.size,
					lastModified: t.lastModified,
					title: r,
					authors: "",
					year: "",
					doi: "",
					uploadId: "",
					status: "new",
					note: ""
				}), a += 1;
			}
			if (n && a && !d.value && r) {
				let e = oe(r);
				if (e) f.value = null, c.category = e;
				else {
					let e = se(r);
					e && (f.value = [e.value, e.label], c.category = e.value);
				}
			}
			if (!u.value && l.length === 1 && (u.value = l[0].key), a && (c.confirmed = !1), o && i.unshift(`每次最多导入 ${Fl} 个 PDF，其余 ${o} 个未加入`), i.length) {
				let e = i.length > 3 ? `；另有 ${i.length - 3} 个未加入` : "";
				h.value = `${i.slice(0, 3).join("；")}${e}。`;
			} else a || (h.value = "所选内容中没有可导入的 PDF。");
		}
		async function le(e, t) {
			if (e.isFile) {
				let n = await new Promise((t, n) => e.file(t, n));
				/\.pdf$/i.test(n.name) && t.push(n);
				return;
			}
			if (!e.isDirectory) return;
			let n = e.createReader();
			for (;;) {
				let e = await new Promise((e, t) => n.readEntries(e, t));
				if (!e.length) break;
				for (let n of e) await le(n, t);
				if (t.length > Fl) break;
			}
		}
		async function ue(e) {
			if (p.value = !1, S.value) return;
			let t = e.dataTransfer;
			if (!t) return;
			let n = [...t.items || []].map((e) => e.kind === "file" ? e.webkitGetAsEntry?.() : null).filter(Boolean);
			if (!n.length) {
				ce(t.files);
				return;
			}
			let r = [];
			try {
				for (let e of n) await le(e, r);
			} catch {
				h.value = "无法读取拖入的部分文件，请改用“选择文件”或“选择文件夹”。";
				return;
			}
			if (!r.length) return h.value = "拖入的内容中没有可导入的 PDF。";
			ce(r, n.length === 1 && n[0].isDirectory ? n[0].name : "");
		}
		function de(e) {
			u.value = u.value === e.key ? "" : e.key;
		}
		function fe(e) {
			if (S.value) return;
			let t = l.indexOf(e);
			t < 0 || (l.splice(t, 1), u.value === e.key && (u.value = ""), l.length || me());
		}
		function pe() {
			!S.value && l.length && window.confirm("清空已选文件和已填信息？") && (l.splice(0), u.value = "", d.value = !1, f.value = null, me(), D());
		}
		function me() {
			c.confirmed = !1, m.value = "idle", h.value = "", _.value = [], v.value = null, y.value = null;
		}
		function he() {
			if (!l.length) return "请选择要导入的 PDF。";
			for (let [e, t] of l.entries()) {
				if (!t.title.trim()) return u.value = t.key, `第 ${e + 1} 个文件缺少题名。`;
				if (t.year && !/^\d{4}$/.test(t.year.trim())) return u.value = t.key, `第 ${e + 1} 个文件的年份需为四位数字。`;
				let n = t.doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
				if (n && !/^10\.\d{4,9}\/\S+$/.test(n)) return u.value = t.key, `第 ${e + 1} 个文件的 DOI 格式不正确。`;
			}
			return c.confirmed ? "" : "请先核对题名与作者信息。";
		}
		async function ge(e) {
			for (;;) {
				let t = await n.api(`/api/jobs/${ro(e)}`);
				if (r.jobs.set(t.id, t), y.value = t, t.status === "completed") return t;
				if (t.status === "failed") throw Error(t.error || "导入任务失败。");
				await new Promise((e) => setTimeout(e, 800));
			}
		}
		async function _e() {
			if (S.value) return;
			h.value = "";
			let e = he();
			if (e) return h.value = e;
			let t = new Set(r.papers.map((e) => e.literature_id));
			_.value = [], v.value = null, m.value = "uploading", g.value = 0;
			let a = null;
			try {
				for (let [e, t] of l.entries()) t.status = t.uploadId ? "ready" : "new", t.note = "", t.uploadId || (a = t, g.value = e + 1, t.status = "uploading", t.uploadId = (await n.uploadFile(t.file)).id, t.status = "ready");
				a = null, m.value = "processing";
				let { job: e, skipped: o } = await n.importPdfs({
					uploads: l.map((e) => ({
						uploadId: e.uploadId,
						title: e.title.trim(),
						authors: e.authors.trim(),
						year: e.year.trim(),
						doi: e.doi.trim()
					})),
					category: c.category
				});
				_.value = o || [];
				for (let e of _.value) {
					let t = l[e.index];
					t && (t.status = "skipped", t.note = e.literature_id ? `已归档为 ${e.literature_id}${e.literature_title ? `：${e.literature_title}` : ""}` : e.reason);
				}
				y.value = e;
				let s = await ge(e.id);
				await n.loadLibrary();
				let u = Number(s.result?.counts?.archived) || 0, d = Math.max(0, w.value - u), f = r.papers.filter((e) => !t.has(e.literature_id));
				if (v.value = {
					archived: u,
					skipped: _.value.length,
					failed: d
				}, u) {
					let e = f.slice(0, 6).map((e) => e.literature_id).join("、"), t = f.length > 6 ? ` 等 ${f.length} 篇` : "", r = _.value.length ? `，跳过 ${_.value.length} 个重复文件` : "";
					n.toast(`已归档 ${u} 篇${e ? `：${e}${t}` : ""}${r}`), f[0] && (n.selectPaper(f[0].literature_id), i("imported", f[0].literature_id));
				}
				if (d) {
					m.value = "failed", h.value = `${u} 篇已归档，${d} 篇未完成；可查看任务日志后重试。`;
					return;
				}
				if (!u) {
					m.value = "failed", h.value = "导入流程结束，但没有新归档的文献；请查看任务日志。";
					return;
				}
				if (_.value.length) {
					m.value = "done";
					return;
				}
				i("close");
			} catch (e) {
				a && a.status === "uploading" ? (a.status = "error", a.note = e.message, h.value = `${a.name} 上传失败：${e.message}`) : h.value = e.message || "导入失败。", m.value = "failed";
			}
		}
		return (e, t) => (W(), G("dialog", {
			ref_key: "dialog",
			ref: a,
			class: "import-dialog",
			"aria-labelledby": "import-title",
			onCancel: Z(te, ["prevent"]),
			onClick: E
		}, [K("form", {
			class: "import-sheet",
			onSubmit: Z(_e, ["prevent"])
		}, [
			K("header", qc, [t[5] ||= K("div", null, [K("h2", { id: "import-title" }, "导入 PDF"), K("p", null, "可多选或添加文件夹，核对题名后批量归档。")], -1), K("button", {
				type: "button",
				class: "icon-button",
				title: "关闭",
				"aria-label": "关闭",
				disabled: S.value,
				onClick: te
			}, [q($, { name: "close" })], 8, Jc)]),
			K("div", Yc, [
				K("input", {
					ref_key: "fileInput",
					ref: o,
					type: "file",
					accept: ".pdf,application/pdf",
					multiple: "",
					hidden: "",
					onChange: re
				}, null, 544),
				K("input", {
					ref_key: "folderInput",
					ref: s,
					type: "file",
					accept: ".pdf,application/pdf",
					webkitdirectory: "",
					directory: "",
					multiple: "",
					hidden: "",
					onChange: re
				}, null, 544),
				K("div", Xc, [K("button", {
					type: "button",
					class: k(["import-file", {
						dragging: p.value,
						compact: l.length
					}]),
					disabled: S.value,
					onClick: ie,
					onDragover: t[0] ||= Z((e) => p.value = !0, ["prevent"]),
					onDragleave: t[1] ||= (e) => p.value = !1,
					onDrop: Z(ue, ["prevent"])
				}, [K("span", Qc, [q($, { name: "upload" })]), K("span", $c, [K("strong", null, j(l.length ? "继续添加 PDF" : "选择 PDF 文件"), 1), K("small", null, j(l.length ? "可多选，或把文件、文件夹拖到这里" : "可多选，或把文件、文件夹拖到这里，单个最大 25 MB"), 1)])], 42, Zc), K("button", {
					type: "button",
					class: "import-folder",
					disabled: S.value,
					onClick: O
				}, [q($, { name: "folder" }), t[6] ||= K("span", null, "选择文件夹", -1)], 8, el)]),
				l.length ? (W(), G("div", tl, [K("div", nl, [K("span", null, [J(j(l.length) + " 个 PDF ", 1), _.value.length ? (W(), G(U, { key: 0 }, [J(" · 跳过 " + j(_.value.length) + " 个", 1)], 64)) : Y("", !0)]), K("button", {
					type: "button",
					class: "text-button",
					disabled: S.value,
					onClick: pe
				}, " 清空 ", 8, rl)]), K("div", il, [(W(!0), G(U, null, V(l, (e, n) => (W(), G("article", {
					key: e.key,
					class: k(["import-item", e.status])
				}, [K("div", al, [
					K("span", ol, j(n + 1), 1),
					K("div", sl, [B(K("input", {
						"onUpdate:modelValue": (t) => e.title = t,
						class: "import-item-title",
						maxlength: "300",
						placeholder: "题名（必填，与 PDF 首页一致）",
						"aria-label": `第 ${n + 1} 个文件的题名`,
						disabled: S.value
					}, null, 8, cl), [[Fa, e.title]]), K("small", ll, [J(j(e.relative) + " · " + j(ne(e.size)), 1), e.note ? (W(), G(U, { key: 0 }, [J(" · " + j(e.note), 1)], 64)) : Y("", !0)])]),
					e.status === "skipped" ? (W(), G("span", ul, "已跳过")) : e.status === "error" ? (W(), G("span", dl, "未完成")) : Y("", !0),
					K("button", {
						type: "button",
						class: k(["icon-button import-item-more", { open: u.value === e.key }]),
						title: u.value === e.key ? "收起作者、年份和 DOI" : "填写作者、年份和 DOI",
						"aria-label": u.value === e.key ? "收起书目信息" : "展开书目信息",
						"aria-expanded": u.value === e.key,
						disabled: S.value,
						onClick: (t) => de(e)
					}, [q($, { name: "chevron" })], 10, fl),
					K("button", {
						type: "button",
						class: "icon-button",
						title: "移除",
						"aria-label": "移除",
						disabled: S.value,
						onClick: (t) => fe(e)
					}, [q($, { name: "close" })], 8, pl)
				]), u.value === e.key ? (W(), G("div", ml, [
					K("label", hl, [t[7] ||= K("span", null, [J("作者 "), K("small", null, "多位作者用分号隔开")], -1), B(K("input", {
						"onUpdate:modelValue": (t) => e.authors = t,
						maxlength: "3000",
						placeholder: "例如：张三; 李四",
						"aria-label": `第 ${n + 1} 个文件的作者`,
						disabled: S.value
					}, null, 8, gl), [[Fa, e.authors]])]),
					K("label", _l, [t[8] ||= K("span", null, "年份", -1), B(K("input", {
						"onUpdate:modelValue": (t) => e.year = t,
						inputmode: "numeric",
						maxlength: "4",
						placeholder: "2024",
						"aria-label": `第 ${n + 1} 个文件的年份`,
						disabled: S.value
					}, null, 8, vl), [[Fa, e.year]])]),
					K("label", yl, [t[9] ||= K("span", null, [J("DOI "), K("small", null, "可选")], -1), B(K("input", {
						"onUpdate:modelValue": (t) => e.doi = t,
						maxlength: "300",
						placeholder: "10.xxxx/xxxxx",
						"aria-label": `第 ${n + 1} 个文件的 DOI`,
						disabled: S.value
					}, null, 8, bl), [[Fa, e.doi]])])
				])) : Y("", !0)], 2))), 128))])])) : Y("", !0),
				K("div", xl, [K("label", Sl, [t[10] ||= K("span", null, "归档分类", -1), B(K("select", {
					"onUpdate:modelValue": t[2] ||= (e) => c.category = e,
					disabled: S.value || m.value === "done",
					onChange: t[3] ||= (e) => d.value = !0
				}, [(W(!0), G(U, null, V(x.value, ([e, t]) => (W(), G("option", {
					key: e,
					value: e
				}, j(t), 9, wl))), 128))], 40, Cl), [[Ra, c.category]])])]),
				m.value === "done" ? Y("", !0) : (W(), G("label", Tl, [B(K("input", {
					"onUpdate:modelValue": t[4] ||= (e) => c.confirmed = e,
					type: "checkbox",
					disabled: S.value
				}, null, 8, El), [[Ia, c.confirmed]]), K("span", null, j(l.length > 1 ? "我已核对以上文件的题名与作者信息，并有权保存这些文件。" : "我已核对题名与作者与 PDF 首页一致，并有权保存该文件。"), 1)])),
				h.value ? (W(), G("p", Dl, j(h.value), 1)) : Y("", !0),
				m.value === "done" ? (W(), G("p", Ol, [
					J(" 已归档 " + j(v.value?.archived || 0) + " 篇", 1),
					v.value?.skipped ? (W(), G(U, { key: 0 }, [J("，跳过 " + j(v.value.skipped) + " 个重复文件", 1)], 64)) : Y("", !0),
					t[11] ||= J("。 ", -1)
				])) : Y("", !0),
				S.value ? (W(), G("div", kl, [t[12] ||= K("span", { class: "busy-spinner" }, null, -1), m.value === "uploading" ? (W(), G(U, { key: 0 }, [J(" 正在上传第 " + j(g.value) + " / " + j(l.length) + " 个文件… ", 1)], 64)) : (W(), G(U, { key: 1 }, [J(" 正在核验并归档 " + j(T.value) + " / " + j(w.value) + " 篇… ", 1)], 64))])) : Y("", !0),
				(m.value === "failed" || m.value === "done") && C.value ? (W(), G("details", Al, [t[13] ||= K("summary", null, "查看任务日志", -1), K("pre", jl, j(C.value), 1)])) : Y("", !0)
			]),
			K("footer", Ml, [m.value === "done" ? (W(), G("button", {
				key: 0,
				type: "button",
				class: "button primary",
				onClick: te
			}, "完成")) : (W(), G(U, { key: 1 }, [K("button", {
				type: "button",
				class: "button subtle",
				disabled: S.value,
				onClick: te
			}, " 取消 ", 8, Nl), K("button", {
				id: "import-paper-submit",
				type: "submit",
				class: "button primary",
				disabled: S.value || !l.length
			}, [q($, { name: "upload" }), J(j(ee.value), 1)], 8, Pl)], 64))])
		], 32)], 544));
	}
}, Ll = {
	class: "shell",
	"data-framework": "vue"
}, Rl = { class: "main" }, zl = { class: "topbar" }, Bl = { id: "page-title" }, Vl = { class: "top-actions" }, Hl = {
	id: "library-summary",
	class: "muted"
}, Ul = {
	class: "mobile-tabs",
	"aria-label": "工作面板"
}, Wl = ["data-panel", "onClick"], Gl = ["data-panel"], Kl = {
	id: "toast-region",
	class: "toast-region",
	role: "status",
	"aria-live": "polite"
}, ql = {
	__name: "Workspace",
	props: { workspace: {
		type: Object,
		required: !0
	} },
	setup(e) {
		let t = e;
		jn("workspace", t.workspace);
		let n = t.workspace, r = n.state, i = X(() => r.papers.filter((e) => e.notes?.length).length);
		function a(e) {
			n.setView("library"), e && n.selectPaper(e);
		}
		let o, s;
		return $n(() => {
			o = $a(document), s = new window.AbortController(), document.addEventListener("keydown", (e) => {
				e.key !== "/" || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable || (e.preventDefault(), n.setView("library"), n.setPanel("list"), document.querySelector("#search")?.focus());
			}, { signal: s.signal });
		}), er(() => {
			o?.(), s?.abort(), n.stop();
		}), (e, t) => (W(), G(U, null, [K("div", Ll, [
			q(Mo),
			K("main", Rl, [
				K("header", zl, [K("h1", Bl, j(R(r).view === "library" ? "文献" : "下载任务"), 1), K("div", Vl, [K("span", Hl, j(R(r).papers.length) + " 篇文献 · " + j(i.value) + " 篇有笔记", 1)])]),
				B(K("div", Ul, [(W(), G(U, null, V([
					["list", "文献"],
					["reader", "阅读"],
					["chat", "研究助手"]
				], ([e, t]) => K("button", {
					key: e,
					class: k({ active: R(r).panel === e }),
					"data-panel": e,
					onClick: (t) => R(n).setPanel(e)
				}, j(t), 11, Wl)), 64))], 512), [[ea, R(r).view === "library"]]),
				B(K("section", {
					id: "library-view",
					class: "library-layout",
					"data-panel": R(r).panel
				}, [
					q(rs),
					q(as),
					q(bc)
				], 8, Gl), [[ea, R(r).view === "library"]]),
				B(q(Kc, null, null, 512), [[ea, R(r).view === "downloads"]])
			]),
			R(r).importOpen ? (W(), si(Il, {
				key: 0,
				onClose: t[0] ||= (e) => R(r).importOpen = !1,
				onImported: a
			})) : Y("", !0)
		]), K("div", Kl, [(W(!0), G(U, null, V(R(r).toasts, (e) => (W(), G("div", {
			key: e.id,
			class: k(["toast", { error: e.error }])
		}, j(e.message), 3))), 128))])], 64));
	}
};
// app/web/frontend/main.js
function Jl(e, t = {}) {
	let n = Ds(t), r = Xa(ql, { workspace: n });
	return r.mount(e), {
		app: r,
		workspace: n,
		ready: n.start(),
		version: Vi,
		unmount: () => r.unmount()
	};
}
typeof document < "u" && document.querySelector("#app") && Jl("#app");
export { Ds as createWorkspace, Jl as mountWorkspace };
