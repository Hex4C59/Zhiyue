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
}, l = Object.prototype.hasOwnProperty, u = (e, t) => l.call(e, t), d = Array.isArray, f = (e) => x(e) === "[object Map]", p = (e) => x(e) === "[object Set]", m = (e) => x(e) === "[object Date]", h = (e) => typeof e == "function", g = (e) => typeof e == "string", _ = (e) => typeof e == "symbol", v = (e) => typeof e == "object" && !!e, y = (e) => (v(e) || h(e)) && h(e.then) && h(e.catch), b = Object.prototype.toString, x = (e) => b.call(e), S = (e) => x(e).slice(8, -1), C = (e) => x(e) === "[object Object]", w = (e) => g(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, ee = /* @__PURE__ */ e(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"), T = (e) => {
	let t = /* @__PURE__ */ Object.create(null);
	return ((n) => t[n] || (t[n] = e(n)));
}, te = /-\w/g, E = /* @__PURE__ */ T((e) => e.replace(te, (e) => e.slice(1).toUpperCase())), ne = /\B([A-Z])/g, re = /* @__PURE__ */ T((e) => e.replace(ne, "-$1").toLowerCase()), ie = /* @__PURE__ */ T((e) => e.charAt(0).toUpperCase() + e.slice(1)), ae = /* @__PURE__ */ T((e) => e ? `on${ie(e)}` : ""), oe = (e, t) => !Object.is(e, t), se = (e, ...t) => {
	for (let n = 0; n < e.length; n++) e[n](...t);
}, ce = (e, t, n, r = !1) => {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		writable: r,
		value: n
	});
}, le = (e) => {
	let t = parseFloat(e);
	return isNaN(t) ? e : t;
}, ue, de = () => ue ||= typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
function fe(e) {
	if (d(e)) {
		let t = {};
		for (let n = 0; n < e.length; n++) {
			let r = e[n], i = g(r) ? ge(r) : fe(r);
			if (i) for (let e in i) t[e] = i[e];
		}
		return t;
	}
	if (g(e) || v(e)) return e;
}
var pe = /;(?![^(]*\))/g, me = /:([^]+)/, he = /"(?:[^"\\]|\\[^])*"|'(?:[^'\\]|\\[^])*'|\\[^]|\/\*[^]*?\*\//g;
function ge(e) {
	let t = {};
	return e.replace(he, (e) => e.startsWith("/*") ? "" : e).split(pe).forEach((e) => {
		if (e) {
			let n = e.split(me);
			n.length > 1 && (t[n[0].trim()] = n[1].trim());
		}
	}), t;
}
function D(e) {
	let t = "";
	if (g(e)) t = e;
	else if (d(e)) for (let n = 0; n < e.length; n++) {
		let r = D(e[n]);
		r && (t += r + " ");
	}
	else if (v(e)) for (let n in e) e[n] && (t += n + " ");
	return t.trim();
}
var _e = /* @__PURE__ */ e("itemscope,allowfullscreen,disablepictureinpicture,disableremoteplayback,formnovalidate,ismap,nomodule,novalidate,playsinline,readonly");
function ve(e) {
	return !!e || e === "";
}
function ye(e, t, n) {
	if (e.length !== t.length) return !1;
	let r = !0;
	for (let i = 0; r && i < e.length; i++) r = O(e[i], t[i], n);
	return r;
}
function be(e, t, n) {
	if (e.size !== t.size) return !1;
	let r = Array.from(t), i = new Uint8Array(r.length);
	for (let t of e) {
		let e = -1;
		for (let a = 0; a < r.length; a++) if (!i[a] && O(t, r[a], n)) {
			e = a;
			break;
		}
		if (e < 0) return !1;
		i[e] = 1;
	}
	return !0;
}
function xe(e, t, n) {
	let r = f(e), i = f(t);
	if (r || i || (r = p(e), i = p(t), r || i)) return r && i ? be(e, t, n) : !1;
	if (Object.keys(e).length !== Object.keys(t).length) return !1;
	for (let r in e) {
		let i = e.hasOwnProperty(r), a = t.hasOwnProperty(r);
		if (i && !a || !i && a || !O(e[r], t[r], n)) return !1;
	}
	return String(e) === String(t);
}
function Se(e, t, n, r) {
	n ||= [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
	let [i, a] = n;
	if (i.has(e) || a.has(t)) return i.get(e) === t && a.get(t) === e;
	i.set(e, t), a.set(t, e);
	let o = r(e, t, n);
	return i.delete(e), a.delete(t), o;
}
function O(e, t, n) {
	if (e === t) return !0;
	let r = m(e), i = m(t);
	return r || i ? r && i ? e.getTime() === t.getTime() : !1 : (r = _(e), i = _(t), r || i ? e === t : (r = d(e), i = d(t), r || i ? r && i ? Se(e, t, n, ye) : !1 : (r = v(e), i = v(t), r || i ? !r || !i ? !1 : Se(e, t, n, xe) : String(e) === String(t))));
}
function Ce(e, t) {
	return e.findIndex((e) => O(e, t));
}
var we = (e) => !!(e && e.__v_isRef === !0), k = (e) => g(e) ? e : e == null ? "" : d(e) || v(e) && (e.toString === b || !h(e.toString)) ? we(e) ? k(e.value) : JSON.stringify(e, Te, 2) : String(e), Te = (e, t) => we(t) ? Te(e, t.value) : f(t) ? { [`Map(${t.size})`]: [...t.entries()].reduce((e, [t, n], r) => (e[Ee(t, r) + " =>"] = n, e), {}) } : p(t) ? { [`Set(${t.size})`]: [...t.values()].map((e) => Ee(e)) } : _(t) ? Ee(t) : v(t) && !d(t) && !C(t) ? String(t) : t, Ee = (e, t = "") => _(e) ? `Symbol(${e.description ?? t})` : e, A, De = class {
	constructor(e = !1) {
		this.detached = e, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this._warnOnRun = !0, this.__v_skip = !0, !e && A && (A.active ? (this.parent = A, this.index = (A.scopes || (A.scopes = [])).push(this) - 1) : (this._active = !1, this._warnOnRun = !1));
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
			let t = A;
			try {
				return A = this, e();
			} finally {
				A = t;
			}
		}
	}
	on() {
		++this._on === 1 && (this.prevScope = A, A = this);
	}
	off() {
		if (this._on > 0 && --this._on === 0) {
			if (A === this) A = this.prevScope;
			else {
				let e = A;
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
function Oe() {
	return A;
}
var j, ke = /* @__PURE__ */ new WeakSet(), Ae = class {
	constructor(e) {
		this.fn = e, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, A && (A.active ? A.effects.push(this) : this.flags &= -2);
	}
	pause() {
		this.flags |= 64;
	}
	resume() {
		this.flags & 64 && (this.flags &= -65, ke.has(this) && (ke.delete(this), this.trigger()));
	}
	notify() {
		this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Pe(this);
	}
	run() {
		if (!(this.flags & 1)) return this.fn();
		this.flags |= 2, qe(this), Le(this);
		let e = j, t = Ue;
		j = this, Ue = !0;
		try {
			return this.fn();
		} finally {
			Re(this), j = e, Ue = t, this.flags &= -3;
		}
	}
	stop() {
		if (this.flags & 1) {
			for (let e = this.deps; e; e = e.nextDep) Ve(e);
			this.deps = this.depsTail = void 0, qe(this), this.onStop && this.onStop(), this.flags &= -2;
		}
	}
	trigger() {
		this.flags & 64 ? ke.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
	}
	runIfDirty() {
		ze(this) && this.run();
	}
	get dirty() {
		return ze(this);
	}
}, je = 0, Me, Ne;
function Pe(e, t = !1) {
	e.flags |= 8, t ? (e.next = Ne, Ne = e) : (e.next = Me, Me = e);
}
function Fe() {
	je++;
}
function Ie() {
	if (--je > 0) return;
	if (Ne) {
		let e = Ne;
		for (Ne = void 0; e;) {
			let t = e.next;
			e.next = void 0, e.flags &= -9, e = t;
		}
	}
	let e;
	for (; Me;) {
		let t = Me;
		for (Me = void 0; t;) {
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
function Le(e) {
	for (let t = e.deps; t; t = t.nextDep) t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Re(e) {
	let t, n = e.depsTail, r = n;
	for (; r;) {
		let e = r.prevDep;
		r.version === -1 ? (r === n && (n = e), Ve(r), He(r)) : t = r, r.dep.activeLink = r.prevActiveLink, r.prevActiveLink = void 0, r = e;
	}
	e.deps = t, e.depsTail = n;
}
function ze(e) {
	for (let t = e.deps; t; t = t.nextDep) if (t.dep.version !== t.version || t.dep.computed && (Be(t.dep.computed) || t.dep.version !== t.version)) return !0;
	return !!e._dirty;
}
function Be(e) {
	if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Je) || (e.globalVersion = Je, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !ze(e)))) return;
	e.flags |= 2;
	let t = e.dep, n = j, r = Ue;
	j = e, Ue = !0;
	try {
		Le(e);
		let n = e.fn(e._value);
		(t.version === 0 || oe(n, e._value)) && (e.flags |= 128, e._value = n, t.version++);
	} catch (e) {
		throw t.version++, e;
	} finally {
		j = n, Ue = r, Re(e), e.flags &= -3;
	}
}
function Ve(e, t = !1) {
	let { dep: n, prevSub: r, nextSub: i } = e;
	if (r && (r.nextSub = i, e.prevSub = void 0), i && (i.prevSub = r, e.nextSub = void 0), n.subs === e && (n.subs = r, !r && n.computed)) {
		n.computed.flags &= -5;
		for (let e = n.computed.deps; e; e = e.nextDep) Ve(e, !0);
	}
	!t && !--n.sc && n.map && n.map.delete(n.key);
}
function He(e) {
	let { prevDep: t, nextDep: n } = e;
	t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
var Ue = !0, We = [];
function Ge() {
	We.push(Ue), Ue = !1;
}
function Ke() {
	let e = We.pop();
	Ue = e === void 0 || e;
}
function qe(e) {
	let { cleanup: t } = e;
	if (e.cleanup = void 0, t) {
		let e = j;
		j = void 0;
		try {
			t();
		} finally {
			j = e;
		}
	}
}
var Je = 0, Ye = class {
	constructor(e, t) {
		this.sub = e, this.dep = t, this.version = t.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
	}
}, Xe = class {
	constructor(e) {
		this.computed = e, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
	}
	track(e) {
		if (!j || !Ue || j === this.computed) return;
		let t = this.activeLink;
		if (t === void 0 || t.sub !== j) t = this.activeLink = new Ye(j, this), j.deps ? (t.prevDep = j.depsTail, j.depsTail.nextDep = t, j.depsTail = t) : j.deps = j.depsTail = t, Ze(t);
		else if (t.version === -1 && (t.version = this.version, t.nextDep)) {
			let e = t.nextDep;
			e.prevDep = t.prevDep, t.prevDep && (t.prevDep.nextDep = e), t.prevDep = j.depsTail, t.nextDep = void 0, j.depsTail.nextDep = t, j.depsTail = t, j.deps === t && (j.deps = e);
		}
		return t;
	}
	trigger(e) {
		this.version++, Je++, this.notify(e);
	}
	notify(e) {
		Fe();
		try {
			for (let e = this.subs; e; e = e.prevSub) e.sub.notify() && e.sub.dep.notify();
		} finally {
			Ie();
		}
	}
};
function Ze(e) {
	if (e.dep.sc++, e.sub.flags & 4) {
		let t = e.dep.computed;
		if (t && !e.dep.subs) {
			t.flags |= 20;
			for (let e = t.deps; e; e = e.nextDep) Ze(e);
		}
		let n = e.dep.subs;
		n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
	}
}
var Qe = /* @__PURE__ */ new WeakMap(), $e = /* @__PURE__ */ Symbol(""), et = /* @__PURE__ */ Symbol(""), tt = /* @__PURE__ */ Symbol("");
function M(e, t, n) {
	if (Ue && j) {
		let t = Qe.get(e);
		t || Qe.set(e, t = /* @__PURE__ */ new Map());
		let r = t.get(n);
		r || (t.set(n, r = new Xe()), r.map = t, r.key = n), r.track();
	}
}
function nt(e, t, n, r, i, a) {
	let o = Qe.get(e);
	if (!o) {
		Je++;
		return;
	}
	let s = (e) => {
		e && e.trigger();
	};
	if (Fe(), t === "clear") o.forEach(s);
	else {
		let i = d(e), a = i && w(n);
		if (i && n === "length") {
			let e = Number(r);
			o.forEach((t, n) => {
				(n === "length" || n === tt || !_(n) && n >= e) && s(t);
			});
		} else switch ((n !== void 0 || o.has(void 0)) && s(o.get(n)), a && s(o.get(tt)), t) {
			case "add":
				i ? a && s(o.get("length")) : (s(o.get($e)), f(e) && s(o.get(et)));
				break;
			case "delete":
				i || (s(o.get($e)), f(e) && s(o.get(et)));
				break;
			case "set": f(e) && s(o.get($e));
		}
	}
	Ie();
}
function rt(e) {
	let t = /* @__PURE__ */ N(e);
	return t === e || (M(t, "iterate", tt), /* @__PURE__ */ Ut(e)) ? t : /* @__PURE__ */ Ht(e) ? /* @__PURE__ */ Vt(e) ? t.map((e) => Kt(P(e))) : t.map(Kt) : t.map(P);
}
function it(e) {
	return M(e = /* @__PURE__ */ N(e), "iterate", tt), e;
}
function at(e, t) {
	return /* @__PURE__ */ Ht(e) ? Kt(/* @__PURE__ */ Vt(e) ? P(t) : t) : P(t);
}
var ot = {
	__proto__: null,
	[Symbol.iterator]() {
		return st(this, Symbol.iterator, (e) => at(this, e));
	},
	concat(...e) {
		return rt(this).concat(...e.map((e) => d(e) ? rt(e) : e));
	},
	entries() {
		return st(this, "entries", (e) => (e[1] = at(this, e[1]), e));
	},
	every(e, t) {
		return ut(this, "every", e, t, void 0, arguments);
	},
	filter(e, t) {
		return ut(this, "filter", e, t, (e) => e.map((e) => at(this, e)), arguments);
	},
	find(e, t) {
		return ut(this, "find", e, t, (e) => at(this, e), arguments);
	},
	findIndex(e, t) {
		return ut(this, "findIndex", e, t, void 0, arguments);
	},
	findLast(e, t) {
		return ut(this, "findLast", e, t, (e) => at(this, e), arguments);
	},
	findLastIndex(e, t) {
		return ut(this, "findLastIndex", e, t, void 0, arguments);
	},
	forEach(e, t) {
		return ut(this, "forEach", e, t, void 0, arguments);
	},
	includes(...e) {
		return ft(this, "includes", e);
	},
	indexOf(...e) {
		return ft(this, "indexOf", e);
	},
	join(e) {
		return rt(this).join(e);
	},
	lastIndexOf(...e) {
		return ft(this, "lastIndexOf", e);
	},
	map(e, t) {
		return ut(this, "map", e, t, void 0, arguments);
	},
	pop() {
		return pt(this, "pop");
	},
	push(...e) {
		return pt(this, "push", e);
	},
	reduce(e, ...t) {
		return dt(this, "reduce", e, t);
	},
	reduceRight(e, ...t) {
		return dt(this, "reduceRight", e, t);
	},
	shift() {
		return pt(this, "shift");
	},
	some(e, t) {
		return ut(this, "some", e, t, void 0, arguments);
	},
	splice(...e) {
		return pt(this, "splice", e);
	},
	toReversed() {
		return rt(this).toReversed();
	},
	toSorted(e) {
		return rt(this).toSorted(e);
	},
	toSpliced(...e) {
		return rt(this).toSpliced(...e);
	},
	unshift(...e) {
		return pt(this, "unshift", e);
	},
	values() {
		return st(this, "values", (e) => at(this, e));
	}
};
function st(e, t, n) {
	let r = it(e), i = r[t], a = i.call(r);
	if (r !== e && !/* @__PURE__ */ Ut(e)) {
		if (a[Symbol.toStringTag] === "Array Iterator") {
			let e = Object.create(Object.getPrototypeOf(a));
			return e.next = () => ct(a.next(), n), i !== lt[t] && Object.defineProperties(e, {
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
		a._next = a.next, a.next = () => ct(a._next(), n);
	}
	return a;
}
function ct(e, t) {
	return e.done || (e.value = t(e.value)), e;
}
var lt = Array.prototype;
function ut(e, t, n, r, i, a) {
	let o = it(e), s = o !== e && !/* @__PURE__ */ Ut(e), c = o[t];
	if (c !== lt[t]) {
		let t = c.apply(e, a);
		return s ? P(t) : t;
	}
	let l = n;
	o !== e && (s ? l = function(t, r) {
		return n.call(this, at(e, t), r, e);
	} : n.length > 2 && (l = function(t, r) {
		return n.call(this, t, r, e);
	}));
	let u = c.call(o, l, r);
	return s && i ? i(u) : u;
}
function dt(e, t, n, r) {
	let i = it(e), a = i !== e && !/* @__PURE__ */ Ut(e), o = n, s = !1;
	i !== e && (a ? (s = r.length === 0, o = function(t, r, i) {
		return s && (s = !1, t = at(e, t)), n.call(this, t, at(e, r), i, e);
	}) : n.length > 3 && (o = function(t, r, i) {
		return n.call(this, t, r, i, e);
	}));
	let c = i[t](o, ...r);
	return s ? at(e, c) : c;
}
function ft(e, t, n) {
	let r = /* @__PURE__ */ N(e);
	M(r, "iterate", tt);
	let i = r[t](...n);
	return (i === -1 || i === !1) && /* @__PURE__ */ Wt(n[0]) ? (n[0] = /* @__PURE__ */ N(n[0]), r[t](...n)) : i;
}
function pt(e, t, n = []) {
	Ge(), Fe();
	let r = (/* @__PURE__ */ N(e))[t].apply(e, n);
	return Ie(), Ke(), r;
}
var mt = /* @__PURE__ */ e("__proto__,__v_isRef,__isVue"), ht = /* @__PURE__ */ new Set(/* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(_));
function gt(e) {
	_(e) || (e = String(e));
	let t = /* @__PURE__ */ N(this);
	return M(t, "has", e), t.hasOwnProperty(e);
}
var _t = class {
	constructor(e = !1, t = !1) {
		this._isReadonly = e, this._isShallow = t;
	}
	get(e, t, n) {
		if (t === "__v_skip") return e.__v_skip;
		let r = this._isReadonly, i = this._isShallow;
		if (t === "__v_isReactive") return !r;
		if (t === "__v_isReadonly") return r;
		if (t === "__v_isShallow") return i;
		if (t === "__v_raw") return n === (r ? i ? Ft : Pt : i ? Nt : Mt).get(e) || Object.getPrototypeOf(e) === Object.getPrototypeOf(n) ? e : void 0;
		let a = d(e);
		if (!r) {
			let e;
			if (a && (e = ot[t])) return e;
			if (t === "hasOwnProperty") return gt;
		}
		let o = Reflect.get(e, t, /* @__PURE__ */ F(e) ? e : n);
		if ((_(t) ? ht.has(t) : mt(t)) || (r || M(e, "get", t), i)) return o;
		if (/* @__PURE__ */ F(o)) {
			let e = a && w(t) ? o : o.value;
			return r && v(e) ? /* @__PURE__ */ zt(e) : e;
		}
		return v(o) ? r ? /* @__PURE__ */ zt(o) : /* @__PURE__ */ Lt(o) : o;
	}
}, vt = class extends _t {
	constructor(e = !1) {
		super(!1, e);
	}
	set(e, t, n, r) {
		let i = e[t], a = d(e) && w(t);
		if (!this._isShallow) {
			let e = /* @__PURE__ */ Ht(i);
			if (!/* @__PURE__ */ Ut(n) && !/* @__PURE__ */ Ht(n) && (i = /* @__PURE__ */ N(i), n = /* @__PURE__ */ N(n)), !a && /* @__PURE__ */ F(i) && !/* @__PURE__ */ F(n)) return e || (i.value = n), !0;
		}
		let o = a ? Number(t) < e.length : u(e, t), s = Reflect.set(e, t, n, /* @__PURE__ */ F(e) ? e : r);
		return e === /* @__PURE__ */ N(r) && s && (o ? oe(n, i) && nt(e, "set", t, n, i) : nt(e, "add", t, n)), s;
	}
	deleteProperty(e, t) {
		let n = u(e, t), r = e[t], i = Reflect.deleteProperty(e, t);
		return i && n && nt(e, "delete", t, void 0, r), i;
	}
	has(e, t) {
		let n = Reflect.has(e, t);
		return _(t) && ht.has(t) || M(e, "has", t), n;
	}
	ownKeys(e) {
		return M(e, "iterate", d(e) ? "length" : $e), Reflect.ownKeys(e);
	}
}, yt = class extends _t {
	constructor(e = !1) {
		super(!0, e);
	}
	set(e, t) {
		return !0;
	}
	deleteProperty(e, t) {
		return !0;
	}
}, bt = /* @__PURE__ */ new vt(), xt = /* @__PURE__ */ new yt(), St = /* @__PURE__ */ new vt(!0), Ct = (e) => e, wt = (e) => Reflect.getPrototypeOf(e);
function Tt(e, t, n) {
	return function(...r) {
		let i = this.__v_raw, a = /* @__PURE__ */ N(i), o = f(a), c = e === "entries" || e === Symbol.iterator && o, l = e === "keys" && o, u = i[e](...r), d = n ? Ct : t ? Kt : P;
		return !t && M(a, "iterate", l ? et : $e), s(Object.create(u), { next() {
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
function Et(e) {
	return function(...t) {
		return e === "delete" ? !1 : e === "clear" ? void 0 : this;
	};
}
function Dt(e, t) {
	let n = {
		get(n) {
			let r = this.__v_raw, i = /* @__PURE__ */ N(r), a = /* @__PURE__ */ N(n);
			e || (oe(n, a) && M(i, "get", n), M(i, "get", a));
			let { has: o } = wt(i), s = t ? Ct : e ? Kt : P;
			if (o.call(i, n)) return s(r.get(n));
			if (o.call(i, a)) return s(r.get(a));
			r !== i && r.get(n);
		},
		get size() {
			let t = this.__v_raw;
			return !e && M(/* @__PURE__ */ N(t), "iterate", $e), t.size;
		},
		has(t) {
			let n = this.__v_raw, r = /* @__PURE__ */ N(n), i = /* @__PURE__ */ N(t);
			return e || (oe(t, i) && M(r, "has", t), M(r, "has", i)), t === i ? n.has(t) : n.has(t) || n.has(i);
		},
		forEach(n, r) {
			let i = this, a = i.__v_raw, o = /* @__PURE__ */ N(a), s = t ? Ct : e ? Kt : P;
			return !e && M(o, "iterate", $e), a.forEach((e, t) => n.call(r, s(e), s(t), i));
		}
	};
	return s(n, e ? {
		add: Et("add"),
		set: Et("set"),
		delete: Et("delete"),
		clear: Et("clear")
	} : {
		add(e) {
			let n = /* @__PURE__ */ N(this), r = wt(n), i = /* @__PURE__ */ N(e), a = !t && !/* @__PURE__ */ Ut(e) && !/* @__PURE__ */ Ht(e) ? i : e;
			return r.has.call(n, a) || oe(e, a) && r.has.call(n, e) || oe(i, a) && r.has.call(n, i) || (n.add(a), nt(n, "add", a, a)), this;
		},
		set(e, n) {
			t || /* @__PURE__ */ Ut(n) || /* @__PURE__ */ Ht(n) || (n = /* @__PURE__ */ N(n));
			let r = /* @__PURE__ */ N(this), { has: i, get: a } = wt(r), o = i.call(r, e);
			o ||= (e = /* @__PURE__ */ N(e), i.call(r, e));
			let s = a.call(r, e);
			return r.set(e, n), o ? oe(n, s) && nt(r, "set", e, n, s) : nt(r, "add", e, n), this;
		},
		delete(e) {
			let t = /* @__PURE__ */ N(this), { has: n, get: r } = wt(t), i = n.call(t, e);
			i ||= (e = /* @__PURE__ */ N(e), n.call(t, e));
			let a = r ? r.call(t, e) : void 0, o = t.delete(e);
			return i && nt(t, "delete", e, void 0, a), o;
		},
		clear() {
			let e = /* @__PURE__ */ N(this), t = e.size !== 0, n = e.clear();
			return t && nt(e, "clear", void 0, void 0, void 0), n;
		}
	}), [
		"keys",
		"values",
		"entries",
		Symbol.iterator
	].forEach((r) => {
		n[r] = Tt(r, e, t);
	}), n;
}
function Ot(e, t) {
	let n = Dt(e, t);
	return (r, i, a) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_isShallow" ? t : i === "__v_raw" ? r : Reflect.get(u(n, i) && i in r ? n : r, i, a);
}
var kt = { get: /* @__PURE__ */ Ot(!1, !1) }, At = { get: /* @__PURE__ */ Ot(!1, !0) }, jt = { get: /* @__PURE__ */ Ot(!0, !1) }, Mt = /* @__PURE__ */ new WeakMap(), Nt = /* @__PURE__ */ new WeakMap(), Pt = /* @__PURE__ */ new WeakMap(), Ft = /* @__PURE__ */ new WeakMap();
function It(e) {
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
function Lt(e) {
	return /* @__PURE__ */ Ht(e) ? e : Bt(e, !1, bt, kt, Mt);
}
// @__NO_SIDE_EFFECTS__
function Rt(e) {
	return Bt(e, !1, St, At, Nt);
}
// @__NO_SIDE_EFFECTS__
function zt(e) {
	return Bt(e, !0, xt, jt, Pt);
}
function Bt(e, t, n, r, i) {
	if (!v(e) || e.__v_raw && !(t && e.__v_isReactive) || e.__v_skip || !Object.isExtensible(e)) return e;
	let a = i.get(e);
	if (a) return a;
	let o = It(S(e));
	if (o === 0) return e;
	let s = new Proxy(e, o === 2 ? r : n);
	return i.set(e, s), s;
}
// @__NO_SIDE_EFFECTS__
function Vt(e) {
	return /* @__PURE__ */ Ht(e) ? /* @__PURE__ */ Vt(e.__v_raw) : !!(e && e.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function Ht(e) {
	return !!(e && e.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function Ut(e) {
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
	return !u(e, "__v_skip") && Object.isExtensible(e) && ce(e, "__v_skip", !0), e;
}
var P = (e) => v(e) ? /* @__PURE__ */ Lt(e) : e, Kt = (e) => v(e) ? /* @__PURE__ */ zt(e) : e;
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
		this.dep = new Xe(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = t ? e : /* @__PURE__ */ N(e), this._value = t ? e : P(e), this.__v_isShallow = t;
	}
	get value() {
		return this.dep.track(), this._value;
	}
	set value(e) {
		let t = this._rawValue, n = this.__v_isShallow || /* @__PURE__ */ Ut(e) || /* @__PURE__ */ Ht(e);
		e = n ? e : /* @__PURE__ */ N(e), oe(e, t) && (this._rawValue = e, this._value = n ? e : P(e), this.dep.trigger());
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
	return /* @__PURE__ */ Vt(e) ? e : new Proxy(e, Xt);
}
var Qt = class {
	constructor(e, t, n) {
		this.fn = e, this.setter = t, this._value = void 0, this.dep = new Xe(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Je - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !t, this.isSSR = n;
	}
	notify() {
		if (this.flags |= 16, !(this.flags & 8) && j !== this) return Pe(this, !0), !0;
	}
	get value() {
		let e = this.dep.track();
		return Be(this), e && (e.version = this.dep.version), this._value;
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
	let { immediate: a, deep: o, once: s, scheduler: l, augmentJob: u, call: f } = i, p = (e) => o ? e : /* @__PURE__ */ Ut(e) || o === !1 || o === 0 ? on(e, 1) : on(e), m, g, _, v, y = !1, b = !1;
	if (/* @__PURE__ */ F(e) ? (g = () => e.value, y = /* @__PURE__ */ Ut(e)) : /* @__PURE__ */ Vt(e) ? (g = () => p(e), y = !0) : d(e) ? (b = !0, y = e.some((e) => /* @__PURE__ */ Vt(e) || /* @__PURE__ */ Ut(e)), g = () => e.map((e) => {
		if (/* @__PURE__ */ F(e)) return e.value;
		if (/* @__PURE__ */ Vt(e)) return p(e);
		if (h(e)) return f ? f(e, 2) : e();
	})) : g = h(e) ? n ? f ? () => f(e, 2) : e : () => {
		if (_) {
			Ge();
			try {
				_();
			} finally {
				Ke();
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
	let x = Oe(), S = () => {
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
				if (e || o || y || (b ? t.some((e, t) => oe(e, C[t])) : oe(t, C))) {
					let e = nn;
					Ge();
					try {
						_ && _(), nn = m;
						let e = [
							t,
							C === en ? void 0 : b && C[0] === en ? [] : C,
							v
						];
						C = t, f ? f(n, 3, e) : n(...e);
					} finally {
						nn = e, Ke();
					}
				}
			} else m.run();
		}
	};
	return u && u(w), m = new Ae(g), m.scheduler = l ? () => l(w, !1) : w, v = (e) => rn(e, !1, m), _ = m.onStop = () => {
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
			Ge(), sn(s, null, 10, [
				e,
				i,
				o
			]), Ke();
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
var R = null, On = null;
function kn(e) {
	let t = R;
	return R = e, On = e && e.type.__scopeId || null, t;
}
function An(e, t = R, n) {
	if (!t || e._n) return e;
	let r = (...n) => {
		r._d && ai(-1);
		let i = kn(t), a = ni.length, o;
		try {
			o = e(...n);
		} finally {
			for (let e = ni.length; e > a; e--) ri();
			kn(i), r._d && ai(1);
		}
		return o;
	};
	return r._n = !0, r._c = !0, r._d = !0, r;
}
function z(e, n) {
	if (R === null) return e;
	let r = Ri(R), i = e.dirs ||= [];
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
function jn(e, t, n, r) {
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
		u && (Ge(), cn(u, n, 8, [
			e.el,
			l,
			i,
			t
		]), Ke());
	}
}
function Mn(e, t) {
	if (X) {
		let n = X.provides, r = X.parent && X.parent.provides;
		r === n && (n = X.provides = Object.create(r)), n[e] = t;
	}
}
function Nn(e, t, n = !1) {
	let r = wi();
	if (r || ur) {
		let i = ur ? ur._context.provides : r ? r.parent == null || r.ce ? r.vnode.appContext && r.vnode.appContext.provides : r.parent.provides : void 0;
		if (i && e in i) return i[e];
		if (arguments.length > 1) return n && h(t) ? t.call(r && r.proxy) : t;
	}
}
var Pn = /* @__PURE__ */ Symbol.for("v-scx"), Fn = () => Nn(Pn);
function In(e, t, n) {
	return Ln(e, t, n);
}
function Ln(e, n, i = t) {
	let { immediate: a, deep: o, flush: c, once: l } = i, u = s({}, i), d = n && a || !n && c !== "post", f;
	if (Ai) {
		if (c === "sync") {
			let e = Fn();
			f = e.__watcherHandles ||= [];
		} else if (!d) {
			let e = () => {};
			return e.stop = r, e.resume = r, e.pause = r, e;
		}
	}
	let p = X;
	u.call = (e, t, n) => cn(e, p, t, n);
	let m = !1;
	c === "post" ? u.scheduler = (e) => {
		e.i = p, V(e, p && p.suspense);
	} : c !== "sync" && (m = !0, u.scheduler = (e, t) => {
		t ? e() : yn(e);
	}), u.augmentJob = (e) => {
		n && (e.flags |= 4), m && (e.flags |= 2, p && (e.id = p.uid, e.i = p));
	};
	let h = an(e, n, u);
	return Ai && (f ? f.push(h) : d && h()), h;
}
var Rn = /* @__PURE__ */ Symbol("_vte"), zn = (e) => e.__isTeleport, Bn = /* @__PURE__ */ Symbol("_leaveCb");
function Vn(e) {
	let t = e[0];
	if (e.length > 1) {
		for (let n of e) if (n.type !== ei) {
			t = n;
			break;
		}
	}
	return t;
}
function Hn(e) {
	if (!Zn(e)) return zn(e.type) && e.children ? Vn(e.children) : e;
	if (e.component) return e.component.subTree;
	let { shapeFlag: t, children: n } = e;
	if (n) {
		if (t & 16) return n[0];
		if (t & 32 && h(n.default)) return n.default();
	}
}
function Un(e, t) {
	if (e.shapeFlag & 6 && e.component) {
		e.transition = t;
		let n = e.component.subTree;
		Un(zn(n.type) && Hn(n) || n, t);
	} else if (e.shapeFlag & 128) {
		let n = e.suspense;
		if (n) {
			let e = n.isHydrating ? n.pendingBranch : n.activeBranch;
			e && Un(e, t.clone(e));
		} else e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback);
	} else if (e.transition = t, e.type === H && d(e.children)) {
		let n = gr(e.children, !1);
		n && Un(n, t);
	}
}
function Wn(e) {
	if (e.component) return Wn(e.component.subTree);
	if (e.type === H) {
		let t = d(e.children) && gr(e.children, !1);
		return t ? Wn(t) : void 0;
	}
	if (e.type !== ei) return e;
}
function Gn(e) {
	e.ids = [
		e.ids[0] + e.ids[2]++ + "-",
		0,
		0
	];
}
function Kn(e, t) {
	let n;
	return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
}
var qn = /* @__PURE__ */ new WeakMap();
function Jn(e, n, r, a, o = !1) {
	if (d(e)) {
		e.forEach((e, t) => Jn(e, n && (d(n) ? n[t] : n), r, a, o));
		return;
	}
	if (Xn(a) && !o) {
		a.shapeFlag & 512 && a.type.__asyncResolved && a.component.subTree.component && Jn(e, n, r, a.component.subTree);
		return;
	}
	let s = a.shapeFlag & 4 ? Ri(a.component) : a.el, l = o ? null : s, { i: f, r: p } = e, m = n && n.r, _ = f.refs === t ? f.refs = {} : f.refs, v = f.setupState, y = /* @__PURE__ */ N(v), b = v === t ? i : (e) => !Kn(_, e) && u(y, e), x = (e, t) => !(t && Kn(_, t));
	if (m != null && m !== p) {
		if (Yn(n), g(m)) _[m] = null, b(m) && (v[m] = null);
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
					i(), qn.delete(e);
				};
				t.id = -1, qn.set(e, t), V(t, r);
			} else Yn(e), i();
		}
	}
}
function Yn(e) {
	let t = qn.get(e);
	t && (t.flags |= 8, qn.delete(e));
}
de().requestIdleCallback, de().cancelIdleCallback;
var Xn = (e) => !!e.type.__asyncLoader, Zn = (e) => e.type.__isKeepAlive;
function Qn(e, t, n = X, r = !1) {
	if (n) {
		let i = n[e] || (n[e] = []), a = t.__weh ||= (...r) => {
			Ge();
			let i = Di(n), a = cn(t, n, e, r);
			return i(), Ke(), a;
		};
		return r ? i.unshift(a) : i.push(a), a;
	}
}
var $n = (e) => (t, n = X) => {
	Ai && e !== "sp" || Qn(e, (...e) => t(...e), n);
}, er = $n("m"), tr = $n("bum"), nr = /* @__PURE__ */ Symbol.for("v-ndc");
function B(e, t, n, r) {
	let i, a = n && n[r], o = d(e);
	if (o || g(e)) {
		let n = o && /* @__PURE__ */ Vt(e), r = !1, s = !1;
		n && (r = !/* @__PURE__ */ Ut(e), s = /* @__PURE__ */ Ht(e), e = it(e)), i = Array(e.length);
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
var rr = (e) => e ? ki(e) ? Ri(e) : rr(e.parent) : null, ir = /* @__PURE__ */ s(/* @__PURE__ */ Object.create(null), {
	$: (e) => e,
	$el: (e) => e.vnode.el,
	$data: (e) => e.data,
	$props: (e) => e.props,
	$attrs: (e) => e.attrs,
	$slots: (e) => e.slots,
	$refs: (e) => e.refs,
	$parent: (e) => rr(e.parent),
	$root: (e) => rr(e.root),
	$host: (e) => e.ce,
	$emit: (e) => e.emit,
	$options: (e) => e.type,
	$forceUpdate: (e) => e.f ||= () => {
		yn(e.update);
	},
	$nextTick: (e) => e.n ||= _n.bind(e.proxy),
	$watch: (e) => r
}), ar = (e, n) => e !== t && !e.__isScriptSetup && u(e, n), or = {
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
			else if (ar(i, n)) return s[n] = 1, i[n];
			else if (u(o, n)) return s[n] = 3, o[n];
			else if (r !== t && u(r, n)) return s[n] = 4, r[n];
			else s[n] = 0;
		}
		let d = ir[n], f, p;
		if (d) return n === "$attrs" && M(e.attrs, "get", ""), d(e);
		if ((f = c.__cssModules) && (f = f[n])) return f;
		if (r !== t && u(r, n)) return s[n] = 4, r[n];
		if (p = l.config.globalProperties, u(p, n)) return p[n];
	},
	set({ _: e }, t, n) {
		let { data: r, setupState: i, ctx: a } = e;
		return ar(i, t) ? (i[t] = n, !0) : u(e.props, t) || t[0] === "$" && t.slice(1) in e ? !1 : (a[t] = n, !0);
	},
	has({ _: { data: e, setupState: t, accessCache: n, ctx: r, appContext: i, props: a, type: o } }, s) {
		let c;
		return !!(n[s] || ar(t, s) || u(a, s) || u(r, s) || u(ir, s) || u(i.config.globalProperties, s) || (c = o.__cssModules) && c[s]);
	},
	defineProperty(e, t, n) {
		return n.get == null ? u(n, "value") && this.set(e, t, n.value, null) : e._.accessCache[t] = 0, Reflect.defineProperty(e, t, n);
	}
};
function sr() {
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
var cr = 0;
function lr(e, t) {
	return function(n, r = null) {
		h(n) || (n = s({}, n)), r != null && !v(r) && (r = null);
		let i = sr(), a = /* @__PURE__ */ new WeakSet(), o = [], c = !1, l = i.app = {
			_uid: cr++,
			_component: n,
			_props: r,
			_container: null,
			_context: i,
			_instance: null,
			version: Bi,
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
					return u.appContext = i, s === !0 ? s = "svg" : s === !1 && (s = void 0), o && t ? t(u, a) : e(u, a, s), c = !0, l._container = a, a.__vue_app__ = l, Ri(u.component);
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
				let t = ur;
				ur = l;
				try {
					return e();
				} finally {
					ur = t;
				}
			}
		};
		return l;
	};
}
var ur = null, dr = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${E(t)}Modifiers`] || e[`${re(t)}Modifiers`];
function fr(e, n, ...r) {
	if (e.isUnmounted) return;
	let i = e.vnode.props || t, a = r, o = n.startsWith("update:"), s = o && dr(i, n.slice(7));
	s && (s.trim && (a = r.map((e) => g(e) ? e.trim() : e)), s.number && (a = a.map(le)));
	let c, l = i[c = ae(n)] || i[c = ae(E(n))];
	!l && o && (l = i[c = ae(re(n))]), l && cn(l, e, 6, a);
	let u = i[c + "Once"];
	if (u) {
		if (!e.emitted) e.emitted = {};
		else if (e.emitted[c]) return;
		e.emitted[c] = !0, cn(u, e, 6, a);
	}
}
function pr(e, t, n = !1) {
	let r = t.emitsCache, i = r.get(e);
	if (i !== void 0) return i;
	let a = e.emits, o = {};
	return a ? (d(a) ? a.forEach((e) => o[e] = null) : s(o, a), v(e) && r.set(e, o), o) : (v(e) && r.set(e, null), null);
}
function mr(e, t) {
	return !e || !a(t) ? !1 : (t = t.slice(2), t = t === "Once" ? t : t.replace(/Once$/, ""), u(e, t[0].toLowerCase() + t.slice(1)) || u(e, re(t)) || u(e, t));
}
function hr(e) {
	let { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [a], slots: s, attrs: c, emit: l, render: u, renderCache: d, props: f, data: p, setupState: m, ctx: h, inheritAttrs: g } = e, _ = kn(e), v, y;
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
			}) : e(f, null)), y = t.props ? c : _r(c);
		}
	} catch (t) {
		ni.length = 0, ln(t, e, 1), v = q(ei);
	}
	let b = v;
	if (y && g !== !1) {
		let e = Object.keys(y), { shapeFlag: t } = b;
		e.length && t & 7 && (a && e.some(o) && (y = vr(y, a)), b = mi(b, y, !1, !0));
	}
	return n.dirs && (b = mi(b, null, !1, !0), b.dirs = b.dirs ? b.dirs.concat(n.dirs) : n.dirs), n.transition && Un(zn(b.type) && Hn(b) || b, n.transition), v = b, kn(_), v;
}
function gr(e, t = !0) {
	let n;
	for (let t = 0; t < e.length; t++) {
		let r = e[t];
		if (ci(r)) {
			if (r.type !== ei || r.children === "v-if") {
				if (n) return;
				n = r;
			}
		} else return;
	}
	return n;
}
var _r = (e) => {
	let t;
	for (let n in e) (n === "class" || n === "style" || a(n)) && ((t ||= {})[n] = e[n]);
	return t;
}, vr = (e, t) => {
	let n = {};
	for (let r in e) o(r) && r.slice(9) in t || (n[r] = e[r]);
	return n;
};
function yr(e, t, n) {
	let { props: r, children: i, component: a } = e, { props: o, children: s, patchFlag: c } = t, l = a.emitsOptions;
	if (t.dirs || t.transition) return !0;
	if (n && c >= 0) {
		if (c & 1024) return !0;
		if (c & 16) return r ? br(r, o, l) : !!o;
		if (c & 8) {
			let e = t.dynamicProps;
			for (let t = 0; t < e.length; t++) {
				let n = e[t];
				if (xr(o, r, n) && !mr(l, n)) return !0;
			}
		}
	} else return (i || s) && (!s || !s.$stable) ? !0 : r === o ? !1 : r ? !o || br(r, o, l) : !!o;
	return !1;
}
function br(e, t, n) {
	let r = Object.keys(t);
	if (r.length !== Object.keys(e).length) return !0;
	for (let i = 0; i < r.length; i++) {
		let a = r[i];
		if (!u(e, a) || xr(t, e, a) && !mr(n, a)) return !0;
	}
	return !1;
}
function xr(e, t, n) {
	let r = e[n], i = t[n];
	return n === "style" && v(r) && v(i) ? !O(r, i) : r !== i;
}
function Sr({ vnode: e, parent: t, suspense: n }, r) {
	for (; t;) {
		let n = t.subTree;
		if (n.suspense && n.suspense.activeBranch === e && (n.suspense.vnode.el = n.el = r, e = n), n === e) (e = t.vnode).el = r, t = t.parent;
		else break;
	}
	n && n.activeBranch === e && (n.vnode.el = r);
}
var Cr = {}, wr = () => Object.create(Cr), Tr = (e) => Object.getPrototypeOf(e) === Cr;
function Er(e, t, n, r = !1) {
	let i = {}, a = wr();
	e.propsDefaults = /* @__PURE__ */ Object.create(null), Or(e, t, i, a);
	for (let t in e.propsOptions[0]) t in i || (i[t] = void 0);
	e.props = n ? r ? i : /* @__PURE__ */ Rt(i) : e.type.props ? i : a, e.attrs = a;
}
function Dr(e, t, n, r) {
	let { props: i, attrs: a, vnode: { patchFlag: o } } = e, s = /* @__PURE__ */ N(i), [c] = e.propsOptions, l = !1;
	if ((r || o > 0) && !(o & 16)) {
		if (o & 8) {
			let n = e.vnode.dynamicProps;
			for (let r = 0; r < n.length; r++) {
				let o = n[r];
				if (mr(e.emitsOptions, o)) continue;
				let d = t[o];
				if (c) {
					if (u(a, o)) d !== a[o] && (a[o] = d, l = !0);
					else {
						let t = E(o);
						i[t] = kr(c, s, t, d, e, !1);
					}
				} else d !== a[o] && (a[o] = d, l = !0);
			}
		}
	} else {
		Or(e, t, i, a) && (l = !0);
		let r;
		for (let a in s) t && (u(t, a) || (r = re(a)) !== a && u(t, r)) || (c ? n && (n[a] !== void 0 || n[r] !== void 0) && (i[a] = kr(c, s, a, void 0, e, !0)) : delete i[a]);
		if (a !== s) for (let e in a) t && u(t, e) || (delete a[e], l = !0);
	}
	l && nt(e.attrs, "set", "");
}
function Or(e, n, r, i) {
	let [a, o] = e.propsOptions, s = !1, c;
	if (n) for (let t in n) {
		if (ee(t)) continue;
		let l = n[t], d;
		a && u(a, d = E(t)) ? !o || !o.includes(d) ? r[d] = l : (c ||= {})[d] = l : mr(e.emitsOptions, t) || t in i && l === i[t] || (i[t] = l, s = !0);
	}
	if (o) {
		let n = /* @__PURE__ */ N(r), i = c || t;
		for (let t = 0; t < o.length; t++) {
			let s = o[t];
			r[s] = kr(a, n, s, i[s], e, !u(i, s));
		}
	}
	return s;
}
function kr(e, t, n, r, i, a) {
	let o = e[n];
	if (o != null) {
		let e = u(o, "default");
		if (e && r === void 0) {
			let e = o.default;
			if (o.type !== Function && !o.skipFactory && h(e)) {
				let { propsDefaults: a } = i;
				if (n in a) r = a[n];
				else {
					let o = Di(i);
					r = a[n] = e.call(null, t), o();
				}
			} else r = e;
			i.ce && i.ce._setProp(n, r);
		}
		o[0] && (a && !e ? r = !1 : o[1] && (r === "" || r === re(n)) && (r = !0));
	}
	return r;
}
function Ar(e, r, i = !1) {
	let a = r.propsCache, o = a.get(e);
	if (o) return o;
	let c = e.props, l = {}, f = [];
	if (!c) return v(e) && a.set(e, n), n;
	if (d(c)) for (let e = 0; e < c.length; e++) {
		let n = E(c[e]);
		jr(n) && (l[n] = t);
	}
	else if (c) for (let e in c) {
		let t = E(e);
		if (jr(t)) {
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
function jr(e) {
	return e[0] !== "$" && !ee(e);
}
var Mr = (e) => e === "_" || e === "_ctx" || e === "$stable", Nr = (e) => d(e) ? e.map(hi) : [hi(e)], Pr = (e, t, n) => {
	if (t._n) return t;
	let r = An((...e) => Nr(t(...e)), n);
	return r._c = !1, r;
}, Fr = (e, t, n) => {
	let r = e._ctx;
	for (let n in e) {
		if (Mr(n)) continue;
		let i = e[n];
		if (h(i)) t[n] = Pr(n, i, r);
		else if (i != null) {
			let e = Nr(i);
			t[n] = () => e;
		}
	}
}, Ir = (e, t) => {
	let n = Nr(t);
	e.slots.default = () => n;
}, Lr = (e, t, n) => {
	for (let r in t) (n || !Mr(r)) && (e[r] = t[r]);
}, Rr = (e, t, n) => {
	let r = e.slots = wr();
	if (e.vnode.shapeFlag & 32) {
		let e = t._;
		e ? (Lr(r, t, n), n && ce(r, "_", e, !0)) : Fr(t, r);
	} else t && Ir(e, t);
}, zr = (e, n, r) => {
	let { vnode: i, slots: a } = e, o = !0, s = t;
	if (i.shapeFlag & 32) {
		let e = n._;
		e ? r && e === 1 ? o = !1 : Lr(a, n, r) : (o = !n.$stable, Fr(n, a)), s = n;
	} else n && (Ir(e, n), s = { default: 1 });
	if (o) for (let e in a) !Mr(e) && s[e] == null && delete a[e];
}, V = Qr;
function Br(e) {
	return Vr(e);
}
function Vr(e, i) {
	let a = de();
	a.__VUE__ = !0;
	let { insert: o, remove: s, patchProp: c, createElement: l, createText: u, createComment: d, setText: f, setElementText: p, parentNode: m, nextSibling: h, setScopeId: g = r, insertStaticContent: _ } = e, v = (e, t, r, i = null, a = null, o = null, s = void 0, c = null, l = !!t.dynamicChildren) => {
		if (e === t) return;
		e && !li(e, t) && (i = xe(e), D(e, a, o, !0), e = null), t.patchFlag === -2 && (l = !1, t.dynamicChildren = null), t.dynamicChildren && e && e.dynamicChildren && e.dynamicChildren.hasOnce && (t.dynamicChildren === n && (t.dynamicChildren = []), t.dynamicChildren.hasOnce = !0);
		let { type: u, ref: d, shapeFlag: f } = t;
		switch (u) {
			case $r:
				y(e, t, r, i);
				break;
			case ei:
				b(e, t, r, i);
				break;
			case ti:
				e ?? x(t, r, i, s);
				break;
			case H:
				ae(e, t, r, i, a, o, s, c, l);
				break;
			default: f & 1 ? w(e, t, r, i, a, o, s, c, l) : f & 6 ? oe(e, t, r, i, a, o, s, c, l) : (f & 64 || f & 128) && u.process(e, t, r, i, a, o, s, c, l, O);
		}
		d != null && a ? Jn(d, e && e.ref, o, t || e, !t) : d == null && e && e.ref != null && Jn(e.ref, null, o, e, !0);
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
		if (t.type === "svg" ? o = "svg" : t.type === "math" && (o = "mathml"), e == null) T(t, n, r, i, a, o, s, c);
		else {
			let n = e.el && e.el._isVueCE ? e.el : null;
			try {
				n && n._beginPatch(), ne(e, t, i, a, o, s, c);
			} finally {
				n && n._endPatch();
			}
		}
	}, T = (e, t, n, r, i, a, s, u) => {
		let d, f, { props: m, shapeFlag: h, transition: g, dirs: _ } = e;
		if (d = e.el = l(e.type, a, m && m.is, m), h & 8 ? p(d, e.children) : h & 16 && E(e.children, d, null, r, i, Hr(e, a), s, u), _ && jn(e, null, r, "created"), te(d, e, e.scopeId, s, r), m) {
			for (let e in m) e !== "value" && !ee(e) && c(d, e, null, m[e], a, r);
			"value" in m && c(d, "value", null, m.value, a), (f = m.onVnodeBeforeMount) && yi(f, r, e);
		}
		_ && jn(e, null, r, "beforeMount");
		let v = Wr(i, g);
		v ? g.beforeEnter(d) : g && !g.persisted && (d[Zr] = !0), o(d, t, n), ((f = m && m.onVnodeMounted) || v || _) && V(() => {
			try {
				f && yi(f, r, e), v && g.enter(d), _ && jn(e, null, r, "mounted");
			} finally {}
		}, i);
	}, te = (e, t, n, r, i) => {
		if (n && g(e, n), r) for (let t = 0; t < r.length; t++) g(e, r[t]);
		if (i) {
			let n = i.subTree;
			if (t === n || Xr(n.type) && (n.ssContent === t || n.ssFallback === t)) {
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
		if (r && Ur(r, !1), (g = h.onVnodeBeforeUpdate) && yi(g, r, n, e), f && jn(n, e, r, "beforeUpdate"), r && Ur(r, !0), d && (!e.dynamicChildren || e.dynamicChildren.length !== d.length) && (u = 0, s = !1, d = null), (m.innerHTML && h.innerHTML == null || m.textContent && h.textContent == null) && p(l, ""), d ? re(e.dynamicChildren, d, l, r, i, Hr(n, a), o) : s || pe(e, n, l, null, r, i, Hr(n, a), o, !1), u > 0) {
			if (u & 16) ie(l, m, h, r, a);
			else if (u & 2 && m.class !== h.class && c(l, "class", null, h.class, a), u & 4 && c(l, "style", m.style, h.style, a), u & 8) {
				let e = n.dynamicProps;
				for (let t = 0; t < e.length; t++) {
					let n = e[t], i = m[n], o = h[n];
					(o !== i || n === "value") && c(l, n, i, o, a, r);
				}
			}
			u & 1 && e.children !== n.children && p(l, n.children);
		} else !s && d == null && ie(l, m, h, r, a);
		((g = h.onVnodeUpdated) || f) && V(() => {
			g && yi(g, r, n, e), f && jn(n, e, r, "updated");
		}, i);
	}, re = (e, t, n, r, i, a, o) => {
		for (let s = 0; s < t.length; s++) {
			let c = e[s], l = t[s], u = c.el || Yr(c), d = u && (c.type === H || !li(c, l) || c.shapeFlag & 198) ? m(u) : n;
			v(c, l, d, null, r, i, a, o, !0);
		}
	}, ie = (e, n, r, i, a) => {
		if (n !== r) {
			if (n !== t) for (let t in n) !ee(t) && !(t in r) && c(e, t, n[t], null, a, i);
			for (let t in r) {
				if (ee(t)) continue;
				let o = r[t], s = n[t];
				o !== s && t !== "value" && c(e, t, s, o, a, i);
			}
			"value" in r && c(e, "value", n.value, r.value, a);
		}
	}, ae = (e, t, n, r, i, a, s, c, l) => {
		let d = t.el = e ? e.el : u(""), f = t.anchor = e ? e.anchor : u(""), { patchFlag: p, dynamicChildren: m, slotScopeIds: h } = t;
		h && (c = c ? c.concat(h) : h), e == null ? (o(d, n, r), o(f, n, r), E(t.children || [], n, f, i, a, s, c, l)) : p > 0 && p & 64 && m && e.dynamicChildren && e.dynamicChildren.length === m.length ? (re(e.dynamicChildren, m, n, i, a, s, c), (t.key != null || i && t === i.subTree) && Gr(e, t, !0)) : pe(e, t, n, f, i, a, s, c, l);
	}, oe = (e, t, n, r, i, a, o, s, c) => {
		t.slotScopeIds = s, e == null ? t.shapeFlag & 512 ? i.ctx.activate(t, n, r, o, c) : ce(t, n, r, i, a, o, c) : le(e, t, c);
	}, ce = (e, t, n, r, i, a, o) => {
		let s = e.component = Ci(e, r, i);
		if (Zn(e) && (s.ctx.renderer = O), ji(s, !1, o), s.asyncDep) {
			if (i && i.registerDep(s, ue, o, a), !e.el) {
				let r = s.subTree = q(ei);
				b(null, r, t, n), e.placeholder = r.el;
			}
		} else ue(s, e, t, n, i, a, o);
	}, le = (e, t, n) => {
		let r = t.component = e.component;
		if (yr(e, t, n)) {
			if (r.asyncDep && !r.asyncResolved) {
				t.el = e.el, t.placeholder = e.placeholder, fe(r, t, n);
				return;
			}
			r.next = t, r.update();
		} else t.el = e.el, t.placeholder = e.placeholder, r.vnode = t;
	}, ue = (e, t, n, r, i, a, o) => {
		let s = () => {
			if (e.isMounted) {
				let { next: t, bu: n, u: r, parent: s, vnode: c } = e;
				{
					let n = qr(e);
					if (n) {
						t && (t.el = c.el, fe(e, t, o)), n.asyncDep.then(() => {
							let t = () => {
								e.job.flags & 8 || (i && i.pendingBranch ? V(t, i) : l());
							};
							t.flags = 48, V(t, i);
						});
						return;
					}
				}
				let u = t, d;
				Ur(e, !1), t ? (t.el = c.el, fe(e, t, o)) : t = c, n && se(n), (d = t.props && t.props.onVnodeBeforeUpdate) && yi(d, s, t, c), Ur(e, !0);
				let f = hr(e), p = e.subTree;
				e.subTree = f, v(p, f, m(p.el || Yr(p)), xe(p), e, i, a), t.el = f.el, u === null && Sr(e, f.el), r && V(r, i), (d = t.props && t.props.onVnodeUpdated) && V(() => yi(d, s, t, c), i);
			} else {
				let o, { el: s, props: c } = t, { bm: l, m: u, parent: d, root: f, type: p } = e, m = Xn(t);
				if (Ur(e, !1), l && se(l), !m && (o = c && c.onVnodeBeforeMount) && yi(o, d, t), Ur(e, !0), s && we) {
					let t = () => {
						e.subTree = hr(e), we(s, e.subTree, e, i, null);
					};
					m && p.__asyncHydrate ? p.__asyncHydrate(s, e, t) : t();
				} else {
					f.ce && f.ce._hasShadowRoot() && f.ce._injectChildStyle(p, e.parent ? e.parent.type : void 0);
					let o = e.subTree = hr(e);
					v(null, o, n, r, e, i, a), t.el = o.el;
				}
				if (u && V(u, i), !m && (o = c && c.onVnodeMounted)) {
					let e = t;
					V(() => yi(o, d, e), i);
				}
				(t.shapeFlag & 256 || d && Xn(d.vnode) && d.vnode.shapeFlag & 256) && e.a && V(e.a, i), e.isMounted = !0, t = n = r = null;
			}
		};
		e.scope.on();
		let c = e.effect = new Ae(s);
		e.scope.off();
		let l = e.update = c.run.bind(c), u = e.job = c.runIfDirty.bind(c);
		u.i = e, u.id = e.uid, c.scheduler = () => yn(u), Ur(e, !0), l();
	}, fe = (e, t, n) => {
		t.component = e;
		let r = e.vnode.props;
		e.vnode = t, e.next = null, Dr(e, t.props, r, n), zr(e, t.children, n), Ge(), Sn(e), Ke();
	}, pe = (e, t, n, r, i, a, o, s, c = !1) => {
		let l = e && e.children, u = e ? e.shapeFlag : 0, d = t.children, { patchFlag: f, shapeFlag: m } = t;
		if (f > 0) {
			if (f & 128) {
				he(l, d, n, r, i, a, o, s, c);
				return;
			}
			if (f & 256) {
				me(l, d, n, r, i, a, o, s, c);
				return;
			}
		}
		m & 8 ? (u & 16 && be(l, i, a), d !== l && p(n, d)) : u & 16 ? m & 16 ? he(l, d, n, r, i, a, o, s, c) : be(l, i, a, !0) : (u & 8 && p(n, ""), m & 16 && E(d, n, r, i, a, o, s, c));
	}, me = (e, t, r, i, a, o, s, c, l) => {
		e ||= n, t ||= n;
		let u = e.length, d = t.length, f = Math.min(u, d), p = 0;
		for (; p < f; p++) {
			let n = t[p] = l ? gi(t[p]) : hi(t[p]);
			v(e[p], n, r, null, a, o, s, c, l);
		}
		u > d ? be(e, a, o, !0, !1, f) : E(t, r, i, a, o, s, c, l, f);
	}, he = (e, t, r, i, a, o, s, c, l) => {
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
		} else if (u > p) for (; u <= f;) D(e[u], a, o, !0), u++;
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
					D(n, a, o, !0);
					continue;
				}
				let i;
				if (n.key != null) i = g.get(n.key);
				else for (_ = h; _ <= p; _++) if (C[_ - h] === 0 && li(n, t[_])) {
					i = _;
					break;
				}
				i === void 0 ? D(n, a, o, !0) : (C[i - h] = u + 1, i >= S ? S = i : x = !0, v(n, t[i], r, null, a, o, s, c, l), y++);
			}
			let w = x ? Kr(C) : n;
			for (_ = w.length - 1, u = b - 1; u >= 0; u--) {
				let e = h + u, n = t[e], f = t[e + 1], p = e + 1 < d ? f.el || Yr(f) : i;
				C[u] === 0 ? v(null, n, r, p, a, o, s, c, l) : x && (_ < 0 || u !== w[_] ? ge(n, r, p, 2) : _--);
			}
		}
	}, ge = (e, t, n, r, i = null) => {
		let { el: a, type: c, transition: l, children: u, shapeFlag: d } = e;
		if (d & 6) ge(e.component.subTree, t, n, r);
		else if (d & 128) e.suspense.move(t, n, r);
		else if (d & 64) c.move(e, t, n, O);
		else if (c === H) {
			o(a, t, n);
			for (let e = 0; e < u.length; e++) ge(u[e], t, n, r);
			o(e.anchor, t, n);
		} else if (c === ti) S(e, t, n);
		else if (r !== 2 && d & 1 && l) {
			if (r === 0) l.persisted && !a[Bn] ? o(a, t, n) : (l.beforeEnter(a), o(a, t, n), V(() => l.enter(a), i));
			else {
				let { leave: r, delayLeave: i, afterLeave: c } = l, u = () => {
					e.ctx.isUnmounted ? s(a) : o(a, t, n);
				}, d = () => {
					let e = a._isLeaving || !!a[Bn];
					a._isLeaving && a[Bn](!0), l.persisted && !e ? u() : r(a, () => {
						u(), c && c();
					});
				};
				i ? i(a, u, d) : d();
			}
		} else o(a, t, n);
	}, D = (e, t, n, r = !1, i = !1) => {
		let { type: a, props: o, ref: s, children: c, dynamicChildren: l, shapeFlag: u, patchFlag: d, dirs: f, cacheIndex: p, memo: m } = e;
		if ((d === -2 || l && l.hasOnce) && (i = !1), s != null && (Ge(), Jn(s, null, n, e, !0), Ke()), p == null || e.ctx && e.ctx !== t || (t.renderCache[p] = void 0), u & 256 && t.ctx.deactivate(e)) return;
		let h = u & 1 && f, g = !Xn(e), _;
		if (g && (_ = o && o.onVnodeBeforeUnmount) && yi(_, t, e), u & 6) ye(e.component, n, r);
		else {
			if (u & 128) {
				e.suspense.unmount(n, r);
				return;
			}
			h && jn(e, null, t, "beforeUnmount"), u & 64 ? e.type.remove(e, t, n, O, r) : l && !l.hasOnce && (a !== H || d > 0 && d & 64) ? be(l, t, n, !1, !0) : (a === H && d & 384 || !i && u & 16) && be(c, t, n), r && _e(e);
		}
		let v = m != null && p == null;
		(g && (_ = o && o.onVnodeUnmounted) || h || v) && V(() => {
			_ && yi(_, t, e), h && jn(e, null, t, "unmounted"), v && (e.el = null);
		}, n);
	}, _e = (e) => {
		let { type: t, el: n, anchor: r, transition: i } = e, a = t === H;
		if (a && !i) {
			ve(n, r);
			return;
		}
		if (t === ti) {
			C(e), i && !i.persisted && i.afterLeave && i.afterLeave();
			return;
		}
		let o = a ? Wn(e) : e, c = () => {
			a ? m(n) && ve(n, r) : s(n), i && !i.persisted && i.afterLeave && i.afterLeave();
		};
		if (o && o.shapeFlag & 1 && i && !i.persisted) {
			let { leave: e, delayLeave: t } = i, n = o.el, r = () => e(n, c);
			t ? t(n, c, r) : r();
		} else c();
	}, ve = (e, t) => {
		let n;
		for (; e !== t;) n = h(e), s(e), e = n;
		s(t);
	}, ye = (e, t, n) => {
		let { bum: r, scope: i, job: a, subTree: o, um: s, m: c, a: l } = e;
		Jr(c), Jr(l), r && se(r), i.stop(), a ? (a.flags |= 8, D(o, e, t, n)) : o && (o.transition = e.vnode.transition, D(o, e, t, n)), s && V(s, t);
		let u = () => {
			e.isUnmounted = !0;
		};
		u.flags = 16, V(u, t);
	}, be = (e, t, n, r = !1, i = !1, a = 0) => {
		for (let o = a; o < e.length; o++) D(e[o], t, n, r, i);
	}, xe = (e) => {
		if (e.shapeFlag & 6) return xe(e.component.subTree);
		if (e.shapeFlag & 128) return e.suspense.next();
		let t = h(e.anchor || e.el), n = t && t[Rn];
		return n ? h(n) : t;
	}, Se = (e, t, n) => {
		Tn(() => {
			e == null ? t._vnode && D(t._vnode, null, null, !0) : v(t._vnode || null, e, t, null, null, null, n), t._vnode = e;
		}, e && t._vnode ? void 0 : e && e.component ? e.component.uid : Si());
	}, O = {
		p: v,
		um: D,
		m: ge,
		r: _e,
		mt: ce,
		mc: E,
		pc: pe,
		pbc: re,
		n: xe,
		o: e
	}, Ce, we;
	return i && ([Ce, we] = i(O)), {
		render: Se,
		hydrate: Ce,
		createApp: lr(Se, Ce)
	};
}
function Hr({ type: e, props: t }, n) {
	return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function Ur({ effect: e, job: t }, n) {
	n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Wr(e, t) {
	return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function Gr(e, t, n = !1) {
	let r = e.children, i = t.children;
	if (d(r) && d(i)) for (let e = 0; e < r.length; e++) {
		let t = r[e], a = i[e];
		a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[e] = gi(i[e]), a.el = t.el), !n && a.patchFlag !== -2 && Gr(t, a)), a.type === $r && (a.patchFlag === -1 && (a = i[e] = gi(a)), a.el = t.el), a.type === ei && !a.el && (a.el = t.el);
	}
}
function Kr(e) {
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
function qr(e) {
	let t = e.subTree.component;
	if (t) return t.asyncDep && !t.asyncResolved ? t : qr(t);
}
function Jr(e) {
	if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
function Yr(e) {
	if (e.placeholder) return e.placeholder;
	let t = e.component;
	if (t) return Yr(t.subTree);
	let n = e.suspense;
	return n && n.activeBranch ? Yr(n.activeBranch) : null;
}
var Xr = (e) => e.__isSuspense, Zr = /* @__PURE__ */ Symbol("_deferredEnter");
function Qr(e, t) {
	t && t.pendingBranch ? d(e) ? t.effects.push(...e) : t.effects.push(e) : xn(e);
}
var H = /* @__PURE__ */ Symbol.for("v-fgt"), $r = /* @__PURE__ */ Symbol.for("v-txt"), ei = /* @__PURE__ */ Symbol.for("v-cmt"), ti = /* @__PURE__ */ Symbol.for("v-stc"), ni = [], U = null;
function W(e = !1) {
	ni.push(U = e ? null : []);
}
function ri() {
	ni.pop(), U = ni[ni.length - 1] || null;
}
var ii = 1;
function ai(e, t = !1) {
	ii += e, e < 0 && U && t && (U.hasOnce = !0);
}
function oi(e) {
	return e.dynamicChildren = ii > 0 ? U || n : null, ri(), ii > 0 && U && U.push(e), e;
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
var ui = ({ key: e }) => e ?? null, di = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e == null ? null : g(e) || /* @__PURE__ */ F(e) || h(e) ? {
	i: R,
	r: e,
	k: t,
	f: !!n
} : e);
function K(e, t = null, n = null, r = 0, i = null, a = e === H ? 0 : 1, o = !1, s = !1) {
	let c = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e,
		props: t,
		key: t && ui(t),
		ref: t && di(t),
		scopeId: On,
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
		ctx: R
	};
	return s ? (_i(c, n), a & 128 && e.normalize(c)) : n && (c.shapeFlag |= g(n) ? 8 : 16), ii > 0 && !o && U && (c.patchFlag > 0 || a & 6) && c.patchFlag !== 32 && U.push(c), c;
}
var q = fi;
function fi(e, t = null, n = null, r = 0, i = null, a = !1) {
	if (e && e !== nr || (e = ei), ci(e)) {
		let r = mi(e, t, !0);
		return n && _i(r, n), ii > 0 && !a && U && (r.shapeFlag & 6 ? U[U.indexOf(e)] = r : U.push(r)), r.patchFlag = -2, r;
	}
	if (zi(e) && (e = e.__vccOpts), t) {
		t = pi(t);
		let { class: e, style: n } = t;
		e && !g(e) && (t.class = D(e)), v(n) && (/* @__PURE__ */ Wt(n) && !d(n) && (n = s({}, n)), t.style = fe(n));
	}
	let o = g(e) ? 1 : Xr(e) ? 128 : zn(e) ? 64 : v(e) ? 4 : h(e) ? 2 : 0;
	return K(e, t, n, r, i, o, a, !0);
}
function pi(e) {
	return e ? /* @__PURE__ */ Wt(e) ? s({}, e) : Tr(e) ? s({}, e[Fi] || e) : e : null;
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
		patchFlag: t && e.type !== H ? o === -1 ? 16 : o | 16 : o,
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
	return c && r && Un(u, c.clone(u)), u;
}
function J(e = " ", t = 0) {
	return q($r, null, e, t);
}
function Y(e = "", t = !1) {
	return t ? (W(), si(ei, null, e)) : q(ei, null, e);
}
function hi(e) {
	return e == null || typeof e == "boolean" ? q(ei) : d(e) ? q(H, null, e.slice()) : ci(e) ? gi(e) : q($r, null, String(e));
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
			!r && !Tr(t) ? t._ctx = R : r === 3 && R && (R.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
		}
	} else if (h(t)) {
		if (r & 65) {
			_i(e, { default: t });
			return;
		}
		t = {
			default: t,
			_ctx: R
		}, n = 32;
	} else t = String(t), r & 64 ? (n = 16, t = [J(t)]) : n = 8;
	e.children = t, e.shapeFlag |= n;
}
function vi(...e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		for (let e in r) if (e === "class") t.class !== r.class && (t.class = D([t.class, r.class]));
		else if (e === "style") t.style = fe([t.style, r.style]);
		else if (a(e)) {
			let n = t[e], i = r[e];
			i && n !== i && !(d(n) && n.includes(i)) ? t[e] = n ? [].concat(n, i) : i : i == null && n == null && !o(e) && (t[e] = i);
		} else e !== "" && (t[e] = r[e]);
	}
	return t;
}
function yi(e, t, n, r = null) {
	cn(e, t, 7, [n, r]);
}
var bi = /* @__PURE__ */ sr(), xi = 0;
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
		scope: new De(!0),
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
		propsOptions: Ar(i, a),
		emitsOptions: pr(i, a),
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
	return o.ctx = { _: o }, o.root = n ? n.root : o, o.emit = fr.bind(null, o), e.ce && e.ce(o), o;
}
var X = null, wi = () => X || R, Ti, Ei;
{
	let e = de(), t = (t, n) => {
		let r;
		return (r = e[t]) || (r = e[t] = []), r.push(n), (e) => {
			r.length > 1 ? r.forEach((t) => t(e)) : r[0](e);
		};
	};
	Ti = t("__VUE_INSTANCE_SETTERS__", (e) => X = e), Ei = t("__VUE_SSR_SETTERS__", (e) => Ai = e);
}
var Di = (e) => {
	let t = X;
	return Ti(e), e.scope.on(), () => {
		e.scope.off(), Ti(t);
	};
}, Oi = () => {
	X && X.scope.off(), Ti(null);
};
function ki(e) {
	return e.vnode.shapeFlag & 4;
}
var Ai = !1;
function ji(e, t = !1, n = !1) {
	t && Ei(t);
	let { props: r, children: i } = e.vnode, a = ki(e);
	Er(e, r, a, t), Rr(e, i, n || t);
	let o = a ? Mi(e, t) : void 0;
	return t && Ei(!1), o;
}
function Mi(e, t) {
	let n = e.type;
	e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, or);
	let { setup: r } = n;
	if (r) {
		Ge();
		let n = e.setupContext = r.length > 1 ? Li(e) : null, i = Di(e), a = sn(r, e, 0, [e.props, n]), o = y(a);
		if (Ke(), i(), (o || e.sp) && !Xn(e) && Gn(e), o) {
			if (a.then(Oi, Oi), t) return a.then((n) => {
				Ei(!0);
				try {
					Ni(e, n, t);
				} finally {
					Ei(!1);
				}
			}).catch((t) => {
				ln(t, e, 0, void 0, !0), e.ssrRender = (e, t) => t("<!---->");
			});
			e.asyncDep = a;
		} else Ni(e, a, t);
	} else Pi(e, t);
}
function Ni(e, t, n) {
	h(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : v(t) && (e.setupState = Zt(t)), Pi(e, n);
}
function Pi(e, t, n) {
	let i = e.type;
	e.render ||= i.render || r;
}
var Fi = /* @__PURE__ */ Symbol(), Ii = { get(e, t) {
	return M(e, "get", ""), t === Fi ? e : e[t];
} };
function Li(e) {
	return {
		attrs: new Proxy(e.attrs, Ii),
		slots: e.slots,
		emit: e.emit,
		expose: (t) => {
			e.exposed = t || {};
		}
	};
}
function Ri(e) {
	return e.exposed ? e.exposeProxy ||= new Proxy(Zt(Gt(e.exposed)), {
		get(t, n) {
			if (n in t) return t[n];
			if (n in ir) return ir[n](e);
		},
		has(e, t) {
			return t in e || t in ir;
		}
	}) : e.proxy;
}
function zi(e) {
	return h(e) && "__vccOpts" in e;
}
var Z = (e, t) => /* @__PURE__ */ $t(e, t, Ai), Bi = "3.5.45", Vi = void 0, Hi = typeof window < "u" && window.trustedTypes;
if (Hi) try {
	Vi = /* @__PURE__ */ Hi.createPolicy("vue", { createHTML: (e) => e });
} catch {}
var Ui = Vi ? (e) => Vi.createHTML(e) : (e) => e, Wi = "http://www.w3.org/2000/svg", Gi = "http://www.w3.org/1998/Math/MathML", Ki = typeof document < "u" ? document : null, qi = Ki && /* @__PURE__ */ Ki.createElement("template"), Ji = {
	insert: (e, t, n) => {
		t.insertBefore(e, n || null);
	},
	remove: (e) => {
		let t = e.parentNode;
		t && t.removeChild(e);
	},
	createElement: (e, t, n, r) => {
		let i = t === "svg" ? Ki.createElementNS(Wi, e) : t === "mathml" ? Ki.createElementNS(Gi, e) : n ? Ki.createElement(e, { is: n }) : Ki.createElement(e);
		return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
	},
	createText: (e) => Ki.createTextNode(e),
	createComment: (e) => Ki.createComment(e),
	setText: (e, t) => {
		e.nodeValue = t;
	},
	setElementText: (e, t) => {
		e.textContent = t;
	},
	parentNode: (e) => e.parentNode,
	nextSibling: (e) => e.nextSibling,
	querySelector: (e) => Ki.querySelector(e),
	setScopeId(e, t) {
		e.setAttribute(t, "");
	},
	insertStaticContent(e, t, n, r, i, a) {
		let o = n ? n.previousSibling : t.lastChild;
		if (i && (i === a || i.nextSibling)) for (; t.insertBefore(i.cloneNode(!0), n), i !== a && (i = i.nextSibling););
		else {
			qi.innerHTML = Ui(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
			let i = qi.content;
			if (r === "svg" || r === "mathml") {
				let e = i.firstChild;
				for (; e.firstChild;) i.appendChild(e.firstChild);
				i.removeChild(e);
			}
			t.insertBefore(i, n);
		}
		return [o ? o.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild];
	}
}, Yi = /* @__PURE__ */ Symbol("_vtc");
function Xi(e, t, n) {
	let r = e[Yi];
	r && (t = (t ? [t, ...r] : [...r]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
var Zi = /* @__PURE__ */ Symbol("_vod"), Qi = /* @__PURE__ */ Symbol("_vsh"), $i = {
	name: "show",
	beforeMount(e, { value: t }, { transition: n }) {
		e[Zi] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : ea(e, t);
	},
	mounted(e, { value: t }, { transition: n }) {
		n && t && n.enter(e);
	},
	updated(e, { value: t, oldValue: n }, { transition: r }) {
		!t != !n && (r ? t ? (r.beforeEnter(e), ea(e, !0), r.enter(e)) : r.leave(e, () => {
			ea(e, !1);
		}) : ea(e, t));
	},
	beforeUnmount(e, { value: t }) {
		ea(e, t);
	}
};
function ea(e, t) {
	e.style.display = t ? e[Zi] : "none", e[Qi] = !t;
}
var ta = /* @__PURE__ */ Symbol(""), na = /(?:^|;)\s*display\s*:/;
function ra(e, t, n) {
	let r = e.style, i = g(n), a = !1;
	if (n && !i) {
		if (t) {
			if (g(t)) for (let e of t.split(";")) {
				let t = e.slice(0, e.indexOf(":")).trim();
				n[t] ?? aa(r, t, "");
			}
			else for (let e in t) n[e] ?? aa(r, e, "");
		}
		for (let i in n) {
			i === "display" && (a = !0);
			let o = n[i];
			o == null ? aa(r, i, "") : la(e, i, !g(t) && t ? t[i] : void 0, o) || aa(r, i, o);
		}
	} else if (i) {
		if (t !== n) {
			let e = r[ta];
			e && (n += ";" + e), r.cssText = n, a = na.test(n);
		}
	} else t && e.removeAttribute("style");
	Zi in e && (i && t === n || (e[Zi] = a ? r.display : ""), e[Qi] && (r.display = "none"));
}
var ia = /\s*!important$/;
function aa(e, t, n) {
	if (d(n)) n.forEach((n) => aa(e, t, n));
	else if (n ??= "", t.startsWith("--")) ia.test(n) ? e.setProperty(t, n.replace(ia, ""), "important") : e.setProperty(t, n);
	else {
		let r = ca(e, t);
		ia.test(n) ? e.setProperty(re(r), n.replace(ia, ""), "important") : e[r] = n;
	}
}
var oa = [
	"Webkit",
	"Moz",
	"ms"
], sa = {};
function ca(e, t) {
	let n = sa[t];
	if (n) return n;
	let r = E(t);
	if (r !== "filter" && r in e) return sa[t] = r;
	r = ie(r);
	for (let n = 0; n < oa.length; n++) {
		let i = oa[n] + r;
		if (i in e) return sa[t] = i;
	}
	return t;
}
function la(e, t, n, r) {
	return e.tagName === "TEXTAREA" && (t === "width" || t === "height") && g(r) && n === r;
}
var ua = "http://www.w3.org/1999/xlink";
function da(e, t, n, r, i, a = _e(t)) {
	r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(ua, t.slice(6, t.length)) : e.setAttributeNS(ua, t, n) : n == null || a && !ve(n) ? e.removeAttribute(t) : e.setAttribute(t, a ? "" : _(n) ? String(n) : n);
}
function fa(e, t, n, r, i) {
	if (t === "innerHTML" || t === "textContent") {
		n != null && (e[t] = t === "innerHTML" ? Ui(n) : n);
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
		r === "boolean" ? n = ve(n) : n == null && r === "string" ? (n = "", o = !0) : r === "number" && (n = 0, o = !0);
	}
	try {
		e[t] = n;
	} catch {}
	o && e.removeAttribute(i || t);
}
function pa(e, t, n, r) {
	e.addEventListener(t, n, r);
}
function ma(e, t, n, r) {
	e.removeEventListener(t, n, r);
}
var ha = /* @__PURE__ */ Symbol("_vei");
function ga(e, t, n, r, i = null) {
	let a = e[ha] || (e[ha] = {}), o = a[t];
	if (r && o) o.value = r;
	else {
		let [n, s] = ya(t);
		r ? pa(e, n, a[t] = Ca(r, i), s) : o && (ma(e, n, o, s), a[t] = void 0);
	}
}
var _a = /(Once|Passive|Capture)$/, va = /^on:?(?:Once|Passive|Capture)$/;
function ya(e) {
	let t, n;
	for (; (n = e.match(_a)) && !va.test(e);) t ||= {}, e = e.slice(0, e.length - n[1].length), t[n[1].toLowerCase()] = !0;
	return [e[2] === ":" ? e.slice(3) : re(e.slice(2)), t];
}
var ba = 0, xa = /* @__PURE__ */ Promise.resolve(), Sa = () => ba ||= (xa.then(() => ba = 0), Date.now());
function Ca(e, t) {
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
	return n.value = e, n.attached = Sa(), n;
}
var wa = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Ta = (e, t, n, r, i, s) => {
	let c = i === "svg";
	t === "class" ? Xi(e, r, c) : t === "style" ? ra(e, n, r) : a(t) ? o(t) || ga(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), 1) : t[0] === "^" ? (t = t.slice(1), 0) : Ea(e, t, r, c)) ? (fa(e, t, r), e.tagName.includes("-") || t !== "value" && t !== "checked" && t !== "selected" || da(e, t, r, c, s, t !== "value")) : e._isVueCE && (Da(e, t) || e._def.__asyncLoader && (/[A-Z]/.test(t) || !g(r))) ? fa(e, E(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), da(e, t, r, c));
};
function Ea(e, t, n, r) {
	if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && wa(t) && h(n));
	if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return !1;
	if (t === "width" || t === "height") {
		let t = e.tagName;
		if (t === "IMG" || t === "VIDEO" || t === "CANVAS" || t === "SOURCE") return !1;
	}
	return wa(t) && g(n) ? !1 : t in e;
}
function Da(e, t) {
	let n = e._def.props;
	if (!n) return !1;
	let r = E(t);
	return Array.isArray(n) ? n.some((e) => E(e) === r) : Object.keys(n).some((e) => E(e) === r);
}
var Oa = (e) => {
	let t = e.props["onUpdate:modelValue"] || !1;
	return d(t) ? (e) => se(t, e) : t;
};
function ka(e) {
	e.target.composing = !0;
}
function Aa(e) {
	let t = e.target;
	t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
var ja = /* @__PURE__ */ Symbol("_assign"), Ma = /* @__PURE__ */ Symbol("_initialValue");
function Na(e, t, n) {
	return t && (e = e.trim()), n && (e = le(e)), e;
}
var Pa = {
	created(e, { modifiers: { lazy: t, trim: n, number: r } }, i) {
		e.parentNode && (e.type === "text" ? e[Ma] = e.defaultValue.replace(/[\r\n]/g, "") : e.type === "textarea" && (e[Ma] = e.defaultValue.replace(/\r\n?/g, "\n"))), e[ja] = Oa(i);
		let a = r || i.props && i.props.type === "number";
		pa(e, t ? "change" : "input", (t) => {
			t.target.composing || e[ja](Na(e.value, n, a));
		}), (n || a) && pa(e, "change", () => {
			e.value = Na(e.value, n, a);
		}), t || (pa(e, "compositionstart", ka), pa(e, "compositionend", Aa), pa(e, "change", Aa));
	},
	mounted(e, { value: t, modifiers: { trim: n, number: r } }) {
		let i = t ?? "", a = e[Ma];
		delete e[Ma], a !== void 0 && (e.type === "text" || e.type === "textarea") && e.value !== a ? e[ja](Na(e.value, n, r)) : e.value = i;
	},
	beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: i, number: a } }, o) {
		if (e[ja] = Oa(o), e.composing) return;
		let s = (a || e.type === "number") && !/^0\d/.test(e.value) ? le(e.value) : e.value, c = t ?? "";
		if (s === c) return;
		let l = e.getRootNode();
		(l instanceof Document || l instanceof ShadowRoot) && l.activeElement === e && e.type !== "range" && (r && t === n || i && e.value.trim() === c) || (e.value = c);
	}
}, Fa = {
	deep: !0,
	created(e, t, n) {
		e[ja] = Oa(n), pa(e, "change", () => {
			let t = e._modelValue, n = Ba(e), r = e.checked, i = e[ja];
			if (d(t)) {
				let e = Ce(t, n), a = e !== -1;
				if (r && !a) i(t.concat(n));
				else if (!r && a) {
					let n = [...t];
					n.splice(e, 1), i(n);
				}
			} else if (p(t)) {
				let e = new Set(t);
				r ? e.add(n) : e.delete(n), i(e);
			} else i(Va(e, r));
		});
	},
	mounted: Ia,
	beforeUpdate(e, t, n) {
		e[ja] = Oa(n), Ia(e, t, n);
	}
};
function Ia(e, { value: t, oldValue: n }, r) {
	e._modelValue = t;
	let i;
	if (d(t)) i = Ce(t, r.props.value) > -1;
	else if (p(t)) i = t.has(r.props.value);
	else {
		if (t === n) return;
		i = O(t, Va(e, !0));
	}
	e.checked !== i && (e.checked = i);
}
var La = {
	deep: !0,
	created(e, { value: t, modifiers: { number: n } }, r) {
		e._modelValue = t, pa(e, "change", () => {
			let t = Array.prototype.filter.call(e.options, (e) => e.selected).map((e) => n ? le(Ba(e)) : Ba(e)), r = e.multiple, i = r ? p(e._modelValue) ? new Set(t) : t : t[0], a = e._pendingValue = [r, r ? d(i) ? t.slice() : t : i];
			try {
				e[ja](i);
			} finally {
				_n(() => {
					e._pendingValue === a && (e._pendingValue = void 0);
				});
			}
		}), e[ja] = Oa(r);
	},
	mounted(e, { value: t, modifiers: { number: n } }) {
		za(e, t, n);
	},
	beforeUpdate(e, { value: t }, n) {
		e._modelValue = t, e[ja] = Oa(n);
	},
	updated(e, { value: t, modifiers: { number: n } }) {
		let r = e._pendingValue;
		e._pendingValue = void 0, r && r[0] === e.multiple && Ra(t, r[1], r[0]) || za(e, t, n);
	}
};
function Ra(e, t, n) {
	if (!n || d(e)) return O(e, t);
	if (p(e)) {
		if (e.size !== t.length) return !1;
		for (let n of t) if (!e.has(n)) return !1;
		return !0;
	}
	return !1;
}
function za(e, t, n = !1) {
	let r = e.multiple, i = d(t);
	if (!r || i || p(t)) {
		for (let a = 0, o = e.options.length; a < o; a++) {
			let o = e.options[a], s = Ba(o);
			if (r) {
				if (i) {
					let e = typeof s;
					o.selected = e === "string" || e === "number" ? t.some((e) => String(e) === String(s)) : Ce(t, s) > -1;
				} else o.selected = t.has(s) || n && typeof s == "string" && t.has(le(s));
			} else if (O(Ba(o), t)) {
				e.selectedIndex !== a && (e.selectedIndex = a);
				return;
			}
		}
		!r && e.selectedIndex !== -1 && (e.selectedIndex = -1);
	}
}
function Ba(e) {
	return "_value" in e ? e._value : e.value;
}
function Va(e, t) {
	let n = t ? "_trueValue" : "_falseValue";
	return n in e ? e[n] : t;
}
var Ha = [
	"ctrl",
	"shift",
	"alt",
	"meta"
], Ua = {
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
	exact: (e, t) => Ha.some((n) => e[`${n}Key`] && !t.includes(n))
}, Wa = (e, t) => {
	if (!e) return e;
	let n = e._withMods ||= {}, r = t.join(".");
	return n[r] || (n[r] = ((n, ...r) => {
		for (let e = 0; e < t.length; e++) {
			let r = Ua[t[e]];
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
		let r = re(n.key);
		if (t.some((e) => e === r || Ga[e] === r)) return e(n);
	}));
}, qa = /* @__PURE__ */ s({ patchProp: Ta }, Ji), Ja;
function Ya() {
	return Ja ||= Br(qa);
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
}, to = (e) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${eo[e] || eo.book}"/></svg>`, no = (e, t) => ({
	method: e,
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(t)
}), ro = (e) => encodeURIComponent(String(e)), io = (e) => `/api/file?path=${encodeURIComponent(e)}`, ao = (e) => e.title || e.literature_id || "未命名文献", oo = (e) => Array.isArray(e.authors) ? e.authors.map((e) => typeof e == "string" ? e : e.name || "").join(", ") : e.authors || "作者待核实";
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
	return i = i.replace(/`([^`]+)`/g, (e, t) => r(`<code>${Q(t)}</code>`)), i = i.replace(/(!?)\[([^\]\n]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, (e, n, i, a) => {
		let o = so(a, t);
		return r(o ? n ? `<img src="${Q(o)}" alt="${Q(i)}" loading="lazy" referrerpolicy="no-referrer">` : `<a href="${Q(o)}" target="_blank" rel="noopener noreferrer">${Q(i)}</a>` : Q(i));
	}), i = Q(i).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>").replace(/~~([^~\n]+)~~/g, "<del>$1</del>"), i.replace(/\u0001(\d+)\u0002/g, (e, t) => n[Number(t)] || "");
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
			r += `<pre><code>${Q(t.join("\n"))}</code></pre>`;
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
		return (t, n) => (W(), G("svg", po, [K("path", { d: I(eo)[e.name] || I(eo).book }, null, 8, mo)]));
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
		}, r = Z(() => n[t.kind]);
		return (t, n) => (W(), G("div", {
			class: D(["panel-resizer", { "panel-resizer-left": e.kind === "assistant" }]),
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
		let t = Nn("workspace"), n = t.state, r = Z(() => {
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
		return (e, o) => (W(), G("aside", _o, [
			K("a", vo, [K("span", yo, [q($)]), o[2] ||= K("span", null, "Zhiyue", -1)]),
			K("nav", bo, [K("button", {
				class: D(["nav-item", { active: I(n).view === "library" }]),
				"data-view": "library",
				onClick: o[0] ||= (e) => I(t).setView("library")
			}, [
				q($, { name: "library" }),
				o[3] ||= J("文献 ", -1),
				K("span", xo, k(I(n).papers.length), 1)
			], 2), K("button", {
				class: D(["nav-item", { active: I(n).view === "downloads" }]),
				"data-view": "downloads",
				onClick: o[1] ||= (e) => I(t).setView("downloads")
			}, [q($, { name: "download" }), o[4] ||= J("下载任务 ", -1)], 2)]),
			o[5] ||= K("div", { class: "section-label" }, "分类", -1),
			K("div", So, [(W(!0), G(H, null, B(r.value, (e) => (W(), G("button", {
				key: `${e.name}/${e.child}`,
				class: D(["category-button", {
					"category-child": e.child,
					active: I(n).category === e.name && I(n).subcategory === e.child
				}]),
				onClick: (t) => a(e)
			}, [
				e.child ? Y("", !0) : (W(), si($, {
					key: 0,
					name: "folder"
				})),
				K("span", wo, k(i(e.label)), 1),
				K("span", To, k(e.count), 1)
			], 10, Co))), 128))]),
			o[6] ||= K("div", { class: "sidebar-bottom" }, [K("span", { class: "workspace-dot" }), K("span", null, "本地工作区")], -1),
			q(go, { kind: "sidebar" })
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
		let t = Nn("workspace"), n = t.state, r = Z(() => [...new Set(n.papers.map((e) => e.year).filter(Boolean).map(String))].sort((e, t) => (Number(t) || 0) - (Number(e) || 0))), i = Z(() => {
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
		return (e, a) => (W(), G("section", Do, [
			K("div", Oo, [
				K("label", ko, [
					q($, { name: "search" }),
					z(K("input", {
						id: "search",
						"onUpdate:modelValue": a[0] ||= (e) => I(n).query = e,
						type: "search",
						placeholder: "搜索题名、作者、编号…",
						"aria-label": "搜索文献"
					}, null, 512), [[Pa, I(n).query]]),
					a[7] ||= K("kbd", null, "/", -1)
				]),
				K("div", Ao, [
					z(K("select", {
						id: "year-filter",
						"onUpdate:modelValue": a[1] ||= (e) => I(n).year = e,
						"aria-label": "按年份筛选"
					}, [a[8] ||= K("option", { value: "" }, "全部年份", -1), (W(!0), G(H, null, B(r.value, (e) => (W(), G("option", { key: e }, k(e), 1))), 128))], 512), [[La, I(n).year]]),
					z(K("select", {
						id: "read-filter",
						"onUpdate:modelValue": a[2] ||= (e) => I(n).read = e,
						"aria-label": "按阅读状态筛选"
					}, [a[9] ||= K("option", { value: "" }, "全部进度", -1), (W(!0), G(H, null, B(I(uo), (e, t) => (W(), G("option", {
						key: t,
						value: t
					}, k(e), 9, jo))), 128))], 512), [[La, I(n).read]]),
					K("button", {
						id: "star-filter",
						class: D(["icon-button", { selected: I(n).starred }]),
						title: "仅看收藏",
						"aria-label": "仅看收藏",
						"aria-pressed": I(n).starred,
						onClick: a[3] ||= (e) => I(n).starred = !I(n).starred
					}, [q($, { name: "star" })], 10, Mo)
				]),
				K("div", No, [K("span", Po, k(I(n).libraryError ? "加载失败" : `${i.value.length} 篇文献`), 1), z(K("select", {
					id: "sort",
					"onUpdate:modelValue": a[4] ||= (e) => I(n).sort = e,
					"aria-label": "排序"
				}, [...a[10] ||= [
					K("option", { value: "id" }, "编号顺序", -1),
					K("option", { value: "year-desc" }, "年份从新到旧", -1),
					K("option", { value: "year-asc" }, "年份从旧到新", -1),
					K("option", { value: "title" }, "题名顺序", -1)
				]], 512), [[La, I(n).sort]])])
			]),
			K("div", Fo, [I(n).libraryError ? (W(), G("div", Io, [K("p", Lo, k(I(n).libraryError), 1), K("button", {
				class: "button subtle",
				onClick: a[5] ||= (...e) => I(t).loadLibrary && I(t).loadLibrary(...e)
			}, "重新连接")])) : (W(!0), G(H, { key: 1 }, B(i.value, (e) => (W(), G("article", {
				key: e.literature_id,
				class: D(["paper-card", { active: I(n).current === e.literature_id }]),
				"data-paper": e.literature_id,
				tabindex: "0",
				"aria-label": I(ao)(e),
				"aria-current": I(n).current === e.literature_id,
				onClick: (n) => I(t).selectPaper(e.literature_id),
				onKeydown: [Ka(Wa((n) => I(t).selectPaper(e.literature_id), ["self", "prevent"]), ["enter"]), Ka(Wa((n) => I(t).selectPaper(e.literature_id), ["self", "prevent"]), ["space"])]
			}, [
				K("div", zo, [
					K("span", Bo, k(e.literature_id), 1),
					K("span", null, "· " + k(e.year || "年份待核实"), 1),
					K("button", {
						class: D(["icon-button", { selected: e.starred }]),
						"aria-pressed": !!e.starred,
						title: e.starred ? "取消收藏" : "收藏论文",
						"aria-label": e.starred ? "取消收藏" : "收藏论文",
						disabled: I(n).pendingPatches.has(e.literature_id),
						onClick: Wa((n) => I(t).patchPaper(e.literature_id, { starred: !e.starred }), ["stop"])
					}, [q($, { name: "star" })], 10, Vo)
				]),
				K("h3", null, k(I(ao)(e)), 1),
				K("div", {
					class: "paper-authors",
					title: I(oo)(e)
				}, k(I(oo)(e)), 9, Ho),
				K("div", Uo, [K("span", {
					class: "tag",
					title: e.subcategory || e.venue || ""
				}, k((e.subcategory || e.venue || e.category || "未分类").replace(/^\d+_/, "")), 9, Wo), K("span", { class: D(I(fo)(e.readStatus)) }, [a[11] ||= K("i", { class: "read-dot" }, null, -1), J(k(I(uo)[I(fo)(e.readStatus)]), 1)], 2)])
			], 42, Ro))), 128)), !I(n).libraryError && !i.value.length ? (W(), G("div", Go, [a[12] ||= K("p", null, "没有匹配的文献", -1), K("button", {
				id: "reset-filters",
				class: "button subtle",
				onClick: a[6] ||= (...e) => I(t).resetFilters && I(t).resetFilters(...e)
			}, "清除筛选")])) : Y("", !0)]),
			q(go, { kind: "papers" })
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
		}, f(), w(i), S(i, r, !0)) : r !== e.pdfPage && (e.pdfPage = r, T());
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
			r.innerHTML = `<div class="empty"><h2>页面预览暂不可用</h2><p class="error-text">${Q(e.name === "AbortError" ? "预览请求超时，请重试。" : e.message)}</p><button id="retry-preview" class="button subtle">重新加载第 ${a} 页</button><p>也可使用工具栏的“单独打开”查看原 PDF。</p></div>`;
		} finally {
			g(i) && (e.previewLoading = !1, f());
		}
	}
	function T() {
		let n = l();
		if (!n) {
			d(), s("#reader-header").innerHTML = "<span class=\"muted\">阅读</span>", s("#reader-toolbar").hidden = !0, s("#reader-content").innerHTML = `<div class="empty reader-empty"><span class="empty-art">${to("book")}</span><h2>选择论文</h2><p>从左侧选择，查看原文或笔记。</p></div>`;
			return;
		}
		let r = ++e.noteEpoch;
		d(), s("#reader-header").innerHTML = `<div class="reader-heading"><h2>${Q(ao(n))}</h2><div class="reader-meta">${Q(n.literature_id)} · ${Q(n.year || "年份待核实")} · ${Q(n.pages ? n.pages + " 页" : "页数待核实")}<br>${Q(oo(n))}</div></div><select id="paper-read-status" aria-label="标记阅读进度">${Object.entries(uo).map(([e, t]) => `<option value="${e}" ${fo(n.readStatus) === e ? "selected" : ""}>${t}</option>`).join("")}</select>`;
		let i = Array.isArray(n.notes) ? n.notes : [];
		s("#reader-toolbar").hidden = !1, s("#reader-toolbar").innerHTML = `<div class="segmented"><button data-reader-mode="pdf" class="${e.readerMode === "pdf" ? "active" : ""}">原文 PDF</button><button data-reader-mode="note" class="${e.readerMode === "note" ? "active" : ""}">阅读笔记 <small>${i.length}</small></button></div>${e.readerMode === "pdf" && n.file ? `<select id="pdf-renderer" aria-label="PDF显示方式"><option value="preview" ${e.pdfBrowser ? "" : "selected"}>连续阅读</option><option value="browser" ${e.pdfBrowser ? "selected" : ""}>浏览器阅读器</option></select>` : ""}${e.readerMode === "note" && i.length ? `<select id="note-select" aria-label="选择笔记">${i.map((t) => `<option value="${Q(t.path)}" ${t.path === e.notePath ? "selected" : ""}>${Q(t.title || t.path.split(/[\\/]/).pop())}</option>`).join("")}</select>` : ""}${n.file ? `<a class="open-original" href="${Q(io(n.file))}" target="_blank" rel="noopener noreferrer">单独打开${to("external")}</a>` : ""}${e.readerMode === "pdf" && n.file && !e.pdfBrowser ? "<div id=\"pdf-controls\" class=\"pdf-controls\" role=\"group\" aria-label=\"PDF翻页与缩放\"></div>" : ""}`, e.readerMode === "pdf" ? n.file ? e.pdfBrowser ? s("#reader-content").innerHTML = `<iframe class="pdf-frame" title="${Q(ao(n))} PDF原文" src="${Q(io(n.file))}"></iframe>` : ee(n, r) : s("#reader-content").innerHTML = "<div class=\"empty\"><p>该条目尚无可用原文文件。</p></div>" : i.length ? (e.notePath = i.some((t) => t.path === e.notePath) ? e.notePath : i[0].path, s("#reader-content").innerHTML = "<div class=\"loading\"><span class=\"busy-spinner\"></span>正在读取笔记…</div>", t(`/api/text?path=${encodeURIComponent(e.notePath)}`).then((t) => {
			r === e.noteEpoch && (s("#reader-content").innerHTML = `<article class="note-document markdown">${lo(t.text, e.notePath)}</article>`);
		}).catch((t) => {
			r === e.noteEpoch && (s("#reader-content").innerHTML = `<div class="empty"><p class="error-text">${Q(t.message)}</p><button id="retry-note" class="button subtle">重试</button></div>`);
		})) : s("#reader-content").innerHTML = "<div class=\"empty\"><h2>阅读笔记尚待积累</h2><p>可以向研究助手提问，整理阅读笔记。</p><button id=\"ask-note\" class=\"button subtle\">请助手帮我精读</button></div>";
	}
	return o.addEventListener("click", (t) => {
		let n = t.target.closest("button");
		if (n) {
			if (n.dataset.readerMode && (e.readerMode = n.dataset.readerMode), n.dataset.pdfStep && m(e.pdfPage + Number(n.dataset.pdfStep)), n.dataset.pdfZoom && h(Number(n.dataset.pdfZoom)), n.id === "pdf-fit" && h(100 - e.pdfZoom), n.id === "copy-pdf-page" && p(), ["retry-preview", "retry-note"].includes(n.id) && T(), n.dataset.pdfRetry && e.pdfSession) {
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
		t.persisted && l() && e.readerMode === "pdf" && T();
	}, { signal: u.signal }), {
		render: T,
		dispose: () => {
			++e.noteEpoch, d(), u.abort();
		}
	};
}
// app/web/frontend/components/ReaderPane.vue
var Jo = {
	__name: "ReaderPane",
	setup(e) {
		let t = Nn("workspace"), n = t.state, r = /* @__PURE__ */ qt(null), i;
		return er(() => {
			i = qo({
				state: n,
				scope: r.value,
				api: t.api,
				toast: t.toast,
				patchPaper: t.patchPaper,
				setPanel: t.setPanel,
				setDraft: t.setDraft
			}), i.render();
		}), In([
			() => t.currentPaper.value?.file,
			() => n.current,
			() => n.readerMode,
			() => n.notePath,
			() => n.pdfBrowser
		], () => i?.render(), { flush: "post" }), tr(() => i?.dispose()), (e, t) => (W(), G("section", {
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
};
// app/web/frontend/lib/api.js
async function Yo(e, t = {}) {
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
var Xo = [
	"streaming",
	"pending",
	"running",
	"in_progress",
	"inProgress",
	"queued"
], Zo = {
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
}, Qo = (e) => e === "pi" ? "Pi Agent" : "Codex", $o = (e) => [
	"queued",
	"pending",
	"running",
	"in_progress"
].includes(e.status);
function es({ api: e = Yo, EventSourceImpl: t = globalThis.EventSource, pollInterval: n = 8e3 } = {}) {
	let r = /* @__PURE__ */ Lt({
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
		provider: "pi",
		model: "",
		draft: "",
		focusComposer: 0,
		historyOpen: !1,
		loginInfo: null,
		loginPending: !1,
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
	}, o = a("zhiyue.agent");
	["pi", "codex"].includes(o) && (r.provider = o);
	let s = Z(() => r.papers.find((e) => e.literature_id === r.current)), c = Z(() => r.status.agents?.[r.provider] || (r.provider === "codex" ? r.status.codex : {}) || {}), l = Z(() => (c.value.models || []).map((e) => {
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
	}).filter((e) => e.id)), u = Z(() => r.chat?.messages?.some((e) => Xo.includes(e.status)) || !1), d = Z(() => r.sending || u.value), f = Z(() => !r.statusError && !d.value && !r.creating && !!(r.draft.trim() || r.attachments.length) && r.attachments.every((e) => e.status === "ready") && c.value.available === !0 && c.value.authenticated === !0 && r.eventsOpen), p, m = !1, h, g = 0, _ = 0, v = !1, y = /* @__PURE__ */ new Set();
	function b(e, t = !1) {
		let n = ++_;
		r.toasts.push({
			id: n,
			message: e,
			error: t
		});
		let i = setTimeout(() => {
			r.toasts = r.toasts.filter((e) => e.id !== n), y.delete(i);
		}, t ? 1e4 : 5e3);
		y.add(i);
	}
	function x(e) {
		r.panel = e;
	}
	function S(e) {
		r.draft = e, r.focusComposer++;
	}
	function C(e) {
		r.view = e, e === "downloads" && me();
	}
	function w(e) {
		r.current = e, r.readerMode = "pdf", r.notePath = "", r.pdfPage = 1, r.pdfTotal = null, r.pdfZoom = 100, r.pdfBrowser = !1, r.context.size < 6 || r.context.has(e) ? r.context.add(e) : b("最多附带 6 篇论文；请先移除不需要的上下文。", !0), window.matchMedia("(max-width:680px)").matches && x("reader");
	}
	function ee() {
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
	async function te(t, n) {
		if (r.pendingPatches.has(t)) return !1;
		r.pendingPatches.add(t);
		try {
			await e(`/api/papers/${ro(t)}`, no("PATCH", n));
			let i = r.papers.find((e) => e.literature_id === t);
			return i && Object.assign(i, n), !0;
		} catch (e) {
			return b(e.message, !0), !1;
		} finally {
			r.pendingPatches.delete(t);
		}
	}
	async function E() {
		try {
			r.status = await e("/api/status"), r.statusError = "", o || r.chat || r.status.agents?.[r.provider] || (r.provider = r.status.defaultProvider || "pi");
		} catch (e) {
			r.statusError = e.message;
		}
	}
	async function ne() {
		let t = r.provider;
		r.status.agents = {
			...r.status.agents,
			[t]: {
				...r.status.agents?.[t],
				loading: !0
			}
		};
		try {
			await e(`/api/agents/${t}/connect`, no("POST", {}));
		} catch (e) {
			b(e.message, !0);
		} finally {
			await E();
		}
	}
	async function re() {
		r.loginPending = !0;
		try {
			r.loginInfo = await e("/api/codex/login", no("POST", {}));
		} catch (e) {
			b(e.message, !0);
		} finally {
			r.loginPending = !1;
		}
	}
	async function ie() {
		try {
			r.chats = await e("/api/chats");
		} catch (e) {
			b(e.message, !0);
		}
	}
	function ae() {
		r.sending || (r.chatEpoch++, r.chat = null, i("zhiyue.chat", null), r.focusComposer++);
	}
	async function oe(e) {
		!d.value && ["pi", "codex"].includes(e) && (r.provider = e, r.model = "", r.loginInfo = null, i("zhiyue.agent", e), ae(), c.value.available !== !0 && await ne());
	}
	async function se(t) {
		if (r.sending) return;
		let n = ++r.chatEpoch;
		try {
			let a = await e(`/api/chats/${ro(t)}`);
			if (n !== r.chatEpoch || v) return;
			r.provider !== (a.provider || "codex") && (r.model = ""), r.chat = a, r.provider = a.provider || "codex", r.loginInfo = null, r.context = new Set(a.paperIds || []), i("zhiyue.chat", a.id), c.value.available !== !0 && ne();
		} catch (e) {
			b(e.message, !0);
		}
	}
	async function ce(t) {
		let n = r.chatEpoch, i = await e(`/api/chats/${ro(t)}`);
		if (n !== r.chatEpoch || r.chat?.id !== t || v) return;
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
	async function le() {
		if (!f.value) return !1;
		let t = r.draft.trim(), n = [...r.attachments], a = [...r.context];
		r.sending = !0;
		try {
			if (!r.chat) {
				r.creating = !0;
				try {
					let n = await e("/api/chats", no("POST", {
						provider: r.provider,
						paperIds: a,
						title: t.slice(0, 50) || ao(s.value || {})
					}));
					r.chat = {
						...n,
						messages: n.messages || []
					}, i("zhiyue.chat", n.id), r.chats.unshift(n);
				} finally {
					r.creating = !1;
				}
			}
			let o = r.chat.id, c = {
				text: t,
				paperIds: a,
				attachmentIds: n.map((e) => e.id)
			};
			r.model && (c.model = r.model), await e(`/api/chats/${ro(o)}/messages`, no("POST", c)), r.draft.trim() === t && (r.draft = "");
			let l = new Set(n.map((e) => e.key));
			r.attachments = r.attachments.filter((e) => !l.has(e.key));
			try {
				await ce(o);
			} catch {
				b("消息已提交；正在等待会话同步，请勿重复发送。", !0);
			}
			return ie(), !0;
		} catch (e) {
			return b(`消息未能确认提交：${e.message}。请检查会话后重试。`, !0), !1;
		} finally {
			r.sending = !1;
		}
	}
	async function ue() {
		if (r.chat) try {
			let t = r.chat.id;
			await e(`/api/chats/${ro(t)}/interrupt`, no("POST", {})), await ce(t);
		} catch (e) {
			b(e.message, !0);
		}
	}
	async function de(t) {
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
			t.status = "error", t.error = e.message, b(`上传 ${t.name} 失败：${e.message}`, !0);
		}
	}
	async function fe(e) {
		for (let t of e) {
			if (r.attachments.length >= 8) {
				b("每次最多附加 8 个文件。", !0);
				break;
			}
			if (t.size > 26214400) {
				b(`${t.name} 超过 25 MB 上传限制。`, !0);
				continue;
			}
			let e = /* @__PURE__ */ Lt({
				key: String(++g),
				name: t.name,
				file: Gt(t),
				status: "uploading"
			});
			r.attachments.push(e), await de(e);
		}
	}
	async function pe(t, n, i = {}) {
		let a = r.approvals.get(t);
		if (a && !a.submitting) {
			a.submitting = !0;
			try {
				let o = { decision: n };
				n === "accept" && a.params?.questions?.length && (o.answers = i), await e(`/api/approvals/${ro(t)}`, no("POST", o)), r.resolvedApprovals.add(t), r.approvals.delete(t);
			} catch (e) {
				a.submitting = !1, b(e.message, !0);
			}
		}
	}
	async function me() {
		try {
			let t = await e("/api/downloads");
			for (let e of t.jobs || []) r.jobs.set(e.id, e);
			r.batches = t.batches || [], r.downloadsError = "";
		} catch (e) {
			r.downloadsError = e.message;
		}
	}
	async function he(t) {
		try {
			let n = await e("/api/downloads", no("POST", t));
			return r.jobs.set(n.id, n), b("下载任务已创建"), !0;
		} catch (e) {
			return b(e.message, !0), !1;
		}
	}
	async function ge(t, n) {
		try {
			let i = await e("/api/downloads/action", no("POST", {
				batch: t,
				action: n,
				...n === "ieee" ? { submit: !0 } : {}
			}));
			return r.jobs.set(i.id, i), b("批次操作已提交"), !0;
		} catch (e) {
			return b(e.message, !0), !1;
		}
	}
	async function D() {
		r.refreshing = !0;
		try {
			let t = await e("/api/catalog/refresh", no("POST", {}));
			r.jobs.set(t.id, t), b("索引刷新任务已提交，可在任务中心查看");
		} catch (e) {
			b(e.message, !0);
		} finally {
			r.refreshing = !1;
		}
	}
	function _e(e) {
		let t = r.chat.messages ||= [], n = t.findIndex((t) => t.id === e.id);
		n < 0 ? t.push(e) : Object.assign(t[n], e);
	}
	function ve(e) {
		if (!v) {
			if (e.type === "connected" && Array.isArray(e.approvals)) {
				r.approvals.clear();
				for (let t of e.approvals) r.resolvedApprovals.has(t.id) || r.approvals.set(t.id, t);
			}
			if (e.type === "approvalResolved" && (r.approvals.delete(e.id), r.resolvedApprovals.add(e.id)), e.type === "message" && e.chatId === r.chat?.id && e.message?.id && _e(e.message), e.type === "delta" && e.chatId === r.chat?.id) {
				let t = r.chat.messages?.find((t) => t.id === e.messageId);
				t ||= (_e({
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
					},
					codex: {
						...r.status.codex,
						...t.codex
					}
				}, c.value.authenticated === !0 && (r.loginInfo = null);
			}
			if (e.type === "job" && e.job?.id) {
				let t = r.jobs.get(e.job.id);
				r.jobs.set(e.job.id, {
					...t,
					...e.job
				}), t && $o(t) && !$o(e.job) && (b(`任务${Zo[e.job.status] || e.job.status}：${e.job.title || e.job.id}`, ["error", "failed"].includes(e.job.status)), T(), r.view === "downloads" && me());
			}
		}
	}
	async function ye() {
		if (!(document.hidden || m || v)) {
			m = !0;
			try {
				let t = [E()];
				r.chat && (!r.eventsOpen || d.value) && t.push(ce(r.chat.id));
				for (let n of r.jobs.values()) $o(n) && t.push(e(`/api/jobs/${ro(n.id)}`).then((e) => {
					r.jobs.set(e.id, e), $o(e) || (T(), r.view === "downloads" && me());
				}));
				await Promise.allSettled(t);
			} finally {
				m = !1;
			}
		}
	}
	async function be() {
		if (t && (p = new t("/api/events"), p.onopen = () => {
			r.eventsOpen = !0, E(), r.chat && ce(r.chat.id).catch(() => {});
		}, p.onerror = () => {
			r.eventsOpen = !1;
		}, p.onmessage = (e) => {
			let t;
			try {
				t = JSON.parse(e.data);
			} catch {
				return;
			}
			ve(t);
		}), await Promise.allSettled([
			T(),
			E(),
			ie(),
			me()
		]), v) return;
		let e = a("zhiyue.chat");
		e && r.chats.some((t) => t.id === e && (t.provider || "codex") === r.provider) && await se(e), r.provider !== r.status.defaultProvider && c.value.available !== !0 && await ne(), n && (h = setInterval(ye, n));
	}
	function xe() {
		v = !0, p?.close(), clearInterval(h);
		for (let e of y) clearTimeout(e);
	}
	return {
		state: r,
		api: e,
		currentPaper: s,
		agent: c,
		models: l,
		busy: d,
		generating: u,
		canSend: f,
		toast: b,
		setView: C,
		setPanel: x,
		setDraft: S,
		selectPaper: w,
		resetFilters: ee,
		loadLibrary: T,
		patchPaper: te,
		loadStatus: E,
		reconnectAgent: ne,
		login: re,
		loadChats: ie,
		openChat: se,
		syncChat: ce,
		newChat: ae,
		switchProvider: oe,
		sendMessage: le,
		interrupt: ue,
		uploadFiles: fe,
		uploadOne: de,
		decideApproval: pe,
		loadDownloads: me,
		createDownload: he,
		batchAction: ge,
		refreshCatalog: D,
		receive: ve,
		start: be,
		stop: xe
	};
}
// app/web/frontend/components/ModelPicker.vue
var ts = [
	"disabled",
	"aria-label",
	"aria-expanded",
	"title"
], ns = { id: "model-name" }, rs = { class: "model-search" }, is = [
	"data-model-value",
	"aria-selected",
	"title",
	"onClick"
], as = {
	key: 0,
	class: "model-empty"
}, os = {
	__name: "ModelPicker",
	setup(e) {
		let t = Nn("workspace"), n = t.state, r = /* @__PURE__ */ qt(!1), i = /* @__PURE__ */ qt(""), a = /* @__PURE__ */ qt(null), o = /* @__PURE__ */ qt(null), s = /* @__PURE__ */ qt(null), c = Z(() => [{
			id: "",
			label: "默认模型"
		}, ...t.models.value]), l = Z(() => c.value.filter((e) => `${e.label} ${e.id}`.toLocaleLowerCase().includes(i.value.trim().toLocaleLowerCase()))), u = Z(() => c.value.find((e) => e.id === n.model) || c.value[0]), d = Z(() => t.busy.value || n.creating || t.agent.value.available !== !0 || !t.models.value.length);
		In(c, () => {
			c.value.some((e) => e.id === n.model) || (n.model = "");
		}), In(d, (e) => {
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
		return er(() => {
			document.addEventListener("pointerdown", g), document.addEventListener("focusin", g);
		}), tr(() => {
			document.removeEventListener("pointerdown", g), document.removeEventListener("focusin", g);
		}), (e, t) => (W(), G(H, null, [K("button", {
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
		}, [K("span", ns, k(u.value.label.replace(/ · 默认$/, "").split(" · ")[0]), 1), q($, { name: "chevron" })], 8, ts), r.value ? (W(), G("div", {
			key: 0,
			id: "model-menu",
			class: "model-menu",
			onKeydown: h
		}, [K("div", rs, [q($, { name: "search" }), z(K("input", {
			id: "model-search",
			ref_key: "search",
			ref: o,
			"onUpdate:modelValue": t[0] ||= (e) => i.value = e,
			type: "search",
			placeholder: "搜索模型",
			"aria-label": "搜索模型",
			"aria-controls": "model-list",
			autocomplete: "off"
		}, null, 512), [[Pa, i.value]])]), K("div", {
			id: "model-list",
			ref_key: "list",
			ref: s,
			class: "model-list",
			role: "listbox",
			"aria-label": "模型"
		}, [(W(!0), G(H, null, B(l.value, (e) => (W(), G("button", {
			key: e.id,
			type: "button",
			role: "option",
			tabindex: "-1",
			class: "model-option",
			"data-model-value": e.id,
			"aria-selected": e.id === I(n).model,
			title: e.id || e.label,
			onClick: (t) => m(e.id)
		}, [K("span", null, k(e.label.replace(/ · 默认$/, "")), 1), e.id === I(n).model ? (W(), si($, {
			key: 0,
			name: "check"
		})) : Y("", !0)], 8, is))), 128)), l.value.length ? Y("", !0) : (W(), G("div", as, "未找到模型"))], 512)], 32)) : Y("", !0)], 64));
	}
}, ss = {
	id: "attachments",
	class: "attachments"
}, cs = ["src", "alt"], ls = ["title"], us = ["onClick"], ds = ["aria-label", "onClick"], fs = { class: "composer-toolbar" }, ps = { class: "composer-tools" }, ms = {
	class: "icon-button upload-button",
	title: "添加附件"
}, hs = ["disabled"], gs = ["disabled"], _s = {
	__name: "Composer",
	setup(e) {
		let t = Nn("workspace"), n = t.state, { canSend: r, generating: i } = t, a = /* @__PURE__ */ qt(null), o = /* @__PURE__ */ qt(null), s = /* @__PURE__ */ qt(!1);
		function c() {
			a.value && (a.value.style.height = "0px", a.value.style.height = `${Math.min(200, Math.max(58, a.value.scrollHeight))}px`, a.value.style.overflowY = a.value.scrollHeight > 200 ? "auto" : "hidden");
		}
		In(() => n.draft, c, { flush: "post" }), In(() => n.focusComposer, async () => {
			await _n(), a.value?.focus();
		}), er(c);
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
			onSubmit: c[1] ||= Wa((...e) => I(t).sendMessage && I(t).sendMessage(...e), ["prevent"]),
			onDragover: c[2] ||= Wa(() => {}, ["prevent"]),
			onDrop: c[3] ||= Wa((e) => I(t).uploadFiles([...e.dataTransfer?.files || []]), ["prevent"])
		}, [
			K("div", ss, [(W(!0), G(H, null, B(I(n).attachments, (e) => (W(), G("div", {
				key: e.key,
				class: D(["attachment", { error: e.status === "error" }])
			}, [
				e.id && e.mime?.startsWith("image/") ? (W(), G("img", {
					key: 0,
					src: `/api/uploads/${I(ro)(e.id)}`,
					alt: e.name
				}, null, 8, cs)) : (W(), si($, {
					key: 1,
					name: "attach"
				})),
				K("span", {
					class: "attachment-name",
					title: e.error || e.name
				}, k(e.name) + " " + k(e.status === "uploading" ? " · 上传中" : e.status === "error" ? " · 失败" : ""), 9, ls),
				e.status === "error" ? (W(), G("button", {
					key: 2,
					type: "button",
					onClick: (n) => I(t).uploadOne(e)
				}, "重试", 8, us)) : Y("", !0),
				K("button", {
					type: "button",
					"aria-label": `移除附件 ${e.name}`,
					onClick: (t) => f(e.key)
				}, "×", 8, ds)
			], 2))), 128))]),
			c[4] ||= K("label", {
				class: "sr-only",
				for: "chat-input"
			}, "向研究助手提问", -1),
			z(K("textarea", {
				id: "chat-input",
				ref_key: "input",
				ref: a,
				"onUpdate:modelValue": c[0] ||= (e) => I(n).draft = e,
				rows: "2",
				placeholder: "输入问题…",
				onKeydown: l,
				onPaste: u
			}, null, 544), [[Pa, I(n).draft]]),
			K("div", fs, [K("div", ps, [K("label", ms, [q($, { name: "plus" }), K("input", {
				id: "file-input",
				type: "file",
				multiple: "",
				"aria-label": "添加图片或文件",
				onChange: d
			}, null, 32)]), q(os)]), I(i) ? (W(), G("button", {
				key: 0,
				id: "interrupt",
				type: "button",
				class: "send-button stop-button",
				title: "停止生成",
				"aria-label": "停止生成",
				disabled: s.value,
				onClick: p
			}, [q($, { name: "stop" })], 8, hs)) : (W(), G("button", {
				key: 1,
				id: "send",
				type: "submit",
				class: "send-button",
				title: "发送",
				"aria-label": "发送消息",
				disabled: !I(r)
			}, [q($, { name: "arrow" })], 8, gs))])
		], 544));
	}
}, vs = ["data-message"], ys = { class: "message-label sr-only" }, bs = {
	key: 0,
	class: "message-body"
}, xs = ["innerHTML"], Ss = {
	key: 2,
	class: "message-attachments"
}, Cs = ["href"], ws = ["src", "alt"], Ts = {
	key: 3,
	class: "message-status",
	role: "status",
	"aria-label": "正在生成"
}, Es = {
	key: 4,
	class: "message-status"
}, Ds = {
	__name: "ChatMessage",
	props: {
		message: {
			type: Object,
			required: !0
		},
		provider: {
			type: String,
			default: "pi"
		}
	},
	setup(e) {
		let t = e, n = Z(() => [
			"user",
			"assistant",
			"tool",
			"system"
		].includes(t.message.role) ? t.message.role : "assistant"), r = Z(() => ({
			user: "你",
			assistant: Qo(t.provider),
			tool: "工具",
			system: "系统"
		})[n.value]), i = Z(() => Xo.includes(t.message.status)), a = Z(() => ["error", "failed"].includes(t.message.status)), o = Z(() => lo(t.message.text)), s = Z(() => t.message.error?.message || t.message.error), c = Z(() => ["interrupted", "cancelled"].includes(t.message.status)), l = Z(() => (t.message.attachments || t.message.attachmentIds || []).map((e) => typeof e == "string" ? { id: e } : e).filter((e) => e.id));
		return (t, u) => (W(), G("article", {
			class: D(["message", [n.value, {
				streaming: i.value,
				error: a.value
			}]]),
			"data-message": e.message.id
		}, [
			K("div", ys, k(r.value), 1),
			n.value === "user" ? (W(), G("div", bs, k(e.message.text), 1)) : (W(), G("div", {
				key: 1,
				class: "message-body markdown",
				innerHTML: o.value
			}, null, 8, xs)),
			l.value.length ? (W(), G("div", Ss, [(W(!0), G(H, null, B(l.value, (e) => (W(), G("a", {
				key: e.id,
				href: `/api/uploads/${I(ro)(e.id)}`,
				target: "_blank",
				rel: "noopener noreferrer"
			}, [(e.mime || e.mimeType || "").startsWith("image/") ? (W(), G("img", {
				key: 0,
				src: `/api/uploads/${I(ro)(e.id)}`,
				alt: e.name || "上传的图片",
				loading: "lazy"
			}, null, 8, ws)) : (W(), G(H, { key: 1 }, [J(k(e.name || "附件"), 1)], 64))], 8, Cs))), 128))])) : Y("", !0),
			i.value && !s.value ? (W(), G("div", Ts, [...u[0] ||= [K("span", {
				class: "typing-indicator",
				"aria-hidden": "true"
			}, [
				K("i"),
				K("i"),
				K("i")
			], -1)]])) : s.value || a.value || c.value ? (W(), G("div", Es, k(s.value || (a.value ? "生成失败" : "已停止")), 1)) : Y("", !0)
		], 10, vs));
	}
}, Os = ["data-approval"], ks = { class: "approval-question" }, As = [
	"onUpdate:modelValue",
	"data-answer",
	"aria-label"
], js = {
	key: 0,
	class: "question-options"
}, Ms = ["title", "onClick"], Ns = { key: 1 }, Ps = { class: "approval-actions" }, Fs = ["disabled"], Is = ["disabled"], Ls = {
	__name: "ApprovalCard",
	props: { approval: {
		type: Object,
		required: !0
	} },
	setup(e) {
		let t = e, n = Nn("workspace"), r = /* @__PURE__ */ Lt({}), i = Z(() => (t.approval.params?.questions || []).map((e, t) => ({
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
			onSubmit: Wa(o, ["prevent"])
		}, [
			K("h4", null, k(i.value.length ? "需要你的回答" : "等待你的审批"), 1),
			i.value.length ? (W(!0), G(H, { key: 0 }, B(i.value, (e) => (W(), G("div", { key: e.id }, [K("label", ks, [K("strong", null, k(e.text), 1), z(K("textarea", {
				"onUpdate:modelValue": (t) => r[e.id] = t,
				"data-answer": e.id,
				rows: "2",
				required: "",
				"aria-label": e.text,
				placeholder: "输入你的回答…"
			}, null, 8, As), [[Pa, r[e.id]]])]), e.options?.length ? (W(), G("div", js, [(W(!0), G(H, null, B(e.options, (t, n) => (W(), G("button", {
				key: n,
				type: "button",
				class: "button subtle",
				title: t.description || "",
				onClick: (n) => r[e.id] = a(t)
			}, k(a(t)), 9, Ms))), 128))])) : Y("", !0)]))), 128)) : (W(), G("pre", Ns, k(JSON.stringify(e.approval.params || {}, null, 2)), 1)),
			K("div", Ps, [K("button", {
				class: "button primary",
				type: "submit",
				disabled: e.approval.submitting
			}, k(i.value.length ? "提交回答" : "允许本次"), 9, Fs), K("button", {
				class: "button subtle",
				type: "button",
				disabled: e.approval.submitting,
				onClick: s[0] ||= (t) => I(n).decideApproval(e.approval.id, "decline")
			}, " 拒绝 ", 8, Is)])
		], 40, Os));
	}
}, Rs = {
	id: "assistant-panel",
	class: "chat-panel",
	"aria-label": "文献研究助手"
}, zs = { class: "chat-header" }, Bs = { class: "assistant-title" }, Vs = { class: "agent-picker" }, Hs = ["value", "disabled"], Us = [
	"aria-label",
	"title",
	"data-state"
], Ws = { class: "chat-actions" }, Gs = ["aria-expanded"], Ks = ["disabled"], qs = {
	key: 0,
	id: "chat-history",
	class: "chat-history"
}, Js = ["data-chat", "onClick"], Ys = {
	key: 0,
	class: "empty"
}, Xs = {
	key: 1,
	id: "auth-banner",
	class: "auth-banner"
}, Zs = { key: 0 }, Qs = ["href"], $s = ["disabled"], ec = {
	key: 2,
	class: "chat-context"
}, tc = { id: "context-papers" }, nc = [
	"data-context-remove",
	"title",
	"aria-label",
	"onClick"
], rc = {
	key: 0,
	class: "chat-empty"
}, ic = { class: "presets" }, ac = ["data-prompt", "onClick"], oc = {
	id: "approvals",
	class: "approvals",
	"aria-live": "polite"
}, sc = {
	__name: "AssistantPane",
	setup(e) {
		let t = Nn("workspace"), n = t.state, { agent: r, busy: i } = t, a = /* @__PURE__ */ qt(null), o = Z(() => r.value.loading === !0 || r.value.available == null || r.value.authenticated == null || r.value.available === "loading"), s = Z(() => r.value.available === !0 && r.value.authenticated === !0), c = Z(() => n.statusError || r.value.available === !1 ? "error" : o.value || !n.eventsOpen || !s.value ? "loading" : "connected"), l = Z(() => n.statusError || r.value.error || (s.value && n.eventsOpen ? "已连接" : o.value ? "正在连接" : "等待配置")), u = Z(() => n.statusError || !o.value && !s.value), d = Z(() => {
			let e = n.loginInfo?.authUrl || n.loginInfo?.verificationUri;
			return /^https?:\/\//i.test(e || "") ? so(e) : "";
		}), f = Z(() => [...n.approvals.values()].filter((e) => e.chatId === n.chat?.id && !n.resolvedApprovals.has(e.id))), p = [
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
		], m = (e) => ao(n.papers.find((t) => t.literature_id === e) || { literature_id: e });
		In(() => {
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
			let n = a.value, r = !n || n.scrollHeight - n.scrollTop - n.clientHeight < 100;
			await _n(), a.value && (e[0] !== t?.[0] || r) && (a.value.scrollTop = a.value.scrollHeight);
		});
		function h() {
			n.historyOpen = !n.historyOpen, n.historyOpen && t.loadChats();
		}
		return (e, o) => (W(), G("aside", Rs, [
			q(go, { kind: "assistant" }),
			K("div", zs, [K("div", Bs, [K("div", Vs, [K("select", {
				id: "agent-select",
				value: I(n).provider,
				"aria-label": "选择研究助手",
				disabled: I(i) || I(n).creating,
				onChange: o[0] ||= (e) => I(t).switchProvider(e.target.value)
			}, [...o[6] ||= [K("option", { value: "pi" }, "Pi Agent", -1), K("option", { value: "codex" }, "Codex", -1)]], 40, Hs), K("span", null, [q($, { name: "chevron" })])]), K("span", {
				id: "connection-status",
				class: "connection-indicator",
				role: "status",
				"aria-label": l.value,
				title: l.value,
				"data-state": c.value
			}, null, 8, Us)]), K("div", Ws, [K("button", {
				id: "chat-history-toggle",
				class: "icon-button",
				title: "会话列表",
				"aria-label": "会话列表",
				"aria-expanded": I(n).historyOpen,
				onClick: h
			}, [q($, { name: "history" })], 8, Gs), K("button", {
				id: "new-chat",
				class: "icon-button",
				title: "新建会话",
				"aria-label": "新建会话",
				disabled: I(n).creating || I(n).sending,
				onClick: o[1] ||= (...e) => I(t).newChat && I(t).newChat(...e)
			}, [q($, { name: "plus" })], 8, Ks)])]),
			I(n).historyOpen ? (W(), G("div", qs, [(W(!0), G(H, null, B(I(n).chats, (e) => (W(), G("button", {
				key: e.id,
				class: D(["history-item", { active: I(n).chat?.id === e.id }]),
				"data-chat": e.id,
				onClick: (n) => I(t).openChat(e.id)
			}, [J(k(e.title || "新会话") + " ", 1), K("small", null, k(I(Qo)(e.provider || "codex")) + " · " + k(new Date(e.createdAt).toLocaleString("zh-CN")) + " " + k((e.paperIds || []).join(" · ")), 1)], 10, Js))), 128)), I(n).chats.length ? Y("", !0) : (W(), G("div", Ys, "暂无会话"))])) : Y("", !0),
			u.value ? (W(), G("div", Xs, [I(n).loginInfo && !s.value ? (W(), G(H, { key: 0 }, [
				J(k(I(n).loginInfo.message || "请在认证页面完成登录") + " ", 1),
				I(n).loginInfo.userCode ? (W(), G("strong", Zs, k(I(n).loginInfo.userCode), 1)) : Y("", !0),
				d.value ? (W(), G("a", {
					key: 1,
					href: d.value,
					target: "_blank",
					rel: "noopener noreferrer"
				}, "打开认证页面", 8, Qs)) : Y("", !0),
				K("button", { onClick: o[2] ||= (...e) => I(t).reconnectAgent && I(t).reconnectAgent(...e) }, "重新检测")
			], 64)) : (W(), G(H, { key: 1 }, [J(k(I(n).statusError || I(r).error || (I(n).provider === "pi" ? "请在终端运行 pi 配置模型或登录。" : "请登录 Codex。")) + " ", 1), I(n).provider === "codex" && !I(n).statusError && I(r).available && !s.value ? (W(), G("button", {
				key: 0,
				id: "codex-login",
				disabled: I(n).loginPending,
				onClick: o[3] ||= (...e) => I(t).login && I(t).login(...e)
			}, " 登录 Codex ", 8, $s)) : (W(), G("button", {
				key: 1,
				id: "retry-status",
				onClick: o[4] ||= (...e) => I(t).reconnectAgent && I(t).reconnectAgent(...e)
			}, "重新检测"))], 64))])) : Y("", !0),
			I(n).context.size ? (W(), G("div", ec, [K("div", tc, [(W(!0), G(H, null, B(I(n).context, (e) => (W(), G("button", {
				key: e,
				class: "context-chip",
				"data-context-remove": e,
				title: m(e),
				"aria-label": `移除 ${e}`,
				onClick: (t) => I(n).context.delete(e)
			}, [J(k(e), 1), q($, { name: "close" })], 8, nc))), 128))]), K("button", {
				id: "clear-context",
				class: "icon-button",
				title: "清空论文上下文",
				"aria-label": "清空论文上下文",
				onClick: o[5] ||= (e) => I(n).context.clear()
			}, [q($, { name: "close" })])])) : Y("", !0),
			K("div", {
				id: "messages",
				ref_key: "messages",
				ref: a,
				class: "messages",
				role: "log",
				"aria-label": "对话消息",
				"aria-live": "off"
			}, [(W(!0), G(H, null, B(I(n).chat?.messages || [], (e) => (W(), si(Ds, {
				key: e.id,
				message: e,
				provider: I(n).chat?.provider || I(n).provider
			}, null, 8, ["message", "provider"]))), 128)), I(n).chat?.messages?.length ? Y("", !0) : (W(), G("div", rc, [o[7] ||= K("h2", null, "从一个问题开始", -1), K("div", ic, [(W(), G(H, null, B(p, ([e, n, r]) => K("button", {
				key: n,
				class: "preset",
				"data-prompt": r,
				onClick: (e) => I(t).setDraft(r)
			}, [q($, { name: e }, null, 8, ["name"]), J(k(n), 1)], 8, ac)), 64))])]))], 512),
			K("div", oc, [(W(!0), G(H, null, B(f.value, (e) => (W(), si(Ls, {
				key: e.id,
				approval: e
			}, null, 8, ["approval"]))), 128))]),
			q(_s)
		]));
	}
}, cc = {
	id: "downloads-view",
	class: "downloads-view"
}, lc = { class: "download-columns" }, uc = { class: "surface-heading" }, dc = ["value"], fc = { class: "download-options" }, pc = { class: "check-label" }, mc = ["disabled"], hc = { class: "download-results" }, gc = { class: "section-heading" }, _c = { id: "download-jobs" }, vc = {
	key: 0,
	class: "surface empty"
}, yc = { class: "job-heading" }, bc = {
	key: 0,
	class: "error-text"
}, xc = {
	key: 1,
	class: "job-counts"
}, Sc = ["data-job-details"], Cc = { class: "job-log" }, wc = {
	key: 2,
	class: "surface empty"
}, Tc = { class: "empty-art" }, Ec = { id: "download-batches" }, Dc = {
	key: 0,
	class: "section-heading"
}, Oc = { class: "job-heading" }, kc = { class: "status-badge" }, Ac = { class: "batch-actions" }, jc = ["disabled", "onClick"], Mc = "papers/09_情感综述调研/网站导入", Nc = {
	__name: "DownloadPanel",
	setup(e) {
		let t = Nn("workspace"), n = t.state, r = /* @__PURE__ */ Lt({
			title: "",
			input: "",
			category: Mc,
			channel: "public",
			autoArchive: !1
		}), i = /* @__PURE__ */ qt(!1), a = /* @__PURE__ */ Lt(/* @__PURE__ */ new Set()), o = Z(() => {
			let e = /* @__PURE__ */ new Map([[Mc, "情感综述调研 / 网站导入（默认）"]]);
			for (let t of n.categories) {
				let n = typeof t == "string" ? t : t.id || t.name;
				if (!n) continue;
				let r = String(n).replace(/\\/g, "/").replace(/^papers\//, "").split("/")[0], i = `papers/${r}/网站导入`;
				e.has(i) || e.set(i, `${String(typeof t == "string" ? t : t.name || r).replace(/^\d+_/, "")} / 网站导入`);
			}
			return [...e];
		}), s = Z(() => [...n.jobs.values()].reverse()), c = (e) => Object.entries(e || {}).map(([e, t]) => `${Zo[e] || e} ${t}`).join(" · "), l = (e) => typeof e == "string" ? e : JSON.stringify(e), u = (e) => Array.isArray(e) ? e.map((e) => typeof e == "string" ? e : JSON.stringify(e)).join("\n") : e || "暂无日志", d = [
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
		return (e, m) => (W(), G("section", cc, [m[21] ||= K("div", { class: "download-intro" }, [K("h2", null, "添加论文"), K("p", null, "输入 DOI 或题名，查看下载、核验与归档进度。")], -1), K("div", lc, [K("form", {
			id: "download-form",
			class: "surface download-form",
			onSubmit: Wa(f, ["prevent"])
		}, [
			K("div", uc, [q($, { name: "download" }), m[7] ||= K("h3", null, "新建下载任务", -1)]),
			m[12] ||= K("label", { for: "download-title" }, [J("任务名称 "), K("span", { class: "muted" }, "可选")], -1),
			z(K("input", {
				id: "download-title",
				"onUpdate:modelValue": m[0] ||= (e) => r.title = e,
				placeholder: "例如：语音情感识别 · 经典文献"
			}, null, 512), [[Pa, r.title]]),
			m[13] ||= K("label", { for: "download-input" }, "论文信息", -1),
			z(K("textarea", {
				id: "download-input",
				"onUpdate:modelValue": m[1] ||= (e) => r.input = e,
				rows: "7",
				required: "",
				placeholder: "粘贴 DOI、论文题名或 JSON 清单\n每行一项"
			}, null, 512), [[Pa, r.input]]),
			m[14] ||= K("label", { for: "download-category" }, "归档分类", -1),
			z(K("select", {
				id: "download-category",
				"onUpdate:modelValue": m[2] ||= (e) => r.category = e
			}, [(W(!0), G(H, null, B(o.value, ([e, t]) => (W(), G("option", {
				key: e,
				value: e
			}, k(t), 9, dc))), 128))], 512), [[La, r.category]]),
			K("div", fc, [K("label", null, [m[9] ||= J("获取渠道", -1), z(K("select", {
				id: "download-channel",
				"onUpdate:modelValue": m[3] ||= (e) => r.channel = e
			}, [...m[8] ||= [
				K("option", { value: "public" }, "公开来源", -1),
				K("option", { value: "auto" }, "自动选择", -1),
				K("option", { value: "ieee" }, "IEEE / 机构渠道", -1)
			]], 512), [[La, r.channel]])]), K("label", pc, [z(K("input", {
				id: "auto-archive",
				"onUpdate:modelValue": m[4] ||= (e) => r.autoArchive = e,
				type: "checkbox"
			}, null, 512), [[Fa, r.autoArchive]]), m[10] ||= J("核验后自动归档", -1)])]),
			K("button", {
				id: "start-download",
				type: "submit",
				class: "button primary",
				disabled: i.value
			}, [q($, { name: "plus" }), m[11] ||= J("创建下载任务 ", -1)], 8, mc),
			m[15] ||= K("p", { class: "muted form-note" }, "机构认证与需要确认的操作，由后端工具返回状态。", -1)
		], 32), K("div", hc, [
			K("div", gc, [m[17] ||= K("h3", null, "任务与批次", -1), K("button", {
				id: "refresh-downloads",
				class: "button subtle",
				onClick: m[5] ||= (...e) => I(t).loadDownloads && I(t).loadDownloads(...e)
			}, [q($, { name: "refresh" }), m[16] ||= J("刷新 ", -1)])]),
			K("div", _c, [I(n).downloadsError ? (W(), G("div", vc, [K("p", null, k(I(n).downloadsError), 1), K("button", {
				class: "button subtle",
				onClick: m[6] ||= (...e) => I(t).loadDownloads && I(t).loadDownloads(...e)
			}, "重试")])) : (W(!0), G(H, { key: 1 }, B(s.value, (e) => (W(), G("article", {
				key: e.id,
				class: "job-card"
			}, [
				K("div", yc, [K("h4", null, k(e.title || e.batch || e.id), 1), K("span", { class: D(["status-badge", { failed: ["error", "failed"].includes(e.status) }]) }, k(I(Zo)[e.status] || e.status || "状态待确认"), 3)]),
				e.error ? (W(), G("p", bc, k(l(e.error)), 1)) : Y("", !0),
				K("p", null, k(e.message || e.action || ""), 1),
				e.result?.counts ? (W(), G("p", xc, " 批次结果：" + k(c(e.result.counts) || "暂无计数"), 1)) : Y("", !0),
				K("details", { "data-job-details": e.id }, [m[18] ||= K("summary", null, "查看任务日志", -1), K("pre", Cc, k(u(e.log)), 1)], 8, Sc)
			]))), 128)), !I(n).downloadsError && !s.value.length ? (W(), G("div", wc, [K("span", Tc, [q($, { name: "download" })]), m[19] ||= K("p", null, "暂无下载任务", -1)])) : Y("", !0)]),
			K("div", Ec, [I(n).batches.length ? (W(), G("div", Dc, [...m[20] ||= [K("h3", null, "已有下载批次", -1)]])) : Y("", !0), (W(!0), G(H, null, B(I(n).batches, (e) => (W(), G("article", {
				key: e.batch,
				class: "batch-card"
			}, [
				K("div", Oc, [K("h4", null, k(e.batch), 1), K("span", kc, k(Array.isArray(e.entries) ? e.entries.length : e.entries ?? "—") + " 条", 1)]),
				K("p", null, k(c(e.counts)), 1),
				K("div", Ac, [(W(), G(H, null, B(d, ([t, n]) => K("button", {
					key: t,
					class: "button subtle",
					disabled: a.has(`${e.batch}:${t}`),
					onClick: (n) => p(e.batch, t)
				}, k(n), 9, jc)), 64))])
			]))), 128))])
		])])]));
	}
}, Pc = {
	class: "shell",
	"data-framework": "vue"
}, Fc = { class: "main" }, Ic = { class: "topbar" }, Lc = { id: "page-title" }, Rc = { class: "top-actions" }, zc = {
	id: "library-summary",
	class: "muted"
}, Bc = ["disabled"], Vc = {
	class: "mobile-tabs",
	"aria-label": "工作面板"
}, Hc = ["data-panel", "onClick"], Uc = ["data-panel"], Wc = {
	id: "toast-region",
	class: "toast-region",
	role: "status",
	"aria-live": "polite"
}, Gc = {
	__name: "Workspace",
	props: { workspace: {
		type: Object,
		required: !0
	} },
	setup(e) {
		let t = e;
		Mn("workspace", t.workspace);
		let n = t.workspace, r = n.state, i = Z(() => r.papers.filter((e) => e.notes?.length).length), a, o;
		return er(() => {
			a = $a(document), o = new window.AbortController(), document.addEventListener("keydown", (e) => {
				e.key !== "/" || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable || (e.preventDefault(), n.setView("library"), n.setPanel("list"), document.querySelector("#search")?.focus());
			}, { signal: o.signal });
		}), tr(() => {
			a?.(), o?.abort(), n.stop();
		}), (e, t) => (W(), G(H, null, [K("div", Pc, [q(Eo), K("main", Fc, [
			K("header", Ic, [K("h1", Lc, k(I(r).view === "library" ? "文献" : "下载任务"), 1), K("div", Rc, [K("span", zc, k(I(r).papers.length) + " 篇文献 · " + k(i.value) + " 篇有笔记", 1), K("button", {
				id: "refresh-catalog",
				class: "button subtle",
				title: "重新扫描目录并更新索引",
				disabled: I(r).refreshing,
				onClick: t[0] ||= (...e) => I(n).refreshCatalog && I(n).refreshCatalog(...e)
			}, [q($, { name: "refresh" }), t[1] ||= K("span", null, "刷新索引", -1)], 8, Bc)])]),
			z(K("div", Vc, [(W(), G(H, null, B([
				["list", "文献"],
				["reader", "阅读"],
				["chat", "研究助手"]
			], ([e, t]) => K("button", {
				key: e,
				class: D({ active: I(r).panel === e }),
				"data-panel": e,
				onClick: (t) => I(n).setPanel(e)
			}, k(t), 11, Hc)), 64))], 512), [[$i, I(r).view === "library"]]),
			z(K("section", {
				id: "library-view",
				class: "library-layout",
				"data-panel": I(r).panel
			}, [
				q(Ko),
				q(Jo),
				q(sc)
			], 8, Uc), [[$i, I(r).view === "library"]]),
			z(q(Nc, null, null, 512), [[$i, I(r).view === "downloads"]])
		])]), K("div", Wc, [(W(!0), G(H, null, B(I(r).toasts, (e) => (W(), G("div", {
			key: e.id,
			class: D(["toast", { error: e.error }])
		}, k(e.message), 3))), 128))])], 64));
	}
};
// app/web/frontend/main.js
function Kc(e, t = {}) {
	let n = es(t), r = Xa(Gc, { workspace: n });
	return r.mount(e), {
		app: r,
		workspace: n,
		ready: n.start(),
		version: Bi,
		unmount: () => r.unmount()
	};
}
typeof document < "u" && document.querySelector("#app") && Kc("#app");
export { es as createWorkspace, Kc as mountWorkspace };
