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
}, E = /-\w/g, D = /* @__PURE__ */ ee((e) => e.replace(E, (e) => e.slice(1).toUpperCase())), te = /\B([A-Z])/g, O = /* @__PURE__ */ ee((e) => e.replace(te, "-$1").toLowerCase()), ne = /* @__PURE__ */ ee((e) => e.charAt(0).toUpperCase() + e.slice(1)), re = /* @__PURE__ */ ee((e) => e ? `on${ne(e)}` : ""), k = (e, t) => !Object.is(e, t), ie = (e, ...t) => {
	for (let n = 0; n < e.length; n++) e[n](...t);
}, ae = (e, t, n, r = !1) => {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		writable: r,
		value: n
	});
}, oe = (e) => {
	let t = parseFloat(e);
	return isNaN(t) ? e : t;
}, se, ce = () => se ||= typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
function le(e) {
	if (d(e)) {
		let t = {};
		for (let n = 0; n < e.length; n++) {
			let r = e[n], i = g(r) ? pe(r) : le(r);
			if (i) for (let e in i) t[e] = i[e];
		}
		return t;
	}
	if (g(e) || v(e)) return e;
}
var ue = /;(?![^(]*\))/g, de = /:([^]+)/, fe = /"(?:[^"\\]|\\[^])*"|'(?:[^'\\]|\\[^])*'|\\[^]|\/\*[^]*?\*\//g;
function pe(e) {
	let t = {};
	return e.replace(fe, (e) => e.startsWith("/*") ? "" : e).split(ue).forEach((e) => {
		if (e) {
			let n = e.split(de);
			n.length > 1 && (t[n[0].trim()] = n[1].trim());
		}
	}), t;
}
function A(e) {
	let t = "";
	if (g(e)) t = e;
	else if (d(e)) for (let n = 0; n < e.length; n++) {
		let r = A(e[n]);
		r && (t += r + " ");
	}
	else if (v(e)) for (let n in e) e[n] && (t += n + " ");
	return t.trim();
}
var me = /* @__PURE__ */ e("itemscope,allowfullscreen,disablepictureinpicture,disableremoteplayback,formnovalidate,ismap,nomodule,novalidate,playsinline,readonly");
function he(e) {
	return !!e || e === "";
}
function ge(e, t, n) {
	if (e.length !== t.length) return !1;
	let r = !0;
	for (let i = 0; r && i < e.length; i++) r = be(e[i], t[i], n);
	return r;
}
function _e(e, t, n) {
	if (e.size !== t.size) return !1;
	let r = Array.from(t), i = new Uint8Array(r.length);
	for (let t of e) {
		let e = -1;
		for (let a = 0; a < r.length; a++) if (!i[a] && be(t, r[a], n)) {
			e = a;
			break;
		}
		if (e < 0) return !1;
		i[e] = 1;
	}
	return !0;
}
function ve(e, t, n) {
	let r = f(e), i = f(t);
	if (r || i || (r = p(e), i = p(t), r || i)) return r && i ? _e(e, t, n) : !1;
	if (Object.keys(e).length !== Object.keys(t).length) return !1;
	for (let r in e) {
		let i = e.hasOwnProperty(r), a = t.hasOwnProperty(r);
		if (i && !a || !i && a || !be(e[r], t[r], n)) return !1;
	}
	return String(e) === String(t);
}
function ye(e, t, n, r) {
	n ||= [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
	let [i, a] = n;
	if (i.has(e) || a.has(t)) return i.get(e) === t && a.get(t) === e;
	i.set(e, t), a.set(t, e);
	let o = r(e, t, n);
	return i.delete(e), a.delete(t), o;
}
function be(e, t, n) {
	if (e === t) return !0;
	let r = m(e), i = m(t);
	return r || i ? r && i ? e.getTime() === t.getTime() : !1 : (r = _(e), i = _(t), r || i ? e === t : (r = d(e), i = d(t), r || i ? r && i ? ye(e, t, n, ge) : !1 : (r = v(e), i = v(t), r || i ? !r || !i ? !1 : ye(e, t, n, ve) : String(e) === String(t))));
}
function xe(e, t) {
	return e.findIndex((e) => be(e, t));
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
		(t.version === 0 || k(n, e._value)) && (e.flags |= 128, e._value = n, t.version++);
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
		let o = Reflect.get(e, t, /* @__PURE__ */ Kt(e) ? e : n);
		if ((_(t) ? pt.has(t) : ft(t)) || (r || P(e, "get", t), i)) return o;
		if (/* @__PURE__ */ Kt(o)) {
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
			if (!/* @__PURE__ */ Vt(n) && !/* @__PURE__ */ Bt(n) && (i = /* @__PURE__ */ F(i), n = /* @__PURE__ */ F(n)), !a && /* @__PURE__ */ Kt(i) && !/* @__PURE__ */ Kt(n)) return e || (i.value = n), !0;
		}
		let o = a ? Number(t) < e.length : u(e, t), s = Reflect.set(e, t, n, /* @__PURE__ */ Kt(e) ? e : r);
		return e === /* @__PURE__ */ F(r) && s && (o ? k(n, i) && et(e, "set", t, n, i) : et(e, "add", t, n)), s;
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
			e || (k(n, a) && P(i, "get", n), P(i, "get", a));
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
			return e || (k(t, i) && P(r, "has", t), P(r, "has", i)), t === i ? n.has(t) : n.has(t) || n.has(i);
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
			return r.has.call(n, a) || k(e, a) && r.has.call(n, e) || k(i, a) && r.has.call(n, i) || (n.add(a), et(n, "add", a, a)), this;
		},
		set(e, n) {
			t || /* @__PURE__ */ Vt(n) || /* @__PURE__ */ Bt(n) || (n = /* @__PURE__ */ F(n));
			let r = /* @__PURE__ */ F(this), { has: i, get: a } = St(r), o = i.call(r, e);
			o ||= (e = /* @__PURE__ */ F(e), i.call(r, e));
			let s = a.call(r, e);
			return r.set(e, n), o ? k(n, s) && et(r, "set", e, n, s) : et(r, "add", e, n), this;
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
	return !u(e, "__v_skip") && Object.isExtensible(e) && ae(e, "__v_skip", !0), e;
}
var Wt = (e) => v(e) ? /* @__PURE__ */ Ft(e) : e, Gt = (e) => v(e) ? /* @__PURE__ */ Lt(e) : e;
// @__NO_SIDE_EFFECTS__
function Kt(e) {
	return e ? e.__v_isRef === !0 : !1;
}
// @__NO_SIDE_EFFECTS__
function I(e) {
	return qt(e, !1);
}
function qt(e, t) {
	return /* @__PURE__ */ Kt(e) ? e : new Jt(e, t);
}
var Jt = class {
	constructor(e, t) {
		this.dep = new Je(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = t ? e : /* @__PURE__ */ F(e), this._value = t ? e : Wt(e), this.__v_isShallow = t;
	}
	get value() {
		return this.dep.track(), this._value;
	}
	set value(e) {
		let t = this._rawValue, n = this.__v_isShallow || /* @__PURE__ */ Vt(e) || /* @__PURE__ */ Bt(e);
		e = n ? e : /* @__PURE__ */ F(e), k(e, t) && (this._rawValue = e, this._value = n ? e : Wt(e), this.dep.trigger());
	}
};
function L(e) {
	return /* @__PURE__ */ Kt(e) ? e.value : e;
}
var Yt = {
	get: (e, t, n) => t === "__v_raw" ? e : L(Reflect.get(e, t, n)),
	set: (e, t, n, r) => {
		let i = e[t];
		return /* @__PURE__ */ Kt(i) && !/* @__PURE__ */ Kt(n) ? (i.value = n, !0) : Reflect.set(e, t, n, r);
	}
};
function Xt(e) {
	return /* @__PURE__ */ zt(e) ? e : new Proxy(e, Yt);
}
var Zt = class {
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
function Qt(e, t, n = !1) {
	let r, i;
	return h(e) ? r = e : (r = e.get, i = e.set), new Zt(r, i, n);
}
var $t = {}, en = /* @__PURE__ */ new WeakMap(), tn = void 0;
function nn(e, t = !1, n = tn) {
	if (n) {
		let t = en.get(n);
		t || en.set(n, t = []), t.push(e);
	}
}
function rn(e, n, i = t) {
	let { immediate: a, deep: o, once: s, scheduler: l, augmentJob: u, call: f } = i, p = (e) => o ? e : /* @__PURE__ */ Vt(e) || o === !1 || o === 0 ? an(e, 1) : an(e), m, g, _, v, y = !1, b = !1;
	if (/* @__PURE__ */ Kt(e) ? (g = () => e.value, y = /* @__PURE__ */ Vt(e)) : /* @__PURE__ */ zt(e) ? (g = () => p(e), y = !0) : d(e) ? (b = !0, y = e.some((e) => /* @__PURE__ */ zt(e) || /* @__PURE__ */ Vt(e)), g = () => e.map((e) => {
		if (/* @__PURE__ */ Kt(e)) return e.value;
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
		let t = tn;
		tn = m;
		try {
			return f ? f(e, 3, [v]) : e(v);
		} finally {
			tn = t;
		}
	} : r, n && o) {
		let e = g, t = o === !0 ? Infinity : o;
		g = () => an(e(), t);
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
	let C = b ? Array(e.length).fill($t) : $t, w = (e) => {
		if (m.flags & 1 && (m.dirty || e)) {
			if (n) {
				let t = m.run();
				if (e || o || y || (b ? t.some((e, t) => k(e, C[t])) : k(t, C))) {
					let e = tn;
					Ue();
					try {
						_ && _(), tn = m;
						let e = [
							t,
							C === $t ? void 0 : b && C[0] === $t ? [] : C,
							v
						];
						C = t, f ? f(n, 3, e) : n(...e);
					} finally {
						tn = e, We();
					}
				}
			} else m.run();
		}
	};
	return u && u(w), m = new Oe(g), m.scheduler = l ? () => l(w, !1) : w, v = (e) => nn(e, !1, m), _ = m.onStop = () => {
		let e = en.get(m);
		if (e) {
			if (f) f(e, 4);
			else for (let t of e) t();
			en.delete(m);
		}
	}, n ? a ? w(!0) : C = m.run() : l ? l(w.bind(null, !0), !0) : m.run(), S.pause = m.pause.bind(m), S.resume = m.resume.bind(m), S.stop = S, S;
}
function an(e, t = Infinity, n) {
	if (t <= 0 || !v(e) || e.__v_skip || (n ||= /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t)) return e;
	if (n.set(e, t), t--, /* @__PURE__ */ Kt(e)) an(e.value, t, n);
	else if (d(e)) for (let r = 0; r < e.length; r++) an(e[r], t, n);
	else if (p(e) || f(e)) e.forEach((e) => {
		an(e, t, n);
	});
	else if (C(e)) {
		for (let r in e) an(e[r], t, n);
		for (let r of Object.getOwnPropertySymbols(e)) Object.prototype.propertyIsEnumerable.call(e, r) && an(e[r], t, n);
	}
	return e;
}
// node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js
function on(e, t, n, r) {
	try {
		return r ? e(...r) : e();
	} catch (e) {
		cn(e, t, n);
	}
}
function sn(e, t, n, r) {
	if (h(e)) {
		let i = on(e, t, n, r);
		return i && y(i) && i.catch((e) => {
			cn(e, t, n, void 0, !0);
		}), i;
	}
	if (d(e)) {
		let i = [];
		for (let a = 0; a < e.length; a++) i.push(sn(e[a], t, n, r));
		return i;
	}
}
function cn(e, n, r, i = !0, a = !1) {
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
			Ue(), on(s, null, 10, [
				e,
				i,
				o
			]), We();
			return;
		}
	}
	ln(e, r, o, i, c);
}
function ln(e, t, n, r = !0, i = !1) {
	if (i) throw e;
	console.error(e);
}
var un = [], dn = -1, fn = [], pn = null, mn = 0, hn = /* @__PURE__ */ Promise.resolve(), gn = null;
function _n(e) {
	let t = gn || hn;
	return e ? t.then(this ? e.bind(this) : e) : t;
}
function vn(e) {
	let t = dn + 1, n = un.length;
	for (; t < n;) {
		let r = t + n >>> 1, i = un[r], a = En(i);
		a < e || a === e && i.flags & 2 ? t = r + 1 : n = r;
	}
	return t;
}
function yn(e) {
	if (!(e.flags & 1)) {
		let t = En(e), n = un[un.length - 1];
		!n || !(e.flags & 2) && t >= En(n) ? un.push(e) : un.splice(vn(t), 0, e), e.flags |= 1, bn();
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
	for (; r < un.length; r++) {
		let n = un[r];
		if (n && n.flags & 2) {
			if (e && n.id !== e.uid || t !== void 0 && !(n.id >= t)) continue;
			un.splice(r, 1), r = e ? r - 1 : dn, n.flags & 4 && (n.flags &= -2), n(), n.flags & 4 || (n.flags &= -2);
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
		for (dn = 0; dn < un.length; dn++) {
			let e = un[dn];
			e && !(e.flags & 8) && (e.flags & 4 && (e.flags &= -2), on(e, e.i, e.i ? 15 : 14), e.flags & 4 || (e.flags &= -2));
		}
	} finally {
		for (; dn < un.length; dn++) {
			let e = un[dn];
			e && (e.flags &= -2);
		}
		dn = -1, un.length = 0, Cn(e), gn = null, (un.length || fn.length) && Dn(e);
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
		r._d && li(-1);
		let i = An(t), a = ai.length, o;
		try {
			o = e(...n);
		} finally {
			for (let e = ai.length; e > a; e--) si();
			An(i), r._d && li(1);
		}
		return o;
	};
	return r._n = !0, r._c = !0, r._d = !0, r;
}
function R(e, n) {
	if (On === null) return e;
	let r = Ui(On), i = e.dirs ||= [];
	for (let e = 0; e < n.length; e++) {
		let [a, o, s, c = t] = n[e];
		a && (h(a) && (a = {
			mounted: a,
			updated: a
		}), a.deep && an(o), i.push({
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
		u && (Ue(), sn(u, n, 8, [
			e.el,
			l,
			i,
			t
		]), We());
	}
}
function Nn(e, t) {
	if (Oi) {
		let n = Oi.provides, r = Oi.parent && Oi.parent.provides;
		r === n && (n = Oi.provides = Object.create(r)), n[e] = t;
	}
}
function Pn(e, t, n = !1) {
	let r = ki();
	if (r || fr) {
		let i = fr ? fr._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
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
	if (Fi) {
		if (c === "sync") {
			let e = In();
			f = e.__watcherHandles ||= [];
		} else if (!d) {
			let e = () => {};
			return e.stop = r, e.resume = r, e.pause = r, e;
		}
	}
	let p = Oi;
	u.call = (e, t, n) => sn(e, p, t, n);
	let m = !1;
	c === "post" ? u.scheduler = (e) => {
		e.i = p, Hr(e, p && p.suspense);
	} : c !== "sync" && (m = !0, u.scheduler = (e, t) => {
		t ? e() : yn(e);
	}), u.augmentJob = (e) => {
		n && (e.flags |= 4), m && (e.flags |= 2, p && (e.id = p.uid, e.i = p));
	};
	let h = rn(e, n, u);
	return Fi && (f ? f.push(h) : d && h()), h;
}
var zn = /* @__PURE__ */ Symbol("_vte"), Bn = (e) => e.__isTeleport, Vn = /* @__PURE__ */ Symbol("_leaveCb");
function Hn(e) {
	let t = e[0];
	if (e.length > 1) {
		for (let n of e) if (n.type !== ri) {
			t = n;
			break;
		}
	}
	return t;
}
function Un(e) {
	if (!$n(e)) return Bn(e.type) && e.children ? Hn(e.children) : e;
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
	} else if (e.transition = t, e.type === B && d(e.children)) {
		let n = vr(e.children, !1);
		n && Wn(n, t);
	}
}
function Gn(e) {
	if (e.component) return Gn(e.component.subTree);
	if (e.type === B) {
		let t = d(e.children) && vr(e.children, !1);
		return t ? Gn(t) : void 0;
	}
	if (e.type !== ri) return e;
}
// @__NO_SIDE_EFFECTS__
function Kn(e, t) {
	return h(e) ? /* @__PURE__ */ s({ name: e.name }, t, { setup: e }) : e;
}
function qn(e) {
	e.ids = [
		e.ids[0] + e.ids[2]++ + "-",
		0,
		0
	];
}
function Jn(e, t) {
	let n;
	return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
}
var Yn = /* @__PURE__ */ new WeakMap();
function Xn(e, n, r, a, o = !1) {
	if (d(e)) {
		e.forEach((e, t) => Xn(e, n && (d(n) ? n[t] : n), r, a, o));
		return;
	}
	if (Qn(a) && !o) {
		a.shapeFlag & 512 && a.type.__asyncResolved && a.component.subTree.component && Xn(e, n, r, a.component.subTree);
		return;
	}
	let s = a.shapeFlag & 4 ? Ui(a.component) : a.el, l = o ? null : s, { i: f, r: p } = e, m = n && n.r, _ = f.refs === t ? f.refs = {} : f.refs, v = f.setupState, y = /* @__PURE__ */ F(v), b = v === t ? i : (e) => !Jn(_, e) && u(y, e), x = (e, t) => !(t && Jn(_, t));
	if (m != null && m !== p) {
		if (Zn(n), g(m)) _[m] = null, b(m) && (v[m] = null);
		else if (/* @__PURE__ */ Kt(m)) {
			let e = n;
			x(m, e.k) && (m.value = null), e.k && (_[e.k] = null);
		}
	}
	if (h(p)) on(p, f, 12, [l, _]);
	else {
		let t = g(p), n = /* @__PURE__ */ Kt(p);
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
					i(), Yn.delete(e);
				};
				t.id = -1, Yn.set(e, t), Hr(t, r);
			} else Zn(e), i();
		}
	}
}
function Zn(e) {
	let t = Yn.get(e);
	t && (t.flags |= 8, Yn.delete(e));
}
ce().requestIdleCallback, ce().cancelIdleCallback;
var Qn = (e) => !!e.type.__asyncLoader, $n = (e) => e.type.__isKeepAlive;
function er(e, t, n = Oi, r = !1) {
	if (n) {
		let i = n[e] || (n[e] = []), a = t.__weh ||= (...r) => {
			Ue();
			let i = Mi(n), a = sn(t, n, e, r);
			return i(), We(), a;
		};
		return r ? i.unshift(a) : i.push(a), a;
	}
}
var tr = (e) => (t, n = Oi) => {
	Fi && e !== "sp" || er(e, (...e) => t(...e), n);
}, nr = tr("m"), rr = tr("bum"), ir = /* @__PURE__ */ Symbol.for("v-ndc");
function z(e, t, n, r) {
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
var ar = (e) => e ? Pi(e) ? Ui(e) : ar(e.parent) : null, or = /* @__PURE__ */ s(/* @__PURE__ */ Object.create(null), {
	$: (e) => e,
	$el: (e) => e.vnode.el,
	$data: (e) => e.data,
	$props: (e) => e.props,
	$attrs: (e) => e.attrs,
	$slots: (e) => e.slots,
	$refs: (e) => e.refs,
	$parent: (e) => ar(e.parent),
	$root: (e) => ar(e.root),
	$host: (e) => e.ce,
	$emit: (e) => e.emit,
	$options: (e) => e.type,
	$forceUpdate: (e) => e.f ||= () => {
		yn(e.update);
	},
	$nextTick: (e) => e.n ||= _n.bind(e.proxy),
	$watch: (e) => r
}), sr = (e, n) => e !== t && !e.__isScriptSetup && u(e, n), cr = {
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
			else if (sr(i, n)) return s[n] = 1, i[n];
			else if (u(o, n)) return s[n] = 3, o[n];
			else if (r !== t && u(r, n)) return s[n] = 4, r[n];
			else s[n] = 0;
		}
		let d = or[n], f, p;
		if (d) return n === "$attrs" && P(e.attrs, "get", ""), d(e);
		if ((f = c.__cssModules) && (f = f[n])) return f;
		if (r !== t && u(r, n)) return s[n] = 4, r[n];
		if (p = l.config.globalProperties, u(p, n)) return p[n];
	},
	set({ _: e }, t, n) {
		let { data: r, setupState: i, ctx: a } = e;
		return sr(i, t) ? (i[t] = n, !0) : u(e.props, t) || t[0] === "$" && t.slice(1) in e ? !1 : (a[t] = n, !0);
	},
	has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: a, type: o } }, s) {
		let c;
		return !!(n[s] || sr(t, s) || u(a, s) || u(r, s) || u(or, s) || u(i.config.globalProperties, s) || (c = o.__cssModules) && c[s]);
	},
	defineProperty(e, t, n) {
		return n.get == null ? u(n, "value") && this.set(e, t, n.value, null) : e._.accessCache[t] = 0, Reflect.defineProperty(e, t, n);
	}
};
function lr() {
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
var ur = 0;
function dr(e, t) {
	return function(n, r = null) {
		h(n) || (n = s({}, n)), r != null && !v(r) && (r = null);
		let i = lr(), a = /* @__PURE__ */ new WeakSet(), o = [], c = !1, l = i.app = {
			_uid: ur++,
			_component: n,
			_props: r,
			_container: null,
			_context: i,
			_instance: null,
			version: Gi,
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
					let u = l._ceVNode || W(n, r);
					return u.appContext = i, s === !0 ? s = "svg" : s === !1 && (s = void 0), o && t ? t(u, a) : e(u, a, s), c = !0, l._container = a, a.__vue_app__ = l, Ui(u.component);
				}
			},
			onUnmount(e) {
				o.push(e);
			},
			unmount() {
				c && (sn(o, l._instance, 16), e(null, l._container), delete l._container.__vue_app__);
			},
			provide(e, t) {
				return i.provides[e] = t, l;
			},
			runWithContext(e) {
				let t = fr;
				fr = l;
				try {
					return e();
				} finally {
					fr = t;
				}
			}
		};
		return l;
	};
}
var fr = null, pr = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${D(t)}Modifiers`] || e[`${O(t)}Modifiers`];
function mr(e, n, ...r) {
	if (e.isUnmounted) return;
	let i = e.vnode.props || t, a = r, o = n.startsWith("update:"), s = o && pr(i, n.slice(7));
	s && (s.trim && (a = r.map((e) => g(e) ? e.trim() : e)), s.number && (a = a.map(oe)));
	let c, l = i[c = re(n)] || i[c = re(D(n))];
	!l && o && (l = i[c = re(O(n))]), l && sn(l, e, 6, a);
	let u = i[c + "Once"];
	if (u) {
		if (!e.emitted) e.emitted = {};
		else if (e.emitted[c]) return;
		e.emitted[c] = !0, sn(u, e, 6, a);
	}
}
function hr(e, t, n = !1) {
	let r = t.emitsCache, i = r.get(e);
	if (i !== void 0) return i;
	let a = e.emits, o = {};
	return a ? (d(a) ? a.forEach((e) => o[e] = null) : s(o, a), v(e) && r.set(e, o), o) : (v(e) && r.set(e, null), null);
}
function gr(e, t) {
	return !e || !a(t) ? !1 : (t = t.slice(2), t = t === "Once" ? t : t.replace(/Once$/, ""), u(e, t[0].toLowerCase() + t.slice(1)) || u(e, O(t)) || u(e, t));
}
function _r(e) {
	let { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [a], slots: s, attrs: c, emit: l, render: u, renderCache: d, props: f, data: p, setupState: m, ctx: h, inheritAttrs: g } = e, _ = An(e), v, y;
	try {
		if (n.shapeFlag & 4) {
			let e = i || r, t = e;
			v = yi(u.call(t, e, d, f, m, p, h)), y = c;
		} else {
			let e = t;
			v = yi(e.length > 1 ? e(f, {
				attrs: c,
				slots: s,
				emit: l
			}) : e(f, null)), y = t.props ? c : yr(c);
		}
	} catch (t) {
		ai.length = 0, cn(t, e, 1), v = W(ri);
	}
	let b = v;
	if (y && g !== !1) {
		let e = Object.keys(y), { shapeFlag: t } = b;
		e.length && t & 7 && (a && e.some(o) && (y = br(y, a)), b = vi(b, y, !1, !0));
	}
	return n.dirs && (b = vi(b, null, !1, !0), b.dirs = b.dirs ? b.dirs.concat(n.dirs) : n.dirs), n.transition && Wn(Bn(b.type) && Un(b) || b, n.transition), v = b, An(_), v;
}
function vr(e, t = !0) {
	let n;
	for (let t = 0; t < e.length; t++) {
		let r = e[t];
		if (fi(r)) {
			if (r.type !== ri || r.children === "v-if") {
				if (n) return;
				n = r;
			}
		} else return;
	}
	return n;
}
var yr = (e) => {
	let t;
	for (let n in e) (n === "class" || n === "style" || a(n)) && ((t ||= {})[n] = e[n]);
	return t;
}, br = (e, t) => {
	let n = {};
	for (let r in e) o(r) && r.slice(9) in t || (n[r] = e[r]);
	return n;
};
function xr(e, t, n) {
	let { props: r, children: i, component: a } = e, { props: o, children: s, patchFlag: c } = t, l = a.emitsOptions;
	if (t.dirs || t.transition) return !0;
	if (n && c >= 0) {
		if (c & 1024) return !0;
		if (c & 16) return r ? Sr(r, o, l) : !!o;
		if (c & 8) {
			let e = t.dynamicProps;
			for (let t = 0; t < e.length; t++) {
				let n = e[t];
				if (Cr(o, r, n) && !gr(l, n)) return !0;
			}
		}
	} else return (i || s) && (!s || !s.$stable) ? !0 : r === o ? !1 : r ? !o || Sr(r, o, l) : !!o;
	return !1;
}
function Sr(e, t, n) {
	let r = Object.keys(t);
	if (r.length !== Object.keys(e).length) return !0;
	for (let i = 0; i < r.length; i++) {
		let a = r[i];
		if (!u(e, a) || Cr(t, e, a) && !gr(n, a)) return !0;
	}
	return !1;
}
function Cr(e, t, n) {
	let r = e[n], i = t[n];
	return n === "style" && v(r) && v(i) ? !be(r, i) : r !== i;
}
function wr({ vnode: e, parent: t, suspense: n }, r) {
	for (; t;) {
		let n = t.subTree;
		if (n.suspense && n.suspense.activeBranch === e && (n.suspense.vnode.el = n.el = r, e = n), n === e) (e = t.vnode).el = r, t = t.parent;
		else break;
	}
	n && n.activeBranch === e && (n.vnode.el = r);
}
var Tr = {}, Er = () => Object.create(Tr), Dr = (e) => Object.getPrototypeOf(e) === Tr;
function Or(e, t, n, r = !1) {
	let i = {}, a = Er();
	e.propsDefaults = /* @__PURE__ */ Object.create(null), Ar(e, t, i, a);
	for (let t in e.propsOptions[0]) t in i || (i[t] = void 0);
	e.props = n ? r ? i : /* @__PURE__ */ It(i) : e.type.props ? i : a, e.attrs = a;
}
function kr(e, t, n, r) {
	let { props: i, attrs: a, vnode: { patchFlag: o } } = e, s = /* @__PURE__ */ F(i), [c] = e.propsOptions, l = !1;
	if ((r || o > 0) && !(o & 16)) {
		if (o & 8) {
			let n = e.vnode.dynamicProps;
			for (let r = 0; r < n.length; r++) {
				let o = n[r];
				if (gr(e.emitsOptions, o)) continue;
				let d = t[o];
				if (c) {
					if (u(a, o)) d !== a[o] && (a[o] = d, l = !0);
					else {
						let t = D(o);
						i[t] = jr(c, s, t, d, e, !1);
					}
				} else d !== a[o] && (a[o] = d, l = !0);
			}
		}
	} else {
		Ar(e, t, i, a) && (l = !0);
		let r;
		for (let a in s) t && (u(t, a) || (r = O(a)) !== a && u(t, r)) || (c ? n && (n[a] !== void 0 || n[r] !== void 0) && (i[a] = jr(c, s, a, void 0, e, !0)) : delete i[a]);
		if (a !== s) for (let e in a) t && u(t, e) || (delete a[e], l = !0);
	}
	l && et(e.attrs, "set", "");
}
function Ar(e, n, r, i) {
	let [a, o] = e.propsOptions, s = !1, c;
	if (n) for (let t in n) {
		if (T(t)) continue;
		let l = n[t], d;
		a && u(a, d = D(t)) ? !o || !o.includes(d) ? r[d] = l : (c ||= {})[d] = l : gr(e.emitsOptions, t) || t in i && l === i[t] || (i[t] = l, s = !0);
	}
	if (o) {
		let n = /* @__PURE__ */ F(r), i = c || t;
		for (let t = 0; t < o.length; t++) {
			let s = o[t];
			r[s] = jr(a, n, s, i[s], e, !u(i, s));
		}
	}
	return s;
}
function jr(e, t, n, r, i, a) {
	let o = e[n];
	if (o != null) {
		let e = u(o, "default");
		if (e && r === void 0) {
			let e = o.default;
			if (o.type !== Function && !o.skipFactory && h(e)) {
				let { propsDefaults: a } = i;
				if (n in a) r = a[n];
				else {
					let o = Mi(i);
					r = a[n] = e.call(null, t), o();
				}
			} else r = e;
			i.ce && i.ce._setProp(n, r);
		}
		o[0] && (a && !e ? r = !1 : o[1] && (r === "" || r === O(n)) && (r = !0));
	}
	return r;
}
function Mr(e, r, i = !1) {
	let a = r.propsCache, o = a.get(e);
	if (o) return o;
	let c = e.props, l = {}, f = [];
	if (!c) return v(e) && a.set(e, n), n;
	if (d(c)) for (let e = 0; e < c.length; e++) {
		let n = D(c[e]);
		Nr(n) && (l[n] = t);
	}
	else if (c) for (let e in c) {
		let t = D(e);
		if (Nr(t)) {
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
function Nr(e) {
	return e[0] !== "$" && !T(e);
}
var Pr = (e) => e === "_" || e === "_ctx" || e === "$stable", Fr = (e) => d(e) ? e.map(yi) : [yi(e)], Ir = (e, t, n) => {
	if (t._n) return t;
	let r = jn((...e) => Fr(t(...e)), n);
	return r._c = !1, r;
}, Lr = (e, t, n) => {
	let r = e._ctx;
	for (let n in e) {
		if (Pr(n)) continue;
		let i = e[n];
		if (h(i)) t[n] = Ir(n, i, r);
		else if (i != null) {
			let e = Fr(i);
			t[n] = () => e;
		}
	}
}, Rr = (e, t) => {
	let n = Fr(t);
	e.slots.default = () => n;
}, zr = (e, t, n) => {
	for (let r in t) (n || !Pr(r)) && (e[r] = t[r]);
}, Br = (e, t, n) => {
	let r = e.slots = Er();
	if (e.vnode.shapeFlag & 32) {
		let e = t._;
		e ? (zr(r, t, n), n && ae(r, "_", e, !0)) : Lr(t, r);
	} else t && Rr(e, t);
}, Vr = (e, n, r) => {
	let { vnode: i, slots: a } = e, o = !0, s = t;
	if (i.shapeFlag & 32) {
		let e = n._;
		e ? r && e === 1 ? o = !1 : zr(a, n, r) : (o = !n.$stable, Lr(n, a)), s = n;
	} else n && (Rr(e, n), s = { default: 1 });
	if (o) for (let e in a) !Pr(e) && s[e] == null && delete a[e];
}, Hr = ti;
function Ur(e) {
	return Wr(e);
}
function Wr(e, i) {
	let a = ce();
	a.__VUE__ = !0;
	let { insert: o, remove: s, patchProp: c, createElement: l, createText: u, createComment: d, setText: f, setElementText: p, parentNode: m, nextSibling: h, setScopeId: g = r, insertStaticContent: _ } = e, v = (e, t, r, i = null, a = null, o = null, s = void 0, c = null, l = !!t.dynamicChildren) => {
		if (e === t) return;
		e && !pi(e, t) && (i = ve(e), A(e, a, o, !0), e = null), t.patchFlag === -2 && (l = !1, t.dynamicChildren = null), t.dynamicChildren && e && e.dynamicChildren && e.dynamicChildren.hasOnce && (t.dynamicChildren === n && (t.dynamicChildren = []), t.dynamicChildren.hasOnce = !0);
		let { type: u, ref: d, shapeFlag: f } = t;
		switch (u) {
			case ni:
				y(e, t, r, i);
				break;
			case ri:
				b(e, t, r, i);
				break;
			case ii:
				e ?? x(t, r, i, s);
				break;
			case B:
				re(e, t, r, i, a, o, s, c, l);
				break;
			default: f & 1 ? w(e, t, r, i, a, o, s, c, l) : f & 6 ? k(e, t, r, i, a, o, s, c, l) : (f & 64 || f & 128) && u.process(e, t, r, i, a, o, s, c, l, be);
		}
		d != null && a ? Xn(d, e && e.ref, o, t || e, !t) : d == null && e && e.ref != null && Xn(e.ref, null, o, e, !0);
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
				n && n._beginPatch(), te(e, t, i, a, o, s, c);
			} finally {
				n && n._endPatch();
			}
		}
	}, ee = (e, t, n, r, i, a, s, u) => {
		let d, f, { props: m, shapeFlag: h, transition: g, dirs: _ } = e;
		if (d = e.el = l(e.type, a, m && m.is, m), h & 8 ? p(d, e.children) : h & 16 && D(e.children, d, null, r, i, Gr(e, a), s, u), _ && Mn(e, null, r, "created"), E(d, e, e.scopeId, s, r), m) {
			for (let e in m) e !== "value" && !T(e) && c(d, e, null, m[e], a, r);
			"value" in m && c(d, "value", null, m.value, a), (f = m.onVnodeBeforeMount) && Ci(f, r, e);
		}
		_ && Mn(e, null, r, "beforeMount");
		let v = qr(i, g);
		v ? g.beforeEnter(d) : g && !g.persisted && (d[ei] = !0), o(d, t, n), ((f = m && m.onVnodeMounted) || v || _) && Hr(() => {
			try {
				f && Ci(f, r, e), v && g.enter(d), _ && Mn(e, null, r, "mounted");
			} finally {}
		}, i);
	}, E = (e, t, n, r, i) => {
		if (n && g(e, n), r) for (let t = 0; t < r.length; t++) g(e, r[t]);
		if (i) {
			let n = i.subTree;
			if (t === n || $r(n.type) && (n.ssContent === t || n.ssFallback === t)) {
				let t = i.vnode;
				E(e, t, t.scopeId, t.slotScopeIds, i.parent);
			}
		}
	}, D = (e, t, n, r, i, a, o, s, c = 0) => {
		for (let l = c; l < e.length; l++) {
			let c = e[l] = s ? bi(e[l]) : yi(e[l]);
			v(null, c, t, n, r, i, a, o, s);
		}
	}, te = (e, n, r, i, a, o, s) => {
		let l = n.el = e.el, { patchFlag: u, dynamicChildren: d, dirs: f } = n;
		u |= e.patchFlag & 16;
		let m = e.props || t, h = n.props || t, g;
		if (r && Kr(r, !1), (g = h.onVnodeBeforeUpdate) && Ci(g, r, n, e), f && Mn(n, e, r, "beforeUpdate"), r && Kr(r, !0), d && (!e.dynamicChildren || e.dynamicChildren.length !== d.length) && (u = 0, s = !1, d = null), (m.innerHTML && h.innerHTML == null || m.textContent && h.textContent == null) && p(l, ""), d ? O(e.dynamicChildren, d, l, r, i, Gr(n, a), o) : s || ue(e, n, l, null, r, i, Gr(n, a), o, !1), u > 0) {
			if (u & 16) ne(l, m, h, r, a);
			else if (u & 2 && m.class !== h.class && c(l, "class", null, h.class, a), u & 4 && c(l, "style", m.style, h.style, a), u & 8) {
				let e = n.dynamicProps;
				for (let t = 0; t < e.length; t++) {
					let n = e[t], i = m[n], o = h[n];
					(o !== i || n === "value") && c(l, n, i, o, a, r);
				}
			}
			u & 1 && e.children !== n.children && p(l, n.children);
		} else !s && d == null && ne(l, m, h, r, a);
		((g = h.onVnodeUpdated) || f) && Hr(() => {
			g && Ci(g, r, n, e), f && Mn(n, e, r, "updated");
		}, i);
	}, O = (e, t, n, r, i, a, o) => {
		for (let s = 0; s < t.length; s++) {
			let c = e[s], l = t[s], u = c.el || Qr(c), d = u && (c.type === B || !pi(c, l) || c.shapeFlag & 198) ? m(u) : n;
			v(c, l, d, null, r, i, a, o, !0);
		}
	}, ne = (e, n, r, i, a) => {
		if (n !== r) {
			if (n !== t) for (let t in n) !T(t) && !(t in r) && c(e, t, n[t], null, a, i);
			for (let t in r) {
				if (T(t)) continue;
				let o = r[t], s = n[t];
				o !== s && t !== "value" && c(e, t, s, o, a, i);
			}
			"value" in r && c(e, "value", n.value, r.value, a);
		}
	}, re = (e, t, n, r, i, a, s, c, l) => {
		let d = t.el = e ? e.el : u(""), f = t.anchor = e ? e.anchor : u(""), { patchFlag: p, dynamicChildren: m, slotScopeIds: h } = t;
		h && (c = c ? c.concat(h) : h), e == null ? (o(d, n, r), o(f, n, r), D(t.children || [], n, f, i, a, s, c, l)) : p > 0 && p & 64 && m && e.dynamicChildren && e.dynamicChildren.length === m.length ? (O(e.dynamicChildren, m, n, i, a, s, c), (t.key != null || i && t === i.subTree) && Jr(e, t, !0)) : ue(e, t, n, f, i, a, s, c, l);
	}, k = (e, t, n, r, i, a, o, s, c) => {
		t.slotScopeIds = s, e == null ? t.shapeFlag & 512 ? i.ctx.activate(t, n, r, o, c) : ae(t, n, r, i, a, o, c) : oe(e, t, c);
	}, ae = (e, t, n, r, i, a, o) => {
		let s = e.component = Di(e, r, i);
		if ($n(e) && (s.ctx.renderer = be), Ii(s, !1, o), s.asyncDep) {
			if (i && i.registerDep(s, se, o, a), !e.el) {
				let r = s.subTree = W(ri);
				b(null, r, t, n), e.placeholder = r.el;
			}
		} else se(s, e, t, n, i, a, o);
	}, oe = (e, t, n) => {
		let r = t.component = e.component;
		if (xr(e, t, n)) {
			if (r.asyncDep && !r.asyncResolved) {
				t.el = e.el, t.placeholder = e.placeholder, le(r, t, n);
				return;
			}
			r.next = t, r.update();
		} else t.el = e.el, t.placeholder = e.placeholder, r.vnode = t;
	}, se = (e, t, n, r, i, a, o) => {
		let s = () => {
			if (e.isMounted) {
				let { next: t, bu: n, u: r, parent: s, vnode: c } = e;
				{
					let n = Xr(e);
					if (n) {
						t && (t.el = c.el, le(e, t, o)), n.asyncDep.then(() => {
							let t = () => {
								e.job.flags & 8 || (i && i.pendingBranch ? Hr(t, i) : l());
							};
							t.flags = 48, Hr(t, i);
						});
						return;
					}
				}
				let u = t, d;
				Kr(e, !1), t ? (t.el = c.el, le(e, t, o)) : t = c, n && ie(n), (d = t.props && t.props.onVnodeBeforeUpdate) && Ci(d, s, t, c), Kr(e, !0);
				let f = _r(e), p = e.subTree;
				e.subTree = f, v(p, f, m(p.el || Qr(p)), ve(p), e, i, a), t.el = f.el, u === null && wr(e, f.el), r && Hr(r, i), (d = t.props && t.props.onVnodeUpdated) && Hr(() => Ci(d, s, t, c), i);
			} else {
				let o, { el: s, props: c } = t, { bm: l, m: u, parent: d, root: f, type: p } = e, m = Qn(t);
				if (Kr(e, !1), l && ie(l), !m && (o = c && c.onVnodeBeforeMount) && Ci(o, d, t), Kr(e, !0), s && Se) {
					let t = () => {
						e.subTree = _r(e), Se(s, e.subTree, e, i, null);
					};
					m && p.__asyncHydrate ? p.__asyncHydrate(s, e, t) : t();
				} else {
					f.ce && f.ce._hasShadowRoot() && f.ce._injectChildStyle(p, e.parent ? e.parent.type : void 0);
					let o = e.subTree = _r(e);
					v(null, o, n, r, e, i, a), t.el = o.el;
				}
				if (u && Hr(u, i), !m && (o = c && c.onVnodeMounted)) {
					let e = t;
					Hr(() => Ci(o, d, e), i);
				}
				(t.shapeFlag & 256 || d && Qn(d.vnode) && d.vnode.shapeFlag & 256) && e.a && Hr(e.a, i), e.isMounted = !0, t = n = r = null;
			}
		};
		e.scope.on();
		let c = e.effect = new Oe(s);
		e.scope.off();
		let l = e.update = c.run.bind(c), u = e.job = c.runIfDirty.bind(c);
		u.i = e, u.id = e.uid, c.scheduler = () => yn(u), Kr(e, !0), l();
	}, le = (e, t, n) => {
		t.component = e;
		let r = e.vnode.props;
		e.vnode = t, e.next = null, kr(e, t.props, r, n), Vr(e, t.children, n), Ue(), Sn(e), We();
	}, ue = (e, t, n, r, i, a, o, s, c = !1) => {
		let l = e && e.children, u = e ? e.shapeFlag : 0, d = t.children, { patchFlag: f, shapeFlag: m } = t;
		if (f > 0) {
			if (f & 128) {
				fe(l, d, n, r, i, a, o, s, c);
				return;
			}
			if (f & 256) {
				de(l, d, n, r, i, a, o, s, c);
				return;
			}
		}
		m & 8 ? (u & 16 && _e(l, i, a), d !== l && p(n, d)) : u & 16 ? m & 16 ? fe(l, d, n, r, i, a, o, s, c) : _e(l, i, a, !0) : (u & 8 && p(n, ""), m & 16 && D(d, n, r, i, a, o, s, c));
	}, de = (e, t, r, i, a, o, s, c, l) => {
		e ||= n, t ||= n;
		let u = e.length, d = t.length, f = Math.min(u, d), p = 0;
		for (; p < f; p++) {
			let n = t[p] = l ? bi(t[p]) : yi(t[p]);
			v(e[p], n, r, null, a, o, s, c, l);
		}
		u > d ? _e(e, a, o, !0, !1, f) : D(t, r, i, a, o, s, c, l, f);
	}, fe = (e, t, r, i, a, o, s, c, l) => {
		let u = 0, d = t.length, f = e.length - 1, p = d - 1;
		for (; u <= f && u <= p;) {
			let n = e[u], i = t[u] = l ? bi(t[u]) : yi(t[u]);
			if (pi(n, i)) v(n, i, r, null, a, o, s, c, l);
			else break;
			u++;
		}
		for (; u <= f && u <= p;) {
			let n = e[f], i = t[p] = l ? bi(t[p]) : yi(t[p]);
			if (pi(n, i)) v(n, i, r, null, a, o, s, c, l);
			else break;
			f--, p--;
		}
		if (u > f) {
			if (u <= p) {
				let e = p + 1, n = e < d ? t[e].el : i;
				for (; u <= p;) v(null, t[u] = l ? bi(t[u]) : yi(t[u]), r, n, a, o, s, c, l), u++;
			}
		} else if (u > p) for (; u <= f;) A(e[u], a, o, !0), u++;
		else {
			let m = u, h = u, g = /* @__PURE__ */ new Map();
			for (u = h; u <= p; u++) {
				let e = t[u] = l ? bi(t[u]) : yi(t[u]);
				e.key != null && g.set(e.key, u);
			}
			let _, y = 0, b = p - h + 1, x = !1, S = 0, C = Array(b);
			for (u = 0; u < b; u++) C[u] = 0;
			for (u = m; u <= f; u++) {
				let n = e[u];
				if (y >= b) {
					A(n, a, o, !0);
					continue;
				}
				let i;
				if (n.key != null) i = g.get(n.key);
				else for (_ = h; _ <= p; _++) if (C[_ - h] === 0 && pi(n, t[_])) {
					i = _;
					break;
				}
				i === void 0 ? A(n, a, o, !0) : (C[i - h] = u + 1, i >= S ? S = i : x = !0, v(n, t[i], r, null, a, o, s, c, l), y++);
			}
			let w = x ? Yr(C) : n;
			for (_ = w.length - 1, u = b - 1; u >= 0; u--) {
				let e = h + u, n = t[e], f = t[e + 1], p = e + 1 < d ? f.el || Qr(f) : i;
				C[u] === 0 ? v(null, n, r, p, a, o, s, c, l) : x && (_ < 0 || u !== w[_] ? pe(n, r, p, 2) : _--);
			}
		}
	}, pe = (e, t, n, r, i = null) => {
		let { el: a, type: c, transition: l, children: u, shapeFlag: d } = e;
		if (d & 6) pe(e.component.subTree, t, n, r);
		else if (d & 128) e.suspense.move(t, n, r);
		else if (d & 64) c.move(e, t, n, be);
		else if (c === B) {
			o(a, t, n);
			for (let e = 0; e < u.length; e++) pe(u[e], t, n, r);
			o(e.anchor, t, n);
		} else if (c === ii) S(e, t, n);
		else if (r !== 2 && d & 1 && l) {
			if (r === 0) l.persisted && !a[Vn] ? o(a, t, n) : (l.beforeEnter(a), o(a, t, n), Hr(() => l.enter(a), i));
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
	}, A = (e, t, n, r = !1, i = !1) => {
		let { type: a, props: o, ref: s, children: c, dynamicChildren: l, shapeFlag: u, patchFlag: d, dirs: f, cacheIndex: p, memo: m } = e;
		if ((d === -2 || l && l.hasOnce) && (i = !1), s != null && (Ue(), Xn(s, null, n, e, !0), We()), p == null || e.ctx && e.ctx !== t || (t.renderCache[p] = void 0), u & 256 && t.ctx.deactivate(e)) return;
		let h = u & 1 && f, g = !Qn(e), _;
		if (g && (_ = o && o.onVnodeBeforeUnmount) && Ci(_, t, e), u & 6) ge(e.component, n, r);
		else {
			if (u & 128) {
				e.suspense.unmount(n, r);
				return;
			}
			h && Mn(e, null, t, "beforeUnmount"), u & 64 ? e.type.remove(e, t, n, be, r) : l && !l.hasOnce && (a !== B || d > 0 && d & 64) ? _e(l, t, n, !1, !0) : (a === B && d & 384 || !i && u & 16) && _e(c, t, n), r && me(e);
		}
		let v = m != null && p == null;
		(g && (_ = o && o.onVnodeUnmounted) || h || v) && Hr(() => {
			_ && Ci(_, t, e), h && Mn(e, null, t, "unmounted"), v && (e.el = null);
		}, n);
	}, me = (e) => {
		let { type: t, el: n, anchor: r, transition: i } = e, a = t === B;
		if (a && !i) {
			he(n, r);
			return;
		}
		if (t === ii) {
			C(e), i && !i.persisted && i.afterLeave && i.afterLeave();
			return;
		}
		let o = a ? Gn(e) : e, c = () => {
			a ? m(n) && he(n, r) : s(n), i && !i.persisted && i.afterLeave && i.afterLeave();
		};
		if (o && o.shapeFlag & 1 && i && !i.persisted) {
			let { leave: e, delayLeave: t } = i, n = o.el, r = () => e(n, c);
			t ? t(n, c, r) : r();
		} else c();
	}, he = (e, t) => {
		let n;
		for (; e !== t;) n = h(e), s(e), e = n;
		s(t);
	}, ge = (e, t, n) => {
		let { bum: r, scope: i, job: a, subTree: o, um: s, m: c, a: l } = e;
		Zr(c), Zr(l), r && ie(r), i.stop(), a ? (a.flags |= 8, A(o, e, t, n)) : o && (o.transition = e.vnode.transition, A(o, e, t, n)), s && Hr(s, t);
		let u = () => {
			e.isUnmounted = !0;
		};
		u.flags = 16, Hr(u, t);
	}, _e = (e, t, n, r = !1, i = !1, a = 0) => {
		for (let o = a; o < e.length; o++) A(e[o], t, n, r, i);
	}, ve = (e) => {
		if (e.shapeFlag & 6) return ve(e.component.subTree);
		if (e.shapeFlag & 128) return e.suspense.next();
		let t = h(e.anchor || e.el), n = t && t[zn];
		return n ? h(n) : t;
	}, ye = (e, t, n) => {
		Tn(() => {
			e == null ? t._vnode && A(t._vnode, null, null, !0) : v(t._vnode || null, e, t, null, null, null, n), t._vnode = e;
		}, e && t._vnode ? void 0 : e && e.component ? e.component.uid : Ei());
	}, be = {
		p: v,
		um: A,
		m: pe,
		r: me,
		mt: ae,
		mc: D,
		pc: ue,
		pbc: O,
		n: ve,
		o: e
	}, xe, Se;
	return i && ([xe, Se] = i(be)), {
		render: ye,
		hydrate: xe,
		createApp: dr(ye, xe)
	};
}
function Gr({ type: e, props: t }, n) {
	return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function Kr({ effect: e, job: t }, n) {
	n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function qr(e, t) {
	return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function Jr(e, t, n = !1) {
	let r = e.children, i = t.children;
	if (d(r) && d(i)) for (let e = 0; e < r.length; e++) {
		let t = r[e], a = i[e];
		a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[e] = bi(i[e]), a.el = t.el), !n && a.patchFlag !== -2 && Jr(t, a)), a.type === ni && (a.patchFlag === -1 && (a = i[e] = bi(a)), a.el = t.el), a.type === ri && !a.el && (a.el = t.el);
	}
}
function Yr(e) {
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
function Xr(e) {
	let t = e.subTree.component;
	if (t) return t.asyncDep && !t.asyncResolved ? t : Xr(t);
}
function Zr(e) {
	if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
function Qr(e) {
	if (e.placeholder) return e.placeholder;
	let t = e.component;
	if (t) return Qr(t.subTree);
	let n = e.suspense;
	return n && n.activeBranch ? Qr(n.activeBranch) : null;
}
var $r = (e) => e.__isSuspense, ei = /* @__PURE__ */ Symbol("_deferredEnter");
function ti(e, t) {
	t && t.pendingBranch ? d(e) ? t.effects.push(...e) : t.effects.push(e) : xn(e);
}
var B = /* @__PURE__ */ Symbol.for("v-fgt"), ni = /* @__PURE__ */ Symbol.for("v-txt"), ri = /* @__PURE__ */ Symbol.for("v-cmt"), ii = /* @__PURE__ */ Symbol.for("v-stc"), ai = [], oi = null;
function V(e = !1) {
	ai.push(oi = e ? null : []);
}
function si() {
	ai.pop(), oi = ai[ai.length - 1] || null;
}
var ci = 1;
function li(e, t = !1) {
	ci += e, e < 0 && oi && t && (oi.hasOnce = !0);
}
function ui(e) {
	return e.dynamicChildren = ci > 0 ? oi || n : null, si(), ci > 0 && oi && oi.push(e), e;
}
function H(e, t, n, r, i, a) {
	return ui(U(e, t, n, r, i, a, !0));
}
function di(e, t, n, r, i) {
	return ui(W(e, t, n, r, i, !0));
}
function fi(e) {
	return e ? e.__v_isVNode === !0 : !1;
}
function pi(e, t) {
	return e.type === t.type && e.key === t.key;
}
var mi = ({ key: e }) => e ?? null, hi = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e == null ? null : g(e) || /* @__PURE__ */ Kt(e) || h(e) ? {
	i: On,
	r: e,
	k: t,
	f: !!n
} : e);
function U(e, t = null, n = null, r = 0, i = null, a = e === B ? 0 : 1, o = !1, s = !1) {
	let c = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e,
		props: t,
		key: t && mi(t),
		ref: t && hi(t),
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
	return s ? (xi(c, n), a & 128 && e.normalize(c)) : n && (c.shapeFlag |= g(n) ? 8 : 16), ci > 0 && !o && oi && (c.patchFlag > 0 || a & 6) && c.patchFlag !== 32 && oi.push(c), c;
}
var W = gi;
function gi(e, t = null, n = null, r = 0, i = null, a = !1) {
	if (e && e !== ir || (e = ri), fi(e)) {
		let r = vi(e, t, !0);
		return n && xi(r, n), ci > 0 && !a && oi && (r.shapeFlag & 6 ? oi[oi.indexOf(e)] = r : oi.push(r)), r.patchFlag = -2, r;
	}
	if (Wi(e) && (e = e.__vccOpts), t) {
		t = _i(t);
		let { class: e, style: n } = t;
		e && !g(e) && (t.class = A(e)), v(n) && (/* @__PURE__ */ Ht(n) && !d(n) && (n = s({}, n)), t.style = le(n));
	}
	let o = g(e) ? 1 : $r(e) ? 128 : Bn(e) ? 64 : v(e) ? 4 : h(e) ? 2 : 0;
	return U(e, t, n, r, i, o, a, !0);
}
function _i(e) {
	return e ? /* @__PURE__ */ Ht(e) ? s({}, e) : Dr(e) ? s({}, e[Bi] || e) : e : null;
}
function vi(e, t, n = !1, r = !1) {
	let { props: i, ref: a, patchFlag: o, children: s, transition: c } = e, l = t ? Si(i || {}, t) : i, u = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e.type,
		props: l,
		key: l && mi(l),
		ref: t && t.ref ? n && a ? d(a) ? a.concat(hi(t)) : [a, hi(t)] : hi(t) : a,
		scopeId: e.scopeId,
		slotScopeIds: e.slotScopeIds,
		children: s,
		target: e.target,
		targetStart: e.targetStart,
		targetAnchor: e.targetAnchor,
		staticCount: e.staticCount,
		shapeFlag: e.shapeFlag,
		patchFlag: t && e.type !== B ? o === -1 ? 16 : o | 16 : o,
		dynamicProps: e.dynamicProps,
		dynamicChildren: e.dynamicChildren,
		appContext: e.appContext,
		dirs: e.dirs,
		transition: c,
		component: e.component,
		suspense: e.suspense,
		ssContent: e.ssContent && vi(e.ssContent),
		ssFallback: e.ssFallback && vi(e.ssFallback),
		placeholder: e.placeholder,
		el: e.el,
		anchor: e.anchor,
		ctx: e.ctx,
		ce: e.ce,
		cacheIndex: e.cacheIndex
	};
	return c && r && Wn(u, c.clone(u)), u;
}
function G(e = " ", t = 0) {
	return W(ni, null, e, t);
}
function K(e = "", t = !1) {
	return t ? (V(), di(ri, null, e)) : W(ri, null, e);
}
function yi(e) {
	return e == null || typeof e == "boolean" ? W(ri) : d(e) ? W(B, null, e.slice()) : fi(e) ? bi(e) : W(ni, null, String(e));
}
function bi(e) {
	return e.el === null && e.patchFlag !== -1 || e.memo ? e : vi(e);
}
function xi(e, t) {
	let n = 0, { shapeFlag: r } = e;
	if (t == null) t = null;
	else if (d(t)) n = 16;
	else if (typeof t == "object") {
		if (r & 65) {
			let n = t.default;
			n && (n._c && (n._d = !1), xi(e, n()), n._c && (n._d = !0));
			return;
		}
		{
			n = 32;
			let r = t._;
			!r && !Dr(t) ? t._ctx = On : r === 3 && On && (On.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
		}
	} else if (h(t)) {
		if (r & 65) {
			xi(e, { default: t });
			return;
		}
		t = {
			default: t,
			_ctx: On
		}, n = 32;
	} else t = String(t), r & 64 ? (n = 16, t = [G(t)]) : n = 8;
	e.children = t, e.shapeFlag |= n;
}
function Si(...e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		for (let e in r) if (e === "class") t.class !== r.class && (t.class = A([t.class, r.class]));
		else if (e === "style") t.style = le([t.style, r.style]);
		else if (a(e)) {
			let n = t[e], i = r[e];
			i && n !== i && !(d(n) && n.includes(i)) ? t[e] = n ? [].concat(n, i) : i : i == null && n == null && !o(e) && (t[e] = i);
		} else e !== "" && (t[e] = r[e]);
	}
	return t;
}
function Ci(e, t, n, r = null) {
	sn(e, t, 7, [n, r]);
}
var wi = /* @__PURE__ */ lr(), Ti = 0;
function Ei() {
	return Ti;
}
function Di(e, n, r) {
	let i = e.type, a = (n ? n.appContext : e.appContext) || wi, o = {
		uid: Ti++,
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
		propsOptions: Mr(i, a),
		emitsOptions: hr(i, a),
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
	return o.ctx = { _: o }, o.root = n ? n.root : o, o.emit = mr.bind(null, o), e.ce && e.ce(o), o;
}
var Oi = null, ki = () => Oi || On, Ai, ji;
{
	let e = ce(), t = (t, n) => {
		let r;
		return (r = e[t]) || (r = e[t] = []), r.push(n), (e) => {
			r.length > 1 ? r.forEach((t) => t(e)) : r[0](e);
		};
	};
	Ai = t("__VUE_INSTANCE_SETTERS__", (e) => Oi = e), ji = t("__VUE_SSR_SETTERS__", (e) => Fi = e);
}
var Mi = (e) => {
	let t = Oi;
	return Ai(e), e.scope.on(), () => {
		e.scope.off(), Ai(t);
	};
}, Ni = () => {
	Oi && Oi.scope.off(), Ai(null);
};
function Pi(e) {
	return e.vnode.shapeFlag & 4;
}
var Fi = !1;
function Ii(e, t = !1, n = !1) {
	t && ji(t);
	let { props: r, children: i } = e.vnode, a = Pi(e);
	Or(e, r, a, t), Br(e, i, n || t);
	let o = a ? Li(e, t) : void 0;
	return t && ji(!1), o;
}
function Li(e, t) {
	let n = e.type;
	e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, cr);
	let { setup: r } = n;
	if (r) {
		Ue();
		let n = e.setupContext = r.length > 1 ? Hi(e) : null, i = Mi(e), a = on(r, e, 0, [e.props, n]), o = y(a);
		if (We(), i(), (o || e.sp) && !Qn(e) && qn(e), o) {
			if (a.then(Ni, Ni), t) return a.then((n) => {
				ji(!0);
				try {
					Ri(e, n, t);
				} finally {
					ji(!1);
				}
			}).catch((t) => {
				cn(t, e, 0, void 0, !0), e.ssrRender = (e, t) => t("<!---->");
			});
			e.asyncDep = a;
		} else Ri(e, a, t);
	} else zi(e, t);
}
function Ri(e, t, n) {
	h(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : v(t) && (e.setupState = Xt(t)), zi(e, n);
}
function zi(e, t, n) {
	let i = e.type;
	e.render ||= i.render || r;
}
var Bi = /* @__PURE__ */ Symbol(), Vi = { get(e, t) {
	return P(e, "get", ""), t === Bi ? e : e[t];
} };
function Hi(e) {
	return {
		attrs: new Proxy(e.attrs, Vi),
		slots: e.slots,
		emit: e.emit,
		expose: (t) => {
			e.exposed = t || {};
		}
	};
}
function Ui(e) {
	return e.exposed ? e.exposeProxy ||= new Proxy(Xt(Ut(e.exposed)), {
		get(t, n) {
			if (n in t) return t[n];
			if (n in or) return or[n](e);
		},
		has(e, t) {
			return t in e || t in or;
		}
	}) : e.proxy;
}
function Wi(e) {
	return h(e) && "__vccOpts" in e;
}
var q = (e, t) => /* @__PURE__ */ Qt(e, t, Fi), Gi = "3.5.45", Ki = void 0, qi = typeof window < "u" && window.trustedTypes;
if (qi) try {
	Ki = /* @__PURE__ */ qi.createPolicy("vue", { createHTML: (e) => e });
} catch {}
var Ji = Ki ? (e) => Ki.createHTML(e) : (e) => e, Yi = "http://www.w3.org/2000/svg", Xi = "http://www.w3.org/1998/Math/MathML", Zi = typeof document < "u" ? document : null, Qi = Zi && /* @__PURE__ */ Zi.createElement("template"), $i = {
	insert: (e, t, n) => {
		t.insertBefore(e, n || null);
	},
	remove: (e) => {
		let t = e.parentNode;
		t && t.removeChild(e);
	},
	createElement: (e, t, n, r) => {
		let i = t === "svg" ? Zi.createElementNS(Yi, e) : t === "mathml" ? Zi.createElementNS(Xi, e) : n ? Zi.createElement(e, { is: n }) : Zi.createElement(e);
		return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
	},
	createText: (e) => Zi.createTextNode(e),
	createComment: (e) => Zi.createComment(e),
	setText: (e, t) => {
		e.nodeValue = t;
	},
	setElementText: (e, t) => {
		e.textContent = t;
	},
	parentNode: (e) => e.parentNode,
	nextSibling: (e) => e.nextSibling,
	querySelector: (e) => Zi.querySelector(e),
	setScopeId(e, t) {
		e.setAttribute(t, "");
	},
	insertStaticContent(e, t, n, r, i, a) {
		let o = n ? n.previousSibling : t.lastChild;
		if (i && (i === a || i.nextSibling)) for (; t.insertBefore(i.cloneNode(!0), n), i !== a && (i = i.nextSibling););
		else {
			Qi.innerHTML = Ji(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
			let i = Qi.content;
			if (r === "svg" || r === "mathml") {
				let e = i.firstChild;
				for (; e.firstChild;) i.appendChild(e.firstChild);
				i.removeChild(e);
			}
			t.insertBefore(i, n);
		}
		return [o ? o.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild];
	}
}, ea = /* @__PURE__ */ Symbol("_vtc");
function ta(e, t, n) {
	let r = e[ea];
	r && (t = (t ? [t, ...r] : [...r]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
var na = /* @__PURE__ */ Symbol("_vod"), ra = /* @__PURE__ */ Symbol("_vsh"), ia = {
	name: "show",
	beforeMount(e, { value: t }, { transition: n }) {
		e[na] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : aa(e, t);
	},
	mounted(e, { value: t }, { transition: n }) {
		n && t && n.enter(e);
	},
	updated(e, { value: t, oldValue: n }, { transition: r }) {
		!t != !n && (r ? t ? (r.beforeEnter(e), aa(e, !0), r.enter(e)) : r.leave(e, () => {
			aa(e, !1);
		}) : aa(e, t));
	},
	beforeUnmount(e, { value: t }) {
		aa(e, t);
	}
};
function aa(e, t) {
	e.style.display = t ? e[na] : "none", e[ra] = !t;
}
var oa = /* @__PURE__ */ Symbol(""), sa = /(?:^|;)\s*display\s*:/;
function ca(e, t, n) {
	let r = e.style, i = g(n), a = !1;
	if (n && !i) {
		if (t) {
			if (g(t)) for (let e of t.split(";")) {
				let t = e.slice(0, e.indexOf(":")).trim();
				n[t] ?? ua(r, t, "");
			}
			else for (let e in t) n[e] ?? ua(r, e, "");
		}
		for (let i in n) {
			i === "display" && (a = !0);
			let o = n[i];
			o == null ? ua(r, i, "") : ma(e, i, !g(t) && t ? t[i] : void 0, o) || ua(r, i, o);
		}
	} else if (i) {
		if (t !== n) {
			let e = r[oa];
			e && (n += ";" + e), r.cssText = n, a = sa.test(n);
		}
	} else t && e.removeAttribute("style");
	na in e && (i && t === n || (e[na] = a ? r.display : ""), e[ra] && (r.display = "none"));
}
var la = /\s*!important$/;
function ua(e, t, n) {
	if (d(n)) n.forEach((n) => ua(e, t, n));
	else if (n ??= "", t.startsWith("--")) la.test(n) ? e.setProperty(t, n.replace(la, ""), "important") : e.setProperty(t, n);
	else {
		let r = pa(e, t);
		la.test(n) ? e.setProperty(O(r), n.replace(la, ""), "important") : e[r] = n;
	}
}
var da = [
	"Webkit",
	"Moz",
	"ms"
], fa = {};
function pa(e, t) {
	let n = fa[t];
	if (n) return n;
	let r = D(t);
	if (r !== "filter" && r in e) return fa[t] = r;
	r = ne(r);
	for (let n = 0; n < da.length; n++) {
		let i = da[n] + r;
		if (i in e) return fa[t] = i;
	}
	return t;
}
function ma(e, t, n, r) {
	return e.tagName === "TEXTAREA" && (t === "width" || t === "height") && g(r) && n === r;
}
var ha = "http://www.w3.org/1999/xlink";
function ga(e, t, n, r, i, a = me(t)) {
	r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(ha, t.slice(6, t.length)) : e.setAttributeNS(ha, t, n) : n == null || a && !he(n) ? e.removeAttribute(t) : e.setAttribute(t, a ? "" : _(n) ? String(n) : n);
}
function _a(e, t, n, r, i) {
	if (t === "innerHTML" || t === "textContent") {
		n != null && (e[t] = t === "innerHTML" ? Ji(n) : n);
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
		r === "boolean" ? n = he(n) : n == null && r === "string" ? (n = "", o = !0) : r === "number" && (n = 0, o = !0);
	}
	try {
		e[t] = n;
	} catch {}
	o && e.removeAttribute(i || t);
}
function va(e, t, n, r) {
	e.addEventListener(t, n, r);
}
function ya(e, t, n, r) {
	e.removeEventListener(t, n, r);
}
var ba = /* @__PURE__ */ Symbol("_vei");
function xa(e, t, n, r, i = null) {
	let a = e[ba] || (e[ba] = {}), o = a[t];
	if (r && o) o.value = r;
	else {
		let [n, s] = wa(t);
		r ? va(e, n, a[t] = Oa(r, i), s) : o && (ya(e, n, o, s), a[t] = void 0);
	}
}
var Sa = /(Once|Passive|Capture)$/, Ca = /^on:?(?:Once|Passive|Capture)$/;
function wa(e) {
	let t, n;
	for (; (n = e.match(Sa)) && !Ca.test(e);) t ||= {}, e = e.slice(0, e.length - n[1].length), t[n[1].toLowerCase()] = !0;
	return [e[2] === ":" ? e.slice(3) : O(e.slice(2)), t];
}
var Ta = 0, Ea = /* @__PURE__ */ Promise.resolve(), Da = () => Ta ||= (Ea.then(() => Ta = 0), Date.now());
function Oa(e, t) {
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
				e && sn(e, t, 5, a);
			}
		} else sn(r, t, 5, [e]);
	};
	return n.value = e, n.attached = Da(), n;
}
var ka = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Aa = (e, t, n, r, i, s) => {
	let c = i === "svg";
	t === "class" ? ta(e, r, c) : t === "style" ? ca(e, n, r) : a(t) ? o(t) || xa(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), 1) : t[0] === "^" ? (t = t.slice(1), 0) : ja(e, t, r, c)) ? (_a(e, t, r), e.tagName.includes("-") || t !== "value" && t !== "checked" && t !== "selected" || ga(e, t, r, c, s, t !== "value")) : e._isVueCE && (Ma(e, t) || e._def.__asyncLoader && (/[A-Z]/.test(t) || !g(r))) ? _a(e, D(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), ga(e, t, r, c));
};
function ja(e, t, n, r) {
	if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && ka(t) && h(n));
	if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return !1;
	if (t === "width" || t === "height") {
		let t = e.tagName;
		if (t === "IMG" || t === "VIDEO" || t === "CANVAS" || t === "SOURCE") return !1;
	}
	return ka(t) && g(n) ? !1 : t in e;
}
function Ma(e, t) {
	let n = e._def.props;
	if (!n) return !1;
	let r = D(t);
	return Array.isArray(n) ? n.some((e) => D(e) === r) : Object.keys(n).some((e) => D(e) === r);
}
var Na = (e) => {
	let t = e.props["onUpdate:modelValue"] || !1;
	return d(t) ? (e) => ie(t, e) : t;
};
function Pa(e) {
	e.target.composing = !0;
}
function Fa(e) {
	let t = e.target;
	t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
var Ia = /* @__PURE__ */ Symbol("_assign"), La = /* @__PURE__ */ Symbol("_initialValue");
function Ra(e, t, n) {
	return t && (e = e.trim()), n && (e = oe(e)), e;
}
var J = {
	created(e, { modifiers: { lazy: t, trim: n, number: r } }, i) {
		e.parentNode && (e.type === "text" ? e[La] = e.defaultValue.replace(/[\r\n]/g, "") : e.type === "textarea" && (e[La] = e.defaultValue.replace(/\r\n?/g, "\n"))), e[Ia] = Na(i);
		let a = r || i.props && i.props.type === "number";
		va(e, t ? "change" : "input", (t) => {
			t.target.composing || e[Ia](Ra(e.value, n, a));
		}), (n || a) && va(e, "change", () => {
			e.value = Ra(e.value, n, a);
		}), t || (va(e, "compositionstart", Pa), va(e, "compositionend", Fa), va(e, "change", Fa));
	},
	mounted(e, { value: t, modifiers: { trim: n, number: r } }) {
		let i = t ?? "", a = e[La];
		delete e[La], a !== void 0 && (e.type === "text" || e.type === "textarea") && e.value !== a ? e[Ia](Ra(e.value, n, r)) : e.value = i;
	},
	beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: i, number: a } }, o) {
		if (e[Ia] = Na(o), e.composing) return;
		let s = (a || e.type === "number") && !/^0\d/.test(e.value) ? oe(e.value) : e.value, c = t ?? "";
		if (s === c) return;
		let l = e.getRootNode();
		(l instanceof Document || l instanceof ShadowRoot) && l.activeElement === e && e.type !== "range" && (r && t === n || i && e.value.trim() === c) || (e.value = c);
	}
}, za = {
	deep: !0,
	created(e, t, n) {
		e[Ia] = Na(n), va(e, "change", () => {
			let t = e._modelValue, n = Wa(e), r = e.checked, i = e[Ia];
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
			} else i(Ga(e, r));
		});
	},
	mounted: Ba,
	beforeUpdate(e, t, n) {
		e[Ia] = Na(n), Ba(e, t, n);
	}
};
function Ba(e, { value: t, oldValue: n }, r) {
	e._modelValue = t;
	let i;
	if (d(t)) i = xe(t, r.props.value) > -1;
	else if (p(t)) i = t.has(r.props.value);
	else {
		if (t === n) return;
		i = be(t, Ga(e, !0));
	}
	e.checked !== i && (e.checked = i);
}
var Va = {
	deep: !0,
	created(e, { value: t, modifiers: { number: n } }, r) {
		e._modelValue = t, va(e, "change", () => {
			let t = Array.prototype.filter.call(e.options, (e) => e.selected).map((e) => n ? oe(Wa(e)) : Wa(e)), r = e.multiple, i = r ? p(e._modelValue) ? new Set(t) : t : t[0], a = e._pendingValue = [r, r ? d(i) ? t.slice() : t : i];
			try {
				e[Ia](i);
			} finally {
				_n(() => {
					e._pendingValue === a && (e._pendingValue = void 0);
				});
			}
		}), e[Ia] = Na(r);
	},
	mounted(e, { value: t, modifiers: { number: n } }) {
		Ua(e, t, n);
	},
	beforeUpdate(e, { value: t }, n) {
		e._modelValue = t, e[Ia] = Na(n);
	},
	updated(e, { value: t, modifiers: { number: n } }) {
		let r = e._pendingValue;
		e._pendingValue = void 0, r && r[0] === e.multiple && Ha(t, r[1], r[0]) || Ua(e, t, n);
	}
};
function Ha(e, t, n) {
	if (!n || d(e)) return be(e, t);
	if (p(e)) {
		if (e.size !== t.length) return !1;
		for (let n of t) if (!e.has(n)) return !1;
		return !0;
	}
	return !1;
}
function Ua(e, t, n = !1) {
	let r = e.multiple, i = d(t);
	if (!r || i || p(t)) {
		for (let a = 0, o = e.options.length; a < o; a++) {
			let o = e.options[a], s = Wa(o);
			if (r) {
				if (i) {
					let e = typeof s;
					o.selected = e === "string" || e === "number" ? t.some((e) => String(e) === String(s)) : xe(t, s) > -1;
				} else o.selected = t.has(s) || n && typeof s == "string" && t.has(oe(s));
			} else if (be(Wa(o), t)) {
				e.selectedIndex !== a && (e.selectedIndex = a);
				return;
			}
		}
		!r && e.selectedIndex !== -1 && (e.selectedIndex = -1);
	}
}
function Wa(e) {
	return "_value" in e ? e._value : e.value;
}
function Ga(e, t) {
	let n = t ? "_trueValue" : "_falseValue";
	return n in e ? e[n] : t;
}
var Ka = [
	"ctrl",
	"shift",
	"alt",
	"meta"
], qa = {
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
	exact: (e, t) => Ka.some((n) => e[`${n}Key`] && !t.includes(n))
}, Y = (e, t) => {
	if (!e) return e;
	let n = e._withMods ||= {}, r = t.join(".");
	return n[r] || (n[r] = ((n, ...r) => {
		for (let e = 0; e < t.length; e++) {
			let r = qa[t[e]];
			if (r && r(n, t)) return;
		}
		return e(n, ...r);
	}));
}, Ja = {
	esc: "escape",
	space: " ",
	up: "arrow-up",
	left: "arrow-left",
	right: "arrow-right",
	down: "arrow-down",
	delete: "backspace"
}, Ya = (e, t) => {
	let n = e._withKeys ||= {}, r = t.join(".");
	return n[r] || (n[r] = ((n) => {
		if (!("key" in n)) return;
		let r = O(n.key);
		if (t.some((e) => e === r || Ja[e] === r)) return e(n);
	}));
}, Xa = /* @__PURE__ */ s({ patchProp: Aa }, $i), Za;
function Qa() {
	return Za ||= Ur(Xa);
}
var $a = ((...e) => {
	let t = Qa().createApp(...e), { mount: n } = t;
	return t.mount = (e) => {
		let r = to(e);
		if (!r) return;
		let i = t._component;
		h(i) || i.render || i.template || (i.template = r.innerHTML), r.nodeType === 1 && (r.textContent = "");
		let a = n(r, !1, eo(r));
		return r instanceof Element && (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")), a;
	}, t;
});
function eo(e) {
	if (e instanceof SVGElement) return "svg";
	if (typeof MathMLElement == "function" && e instanceof MathMLElement) return "mathml";
}
function to(e) {
	return g(e) ? document.querySelector(e) : e;
}
// app/web/frontend/lib/layout.ts
var no = [
	"sidebar",
	"papers",
	"assistant"
];
function ro(e) {
	let t = e.defaultView, n = new AbortController(), r = (e, t, r) => {
		e.addEventListener(t, r, { signal: n.signal });
	}, i = (t) => e.querySelector(t), a = (t) => [...e.querySelectorAll(t)], o = i(".shell"), s = e.documentElement, c = a("[data-resize-panel]"), l = "zhiyue.panel-widths.v1", u = {
		sidebar: [140, 360],
		papers: [200, 600],
		assistant: [260, 900]
	}, d = {
		sidebar: "--sidebar-width",
		papers: "--paper-list-width",
		assistant: "--assistant-width"
	}, f = {}, p = {}, m = null;
	try {
		let e = JSON.parse(t.localStorage.getItem(l) || "{}");
		for (let t of no) {
			let n = e[t];
			typeof n == "number" && Number.isFinite(n) && (f[t] = n);
		}
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
		p = Object.fromEntries(no.map((t) => [t, h(f[t] ?? e[t], u[t][0], u[t][1])]));
		let t = o.clientWidth - 240, n = no.reduce((e, t) => e + u[t][0], 0), r = no.reduce((e, t) => e + p[t], 0);
		if (_() && r > t) {
			let e = h((t - n) / (r - n || 1), 0, 1);
			for (let t of no) p[t] = u[t][0] + Math.floor((p[t] - u[t][0]) * e);
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
			let i = r;
			if (i.button !== 0 || !_() || m) return;
			i.preventDefault(), t.focus({ preventScroll: !0 });
			let a = e.createElement("div");
			a.className = "layout-resize-shield", a.setAttribute("aria-hidden", "true"), e.body.append(a), m = {
				handle: t,
				key: n,
				pointerId: i.pointerId,
				x: i.clientX,
				width: p[n],
				startWidths: { ...p },
				previous: { ...f },
				bounds: v(n),
				shield: a
			}, t.setAttribute("data-dragging", ""), e.body.classList.add("resizing-panels"), t.setPointerCapture(i.pointerId);
		}), r(t, "lostpointercapture", () => x()), r(t, "dblclick", () => {
			_() && (x(), delete f[n], y(), b());
		}), r(t, "keydown", (e) => {
			let t = e;
			if (!_() || m || ![
				"ArrowLeft",
				"ArrowRight",
				"Home",
				"End"
			].includes(t.key)) return;
			t.preventDefault();
			let [r, i] = v(n), a = t.shiftKey ? 48 : 16, o = t.key === "Home" ? r : t.key === "End" ? i : p[n] + (t.key === "ArrowRight" ? a : -a);
			f = {
				...p,
				[n]: h(o, r, i)
			}, y(), b();
		});
	}
	return r(e, "pointermove", (e) => {
		let t = e;
		if (!m || t.pointerId !== m.pointerId) return;
		let n = (t.clientX - m.x) * (m.key === "assistant" ? -1 : 1);
		f = {
			...m.startWidths,
			[m.key]: h(m.width + n, m.bounds[0], m.bounds[1])
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
// app/web/frontend/lib/content.ts
var X = (e) => String(e ?? "").replace(/[&<>"']/g, (e) => ({
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
})[e]), io = {
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
	user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3",
	settings: "M20 7h-9 M14 17H5 M17 17a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M7 7a3 3 0 1 0-6 0 3 3 0 0 0 6 0"
}, ao = (e) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${io[e] || io.book}"/></svg>`, Z = (e, t) => ({
	method: e,
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(t)
}), oo = (e) => encodeURIComponent(String(e)), so = (e) => `/api/file?path=${encodeURIComponent(e)}`, co = (e) => e.title || e.literature_id || "未命名文献", lo = (e) => Array.isArray(e.authors) ? e.authors.map((e) => typeof e == "string" ? e : e.name || "").join(", ") : typeof e.authors == "string" && e.authors ? e.authors : "作者待核实";
function uo(e, t = "papers/09_情感综述调研/网站导入") {
	let n = /* @__PURE__ */ new Map([[t, "情感综述调研 / 网站导入（默认）"]]);
	for (let t of e) {
		let e = typeof t == "string" ? t : t.id || t.name;
		if (!e) continue;
		let r = String(e).replace(/\\/g, "/").replace(/^papers\//, "").split("/")[0], i = `papers/${r}/网站导入`;
		if (!n.has(i)) {
			let e = String(typeof t == "string" ? t : t.name || r).replace(/^\d+_/, "");
			n.set(i, `${e} / 网站导入`);
		}
	}
	return [...n];
}
function fo(e, t = "") {
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
	return o.length ? so(o.join("/")) : "";
}
function po(e, t = "") {
	let n = [], r = (e) => `\u0001${n.push(e) - 1}\u0002`, i = String(e).replace(/[\u0001\u0002]/g, "");
	return i = i.replace(/`([^`]+)`/g, (e, t) => r(`<code>${X(t)}</code>`)), i = i.replace(/(!?)\[([^\]\n]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, (e, n, i, a) => {
		let o = fo(a, t);
		return r(o ? n ? `<img src="${X(o)}" alt="${X(i)}" loading="lazy" referrerpolicy="no-referrer">` : `<a href="${X(o)}" target="_blank" rel="noopener noreferrer">${X(i)}</a>` : X(i));
	}), i = X(i).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>").replace(/~~([^~\n]+)~~/g, "<del>$1</del>"), i.replace(/\u0001(\d+)\u0002/g, (e, t) => n[Number(t)] || "");
}
function mo(e, t = "") {
	let n = String(e || "").replace(/\r\n?/g, "\n").split("\n"), r = "", i = [], a = "", o = () => {
		i.length && (r += `<p>${i.map((e) => po(e, t)).join("<br>")}</p>`, i = []), a &&= (r += `</${a}>`, "");
	};
	for (let e = 0; e < n.length; e++) {
		let s = n[e];
		if (/^\s*```/.test(s)) {
			o();
			let t = [];
			for (; ++e < n.length && !/^\s*```/.test(n[e]);) t.push(n[e]);
			r += `<pre><code>${X(t.join("\n"))}</code></pre>`;
			continue;
		}
		let c = /^(#{1,6})\s+(.+)$/.exec(s);
		if (c) {
			o();
			let e = c[1].length;
			r += `<h${e}>${po(c[2], t)}</h${e}>`;
			continue;
		}
		if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(s)) {
			o(), r += "<hr>";
			continue;
		}
		if (/^>\s?/.test(s)) {
			o(), r += `<blockquote>${po(s.replace(/^>\s?/, ""), t)}</blockquote>`;
			continue;
		}
		if (s.includes("|") && e + 1 < n.length && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(n[e + 1])) {
			o();
			let i = (e) => e.trim().replace(/^\||\|$/g, "").split("|");
			for (r += `<table><thead><tr>${i(s).map((e) => `<th>${po(e.trim(), t)}</th>`).join("")}</tr></thead><tbody>`, e++; e + 1 < n.length && n[e + 1].includes("|") && n[e + 1].trim();) e++, r += `<tr>${i(n[e]).map((e) => `<td>${po(e.trim(), t)}</td>`).join("")}</tr>`;
			r += "</tbody></table>";
			continue;
		}
		let l = /^\s*(?:([-+*])|\d+\.)\s+(.+)$/.exec(s);
		if (l) {
			let e = l[1] ? "ul" : "ol";
			(i.length || a && a !== e) && o(), a ||= (r += `<${e}>`, e), r += `<li>${po(l[2], t)}</li>`;
		} else s.trim() ? (a && o(), i.push(s)) : o();
	}
	return o(), r;
}
var ho = {
	unread: "未读",
	reading: "在读",
	read: "已读"
};
function go(e) {
	let t = {
		未读: "unread",
		待标记: "unread",
		在读: "reading",
		阅读中: "reading",
		已读: "read",
		已读完: "read",
		completed: "read"
	}, n = String(e ?? "");
	return t[n] ? t[n] : n in ho ? n : "unread";
}
// app/web/frontend/components/Icon.vue?vue&type=script&setup=true&lang.ts
var _o = {
	viewBox: "0 0 24 24",
	"aria-hidden": "true"
}, vo = ["d"], Q = /* @__PURE__ */ Kn({
	__name: "Icon",
	props: { name: {} },
	setup(e) {
		return (t, n) => (V(), H("svg", _o, [U("path", { d: L(io)[e.name ?? "book"] || L(io).book }, null, 8, vo)]));
	}
}), yo = [
	"data-resize-panel",
	"aria-label",
	"aria-controls",
	"title"
], bo = /* @__PURE__ */ Kn({
	__name: "PanelHandle",
	props: { kind: {} },
	setup(e) {
		let t = e, n = {
			sidebar: ["navigation-panel", "分类栏"],
			papers: ["paper-panel", "文献列表"],
			assistant: ["assistant-panel", "助手栏"]
		}, r = q(() => n[t.kind]);
		return (e, n) => (V(), H("div", {
			class: A(["panel-resizer", { "panel-resizer-left": t.kind === "assistant" }]),
			"data-resize-panel": t.kind,
			role: "separator",
			"aria-orientation": "vertical",
			"aria-label": `调整${r.value[1]}宽度`,
			"aria-controls": r.value[0],
			tabindex: "0",
			title: `拖动调整${r.value[1]}宽度；双击恢复默认；方向键微调`
		}, null, 10, yo));
	}
}), xo = {
	id: "navigation-panel",
	class: "sidebar",
	"aria-label": "主导航"
}, So = {
	class: "brand",
	href: "/",
	"aria-label": "Zhiyue 首页"
}, Co = { class: "brand-mark" }, wo = { class: "main-nav" }, To = {
	id: "nav-total",
	class: "count"
}, Eo = { class: "section-head" }, Do = ["disabled"], Oo = {
	id: "categories",
	class: "categories"
}, ko = ["onSubmit"], Ao = {
	key: 1,
	class: "category-row"
}, jo = ["onClick"], Mo = ["title"], No = { class: "cat-count" }, Po = ["disabled", "onClick"], Fo = /* @__PURE__ */ Kn({
	__name: "Sidebar",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = q(() => {
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
				label: t.name ?? t.id,
				name: t.name ?? t.id,
				count: t.count ?? 0
			}), n.category === t.id)) for (let n of t.children || []) e.push({
				category: t.id,
				child: n.name ?? "",
				label: n.name ?? "",
				name: n.name ?? "",
				count: n.count ?? 0
			});
			return e;
		}), i = (e) => e.replace(/^\d+_/, "").replaceAll("_", " "), a = /* @__PURE__ */ I(!1), o = /* @__PURE__ */ I(null), s = /* @__PURE__ */ I(""), c = /* @__PURE__ */ I(!1), l = /* @__PURE__ */ I(null), u = (e) => {
			e && (l.value = e);
		};
		function d(e) {
			n.category = e.category, n.subcategory = e.child, t.setView("library"), t.setPanel("list");
		}
		async function f() {
			await _n(), l.value?.focus(), l.value?.select();
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
			c.value = !1, r && (a.value = !1, s.value = "", n.category = r.category ?? n.category, n.subcategory = "", t.setView("library"), t.setPanel("list"), t.toast(`已新建文件夹「${i(r.category ?? "")}」`));
		}
		async function v(e) {
			let r = s.value.trim();
			if (!r || c.value) return;
			c.value = !0;
			let a = await t.renameCategory(e.category, e.child, r);
			c.value = !1, a && (o.value = null, s.value = "", e.child ? n.category === e.category && n.subcategory === e.child && (n.subcategory = a.subcategory ?? "") : n.category === e.category && (n.category = a.category ?? n.category), t.toast(`文件夹已重命名为「${i(a.subcategory || a.category || "")}」`));
		}
		return (e, o) => (V(), H("aside", xo, [
			U("a", So, [U("span", Co, [W(Q)]), o[4] ||= U("span", null, "Zhiyue", -1)]),
			U("nav", wo, [U("button", {
				class: A(["nav-item", { active: L(n).view === "library" }]),
				"data-view": "library",
				onClick: o[0] ||= (e) => L(t).setView("library")
			}, [
				W(Q, { name: "library" }),
				o[5] ||= G("文献 ", -1),
				U("span", To, j(L(n).papers.length), 1)
			], 2), U("button", {
				class: A(["nav-item", { active: L(n).view === "downloads" }]),
				"data-view": "downloads",
				onClick: o[1] ||= (e) => L(t).setView("downloads")
			}, [W(Q, { name: "download" }), o[6] ||= G("下载任务 ", -1)], 2)]),
			U("div", Eo, [o[7] ||= U("span", { class: "section-label" }, "分类", -1), U("button", {
				class: "category-add",
				type: "button",
				title: "新建文件夹",
				"aria-label": "新建文件夹",
				disabled: c.value,
				onClick: p
			}, [W(Q, { name: "plus" })], 8, Do)]),
			U("div", Oo, [a.value ? (V(), H("form", {
				key: 0,
				class: "category-editor",
				onSubmit: Y(_, ["prevent"])
			}, [R(U("input", {
				ref: u,
				"onUpdate:modelValue": o[2] ||= (e) => s.value = e,
				maxlength: "60",
				placeholder: "文件夹名称",
				"aria-label": "文件夹名称",
				onKeydown: Ya(h, ["esc"]),
				onBlur: h
			}, null, 544), [[J, s.value]])], 32)) : K("", !0), (V(!0), H(B, null, z(r.value, (e) => (V(), H(B, { key: `${e.category}/${e.child}` }, [g(e) ? (V(), H("form", {
				key: 0,
				class: A(["category-editor", { "category-child": e.child }]),
				onSubmit: Y((t) => v(e), ["prevent"])
			}, [R(U("input", {
				ref_for: !0,
				ref: u,
				"onUpdate:modelValue": o[3] ||= (e) => s.value = e,
				maxlength: "60",
				placeholder: "文件夹名称",
				"aria-label": "文件夹名称",
				onKeydown: Ya(h, ["esc"]),
				onBlur: h
			}, null, 544), [[J, s.value]])], 42, ko)) : (V(), H("div", Ao, [U("button", {
				class: A(["category-button", {
					"category-child": e.child,
					active: L(n).category === e.category && L(n).subcategory === e.child
				}]),
				onClick: (t) => d(e)
			}, [
				e.child ? K("", !0) : (V(), di(Q, {
					key: 0,
					name: "folder"
				})),
				U("span", {
					class: "cat-name",
					title: i(e.label)
				}, j(i(e.label)), 9, Mo),
				U("span", No, j(e.count), 1)
			], 10, jo), e.category ? (V(), H("button", {
				key: 0,
				class: "category-action",
				type: "button",
				title: "重命名文件夹",
				"aria-label": "重命名文件夹",
				disabled: c.value,
				onClick: (t) => m(e)
			}, [W(Q, { name: "edit" })], 8, Po)) : K("", !0)]))], 64))), 128))]),
			o[8] ||= U("div", { class: "sidebar-bottom" }, [U("span", { class: "workspace-dot" }), U("span", null, "本地工作区")], -1),
			W(bo, { kind: "sidebar" })
		]));
	}
}), Io = {
	id: "paper-panel",
	class: "paper-panel",
	"aria-label": "文献筛选与列表"
}, Lo = { class: "list-controls" }, Ro = { class: "search-box" }, zo = { class: "filter-row" }, Bo = ["value"], Vo = ["aria-pressed"], Ho = { class: "list-meta" }, Uo = { class: "list-meta-info" }, Wo = { id: "result-count" }, Go = { class: "list-meta-actions" }, Ko = ["disabled"], qo = {
	id: "paper-list",
	class: "paper-list",
	tabindex: "0",
	"aria-label": "论文列表"
}, Jo = {
	key: 0,
	class: "empty"
}, Yo = { class: "error-text" }, Xo = [
	"data-paper",
	"aria-label",
	"aria-current",
	"onClick",
	"onKeydown"
], Zo = { class: "paper-top" }, Qo = { class: "paper-id" }, $o = [
	"aria-pressed",
	"title",
	"aria-label",
	"disabled",
	"onClick"
], es = ["title"], ts = { class: "paper-bottom" }, ns = ["title"], rs = {
	key: 2,
	class: "empty"
}, is = {
	key: 0,
	class: "empty-art"
}, as = {
	key: 1,
	class: "empty-actions"
}, os = /* @__PURE__ */ Kn({
	__name: "PaperList",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = q(() => [...new Set(n.papers.map((e) => e.year).filter(Boolean).map(String))].sort((e, t) => (Number(t) || 0) - (Number(e) || 0))), i = q(() => !!(n.query.trim() || n.year || n.read || n.starred)), a = q(() => i.value ? "没有匹配的文献" : n.category ? "这个文件夹还没有文献" : "文献库还没有文献"), o = q(() => {
			let e = n.query.trim().toLocaleLowerCase(), t = n.papers.filter((t) => {
				let r = [
					t.title,
					t.titleZh,
					lo(t),
					t.literature_id,
					t.venue,
					t.category,
					t.subcategory
				].join(" ").toLocaleLowerCase();
				return (!e || r.includes(e)) && (!n.year || String(t.year) === n.year) && (!n.read || go(t.readStatus) === n.read) && (!n.starred || t.starred) && (!n.category || (t.category || "未分类") === n.category) && (!n.subcategory || t.subcategory === n.subcategory);
			});
			return t.sort((e, t) => n.sort.startsWith("year") ? (Number(e.year) || 0) - (Number(t.year) || 0) : n.sort === "title" ? co(e).localeCompare(co(t)) : e.literature_id.localeCompare(t.literature_id, void 0, { numeric: !0 })), n.sort === "year-desc" ? t.reverse() : t;
		});
		return (e, s) => (V(), H("section", Io, [
			U("div", Lo, [
				U("label", Ro, [
					W(Q, { name: "search" }),
					R(U("input", {
						id: "search",
						"onUpdate:modelValue": s[0] ||= (e) => L(n).query = e,
						type: "search",
						placeholder: "搜索题名、作者、编号…",
						"aria-label": "搜索文献"
					}, null, 512), [[J, L(n).query]]),
					s[9] ||= U("kbd", null, "/", -1)
				]),
				U("div", zo, [
					R(U("select", {
						id: "year-filter",
						"onUpdate:modelValue": s[1] ||= (e) => L(n).year = e,
						"aria-label": "按年份筛选"
					}, [s[10] ||= U("option", { value: "" }, "全部年份", -1), (V(!0), H(B, null, z(r.value, (e) => (V(), H("option", { key: e }, j(e), 1))), 128))], 512), [[Va, L(n).year]]),
					R(U("select", {
						id: "read-filter",
						"onUpdate:modelValue": s[2] ||= (e) => L(n).read = e,
						"aria-label": "按阅读状态筛选"
					}, [s[11] ||= U("option", { value: "" }, "全部进度", -1), (V(!0), H(B, null, z(L(ho), (e, t) => (V(), H("option", {
						key: t,
						value: t
					}, j(e), 9, Bo))), 128))], 512), [[Va, L(n).read]]),
					U("button", {
						id: "star-filter",
						class: A(["icon-button", { selected: L(n).starred }]),
						title: "仅看收藏",
						"aria-label": "仅看收藏",
						"aria-pressed": L(n).starred,
						onClick: s[3] ||= (e) => L(n).starred = !L(n).starred
					}, [W(Q, { name: "star" })], 10, Vo)
				]),
				U("div", Ho, [U("div", Uo, [U("span", Wo, j(L(n).libraryError ? "加载失败" : `${o.value.length} 篇文献`), 1), R(U("select", {
					id: "sort",
					"onUpdate:modelValue": s[4] ||= (e) => L(n).sort = e,
					"aria-label": "排序"
				}, [...s[12] ||= [
					U("option", { value: "id" }, "编号顺序", -1),
					U("option", { value: "year-desc" }, "年份从新到旧", -1),
					U("option", { value: "year-asc" }, "年份从旧到新", -1),
					U("option", { value: "title" }, "题名顺序", -1)
				]], 512), [[Va, L(n).sort]])]), U("div", Go, [U("button", {
					id: "import-paper",
					class: "list-action",
					title: "从本机导入 PDF 并归档",
					onClick: s[5] ||= (e) => L(n).importOpen = !0
				}, [W(Q, { name: "upload" }), s[13] ||= U("span", null, "导入 PDF", -1)]), U("button", {
					id: "refresh-catalog",
					class: A(["icon-button compact", { refreshing: L(n).refreshing }]),
					title: "重新扫描目录并更新索引",
					"aria-label": "刷新索引",
					disabled: L(n).refreshing,
					onClick: s[6] ||= (...e) => L(t).refreshCatalog && L(t).refreshCatalog(...e)
				}, [W(Q, { name: "refresh" })], 10, Ko)])])
			]),
			U("div", qo, [L(n).libraryError ? (V(), H("div", Jo, [U("p", Yo, j(L(n).libraryError), 1), U("button", {
				class: "button subtle",
				onClick: s[7] ||= (...e) => L(t).loadLibrary && L(t).loadLibrary(...e)
			}, "重新连接")])) : (V(!0), H(B, { key: 1 }, z(o.value, (e) => (V(), H("article", {
				key: e.literature_id,
				class: A(["paper-card", { active: L(n).current === e.literature_id }]),
				"data-paper": e.literature_id,
				tabindex: "0",
				"aria-label": L(co)(e),
				"aria-current": L(n).current === e.literature_id,
				onClick: (n) => L(t).selectPaper(e.literature_id),
				onKeydown: [Ya(Y((n) => L(t).selectPaper(e.literature_id), ["self", "prevent"]), ["enter"]), Ya(Y((n) => L(t).selectPaper(e.literature_id), ["self", "prevent"]), ["space"])]
			}, [
				U("div", Zo, [
					U("span", Qo, j(e.literature_id), 1),
					U("span", null, "· " + j(e.year || "年份待核实"), 1),
					U("button", {
						class: A(["icon-button", { selected: e.starred }]),
						"aria-pressed": !!e.starred,
						title: e.starred ? "取消收藏" : "收藏论文",
						"aria-label": e.starred ? "取消收藏" : "收藏论文",
						disabled: L(n).pendingPatches.has(e.literature_id),
						onClick: Y((n) => L(t).patchPaper(e.literature_id, { starred: !e.starred }), ["stop"])
					}, [W(Q, { name: "star" })], 10, $o)
				]),
				U("h3", null, j(L(co)(e)), 1),
				U("div", {
					class: "paper-authors",
					title: L(lo)(e)
				}, j(L(lo)(e)), 9, es),
				U("div", ts, [U("span", {
					class: "tag",
					title: String(e.subcategory || e.venue || "")
				}, j(String(e.subcategory || e.venue || e.category || "未分类").replace(/^\d+_/, "")), 9, ns), U("span", { class: A(L(go)(e.readStatus)) }, [s[14] ||= U("i", { class: "read-dot" }, null, -1), G(j(L(ho)[L(go)(e.readStatus)]), 1)], 2)])
			], 42, Xo))), 128)), !L(n).libraryError && !o.value.length ? (V(), H("div", rs, [
				!i.value && !L(n).category ? (V(), H("span", is, [W(Q, { name: "library" })])) : K("", !0),
				U("p", null, j(a.value), 1),
				i.value || L(n).category ? (V(), H("div", as, [U("button", {
					id: "reset-filters",
					class: "button subtle",
					onClick: s[8] ||= (...e) => L(t).resetFilters && L(t).resetFilters(...e)
				}, j(i.value ? "清除筛选" : "查看全部文献"), 1)])) : K("", !0)
			])) : K("", !0)]),
			W(bo, { kind: "papers" })
		]));
	}
});
// app/web/frontend/lib/reader.ts
function ss({ state: e, api: t, toast: n, patchPaper: r, setPanel: i, setDraft: a, scope: o }) {
	let s = (e) => o.querySelector(e), c = (e) => [...o.querySelectorAll(e)], l = () => e.papers.find((t) => t.literature_id === e.current), u = o.ownerDocument.defaultView, d = new u.AbortController();
	function f() {
		let t = e.pdfSession;
		if (t) {
			t.disposed = !0, t.observer?.disconnect(), t.resizeObserver?.disconnect(), t.root.removeEventListener("scroll", t.onScroll), document.removeEventListener("copy", t.onCopy);
			for (let e of [
				"wheel",
				"touchstart",
				"pointerdown",
				"keydown"
			]) t.root.removeEventListener(e, t.onUserScroll);
			t.root.removeEventListener("wheel", t.onZoomWheel), t.frame && cancelAnimationFrame(t.frame);
			for (let e of t.controllers.values()) e.abort();
			for (let e of t.urls.values()) URL.revokeObjectURL(e);
			t.queue = [];
		}
		e.pdfSession = null, e.previewLoading = !1;
	}
	function p() {
		let t = s("#pdf-controls");
		if (!t) return;
		let n = e.pdfSession?.textLayers.get(e.pdfPage)?.data, r = n ? n.error ? "文字层不可用" : n.hasText ? "可选中文字并按 Ctrl+C" : "本页无文字层" : "正在加载文字层…";
		t.innerHTML = `<button class="icon-button" data-pdf-step="-1" aria-label="上一页" title="上一页" ${e.pdfPage <= 1 || e.previewLoading ? "disabled" : ""}>‹</button><label class="pdf-page-label">PDF 物理页 <input id="pdf-page" type="number" min="1" ${e.pdfTotal ? `max="${e.pdfTotal}"` : ""} value="${e.pdfPage}" aria-label="PDF物理页序"></label><span class="pdf-total">/ ${e.pdfTotal || "…"}</span><button class="icon-button" data-pdf-step="1" aria-label="下一页" title="下一页" ${!e.pdfTotal || e.pdfPage >= e.pdfTotal || e.previewLoading ? "disabled" : ""}>›</button><span class="pdf-control-divider"></span><button class="icon-button" data-pdf-zoom="-50" aria-label="缩小" title="缩小" ${e.pdfZoom <= 100 ? "disabled" : ""}>−</button><button class="text-button pdf-zoom" id="pdf-fit" title="适合宽度">${e.pdfZoom === 100 ? "适宽 100%" : e.pdfZoom + "%"}</button><button class="icon-button" data-pdf-zoom="50" aria-label="放大" title="放大" ${e.pdfZoom >= 200 ? "disabled" : ""}>＋</button><button class="button subtle pdf-copy-page" id="copy-pdf-page" ${n?.hasText ? "" : "disabled"}>复制本页文字</button><span class="pdf-text-status" title="${X(n?.error || (n?.hasText ? "" : "扫描页或无文字内容的页面需要 OCR 才能复制。"))}">${X(r)}</span>`;
	}
	async function m() {
		let t = e.pdfSession?.textLayers.get(e.pdfPage)?.data.text;
		if (t) try {
			await navigator.clipboard.writeText(t), n("本页文字已复制");
		} catch {
			n("无法访问剪贴板，请在页面选中文字后按 Ctrl+C。", !0);
		}
	}
	function h(t) {
		let r = Number(t);
		if (!Number.isInteger(r) || r < 1 || e.pdfTotal && r > e.pdfTotal) {
			n("请输入有效的 PDF 物理页序。"), p();
			return;
		}
		let i = e.pdfSession, a = i?.pages.get(r);
		i && a ? (e.pdfPage = r, i.root.scrollTop = Math.max(0, a.offsetTop - 24), i.manualPage = {
			page: r,
			scrollTop: i.root.scrollTop
		}, p(), T(i), C(i, r, !0)) : r !== e.pdfPage && (e.pdfPage = r, E());
	}
	function g(t) {
		let n = e.pdfSession, r = n?.pages.get(e.pdfPage), i = n && r ? (n.root.scrollTop - r.offsetTop) / r.offsetHeight : 0;
		e.pdfZoom = Math.max(100, Math.min(200, e.pdfZoom + t));
		for (let t of c(".pdf-page-sheet")) t.style.width = `${e.pdfZoom}%`, t.style.setProperty("--pdf-zoom", String(e.pdfZoom / 100));
		n && y(n), n && r && (n.root.scrollTop = r.offsetTop + i * r.offsetHeight, n.manualPage && (n.manualPage.scrollTop = n.root.scrollTop), T(n)), p();
	}
	function _(t) {
		return !t.disposed && e.pdfSession === t && e.noteEpoch === t.epoch;
	}
	async function v(e, n) {
		let r = new AbortController();
		e.controllers.set(n, r);
		let i = setTimeout(() => r.abort(), 45e3), a = "";
		try {
			let i = t(`/api/papers/${oo(e.paper.literature_id)}/text-layer?page=${n}`, { signal: r.signal }).catch((e) => ({
				hasText: !1,
				text: "",
				lines: [],
				width: 0,
				height: 0,
				error: e.message
			})), o = await fetch(`/api/papers/${oo(e.paper.literature_id)}/preview?page=${n}`, { signal: r.signal });
			if (!o.ok) {
				let e = `预览加载失败 (${o.status})`;
				if ((o.headers.get("content-type") || "").includes("json")) {
					let t = await o.json();
					e = (typeof t.error == "object" ? t.error?.message : t.error) || t.message || e;
				}
				throw Error(e);
			}
			if (!(o.headers.get("content-type") || "").startsWith("image/png")) throw Error("预览接口未返回 PNG 页面图片。");
			let s = Number(o.headers.get("X-PDF-Pages")), c = await o.blob();
			if (!_(e) || r.signal.aborted) throw new DOMException("已停止加载", "AbortError");
			a = URL.createObjectURL(c);
			let l = new Image();
			if (l.className = "pdf-page-image", l.alt = "", l.setAttribute("aria-hidden", "true"), l.draggable = !1, l.src = a, await l.decode(), !_(e) || r.signal.aborted) throw new DOMException("已停止加载", "AbortError");
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
	function y(e) {
		for (let [t, { data: n, element: r }] of e.textLayers) {
			let i = e.pages.get(t);
			r && i && (r.style.transform = `scale(${i.clientWidth / n.width},${i.clientHeight / n.height})`);
		}
	}
	function b(e, t, n) {
		let r = e.pages.get(t);
		if (!r || (e.textLayers.set(t, {
			data: n,
			element: null
		}), !n?.hasText || n.error)) return;
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
				let s = i.rotation || 0, c = s === 90 || s === 270, l = c ? i.width : i.height, u = i.fontFamily && [
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
		}), y(e);
	}
	function x(e) {
		if (!e) return !1;
		let t = document.getSelection();
		if (!t || t.isCollapsed) return !1;
		for (let n = 0; n < t.rangeCount; n++) if (t.getRangeAt(n).intersectsNode(e)) return !0;
		return !1;
	}
	function S(t, n, { img: r, url: i, textLayer: a }) {
		if (!_(t)) {
			URL.revokeObjectURL(i);
			return;
		}
		let o = t.pages.get(n);
		if (!o) {
			URL.revokeObjectURL(i);
			return;
		}
		let s = o.offsetHeight, c = o.offsetTop + s < t.root.scrollTop;
		o.style.aspectRatio = `${r.naturalWidth} / ${r.naturalHeight}`, o.replaceChildren(r), o.dataset.loaded = "true", b(t, n, a), t.urls.set(n, i), t.errors.delete(n), c && (t.root.scrollTop += o.offsetHeight - s, t.manualPage && (t.manualPage.scrollTop = t.root.scrollTop)), n === e.pdfPage && p(), T(t);
	}
	function C(e, t, n = !1) {
		!_(e) || !e.pages.has(t) || e.urls.has(t) || e.controllers.has(t) || e.errors.has(t) || (e.queue.includes(t) || (n ? e.queue.unshift(t) : e.queue.push(t)), w(e));
	}
	function w(t) {
		if (_(t)) for (t.queue = t.queue.filter((t) => Math.abs(t - e.pdfPage) <= 3), t.queue.sort((t, n) => Math.abs(t - e.pdfPage) - Math.abs(n - e.pdfPage)); t.running < 2 && t.queue.length;) {
			let e = t.queue.shift();
			t.urls.has(e) || t.controllers.has(e) || (t.running++, v(t, e).then((n) => S(t, e, n)).catch((n) => {
				if (!_(t) || n.name === "AbortError") return;
				t.errors.add(e);
				let r = t.pages.get(e);
				r && (r.innerHTML = `<div class="pdf-page-placeholder"><span>第 ${e} 页加载失败</span><small>${X(n.message)}</small><button class="button subtle" data-pdf-retry="${e}">重试第 ${e} 页</button></div>`);
			}).finally(() => {
				t.running--, _(t) && (w(t), T(t));
			}));
		}
	}
	function T(t) {
		_(t) && !t.frame && (t.frame = requestAnimationFrame(() => {
			if (t.frame = null, !_(t) || !t.pages.size || !t.root.clientHeight || !t.root.clientWidth) return;
			let n = t.root.scrollTop + Math.min(t.root.clientHeight * .3, 200), r = 1, i = t.pages.size;
			for (; r < i;) {
				let e = Math.floor((r + i) / 2), a = t.pages.get(e);
				!a || a.offsetTop + a.offsetHeight < n ? r = e + 1 : i = e;
			}
			t.manualPage && Math.abs(t.root.scrollTop - t.manualPage.scrollTop) < 2 ? r = t.manualPage.page : (t.manualPage = null, t.root.scrollTop > 0 && t.root.scrollTop + t.root.clientHeight >= t.root.scrollHeight - 2 && (r = t.pages.size));
			let a = e.pdfPage !== r;
			e.pdfPage = r, a && p();
			let s = o.querySelector("#pdf-page");
			s && document.activeElement !== s && (s.value = String(r));
			for (let t of c("[data-pdf-step]")) t.disabled = Number(t.dataset.pdfStep) < 0 ? r <= 1 : r >= e.pdfTotal;
			let l = t.pages.get(r);
			l && (t.anchor = {
				page: r,
				offset: (t.root.scrollTop - l.offsetTop) / l.offsetHeight
			});
			for (let e of [
				r,
				r + 1,
				r - 1
			]) C(t, e, !0);
			for (let [e, n] of t.urls) if (Math.abs(e - r) > 3) {
				let r = t.pages.get(e);
				if (!r || x(r)) continue;
				r.innerHTML = `<div class="pdf-page-placeholder">第 ${e} 页</div>`, delete r.dataset.loaded, URL.revokeObjectURL(n), t.urls.delete(e), t.textLayers.delete(e);
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
			frame: null,
			manualPage: null,
			zoomDelta: 0
		};
		e.pdfSession = Ut(i), e.previewLoading = !0;
		let a = e.pdfPage;
		p(), r.innerHTML = `<div class="loading"><span class="busy-spinner"></span>正在加载 PDF 第 ${a} 页…</div>`;
		try {
			let t = await v(i, a);
			if (!_(i)) {
				URL.revokeObjectURL(t.url);
				return;
			}
			e.pdfTotal = t.total;
			let n = document.createElement("div");
			n.className = "pdf-page-viewport", n.setAttribute("aria-label", "PDF连续阅读");
			for (let r = 1; r <= t.total; r++) {
				let a = document.createElement("div");
				a.className = "pdf-page-sheet", a.dataset.pdfPage = String(r), a.style.width = `${e.pdfZoom}%`, a.style.setProperty("--pdf-zoom", String(e.pdfZoom / 100)), a.style.aspectRatio = `${t.img.naturalWidth} / ${t.img.naturalHeight}`, a.setAttribute("role", "group"), a.setAttribute("aria-label", `PDF物理页序 ${r}`), a.innerHTML = `<div class="pdf-page-placeholder">第 ${r} 页</div>`, n.append(a), i.pages.set(r, a);
			}
			r.replaceChildren(n), r.scrollLeft = 0, S(i, a, t), r.scrollTop = Math.max(0, i.pages.get(a).offsetTop - 24), i.manualPage = {
				page: a,
				scrollTop: r.scrollTop
			}, i.onScroll = () => T(i), r.addEventListener("scroll", i.onScroll, { passive: !0 }), i.onCopy = (e) => {
				let t = e.target;
				if (e.defaultPrevented || t?.isContentEditable || t?.closest?.("input,textarea")) return;
				let n = document.getSelection();
				if (!n?.rangeCount || n.isCollapsed || !e.clipboardData) return;
				let a = n.getRangeAt(0);
				r.contains(a.commonAncestorContainer) && [...i.textLayers.values()].some(({ element: e }) => e && a.intersectsNode(e)) && (e.clipboardData.setData("text/plain", a.cloneContents().textContent ?? ""), e.preventDefault());
			}, document.addEventListener("copy", i.onCopy), i.onUserScroll = (e) => {
				e.type === "keydown" && ![
					"ArrowUp",
					"ArrowDown",
					"PageUp",
					"PageDown",
					"Home",
					"End",
					" "
				].includes(e.key) || e.type === "pointerdown" && e.target !== r || (i.manualPage = null, T(i));
			};
			for (let e of [
				"wheel",
				"touchstart",
				"pointerdown",
				"keydown"
			]) r.addEventListener(e, i.onUserScroll, { passive: !0 });
			i.zoomDelta = 0, i.onZoomWheel = (e) => {
				if (!e.ctrlKey && !e.metaKey) return;
				e.preventDefault(), i.zoomDelta += e.deltaY;
				let t = Math.trunc(i.zoomDelta / 100);
				t && (i.zoomDelta -= t * 100, g(t < 0 ? 10 * -t : -10 * t));
			}, r.addEventListener("wheel", i.onZoomWheel, { passive: !1 }), i.observer = new IntersectionObserver((e) => {
				for (let t of e) t.isIntersecting && C(i, Number(t.target.dataset.pdfPage));
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
					if (y(i), (s || e !== o) && i.anchor) {
						let e = i.pages.get(i.anchor.page);
						e && (r.scrollTop = e.offsetTop + i.anchor.offset * e.offsetHeight), i.manualPage && (i.manualPage.scrollTop = r.scrollTop);
					}
					s = !1, o = e, T(i);
				}
			}), i.resizeObserver.observe(r), T(i);
		} catch (e) {
			if (!_(i)) return;
			let t = e;
			r.innerHTML = `<div class="empty"><h2>页面预览暂不可用</h2><p class="error-text">${X(t.name === "AbortError" ? "预览请求超时，请重试。" : t.message)}</p><button id="retry-preview" class="button subtle">重新加载第 ${a} 页</button><p>也可使用工具栏的“单独打开”查看原 PDF。</p></div>`;
		} finally {
			_(i) && (e.previewLoading = !1, p());
		}
	}
	function E() {
		let n = l();
		if (!n) {
			f(), s("#reader-header").innerHTML = "<span class=\"muted\">阅读</span>", s("#reader-toolbar").hidden = !0, s("#reader-content").innerHTML = `<div class="empty reader-empty"><span class="empty-art">${ao("book")}</span><h2>选择论文</h2><p>从左侧选择，查看原文或笔记。</p></div>`;
			return;
		}
		let r = ++e.noteEpoch;
		f(), s("#reader-header").innerHTML = `<div class="reader-heading"><h2>${X(co(n))}</h2><div class="reader-meta">${X(n.literature_id)} · ${X(n.year || "年份待核实")} · ${X(n.pages ? n.pages + " 页" : "页数待核实")}<br>${X(lo(n))}</div></div><select id="paper-read-status" aria-label="标记阅读进度">${Object.entries(ho).map(([e, t]) => `<option value="${e}" ${go(n.readStatus) === e ? "selected" : ""}>${t}</option>`).join("")}</select>`;
		let i = Array.isArray(n.notes) ? n.notes : [];
		s("#reader-toolbar").hidden = !1, s("#reader-toolbar").innerHTML = `<div class="segmented"><button data-reader-mode="pdf" class="${e.readerMode === "pdf" ? "active" : ""}">原文 PDF</button><button data-reader-mode="note" class="${e.readerMode === "note" ? "active" : ""}">阅读笔记 <small>${i.length}</small></button></div>${e.readerMode === "pdf" && n.file ? `<select id="pdf-renderer" aria-label="PDF显示方式"><option value="preview" ${e.pdfBrowser ? "" : "selected"}>连续阅读</option><option value="browser" ${e.pdfBrowser ? "selected" : ""}>浏览器阅读器</option></select>` : ""}${e.readerMode === "note" && i.length ? `<select id="note-select" aria-label="选择笔记">${i.map((t) => `<option value="${X(t.path)}" ${t.path === e.notePath ? "selected" : ""}>${X(t.title || t.path.split(/[\\/]/).pop())}</option>`).join("")}</select>` : ""}${n.file ? `<a class="open-original" href="${X(so(n.file))}" target="_blank" rel="noopener noreferrer">单独打开${ao("external")}</a>` : ""}${e.readerMode === "pdf" && n.file && !e.pdfBrowser ? "<div id=\"pdf-controls\" class=\"pdf-controls\" role=\"group\" aria-label=\"PDF翻页与缩放\"></div>" : ""}`, e.readerMode === "pdf" ? n.file ? e.pdfBrowser ? s("#reader-content").innerHTML = `<iframe class="pdf-frame" title="${X(co(n))} PDF原文" src="${X(so(n.file))}"></iframe>` : ee(n, r) : s("#reader-content").innerHTML = "<div class=\"empty\"><p>该条目尚无可用原文文件。</p></div>" : i.length ? (e.notePath = i.some((t) => t.path === e.notePath) ? e.notePath : i[0]?.path ?? "", s("#reader-content").innerHTML = "<div class=\"loading\"><span class=\"busy-spinner\"></span>正在读取笔记…</div>", t(`/api/text?path=${encodeURIComponent(e.notePath)}`).then((t) => {
			r === e.noteEpoch && (s("#reader-content").innerHTML = `<article class="note-document markdown">${mo(t.text, e.notePath)}</article>`);
		}).catch((t) => {
			r === e.noteEpoch && (s("#reader-content").innerHTML = `<div class="empty"><p class="error-text">${X(t.message)}</p><button id="retry-note" class="button subtle">重试</button></div>`);
		})) : s("#reader-content").innerHTML = "<div class=\"empty\"><h2>阅读笔记尚待积累</h2><p>可以向研究助手提问，整理阅读笔记。</p><button id=\"ask-note\" class=\"button subtle\">请助手帮我精读</button></div>";
	}
	return o.addEventListener("click", (t) => {
		let n = t.target.closest("button");
		if (n) {
			if (n.dataset.readerMode && (e.readerMode = n.dataset.readerMode), n.dataset.pdfStep && h(e.pdfPage + Number(n.dataset.pdfStep)), n.dataset.pdfZoom && g(Number(n.dataset.pdfZoom)), n.id === "pdf-fit" && g(100 - e.pdfZoom), n.id === "copy-pdf-page" && m(), ["retry-preview", "retry-note"].includes(n.id) && E(), n.dataset.pdfRetry && e.pdfSession) {
				let t = Number(n.dataset.pdfRetry);
				e.pdfSession.errors.delete(t), C(e.pdfSession, t, !0);
			}
			n.id === "ask-note" && (a("请精读当前论文，解释核心方法、证据和局限，给出原文定位，并整理阅读笔记。"), i("chat"));
		}
	}, { signal: d.signal }), o.addEventListener("change", (t) => {
		let n = t.target;
		if (n.id === "paper-read-status") {
			let t = e.current;
			if (!t) return;
			n.disabled = !0, r(t, { readStatus: n.value }).then((r) => {
				!r && e.current === t && (n.value = go(l()?.readStatus)), n.disabled = !1;
			});
		}
		n.id === "note-select" && (e.notePath = n.value), n.id === "pdf-renderer" && (e.pdfBrowser = n.value === "browser"), n.id === "pdf-page" && h(n.value);
	}, { signal: d.signal }), o.addEventListener("keydown", (e) => {
		let t = e.target;
		t.id === "pdf-page" && e.key === "Enter" && (e.preventDefault(), h(t.value));
	}, { signal: d.signal }), u.addEventListener("pagehide", () => {
		++e.noteEpoch, f();
	}, { signal: d.signal }), u.addEventListener("pageshow", (t) => {
		t.persisted && l() && e.readerMode === "pdf" && E();
	}, { signal: d.signal }), {
		render: E,
		dispose: () => {
			++e.noteEpoch, f(), d.abort();
		}
	};
}
// app/web/frontend/components/ReaderPane.vue
var cs = /* @__PURE__ */ Kn({
	__name: "ReaderPane",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ I(null), i;
		return nr(() => {
			r.value && (i = ss({
				state: n,
				scope: r.value,
				api: t.api,
				toast: t.toast,
				patchPaper: t.patchPaper,
				setPanel: t.setPanel,
				setDraft: t.setDraft
			}), i.render());
		}), Ln([
			() => t.currentPaper.value?.file,
			() => n.current,
			() => n.readerMode,
			() => n.notePath,
			() => n.pdfBrowser
		], () => i?.render(), { flush: "post" }), rr(() => i?.dispose()), (e, t) => (V(), H("section", {
			ref_key: "scope",
			ref: r,
			class: "reader-panel",
			"aria-label": "阅读区"
		}, [...t[0] ||= [
			U("div", {
				id: "reader-header",
				class: "reader-header"
			}, null, -1),
			U("div", {
				id: "reader-toolbar",
				class: "reader-toolbar",
				hidden: ""
			}, null, -1),
			U("div", {
				id: "reader-content",
				class: "reader-content",
				tabindex: "0",
				"aria-label": "论文阅读内容"
			}, null, -1)
		]], 512));
	}
}), ls = [
	"disabled",
	"aria-label",
	"aria-expanded",
	"title"
], us = { id: "model-name" }, ds = { class: "model-search" }, fs = [
	"data-model-value",
	"aria-selected",
	"title",
	"onClick"
], ps = {
	key: 0,
	class: "model-empty"
}, ms = /* @__PURE__ */ Kn({
	__name: "ModelPicker",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ I(!1), i = /* @__PURE__ */ I(""), a = /* @__PURE__ */ I(null), o = /* @__PURE__ */ I(null), s = /* @__PURE__ */ I(null), c = q(() => [{
			id: "",
			label: "默认模型"
		}, ...t.models.value]), l = q(() => c.value.filter((e) => `${e.label} ${e.id}`.toLocaleLowerCase().includes(i.value.trim().toLocaleLowerCase()))), u = q(() => c.value.find((e) => e.id === n.model) || c.value[0]), d = q(() => t.busy.value || n.creating || t.agent.value.available !== !0 || !t.models.value.length);
		Ln(c, () => {
			c.value.some((e) => e.id === n.model) || (n.model = "");
		}), Ln(d, (e) => {
			e && (r.value = !1);
		});
		function f(e = !1) {
			r.value = !1, e && a.value?.focus();
		}
		async function p() {
			r.value ? f() : (i.value = "", r.value = !0, await _n(), o.value?.focus());
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
			if (e.key === "Enter" && e.target === o.value) {
				e.preventDefault();
				let t = l.value[0];
				t && m(t.id);
			} else {
				if (["ArrowDown", "ArrowUp"].includes(e.key)) {
					e.preventDefault();
					let n = t.indexOf(document.activeElement);
					t[n < 0 ? e.key === "ArrowDown" ? 0 : t.length - 1 : (n + (e.key === "ArrowDown" ? 1 : -1) + t.length) % t.length]?.focus();
				}
				["Home", "End"].includes(e.key) && e.target.getAttribute("role") === "option" && (e.preventDefault(), t[e.key === "Home" ? 0 : t.length - 1]?.focus());
			}
		}
		function g(e) {
			e.target?.closest?.("#model-menu,#model-trigger") || f();
		}
		return nr(() => {
			document.addEventListener("pointerdown", g), document.addEventListener("focusin", g);
		}), rr(() => {
			document.removeEventListener("pointerdown", g), document.removeEventListener("focusin", g);
		}), (e, t) => (V(), H(B, null, [U("button", {
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
		}, [U("span", us, j(u.value.label.replace(/ · 默认$/, "").split(" · ")[0]), 1), W(Q, { name: "chevron" })], 8, ls), r.value ? (V(), H("div", {
			key: 0,
			id: "model-menu",
			class: "model-menu",
			onKeydown: h
		}, [U("div", ds, [W(Q, { name: "search" }), R(U("input", {
			id: "model-search",
			ref_key: "search",
			ref: o,
			"onUpdate:modelValue": t[0] ||= (e) => i.value = e,
			type: "search",
			placeholder: "搜索模型",
			"aria-label": "搜索模型",
			"aria-controls": "model-list",
			autocomplete: "off"
		}, null, 512), [[J, i.value]])]), U("div", {
			id: "model-list",
			ref_key: "list",
			ref: s,
			class: "model-list",
			role: "listbox",
			"aria-label": "模型"
		}, [(V(!0), H(B, null, z(l.value, (e) => (V(), H("button", {
			key: e.id,
			type: "button",
			role: "option",
			tabindex: "-1",
			class: "model-option",
			"data-model-value": e.id,
			"aria-selected": e.id === L(n).model,
			title: e.id || e.label,
			onClick: (t) => m(e.id)
		}, [U("span", null, j(e.label.replace(/ · 默认$/, "")), 1), e.id === L(n).model ? (V(), di(Q, {
			key: 0,
			name: "check"
		})) : K("", !0)], 8, fs))), 128)), l.value.length ? K("", !0) : (V(), H("div", ps, "未找到模型"))], 512)], 32)) : K("", !0)], 64));
	}
}), hs = {
	id: "attachments",
	class: "attachments"
}, gs = ["src", "alt"], _s = ["title"], vs = ["onClick"], ys = ["aria-label", "onClick"], bs = { class: "composer-toolbar" }, xs = { class: "composer-tools" }, Ss = {
	class: "icon-button upload-button",
	title: "添加附件"
}, Cs = ["disabled"], ws = ["disabled"], Ts = /* @__PURE__ */ Kn({
	__name: "Composer",
	setup(e) {
		let t = Pn("workspace"), n = t.state, { canSend: r, generating: i } = t, a = /* @__PURE__ */ I(null), o = /* @__PURE__ */ I(null), s = /* @__PURE__ */ I(!1);
		function c() {
			a.value && (a.value.style.height = "0px", a.value.style.height = `${Math.min(200, Math.max(58, a.value.scrollHeight))}px`, a.value.style.overflowY = a.value.scrollHeight > 200 ? "auto" : "hidden");
		}
		Ln(() => n.draft, c, { flush: "post" }), Ln(() => n.focusComposer, async () => {
			await _n(), a.value?.focus();
		}), nr(c);
		function l(e) {
			e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && (e.preventDefault(), r.value && o.value?.requestSubmit());
		}
		function u(e) {
			let n = [...e.clipboardData?.items || []].filter((e) => e.kind === "file").map((e) => e.getAsFile()).filter((e) => !!e);
			n.length && (e.preventDefault(), t.uploadFiles(n));
		}
		function d(e) {
			let n = e.target, r = [...n.files || []];
			n.value = "", t.uploadFiles(r);
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
		return (e, c) => (V(), H("form", {
			id: "chat-form",
			ref_key: "form",
			ref: o,
			class: "composer",
			onSubmit: c[1] ||= Y((...e) => L(t).sendMessage && L(t).sendMessage(...e), ["prevent"]),
			onDragover: c[2] ||= Y(() => {}, ["prevent"]),
			onDrop: c[3] ||= Y((e) => L(t).uploadFiles([...e.dataTransfer?.files || []]), ["prevent"])
		}, [
			U("div", hs, [(V(!0), H(B, null, z(L(n).attachments, (e) => (V(), H("div", {
				key: e.key,
				class: A(["attachment", { error: e.status === "error" }])
			}, [
				e.id && e.mime?.startsWith("image/") ? (V(), H("img", {
					key: 0,
					src: `/api/uploads/${L(oo)(e.id)}`,
					alt: e.name
				}, null, 8, gs)) : (V(), di(Q, {
					key: 1,
					name: "attach"
				})),
				U("span", {
					class: "attachment-name",
					title: e.error || e.name
				}, j(e.name) + " " + j(e.status === "uploading" ? " · 上传中" : e.status === "error" ? " · 失败" : ""), 9, _s),
				e.status === "error" ? (V(), H("button", {
					key: 2,
					type: "button",
					onClick: (n) => L(t).uploadOne(e)
				}, "重试", 8, vs)) : K("", !0),
				U("button", {
					type: "button",
					"aria-label": `移除附件 ${e.name}`,
					onClick: (t) => f(e.key)
				}, "×", 8, ys)
			], 2))), 128))]),
			c[4] ||= U("label", {
				class: "sr-only",
				for: "chat-input"
			}, "向研究助手提问", -1),
			R(U("textarea", {
				id: "chat-input",
				ref_key: "input",
				ref: a,
				"onUpdate:modelValue": c[0] ||= (e) => L(n).draft = e,
				rows: "2",
				placeholder: "输入问题…",
				onKeydown: l,
				onPaste: u
			}, null, 544), [[J, L(n).draft]]),
			U("div", bs, [U("div", xs, [U("label", Ss, [W(Q, { name: "plus" }), U("input", {
				id: "file-input",
				type: "file",
				multiple: "",
				"aria-label": "添加图片或文件",
				onChange: d
			}, null, 32)]), W(ms)]), L(i) ? (V(), H("button", {
				key: 0,
				id: "interrupt",
				type: "button",
				class: "send-button stop-button",
				title: "停止生成",
				"aria-label": "停止生成",
				disabled: s.value,
				onClick: p
			}, [W(Q, { name: "stop" })], 8, Cs)) : (V(), H("button", {
				key: 1,
				id: "send",
				type: "submit",
				class: "send-button",
				title: "发送",
				"aria-label": "发送消息",
				disabled: !L(r)
			}, [W(Q, { name: "arrow" })], 8, ws))])
		], 544));
	}
});
// app/web/frontend/lib/api.ts
async function Es(e, t = {}) {
	let n = new AbortController(), r = setTimeout(() => n.abort(), 45e3);
	try {
		let r = await fetch(e, {
			...t,
			signal: t.signal || n.signal
		}), i = (r.headers.get("content-type") || "").includes("json") ? await r.json() : await r.text();
		if (!r.ok) {
			let e = typeof i == "object" && i ? i : null, t = typeof e?.error == "object" ? e.error?.message : e?.error;
			throw Error(t || e?.message || `请求失败 (${r.status})`);
		}
		return i;
	} catch (e) {
		throw e.name === "AbortError" && !t.signal?.aborted ? Error("请求超时，请检查本地服务后重试") : e;
	} finally {
		clearTimeout(r);
	}
}
// app/web/frontend/lib/workspace.ts
var Ds = [
	"streaming",
	"pending",
	"running",
	"in_progress",
	"inProgress",
	"queued"
], Os = {
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
}, ks = (e) => [
	"queued",
	"pending",
	"running",
	"in_progress"
].includes(e.status);
function $(e) {
	return e instanceof Error ? e.message : String(e);
}
function As({ api: e = Es, EventSourceImpl: t = globalThis.EventSource, pollInterval: n = 8e3 } = {}) {
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
	}, o = q(() => r.papers.find((e) => e.literature_id === r.current)), s = q(() => r.status.agents?.pi || {}), c = q(() => (s.value.models || []).map((e) => {
		if (typeof e == "string") return {
			id: e,
			label: e
		};
		let t = e.model || e.id || e.name;
		return t ? {
			id: t,
			label: e.displayName || e.display_name || e.name || t,
			isDefault: e.isDefault
		} : null;
	}).filter((e) => e !== null)), l = q(() => r.chat?.messages?.some((e) => Ds.includes(e.status)) || !1), u = q(() => r.sending || l.value), d = q(() => !r.statusError && !u.value && !r.creating && !!(r.draft.trim() || r.attachments.length) && r.attachments.every((e) => e.status === "ready") && s.value.available === !0 && s.value.authenticated === !0 && r.eventsOpen), f, p = !1, m, h = 0, g = 0, _ = !1, v = /* @__PURE__ */ new Set();
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
		r.view = e, e === "downloads" && me();
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
			r.libraryError = $(e);
		}
	}
	async function ee(t) {
		try {
			let n = await e("/api/categories", Z("POST", { name: t }));
			return await T(), n;
		} catch (e) {
			return y($(e), !0), null;
		}
	}
	async function E(t, n, r) {
		try {
			let i = await e("/api/categories/rename", Z("POST", {
				category: t,
				subcategory: n,
				name: r
			}));
			return await T(), i;
		} catch (e) {
			return y($(e), !0), null;
		}
	}
	async function D(t, n) {
		if (r.pendingPatches.has(t)) return !1;
		r.pendingPatches.add(t);
		try {
			await e(`/api/papers/${oo(t)}`, Z("PATCH", n));
			let i = r.papers.find((e) => e.literature_id === t);
			return i && Object.assign(i, n), !0;
		} catch (e) {
			return y($(e), !0), !1;
		} finally {
			r.pendingPatches.delete(t);
		}
	}
	async function te() {
		try {
			r.status = await e("/api/status"), r.statusError = "";
		} catch (e) {
			r.statusError = $(e);
		}
	}
	async function O() {
		r.status.agents = {
			...r.status.agents,
			pi: {
				...r.status.agents?.pi,
				loading: !0
			}
		};
		try {
			await e("/api/agents/pi/connect", Z("POST", {}));
		} catch (e) {
			y($(e), !0);
		} finally {
			await te();
		}
	}
	async function ne() {
		try {
			r.chats = await e("/api/chats");
		} catch (e) {
			y($(e), !0);
		}
	}
	function re() {
		r.sending || (r.chatEpoch++, r.chat = null, i("zhiyue.chat", null), r.focusComposer++);
	}
	async function k(t) {
		if (r.sending) return;
		let n = ++r.chatEpoch;
		try {
			let a = await e(`/api/chats/${oo(t)}`);
			if (n !== r.chatEpoch || _) return;
			r.chat = a, r.context = new Set(a.paperIds || []), i("zhiyue.chat", a.id), s.value.available !== !0 && O();
		} catch (e) {
			y($(e), !0);
		}
	}
	async function ie(t) {
		let n = r.chatEpoch, i = await e(`/api/chats/${oo(t)}`);
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
	async function ae() {
		if (!d.value || !r.chat && !r.draft.trim() && !r.attachments.length) return !1;
		let t = r.draft.trim(), n = [...r.attachments], a = [...r.context];
		r.sending = !0;
		try {
			if (!r.chat) {
				r.creating = !0;
				try {
					let n = await e("/api/chats", Z("POST", {
						paperIds: a,
						title: t.slice(0, 50) || co(o.value || {})
					}));
					r.chat = {
						...n,
						messages: n.messages || []
					}, i("zhiyue.chat", n.id), r.chats.unshift(n);
				} finally {
					r.creating = !1;
				}
			}
			let s = r.chat, c = {
				text: t,
				paperIds: a,
				attachmentIds: n.map((e) => e.id)
			};
			r.model && (c.model = r.model), await e(`/api/chats/${oo(s.id)}/messages`, Z("POST", c)), r.draft.trim() === t && (r.draft = "");
			let l = new Set(n.map((e) => e.key));
			r.attachments = r.attachments.filter((e) => !l.has(e.key));
			try {
				await ie(s.id);
			} catch {
				y("消息已提交；正在等待会话同步，请勿重复发送。", !0);
			}
			return ne(), !0;
		} catch (e) {
			return y(`消息未能确认提交：${$(e)}。请检查会话后重试。`, !0), !1;
		} finally {
			r.sending = !1;
		}
	}
	async function oe() {
		if (r.chat) try {
			let t = r.chat.id;
			await e(`/api/chats/${oo(t)}/interrupt`, Z("POST", {})), await ie(t);
		} catch (e) {
			y($(e), !0);
		}
	}
	async function se(t) {
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
	async function ce(e) {
		e.status = "uploading", e.error = "";
		try {
			Object.assign(e, await se(e.file), { status: "ready" });
		} catch (t) {
			e.status = "error", e.error = $(t), y(`上传 ${e.name} 失败：${$(t)}`, !0);
		}
	}
	async function le(e) {
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
			r.attachments.push(e), await ce(e);
		}
	}
	async function ue({ uploads: t, category: n }) {
		let { job: i, skipped: a } = await e("/api/library/import", Z("POST", {
			uploads: t,
			category: n
		}));
		return r.jobs.set(i.id, i), {
			job: i,
			skipped: a
		};
	}
	async function de(t, n) {
		let i = r.chat;
		if ((i?.noteDrafts || []).find((e) => e.id === t) && !r.noteSaving) {
			r.noteSaving = t;
			try {
				let r = await e(`/api/note-drafts/${oo(t)}`, Z("POST", { action: n }));
				i.noteDrafts = (i.noteDrafts || []).filter((e) => e.id !== t), n === "save" ? (y(`笔记已保存：${r.path ?? ""}`), await T()) : y("已丢弃笔记草稿");
			} catch (e) {
				y($(e), !0);
			} finally {
				r.noteSaving = "";
			}
		}
	}
	let fe = (e) => de(e, "save"), pe = (e) => de(e, "discard");
	async function A(t, n, i = {}) {
		let a = r.approvals.get(t);
		if (a && !a.submitting) {
			a.submitting = !0;
			try {
				let o = { decision: n }, s = a.params.questions;
				n === "accept" && Array.isArray(s) && s.length && (o.answers = i), await e(`/api/approvals/${oo(t)}`, Z("POST", o)), r.resolvedApprovals.add(t), r.approvals.delete(t);
			} catch (e) {
				a.submitting = !1, y($(e), !0);
			}
		}
	}
	async function me() {
		try {
			let t = await e("/api/downloads");
			for (let e of t.jobs || []) r.jobs.set(e.id, e);
			r.batches = t.batches || [], r.downloadsError = "";
		} catch (e) {
			r.downloadsError = $(e);
		}
	}
	async function he(t) {
		try {
			let n = await e("/api/downloads", Z("POST", t));
			return r.jobs.set(n.id, n), y("下载任务已创建"), !0;
		} catch (e) {
			return y($(e), !0), !1;
		}
	}
	async function ge(t, n) {
		try {
			let i = await e("/api/downloads/action", Z("POST", {
				batch: t,
				action: n,
				...n === "ieee" ? { submit: !0 } : {}
			}));
			return r.jobs.set(i.id, i), y("批次操作已提交"), !0;
		} catch (e) {
			return y($(e), !0), !1;
		}
	}
	async function _e() {
		r.refreshing = !0;
		try {
			let t = await e("/api/catalog/refresh", Z("POST", {}));
			r.jobs.set(t.id, t), y("索引刷新任务已提交，可在任务中心查看");
		} catch (e) {
			y($(e), !0);
		} finally {
			r.refreshing = !1;
		}
	}
	function ve(e) {
		let t = r.chat, n = t.messages ||= [], i = n.findIndex((t) => t.id === e.id);
		i < 0 ? n.push(e) : Object.assign(n[i], e);
	}
	function ye(e) {
		if (_) return;
		let t = r.chat;
		if (e.type === "connected" && Array.isArray(e.approvals)) {
			r.approvals.clear();
			for (let t of e.approvals) r.resolvedApprovals.has(t.id) || r.approvals.set(t.id, t);
		}
		if (e.type === "approvalResolved") {
			let t = String(e.id);
			r.approvals.delete(t), r.resolvedApprovals.add(t);
		}
		if (e.type === "noteDraft" && e.chatId === t?.id && e.draft?.id) {
			let n = e.draft, r = t.noteDrafts ||= [], i = r.findIndex((e) => e.id === n.id);
			i < 0 ? r.push(n) : r[i] = n;
		}
		if (e.type === "noteDraftResolved" && e.chatId === t?.id && (t.noteDrafts = (t.noteDrafts || []).filter((t) => t.id !== e.id)), e.type === "message" && e.chatId === t?.id && e.message?.id && ve(e.message), e.type === "delta" && e.chatId === t?.id) {
			let n = t.messages?.find((t) => t.id === e.messageId);
			n ||= (ve({
				id: String(e.messageId),
				role: "assistant",
				text: "",
				status: "streaming"
			}), t.messages?.find((t) => t.id === e.messageId)), n && (n.text = (n.text || "") + String(e.delta || ""), n.status = "streaming");
		}
		if (e.type === "thinking" && e.chatId === t?.id) {
			let n = t.messages?.find((t) => t.id === e.messageId);
			n && (n.thinking = (n.thinking || "") + String(e.delta || ""), n.status = "streaming");
		}
		let n = e.approval;
		if (e.type === "approval" && n?.id && !r.resolvedApprovals.has(n.id) && r.approvals.set(n.id, {
			...r.approvals.get(n.id),
			...n,
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
		let i = e.job;
		if (e.type === "job" && i?.id) {
			let e = r.jobs.get(i.id);
			r.jobs.set(i.id, {
				...e,
				...i
			}), e && ks(e) && !ks(i) && (y(`任务${Os[i.status] || i.status}：${i.title || i.id}`, ["error", "failed"].includes(i.status)), T(), r.view === "downloads" && me());
		}
	}
	async function be() {
		if (!(document.hidden || p || _)) {
			p = !0;
			try {
				let t = [te()], n = r.chat;
				n && (!r.eventsOpen || u.value) && t.push(ie(n.id));
				for (let n of r.jobs.values()) ks(n) && t.push(e(`/api/jobs/${oo(n.id)}`).then((e) => {
					r.jobs.set(e.id, e), ks(e) || (T(), r.view === "downloads" && me());
				}));
				await Promise.allSettled(t);
			} finally {
				p = !1;
			}
		}
	}
	async function xe() {
		if (t && (f = new t("/api/events"), f.onopen = () => {
			r.eventsOpen = !0, te(), r.chat && ie(r.chat.id).catch(() => {});
		}, f.onerror = () => {
			r.eventsOpen = !1;
		}, f.onmessage = (e) => {
			let t;
			try {
				t = JSON.parse(e.data);
			} catch {
				return;
			}
			ye(t);
		}), await Promise.allSettled([
			T(),
			te(),
			ne(),
			me()
		]), _) return;
		let e = a("zhiyue.chat");
		e && r.chats.some((t) => t.id === e) && await k(e), n && (m = setInterval(be, n));
	}
	function Se() {
		_ = !0, f?.close(), m && clearInterval(m);
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
		renameCategory: E,
		patchPaper: D,
		loadStatus: te,
		reconnectAgent: O,
		loadChats: ne,
		openChat: k,
		syncChat: ie,
		newChat: re,
		sendMessage: ae,
		interrupt: oe,
		uploadFile: se,
		uploadFiles: le,
		uploadOne: ce,
		importPdfs: ue,
		decideApproval: A,
		saveNoteDraft: fe,
		discardNoteDraft: pe,
		loadDownloads: me,
		createDownload: he,
		batchAction: ge,
		refreshCatalog: _e,
		receive: ye,
		start: xe,
		stop: Se
	};
}
// app/web/frontend/components/ChatMessage.vue?vue&type=script&setup=true&lang.ts
var js = ["data-message"], Ms = { class: "message-label sr-only" }, Ns = {
	key: 0,
	class: "message-body"
}, Ps = {
	key: 0,
	class: "message-thinking"
}, Fs = ["innerHTML"], Is = ["innerHTML"], Ls = {
	key: 2,
	class: "message-attachments"
}, Rs = ["href"], zs = ["src", "alt"], Bs = {
	key: 3,
	class: "message-status",
	role: "status",
	"aria-label": "正在生成"
}, Vs = {
	key: 4,
	class: "message-status"
}, Hs = /* @__PURE__ */ Kn({
	__name: "ChatMessage",
	props: { message: {} },
	setup(e) {
		let t = e, n = q(() => [
			"user",
			"assistant",
			"tool",
			"system"
		].includes(t.message.role) ? t.message.role : "assistant"), r = q(() => ({
			user: "你",
			assistant: "Pi Agent",
			tool: "工具",
			system: "系统"
		})[n.value] ?? "Pi Agent"), i = q(() => Ds.includes(t.message.status)), a = q(() => ["error", "failed"].includes(t.message.status)), o = q(() => mo(t.message.text)), s = q(() => mo(t.message.thinking)), c = q(() => {
			let e = t.message.error;
			return e && typeof e == "object" && "message" in e ? String(e.message ?? "") : e ? String(e) : "";
		}), l = q(() => ["interrupted", "cancelled"].includes(t.message.status)), u = q(() => (t.message.attachments || t.message.attachmentIds || []).map((e) => typeof e == "string" ? { id: e } : e).filter((e) => !!e.id));
		return (t, d) => (V(), H("article", {
			class: A(["message", [n.value, {
				streaming: i.value,
				error: a.value
			}]]),
			"data-message": e.message.id
		}, [
			U("div", Ms, j(r.value), 1),
			n.value === "user" ? (V(), H("div", Ns, j(e.message.text), 1)) : (V(), H(B, { key: 1 }, [e.message.thinking ? (V(), H("details", Ps, [d[0] ||= U("summary", null, "推理过程", -1), U("div", {
				class: "message-thinking-body markdown",
				innerHTML: s.value
			}, null, 8, Fs)])) : K("", !0), U("div", {
				class: "message-body markdown",
				innerHTML: o.value
			}, null, 8, Is)], 64)),
			u.value.length ? (V(), H("div", Ls, [(V(!0), H(B, null, z(u.value, (e) => (V(), H("a", {
				key: e.id,
				href: `/api/uploads/${L(oo)(e.id)}`,
				target: "_blank",
				rel: "noopener noreferrer"
			}, [(e.mime || "").startsWith("image/") ? (V(), H("img", {
				key: 0,
				src: `/api/uploads/${L(oo)(e.id)}`,
				alt: e.name || "上传的图片",
				loading: "lazy"
			}, null, 8, zs)) : (V(), H(B, { key: 1 }, [G(j(e.name || "附件"), 1)], 64))], 8, Rs))), 128))])) : K("", !0),
			i.value && !c.value ? (V(), H("div", Bs, [...d[1] ||= [U("span", {
				class: "typing-indicator",
				"aria-hidden": "true"
			}, [
				U("i"),
				U("i"),
				U("i")
			], -1)]])) : c.value || a.value || l.value ? (V(), H("div", Vs, j(c.value || (a.value ? "生成失败" : "已停止")), 1)) : K("", !0)
		], 10, js));
	}
}), Us = ["data-approval"], Ws = { class: "approval-question" }, Gs = [
	"onUpdate:modelValue",
	"data-answer",
	"aria-label"
], Ks = {
	key: 0,
	class: "question-options"
}, qs = ["title", "onClick"], Js = { key: 1 }, Ys = { class: "approval-actions" }, Xs = ["disabled"], Zs = ["disabled"], Qs = /* @__PURE__ */ Kn({
	__name: "ApprovalCard",
	props: { approval: {} },
	setup(e) {
		let t = e, n = Pn("workspace"), r = /* @__PURE__ */ Ft({}), i = q(() => {
			let e = t.approval.params.questions;
			return Array.isArray(e) ? e.map((e, t) => {
				let n = e;
				return {
					...n,
					id: String(n.id ?? n.questionId ?? t),
					text: String(n.question || n.text || n.label || "请补充信息"),
					options: Array.isArray(n.options) ? n.options : void 0
				};
			}) : [];
		}), a = (e) => typeof e == "string" ? e : e.label || e.title || e.value || "";
		function o() {
			let e = Object.fromEntries(i.value.map((e) => [e.id, { answers: [(r[e.id] || "").trim()] }]));
			n.decideApproval(t.approval.id, "accept", e);
		}
		return (t, s) => (V(), H("form", {
			class: "approval",
			"data-approval": e.approval.id,
			onSubmit: Y(o, ["prevent"])
		}, [
			U("h4", null, j(i.value.length ? "需要你的回答" : "等待你的审批"), 1),
			i.value.length ? (V(!0), H(B, { key: 0 }, z(i.value, (e) => (V(), H("div", { key: e.id }, [U("label", Ws, [U("strong", null, j(e.text), 1), R(U("textarea", {
				"onUpdate:modelValue": (t) => r[e.id] = t,
				"data-answer": e.id,
				rows: "2",
				required: "",
				"aria-label": e.text,
				placeholder: "输入你的回答…"
			}, null, 8, Gs), [[J, r[e.id]]])]), e.options?.length ? (V(), H("div", Ks, [(V(!0), H(B, null, z(e.options, (t, n) => (V(), H("button", {
				key: n,
				type: "button",
				class: "button subtle",
				title: typeof t == "string" ? "" : t.description || "",
				onClick: (n) => r[e.id] = a(t)
			}, j(a(t)), 9, qs))), 128))])) : K("", !0)]))), 128)) : (V(), H("pre", Js, j(JSON.stringify(e.approval.params || {}, null, 2)), 1)),
			U("div", Ys, [U("button", {
				class: "button primary",
				type: "submit",
				disabled: e.approval.submitting
			}, j(i.value.length ? "提交回答" : "允许本次"), 9, Xs), U("button", {
				class: "button subtle",
				type: "button",
				disabled: e.approval.submitting,
				onClick: s[0] ||= (t) => L(n).decideApproval(e.approval.id, "decline")
			}, " 拒绝 ", 8, Zs)])
		], 40, Us));
	}
}), $s = ["data-note-draft"], ec = ["data-note-preview"], tc = ["innerHTML"], nc = { class: "note-draft-actions" }, rc = ["data-note-save", "disabled"], ic = ["data-note-discard", "disabled"], ac = /* @__PURE__ */ Kn({
	__name: "NoteDraftCard",
	props: { draft: {} },
	setup(e) {
		let t = e, n = Pn("workspace"), r = /* @__PURE__ */ I(!0), i = q(() => mo(t.draft.content || "")), a = q(() => n.state.noteSaving === t.draft.id);
		return (t, o) => (V(), H("section", {
			class: "note-draft",
			"data-note-draft": e.draft.id
		}, [
			U("header", null, [U("div", null, [U("strong", null, j(e.draft.title), 1), U("small", null, j(e.draft.paperId) + " · " + j(e.draft.path), 1)]), U("button", {
				class: "button subtle",
				type: "button",
				"data-note-preview": e.draft.id,
				onClick: o[0] ||= (e) => r.value = !r.value
			}, j(r.value ? "收起" : "预览"), 9, ec)]),
			r.value ? (V(), H("div", {
				key: 0,
				class: "markdown note-preview",
				innerHTML: i.value
			}, null, 8, tc)) : K("", !0),
			U("div", nc, [U("button", {
				class: "button primary",
				type: "button",
				"data-note-save": e.draft.id,
				disabled: a.value,
				onClick: o[1] ||= (t) => L(n).saveNoteDraft(e.draft.id)
			}, j(a.value ? "保存中…" : "保存为笔记"), 9, rc), U("button", {
				class: "button subtle",
				type: "button",
				"data-note-discard": e.draft.id,
				disabled: a.value,
				onClick: o[2] ||= (t) => L(n).discardNoteDraft(e.draft.id)
			}, " 丢弃 ", 8, ic)])
		], 8, $s));
	}
}), oc = { class: "settings-sheet" }, sc = { class: "settings-head" }, cc = ["disabled"], lc = { class: "settings-body" }, uc = {
	key: 0,
	class: "settings-loading",
	role: "status"
}, dc = { class: "settings-section" }, fc = ["disabled"], pc = {
	value: "",
	disabled: ""
}, mc = ["value"], hc = { class: "settings-hint" }, gc = { class: "settings-section" }, _c = ["disabled"], vc = ["value"], yc = { class: "settings-hint" }, bc = { class: "settings-section" }, xc = { class: "settings-check" }, Sc = ["checked", "disabled"], Cc = { class: "settings-token-row" }, wc = { class: "settings-token-field" }, Tc = ["disabled"], Ec = { class: "settings-token-field" }, Dc = ["disabled"], Oc = { class: "settings-section" }, kc = ["disabled"], Ac = {
	key: 0,
	value: ""
}, jc = ["value"], Mc = {
	key: 0,
	class: "settings-provider-status"
}, Nc = {
	key: 1,
	class: "settings-key-row"
}, Pc = [
	"placeholder",
	"disabled",
	"onKeydown"
], Fc = ["disabled"], Ic = {
	key: 2,
	class: "settings-key-foot"
}, Lc = ["disabled"], Rc = {
	key: 1,
	class: "settings-hint"
}, zc = {
	key: 0,
	class: "settings-error",
	role: "alert"
}, Bc = { class: "settings-actions" }, Vc = ["disabled"], Hc = ["disabled"], Uc = /* @__PURE__ */ Kn({
	__name: "AgentSettingsDialog",
	emits: ["close"],
	setup(e, { emit: t }) {
		let n = Pn("workspace"), r = t, i = {
			off: "关闭",
			minimal: "极简",
			low: "低",
			medium: "中",
			high: "高",
			xhigh: "很高",
			max: "最高"
		}, a = /* @__PURE__ */ I(null), o = /* @__PURE__ */ I({
			defaultModel: "",
			providers: []
		}), s = /* @__PURE__ */ I(""), c = /* @__PURE__ */ I(""), l = /* @__PURE__ */ I(""), u = /* @__PURE__ */ I(""), d = /* @__PURE__ */ I(!0), f = /* @__PURE__ */ I(""), p = /* @__PURE__ */ I(""), m = /* @__PURE__ */ I(!0), h = /* @__PURE__ */ I(""), g = /* @__PURE__ */ I(""), _ = q(() => n.models.value), v = q(() => (o.value.thinking?.available || []).map((e) => ({
			value: e,
			label: i[e] || e
		}))), y = q(() => o.value.providers.filter((e) => e.supportsApiKey)), b = q(() => y.value.find((e) => e.id === c.value) || null), x = q(() => {
			let e = b.value;
			return e ? e.credentialType === "api_key" ? "已保存 API 密钥" : e.credentialType === "oauth" ? "已通过账号登录" : e.configured && e.source === "environment" ? `已由环境变量配置${e.sourceLabel ? `：${e.sourceLabel}` : ""}` : e.configured ? "已配置" : "尚未配置" : "";
		}), S = q(() => b.value?.credentialType === "api_key"), C = q(() => !!b.value && b.value?.credentialType !== "oauth");
		nr(() => {
			let e = a.value;
			typeof e?.showModal == "function" ? e.showModal() : e?.setAttribute("open", ""), ee();
		});
		function w() {
			if (h.value) return;
			let e = a.value;
			typeof e?.close == "function" && e.close(), r("close");
		}
		function T(e) {
			e.target === a.value && !h.value && w();
		}
		async function ee() {
			m.value = !0, g.value = "";
			try {
				E(await n.api("/api/agents/pi/settings"));
			} catch (e) {
				g.value = e.message || "无法读取 Pi 配置。";
			} finally {
				m.value = !1;
			}
		}
		function E(e) {
			if (o.value = e, s.value = _.value.some((t) => t.id === e.defaultModel) ? e.defaultModel : "", u.value = e.thinking?.level || "", d.value = e.compaction?.enabled !== !1, f.value = e.compaction?.reserveTokens ?? "", p.value = e.compaction?.keepRecentTokens ?? "", !y.value.some((e) => e.id === c.value)) {
				let t = String(e.defaultModel || "").split("/")[0];
				c.value = y.value.find((e) => e.id === t)?.id || y.value[0]?.id || "";
			}
			l.value = "";
		}
		async function D() {
			if (!b.value || h.value) return;
			let e = l.value.trim();
			if (!e) {
				g.value = "请输入 API 密钥。";
				return;
			}
			let t = b.value.name;
			h.value = "save", g.value = "";
			try {
				E(await n.api("/api/agents/pi/settings/key", Z("POST", {
					provider: b.value.id,
					key: e
				}))), n.toast(`已保存 ${t} 的 API 密钥。`);
			} catch (e) {
				g.value = e.message || "无法保存 API 密钥。";
			} finally {
				h.value = "";
			}
		}
		async function te() {
			if (!b.value || h.value) return;
			let e = b.value.name;
			if (window.confirm(`清除 ${e} 已保存的 API 密钥？`)) {
				h.value = "remove", g.value = "";
				try {
					E(await n.api("/api/agents/pi/settings/key/remove", Z("POST", { provider: b.value.id }))), n.toast(`已清除 ${e} 的 API 密钥。`);
				} catch (e) {
					g.value = e.message || "无法清除 API 密钥。";
				} finally {
					h.value = "";
				}
			}
		}
		async function O() {
			if (!h.value) {
				h.value = "model", g.value = "";
				try {
					E(await n.api("/api/agents/pi/settings/model", Z("POST", { model: s.value }))), n.toast("默认模型已更新。");
				} catch (e) {
					g.value = e.message || "无法保存默认模型。", s.value = o.value.defaultModel || "";
				} finally {
					h.value = "";
				}
			}
		}
		function ne(e) {
			let t = String(e ?? "").trim();
			return /^\d+$/.test(t) ? Number(t) : NaN;
		}
		async function re() {
			if (h.value || !u.value) return;
			let e = u.value;
			h.value = "thinking", g.value = "";
			try {
				E(await n.api("/api/agents/pi/settings/thinking", Z("POST", {
					level: e,
					...s.value ? { model: s.value } : {}
				}))), n.toast("思考强度已更新。");
			} catch (e) {
				g.value = e.message || "无法保存思考强度。", u.value = o.value.thinking?.level || "";
			} finally {
				h.value = "";
			}
		}
		async function k(e) {
			d.value = e, await ie();
		}
		async function ie() {
			if (h.value) return;
			let e = ne(f.value), t = ne(p.value);
			if (!Number.isSafeInteger(e) || e < 1e3 || e > 2e6) g.value = "预留 token 需为 1000 到 2000000 之间的整数。";
			else if (!Number.isSafeInteger(t) || t < 1e3 || t > 2e6) g.value = "保留近期 token 需为 1000 到 2000000 之间的整数。";
			else {
				h.value = "compaction", g.value = "";
				try {
					E(await n.api("/api/agents/pi/settings/compaction", Z("POST", {
						enabled: d.value,
						reserveTokens: e,
						keepRecentTokens: t
					}))), n.toast("上下文压缩设置已更新。");
				} catch (e) {
					g.value = e.message || "无法保存上下文压缩设置。", f.value = o.value.compaction?.reserveTokens ?? "", p.value = o.value.compaction?.keepRecentTokens ?? "";
				} finally {
					h.value = "";
				}
			}
		}
		async function ae() {
			h.value || (h.value = "reload", await n.reconnectAgent(), h.value = "", await ee());
		}
		return (e, t) => (V(), H("dialog", {
			ref_key: "dialog",
			ref: a,
			class: "settings-dialog",
			"aria-labelledby": "settings-title",
			onCancel: Y(w, ["prevent"]),
			onClick: T
		}, [U("div", oc, [
			U("header", sc, [t[8] ||= U("div", null, [U("h2", { id: "settings-title" }, "模型与密钥"), U("p", null, "网站与终端 Pi 共用本机配置。")], -1), U("button", {
				type: "button",
				class: "icon-button",
				title: "关闭",
				"aria-label": "关闭",
				disabled: !!h.value,
				onClick: w
			}, [W(Q, { name: "close" })], 8, cc)]),
			U("div", lc, [m.value ? (V(), H("div", uc, [...t[9] ||= [U("span", { class: "busy-spinner" }, null, -1), G("正在读取本机 Pi 配置… ", -1)]])) : (V(), H(B, { key: 1 }, [
				U("section", dc, [
					t[10] ||= U("label", {
						class: "settings-label",
						for: "settings-model"
					}, "默认模型", -1),
					R(U("select", {
						id: "settings-model",
						"onUpdate:modelValue": t[0] ||= (e) => s.value = e,
						disabled: !_.value.length || !!h.value,
						onChange: O
					}, [U("option", pc, j(_.value.length ? "选择模型" : "尚无可用模型"), 1), (V(!0), H(B, null, z(_.value, (e) => (V(), H("option", {
						key: e.id,
						value: e.id
					}, j(e.label), 9, mc))), 128))], 40, fc), [[Va, s.value]]),
					U("p", hc, j(_.value.length ? "用于网站新会话，也会成为终端 Pi 的默认模型。" : "尚无可用模型，请先在下方配置 API 密钥或登录账号。"), 1)
				]),
				U("section", gc, [
					t[11] ||= U("label", {
						class: "settings-label",
						for: "settings-thinking"
					}, "思考强度", -1),
					R(U("select", {
						id: "settings-thinking",
						"onUpdate:modelValue": t[1] ||= (e) => u.value = e,
						disabled: !v.value.length || !!h.value,
						onChange: re
					}, [(V(!0), H(B, null, z(v.value, (e) => (V(), H("option", {
						key: e.value,
						value: e.value
					}, j(e.label), 9, vc))), 128))], 40, _c), [[Va, u.value]]),
					U("p", yc, j(v.value.length ? "对当前会话立即生效，并成为终端 Pi 的默认档位；模型不支持的档位不会出现。" : "当前模型没有可用的思考档位。"), 1)
				]),
				U("section", bc, [
					t[15] ||= U("span", { class: "settings-label" }, "上下文压缩", -1),
					U("label", xc, [U("input", {
						type: "checkbox",
						checked: d.value,
						disabled: !!h.value,
						onChange: t[2] ||= (e) => k(e.target.checked)
					}, null, 40, Sc), t[12] ||= G(" 长会话自动摘要历史 ", -1)]),
					U("div", Cc, [U("label", wc, [t[13] ||= U("span", null, "预留 token", -1), R(U("input", {
						"onUpdate:modelValue": t[3] ||= (e) => f.value = e,
						type: "number",
						min: "1000",
						max: "2000000",
						step: "1000",
						disabled: !!h.value,
						onChange: ie
					}, null, 40, Tc), [[J, f.value]])]), U("label", Ec, [t[14] ||= U("span", null, "保留近期 token", -1), R(U("input", {
						"onUpdate:modelValue": t[4] ||= (e) => p.value = e,
						type: "number",
						min: "1000",
						max: "2000000",
						step: "1000",
						disabled: !!h.value,
						onChange: ie
					}, null, 40, Dc), [[J, p.value]])])]),
					t[16] ||= U("p", { class: "settings-hint" }, " 预留越大越早压缩；保留量决定压缩后仍原样保留的近期对话长度。修改后对当前会话生效。 ", -1)
				]),
				U("section", Oc, [
					t[17] ||= U("label", {
						class: "settings-label",
						for: "settings-provider"
					}, "API 密钥", -1),
					R(U("select", {
						id: "settings-provider",
						"onUpdate:modelValue": t[5] ||= (e) => c.value = e,
						disabled: !y.value.length || !!h.value,
						onChange: t[6] ||= (e) => l.value = ""
					}, [y.value.length ? K("", !0) : (V(), H("option", Ac, "没有支持 API 密钥的服务商")), (V(!0), H(B, null, z(y.value, (e) => (V(), H("option", {
						key: e.id,
						value: e.id
					}, j(e.name) + j(e.configured ? " · 已配置" : ""), 9, jc))), 128))], 40, kc), [[Va, c.value]]),
					b.value ? (V(), H("p", Mc, j(x.value), 1)) : K("", !0),
					C.value ? (V(), H("div", Nc, [R(U("input", {
						"onUpdate:modelValue": t[7] ||= (e) => l.value = e,
						type: "password",
						autocomplete: "off",
						spellcheck: "false",
						placeholder: S.value ? "输入新密钥以替换" : "粘贴 API 密钥",
						"aria-label": "API 密钥",
						disabled: !!h.value,
						onKeydown: Ya(Y(D, ["prevent"]), ["enter"])
					}, null, 40, Pc), [[J, l.value]]), U("button", {
						type: "button",
						class: "button primary",
						disabled: !!h.value || !l.value.trim(),
						onClick: D
					}, j(h.value === "save" ? "保存中…" : "保存"), 9, Fc)])) : K("", !0),
					b.value ? (V(), H("div", Ic, [S.value ? (V(), H("button", {
						key: 0,
						type: "button",
						class: "text-button",
						disabled: !!h.value,
						onClick: te
					}, j(h.value === "remove" ? "正在清除…" : "清除已保存密钥"), 9, Lc)) : K("", !0), b.value.credentialType === "oauth" ? (V(), H("span", Rc, " 该服务商已通过账号登录；如需改用 API 密钥，请先在终端 Pi 中退出登录。 ")) : K("", !0)])) : K("", !0)
				]),
				g.value ? (V(), H("p", zc, j(g.value), 1)) : K("", !0)
			], 64))]),
			U("footer", Bc, [U("button", {
				type: "button",
				class: "button subtle",
				disabled: !!h.value,
				onClick: ae
			}, [W(Q, { name: "refresh" }), t[18] ||= G("重新检测 ", -1)], 8, Vc), U("button", {
				type: "button",
				class: "button primary",
				disabled: !!h.value,
				onClick: w
			}, "完成", 8, Hc)])
		])], 544));
	}
}), Wc = {
	id: "assistant-panel",
	class: "chat-panel",
	"aria-label": "文献研究助手"
}, Gc = { class: "chat-header" }, Kc = { class: "assistant-title" }, qc = [
	"aria-label",
	"title",
	"data-state"
], Jc = { class: "chat-actions" }, Yc = ["aria-expanded"], Xc = ["disabled"], Zc = {
	key: 0,
	id: "chat-history",
	class: "chat-history"
}, Qc = ["data-chat", "onClick"], $c = {
	key: 0,
	class: "empty"
}, el = {
	key: 1,
	id: "auth-banner",
	class: "auth-banner"
}, tl = { class: "auth-banner-actions" }, nl = {
	key: 2,
	class: "chat-context"
}, rl = { id: "context-papers" }, il = [
	"data-context-remove",
	"title",
	"aria-label",
	"onClick"
], al = {
	key: 0,
	class: "chat-empty"
}, ol = { class: "presets" }, sl = ["data-prompt", "onClick"], cl = {
	key: 3,
	id: "note-drafts",
	class: "note-drafts",
	"aria-live": "polite"
}, ll = {
	id: "approvals",
	class: "approvals",
	"aria-live": "polite"
}, ul = /* @__PURE__ */ Kn({
	__name: "AssistantPane",
	setup(e) {
		let t = Pn("workspace"), n = t.state, { agent: r } = t, i = /* @__PURE__ */ I(null), a = /* @__PURE__ */ I(!1), o = q(() => r.value.loading === !0 || r.value.available == null || r.value.authenticated == null), s = q(() => r.value.available === !0 && r.value.authenticated === !0), c = q(() => n.statusError || r.value.available === !1 ? "error" : o.value || !n.eventsOpen || !s.value ? "loading" : "connected"), l = q(() => n.statusError || r.value.error || (s.value && n.eventsOpen ? "已连接" : o.value ? "正在连接" : "等待配置")), u = q(() => !!n.statusError || !o.value && !s.value), d = q(() => [...n.approvals.values()].filter((e) => e.chatId === n.chat?.id && !n.resolvedApprovals.has(e.id))), f = q(() => n.chat?.noteDrafts || []), p = [
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
		], m = (e) => co(n.papers.find((t) => t.literature_id === e) || { literature_id: e });
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
		function h() {
			n.historyOpen = !n.historyOpen, n.historyOpen && t.loadChats();
		}
		function g(e) {
			return new Date(e.createdAt ?? "").toLocaleString("zh-CN");
		}
		return (e, o) => (V(), H("aside", Wc, [
			W(bo, { kind: "assistant" }),
			U("div", Gc, [U("div", Kc, [o[6] ||= U("span", { class: "agent-name" }, "Pi Agent", -1), U("span", {
				id: "connection-status",
				class: "connection-indicator",
				role: "status",
				"aria-label": l.value,
				title: l.value,
				"data-state": c.value
			}, null, 8, qc)]), U("div", Jc, [
				U("button", {
					id: "agent-settings",
					class: "icon-button",
					title: "模型与密钥",
					"aria-label": "模型与密钥",
					onClick: o[0] ||= (e) => a.value = !0
				}, [W(Q, { name: "settings" })]),
				U("button", {
					id: "chat-history-toggle",
					class: "icon-button",
					title: "会话列表",
					"aria-label": "会话列表",
					"aria-expanded": L(n).historyOpen,
					onClick: h
				}, [W(Q, { name: "history" })], 8, Yc),
				U("button", {
					id: "new-chat",
					class: "icon-button",
					title: "新建会话",
					"aria-label": "新建会话",
					disabled: L(n).creating || L(n).sending,
					onClick: o[1] ||= (...e) => L(t).newChat && L(t).newChat(...e)
				}, [W(Q, { name: "plus" })], 8, Xc)
			])]),
			L(n).historyOpen ? (V(), H("div", Zc, [(V(!0), H(B, null, z(L(n).chats, (e) => (V(), H("button", {
				key: e.id,
				class: A(["history-item", { active: L(n).chat?.id === e.id }]),
				"data-chat": e.id,
				onClick: (n) => L(t).openChat(e.id)
			}, [G(j(e.title || "新会话") + " ", 1), U("small", null, j(g(e)) + " " + j((e.paperIds || []).join(" · ")), 1)], 10, Qc))), 128)), L(n).chats.length ? K("", !0) : (V(), H("div", $c, "暂无会话"))])) : K("", !0),
			u.value ? (V(), H("div", el, [U("span", null, j(L(n).statusError || L(r).error || "Pi 尚未配置模型或密钥。"), 1), U("span", tl, [U("button", {
				id: "open-agent-settings",
				onClick: o[2] ||= (e) => a.value = !0
			}, "配置模型与密钥"), U("button", {
				id: "retry-status",
				onClick: o[3] ||= (...e) => L(t).reconnectAgent && L(t).reconnectAgent(...e)
			}, "重新检测")])])) : K("", !0),
			L(n).context.size ? (V(), H("div", nl, [U("div", rl, [(V(!0), H(B, null, z(L(n).context, (e) => (V(), H("button", {
				key: e,
				class: "context-chip",
				"data-context-remove": e,
				title: m(e),
				"aria-label": `移除 ${e}`,
				onClick: (t) => L(n).context.delete(e)
			}, [G(j(e), 1), W(Q, { name: "close" })], 8, il))), 128))]), U("button", {
				id: "clear-context",
				class: "icon-button",
				title: "清空论文上下文",
				"aria-label": "清空论文上下文",
				onClick: o[4] ||= (e) => L(n).context.clear()
			}, [W(Q, { name: "close" })])])) : K("", !0),
			U("div", {
				id: "messages",
				ref_key: "messages",
				ref: i,
				class: "messages",
				role: "log",
				"aria-label": "对话消息",
				"aria-live": "off"
			}, [(V(!0), H(B, null, z(L(n).chat?.messages || [], (e) => (V(), di(Hs, {
				key: e.id,
				message: e
			}, null, 8, ["message"]))), 128)), L(n).chat?.messages?.length ? K("", !0) : (V(), H("div", al, [o[7] ||= U("h2", null, "从一个问题开始", -1), U("div", ol, [(V(), H(B, null, z(p, ([e, n, r]) => U("button", {
				key: n,
				class: "preset",
				"data-prompt": r,
				onClick: (e) => L(t).setDraft(r)
			}, [W(Q, { name: e }, null, 8, ["name"]), G(j(n), 1)], 8, sl)), 64))])]))], 512),
			f.value.length ? (V(), H("div", cl, [(V(!0), H(B, null, z(f.value, (e) => (V(), di(ac, {
				key: e.id,
				draft: e
			}, null, 8, ["draft"]))), 128))])) : K("", !0),
			U("div", ll, [(V(!0), H(B, null, z(d.value, (e) => (V(), di(Qs, {
				key: e.id,
				approval: e
			}, null, 8, ["approval"]))), 128))]),
			W(Ts),
			a.value ? (V(), di(Uc, {
				key: 4,
				onClose: o[5] ||= (e) => a.value = !1
			})) : K("", !0)
		]));
	}
}), dl = {
	id: "downloads-view",
	class: "downloads-view"
}, fl = { class: "download-columns" }, pl = { class: "surface-heading" }, ml = ["value"], hl = { class: "download-options" }, gl = { class: "check-label" }, _l = ["disabled"], vl = { class: "download-results" }, yl = { class: "section-heading" }, bl = { id: "download-jobs" }, xl = {
	key: 0,
	class: "surface empty"
}, Sl = { class: "job-heading" }, Cl = {
	key: 0,
	class: "error-text"
}, wl = {
	key: 1,
	class: "job-counts"
}, Tl = ["data-job-details"], El = { class: "job-log" }, Dl = {
	key: 2,
	class: "surface empty"
}, Ol = { class: "empty-art" }, kl = { id: "download-batches" }, Al = {
	key: 0,
	class: "section-heading"
}, jl = { class: "job-heading" }, Ml = { class: "status-badge" }, Nl = { class: "batch-actions" }, Pl = ["disabled", "onClick"], Fl = "papers/09_情感综述调研/网站导入", Il = /* @__PURE__ */ Kn({
	__name: "DownloadPanel",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ Ft({
			title: "",
			input: "",
			category: Fl,
			channel: "public",
			autoArchive: !1
		}), i = /* @__PURE__ */ I(!1), a = /* @__PURE__ */ Ft(/* @__PURE__ */ new Set()), o = q(() => uo(n.categories, Fl)), s = q(() => [...n.jobs.values()].reverse()), c = (e) => {
			let t = e.result;
			return t && typeof t == "object" ? t.counts : void 0;
		}, l = (e) => Object.entries(e && typeof e == "object" ? e : {}).map(([e, t]) => `${Os[e] || e} ${String(t)}`).join(" · "), u = (e) => typeof e == "string" ? e : JSON.stringify(e), d = (e) => Array.isArray(e) ? e.map((e) => typeof e == "string" ? e : JSON.stringify(e)).join("\n") : typeof e == "string" && e ? e : "暂无日志", f = [
			["download", "继续下载"],
			["verify", "核验文件"],
			["archive", "归档入库"],
			["ieee", "提交IEEE获取"],
			["collect", "收集机构下载"]
		];
		async function p() {
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
		async function m(e, n) {
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
		return (e, h) => (V(), H("section", dl, [h[21] ||= U("div", { class: "download-intro" }, [U("h2", null, "添加论文"), U("p", null, "输入 DOI 或题名，查看下载、核验与归档进度。")], -1), U("div", fl, [U("form", {
			id: "download-form",
			class: "surface download-form",
			onSubmit: Y(p, ["prevent"])
		}, [
			U("div", pl, [W(Q, { name: "download" }), h[7] ||= U("h3", null, "新建下载任务", -1)]),
			h[12] ||= U("label", { for: "download-title" }, [G("任务名称 "), U("span", { class: "muted" }, "可选")], -1),
			R(U("input", {
				id: "download-title",
				"onUpdate:modelValue": h[0] ||= (e) => r.title = e,
				placeholder: "例如：语音情感识别 · 经典文献"
			}, null, 512), [[J, r.title]]),
			h[13] ||= U("label", { for: "download-input" }, "论文信息", -1),
			R(U("textarea", {
				id: "download-input",
				"onUpdate:modelValue": h[1] ||= (e) => r.input = e,
				rows: "7",
				required: "",
				placeholder: "粘贴 DOI、论文题名或 JSON 清单\n每行一项"
			}, null, 512), [[J, r.input]]),
			h[14] ||= U("label", { for: "download-category" }, "归档分类", -1),
			R(U("select", {
				id: "download-category",
				"onUpdate:modelValue": h[2] ||= (e) => r.category = e
			}, [(V(!0), H(B, null, z(o.value, ([e, t]) => (V(), H("option", {
				key: e,
				value: e
			}, j(t), 9, ml))), 128))], 512), [[Va, r.category]]),
			U("div", hl, [U("label", null, [h[9] ||= G("获取渠道", -1), R(U("select", {
				id: "download-channel",
				"onUpdate:modelValue": h[3] ||= (e) => r.channel = e
			}, [...h[8] ||= [
				U("option", { value: "public" }, "公开来源", -1),
				U("option", { value: "auto" }, "自动选择", -1),
				U("option", { value: "ieee" }, "IEEE / 机构渠道", -1)
			]], 512), [[Va, r.channel]])]), U("label", gl, [R(U("input", {
				id: "auto-archive",
				"onUpdate:modelValue": h[4] ||= (e) => r.autoArchive = e,
				type: "checkbox"
			}, null, 512), [[za, r.autoArchive]]), h[10] ||= G("核验后自动归档", -1)])]),
			U("button", {
				id: "start-download",
				type: "submit",
				class: "button primary",
				disabled: i.value
			}, [W(Q, { name: "plus" }), h[11] ||= G("创建下载任务 ", -1)], 8, _l),
			h[15] ||= U("p", { class: "muted form-note" }, "机构认证与需要确认的操作，由后端工具返回状态。", -1)
		], 32), U("div", vl, [
			U("div", yl, [h[17] ||= U("h3", null, "任务与批次", -1), U("button", {
				id: "refresh-downloads",
				class: "button subtle",
				onClick: h[5] ||= (...e) => L(t).loadDownloads && L(t).loadDownloads(...e)
			}, [W(Q, { name: "refresh" }), h[16] ||= G("刷新 ", -1)])]),
			U("div", bl, [L(n).downloadsError ? (V(), H("div", xl, [U("p", null, j(L(n).downloadsError), 1), U("button", {
				class: "button subtle",
				onClick: h[6] ||= (...e) => L(t).loadDownloads && L(t).loadDownloads(...e)
			}, "重试")])) : (V(!0), H(B, { key: 1 }, z(s.value, (e) => (V(), H("article", {
				key: e.id,
				class: "job-card"
			}, [
				U("div", Sl, [U("h4", null, j(e.title || e.batch || e.id), 1), U("span", { class: A(["status-badge", { failed: ["error", "failed"].includes(e.status) }]) }, j(L(Os)[e.status] || e.status || "状态待确认"), 3)]),
				e.error ? (V(), H("p", Cl, j(u(e.error)), 1)) : K("", !0),
				U("p", null, j(e.message || e.action || ""), 1),
				c(e) ? (V(), H("p", wl, " 批次结果：" + j(l(c(e)) || "暂无计数"), 1)) : K("", !0),
				U("details", { "data-job-details": e.id }, [h[18] ||= U("summary", null, "查看任务日志", -1), U("pre", El, j(d(e.log)), 1)], 8, Tl)
			]))), 128)), !L(n).downloadsError && !s.value.length ? (V(), H("div", Dl, [U("span", Ol, [W(Q, { name: "download" })]), h[19] ||= U("p", null, "暂无下载任务", -1)])) : K("", !0)]),
			U("div", kl, [L(n).batches.length ? (V(), H("div", Al, [...h[20] ||= [U("h3", null, "已有下载批次", -1)]])) : K("", !0), (V(!0), H(B, null, z(L(n).batches, (e) => (V(), H("article", {
				key: e.batch,
				class: "batch-card"
			}, [
				U("div", jl, [U("h4", null, j(e.batch), 1), U("span", Ml, j(e.entries) + " 条", 1)]),
				U("p", null, j(l(e.counts)), 1),
				U("div", Nl, [(V(), H(B, null, z(f, ([t, n]) => U("button", {
					key: t,
					class: "button subtle",
					disabled: a.has(`${e.batch}:${t}`),
					onClick: (n) => m(e.batch, t)
				}, j(n), 9, Pl)), 64))])
			]))), 128))])
		])])]));
	}
}), Ll = { class: "import-head" }, Rl = ["disabled"], zl = { class: "import-body" }, Bl = { class: "import-pick" }, Vl = ["disabled"], Hl = { class: "import-file-icon" }, Ul = { class: "import-file-text" }, Wl = ["disabled"], Gl = {
	key: 0,
	class: "import-list"
}, Kl = { class: "import-list-head" }, ql = ["disabled"], Jl = { class: "import-items" }, Yl = { class: "import-item-head" }, Xl = { class: "import-item-index" }, Zl = { class: "import-item-main" }, Ql = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], $l = { class: "import-item-file" }, eu = {
	key: 0,
	class: "import-item-badge"
}, tu = {
	key: 1,
	class: "import-item-badge failed"
}, nu = [
	"title",
	"aria-label",
	"aria-expanded",
	"disabled",
	"onClick"
], ru = ["disabled", "onClick"], iu = {
	key: 0,
	class: "import-item-extra"
}, au = { class: "import-field wide" }, ou = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], su = { class: "import-field" }, cu = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], lu = { class: "import-field" }, uu = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], du = { class: "import-fields" }, fu = { class: "import-field wide" }, pu = ["disabled"], mu = ["value"], hu = {
	key: 1,
	class: "import-check"
}, gu = ["disabled"], _u = {
	key: 2,
	class: "import-error",
	role: "alert"
}, vu = {
	key: 3,
	class: "import-summary",
	role: "status"
}, yu = {
	key: 4,
	class: "import-progress",
	role: "status"
}, bu = {
	key: 5,
	class: "import-log-wrap"
}, xu = { class: "import-log" }, Su = { class: "import-actions" }, Cu = ["disabled"], wu = ["disabled"], Tu = 100, Eu = /* @__PURE__ */ Kn({
	__name: "ImportPaperDialog",
	emits: ["close", "imported"],
	setup(e, { emit: t }) {
		let n = Pn("workspace"), r = n.state, i = t, a = /* @__PURE__ */ I(null), o = /* @__PURE__ */ I(null), s = /* @__PURE__ */ I(null), c = /* @__PURE__ */ Ft({
			category: "papers/09_情感综述调研/网站导入",
			confirmed: !1
		}), l = /* @__PURE__ */ Ft([]), u = /* @__PURE__ */ I(""), d = /* @__PURE__ */ I(!1), f = /* @__PURE__ */ I(null), p = /* @__PURE__ */ I(!1), m = /* @__PURE__ */ I("idle"), h = /* @__PURE__ */ I(""), g = /* @__PURE__ */ I(0), _ = /* @__PURE__ */ I([]), v = /* @__PURE__ */ I(null), y = /* @__PURE__ */ I(null), b = 0, x = q(() => {
			let e = uo(r.categories), t = f.value;
			return t && !e.some(([e]) => e === t[0]) && e.push(t), e;
		}), S = q(() => m.value === "uploading" || m.value === "processing"), C = q(() => {
			let e = y.value?.log;
			return (Array.isArray(e) ? e.join("") : typeof e == "string" ? e : "").slice(-4e3);
		}), w = q(() => l.length - _.value.length), T = q(() => {
			let e = y.value?.steps || [], t = e.filter((e) => e.action === "attach" && e.status === "completed").length, n = e.some((e) => e.action === "archive");
			return Math.min(t + +!!n, w.value);
		}), ee = q(() => m.value === "uploading" ? "正在上传…" : m.value === "processing" ? "正在归档…" : m.value === "failed" ? "重试" : l.length > 1 ? `导入并归档 ${l.length} 篇` : "导入并归档");
		nr(() => {
			let e = a.value;
			typeof e?.showModal == "function" ? e.showModal() : e?.setAttribute("open", "");
		});
		function E() {
			if (S.value) return;
			let e = a.value;
			typeof e?.close == "function" && e.close(), i("close");
		}
		function D(e) {
			e.target === a.value && !S.value && E();
		}
		function te(e) {
			let t = e / 1024 / 1024;
			return t >= 1 ? `${t.toFixed(1)} MB` : `${Math.max(1, Math.round(e / 1024))} KB`;
		}
		function O() {
			for (let e of [o.value, s.value]) e && (e.value = "");
		}
		function ne(e) {
			se(e.target.files), O();
		}
		function re() {
			o.value?.click();
		}
		function k() {
			s.value?.click();
		}
		function ie(e) {
			let t = /* @__PURE__ */ new Set();
			for (let n of Array.from(e)) {
				let e = n.webkitRelativePath || "";
				e.includes("/") && t.add(e.split("/")[0]);
			}
			return t.size === 1 ? [...t][0] : "";
		}
		function ae(e) {
			let t = (e) => String(e).replace(/^\d+_/, "").trim().toLocaleLowerCase(), n = x.value, r = n.find(([t]) => t.split("/")[1] === e);
			if (r) return r[0];
			let i = n.find(([n]) => t(n.split("/")[1]) === t(e));
			return i ? i[0] : "";
		}
		function oe(e) {
			let t = String(e || "").trim();
			return !t || t === "." || t === ".." || t.includes("..") || /[\\/:*?"<>|\x00-\x1f\x7f]/.test(t) || /[. ]$/.test(t) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(t) ? null : {
				value: `papers/${t}/网站导入`,
				label: `${t.replace(/^\d+_/, "")} / 网站导入（新建）`
			};
		}
		function se(e, t = "") {
			if (S.value) return;
			h.value = "";
			let n = !l.length, r = (e ? ie(e) : "") || t, i = [], a = 0, o = 0;
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
				if (l.length >= Tu) {
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
				let e = ae(r);
				if (e) f.value = null, c.category = e;
				else {
					let e = oe(r);
					e && (f.value = [e.value, e.label], c.category = e.value);
				}
			}
			if (!u.value && l.length === 1 && (u.value = l[0]?.key ?? ""), a && (c.confirmed = !1), o && i.unshift(`每次最多导入 ${Tu} 个 PDF，其余 ${o} 个未加入`), i.length) {
				let e = i.length > 3 ? `；另有 ${i.length - 3} 个未加入` : "";
				h.value = `${i.slice(0, 3).join("；")}${e}。`;
			} else a || (h.value = "所选内容中没有可导入的 PDF。");
		}
		async function ce(e, t) {
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
				for (let n of e) await ce(n, t);
				if (t.length > Tu) break;
			}
		}
		async function le(e) {
			if (p.value = !1, S.value) return;
			let t = e.dataTransfer;
			if (!t) return;
			let n = [...t.items || []].map((e) => e.kind === "file" ? e.webkitGetAsEntry?.() : null).filter((e) => !!e);
			if (!n.length) {
				se(t.files);
				return;
			}
			let r = [];
			try {
				for (let e of n) await ce(e, r);
			} catch {
				h.value = "无法读取拖入的部分文件，请改用“选择文件”或“选择文件夹”。";
				return;
			}
			if (!r.length) {
				h.value = "拖入的内容中没有可导入的 PDF。";
				return;
			}
			let i = n[0];
			se(r, n.length === 1 && i.isDirectory ? i.name : "");
		}
		function ue(e) {
			u.value = u.value === e.key ? "" : e.key;
		}
		function de(e) {
			if (S.value) return;
			let t = l.indexOf(e);
			t < 0 || (l.splice(t, 1), u.value === e.key && (u.value = ""), l.length || pe());
		}
		function fe() {
			!S.value && l.length && window.confirm("清空已选文件和已填信息？") && (l.splice(0), u.value = "", d.value = !1, f.value = null, pe(), O());
		}
		function pe() {
			c.confirmed = !1, m.value = "idle", h.value = "", _.value = [], v.value = null, y.value = null;
		}
		function me() {
			if (!l.length) return "请选择要导入的 PDF。";
			for (let [e, t] of l.entries()) {
				if (!t.title.trim()) return u.value = t.key, `第 ${e + 1} 个文件缺少题名。`;
				if (t.year && !/^\d{4}$/.test(t.year.trim())) return u.value = t.key, `第 ${e + 1} 个文件的年份需为四位数字。`;
				let n = t.doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
				if (n && !/^10\.\d{4,9}\/\S+$/.test(n)) return u.value = t.key, `第 ${e + 1} 个文件的 DOI 格式不正确。`;
			}
			return c.confirmed ? "" : "请先核对题名与作者信息。";
		}
		async function he(e) {
			for (;;) {
				let t = await n.api(`/api/jobs/${oo(e)}`);
				if (r.jobs.set(t.id, t), y.value = t, t.status === "completed") return t;
				if (t.status === "failed") throw Error(t.error || "导入任务失败。");
				await new Promise((e) => setTimeout(e, 800));
			}
		}
		async function ge() {
			if (S.value) return;
			h.value = "";
			let e = me();
			if (e) {
				h.value = e;
				return;
			}
			let t = new Set(r.papers.map((e) => e.literature_id));
			_.value = [], v.value = null, m.value = "uploading", g.value = 0;
			let a = null;
			try {
				for (let [e, t] of l.entries()) t.status = t.uploadId ? "ready" : "new", t.note = "", t.uploadId || (a = t, g.value = e + 1, t.status = "uploading", t.uploadId = (await n.uploadFile(t.file)).id ?? "", t.status = "ready");
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
					t && (t.status = "skipped", t.note = e.literature_id ? `已归档为 ${e.literature_id}${e.literature_title ? `：${e.literature_title}` : ""}` : e.reason || "");
				}
				y.value = e;
				let s = await he(e.id);
				await n.loadLibrary();
				let u = s.result?.counts, d = Number(u?.archived) || 0, f = Math.max(0, w.value - d), p = r.papers.filter((e) => !t.has(e.literature_id));
				if (v.value = {
					archived: d,
					skipped: _.value.length,
					failed: f
				}, d) {
					let e = p.slice(0, 6).map((e) => e.literature_id).join("、"), t = p.length > 6 ? ` 等 ${p.length} 篇` : "", r = _.value.length ? `，跳过 ${_.value.length} 个重复文件` : "";
					n.toast(`已归档 ${d} 篇${e ? `：${e}${t}` : ""}${r}`), p[0] && (n.selectPaper(p[0].literature_id), i("imported", p[0].literature_id));
				}
				if (f) {
					m.value = "failed", h.value = `${d} 篇已归档，${f} 篇未完成；可查看任务日志后重试。`;
					return;
				}
				if (!d) {
					m.value = "failed", h.value = "导入流程结束，但没有新归档的文献；请查看任务日志。";
					return;
				}
				if (_.value.length) {
					m.value = "done";
					return;
				}
				i("close");
			} catch (e) {
				let t = e instanceof Error ? e.message : String(e);
				a && a.status === "uploading" ? (a.status = "error", a.note = t, h.value = `${a.name} 上传失败：${t}`) : h.value = t || "导入失败。", m.value = "failed";
			}
		}
		return (e, t) => (V(), H("dialog", {
			ref_key: "dialog",
			ref: a,
			class: "import-dialog",
			"aria-labelledby": "import-title",
			onCancel: Y(E, ["prevent"]),
			onClick: D
		}, [U("form", {
			class: "import-sheet",
			onSubmit: Y(ge, ["prevent"])
		}, [
			U("header", Ll, [t[5] ||= U("div", null, [U("h2", { id: "import-title" }, "导入 PDF"), U("p", null, "可多选或添加文件夹，核对题名后批量归档。")], -1), U("button", {
				type: "button",
				class: "icon-button",
				title: "关闭",
				"aria-label": "关闭",
				disabled: S.value,
				onClick: E
			}, [W(Q, { name: "close" })], 8, Rl)]),
			U("div", zl, [
				U("input", {
					ref_key: "fileInput",
					ref: o,
					type: "file",
					accept: ".pdf,application/pdf",
					multiple: "",
					hidden: "",
					onChange: ne
				}, null, 544),
				U("input", {
					ref_key: "folderInput",
					ref: s,
					type: "file",
					accept: ".pdf,application/pdf",
					webkitdirectory: "",
					directory: "",
					multiple: "",
					hidden: "",
					onChange: ne
				}, null, 544),
				U("div", Bl, [U("button", {
					type: "button",
					class: A(["import-file", {
						dragging: p.value,
						compact: l.length
					}]),
					disabled: S.value,
					onClick: re,
					onDragover: t[0] ||= Y((e) => p.value = !0, ["prevent"]),
					onDragleave: t[1] ||= (e) => p.value = !1,
					onDrop: Y(le, ["prevent"])
				}, [U("span", Hl, [W(Q, { name: "upload" })]), U("span", Ul, [U("strong", null, j(l.length ? "继续添加 PDF" : "选择 PDF 文件"), 1), U("small", null, j(l.length ? "可多选，或把文件、文件夹拖到这里" : "可多选，或把文件、文件夹拖到这里，单个最大 25 MB"), 1)])], 42, Vl), U("button", {
					type: "button",
					class: "import-folder",
					disabled: S.value,
					onClick: k
				}, [W(Q, { name: "folder" }), t[6] ||= U("span", null, "选择文件夹", -1)], 8, Wl)]),
				l.length ? (V(), H("div", Gl, [U("div", Kl, [U("span", null, [G(j(l.length) + " 个 PDF ", 1), _.value.length ? (V(), H(B, { key: 0 }, [G(" · 跳过 " + j(_.value.length) + " 个", 1)], 64)) : K("", !0)]), U("button", {
					type: "button",
					class: "text-button",
					disabled: S.value,
					onClick: fe
				}, " 清空 ", 8, ql)]), U("div", Jl, [(V(!0), H(B, null, z(l, (e, n) => (V(), H("article", {
					key: e.key,
					class: A(["import-item", e.status])
				}, [U("div", Yl, [
					U("span", Xl, j(n + 1), 1),
					U("div", Zl, [R(U("input", {
						"onUpdate:modelValue": (t) => e.title = t,
						class: "import-item-title",
						maxlength: "300",
						placeholder: "题名（必填，与 PDF 首页一致）",
						"aria-label": `第 ${n + 1} 个文件的题名`,
						disabled: S.value
					}, null, 8, Ql), [[J, e.title]]), U("small", $l, [G(j(e.relative) + " · " + j(te(e.size)), 1), e.note ? (V(), H(B, { key: 0 }, [G(" · " + j(e.note), 1)], 64)) : K("", !0)])]),
					e.status === "skipped" ? (V(), H("span", eu, "已跳过")) : e.status === "error" ? (V(), H("span", tu, "未完成")) : K("", !0),
					U("button", {
						type: "button",
						class: A(["icon-button import-item-more", { open: u.value === e.key }]),
						title: u.value === e.key ? "收起作者、年份和 DOI" : "填写作者、年份和 DOI",
						"aria-label": u.value === e.key ? "收起书目信息" : "展开书目信息",
						"aria-expanded": u.value === e.key,
						disabled: S.value,
						onClick: (t) => ue(e)
					}, [W(Q, { name: "chevron" })], 10, nu),
					U("button", {
						type: "button",
						class: "icon-button",
						title: "移除",
						"aria-label": "移除",
						disabled: S.value,
						onClick: (t) => de(e)
					}, [W(Q, { name: "close" })], 8, ru)
				]), u.value === e.key ? (V(), H("div", iu, [
					U("label", au, [t[7] ||= U("span", null, [G("作者 "), U("small", null, "多位作者用分号隔开")], -1), R(U("input", {
						"onUpdate:modelValue": (t) => e.authors = t,
						maxlength: "3000",
						placeholder: "例如：张三; 李四",
						"aria-label": `第 ${n + 1} 个文件的作者`,
						disabled: S.value
					}, null, 8, ou), [[J, e.authors]])]),
					U("label", su, [t[8] ||= U("span", null, "年份", -1), R(U("input", {
						"onUpdate:modelValue": (t) => e.year = t,
						inputmode: "numeric",
						maxlength: "4",
						placeholder: "2024",
						"aria-label": `第 ${n + 1} 个文件的年份`,
						disabled: S.value
					}, null, 8, cu), [[J, e.year]])]),
					U("label", lu, [t[9] ||= U("span", null, [G("DOI "), U("small", null, "可选")], -1), R(U("input", {
						"onUpdate:modelValue": (t) => e.doi = t,
						maxlength: "300",
						placeholder: "10.xxxx/xxxxx",
						"aria-label": `第 ${n + 1} 个文件的 DOI`,
						disabled: S.value
					}, null, 8, uu), [[J, e.doi]])])
				])) : K("", !0)], 2))), 128))])])) : K("", !0),
				U("div", du, [U("label", fu, [t[10] ||= U("span", null, "归档分类", -1), R(U("select", {
					"onUpdate:modelValue": t[2] ||= (e) => c.category = e,
					disabled: S.value || m.value === "done",
					onChange: t[3] ||= (e) => d.value = !0
				}, [(V(!0), H(B, null, z(x.value, ([e, t]) => (V(), H("option", {
					key: e,
					value: e
				}, j(t), 9, mu))), 128))], 40, pu), [[Va, c.category]])])]),
				m.value === "done" ? K("", !0) : (V(), H("label", hu, [R(U("input", {
					"onUpdate:modelValue": t[4] ||= (e) => c.confirmed = e,
					type: "checkbox",
					disabled: S.value
				}, null, 8, gu), [[za, c.confirmed]]), U("span", null, j(l.length > 1 ? "我已核对以上文件的题名与作者信息，并有权保存这些文件。" : "我已核对题名与作者与 PDF 首页一致，并有权保存该文件。"), 1)])),
				h.value ? (V(), H("p", _u, j(h.value), 1)) : K("", !0),
				m.value === "done" ? (V(), H("p", vu, [
					G(" 已归档 " + j(v.value?.archived || 0) + " 篇", 1),
					v.value?.skipped ? (V(), H(B, { key: 0 }, [G("，跳过 " + j(v.value.skipped) + " 个重复文件", 1)], 64)) : K("", !0),
					t[11] ||= G("。 ", -1)
				])) : K("", !0),
				S.value ? (V(), H("div", yu, [t[12] ||= U("span", { class: "busy-spinner" }, null, -1), m.value === "uploading" ? (V(), H(B, { key: 0 }, [G(" 正在上传第 " + j(g.value) + " / " + j(l.length) + " 个文件… ", 1)], 64)) : (V(), H(B, { key: 1 }, [G(" 正在核验并归档 " + j(T.value) + " / " + j(w.value) + " 篇… ", 1)], 64))])) : K("", !0),
				(m.value === "failed" || m.value === "done") && C.value ? (V(), H("details", bu, [t[13] ||= U("summary", null, "查看任务日志", -1), U("pre", xu, j(C.value), 1)])) : K("", !0)
			]),
			U("footer", Su, [m.value === "done" ? (V(), H("button", {
				key: 0,
				type: "button",
				class: "button primary",
				onClick: E
			}, "完成")) : (V(), H(B, { key: 1 }, [U("button", {
				type: "button",
				class: "button subtle",
				disabled: S.value,
				onClick: E
			}, " 取消 ", 8, Cu), U("button", {
				id: "import-paper-submit",
				type: "submit",
				class: "button primary",
				disabled: S.value || !l.length
			}, [W(Q, { name: "upload" }), G(j(ee.value), 1)], 8, wu)], 64))])
		], 32)], 544));
	}
}), Du = {
	class: "shell",
	"data-framework": "vue"
}, Ou = { class: "main" }, ku = { class: "topbar" }, Au = { id: "page-title" }, ju = { class: "top-actions" }, Mu = {
	id: "library-summary",
	class: "muted"
}, Nu = {
	class: "mobile-tabs",
	"aria-label": "工作面板"
}, Pu = ["data-panel", "onClick"], Fu = ["data-panel"], Iu = {
	id: "toast-region",
	class: "toast-region",
	role: "status",
	"aria-live": "polite"
}, Lu = /* @__PURE__ */ Kn({
	__name: "Workspace",
	props: { workspace: {} },
	setup(e) {
		let t = e;
		Nn("workspace", t.workspace);
		let n = t.workspace, r = n.state, i = q(() => r.papers.filter((e) => e.notes?.length).length);
		function a(e) {
			n.setView("library"), e && n.selectPaper(e);
		}
		let o = [
			["list", "文献"],
			["reader", "阅读"],
			["chat", "研究助手"]
		], s, c;
		return nr(() => {
			s = ro(document), c = new window.AbortController(), document.addEventListener("keydown", (e) => {
				let t = e.target;
				e.key !== "/" || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || (e.preventDefault(), n.setView("library"), n.setPanel("list"), document.querySelector("#search")?.focus());
			}, { signal: c.signal });
		}), rr(() => {
			s?.(), c?.abort(), n.stop();
		}), (e, t) => (V(), H(B, null, [U("div", Du, [
			W(Fo),
			U("main", Ou, [
				U("header", ku, [U("h1", Au, j(L(r).view === "library" ? "文献" : "下载任务"), 1), U("div", ju, [U("span", Mu, j(L(r).papers.length) + " 篇文献 · " + j(i.value) + " 篇有笔记", 1)])]),
				R(U("div", Nu, [(V(), H(B, null, z(o, ([e, t]) => U("button", {
					key: e,
					class: A({ active: L(r).panel === e }),
					"data-panel": e,
					onClick: (t) => L(n).setPanel(e)
				}, j(t), 11, Pu)), 64))], 512), [[ia, L(r).view === "library"]]),
				R(U("section", {
					id: "library-view",
					class: "library-layout",
					"data-panel": L(r).panel
				}, [
					W(os),
					W(cs),
					W(ul)
				], 8, Fu), [[ia, L(r).view === "library"]]),
				R(W(Il, null, null, 512), [[ia, L(r).view === "downloads"]])
			]),
			L(r).importOpen ? (V(), di(Eu, {
				key: 0,
				onClose: t[0] ||= (e) => L(r).importOpen = !1,
				onImported: a
			})) : K("", !0)
		]), U("div", Iu, [(V(!0), H(B, null, z(L(r).toasts, (e) => (V(), H("div", {
			key: e.id,
			class: A(["toast", { error: e.error }])
		}, j(e.message), 3))), 128))])], 64));
	}
});
// app/web/frontend/main.ts
function Ru(e, t = {}) {
	let n = As(t), r = $a(Lu, { workspace: n });
	return r.mount(e), {
		app: r,
		workspace: n,
		ready: n.start(),
		version: Gi,
		unmount: () => r.unmount()
	};
}
typeof document < "u" && document.querySelector("#app") && Ru("#app");
export { As as createWorkspace, Ru as mountWorkspace };
