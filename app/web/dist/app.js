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
}, T = /-\w/g, E = /* @__PURE__ */ te((e) => e.replace(T, (e) => e.slice(1).toUpperCase())), ne = /\B([A-Z])/g, D = /* @__PURE__ */ te((e) => e.replace(ne, "-$1").toLowerCase()), re = /* @__PURE__ */ te((e) => e.charAt(0).toUpperCase() + e.slice(1)), ie = /* @__PURE__ */ te((e) => e ? `on${re(e)}` : ""), ae = (e, t) => !Object.is(e, t), oe = (e, ...t) => {
	for (let n = 0; n < e.length; n++) e[n](...t);
}, se = (e, t, n, r = !1) => {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		writable: r,
		value: n
	});
}, ce = (e) => {
	let t = parseFloat(e);
	return isNaN(t) ? e : t;
}, le, ue = () => le ||= typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {};
function de(e) {
	if (d(e)) {
		let t = {};
		for (let n = 0; n < e.length; n++) {
			let r = e[n], i = g(r) ? he(r) : de(r);
			if (i) for (let e in i) t[e] = i[e];
		}
		return t;
	}
	if (g(e) || v(e)) return e;
}
var fe = /;(?![^(]*\))/g, pe = /:([^]+)/, me = /"(?:[^"\\]|\\[^])*"|'(?:[^'\\]|\\[^])*'|\\[^]|\/\*[^]*?\*\//g;
function he(e) {
	let t = {};
	return e.replace(me, (e) => e.startsWith("/*") ? "" : e).split(fe).forEach((e) => {
		if (e) {
			let n = e.split(pe);
			n.length > 1 && (t[n[0].trim()] = n[1].trim());
		}
	}), t;
}
function O(e) {
	let t = "";
	if (g(e)) t = e;
	else if (d(e)) for (let n = 0; n < e.length; n++) {
		let r = O(e[n]);
		r && (t += r + " ");
	}
	else if (v(e)) for (let n in e) e[n] && (t += n + " ");
	return t.trim();
}
var ge = /* @__PURE__ */ e("itemscope,allowfullscreen,disablepictureinpicture,disableremoteplayback,formnovalidate,ismap,nomodule,novalidate,playsinline,readonly");
function _e(e) {
	return !!e || e === "";
}
function ve(e, t, n) {
	if (e.length !== t.length) return !1;
	let r = !0;
	for (let i = 0; r && i < e.length; i++) r = Se(e[i], t[i], n);
	return r;
}
function ye(e, t, n) {
	if (e.size !== t.size) return !1;
	let r = Array.from(t), i = new Uint8Array(r.length);
	for (let t of e) {
		let e = -1;
		for (let a = 0; a < r.length; a++) if (!i[a] && Se(t, r[a], n)) {
			e = a;
			break;
		}
		if (e < 0) return !1;
		i[e] = 1;
	}
	return !0;
}
function be(e, t, n) {
	let r = f(e), i = f(t);
	if (r || i || (r = p(e), i = p(t), r || i)) return r && i ? ye(e, t, n) : !1;
	if (Object.keys(e).length !== Object.keys(t).length) return !1;
	for (let r in e) {
		let i = e.hasOwnProperty(r), a = t.hasOwnProperty(r);
		if (i && !a || !i && a || !Se(e[r], t[r], n)) return !1;
	}
	return String(e) === String(t);
}
function xe(e, t, n, r) {
	n ||= [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
	let [i, a] = n;
	if (i.has(e) || a.has(t)) return i.get(e) === t && a.get(t) === e;
	i.set(e, t), a.set(t, e);
	let o = r(e, t, n);
	return i.delete(e), a.delete(t), o;
}
function Se(e, t, n) {
	if (e === t) return !0;
	let r = m(e), i = m(t);
	return r || i ? r && i ? e.getTime() === t.getTime() : !1 : (r = _(e), i = _(t), r || i ? e === t : (r = d(e), i = d(t), r || i ? r && i ? xe(e, t, n, ve) : !1 : (r = v(e), i = v(t), r || i ? !r || !i ? !1 : xe(e, t, n, be) : String(e) === String(t))));
}
function Ce(e, t) {
	return e.findIndex((e) => Se(e, t));
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
		(t.version === 0 || ae(n, e._value)) && (e.flags |= 128, e._value = n, t.version++);
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
	return t === e || (M(t, "iterate", tt), /* @__PURE__ */ Ut(e)) ? t : /* @__PURE__ */ Ht(e) ? /* @__PURE__ */ Vt(e) ? t.map((e) => qt(Kt(e))) : t.map(qt) : t.map(Kt);
}
function it(e) {
	return M(e = /* @__PURE__ */ N(e), "iterate", tt), e;
}
function at(e, t) {
	return /* @__PURE__ */ Ht(e) ? qt(/* @__PURE__ */ Vt(e) ? Kt(t) : t) : Kt(t);
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
		return s ? Kt(t) : t;
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
		let o = Reflect.get(e, t, /* @__PURE__ */ P(e) ? e : n);
		if ((_(t) ? ht.has(t) : mt(t)) || (r || M(e, "get", t), i)) return o;
		if (/* @__PURE__ */ P(o)) {
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
			if (!/* @__PURE__ */ Ut(n) && !/* @__PURE__ */ Ht(n) && (i = /* @__PURE__ */ N(i), n = /* @__PURE__ */ N(n)), !a && /* @__PURE__ */ P(i) && !/* @__PURE__ */ P(n)) return e || (i.value = n), !0;
		}
		let o = a ? Number(t) < e.length : u(e, t), s = Reflect.set(e, t, n, /* @__PURE__ */ P(e) ? e : r);
		return e === /* @__PURE__ */ N(r) && s && (o ? ae(n, i) && nt(e, "set", t, n, i) : nt(e, "add", t, n)), s;
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
		let i = this.__v_raw, a = /* @__PURE__ */ N(i), o = f(a), c = e === "entries" || e === Symbol.iterator && o, l = e === "keys" && o, u = i[e](...r), d = n ? Ct : t ? qt : Kt;
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
			e || (ae(n, a) && M(i, "get", n), M(i, "get", a));
			let { has: o } = wt(i), s = t ? Ct : e ? qt : Kt;
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
			return e || (ae(t, i) && M(r, "has", t), M(r, "has", i)), t === i ? n.has(t) : n.has(t) || n.has(i);
		},
		forEach(n, r) {
			let i = this, a = i.__v_raw, o = /* @__PURE__ */ N(a), s = t ? Ct : e ? qt : Kt;
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
			return r.has.call(n, a) || ae(e, a) && r.has.call(n, e) || ae(i, a) && r.has.call(n, i) || (n.add(a), nt(n, "add", a, a)), this;
		},
		set(e, n) {
			t || /* @__PURE__ */ Ut(n) || /* @__PURE__ */ Ht(n) || (n = /* @__PURE__ */ N(n));
			let r = /* @__PURE__ */ N(this), { has: i, get: a } = wt(r), o = i.call(r, e);
			o ||= (e = /* @__PURE__ */ N(e), i.call(r, e));
			let s = a.call(r, e);
			return r.set(e, n), o ? ae(n, s) && nt(r, "set", e, n, s) : nt(r, "add", e, n), this;
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
	return !u(e, "__v_skip") && Object.isExtensible(e) && se(e, "__v_skip", !0), e;
}
var Kt = (e) => v(e) ? /* @__PURE__ */ Lt(e) : e, qt = (e) => v(e) ? /* @__PURE__ */ zt(e) : e;
// @__NO_SIDE_EFFECTS__
function P(e) {
	return e ? e.__v_isRef === !0 : !1;
}
// @__NO_SIDE_EFFECTS__
function F(e) {
	return Jt(e, !1);
}
function Jt(e, t) {
	return /* @__PURE__ */ P(e) ? e : new Yt(e, t);
}
var Yt = class {
	constructor(e, t) {
		this.dep = new Xe(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = t ? e : /* @__PURE__ */ N(e), this._value = t ? e : Kt(e), this.__v_isShallow = t;
	}
	get value() {
		return this.dep.track(), this._value;
	}
	set value(e) {
		let t = this._rawValue, n = this.__v_isShallow || /* @__PURE__ */ Ut(e) || /* @__PURE__ */ Ht(e);
		e = n ? e : /* @__PURE__ */ N(e), ae(e, t) && (this._rawValue = e, this._value = n ? e : Kt(e), this.dep.trigger());
	}
};
function I(e) {
	return /* @__PURE__ */ P(e) ? e.value : e;
}
var Xt = {
	get: (e, t, n) => t === "__v_raw" ? e : I(Reflect.get(e, t, n)),
	set: (e, t, n, r) => {
		let i = e[t];
		return /* @__PURE__ */ P(i) && !/* @__PURE__ */ P(n) ? (i.value = n, !0) : Reflect.set(e, t, n, r);
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
	if (/* @__PURE__ */ P(e) ? (g = () => e.value, y = /* @__PURE__ */ Ut(e)) : /* @__PURE__ */ Vt(e) ? (g = () => p(e), y = !0) : d(e) ? (b = !0, y = e.some((e) => /* @__PURE__ */ Vt(e) || /* @__PURE__ */ Ut(e)), g = () => e.map((e) => {
		if (/* @__PURE__ */ P(e)) return e.value;
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
				if (e || o || y || (b ? t.some((e, t) => ae(e, C[t])) : ae(t, C))) {
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
	if (n.set(e, t), t--, /* @__PURE__ */ P(e)) on(e.value, t, n);
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
var On = null, kn = null;
function An(e) {
	let t = On;
	return On = e, kn = e && e.type.__scopeId || null, t;
}
function jn(e, t = On, n) {
	if (!t || e._n) return e;
	let r = (...n) => {
		r._d && ci(-1);
		let i = An(t), a = ii.length, o;
		try {
			o = e(...n);
		} finally {
			for (let e = ii.length; e > a; e--) oi();
			An(i), r._d && ci(1);
		}
		return o;
	};
	return r._n = !0, r._c = !0, r._d = !0, r;
}
function R(e, n) {
	if (On === null) return e;
	let r = Hi(On), i = e.dirs ||= [];
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
		u && (Ge(), cn(u, n, 8, [
			e.el,
			l,
			i,
			t
		]), Ke());
	}
}
function Nn(e, t) {
	if (Di) {
		let n = Di.provides, r = Di.parent && Di.parent.provides;
		r === n && (n = Di.provides = Object.create(r)), n[e] = t;
	}
}
function Pn(e, t, n = !1) {
	let r = Oi();
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
	if (Pi) {
		if (c === "sync") {
			let e = In();
			f = e.__watcherHandles ||= [];
		} else if (!d) {
			let e = () => {};
			return e.stop = r, e.resume = r, e.pause = r, e;
		}
	}
	let p = Di;
	u.call = (e, t, n) => cn(e, p, t, n);
	let m = !1;
	c === "post" ? u.scheduler = (e) => {
		e.i = p, Vr(e, p && p.suspense);
	} : c !== "sync" && (m = !0, u.scheduler = (e, t) => {
		t ? e() : yn(e);
	}), u.augmentJob = (e) => {
		n && (e.flags |= 4), m && (e.flags |= 2, p && (e.id = p.uid, e.i = p));
	};
	let h = an(e, n, u);
	return Pi && (f ? f.push(h) : d && h()), h;
}
var zn = /* @__PURE__ */ Symbol("_vte"), Bn = (e) => e.__isTeleport, Vn = /* @__PURE__ */ Symbol("_leaveCb");
function Hn(e) {
	let t = e[0];
	if (e.length > 1) {
		for (let n of e) if (n.type !== ni) {
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
	if (e.type !== ni) return e;
}
// @__NO_SIDE_EFFECTS__
function z(e, t) {
	return h(e) ? /* @__PURE__ */ s({ name: e.name }, t, { setup: e }) : e;
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
	let s = a.shapeFlag & 4 ? Hi(a.component) : a.el, l = o ? null : s, { i: f, r: p } = e, m = n && n.r, _ = f.refs === t ? f.refs = {} : f.refs, v = f.setupState, y = /* @__PURE__ */ N(v), b = v === t ? i : (e) => !qn(_, e) && u(y, e), x = (e, t) => !(t && qn(_, t));
	if (m != null && m !== p) {
		if (Xn(n), g(m)) _[m] = null, b(m) && (v[m] = null);
		else if (/* @__PURE__ */ P(m)) {
			let e = n;
			x(m, e.k) && (m.value = null), e.k && (_[e.k] = null);
		}
	}
	if (h(p)) sn(p, f, 12, [l, _]);
	else {
		let t = g(p), n = /* @__PURE__ */ P(p);
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
				t.id = -1, Jn.set(e, t), Vr(t, r);
			} else Xn(e), i();
		}
	}
}
function Xn(e) {
	let t = Jn.get(e);
	t && (t.flags |= 8, Jn.delete(e));
}
ue().requestIdleCallback, ue().cancelIdleCallback;
var Zn = (e) => !!e.type.__asyncLoader, Qn = (e) => e.type.__isKeepAlive;
function $n(e, t, n = Di, r = !1) {
	if (n) {
		let i = n[e] || (n[e] = []), a = t.__weh ||= (...r) => {
			Ge();
			let i = ji(n), a = cn(t, n, e, r);
			return i(), Ke(), a;
		};
		return r ? i.unshift(a) : i.push(a), a;
	}
}
var er = (e) => (t, n = Di) => {
	Pi && e !== "sp" || $n(e, (...e) => t(...e), n);
}, tr = er("m"), nr = er("bum"), rr = /* @__PURE__ */ Symbol.for("v-ndc");
function B(e, t, n, r) {
	let i, a = n && n[r], o = d(e);
	if (o || g(e)) {
		let n = o && /* @__PURE__ */ Vt(e), r = !1, s = !1;
		n && (r = !/* @__PURE__ */ Ut(e), s = /* @__PURE__ */ Ht(e), e = it(e)), i = Array(e.length);
		for (let n = 0, o = e.length; n < o; n++) i[n] = t(r ? s ? qt(Kt(e[n])) : Kt(e[n]) : e[n], n, void 0, a && a[n]);
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
var ir = (e) => e ? Ni(e) ? Hi(e) : ir(e.parent) : null, ar = /* @__PURE__ */ s(/* @__PURE__ */ Object.create(null), {
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
		if (d) return n === "$attrs" && M(e.attrs, "get", ""), d(e);
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
			version: Wi,
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
					let u = l._ceVNode || G(n, r);
					return u.appContext = i, s === !0 ? s = "svg" : s === !1 && (s = void 0), o && t ? t(u, a) : e(u, a, s), c = !0, l._container = a, a.__vue_app__ = l, Hi(u.component);
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
var dr = null, fr = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${E(t)}Modifiers`] || e[`${D(t)}Modifiers`];
function pr(e, n, ...r) {
	if (e.isUnmounted) return;
	let i = e.vnode.props || t, a = r, o = n.startsWith("update:"), s = o && fr(i, n.slice(7));
	s && (s.trim && (a = r.map((e) => g(e) ? e.trim() : e)), s.number && (a = a.map(ce)));
	let c, l = i[c = ie(n)] || i[c = ie(E(n))];
	!l && o && (l = i[c = ie(D(n))]), l && cn(l, e, 6, a);
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
	return !e || !a(t) ? !1 : (t = t.slice(2), t = t === "Once" ? t : t.replace(/Once$/, ""), u(e, t[0].toLowerCase() + t.slice(1)) || u(e, D(t)) || u(e, t));
}
function gr(e) {
	let { type: t, vnode: n, proxy: r, withProxy: i, propsOptions: [a], slots: s, attrs: c, emit: l, render: u, renderCache: d, props: f, data: p, setupState: m, ctx: h, inheritAttrs: g } = e, _ = An(e), v, y;
	try {
		if (n.shapeFlag & 4) {
			let e = i || r, t = e;
			v = vi(u.call(t, e, d, f, m, p, h)), y = c;
		} else {
			let e = t;
			v = vi(e.length > 1 ? e(f, {
				attrs: c,
				slots: s,
				emit: l
			}) : e(f, null)), y = t.props ? c : vr(c);
		}
	} catch (t) {
		ii.length = 0, ln(t, e, 1), v = G(ni);
	}
	let b = v;
	if (y && g !== !1) {
		let e = Object.keys(y), { shapeFlag: t } = b;
		e.length && t & 7 && (a && e.some(o) && (y = yr(y, a)), b = _i(b, y, !1, !0));
	}
	return n.dirs && (b = _i(b, null, !1, !0), b.dirs = b.dirs ? b.dirs.concat(n.dirs) : n.dirs), n.transition && Wn(Bn(b.type) && Un(b) || b, n.transition), v = b, An(_), v;
}
function _r(e, t = !0) {
	let n;
	for (let t = 0; t < e.length; t++) {
		let r = e[t];
		if (di(r)) {
			if (r.type !== ni || r.children === "v-if") {
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
	return n === "style" && v(r) && v(i) ? !Se(r, i) : r !== i;
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
	e.props = n ? r ? i : /* @__PURE__ */ Rt(i) : e.type.props ? i : a, e.attrs = a;
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
						let t = E(o);
						i[t] = Ar(c, s, t, d, e, !1);
					}
				} else d !== a[o] && (a[o] = d, l = !0);
			}
		}
	} else {
		kr(e, t, i, a) && (l = !0);
		let r;
		for (let a in s) t && (u(t, a) || (r = D(a)) !== a && u(t, r)) || (c ? n && (n[a] !== void 0 || n[r] !== void 0) && (i[a] = Ar(c, s, a, void 0, e, !0)) : delete i[a]);
		if (a !== s) for (let e in a) t && u(t, e) || (delete a[e], l = !0);
	}
	l && nt(e.attrs, "set", "");
}
function kr(e, n, r, i) {
	let [a, o] = e.propsOptions, s = !1, c;
	if (n) for (let t in n) {
		if (ee(t)) continue;
		let l = n[t], d;
		a && u(a, d = E(t)) ? !o || !o.includes(d) ? r[d] = l : (c ||= {})[d] = l : hr(e.emitsOptions, t) || t in i && l === i[t] || (i[t] = l, s = !0);
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
					let o = ji(i);
					r = a[n] = e.call(null, t), o();
				}
			} else r = e;
			i.ce && i.ce._setProp(n, r);
		}
		o[0] && (a && !e ? r = !1 : o[1] && (r === "" || r === D(n)) && (r = !0));
	}
	return r;
}
function jr(e, r, i = !1) {
	let a = r.propsCache, o = a.get(e);
	if (o) return o;
	let c = e.props, l = {}, f = [];
	if (!c) return v(e) && a.set(e, n), n;
	if (d(c)) for (let e = 0; e < c.length; e++) {
		let n = E(c[e]);
		Mr(n) && (l[n] = t);
	}
	else if (c) for (let e in c) {
		let t = E(e);
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
var Nr = (e) => e === "_" || e === "_ctx" || e === "$stable", Pr = (e) => d(e) ? e.map(vi) : [vi(e)], Fr = (e, t, n) => {
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
		e ? (Rr(r, t, n), n && se(r, "_", e, !0)) : Ir(t, r);
	} else t && Lr(e, t);
}, Br = (e, n, r) => {
	let { vnode: i, slots: a } = e, o = !0, s = t;
	if (i.shapeFlag & 32) {
		let e = n._;
		e ? r && e === 1 ? o = !1 : Rr(a, n, r) : (o = !n.$stable, Ir(n, a)), s = n;
	} else n && (Lr(e, n), s = { default: 1 });
	if (o) for (let e in a) !Nr(e) && s[e] == null && delete a[e];
}, Vr = ei;
function Hr(e) {
	return Ur(e);
}
function Ur(e, i) {
	let a = ue();
	a.__VUE__ = !0;
	let { insert: o, remove: s, patchProp: c, createElement: l, createText: u, createComment: d, setText: f, setElementText: p, parentNode: m, nextSibling: h, setScopeId: g = r, insertStaticContent: _ } = e, v = (e, t, r, i = null, a = null, o = null, s = void 0, c = null, l = !!t.dynamicChildren) => {
		if (e === t) return;
		e && !fi(e, t) && (i = be(e), O(e, a, o, !0), e = null), t.patchFlag === -2 && (l = !1, t.dynamicChildren = null), t.dynamicChildren && e && e.dynamicChildren && e.dynamicChildren.hasOnce && (t.dynamicChildren === n && (t.dynamicChildren = []), t.dynamicChildren.hasOnce = !0);
		let { type: u, ref: d, shapeFlag: f } = t;
		switch (u) {
			case ti:
				y(e, t, r, i);
				break;
			case ni:
				b(e, t, r, i);
				break;
			case ri:
				e ?? x(t, r, i, s);
				break;
			case V:
				ie(e, t, r, i, a, o, s, c, l);
				break;
			default: f & 1 ? w(e, t, r, i, a, o, s, c, l) : f & 6 ? ae(e, t, r, i, a, o, s, c, l) : (f & 64 || f & 128) && u.process(e, t, r, i, a, o, s, c, l, Se);
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
				n && n._beginPatch(), ne(e, t, i, a, o, s, c);
			} finally {
				n && n._endPatch();
			}
		}
	}, te = (e, t, n, r, i, a, s, u) => {
		let d, f, { props: m, shapeFlag: h, transition: g, dirs: _ } = e;
		if (d = e.el = l(e.type, a, m && m.is, m), h & 8 ? p(d, e.children) : h & 16 && E(e.children, d, null, r, i, Wr(e, a), s, u), _ && Mn(e, null, r, "created"), T(d, e, e.scopeId, s, r), m) {
			for (let e in m) e !== "value" && !ee(e) && c(d, e, null, m[e], a, r);
			"value" in m && c(d, "value", null, m.value, a), (f = m.onVnodeBeforeMount) && Si(f, r, e);
		}
		_ && Mn(e, null, r, "beforeMount");
		let v = Kr(i, g);
		v ? g.beforeEnter(d) : g && !g.persisted && (d[$r] = !0), o(d, t, n), ((f = m && m.onVnodeMounted) || v || _) && Vr(() => {
			try {
				f && Si(f, r, e), v && g.enter(d), _ && Mn(e, null, r, "mounted");
			} finally {}
		}, i);
	}, T = (e, t, n, r, i) => {
		if (n && g(e, n), r) for (let t = 0; t < r.length; t++) g(e, r[t]);
		if (i) {
			let n = i.subTree;
			if (t === n || Qr(n.type) && (n.ssContent === t || n.ssFallback === t)) {
				let t = i.vnode;
				T(e, t, t.scopeId, t.slotScopeIds, i.parent);
			}
		}
	}, E = (e, t, n, r, i, a, o, s, c = 0) => {
		for (let l = c; l < e.length; l++) {
			let c = e[l] = s ? yi(e[l]) : vi(e[l]);
			v(null, c, t, n, r, i, a, o, s);
		}
	}, ne = (e, n, r, i, a, o, s) => {
		let l = n.el = e.el, { patchFlag: u, dynamicChildren: d, dirs: f } = n;
		u |= e.patchFlag & 16;
		let m = e.props || t, h = n.props || t, g;
		if (r && Gr(r, !1), (g = h.onVnodeBeforeUpdate) && Si(g, r, n, e), f && Mn(n, e, r, "beforeUpdate"), r && Gr(r, !0), d && (!e.dynamicChildren || e.dynamicChildren.length !== d.length) && (u = 0, s = !1, d = null), (m.innerHTML && h.innerHTML == null || m.textContent && h.textContent == null) && p(l, ""), d ? D(e.dynamicChildren, d, l, r, i, Wr(n, a), o) : s || fe(e, n, l, null, r, i, Wr(n, a), o, !1), u > 0) {
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
		((g = h.onVnodeUpdated) || f) && Vr(() => {
			g && Si(g, r, n, e), f && Mn(n, e, r, "updated");
		}, i);
	}, D = (e, t, n, r, i, a, o) => {
		for (let s = 0; s < t.length; s++) {
			let c = e[s], l = t[s], u = c.el || Zr(c), d = u && (c.type === V || !fi(c, l) || c.shapeFlag & 198) ? m(u) : n;
			v(c, l, d, null, r, i, a, o, !0);
		}
	}, re = (e, n, r, i, a) => {
		if (n !== r) {
			if (n !== t) for (let t in n) !ee(t) && !(t in r) && c(e, t, n[t], null, a, i);
			for (let t in r) {
				if (ee(t)) continue;
				let o = r[t], s = n[t];
				o !== s && t !== "value" && c(e, t, s, o, a, i);
			}
			"value" in r && c(e, "value", n.value, r.value, a);
		}
	}, ie = (e, t, n, r, i, a, s, c, l) => {
		let d = t.el = e ? e.el : u(""), f = t.anchor = e ? e.anchor : u(""), { patchFlag: p, dynamicChildren: m, slotScopeIds: h } = t;
		h && (c = c ? c.concat(h) : h), e == null ? (o(d, n, r), o(f, n, r), E(t.children || [], n, f, i, a, s, c, l)) : p > 0 && p & 64 && m && e.dynamicChildren && e.dynamicChildren.length === m.length ? (D(e.dynamicChildren, m, n, i, a, s, c), (t.key != null || i && t === i.subTree) && qr(e, t, !0)) : fe(e, t, n, f, i, a, s, c, l);
	}, ae = (e, t, n, r, i, a, o, s, c) => {
		t.slotScopeIds = s, e == null ? t.shapeFlag & 512 ? i.ctx.activate(t, n, r, o, c) : se(t, n, r, i, a, o, c) : ce(e, t, c);
	}, se = (e, t, n, r, i, a, o) => {
		let s = e.component = Ei(e, r, i);
		if (Qn(e) && (s.ctx.renderer = Se), Fi(s, !1, o), s.asyncDep) {
			if (i && i.registerDep(s, le, o, a), !e.el) {
				let r = s.subTree = G(ni);
				b(null, r, t, n), e.placeholder = r.el;
			}
		} else le(s, e, t, n, i, a, o);
	}, ce = (e, t, n) => {
		let r = t.component = e.component;
		if (br(e, t, n)) {
			if (r.asyncDep && !r.asyncResolved) {
				t.el = e.el, t.placeholder = e.placeholder, de(r, t, n);
				return;
			}
			r.next = t, r.update();
		} else t.el = e.el, t.placeholder = e.placeholder, r.vnode = t;
	}, le = (e, t, n, r, i, a, o) => {
		let s = () => {
			if (e.isMounted) {
				let { next: t, bu: n, u: r, parent: s, vnode: c } = e;
				{
					let n = Yr(e);
					if (n) {
						t && (t.el = c.el, de(e, t, o)), n.asyncDep.then(() => {
							let t = () => {
								e.job.flags & 8 || (i && i.pendingBranch ? Vr(t, i) : l());
							};
							t.flags = 48, Vr(t, i);
						});
						return;
					}
				}
				let u = t, d;
				Gr(e, !1), t ? (t.el = c.el, de(e, t, o)) : t = c, n && oe(n), (d = t.props && t.props.onVnodeBeforeUpdate) && Si(d, s, t, c), Gr(e, !0);
				let f = gr(e), p = e.subTree;
				e.subTree = f, v(p, f, m(p.el || Zr(p)), be(p), e, i, a), t.el = f.el, u === null && Cr(e, f.el), r && Vr(r, i), (d = t.props && t.props.onVnodeUpdated) && Vr(() => Si(d, s, t, c), i);
			} else {
				let o, { el: s, props: c } = t, { bm: l, m: u, parent: d, root: f, type: p } = e, m = Zn(t);
				if (Gr(e, !1), l && oe(l), !m && (o = c && c.onVnodeBeforeMount) && Si(o, d, t), Gr(e, !0), s && we) {
					let t = () => {
						e.subTree = gr(e), we(s, e.subTree, e, i, null);
					};
					m && p.__asyncHydrate ? p.__asyncHydrate(s, e, t) : t();
				} else {
					f.ce && f.ce._hasShadowRoot() && f.ce._injectChildStyle(p, e.parent ? e.parent.type : void 0);
					let o = e.subTree = gr(e);
					v(null, o, n, r, e, i, a), t.el = o.el;
				}
				if (u && Vr(u, i), !m && (o = c && c.onVnodeMounted)) {
					let e = t;
					Vr(() => Si(o, d, e), i);
				}
				(t.shapeFlag & 256 || d && Zn(d.vnode) && d.vnode.shapeFlag & 256) && e.a && Vr(e.a, i), e.isMounted = !0, t = n = r = null;
			}
		};
		e.scope.on();
		let c = e.effect = new Ae(s);
		e.scope.off();
		let l = e.update = c.run.bind(c), u = e.job = c.runIfDirty.bind(c);
		u.i = e, u.id = e.uid, c.scheduler = () => yn(u), Gr(e, !0), l();
	}, de = (e, t, n) => {
		t.component = e;
		let r = e.vnode.props;
		e.vnode = t, e.next = null, Or(e, t.props, r, n), Br(e, t.children, n), Ge(), Sn(e), Ke();
	}, fe = (e, t, n, r, i, a, o, s, c = !1) => {
		let l = e && e.children, u = e ? e.shapeFlag : 0, d = t.children, { patchFlag: f, shapeFlag: m } = t;
		if (f > 0) {
			if (f & 128) {
				me(l, d, n, r, i, a, o, s, c);
				return;
			}
			if (f & 256) {
				pe(l, d, n, r, i, a, o, s, c);
				return;
			}
		}
		m & 8 ? (u & 16 && ye(l, i, a), d !== l && p(n, d)) : u & 16 ? m & 16 ? me(l, d, n, r, i, a, o, s, c) : ye(l, i, a, !0) : (u & 8 && p(n, ""), m & 16 && E(d, n, r, i, a, o, s, c));
	}, pe = (e, t, r, i, a, o, s, c, l) => {
		e ||= n, t ||= n;
		let u = e.length, d = t.length, f = Math.min(u, d), p = 0;
		for (; p < f; p++) {
			let n = t[p] = l ? yi(t[p]) : vi(t[p]);
			v(e[p], n, r, null, a, o, s, c, l);
		}
		u > d ? ye(e, a, o, !0, !1, f) : E(t, r, i, a, o, s, c, l, f);
	}, me = (e, t, r, i, a, o, s, c, l) => {
		let u = 0, d = t.length, f = e.length - 1, p = d - 1;
		for (; u <= f && u <= p;) {
			let n = e[u], i = t[u] = l ? yi(t[u]) : vi(t[u]);
			if (fi(n, i)) v(n, i, r, null, a, o, s, c, l);
			else break;
			u++;
		}
		for (; u <= f && u <= p;) {
			let n = e[f], i = t[p] = l ? yi(t[p]) : vi(t[p]);
			if (fi(n, i)) v(n, i, r, null, a, o, s, c, l);
			else break;
			f--, p--;
		}
		if (u > f) {
			if (u <= p) {
				let e = p + 1, n = e < d ? t[e].el : i;
				for (; u <= p;) v(null, t[u] = l ? yi(t[u]) : vi(t[u]), r, n, a, o, s, c, l), u++;
			}
		} else if (u > p) for (; u <= f;) O(e[u], a, o, !0), u++;
		else {
			let m = u, h = u, g = /* @__PURE__ */ new Map();
			for (u = h; u <= p; u++) {
				let e = t[u] = l ? yi(t[u]) : vi(t[u]);
				e.key != null && g.set(e.key, u);
			}
			let _, y = 0, b = p - h + 1, x = !1, S = 0, C = Array(b);
			for (u = 0; u < b; u++) C[u] = 0;
			for (u = m; u <= f; u++) {
				let n = e[u];
				if (y >= b) {
					O(n, a, o, !0);
					continue;
				}
				let i;
				if (n.key != null) i = g.get(n.key);
				else for (_ = h; _ <= p; _++) if (C[_ - h] === 0 && fi(n, t[_])) {
					i = _;
					break;
				}
				i === void 0 ? O(n, a, o, !0) : (C[i - h] = u + 1, i >= S ? S = i : x = !0, v(n, t[i], r, null, a, o, s, c, l), y++);
			}
			let w = x ? Jr(C) : n;
			for (_ = w.length - 1, u = b - 1; u >= 0; u--) {
				let e = h + u, n = t[e], f = t[e + 1], p = e + 1 < d ? f.el || Zr(f) : i;
				C[u] === 0 ? v(null, n, r, p, a, o, s, c, l) : x && (_ < 0 || u !== w[_] ? he(n, r, p, 2) : _--);
			}
		}
	}, he = (e, t, n, r, i = null) => {
		let { el: a, type: c, transition: l, children: u, shapeFlag: d } = e;
		if (d & 6) he(e.component.subTree, t, n, r);
		else if (d & 128) e.suspense.move(t, n, r);
		else if (d & 64) c.move(e, t, n, Se);
		else if (c === V) {
			o(a, t, n);
			for (let e = 0; e < u.length; e++) he(u[e], t, n, r);
			o(e.anchor, t, n);
		} else if (c === ri) S(e, t, n);
		else if (r !== 2 && d & 1 && l) {
			if (r === 0) l.persisted && !a[Vn] ? o(a, t, n) : (l.beforeEnter(a), o(a, t, n), Vr(() => l.enter(a), i));
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
	}, O = (e, t, n, r = !1, i = !1) => {
		let { type: a, props: o, ref: s, children: c, dynamicChildren: l, shapeFlag: u, patchFlag: d, dirs: f, cacheIndex: p, memo: m } = e;
		if ((d === -2 || l && l.hasOnce) && (i = !1), s != null && (Ge(), Yn(s, null, n, e, !0), Ke()), p == null || e.ctx && e.ctx !== t || (t.renderCache[p] = void 0), u & 256 && t.ctx.deactivate(e)) return;
		let h = u & 1 && f, g = !Zn(e), _;
		if (g && (_ = o && o.onVnodeBeforeUnmount) && Si(_, t, e), u & 6) ve(e.component, n, r);
		else {
			if (u & 128) {
				e.suspense.unmount(n, r);
				return;
			}
			h && Mn(e, null, t, "beforeUnmount"), u & 64 ? e.type.remove(e, t, n, Se, r) : l && !l.hasOnce && (a !== V || d > 0 && d & 64) ? ye(l, t, n, !1, !0) : (a === V && d & 384 || !i && u & 16) && ye(c, t, n), r && ge(e);
		}
		let v = m != null && p == null;
		(g && (_ = o && o.onVnodeUnmounted) || h || v) && Vr(() => {
			_ && Si(_, t, e), h && Mn(e, null, t, "unmounted"), v && (e.el = null);
		}, n);
	}, ge = (e) => {
		let { type: t, el: n, anchor: r, transition: i } = e, a = t === V;
		if (a && !i) {
			_e(n, r);
			return;
		}
		if (t === ri) {
			C(e), i && !i.persisted && i.afterLeave && i.afterLeave();
			return;
		}
		let o = a ? Gn(e) : e, c = () => {
			a ? m(n) && _e(n, r) : s(n), i && !i.persisted && i.afterLeave && i.afterLeave();
		};
		if (o && o.shapeFlag & 1 && i && !i.persisted) {
			let { leave: e, delayLeave: t } = i, n = o.el, r = () => e(n, c);
			t ? t(n, c, r) : r();
		} else c();
	}, _e = (e, t) => {
		let n;
		for (; e !== t;) n = h(e), s(e), e = n;
		s(t);
	}, ve = (e, t, n) => {
		let { bum: r, scope: i, job: a, subTree: o, um: s, m: c, a: l } = e;
		Xr(c), Xr(l), r && oe(r), i.stop(), a ? (a.flags |= 8, O(o, e, t, n)) : o && (o.transition = e.vnode.transition, O(o, e, t, n)), s && Vr(s, t);
		let u = () => {
			e.isUnmounted = !0;
		};
		u.flags = 16, Vr(u, t);
	}, ye = (e, t, n, r = !1, i = !1, a = 0) => {
		for (let o = a; o < e.length; o++) O(e[o], t, n, r, i);
	}, be = (e) => {
		if (e.shapeFlag & 6) return be(e.component.subTree);
		if (e.shapeFlag & 128) return e.suspense.next();
		let t = h(e.anchor || e.el), n = t && t[zn];
		return n ? h(n) : t;
	}, xe = (e, t, n) => {
		Tn(() => {
			e == null ? t._vnode && O(t._vnode, null, null, !0) : v(t._vnode || null, e, t, null, null, null, n), t._vnode = e;
		}, e && t._vnode ? void 0 : e && e.component ? e.component.uid : Ti());
	}, Se = {
		p: v,
		um: O,
		m: he,
		r: ge,
		mt: se,
		mc: E,
		pc: fe,
		pbc: D,
		n: be,
		o: e
	}, Ce, we;
	return i && ([Ce, we] = i(Se)), {
		render: xe,
		hydrate: Ce,
		createApp: ur(xe, Ce)
	};
}
function Wr({ type: e, props: t }, n) {
	return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function Gr({ effect: e, job: t }, n) {
	n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Kr(e, t) {
	return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function qr(e, t, n = !1) {
	let r = e.children, i = t.children;
	if (d(r) && d(i)) for (let e = 0; e < r.length; e++) {
		let t = r[e], a = i[e];
		a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[e] = yi(i[e]), a.el = t.el), !n && a.patchFlag !== -2 && qr(t, a)), a.type === ti && (a.patchFlag === -1 && (a = i[e] = yi(a)), a.el = t.el), a.type === ni && !a.el && (a.el = t.el);
	}
}
function Jr(e) {
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
function Yr(e) {
	let t = e.subTree.component;
	if (t) return t.asyncDep && !t.asyncResolved ? t : Yr(t);
}
function Xr(e) {
	if (e) for (let t = 0; t < e.length; t++) e[t].flags |= 8;
}
function Zr(e) {
	if (e.placeholder) return e.placeholder;
	let t = e.component;
	if (t) return Zr(t.subTree);
	let n = e.suspense;
	return n && n.activeBranch ? Zr(n.activeBranch) : null;
}
var Qr = (e) => e.__isSuspense, $r = /* @__PURE__ */ Symbol("_deferredEnter");
function ei(e, t) {
	t && t.pendingBranch ? d(e) ? t.effects.push(...e) : t.effects.push(e) : xn(e);
}
var V = /* @__PURE__ */ Symbol.for("v-fgt"), ti = /* @__PURE__ */ Symbol.for("v-txt"), ni = /* @__PURE__ */ Symbol.for("v-cmt"), ri = /* @__PURE__ */ Symbol.for("v-stc"), ii = [], ai = null;
function H(e = !1) {
	ii.push(ai = e ? null : []);
}
function oi() {
	ii.pop(), ai = ii[ii.length - 1] || null;
}
var si = 1;
function ci(e, t = !1) {
	si += e, e < 0 && ai && t && (ai.hasOnce = !0);
}
function li(e) {
	return e.dynamicChildren = si > 0 ? ai || n : null, oi(), si > 0 && ai && ai.push(e), e;
}
function U(e, t, n, r, i, a) {
	return li(W(e, t, n, r, i, a, !0));
}
function ui(e, t, n, r, i) {
	return li(G(e, t, n, r, i, !0));
}
function di(e) {
	return e ? e.__v_isVNode === !0 : !1;
}
function fi(e, t) {
	return e.type === t.type && e.key === t.key;
}
var pi = ({ key: e }) => e ?? null, mi = ({ ref: e, ref_key: t, ref_for: n }) => (typeof e == "number" && (e = "" + e), e == null ? null : g(e) || /* @__PURE__ */ P(e) || h(e) ? {
	i: On,
	r: e,
	k: t,
	f: !!n
} : e);
function W(e, t = null, n = null, r = 0, i = null, a = e === V ? 0 : 1, o = !1, s = !1) {
	let c = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e,
		props: t,
		key: t && pi(t),
		ref: t && mi(t),
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
	return s ? (bi(c, n), a & 128 && e.normalize(c)) : n && (c.shapeFlag |= g(n) ? 8 : 16), si > 0 && !o && ai && (c.patchFlag > 0 || a & 6) && c.patchFlag !== 32 && ai.push(c), c;
}
var G = hi;
function hi(e, t = null, n = null, r = 0, i = null, a = !1) {
	if (e && e !== rr || (e = ni), di(e)) {
		let r = _i(e, t, !0);
		return n && bi(r, n), si > 0 && !a && ai && (r.shapeFlag & 6 ? ai[ai.indexOf(e)] = r : ai.push(r)), r.patchFlag = -2, r;
	}
	if (Ui(e) && (e = e.__vccOpts), t) {
		t = gi(t);
		let { class: e, style: n } = t;
		e && !g(e) && (t.class = O(e)), v(n) && (/* @__PURE__ */ Wt(n) && !d(n) && (n = s({}, n)), t.style = de(n));
	}
	let o = g(e) ? 1 : Qr(e) ? 128 : Bn(e) ? 64 : v(e) ? 4 : h(e) ? 2 : 0;
	return W(e, t, n, r, i, o, a, !0);
}
function gi(e) {
	return e ? /* @__PURE__ */ Wt(e) ? s({}, e) : Er(e) ? s({}, e[zi] || e) : e : null;
}
function _i(e, t, n = !1, r = !1) {
	let { props: i, ref: a, patchFlag: o, children: s, transition: c } = e, l = t ? xi(i || {}, t) : i, u = {
		__v_isVNode: !0,
		__v_skip: !0,
		type: e.type,
		props: l,
		key: l && pi(l),
		ref: t && t.ref ? n && a ? d(a) ? a.concat(mi(t)) : [a, mi(t)] : mi(t) : a,
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
		ssContent: e.ssContent && _i(e.ssContent),
		ssFallback: e.ssFallback && _i(e.ssFallback),
		placeholder: e.placeholder,
		el: e.el,
		anchor: e.anchor,
		ctx: e.ctx,
		ce: e.ce,
		cacheIndex: e.cacheIndex
	};
	return c && r && Wn(u, c.clone(u)), u;
}
function K(e = " ", t = 0) {
	return G(ti, null, e, t);
}
function q(e = "", t = !1) {
	return t ? (H(), ui(ni, null, e)) : G(ni, null, e);
}
function vi(e) {
	return e == null || typeof e == "boolean" ? G(ni) : d(e) ? G(V, null, e.slice()) : di(e) ? yi(e) : G(ti, null, String(e));
}
function yi(e) {
	return e.el === null && e.patchFlag !== -1 || e.memo ? e : _i(e);
}
function bi(e, t) {
	let n = 0, { shapeFlag: r } = e;
	if (t == null) t = null;
	else if (d(t)) n = 16;
	else if (typeof t == "object") {
		if (r & 65) {
			let n = t.default;
			n && (n._c && (n._d = !1), bi(e, n()), n._c && (n._d = !0));
			return;
		}
		{
			n = 32;
			let r = t._;
			!r && !Er(t) ? t._ctx = On : r === 3 && On && (On.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
		}
	} else if (h(t)) {
		if (r & 65) {
			bi(e, { default: t });
			return;
		}
		t = {
			default: t,
			_ctx: On
		}, n = 32;
	} else t = String(t), r & 64 ? (n = 16, t = [K(t)]) : n = 8;
	e.children = t, e.shapeFlag |= n;
}
function xi(...e) {
	let t = {};
	for (let n = 0; n < e.length; n++) {
		let r = e[n];
		for (let e in r) if (e === "class") t.class !== r.class && (t.class = O([t.class, r.class]));
		else if (e === "style") t.style = de([t.style, r.style]);
		else if (a(e)) {
			let n = t[e], i = r[e];
			i && n !== i && !(d(n) && n.includes(i)) ? t[e] = n ? [].concat(n, i) : i : i == null && n == null && !o(e) && (t[e] = i);
		} else e !== "" && (t[e] = r[e]);
	}
	return t;
}
function Si(e, t, n, r = null) {
	cn(e, t, 7, [n, r]);
}
var Ci = /* @__PURE__ */ cr(), wi = 0;
function Ti() {
	return wi;
}
function Ei(e, n, r) {
	let i = e.type, a = (n ? n.appContext : e.appContext) || Ci, o = {
		uid: wi++,
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
var Di = null, Oi = () => Di || On, ki, Ai;
{
	let e = ue(), t = (t, n) => {
		let r;
		return (r = e[t]) || (r = e[t] = []), r.push(n), (e) => {
			r.length > 1 ? r.forEach((t) => t(e)) : r[0](e);
		};
	};
	ki = t("__VUE_INSTANCE_SETTERS__", (e) => Di = e), Ai = t("__VUE_SSR_SETTERS__", (e) => Pi = e);
}
var ji = (e) => {
	let t = Di;
	return ki(e), e.scope.on(), () => {
		e.scope.off(), ki(t);
	};
}, Mi = () => {
	Di && Di.scope.off(), ki(null);
};
function Ni(e) {
	return e.vnode.shapeFlag & 4;
}
var Pi = !1;
function Fi(e, t = !1, n = !1) {
	t && Ai(t);
	let { props: r, children: i } = e.vnode, a = Ni(e);
	Dr(e, r, a, t), zr(e, i, n || t);
	let o = a ? Ii(e, t) : void 0;
	return t && Ai(!1), o;
}
function Ii(e, t) {
	let n = e.type;
	e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, sr);
	let { setup: r } = n;
	if (r) {
		Ge();
		let n = e.setupContext = r.length > 1 ? Vi(e) : null, i = ji(e), a = sn(r, e, 0, [e.props, n]), o = y(a);
		if (Ke(), i(), (o || e.sp) && !Zn(e) && Kn(e), o) {
			if (a.then(Mi, Mi), t) return a.then((n) => {
				Ai(!0);
				try {
					Li(e, n, t);
				} finally {
					Ai(!1);
				}
			}).catch((t) => {
				ln(t, e, 0, void 0, !0), e.ssrRender = (e, t) => t("<!---->");
			});
			e.asyncDep = a;
		} else Li(e, a, t);
	} else Ri(e, t);
}
function Li(e, t, n) {
	h(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : v(t) && (e.setupState = Zt(t)), Ri(e, n);
}
function Ri(e, t, n) {
	let i = e.type;
	e.render ||= i.render || r;
}
var zi = /* @__PURE__ */ Symbol(), Bi = { get(e, t) {
	return M(e, "get", ""), t === zi ? e : e[t];
} };
function Vi(e) {
	return {
		attrs: new Proxy(e.attrs, Bi),
		slots: e.slots,
		emit: e.emit,
		expose: (t) => {
			e.exposed = t || {};
		}
	};
}
function Hi(e) {
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
function Ui(e) {
	return h(e) && "__vccOpts" in e;
}
var J = (e, t) => /* @__PURE__ */ $t(e, t, Pi), Wi = "3.5.45", Gi = void 0, Ki = typeof window < "u" && window.trustedTypes;
if (Ki) try {
	Gi = /* @__PURE__ */ Ki.createPolicy("vue", { createHTML: (e) => e });
} catch {}
var qi = Gi ? (e) => Gi.createHTML(e) : (e) => e, Ji = "http://www.w3.org/2000/svg", Yi = "http://www.w3.org/1998/Math/MathML", Xi = typeof document < "u" ? document : null, Zi = Xi && /* @__PURE__ */ Xi.createElement("template"), Qi = {
	insert: (e, t, n) => {
		t.insertBefore(e, n || null);
	},
	remove: (e) => {
		let t = e.parentNode;
		t && t.removeChild(e);
	},
	createElement: (e, t, n, r) => {
		let i = t === "svg" ? Xi.createElementNS(Ji, e) : t === "mathml" ? Xi.createElementNS(Yi, e) : n ? Xi.createElement(e, { is: n }) : Xi.createElement(e);
		return e === "select" && r && r.multiple != null && i.setAttribute("multiple", r.multiple), i;
	},
	createText: (e) => Xi.createTextNode(e),
	createComment: (e) => Xi.createComment(e),
	setText: (e, t) => {
		e.nodeValue = t;
	},
	setElementText: (e, t) => {
		e.textContent = t;
	},
	parentNode: (e) => e.parentNode,
	nextSibling: (e) => e.nextSibling,
	querySelector: (e) => Xi.querySelector(e),
	setScopeId(e, t) {
		e.setAttribute(t, "");
	},
	insertStaticContent(e, t, n, r, i, a) {
		let o = n ? n.previousSibling : t.lastChild;
		if (i && (i === a || i.nextSibling)) for (; t.insertBefore(i.cloneNode(!0), n), i !== a && (i = i.nextSibling););
		else {
			Zi.innerHTML = qi(r === "svg" ? `<svg>${e}</svg>` : r === "mathml" ? `<math>${e}</math>` : e);
			let i = Zi.content;
			if (r === "svg" || r === "mathml") {
				let e = i.firstChild;
				for (; e.firstChild;) i.appendChild(e.firstChild);
				i.removeChild(e);
			}
			t.insertBefore(i, n);
		}
		return [o ? o.nextSibling : t.firstChild, n ? n.previousSibling : t.lastChild];
	}
}, $i = /* @__PURE__ */ Symbol("_vtc");
function ea(e, t, n) {
	let r = e[$i];
	r && (t = (t ? [t, ...r] : [...r]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
var ta = /* @__PURE__ */ Symbol("_vod"), na = /* @__PURE__ */ Symbol("_vsh"), ra = {
	name: "show",
	beforeMount(e, { value: t }, { transition: n }) {
		e[ta] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : ia(e, t);
	},
	mounted(e, { value: t }, { transition: n }) {
		n && t && n.enter(e);
	},
	updated(e, { value: t, oldValue: n }, { transition: r }) {
		!t != !n && (r ? t ? (r.beforeEnter(e), ia(e, !0), r.enter(e)) : r.leave(e, () => {
			ia(e, !1);
		}) : ia(e, t));
	},
	beforeUnmount(e, { value: t }) {
		ia(e, t);
	}
};
function ia(e, t) {
	e.style.display = t ? e[ta] : "none", e[na] = !t;
}
var aa = /* @__PURE__ */ Symbol(""), oa = /(?:^|;)\s*display\s*:/;
function sa(e, t, n) {
	let r = e.style, i = g(n), a = !1;
	if (n && !i) {
		if (t) {
			if (g(t)) for (let e of t.split(";")) {
				let t = e.slice(0, e.indexOf(":")).trim();
				n[t] ?? la(r, t, "");
			}
			else for (let e in t) n[e] ?? la(r, e, "");
		}
		for (let i in n) {
			i === "display" && (a = !0);
			let o = n[i];
			o == null ? la(r, i, "") : pa(e, i, !g(t) && t ? t[i] : void 0, o) || la(r, i, o);
		}
	} else if (i) {
		if (t !== n) {
			let e = r[aa];
			e && (n += ";" + e), r.cssText = n, a = oa.test(n);
		}
	} else t && e.removeAttribute("style");
	ta in e && (i && t === n || (e[ta] = a ? r.display : ""), e[na] && (r.display = "none"));
}
var ca = /\s*!important$/;
function la(e, t, n) {
	if (d(n)) n.forEach((n) => la(e, t, n));
	else if (n ??= "", t.startsWith("--")) ca.test(n) ? e.setProperty(t, n.replace(ca, ""), "important") : e.setProperty(t, n);
	else {
		let r = fa(e, t);
		ca.test(n) ? e.setProperty(D(r), n.replace(ca, ""), "important") : e[r] = n;
	}
}
var ua = [
	"Webkit",
	"Moz",
	"ms"
], da = {};
function fa(e, t) {
	let n = da[t];
	if (n) return n;
	let r = E(t);
	if (r !== "filter" && r in e) return da[t] = r;
	r = re(r);
	for (let n = 0; n < ua.length; n++) {
		let i = ua[n] + r;
		if (i in e) return da[t] = i;
	}
	return t;
}
function pa(e, t, n, r) {
	return e.tagName === "TEXTAREA" && (t === "width" || t === "height") && g(r) && n === r;
}
var ma = "http://www.w3.org/1999/xlink";
function ha(e, t, n, r, i, a = ge(t)) {
	r && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(ma, t.slice(6, t.length)) : e.setAttributeNS(ma, t, n) : n == null || a && !_e(n) ? e.removeAttribute(t) : e.setAttribute(t, a ? "" : _(n) ? String(n) : n);
}
function ga(e, t, n, r, i) {
	if (t === "innerHTML" || t === "textContent") {
		n != null && (e[t] = t === "innerHTML" ? qi(n) : n);
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
		r === "boolean" ? n = _e(n) : n == null && r === "string" ? (n = "", o = !0) : r === "number" && (n = 0, o = !0);
	}
	try {
		e[t] = n;
	} catch {}
	o && e.removeAttribute(i || t);
}
function _a(e, t, n, r) {
	e.addEventListener(t, n, r);
}
function va(e, t, n, r) {
	e.removeEventListener(t, n, r);
}
var ya = /* @__PURE__ */ Symbol("_vei");
function ba(e, t, n, r, i = null) {
	let a = e[ya] || (e[ya] = {}), o = a[t];
	if (r && o) o.value = r;
	else {
		let [n, s] = Ca(t);
		r ? _a(e, n, a[t] = Da(r, i), s) : o && (va(e, n, o, s), a[t] = void 0);
	}
}
var xa = /(Once|Passive|Capture)$/, Sa = /^on:?(?:Once|Passive|Capture)$/;
function Ca(e) {
	let t, n;
	for (; (n = e.match(xa)) && !Sa.test(e);) t ||= {}, e = e.slice(0, e.length - n[1].length), t[n[1].toLowerCase()] = !0;
	return [e[2] === ":" ? e.slice(3) : D(e.slice(2)), t];
}
var wa = 0, Ta = /* @__PURE__ */ Promise.resolve(), Ea = () => wa ||= (Ta.then(() => wa = 0), Date.now());
function Da(e, t) {
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
	return n.value = e, n.attached = Ea(), n;
}
var Oa = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, ka = (e, t, n, r, i, s) => {
	let c = i === "svg";
	t === "class" ? ea(e, r, c) : t === "style" ? sa(e, n, r) : a(t) ? o(t) || ba(e, t, n, r, s) : (t[0] === "." ? (t = t.slice(1), 1) : t[0] === "^" ? (t = t.slice(1), 0) : Aa(e, t, r, c)) ? (ga(e, t, r), e.tagName.includes("-") || t !== "value" && t !== "checked" && t !== "selected" || ha(e, t, r, c, s, t !== "value")) : e._isVueCE && (ja(e, t) || e._def.__asyncLoader && (/[A-Z]/.test(t) || !g(r))) ? ga(e, E(t), r, s, t) : (t === "true-value" ? e._trueValue = r : t === "false-value" && (e._falseValue = r), ha(e, t, r, c));
};
function Aa(e, t, n, r) {
	if (r) return !!(t === "innerHTML" || t === "textContent" || t in e && Oa(t) && h(n));
	if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA") return !1;
	if (t === "width" || t === "height") {
		let t = e.tagName;
		if (t === "IMG" || t === "VIDEO" || t === "CANVAS" || t === "SOURCE") return !1;
	}
	return Oa(t) && g(n) ? !1 : t in e;
}
function ja(e, t) {
	let n = e._def.props;
	if (!n) return !1;
	let r = E(t);
	return Array.isArray(n) ? n.some((e) => E(e) === r) : Object.keys(n).some((e) => E(e) === r);
}
var Ma = (e) => {
	let t = e.props["onUpdate:modelValue"] || !1;
	return d(t) ? (e) => oe(t, e) : t;
};
function Na(e) {
	e.target.composing = !0;
}
function Pa(e) {
	let t = e.target;
	t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
var Fa = /* @__PURE__ */ Symbol("_assign"), Ia = /* @__PURE__ */ Symbol("_initialValue");
function La(e, t, n) {
	return t && (e = e.trim()), n && (e = ce(e)), e;
}
var Ra = {
	created(e, { modifiers: { lazy: t, trim: n, number: r } }, i) {
		e.parentNode && (e.type === "text" ? e[Ia] = e.defaultValue.replace(/[\r\n]/g, "") : e.type === "textarea" && (e[Ia] = e.defaultValue.replace(/\r\n?/g, "\n"))), e[Fa] = Ma(i);
		let a = r || i.props && i.props.type === "number";
		_a(e, t ? "change" : "input", (t) => {
			t.target.composing || e[Fa](La(e.value, n, a));
		}), (n || a) && _a(e, "change", () => {
			e.value = La(e.value, n, a);
		}), t || (_a(e, "compositionstart", Na), _a(e, "compositionend", Pa), _a(e, "change", Pa));
	},
	mounted(e, { value: t, modifiers: { trim: n, number: r } }) {
		let i = t ?? "", a = e[Ia];
		delete e[Ia], a !== void 0 && (e.type === "text" || e.type === "textarea") && e.value !== a ? e[Fa](La(e.value, n, r)) : e.value = i;
	},
	beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: r, trim: i, number: a } }, o) {
		if (e[Fa] = Ma(o), e.composing) return;
		let s = (a || e.type === "number") && !/^0\d/.test(e.value) ? ce(e.value) : e.value, c = t ?? "";
		if (s === c) return;
		let l = e.getRootNode();
		(l instanceof Document || l instanceof ShadowRoot) && l.activeElement === e && e.type !== "range" && (r && t === n || i && e.value.trim() === c) || (e.value = c);
	}
}, za = {
	deep: !0,
	created(e, t, n) {
		e[Fa] = Ma(n), _a(e, "change", () => {
			let t = e._modelValue, n = Wa(e), r = e.checked, i = e[Fa];
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
			} else i(Ga(e, r));
		});
	},
	mounted: Ba,
	beforeUpdate(e, t, n) {
		e[Fa] = Ma(n), Ba(e, t, n);
	}
};
function Ba(e, { value: t, oldValue: n }, r) {
	e._modelValue = t;
	let i;
	if (d(t)) i = Ce(t, r.props.value) > -1;
	else if (p(t)) i = t.has(r.props.value);
	else {
		if (t === n) return;
		i = Se(t, Ga(e, !0));
	}
	e.checked !== i && (e.checked = i);
}
var Va = {
	deep: !0,
	created(e, { value: t, modifiers: { number: n } }, r) {
		e._modelValue = t, _a(e, "change", () => {
			let t = Array.prototype.filter.call(e.options, (e) => e.selected).map((e) => n ? ce(Wa(e)) : Wa(e)), r = e.multiple, i = r ? p(e._modelValue) ? new Set(t) : t : t[0], a = e._pendingValue = [r, r ? d(i) ? t.slice() : t : i];
			try {
				e[Fa](i);
			} finally {
				_n(() => {
					e._pendingValue === a && (e._pendingValue = void 0);
				});
			}
		}), e[Fa] = Ma(r);
	},
	mounted(e, { value: t, modifiers: { number: n } }) {
		Ua(e, t, n);
	},
	beforeUpdate(e, { value: t }, n) {
		e._modelValue = t, e[Fa] = Ma(n);
	},
	updated(e, { value: t, modifiers: { number: n } }) {
		let r = e._pendingValue;
		e._pendingValue = void 0, r && r[0] === e.multiple && Ha(t, r[1], r[0]) || Ua(e, t, n);
	}
};
function Ha(e, t, n) {
	if (!n || d(e)) return Se(e, t);
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
					o.selected = e === "string" || e === "number" ? t.some((e) => String(e) === String(s)) : Ce(t, s) > -1;
				} else o.selected = t.has(s) || n && typeof s == "string" && t.has(ce(s));
			} else if (Se(Wa(o), t)) {
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
		let r = D(n.key);
		if (t.some((e) => e === r || Ja[e] === r)) return e(n);
	}));
}, Xa = /* @__PURE__ */ s({ patchProp: ka }, Qi), Za;
function Qa() {
	return Za ||= Hr(Xa);
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
function ro(e, t = {}) {
	let n = e.defaultView, r = new n.AbortController(), i = (e, t, n) => {
		e.addEventListener(t, n, { signal: r.signal });
	}, a = (t) => e.querySelector(t), o = (t) => [...e.querySelectorAll(t)], s = a(".shell"), c = e.documentElement, l = o("[data-resize-panel]"), u = {
		sidebar: [140, 360],
		papers: [200, 600],
		assistant: [260, 900]
	}, d = {
		sidebar: "--sidebar-width",
		papers: "--paper-list-width",
		assistant: "--assistant-width"
	}, f = {}, p = {}, m = null;
	function h(e) {
		for (let t of no) {
			let n = e[t];
			typeof n == "number" && Number.isFinite(n) && (f[t] = n);
		}
		b();
	}
	for (let e of no) {
		let n = t.widths?.[e];
		typeof n == "number" && Number.isFinite(n) && (f[e] = n);
	}
	let g = (e, t, n) => Math.min(n, Math.max(t, e)), _ = () => n.innerWidth >= 1700 ? {
		sidebar: 208,
		papers: 320,
		assistant: 380
	} : n.innerWidth <= 1250 ? {
		sidebar: 176,
		papers: 250,
		assistant: 310
	} : {
		sidebar: 196,
		papers: 300,
		assistant: 350
	}, v = () => n.innerWidth > 1050;
	function y(e) {
		let t = Object.entries(p).filter(([t]) => t !== e).reduce((e, [, t]) => e + t, 0);
		return [u[e][0], Math.max(u[e][0], Math.min(u[e][1], s.clientWidth - 240 - t))];
	}
	function b() {
		let e = _();
		p = Object.fromEntries(no.map((t) => [t, g(f[t] ?? e[t], u[t][0], u[t][1])]));
		let t = s.clientWidth - 240, n = no.reduce((e, t) => e + u[t][0], 0), r = no.reduce((e, t) => e + p[t], 0);
		if (v() && r > t) {
			let e = g((t - n) / (r - n || 1), 0, 1);
			for (let t of no) p[t] = u[t][0] + Math.floor((p[t] - u[t][0]) * e);
		}
		for (let [e, t] of Object.entries(p)) c.style.setProperty(d[e], `${t}px`);
		for (let e of l) {
			let t = e.dataset.resizePanel, [n, r] = y(t);
			e.setAttribute("aria-valuemin", String(n)), e.setAttribute("aria-valuemax", String(Math.round(r))), e.setAttribute("aria-valuenow", String(Math.round(p[t]))), e.setAttribute("aria-valuetext", `${Math.round(p[t])} 像素`);
		}
	}
	function x() {
		t.onSave?.({ ...p });
	}
	function S(t = !1) {
		if (!m) return;
		let n = m;
		m = null, t && (f = n.previous), n.shield.remove(), n.handle.removeAttribute("data-dragging"), e.body.classList.remove("resizing-panels"), n.handle.hasPointerCapture(n.pointerId) && n.handle.releasePointerCapture(n.pointerId), b(), t || x();
	}
	for (let t of l) {
		let n = t.dataset.resizePanel;
		i(t, "pointerdown", (r) => {
			let i = r;
			if (i.button !== 0 || !v() || m) return;
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
				bounds: y(n),
				shield: a
			}, t.setAttribute("data-dragging", ""), e.body.classList.add("resizing-panels"), t.setPointerCapture(i.pointerId);
		}), i(t, "lostpointercapture", () => S()), i(t, "dblclick", () => {
			v() && (S(), delete f[n], b(), x());
		}), i(t, "keydown", (e) => {
			let t = e;
			if (!v() || m || ![
				"ArrowLeft",
				"ArrowRight",
				"Home",
				"End"
			].includes(t.key)) return;
			t.preventDefault();
			let [r, i] = y(n), a = t.shiftKey ? 48 : 16, o = t.key === "Home" ? r : t.key === "End" ? i : p[n] + (t.key === "ArrowRight" ? a : -a);
			f = {
				...p,
				[n]: g(o, r, i)
			}, b(), x();
		});
	}
	return i(e, "pointermove", (e) => {
		let t = e;
		if (!m || t.pointerId !== m.pointerId) return;
		let n = (t.clientX - m.x) * (m.key === "assistant" ? -1 : 1);
		f = {
			...m.startWidths,
			[m.key]: g(m.width + n, m.bounds[0], m.bounds[1])
		}, b();
	}), i(e, "pointerup", (e) => {
		e.pointerId === m?.pointerId && S();
	}), i(e, "pointercancel", (e) => {
		e.pointerId === m?.pointerId && S(!0);
	}), i(e, "keydown", (e) => {
		e.key === "Escape" && m && (e.preventDefault(), S(!0));
	}), i(n, "blur", () => S()), i(n, "resize", () => {
		S(), b();
	}), i(n, "pagehide", () => S()), b(), {
		setWidths: h,
		dispose: () => {
			S(), r.abort();
		}
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
	trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6",
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
}, vo = ["d"], Q = /* @__PURE__ */ z({
	__name: "Icon",
	props: { name: {} },
	setup(e) {
		return (t, n) => (H(), U("svg", _o, [W("path", { d: I(io)[e.name ?? "book"] || I(io).book }, null, 8, vo)]));
	}
}), yo = [
	"data-resize-panel",
	"aria-label",
	"aria-controls",
	"title"
], bo = /* @__PURE__ */ z({
	__name: "PanelHandle",
	props: { kind: {} },
	setup(e) {
		let t = e, n = {
			sidebar: ["navigation-panel", "分类栏"],
			papers: ["paper-panel", "文献列表"],
			assistant: ["assistant-panel", "助手栏"]
		}, r = J(() => n[t.kind]);
		return (e, n) => (H(), U("div", {
			class: O(["panel-resizer", { "panel-resizer-left": t.kind === "assistant" }]),
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
}, jo = ["onClick"], Mo = ["title"], No = { class: "cat-count" }, Po = ["disabled", "onClick"], Fo = /* @__PURE__ */ z({
	__name: "Sidebar",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = J(() => {
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
		}), i = (e) => e.replace(/^\d+_/, "").replaceAll("_", " "), a = /* @__PURE__ */ F(!1), o = /* @__PURE__ */ F(null), s = /* @__PURE__ */ F(""), c = /* @__PURE__ */ F(!1), l = /* @__PURE__ */ F(null), u = (e) => {
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
		return (e, o) => (H(), U("aside", xo, [
			W("a", So, [W("span", Co, [G(Q)]), o[4] ||= W("span", null, "Zhiyue", -1)]),
			W("nav", wo, [W("button", {
				class: O(["nav-item", { active: I(n).view === "library" }]),
				"data-view": "library",
				onClick: o[0] ||= (e) => I(t).setView("library")
			}, [
				G(Q, { name: "library" }),
				o[5] ||= K("文献 ", -1),
				W("span", To, k(I(n).papers.length), 1)
			], 2), W("button", {
				class: O(["nav-item", { active: I(n).view === "downloads" }]),
				"data-view": "downloads",
				onClick: o[1] ||= (e) => I(t).setView("downloads")
			}, [G(Q, { name: "download" }), o[6] ||= K("下载任务 ", -1)], 2)]),
			W("div", Eo, [o[7] ||= W("span", { class: "section-label" }, "分类", -1), W("button", {
				class: "category-add",
				type: "button",
				title: "新建文件夹",
				"aria-label": "新建文件夹",
				disabled: c.value,
				onClick: p
			}, [G(Q, { name: "plus" })], 8, Do)]),
			W("div", Oo, [a.value ? (H(), U("form", {
				key: 0,
				class: "category-editor",
				onSubmit: Y(_, ["prevent"])
			}, [R(W("input", {
				ref: u,
				"onUpdate:modelValue": o[2] ||= (e) => s.value = e,
				maxlength: "60",
				placeholder: "文件夹名称",
				"aria-label": "文件夹名称",
				onKeydown: Ya(h, ["esc"]),
				onBlur: h
			}, null, 544), [[Ra, s.value]])], 32)) : q("", !0), (H(!0), U(V, null, B(r.value, (e) => (H(), U(V, { key: `${e.category}/${e.child}` }, [g(e) ? (H(), U("form", {
				key: 0,
				class: O(["category-editor", { "category-child": e.child }]),
				onSubmit: Y((t) => v(e), ["prevent"])
			}, [R(W("input", {
				ref_for: !0,
				ref: u,
				"onUpdate:modelValue": o[3] ||= (e) => s.value = e,
				maxlength: "60",
				placeholder: "文件夹名称",
				"aria-label": "文件夹名称",
				onKeydown: Ya(h, ["esc"]),
				onBlur: h
			}, null, 544), [[Ra, s.value]])], 42, ko)) : (H(), U("div", Ao, [W("button", {
				class: O(["category-button", {
					"category-child": e.child,
					active: I(n).category === e.category && I(n).subcategory === e.child
				}]),
				onClick: (t) => d(e)
			}, [
				e.child ? q("", !0) : (H(), ui(Q, {
					key: 0,
					name: "folder"
				})),
				W("span", {
					class: "cat-name",
					title: i(e.label)
				}, k(i(e.label)), 9, Mo),
				W("span", No, k(e.count), 1)
			], 10, jo), e.category ? (H(), U("button", {
				key: 0,
				class: "category-action",
				type: "button",
				title: "重命名文件夹",
				"aria-label": "重命名文件夹",
				disabled: c.value,
				onClick: (t) => m(e)
			}, [G(Q, { name: "edit" })], 8, Po)) : q("", !0)]))], 64))), 128))]),
			o[8] ||= W("div", { class: "sidebar-bottom" }, [W("span", { class: "workspace-dot" }), W("span", null, "本地工作区")], -1),
			G(bo, { kind: "sidebar" })
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
}, os = /* @__PURE__ */ z({
	__name: "PaperList",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = J(() => [...new Set(n.papers.map((e) => e.year).filter(Boolean).map(String))].sort((e, t) => (Number(t) || 0) - (Number(e) || 0))), i = J(() => !!(n.query.trim() || n.year || n.read || n.starred)), a = J(() => i.value ? "没有匹配的文献" : n.category ? "这个文件夹还没有文献" : "文献库还没有文献"), o = J(() => {
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
		return (e, s) => (H(), U("section", Io, [
			W("div", Lo, [
				W("label", Ro, [
					G(Q, { name: "search" }),
					R(W("input", {
						id: "search",
						"onUpdate:modelValue": s[0] ||= (e) => I(n).query = e,
						type: "search",
						placeholder: "搜索题名、作者、编号…",
						"aria-label": "搜索文献"
					}, null, 512), [[Ra, I(n).query]]),
					s[9] ||= W("kbd", null, "/", -1)
				]),
				W("div", zo, [
					R(W("select", {
						id: "year-filter",
						"onUpdate:modelValue": s[1] ||= (e) => I(n).year = e,
						"aria-label": "按年份筛选"
					}, [s[10] ||= W("option", { value: "" }, "全部年份", -1), (H(!0), U(V, null, B(r.value, (e) => (H(), U("option", { key: e }, k(e), 1))), 128))], 512), [[Va, I(n).year]]),
					R(W("select", {
						id: "read-filter",
						"onUpdate:modelValue": s[2] ||= (e) => I(n).read = e,
						"aria-label": "按阅读状态筛选"
					}, [s[11] ||= W("option", { value: "" }, "全部进度", -1), (H(!0), U(V, null, B(I(ho), (e, t) => (H(), U("option", {
						key: t,
						value: t
					}, k(e), 9, Bo))), 128))], 512), [[Va, I(n).read]]),
					W("button", {
						id: "star-filter",
						class: O(["icon-button", { selected: I(n).starred }]),
						title: "仅看收藏",
						"aria-label": "仅看收藏",
						"aria-pressed": I(n).starred,
						onClick: s[3] ||= (e) => I(n).starred = !I(n).starred
					}, [G(Q, { name: "star" })], 10, Vo)
				]),
				W("div", Ho, [W("div", Uo, [W("span", Wo, k(I(n).libraryError ? "加载失败" : `${o.value.length} 篇文献`), 1), R(W("select", {
					id: "sort",
					"onUpdate:modelValue": s[4] ||= (e) => I(n).sort = e,
					"aria-label": "排序"
				}, [...s[12] ||= [
					W("option", { value: "id" }, "编号顺序", -1),
					W("option", { value: "year-desc" }, "年份从新到旧", -1),
					W("option", { value: "year-asc" }, "年份从旧到新", -1),
					W("option", { value: "title" }, "题名顺序", -1)
				]], 512), [[Va, I(n).sort]])]), W("div", Go, [W("button", {
					id: "import-paper",
					class: "list-action",
					title: "从本机导入 PDF 并归档",
					onClick: s[5] ||= (e) => I(n).importOpen = !0
				}, [G(Q, { name: "upload" }), s[13] ||= W("span", null, "导入 PDF", -1)]), W("button", {
					id: "refresh-catalog",
					class: O(["icon-button compact", { refreshing: I(n).refreshing }]),
					title: "重新扫描目录并更新索引",
					"aria-label": "刷新索引",
					disabled: I(n).refreshing,
					onClick: s[6] ||= (...e) => I(t).refreshCatalog && I(t).refreshCatalog(...e)
				}, [G(Q, { name: "refresh" })], 10, Ko)])])
			]),
			W("div", qo, [I(n).libraryError ? (H(), U("div", Jo, [W("p", Yo, k(I(n).libraryError), 1), W("button", {
				class: "button subtle",
				onClick: s[7] ||= (...e) => I(t).loadLibrary && I(t).loadLibrary(...e)
			}, "重新连接")])) : (H(!0), U(V, { key: 1 }, B(o.value, (e) => (H(), U("article", {
				key: e.literature_id,
				class: O(["paper-card", { active: I(n).current === e.literature_id }]),
				"data-paper": e.literature_id,
				tabindex: "0",
				"aria-label": I(co)(e),
				"aria-current": I(n).current === e.literature_id,
				onClick: (n) => I(t).selectPaper(e.literature_id),
				onKeydown: [Ya(Y((n) => I(t).selectPaper(e.literature_id), ["self", "prevent"]), ["enter"]), Ya(Y((n) => I(t).selectPaper(e.literature_id), ["self", "prevent"]), ["space"])]
			}, [
				W("div", Zo, [
					W("span", Qo, k(e.literature_id), 1),
					W("span", null, "· " + k(e.year || "年份待核实"), 1),
					W("button", {
						class: O(["icon-button", { selected: e.starred }]),
						"aria-pressed": !!e.starred,
						title: e.starred ? "取消收藏" : "收藏论文",
						"aria-label": e.starred ? "取消收藏" : "收藏论文",
						disabled: I(n).pendingPatches.has(e.literature_id),
						onClick: Y((n) => I(t).patchPaper(e.literature_id, { starred: !e.starred }), ["stop"])
					}, [G(Q, { name: "star" })], 10, $o)
				]),
				W("h3", null, k(I(co)(e)), 1),
				W("div", {
					class: "paper-authors",
					title: I(lo)(e)
				}, k(I(lo)(e)), 9, es),
				W("div", ts, [W("span", {
					class: "tag",
					title: String(e.subcategory || e.venue || "")
				}, k(String(e.subcategory || e.venue || e.category || "未分类").replace(/^\d+_/, "")), 9, ns), W("span", { class: O(I(go)(e.readStatus)) }, [s[14] ||= W("i", { class: "read-dot" }, null, -1), K(k(I(ho)[I(go)(e.readStatus)]), 1)], 2)])
			], 42, Xo))), 128)), !I(n).libraryError && !o.value.length ? (H(), U("div", rs, [
				!i.value && !I(n).category ? (H(), U("span", is, [G(Q, { name: "library" })])) : q("", !0),
				W("p", null, k(a.value), 1),
				i.value || I(n).category ? (H(), U("div", as, [W("button", {
					id: "reset-filters",
					class: "button subtle",
					onClick: s[8] ||= (...e) => I(t).resetFilters && I(t).resetFilters(...e)
				}, k(i.value ? "清除筛选" : "查看全部文献"), 1)])) : q("", !0)
			])) : q("", !0)]),
			G(bo, { kind: "papers" })
		]));
	}
});
// app/web/frontend/lib/reader.ts
function ss({ state: e, api: t, toast: n, patchPaper: r, deleteNote: i, setPanel: a, setDraft: o, scope: s }) {
	let c = (e) => s.querySelector(e), l = (e) => [...s.querySelectorAll(e)], u = () => e.papers.find((t) => t.literature_id === e.current), d = s.ownerDocument.defaultView, f = new d.AbortController();
	function p() {
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
	function m() {
		let t = c("#pdf-controls");
		if (!t) return;
		let n = e.pdfSession?.textLayers.get(e.pdfPage)?.data, r = n ? n.error ? "文字层不可用" : n.hasText ? "可选中文字并按 Ctrl+C" : "本页无文字层" : "正在加载文字层…";
		t.innerHTML = `<button class="icon-button" data-pdf-step="-1" aria-label="上一页" title="上一页" ${e.pdfPage <= 1 || e.previewLoading ? "disabled" : ""}>‹</button><label class="pdf-page-label">PDF 物理页 <input id="pdf-page" type="number" min="1" ${e.pdfTotal ? `max="${e.pdfTotal}"` : ""} value="${e.pdfPage}" aria-label="PDF物理页序"></label><span class="pdf-total">/ ${e.pdfTotal || "…"}</span><button class="icon-button" data-pdf-step="1" aria-label="下一页" title="下一页" ${!e.pdfTotal || e.pdfPage >= e.pdfTotal || e.previewLoading ? "disabled" : ""}>›</button><span class="pdf-control-divider"></span><button class="icon-button" data-pdf-zoom="-50" aria-label="缩小" title="缩小" ${e.pdfZoom <= 100 ? "disabled" : ""}>−</button><button class="text-button pdf-zoom" id="pdf-fit" title="适合宽度">${e.pdfZoom === 100 ? "适宽 100%" : e.pdfZoom + "%"}</button><button class="icon-button" data-pdf-zoom="50" aria-label="放大" title="放大" ${e.pdfZoom >= 200 ? "disabled" : ""}>＋</button><button class="button subtle pdf-copy-page" id="copy-pdf-page" ${n?.hasText ? "" : "disabled"}>复制本页文字</button><span class="pdf-text-status" title="${X(n?.error || (n?.hasText ? "" : "扫描页或无文字内容的页面需要 OCR 才能复制。"))}">${X(r)}</span>`;
	}
	async function h() {
		let t = u(), n = Array.isArray(t?.notes) ? t.notes : [], r = n.find((t) => t.path === e.notePath) ?? n[0];
		if (!t || !r) return;
		let a = r.title || r.path.split(/[\\/]/).pop() || r.path;
		d.confirm(`删除笔记“${a}”？\n\n文件会移到文献库的 .zhiyue/trash/notes/，需要时可以手动找回。`) && await i(r.path) && ne();
	}
	async function g() {
		let t = e.pdfSession?.textLayers.get(e.pdfPage)?.data.text;
		if (t) try {
			await navigator.clipboard.writeText(t), n("本页文字已复制");
		} catch {
			n("无法访问剪贴板，请在页面选中文字后按 Ctrl+C。", !0);
		}
	}
	function _(t) {
		let r = Number(t);
		if (!Number.isInteger(r) || r < 1 || e.pdfTotal && r > e.pdfTotal) {
			n("请输入有效的 PDF 物理页序。"), m();
			return;
		}
		let i = e.pdfSession, a = i?.pages.get(r);
		i && a ? (e.pdfPage = r, i.root.scrollTop = Math.max(0, a.offsetTop - 24), i.manualPage = {
			page: r,
			scrollTop: i.root.scrollTop
		}, m(), T(i), ee(i, r, !0)) : r !== e.pdfPage && (e.pdfPage = r, ne());
	}
	function v(t) {
		let n = e.pdfSession, r = n?.pages.get(e.pdfPage), i = n && r ? (n.root.scrollTop - r.offsetTop) / r.offsetHeight : 0;
		e.pdfZoom = Math.max(100, Math.min(200, e.pdfZoom + t));
		for (let t of l(".pdf-page-sheet")) t.style.width = `${e.pdfZoom}%`, t.style.setProperty("--pdf-zoom", String(e.pdfZoom / 100));
		n && x(n), n && r && (n.root.scrollTop = r.offsetTop + i * r.offsetHeight, n.manualPage && (n.manualPage.scrollTop = n.root.scrollTop), T(n)), m();
	}
	function y(t) {
		return !t.disposed && e.pdfSession === t && e.noteEpoch === t.epoch;
	}
	async function b(e, n) {
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
			if (!y(e) || r.signal.aborted) throw new DOMException("已停止加载", "AbortError");
			a = URL.createObjectURL(c);
			let l = new Image();
			if (l.className = "pdf-page-image", l.alt = "", l.setAttribute("aria-hidden", "true"), l.draggable = !1, l.src = a, await l.decode(), !y(e) || r.signal.aborted) throw new DOMException("已停止加载", "AbortError");
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
	function x(e) {
		for (let [t, { data: n, element: r }] of e.textLayers) {
			let i = e.pages.get(t);
			r && i && (r.style.transform = `scale(${i.clientWidth / n.width},${i.clientHeight / n.height})`);
		}
	}
	function S(e, t, n) {
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
		}), x(e);
	}
	function C(e) {
		if (!e) return !1;
		let t = document.getSelection();
		if (!t || t.isCollapsed) return !1;
		for (let n = 0; n < t.rangeCount; n++) if (t.getRangeAt(n).intersectsNode(e)) return !0;
		return !1;
	}
	function w(t, n, { img: r, url: i, textLayer: a }) {
		if (!y(t)) {
			URL.revokeObjectURL(i);
			return;
		}
		let o = t.pages.get(n);
		if (!o) {
			URL.revokeObjectURL(i);
			return;
		}
		let s = o.offsetHeight, c = o.offsetTop + s < t.root.scrollTop;
		o.style.aspectRatio = `${r.naturalWidth} / ${r.naturalHeight}`, o.replaceChildren(r), o.dataset.loaded = "true", S(t, n, a), t.urls.set(n, i), t.errors.delete(n), c && (t.root.scrollTop += o.offsetHeight - s, t.manualPage && (t.manualPage.scrollTop = t.root.scrollTop)), n === e.pdfPage && m(), T(t);
	}
	function ee(e, t, n = !1) {
		!y(e) || !e.pages.has(t) || e.urls.has(t) || e.controllers.has(t) || e.errors.has(t) || (e.queue.includes(t) || (n ? e.queue.unshift(t) : e.queue.push(t)), te(e));
	}
	function te(t) {
		if (y(t)) for (t.queue = t.queue.filter((t) => Math.abs(t - e.pdfPage) <= 3), t.queue.sort((t, n) => Math.abs(t - e.pdfPage) - Math.abs(n - e.pdfPage)); t.running < 2 && t.queue.length;) {
			let e = t.queue.shift();
			t.urls.has(e) || t.controllers.has(e) || (t.running++, b(t, e).then((n) => w(t, e, n)).catch((n) => {
				if (!y(t) || n.name === "AbortError") return;
				t.errors.add(e);
				let r = t.pages.get(e);
				r && (r.innerHTML = `<div class="pdf-page-placeholder"><span>第 ${e} 页加载失败</span><small>${X(n.message)}</small><button class="button subtle" data-pdf-retry="${e}">重试第 ${e} 页</button></div>`);
			}).finally(() => {
				t.running--, y(t) && (te(t), T(t));
			}));
		}
	}
	function T(t) {
		y(t) && !t.frame && (t.frame = requestAnimationFrame(() => {
			if (t.frame = null, !y(t) || !t.pages.size || !t.root.clientHeight || !t.root.clientWidth) return;
			let n = t.root.scrollTop + Math.min(t.root.clientHeight * .3, 200), r = 1, i = t.pages.size;
			for (; r < i;) {
				let e = Math.floor((r + i) / 2), a = t.pages.get(e);
				!a || a.offsetTop + a.offsetHeight < n ? r = e + 1 : i = e;
			}
			t.manualPage && Math.abs(t.root.scrollTop - t.manualPage.scrollTop) < 2 ? r = t.manualPage.page : (t.manualPage = null, t.root.scrollTop > 0 && t.root.scrollTop + t.root.clientHeight >= t.root.scrollHeight - 2 && (r = t.pages.size));
			let a = e.pdfPage !== r;
			e.pdfPage = r, a && m();
			let o = s.querySelector("#pdf-page");
			o && document.activeElement !== o && (o.value = String(r));
			for (let t of l("[data-pdf-step]")) t.disabled = Number(t.dataset.pdfStep) < 0 ? r <= 1 : r >= e.pdfTotal;
			let c = t.pages.get(r);
			c && (t.anchor = {
				page: r,
				offset: (t.root.scrollTop - c.offsetTop) / c.offsetHeight
			});
			for (let e of [
				r,
				r + 1,
				r - 1
			]) ee(t, e, !0);
			for (let [e, n] of t.urls) if (Math.abs(e - r) > 3) {
				let r = t.pages.get(e);
				if (!r || C(r)) continue;
				r.innerHTML = `<div class="pdf-page-placeholder">第 ${e} 页</div>`, delete r.dataset.loaded, URL.revokeObjectURL(n), t.urls.delete(e), t.textLayers.delete(e);
			}
			for (let [e, n] of t.controllers) Math.abs(e - r) > 3 && n.abort();
		}));
	}
	async function E(t, n) {
		let r = c("#reader-content"), i = {
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
		e.pdfSession = Gt(i), e.previewLoading = !0;
		let a = e.pdfPage;
		m(), r.innerHTML = `<div class="loading"><span class="busy-spinner"></span>正在加载 PDF 第 ${a} 页…</div>`;
		try {
			let t = await b(i, a);
			if (!y(i)) {
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
			r.replaceChildren(n), r.scrollLeft = 0, w(i, a, t), r.scrollTop = Math.max(0, i.pages.get(a).offsetTop - 24), i.manualPage = {
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
				t && (i.zoomDelta -= t * 100, v(t < 0 ? 10 * -t : -10 * t));
			}, r.addEventListener("wheel", i.onZoomWheel, { passive: !1 }), i.observer = new IntersectionObserver((e) => {
				for (let t of e) t.isIntersecting && ee(i, Number(t.target.dataset.pdfPage));
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
					if (x(i), (s || e !== o) && i.anchor) {
						let e = i.pages.get(i.anchor.page);
						e && (r.scrollTop = e.offsetTop + i.anchor.offset * e.offsetHeight), i.manualPage && (i.manualPage.scrollTop = r.scrollTop);
					}
					s = !1, o = e, T(i);
				}
			}), i.resizeObserver.observe(r), T(i);
		} catch (e) {
			if (!y(i)) return;
			let t = e;
			r.innerHTML = `<div class="empty"><h2>页面预览暂不可用</h2><p class="error-text">${X(t.name === "AbortError" ? "预览请求超时，请重试。" : t.message)}</p><button id="retry-preview" class="button subtle">重新加载第 ${a} 页</button><p>也可使用工具栏的“单独打开”查看原 PDF。</p></div>`;
		} finally {
			y(i) && (e.previewLoading = !1, m());
		}
	}
	function ne() {
		let n = u();
		if (!n) {
			p(), c("#reader-header").innerHTML = "<span class=\"muted\">阅读</span>", c("#reader-toolbar").hidden = !0, c("#reader-content").innerHTML = `<div class="empty reader-empty"><span class="empty-art">${ao("book")}</span><h2>选择论文</h2><p>从左侧选择，查看原文或笔记。</p></div>`;
			return;
		}
		let r = ++e.noteEpoch;
		p(), c("#reader-header").innerHTML = `<div class="reader-heading"><h2>${X(co(n))}</h2><div class="reader-meta">${X(n.literature_id)} · ${X(n.year || "年份待核实")} · ${X(n.pages ? n.pages + " 页" : "页数待核实")}<br>${X(lo(n))}</div></div><select id="paper-read-status" aria-label="标记阅读进度">${Object.entries(ho).map(([e, t]) => `<option value="${e}" ${go(n.readStatus) === e ? "selected" : ""}>${t}</option>`).join("")}</select>`;
		let i = Array.isArray(n.notes) ? n.notes : [], a = i.some((t) => t.path === e.notePath) ? e.notePath : i[0]?.path ?? "", o = e.readerMode === "note" && a ? `<button id="delete-note" class="icon-button danger" aria-label="删除当前笔记" title="删除当前笔记" ${e.noteDeleting ? "disabled" : ""}>${ao("trash")}</button>` : "";
		c("#reader-toolbar").hidden = !1, c("#reader-toolbar").innerHTML = `<div class="segmented"><button data-reader-mode="pdf" class="${e.readerMode === "pdf" ? "active" : ""}">原文 PDF</button><button data-reader-mode="note" class="${e.readerMode === "note" ? "active" : ""}">阅读笔记 <small>${i.length}</small></button></div>${e.readerMode === "pdf" && n.file ? `<select id="pdf-renderer" aria-label="PDF显示方式"><option value="preview" ${e.pdfBrowser ? "" : "selected"}>连续阅读</option><option value="browser" ${e.pdfBrowser ? "selected" : ""}>浏览器阅读器</option></select>` : ""}${e.readerMode === "note" && i.length ? `<select id="note-select" aria-label="选择笔记">${i.map((e) => `<option value="${X(e.path)}" ${e.path === a ? "selected" : ""}>${X(e.title || e.path.split(/[\\/]/).pop())}</option>`).join("")}</select>${o}` : ""}${n.file ? `<a class="open-original" href="${X(so(n.file))}" target="_blank" rel="noopener noreferrer">单独打开${ao("external")}</a>` : ""}${e.readerMode === "pdf" && n.file && !e.pdfBrowser ? "<div id=\"pdf-controls\" class=\"pdf-controls\" role=\"group\" aria-label=\"PDF翻页与缩放\"></div>" : ""}`, e.readerMode === "pdf" ? n.file ? e.pdfBrowser ? c("#reader-content").innerHTML = `<iframe class="pdf-frame" title="${X(co(n))} PDF原文" src="${X(so(n.file))}"></iframe>` : E(n, r) : c("#reader-content").innerHTML = "<div class=\"empty\"><p>该条目尚无可用原文文件。</p></div>" : i.length ? (e.notePath = i.some((t) => t.path === e.notePath) ? e.notePath : i[0]?.path ?? "", c("#reader-content").innerHTML = "<div class=\"loading\"><span class=\"busy-spinner\"></span>正在读取笔记…</div>", t(`/api/text?path=${encodeURIComponent(e.notePath)}`).then((t) => {
			r === e.noteEpoch && (c("#reader-content").innerHTML = `<article class="note-document markdown">${mo(t.text, e.notePath)}</article>`);
		}).catch((t) => {
			r === e.noteEpoch && (c("#reader-content").innerHTML = `<div class="empty"><p class="error-text">${X(t.message)}</p><button id="retry-note" class="button subtle">重试</button></div>`);
		})) : c("#reader-content").innerHTML = "<div class=\"empty\"><h2>阅读笔记尚待积累</h2><p>可以向研究助手提问，整理阅读笔记。</p><button id=\"ask-note\" class=\"button subtle\">请助手帮我精读</button></div>";
	}
	return s.addEventListener("click", (t) => {
		let n = t.target.closest("button");
		if (n) {
			if (n.dataset.readerMode && (e.readerMode = n.dataset.readerMode), n.dataset.pdfStep && _(e.pdfPage + Number(n.dataset.pdfStep)), n.dataset.pdfZoom && v(Number(n.dataset.pdfZoom)), n.id === "pdf-fit" && v(100 - e.pdfZoom), n.id === "copy-pdf-page" && g(), n.id === "delete-note" && h(), ["retry-preview", "retry-note"].includes(n.id) && ne(), n.dataset.pdfRetry && e.pdfSession) {
				let t = Number(n.dataset.pdfRetry);
				e.pdfSession.errors.delete(t), ee(e.pdfSession, t, !0);
			}
			n.id === "ask-note" && (o("请精读当前论文，解释核心方法、证据和局限，给出原文定位，并整理阅读笔记。"), a("chat"));
		}
	}, { signal: f.signal }), s.addEventListener("change", (t) => {
		let n = t.target;
		if (n.id === "paper-read-status") {
			let t = e.current;
			if (!t) return;
			n.disabled = !0, r(t, { readStatus: n.value }).then((r) => {
				!r && e.current === t && (n.value = go(u()?.readStatus)), n.disabled = !1;
			});
		}
		n.id === "note-select" && (e.notePath = n.value), n.id === "pdf-renderer" && (e.pdfBrowser = n.value === "browser"), n.id === "pdf-page" && _(n.value);
	}, { signal: f.signal }), s.addEventListener("keydown", (e) => {
		let t = e.target;
		t.id === "pdf-page" && e.key === "Enter" && (e.preventDefault(), _(t.value));
	}, { signal: f.signal }), d.addEventListener("pagehide", () => {
		++e.noteEpoch, p();
	}, { signal: f.signal }), d.addEventListener("pageshow", (t) => {
		t.persisted && u() && e.readerMode === "pdf" && ne();
	}, { signal: f.signal }), {
		render: ne,
		dispose: () => {
			++e.noteEpoch, p(), f.abort();
		}
	};
}
// app/web/frontend/components/ReaderPane.vue
var cs = /* @__PURE__ */ z({
	__name: "ReaderPane",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ F(null), i;
		return tr(() => {
			r.value && (i = ss({
				state: n,
				scope: r.value,
				api: t.api,
				toast: t.toast,
				patchPaper: t.patchPaper,
				deleteNote: t.deleteNote,
				setPanel: t.setPanel,
				setDraft: t.setDraft
			}), i.render());
		}), Ln([
			() => t.currentPaper.value?.file,
			() => n.current,
			() => n.readerMode,
			() => n.notePath,
			() => n.pdfBrowser
		], () => i?.render(), { flush: "post" }), nr(() => i?.dispose()), (e, t) => (H(), U("section", {
			ref_key: "scope",
			ref: r,
			class: "reader-panel",
			"aria-label": "阅读区"
		}, [...t[0] ||= [
			W("div", {
				id: "reader-header",
				class: "reader-header"
			}, null, -1),
			W("div", {
				id: "reader-toolbar",
				class: "reader-toolbar",
				hidden: ""
			}, null, -1),
			W("div", {
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
}, ms = /* @__PURE__ */ z({
	__name: "ModelPicker",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ F(!1), i = /* @__PURE__ */ F(""), a = /* @__PURE__ */ F(null), o = /* @__PURE__ */ F(null), s = /* @__PURE__ */ F(null), c = J(() => [{
			id: "",
			label: "默认模型"
		}, ...t.models.value]), l = J(() => c.value.filter((e) => `${e.label} ${e.id}`.toLocaleLowerCase().includes(i.value.trim().toLocaleLowerCase()))), u = J(() => c.value.find((e) => e.id === n.model) || c.value[0]), d = J(() => t.busy.value || n.creating || t.agent.value.available !== !0 || !t.models.value.length);
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
		return tr(() => {
			document.addEventListener("pointerdown", g), document.addEventListener("focusin", g);
		}), nr(() => {
			document.removeEventListener("pointerdown", g), document.removeEventListener("focusin", g);
		}), (e, t) => (H(), U(V, null, [W("button", {
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
		}, [W("span", us, k(u.value.label.replace(/ · 默认$/, "").split(" · ")[0]), 1), G(Q, { name: "chevron" })], 8, ls), r.value ? (H(), U("div", {
			key: 0,
			id: "model-menu",
			class: "model-menu",
			onKeydown: h
		}, [W("div", ds, [G(Q, { name: "search" }), R(W("input", {
			id: "model-search",
			ref_key: "search",
			ref: o,
			"onUpdate:modelValue": t[0] ||= (e) => i.value = e,
			type: "search",
			placeholder: "搜索模型",
			"aria-label": "搜索模型",
			"aria-controls": "model-list",
			autocomplete: "off"
		}, null, 512), [[Ra, i.value]])]), W("div", {
			id: "model-list",
			ref_key: "list",
			ref: s,
			class: "model-list",
			role: "listbox",
			"aria-label": "模型"
		}, [(H(!0), U(V, null, B(l.value, (e) => (H(), U("button", {
			key: e.id,
			type: "button",
			role: "option",
			tabindex: "-1",
			class: "model-option",
			"data-model-value": e.id,
			"aria-selected": e.id === I(n).model,
			title: e.id || e.label,
			onClick: (t) => m(e.id)
		}, [W("span", null, k(e.label.replace(/ · 默认$/, "")), 1), e.id === I(n).model ? (H(), ui(Q, {
			key: 0,
			name: "check"
		})) : q("", !0)], 8, fs))), 128)), l.value.length ? q("", !0) : (H(), U("div", ps, "未找到模型"))], 512)], 32)) : q("", !0)], 64));
	}
}), hs = {
	key: 0,
	id: "command-menu",
	class: "command-menu",
	role: "listbox",
	"aria-label": "斜杠命令"
}, gs = [
	"data-command",
	"aria-selected",
	"title",
	"onMouseenter",
	"onClick"
], _s = { class: "command-name" }, vs = { class: "command-source" }, ys = { class: "command-desc" }, bs = /* @__PURE__ */ z({
	__name: "CommandMenu",
	props: {
		draft: {},
		canSend: { type: Boolean }
	},
	setup(e, { expose: t }) {
		let n = e, r = Pn("workspace").state, i = /* @__PURE__ */ F(0), a = /* @__PURE__ */ F(null), o = /* @__PURE__ */ F(null), s = J(() => {
			let e = n.draft;
			return e === o.value || !e.startsWith("/") || e.includes("\n") || /\s/.test(e) ? null : e.slice(1).toLocaleLowerCase();
		}), c = J(() => {
			let e = s.value;
			if (e === null) return [];
			let t = r.commands;
			return e ? t.filter((t) => {
				let n = t.name.toLocaleLowerCase();
				return n.startsWith(e) || n.includes(`:${e}`) || t.description.includes(e);
			}) : t;
		}), l = J(() => s.value !== null && c.value.length > 0 && n.canSend);
		function u() {
			let e = a.value?.querySelector("[aria-selected=\"true\"]");
			typeof e?.scrollIntoView == "function" && e.scrollIntoView({ block: "nearest" });
		}
		Ln(c, () => {
			i.value = 0;
		}), Ln(l, async (e) => {
			e && (await _n(), u());
		});
		function d(e) {
			return `/${e.name}`;
		}
		function f(e) {
			let t = `${d(e)}${e.argumentHint ? " " : ""}`;
			o.value = t, r.draft = t, i.value = 0, _n(() => {
				r.focusComposer++;
			});
		}
		function p(e) {
			if (!l.value) return !1;
			let t = c.value.length;
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				let n = e.key === "ArrowDown" ? 1 : -1;
				return i.value = (i.value + n + t) % t, _n(u), !0;
			}
			if (e.key === "Tab" || e.key === "Enter" && !e.shiftKey) {
				let t = c.value[i.value];
				return t ? (e.preventDefault(), f(t), !0) : !1;
			}
			return e.key === "Escape" && (e.preventDefault(), o.value = "", r.draft = "", !0);
		}
		return t({ keydown: p }), (e, t) => l.value ? (H(), U("div", hs, [t[0] ||= W("div", { class: "command-menu-head" }, [W("span", null, "斜杠命令"), W("span", { class: "command-menu-hint" }, "↑↓ 选择 · Enter 插入 · Esc 清空")], -1), W("div", {
			ref_key: "list",
			ref: a,
			class: "command-list"
		}, [(H(!0), U(V, null, B(c.value, (e, t) => (H(), U("button", {
			key: e.name,
			type: "button",
			role: "option",
			tabindex: "-1",
			class: "command-option",
			"data-command": e.name,
			"aria-selected": t === i.value,
			title: e.description,
			onMouseenter: (e) => i.value = t,
			onClick: (t) => f(e)
		}, [
			W("span", _s, k(d(e)), 1),
			W("span", vs, k(e.source === "skill" ? "技能" : "本地"), 1),
			W("span", ys, k(e.description), 1)
		], 40, gs))), 128))], 512)])) : q("", !0);
	}
}), xs = {
	id: "attachments",
	class: "attachments"
}, Ss = ["src", "alt"], Cs = ["title"], ws = ["onClick"], Ts = ["aria-label", "onClick"], Es = { class: "composer-toolbar" }, Ds = { class: "composer-tools" }, Os = {
	class: "icon-button upload-button",
	title: "添加附件"
}, ks = ["disabled"], As = ["disabled"], js = /* @__PURE__ */ z({
	__name: "Composer",
	setup(e) {
		let t = Pn("workspace"), n = t.state, { canSend: r, generating: i } = t, a = /* @__PURE__ */ F(null), o = /* @__PURE__ */ F(null), s = /* @__PURE__ */ F(null), c = /* @__PURE__ */ F(!1);
		function l() {
			a.value && (a.value.style.height = "0px", a.value.style.height = `${Math.min(200, Math.max(58, a.value.scrollHeight))}px`, a.value.style.overflowY = a.value.scrollHeight > 200 ? "auto" : "hidden");
		}
		Ln(() => n.draft, l, { flush: "post" }), Ln(() => n.focusComposer, async () => {
			await _n(), a.value?.focus();
		}), tr(l);
		function u(e) {
			s.value?.keydown(e) || e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && (e.preventDefault(), r.value && o.value?.requestSubmit());
		}
		function d(e) {
			let n = [...e.clipboardData?.items || []].filter((e) => e.kind === "file").map((e) => e.getAsFile()).filter((e) => !!e);
			n.length && (e.preventDefault(), t.uploadFiles(n));
		}
		function f(e) {
			let n = e.target, r = [...n.files || []];
			n.value = "", t.uploadFiles(r);
		}
		function p(e) {
			n.attachments = n.attachments.filter((t) => t.key !== e);
		}
		async function m() {
			c.value = !0;
			try {
				await t.interrupt();
			} finally {
				c.value = !1;
			}
		}
		return (e, l) => (H(), U("form", {
			id: "chat-form",
			ref_key: "form",
			ref: o,
			class: "composer",
			onSubmit: l[1] ||= Y((e) => I(t).submit(), ["prevent"]),
			onDragover: l[2] ||= Y(() => {}, ["prevent"]),
			onDrop: l[3] ||= Y((e) => I(t).uploadFiles([...e.dataTransfer?.files || []]), ["prevent"])
		}, [
			W("div", xs, [(H(!0), U(V, null, B(I(n).attachments, (e) => (H(), U("div", {
				key: e.key,
				class: O(["attachment", { error: e.status === "error" }])
			}, [
				e.id && e.mime?.startsWith("image/") ? (H(), U("img", {
					key: 0,
					src: `/api/uploads/${I(oo)(e.id)}`,
					alt: e.name
				}, null, 8, Ss)) : (H(), ui(Q, {
					key: 1,
					name: "attach"
				})),
				W("span", {
					class: "attachment-name",
					title: e.error || e.name
				}, k(e.name) + " " + k(e.status === "uploading" ? " · 上传中" : e.status === "error" ? " · 失败" : ""), 9, Cs),
				e.status === "error" ? (H(), U("button", {
					key: 2,
					type: "button",
					onClick: (n) => I(t).uploadOne(e)
				}, "重试", 8, ws)) : q("", !0),
				W("button", {
					type: "button",
					"aria-label": `移除附件 ${e.name}`,
					onClick: (t) => p(e.key)
				}, "×", 8, Ts)
			], 2))), 128))]),
			l[4] ||= W("label", {
				class: "sr-only",
				for: "chat-input"
			}, "向研究助手提问", -1),
			G(bs, {
				ref_key: "menu",
				ref: s,
				draft: I(n).draft,
				"can-send": I(r)
			}, null, 8, ["draft", "can-send"]),
			R(W("textarea", {
				id: "chat-input",
				ref_key: "input",
				ref: a,
				"onUpdate:modelValue": l[0] ||= (e) => I(n).draft = e,
				rows: "2",
				placeholder: "输入问题，或用 / 唤起命令…",
				onKeydown: u,
				onPaste: d
			}, null, 544), [[Ra, I(n).draft]]),
			W("div", Es, [W("div", Ds, [W("label", Os, [G(Q, { name: "plus" }), W("input", {
				id: "file-input",
				type: "file",
				multiple: "",
				"aria-label": "添加图片或文件",
				onChange: f
			}, null, 32)]), G(ms)]), I(i) ? (H(), U("button", {
				key: 0,
				id: "interrupt",
				type: "button",
				class: "send-button stop-button",
				title: "停止生成",
				"aria-label": "停止生成",
				disabled: c.value,
				onClick: m
			}, [G(Q, { name: "stop" })], 8, ks)) : (H(), U("button", {
				key: 1,
				id: "send",
				type: "submit",
				class: "send-button",
				title: "发送",
				"aria-label": "发送消息",
				disabled: !I(r)
			}, [G(Q, { name: "arrow" })], 8, As))])
		], 544));
	}
});
// app/web/frontend/lib/api.ts
async function Ms(e, t = {}) {
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
var Ns = [
	"streaming",
	"pending",
	"running",
	"in_progress",
	"inProgress",
	"queued"
], Ps = {
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
}, Fs = (e) => [
	"queued",
	"pending",
	"running",
	"in_progress"
].includes(e.status);
function $(e) {
	return e instanceof Error ? e.message : String(e);
}
function Is({ api: e = Ms, EventSourceImpl: t = globalThis.EventSource, pollInterval: n = 8e3 } = {}) {
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
		noteDeleting: !1,
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
		commands: [],
		commandError: "",
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
		importOpen: !1,
		ui: {
			chatId: null,
			paperId: null
		},
		panelWidths: {},
		uiDirty: !1,
		uiError: ""
	}), i = J(() => r.papers.find((e) => e.literature_id === r.current)), a = J(() => r.status.agents?.pi || {}), o = J(() => (a.value.models || []).map((e) => {
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
	}).filter((e) => e !== null)), s = J(() => r.chat?.messages?.some((e) => Ns.includes(e.status)) || !1), c = J(() => r.sending || s.value), l = J(() => !r.statusError && !c.value && !r.creating && !!(r.draft.trim() || r.attachments.length) && r.attachments.every((e) => e.status === "ready") && a.value.available === !0 && a.value.authenticated === !0 && r.eventsOpen), u, d = !1, f, p = 0, m = 0, h = !1, g = /* @__PURE__ */ new Set();
	function _(e, t = !1) {
		let n = ++m;
		r.toasts.push({
			id: n,
			message: e,
			error: t
		});
		let i = setTimeout(() => {
			r.toasts = r.toasts.filter((e) => e.id !== n), g.delete(i);
		}, t ? 1e4 : 5e3);
		g.add(i);
	}
	function v(e) {
		r.panel = e;
	}
	function y(e) {
		r.draft = e, r.focusComposer++;
	}
	function b(e) {
		r.view = e, e === "downloads" && be();
	}
	function x(e) {
		r.current = e, ie({ paperId: e }), r.readerMode = "pdf", r.notePath = "", r.pdfPage = 1, r.pdfTotal = null, r.pdfZoom = 100, r.pdfBrowser = !1, r.context.size < 6 || r.context.has(e) ? r.context.add(e) : _("最多附带 6 篇论文；请先移除不需要的上下文。", !0), window.matchMedia("(max-width:680px)").matches && v("reader");
	}
	function S() {
		Object.assign(r, {
			query: "",
			year: "",
			read: "",
			starred: !1,
			category: "",
			subcategory: ""
		});
	}
	async function C() {
		try {
			let t = await e("/api/library");
			r.papers = Array.isArray(t.papers) ? t.papers : [], r.categories = t.categories || [], r.stats = t.stats || {}, r.libraryError = "";
		} catch (e) {
			r.libraryError = $(e);
		}
	}
	async function w(t) {
		try {
			let n = await e("/api/categories", Z("POST", { name: t }));
			return await C(), n;
		} catch (e) {
			return _($(e), !0), null;
		}
	}
	async function ee(t, n, r) {
		try {
			let i = await e("/api/categories/rename", Z("POST", {
				category: t,
				subcategory: n,
				name: r
			}));
			return await C(), i;
		} catch (e) {
			return _($(e), !0), null;
		}
	}
	async function te(t, n) {
		if (r.pendingPatches.has(t)) return !1;
		r.pendingPatches.add(t);
		try {
			await e(`/api/papers/${oo(t)}`, Z("PATCH", n));
			let i = r.papers.find((e) => e.literature_id === t);
			return i && Object.assign(i, n), !0;
		} catch (e) {
			return _($(e), !0), !1;
		} finally {
			r.pendingPatches.delete(t);
		}
	}
	async function T() {
		try {
			r.status = await e("/api/status"), r.statusError = "";
		} catch (e) {
			r.statusError = $(e);
		}
	}
	async function E() {
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
			_($(e), !0);
		} finally {
			await T();
		}
	}
	async function ne() {
		try {
			r.chats = await e("/api/chats");
		} catch (e) {
			_($(e), !0);
		}
	}
	async function D() {
		try {
			let t = await e("/api/commands");
			r.commands = Array.isArray(t.commands) ? t.commands : [], r.commandError = "";
		} catch (e) {
			r.commandError = $(e);
		}
	}
	async function re() {
		try {
			let t = await e("/api/ui");
			r.ui = {
				chatId: t.chatId ?? null,
				paperId: t.paperId ?? null
			}, r.uiDirty || (r.panelWidths = { ...t.panelWidths || {} }), r.uiError = "";
		} catch (e) {
			r.uiError = $(e);
		}
	}
	function ie(t) {
		t.chatId !== void 0 && (r.ui.chatId = t.chatId), t.paperId !== void 0 && (r.ui.paperId = t.paperId), t.panelWidths && (r.panelWidths = {
			...r.panelWidths,
			...t.panelWidths
		}), r.uiDirty = !0, e("/api/ui", Z("PATCH", t)).catch((e) => {
			r.uiError = $(e);
		});
	}
	async function ae(t) {
		if (!l.value) return !1;
		r.sending = !0;
		let n = [...r.context], a = {
			activePaperId: r.current || void 0,
			pdfPage: r.pdfPage
		};
		try {
			if (!r.chat) {
				r.creating = !0;
				try {
					let a = await e("/api/chats", Z("POST", {
						paperIds: n,
						title: t.slice(0, 50) || co(i.value || {})
					}));
					r.chat = {
						...a,
						messages: a.messages || []
					}, ie({ chatId: a.id }), r.chats.unshift(a);
				} finally {
					r.creating = !1;
				}
			}
			let o = r.chat, s = {
				text: t,
				paperIds: n,
				...a
			};
			return r.model && (s.model = r.model), await e(`/api/chats/${oo(o.id)}/commands`, Z("POST", s)), r.draft.trim() === t && (r.draft = ""), await le(o.id), ne(), !0;
		} catch (e) {
			return _(`命令未执行：${$(e)}`, !0), !1;
		} finally {
			r.sending = !1;
		}
	}
	async function oe() {
		let e = r.draft.trim();
		return e.startsWith("/") ? ae(e) : ue();
	}
	function se() {
		r.sending || (r.chatEpoch++, r.chat = null, ie({ chatId: null }), r.focusComposer++);
	}
	async function ce(t) {
		if (r.sending) return;
		let n = ++r.chatEpoch;
		try {
			let i = await e(`/api/chats/${oo(t)}`);
			if (n !== r.chatEpoch || h) return;
			r.chat = i, r.context = new Set(i.paperIds || []), ie({ chatId: i.id }), a.value.available !== !0 && E();
		} catch (e) {
			_($(e), !0);
		}
	}
	async function le(t) {
		let n = r.chatEpoch, i = await e(`/api/chats/${oo(t)}`);
		if (n !== r.chatEpoch || r.chat?.id !== t || h) return;
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
	async function ue() {
		if (!l.value || !r.chat && !r.draft.trim() && !r.attachments.length) return !1;
		let t = r.draft.trim(), n = [...r.attachments], a = [...r.context], o = {
			activePaperId: r.current || void 0,
			pdfPage: r.pdfPage
		};
		r.sending = !0;
		try {
			if (!r.chat) {
				r.creating = !0;
				try {
					let n = await e("/api/chats", Z("POST", {
						paperIds: a,
						title: t.slice(0, 50) || co(i.value || {})
					}));
					r.chat = {
						...n,
						messages: n.messages || []
					}, ie({ chatId: n.id }), r.chats.unshift(n);
				} finally {
					r.creating = !1;
				}
			}
			let s = r.chat, c = {
				text: t,
				paperIds: a,
				attachmentIds: n.map((e) => e.id),
				...o
			};
			r.model && (c.model = r.model), await e(`/api/chats/${oo(s.id)}/messages`, Z("POST", c)), r.draft.trim() === t && (r.draft = "");
			let l = new Set(n.map((e) => e.key));
			r.attachments = r.attachments.filter((e) => !l.has(e.key));
			try {
				await le(s.id);
			} catch {
				_("消息已提交；正在等待会话同步，请勿重复发送。", !0);
			}
			return ne(), !0;
		} catch (e) {
			return _(`消息未能确认提交：${$(e)}。请检查会话后重试。`, !0), !1;
		} finally {
			r.sending = !1;
		}
	}
	async function de() {
		if (r.chat) try {
			let t = r.chat.id;
			await e(`/api/chats/${oo(t)}/interrupt`, Z("POST", {})), await le(t);
		} catch (e) {
			_($(e), !0);
		}
	}
	async function fe(t) {
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
	async function pe(e) {
		e.status = "uploading", e.error = "";
		try {
			Object.assign(e, await fe(e.file), { status: "ready" });
		} catch (t) {
			e.status = "error", e.error = $(t), _(`上传 ${e.name} 失败：${$(t)}`, !0);
		}
	}
	async function me(e) {
		for (let t of e) {
			if (r.attachments.length >= 8) {
				_("每次最多附加 8 个文件。", !0);
				break;
			}
			if (t.size > 26214400) {
				_(`${t.name} 超过 25 MB 上传限制。`, !0);
				continue;
			}
			let e = /* @__PURE__ */ Lt({
				key: String(++p),
				name: t.name,
				file: Gt(t),
				status: "uploading"
			});
			r.attachments.push(e), await pe(e);
		}
	}
	async function he({ uploads: t, category: n }) {
		let { job: i, skipped: a } = await e("/api/library/import", Z("POST", {
			uploads: t,
			category: n
		}));
		return r.jobs.set(i.id, i), {
			job: i,
			skipped: a
		};
	}
	async function O(t, n) {
		let i = r.chat;
		if ((i?.noteDrafts || []).find((e) => e.id === t) && !r.noteSaving) {
			r.noteSaving = t;
			try {
				let r = await e(`/api/note-drafts/${oo(t)}`, Z("POST", { action: n }));
				i.noteDrafts = (i.noteDrafts || []).filter((e) => e.id !== t), n === "save" ? (_(`笔记已保存：${r.path ?? ""}`), await C()) : _("已丢弃笔记草稿");
			} catch (e) {
				_($(e), !0);
			} finally {
				r.noteSaving = "";
			}
		}
	}
	let ge = (e) => O(e, "save"), _e = (e) => O(e, "discard");
	async function ve(t) {
		if (!t || r.noteDeleting) return !1;
		r.noteDeleting = !0;
		try {
			let n = await e("/api/notes/delete", Z("POST", { path: t }));
			r.papers = Array.isArray(n.library?.papers) ? n.library.papers : r.papers;
			let i = r.papers.find((e) => e.literature_id === r.current), a = Array.isArray(i?.notes) ? i.notes : [];
			return r.notePath = a[0]?.path ?? "", _(`笔记已移入回收站：${n.trashed}`), !0;
		} catch (e) {
			return _($(e), !0), !1;
		} finally {
			r.noteDeleting = !1;
		}
	}
	async function ye(t, n, i = {}) {
		let a = r.approvals.get(t);
		if (a && !a.submitting) {
			a.submitting = !0;
			try {
				let o = { decision: n }, s = a.params.questions;
				n === "accept" && Array.isArray(s) && s.length && (o.answers = i), await e(`/api/approvals/${oo(t)}`, Z("POST", o)), r.resolvedApprovals.add(t), r.approvals.delete(t);
			} catch (e) {
				a.submitting = !1, _($(e), !0);
			}
		}
	}
	async function be() {
		try {
			let t = await e("/api/downloads");
			for (let e of t.jobs || []) r.jobs.set(e.id, e);
			r.batches = t.batches || [], r.downloadsError = "";
		} catch (e) {
			r.downloadsError = $(e);
		}
	}
	async function xe(t) {
		try {
			let n = await e("/api/downloads", Z("POST", t));
			return r.jobs.set(n.id, n), _("下载任务已创建"), !0;
		} catch (e) {
			return _($(e), !0), !1;
		}
	}
	async function Se(t, n) {
		try {
			let i = await e("/api/downloads/action", Z("POST", {
				batch: t,
				action: n,
				...n === "ieee" ? { submit: !0 } : {}
			}));
			return r.jobs.set(i.id, i), _("批次操作已提交"), !0;
		} catch (e) {
			return _($(e), !0), !1;
		}
	}
	async function Ce() {
		r.refreshing = !0;
		try {
			let t = await e("/api/catalog/refresh", Z("POST", {}));
			r.jobs.set(t.id, t), _("索引刷新任务已提交，可在任务中心查看");
		} catch (e) {
			_($(e), !0);
		} finally {
			r.refreshing = !1;
		}
	}
	function we(e) {
		let t = r.chat, n = t.messages ||= [], i = n.findIndex((t) => t.id === e.id);
		i < 0 ? n.push(e) : Object.assign(n[i], e);
	}
	function k(e) {
		if (h) return;
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
		if (e.type === "noteDraftResolved" && e.chatId === t?.id && (t.noteDrafts = (t.noteDrafts || []).filter((t) => t.id !== e.id)), e.type === "message" && e.chatId === t?.id && e.message?.id && we(e.message), e.type === "delta" && e.chatId === t?.id) {
			let n = t.messages?.find((t) => t.id === e.messageId);
			n ||= (we({
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
			}), e && Fs(e) && !Fs(i) && (_(`任务${Ps[i.status] || i.status}：${i.title || i.id}`, ["error", "failed"].includes(i.status)), C(), r.view === "downloads" && be());
		}
	}
	async function Te() {
		if (!(document.hidden || d || h)) {
			d = !0;
			try {
				let t = [T()], n = r.chat;
				n && (!r.eventsOpen || c.value) && t.push(le(n.id));
				for (let n of r.jobs.values()) Fs(n) && t.push(e(`/api/jobs/${oo(n.id)}`).then((e) => {
					r.jobs.set(e.id, e), Fs(e) || (C(), r.view === "downloads" && be());
				}));
				await Promise.allSettled(t);
			} finally {
				d = !1;
			}
		}
	}
	async function Ee() {
		if (t && (u = new t("/api/events"), u.onopen = () => {
			r.eventsOpen = !0, T(), r.chat && le(r.chat.id).catch(() => {});
		}, u.onerror = () => {
			r.eventsOpen = !1;
		}, u.onmessage = (e) => {
			let t;
			try {
				t = JSON.parse(e.data);
			} catch {
				return;
			}
			k(t);
		}), await Promise.allSettled([
			C(),
			T(),
			ne(),
			be(),
			D(),
			re()
		]), h) return;
		let e = r.ui.chatId;
		e && r.chats.some((t) => t.id === e) && await ce(e);
		let i = r.ui.paperId;
		i && !r.current && r.papers.some((e) => e.literature_id === i) && x(i), n && (f = setInterval(Te, n));
	}
	function A() {
		h = !0, u?.close(), f && clearInterval(f);
		for (let e of g) clearTimeout(e);
	}
	return {
		state: r,
		api: e,
		currentPaper: i,
		agent: a,
		models: o,
		busy: c,
		generating: s,
		canSend: l,
		toast: _,
		setView: b,
		setPanel: v,
		setDraft: y,
		selectPaper: x,
		resetFilters: S,
		loadLibrary: C,
		createCategory: w,
		renameCategory: ee,
		patchPaper: te,
		loadStatus: T,
		reconnectAgent: E,
		loadChats: ne,
		loadCommands: D,
		loadUiState: re,
		saveUiState: ie,
		openChat: ce,
		syncChat: le,
		newChat: se,
		sendMessage: ue,
		runCommand: ae,
		submit: oe,
		interrupt: de,
		uploadFile: fe,
		uploadFiles: me,
		uploadOne: pe,
		importPdfs: he,
		decideApproval: ye,
		saveNoteDraft: ge,
		discardNoteDraft: _e,
		deleteNote: ve,
		loadDownloads: be,
		createDownload: xe,
		batchAction: Se,
		refreshCatalog: Ce,
		receive: k,
		start: Ee,
		stop: A
	};
}
// app/web/frontend/components/ChatMessage.vue?vue&type=script&setup=true&lang.ts
var Ls = ["data-message"], Rs = { class: "message-label sr-only" }, zs = {
	key: 0,
	class: "message-body"
}, Bs = {
	key: 0,
	class: "message-thinking"
}, Vs = ["innerHTML"], Hs = ["innerHTML"], Us = {
	key: 2,
	class: "message-attachments"
}, Ws = ["href"], Gs = ["src", "alt"], Ks = {
	key: 3,
	class: "message-status",
	role: "status",
	"aria-label": "正在生成"
}, qs = {
	key: 4,
	class: "message-status"
}, Js = /* @__PURE__ */ z({
	__name: "ChatMessage",
	props: { message: {} },
	setup(e) {
		let t = e, n = J(() => [
			"user",
			"assistant",
			"tool",
			"system"
		].includes(t.message.role) ? t.message.role : "assistant"), r = J(() => ({
			user: "你",
			assistant: "Pi Agent",
			tool: "工具",
			system: "系统"
		})[n.value] ?? "Pi Agent"), i = J(() => Ns.includes(t.message.status)), a = J(() => ["error", "failed"].includes(t.message.status)), o = J(() => mo(t.message.text)), s = J(() => mo(t.message.thinking)), c = J(() => {
			let e = t.message.error;
			return e && typeof e == "object" && "message" in e ? String(e.message ?? "") : e ? String(e) : "";
		}), l = J(() => ["interrupted", "cancelled"].includes(t.message.status)), u = J(() => (t.message.attachments || t.message.attachmentIds || []).map((e) => typeof e == "string" ? { id: e } : e).filter((e) => !!e.id));
		return (t, d) => (H(), U("article", {
			class: O(["message", [n.value, {
				streaming: i.value,
				error: a.value
			}]]),
			"data-message": e.message.id
		}, [
			W("div", Rs, k(r.value), 1),
			n.value === "user" ? (H(), U("div", zs, k(e.message.text), 1)) : (H(), U(V, { key: 1 }, [e.message.thinking ? (H(), U("details", Bs, [d[0] ||= W("summary", null, "推理过程", -1), W("div", {
				class: "message-thinking-body markdown",
				innerHTML: s.value
			}, null, 8, Vs)])) : q("", !0), W("div", {
				class: "message-body markdown",
				innerHTML: o.value
			}, null, 8, Hs)], 64)),
			u.value.length ? (H(), U("div", Us, [(H(!0), U(V, null, B(u.value, (e) => (H(), U("a", {
				key: e.id,
				href: `/api/uploads/${I(oo)(e.id)}`,
				target: "_blank",
				rel: "noopener noreferrer"
			}, [(e.mime || "").startsWith("image/") ? (H(), U("img", {
				key: 0,
				src: `/api/uploads/${I(oo)(e.id)}`,
				alt: e.name || "上传的图片",
				loading: "lazy"
			}, null, 8, Gs)) : (H(), U(V, { key: 1 }, [K(k(e.name || "附件"), 1)], 64))], 8, Ws))), 128))])) : q("", !0),
			i.value && !c.value ? (H(), U("div", Ks, [...d[1] ||= [W("span", {
				class: "typing-indicator",
				"aria-hidden": "true"
			}, [
				W("i"),
				W("i"),
				W("i")
			], -1)]])) : c.value || a.value || l.value ? (H(), U("div", qs, k(c.value || (a.value ? "生成失败" : "已停止")), 1)) : q("", !0)
		], 10, Ls));
	}
}), Ys = ["data-approval"], Xs = { class: "approval-question" }, Zs = [
	"onUpdate:modelValue",
	"data-answer",
	"aria-label"
], Qs = {
	key: 0,
	class: "question-options"
}, $s = ["title", "onClick"], ec = { key: 1 }, tc = { class: "approval-actions" }, nc = ["disabled"], rc = ["disabled"], ic = /* @__PURE__ */ z({
	__name: "ApprovalCard",
	props: { approval: {} },
	setup(e) {
		let t = e, n = Pn("workspace"), r = /* @__PURE__ */ Lt({}), i = J(() => {
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
		return (t, s) => (H(), U("form", {
			class: "approval",
			"data-approval": e.approval.id,
			onSubmit: Y(o, ["prevent"])
		}, [
			W("h4", null, k(i.value.length ? "需要你的回答" : "等待你的审批"), 1),
			i.value.length ? (H(!0), U(V, { key: 0 }, B(i.value, (e) => (H(), U("div", { key: e.id }, [W("label", Xs, [W("strong", null, k(e.text), 1), R(W("textarea", {
				"onUpdate:modelValue": (t) => r[e.id] = t,
				"data-answer": e.id,
				rows: "2",
				required: "",
				"aria-label": e.text,
				placeholder: "输入你的回答…"
			}, null, 8, Zs), [[Ra, r[e.id]]])]), e.options?.length ? (H(), U("div", Qs, [(H(!0), U(V, null, B(e.options, (t, n) => (H(), U("button", {
				key: n,
				type: "button",
				class: "button subtle",
				title: typeof t == "string" ? "" : t.description || "",
				onClick: (n) => r[e.id] = a(t)
			}, k(a(t)), 9, $s))), 128))])) : q("", !0)]))), 128)) : (H(), U("pre", ec, k(JSON.stringify(e.approval.params || {}, null, 2)), 1)),
			W("div", tc, [W("button", {
				class: "button primary",
				type: "submit",
				disabled: e.approval.submitting
			}, k(i.value.length ? "提交回答" : "允许本次"), 9, nc), W("button", {
				class: "button subtle",
				type: "button",
				disabled: e.approval.submitting,
				onClick: s[0] ||= (t) => I(n).decideApproval(e.approval.id, "decline")
			}, " 拒绝 ", 8, rc)])
		], 40, Ys));
	}
}), ac = ["data-note-draft"], oc = ["data-note-preview"], sc = ["innerHTML"], cc = { class: "note-draft-actions" }, lc = ["data-note-save", "disabled"], uc = ["data-note-discard", "disabled"], dc = /* @__PURE__ */ z({
	__name: "NoteDraftCard",
	props: { draft: {} },
	setup(e) {
		let t = e, n = Pn("workspace"), r = /* @__PURE__ */ F(!0), i = J(() => mo(t.draft.content || "")), a = J(() => n.state.noteSaving === t.draft.id);
		return (t, o) => (H(), U("section", {
			class: "note-draft",
			"data-note-draft": e.draft.id
		}, [
			W("header", null, [W("div", null, [W("strong", null, k(e.draft.title), 1), W("small", null, k(e.draft.paperId) + " · " + k(e.draft.path), 1)]), W("button", {
				class: "button subtle",
				type: "button",
				"data-note-preview": e.draft.id,
				onClick: o[0] ||= (e) => r.value = !r.value
			}, k(r.value ? "收起" : "预览"), 9, oc)]),
			r.value ? (H(), U("div", {
				key: 0,
				class: "markdown note-preview",
				innerHTML: i.value
			}, null, 8, sc)) : q("", !0),
			W("div", cc, [W("button", {
				class: "button primary",
				type: "button",
				"data-note-save": e.draft.id,
				disabled: a.value,
				onClick: o[1] ||= (t) => I(n).saveNoteDraft(e.draft.id)
			}, k(a.value ? "保存中…" : "保存为笔记"), 9, lc), W("button", {
				class: "button subtle",
				type: "button",
				"data-note-discard": e.draft.id,
				disabled: a.value,
				onClick: o[2] ||= (t) => I(n).discardNoteDraft(e.draft.id)
			}, " 丢弃 ", 8, uc)])
		], 8, ac));
	}
}), fc = { class: "settings-sheet" }, pc = { class: "settings-head" }, mc = ["disabled"], hc = { class: "settings-body" }, gc = {
	key: 0,
	class: "settings-loading",
	role: "status"
}, _c = { class: "settings-section" }, vc = ["disabled"], yc = {
	value: "",
	disabled: ""
}, bc = ["value"], xc = { class: "settings-hint" }, Sc = { class: "settings-section" }, Cc = ["disabled"], wc = ["value"], Tc = { class: "settings-hint" }, Ec = { class: "settings-section" }, Dc = { class: "settings-check" }, Oc = ["checked", "disabled"], kc = { class: "settings-token-row" }, Ac = { class: "settings-token-field" }, jc = ["disabled"], Mc = { class: "settings-token-field" }, Nc = ["disabled"], Pc = { class: "settings-section" }, Fc = {
	key: 0,
	class: "settings-skills"
}, Ic = {
	key: 1,
	class: "settings-hint"
}, Lc = {
	key: 2,
	class: "settings-hint"
}, Rc = ["disabled"], zc = { class: "settings-section" }, Bc = ["disabled"], Vc = {
	key: 0,
	value: ""
}, Hc = ["value"], Uc = {
	key: 0,
	class: "settings-provider-status"
}, Wc = {
	key: 1,
	class: "settings-key-row"
}, Gc = [
	"placeholder",
	"disabled",
	"onKeydown"
], Kc = ["disabled"], qc = {
	key: 2,
	class: "settings-key-foot"
}, Jc = ["disabled"], Yc = {
	key: 1,
	class: "settings-hint"
}, Xc = {
	key: 0,
	class: "settings-error",
	role: "alert"
}, Zc = { class: "settings-actions" }, Qc = ["disabled"], $c = ["disabled"], el = /* @__PURE__ */ z({
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
		}, a = /* @__PURE__ */ F(null), o = /* @__PURE__ */ F({
			defaultModel: "",
			providers: []
		}), s = /* @__PURE__ */ F(""), c = /* @__PURE__ */ F(""), l = /* @__PURE__ */ F(""), u = /* @__PURE__ */ F(""), d = /* @__PURE__ */ F(!0), f = /* @__PURE__ */ F(""), p = /* @__PURE__ */ F(""), m = /* @__PURE__ */ F(!0), h = /* @__PURE__ */ F(""), g = /* @__PURE__ */ F(""), _ = J(() => n.models.value), v = J(() => (o.value.thinking?.available || []).map((e) => ({
			value: e,
			label: i[e] || e
		}))), y = J(() => o.value.providers.filter((e) => e.supportsApiKey)), b = J(() => y.value.find((e) => e.id === c.value) || null), x = J(() => {
			let e = b.value;
			return e ? e.credentialType === "api_key" ? "已保存 API 密钥" : e.credentialType === "oauth" ? "已通过账号登录" : e.configured && e.source === "environment" ? `已由环境变量配置${e.sourceLabel ? `：${e.sourceLabel}` : ""}` : e.configured ? "已配置" : "尚未配置" : "";
		}), S = J(() => b.value?.credentialType === "api_key"), C = J(() => !!b.value && b.value?.credentialType !== "oauth");
		tr(() => {
			let e = a.value;
			typeof e?.showModal == "function" ? e.showModal() : e?.setAttribute("open", ""), te();
		});
		function w() {
			if (h.value) return;
			let e = a.value;
			typeof e?.close == "function" && e.close(), r("close");
		}
		function ee(e) {
			e.target === a.value && !h.value && w();
		}
		async function te() {
			m.value = !0, g.value = "";
			try {
				T(await n.api("/api/agents/pi/settings"));
			} catch (e) {
				g.value = e.message || "无法读取 Pi 配置。";
			} finally {
				m.value = !1;
			}
		}
		function T(e) {
			if (o.value = e, s.value = _.value.some((t) => t.id === e.defaultModel) ? e.defaultModel : "", u.value = e.thinking?.level || "", d.value = e.compaction?.enabled !== !1, f.value = e.compaction?.reserveTokens ?? "", p.value = e.compaction?.keepRecentTokens ?? "", !y.value.some((e) => e.id === c.value)) {
				let t = String(e.defaultModel || "").split("/")[0];
				c.value = y.value.find((e) => e.id === t)?.id || y.value[0]?.id || "";
			}
			l.value = "";
		}
		async function E() {
			if (!b.value || h.value) return;
			let e = l.value.trim();
			if (!e) {
				g.value = "请输入 API 密钥。";
				return;
			}
			let t = b.value.name;
			h.value = "save", g.value = "";
			try {
				T(await n.api("/api/agents/pi/settings/key", Z("POST", {
					provider: b.value.id,
					key: e
				}))), n.toast(`已保存 ${t} 的 API 密钥。`);
			} catch (e) {
				g.value = e.message || "无法保存 API 密钥。";
			} finally {
				h.value = "";
			}
		}
		async function ne() {
			if (!b.value || h.value) return;
			let e = b.value.name;
			if (window.confirm(`清除 ${e} 已保存的 API 密钥？`)) {
				h.value = "remove", g.value = "";
				try {
					T(await n.api("/api/agents/pi/settings/key/remove", Z("POST", { provider: b.value.id }))), n.toast(`已清除 ${e} 的 API 密钥。`);
				} catch (e) {
					g.value = e.message || "无法清除 API 密钥。";
				} finally {
					h.value = "";
				}
			}
		}
		async function D() {
			if (!h.value) {
				h.value = "model", g.value = "";
				try {
					T(await n.api("/api/agents/pi/settings/model", Z("POST", { model: s.value }))), n.toast("默认模型已更新。");
				} catch (e) {
					g.value = e.message || "无法保存默认模型。", s.value = o.value.defaultModel || "";
				} finally {
					h.value = "";
				}
			}
		}
		function re(e) {
			let t = String(e ?? "").trim();
			return /^\d+$/.test(t) ? Number(t) : NaN;
		}
		async function ie() {
			if (h.value || !u.value) return;
			let e = u.value;
			h.value = "thinking", g.value = "";
			try {
				T(await n.api("/api/agents/pi/settings/thinking", Z("POST", {
					level: e,
					...s.value ? { model: s.value } : {}
				}))), n.toast("思考强度已更新。");
			} catch (e) {
				g.value = e.message || "无法保存思考强度。", u.value = o.value.thinking?.level || "";
			} finally {
				h.value = "";
			}
		}
		async function ae(e) {
			d.value = e, await oe();
		}
		async function oe() {
			if (h.value) return;
			let e = re(f.value), t = re(p.value);
			if (!Number.isSafeInteger(e) || e < 1e3 || e > 2e6) g.value = "预留 token 需为 1000 到 2000000 之间的整数。";
			else if (!Number.isSafeInteger(t) || t < 1e3 || t > 2e6) g.value = "保留近期 token 需为 1000 到 2000000 之间的整数。";
			else {
				h.value = "compaction", g.value = "";
				try {
					T(await n.api("/api/agents/pi/settings/compaction", Z("POST", {
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
		async function se() {
			if (!h.value) {
				h.value = "skills", g.value = "";
				try {
					T(await n.api("/api/agents/pi/skills/reload", Z("POST", {}))), n.toast(`已加载 ${o.value.skills?.count ?? 0} 个技能。`);
				} catch (e) {
					g.value = e.message || "无法扫描技能。";
				} finally {
					h.value = "";
				}
			}
		}
		async function ce() {
			h.value || (h.value = "reload", await n.reconnectAgent(), h.value = "", await te());
		}
		return (e, t) => (H(), U("dialog", {
			ref_key: "dialog",
			ref: a,
			class: "settings-dialog",
			"aria-labelledby": "settings-title",
			onCancel: Y(w, ["prevent"]),
			onClick: ee
		}, [W("div", fc, [
			W("header", pc, [t[8] ||= W("div", null, [W("h2", { id: "settings-title" }, "模型与密钥"), W("p", null, "网站与终端 Pi 共用本机配置。")], -1), W("button", {
				type: "button",
				class: "icon-button",
				title: "关闭",
				"aria-label": "关闭",
				disabled: !!h.value,
				onClick: w
			}, [G(Q, { name: "close" })], 8, mc)]),
			W("div", hc, [m.value ? (H(), U("div", gc, [...t[9] ||= [W("span", { class: "busy-spinner" }, null, -1), K("正在读取本机 Pi 配置… ", -1)]])) : (H(), U(V, { key: 1 }, [
				W("section", _c, [
					t[10] ||= W("label", {
						class: "settings-label",
						for: "settings-model"
					}, "默认模型", -1),
					R(W("select", {
						id: "settings-model",
						"onUpdate:modelValue": t[0] ||= (e) => s.value = e,
						disabled: !_.value.length || !!h.value,
						onChange: D
					}, [W("option", yc, k(_.value.length ? "选择模型" : "尚无可用模型"), 1), (H(!0), U(V, null, B(_.value, (e) => (H(), U("option", {
						key: e.id,
						value: e.id
					}, k(e.label), 9, bc))), 128))], 40, vc), [[Va, s.value]]),
					W("p", xc, k(_.value.length ? "用于网站新会话，也会成为终端 Pi 的默认模型。" : "尚无可用模型，请先在下方配置 API 密钥或登录账号。"), 1)
				]),
				W("section", Sc, [
					t[11] ||= W("label", {
						class: "settings-label",
						for: "settings-thinking"
					}, "思考强度", -1),
					R(W("select", {
						id: "settings-thinking",
						"onUpdate:modelValue": t[1] ||= (e) => u.value = e,
						disabled: !v.value.length || !!h.value,
						onChange: ie
					}, [(H(!0), U(V, null, B(v.value, (e) => (H(), U("option", {
						key: e.value,
						value: e.value
					}, k(e.label), 9, wc))), 128))], 40, Cc), [[Va, u.value]]),
					W("p", Tc, k(v.value.length ? "对当前会话立即生效，并成为终端 Pi 的默认档位；模型不支持的档位不会出现。" : "当前模型没有可用的思考档位。"), 1)
				]),
				W("section", Ec, [
					t[15] ||= W("span", { class: "settings-label" }, "上下文压缩", -1),
					W("label", Dc, [W("input", {
						type: "checkbox",
						checked: d.value,
						disabled: !!h.value,
						onChange: t[2] ||= (e) => ae(e.target.checked)
					}, null, 40, Oc), t[12] ||= K(" 长会话自动摘要历史 ", -1)]),
					W("div", kc, [W("label", Ac, [t[13] ||= W("span", null, "预留 token", -1), R(W("input", {
						"onUpdate:modelValue": t[3] ||= (e) => f.value = e,
						type: "number",
						min: "1000",
						max: "2000000",
						step: "1000",
						disabled: !!h.value,
						onChange: oe
					}, null, 40, jc), [[Ra, f.value]])]), W("label", Mc, [t[14] ||= W("span", null, "保留近期 token", -1), R(W("input", {
						"onUpdate:modelValue": t[4] ||= (e) => p.value = e,
						type: "number",
						min: "1000",
						max: "2000000",
						step: "1000",
						disabled: !!h.value,
						onChange: oe
					}, null, 40, Nc), [[Ra, p.value]])])]),
					t[16] ||= W("p", { class: "settings-hint" }, " 预留越大越早压缩；保留量决定压缩后仍原样保留的近期对话长度。修改后对当前会话生效。 ", -1)
				]),
				W("section", Pc, [
					t[18] ||= W("span", { class: "settings-label" }, "技能", -1),
					o.value.skills?.items?.length ? (H(), U("ul", Fc, [(H(!0), U(V, null, B(o.value.skills.items, (e) => (H(), U("li", { key: e.name }, [W("strong", null, k(e.name), 1), W("span", null, k(e.description), 1)]))), 128))])) : (H(), U("p", Ic, [...t[17] ||= [
						K(" 尚未加载技能。把指令型技能放入 ", -1),
						W("code", null, "library/.zhiyue/skills/<名称>/SKILL.md", -1),
						K("。 ", -1)
					]])),
					o.value.skills?.diagnostics?.length ? (H(), U("p", Lc, k(o.value.skills.diagnostics.join("；")), 1)) : q("", !0),
					t[19] ||= W("p", { class: "settings-hint" }, " 技能只提供说明；模型按需调用 read_skill 读取，不会执行技能内的脚本。重新扫描后对新会话生效。 ", -1),
					W("button", {
						type: "button",
						class: "text-button",
						disabled: !!h.value,
						onClick: se
					}, k(h.value === "skills" ? "正在扫描…" : "重新扫描技能"), 9, Rc)
				]),
				W("section", zc, [
					t[20] ||= W("label", {
						class: "settings-label",
						for: "settings-provider"
					}, "API 密钥", -1),
					R(W("select", {
						id: "settings-provider",
						"onUpdate:modelValue": t[5] ||= (e) => c.value = e,
						disabled: !y.value.length || !!h.value,
						onChange: t[6] ||= (e) => l.value = ""
					}, [y.value.length ? q("", !0) : (H(), U("option", Vc, "没有支持 API 密钥的服务商")), (H(!0), U(V, null, B(y.value, (e) => (H(), U("option", {
						key: e.id,
						value: e.id
					}, k(e.name) + k(e.configured ? " · 已配置" : ""), 9, Hc))), 128))], 40, Bc), [[Va, c.value]]),
					b.value ? (H(), U("p", Uc, k(x.value), 1)) : q("", !0),
					C.value ? (H(), U("div", Wc, [R(W("input", {
						"onUpdate:modelValue": t[7] ||= (e) => l.value = e,
						type: "password",
						autocomplete: "off",
						spellcheck: "false",
						placeholder: S.value ? "输入新密钥以替换" : "粘贴 API 密钥",
						"aria-label": "API 密钥",
						disabled: !!h.value,
						onKeydown: Ya(Y(E, ["prevent"]), ["enter"])
					}, null, 40, Gc), [[Ra, l.value]]), W("button", {
						type: "button",
						class: "button primary",
						disabled: !!h.value || !l.value.trim(),
						onClick: E
					}, k(h.value === "save" ? "保存中…" : "保存"), 9, Kc)])) : q("", !0),
					b.value ? (H(), U("div", qc, [S.value ? (H(), U("button", {
						key: 0,
						type: "button",
						class: "text-button",
						disabled: !!h.value,
						onClick: ne
					}, k(h.value === "remove" ? "正在清除…" : "清除已保存密钥"), 9, Jc)) : q("", !0), b.value.credentialType === "oauth" ? (H(), U("span", Yc, " 该服务商已通过账号登录；如需改用 API 密钥，请先在终端 Pi 中退出登录。 ")) : q("", !0)])) : q("", !0)
				]),
				g.value ? (H(), U("p", Xc, k(g.value), 1)) : q("", !0)
			], 64))]),
			W("footer", Zc, [W("button", {
				type: "button",
				class: "button subtle",
				disabled: !!h.value,
				onClick: ce
			}, [G(Q, { name: "refresh" }), t[21] ||= K("重新检测 ", -1)], 8, Qc), W("button", {
				type: "button",
				class: "button primary",
				disabled: !!h.value,
				onClick: w
			}, "完成", 8, $c)])
		])], 544));
	}
}), tl = {
	id: "assistant-panel",
	class: "chat-panel",
	"aria-label": "文献研究助手"
}, nl = { class: "chat-header" }, rl = { class: "assistant-title" }, il = [
	"aria-label",
	"title",
	"data-state"
], al = { class: "chat-actions" }, ol = ["aria-expanded"], sl = ["disabled"], cl = {
	key: 0,
	id: "chat-history",
	class: "chat-history"
}, ll = ["data-chat", "onClick"], ul = {
	key: 0,
	class: "empty"
}, dl = {
	key: 1,
	id: "auth-banner",
	class: "auth-banner"
}, fl = { class: "auth-banner-actions" }, pl = {
	key: 2,
	class: "chat-context"
}, ml = { id: "context-papers" }, hl = [
	"data-context-remove",
	"title",
	"aria-label",
	"onClick"
], gl = {
	key: 0,
	class: "chat-empty"
}, _l = { class: "presets" }, vl = ["data-prompt", "onClick"], yl = {
	key: 3,
	id: "note-drafts",
	class: "note-drafts",
	"aria-live": "polite"
}, bl = {
	id: "approvals",
	class: "approvals",
	"aria-live": "polite"
}, xl = /* @__PURE__ */ z({
	__name: "AssistantPane",
	setup(e) {
		let t = Pn("workspace"), n = t.state, { agent: r } = t, i = /* @__PURE__ */ F(null), a = /* @__PURE__ */ F(!1), o = J(() => r.value.loading === !0 || r.value.available == null || r.value.authenticated == null), s = J(() => r.value.available === !0 && r.value.authenticated === !0), c = J(() => n.statusError || r.value.available === !1 ? "error" : o.value || !n.eventsOpen || !s.value ? "loading" : "connected"), l = J(() => n.statusError || r.value.error || (s.value && n.eventsOpen ? "已连接" : o.value ? "正在连接" : "等待配置")), u = J(() => !!n.statusError || !o.value && !s.value), d = J(() => [...n.approvals.values()].filter((e) => e.chatId === n.chat?.id && !n.resolvedApprovals.has(e.id))), f = J(() => n.chat?.noteDrafts || []), p = [
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
		return (e, o) => (H(), U("aside", tl, [
			G(bo, { kind: "assistant" }),
			W("div", nl, [W("div", rl, [o[6] ||= W("span", { class: "agent-name" }, "Pi Agent", -1), W("span", {
				id: "connection-status",
				class: "connection-indicator",
				role: "status",
				"aria-label": l.value,
				title: l.value,
				"data-state": c.value
			}, null, 8, il)]), W("div", al, [
				W("button", {
					id: "agent-settings",
					class: "icon-button",
					title: "模型与密钥",
					"aria-label": "模型与密钥",
					onClick: o[0] ||= (e) => a.value = !0
				}, [G(Q, { name: "settings" })]),
				W("button", {
					id: "chat-history-toggle",
					class: "icon-button",
					title: "会话列表",
					"aria-label": "会话列表",
					"aria-expanded": I(n).historyOpen,
					onClick: h
				}, [G(Q, { name: "history" })], 8, ol),
				W("button", {
					id: "new-chat",
					class: "icon-button",
					title: "新建会话",
					"aria-label": "新建会话",
					disabled: I(n).creating || I(n).sending,
					onClick: o[1] ||= (...e) => I(t).newChat && I(t).newChat(...e)
				}, [G(Q, { name: "plus" })], 8, sl)
			])]),
			I(n).historyOpen ? (H(), U("div", cl, [(H(!0), U(V, null, B(I(n).chats, (e) => (H(), U("button", {
				key: e.id,
				class: O(["history-item", { active: I(n).chat?.id === e.id }]),
				"data-chat": e.id,
				onClick: (n) => I(t).openChat(e.id)
			}, [K(k(e.title || "新会话") + " ", 1), W("small", null, k(g(e)) + " " + k((e.paperIds || []).join(" · ")), 1)], 10, ll))), 128)), I(n).chats.length ? q("", !0) : (H(), U("div", ul, "暂无会话"))])) : q("", !0),
			u.value ? (H(), U("div", dl, [W("span", null, k(I(n).statusError || I(r).error || "Pi 尚未配置模型或密钥。"), 1), W("span", fl, [W("button", {
				id: "open-agent-settings",
				onClick: o[2] ||= (e) => a.value = !0
			}, "配置模型与密钥"), W("button", {
				id: "retry-status",
				onClick: o[3] ||= (...e) => I(t).reconnectAgent && I(t).reconnectAgent(...e)
			}, "重新检测")])])) : q("", !0),
			I(n).context.size ? (H(), U("div", pl, [W("div", ml, [(H(!0), U(V, null, B(I(n).context, (e) => (H(), U("button", {
				key: e,
				class: "context-chip",
				"data-context-remove": e,
				title: m(e),
				"aria-label": `移除 ${e}`,
				onClick: (t) => I(n).context.delete(e)
			}, [K(k(e), 1), G(Q, { name: "close" })], 8, hl))), 128))]), W("button", {
				id: "clear-context",
				class: "icon-button",
				title: "清空论文上下文",
				"aria-label": "清空论文上下文",
				onClick: o[4] ||= (e) => I(n).context.clear()
			}, [G(Q, { name: "close" })])])) : q("", !0),
			W("div", {
				id: "messages",
				ref_key: "messages",
				ref: i,
				class: "messages",
				role: "log",
				"aria-label": "对话消息",
				"aria-live": "off"
			}, [(H(!0), U(V, null, B(I(n).chat?.messages || [], (e) => (H(), ui(Js, {
				key: e.id,
				message: e
			}, null, 8, ["message"]))), 128)), I(n).chat?.messages?.length ? q("", !0) : (H(), U("div", gl, [o[7] ||= W("h2", null, "从一个问题开始", -1), W("div", _l, [(H(), U(V, null, B(p, ([e, n, r]) => W("button", {
				key: n,
				class: "preset",
				"data-prompt": r,
				onClick: (e) => I(t).setDraft(r)
			}, [G(Q, { name: e }, null, 8, ["name"]), K(k(n), 1)], 8, vl)), 64))])]))], 512),
			f.value.length ? (H(), U("div", yl, [(H(!0), U(V, null, B(f.value, (e) => (H(), ui(dc, {
				key: e.id,
				draft: e
			}, null, 8, ["draft"]))), 128))])) : q("", !0),
			W("div", bl, [(H(!0), U(V, null, B(d.value, (e) => (H(), ui(ic, {
				key: e.id,
				approval: e
			}, null, 8, ["approval"]))), 128))]),
			G(js),
			a.value ? (H(), ui(el, {
				key: 4,
				onClose: o[5] ||= (e) => a.value = !1
			})) : q("", !0)
		]));
	}
}), Sl = {
	id: "downloads-view",
	class: "downloads-view"
}, Cl = { class: "download-columns" }, wl = { class: "surface-heading" }, Tl = ["value"], El = { class: "download-options" }, Dl = { class: "check-label" }, Ol = ["disabled"], kl = { class: "download-results" }, Al = { class: "section-heading" }, jl = { id: "download-jobs" }, Ml = {
	key: 0,
	class: "surface empty"
}, Nl = { class: "job-heading" }, Pl = {
	key: 0,
	class: "error-text"
}, Fl = {
	key: 1,
	class: "job-counts"
}, Il = ["data-job-details"], Ll = { class: "job-log" }, Rl = {
	key: 2,
	class: "surface empty"
}, zl = { class: "empty-art" }, Bl = { id: "download-batches" }, Vl = {
	key: 0,
	class: "section-heading"
}, Hl = { class: "job-heading" }, Ul = { class: "status-badge" }, Wl = { class: "batch-actions" }, Gl = ["disabled", "onClick"], Kl = "papers/09_情感综述调研/网站导入", ql = /* @__PURE__ */ z({
	__name: "DownloadPanel",
	setup(e) {
		let t = Pn("workspace"), n = t.state, r = /* @__PURE__ */ Lt({
			title: "",
			input: "",
			category: Kl,
			channel: "public",
			autoArchive: !1
		}), i = /* @__PURE__ */ F(!1), a = /* @__PURE__ */ Lt(/* @__PURE__ */ new Set()), o = J(() => uo(n.categories, Kl)), s = J(() => [...n.jobs.values()].reverse()), c = (e) => {
			let t = e.result;
			return t && typeof t == "object" ? t.counts : void 0;
		}, l = (e) => Object.entries(e && typeof e == "object" ? e : {}).map(([e, t]) => `${Ps[e] || e} ${String(t)}`).join(" · "), u = (e) => typeof e == "string" ? e : JSON.stringify(e), d = (e) => Array.isArray(e) ? e.map((e) => typeof e == "string" ? e : JSON.stringify(e)).join("\n") : typeof e == "string" && e ? e : "暂无日志", f = [
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
		return (e, h) => (H(), U("section", Sl, [h[21] ||= W("div", { class: "download-intro" }, [W("h2", null, "添加论文"), W("p", null, "输入 DOI 或题名，查看下载、核验与归档进度。")], -1), W("div", Cl, [W("form", {
			id: "download-form",
			class: "surface download-form",
			onSubmit: Y(p, ["prevent"])
		}, [
			W("div", wl, [G(Q, { name: "download" }), h[7] ||= W("h3", null, "新建下载任务", -1)]),
			h[12] ||= W("label", { for: "download-title" }, [K("任务名称 "), W("span", { class: "muted" }, "可选")], -1),
			R(W("input", {
				id: "download-title",
				"onUpdate:modelValue": h[0] ||= (e) => r.title = e,
				placeholder: "例如：语音情感识别 · 经典文献"
			}, null, 512), [[Ra, r.title]]),
			h[13] ||= W("label", { for: "download-input" }, "论文信息", -1),
			R(W("textarea", {
				id: "download-input",
				"onUpdate:modelValue": h[1] ||= (e) => r.input = e,
				rows: "7",
				required: "",
				placeholder: "粘贴 DOI、论文题名或 JSON 清单\n每行一项"
			}, null, 512), [[Ra, r.input]]),
			h[14] ||= W("label", { for: "download-category" }, "归档分类", -1),
			R(W("select", {
				id: "download-category",
				"onUpdate:modelValue": h[2] ||= (e) => r.category = e
			}, [(H(!0), U(V, null, B(o.value, ([e, t]) => (H(), U("option", {
				key: e,
				value: e
			}, k(t), 9, Tl))), 128))], 512), [[Va, r.category]]),
			W("div", El, [W("label", null, [h[9] ||= K("获取渠道", -1), R(W("select", {
				id: "download-channel",
				"onUpdate:modelValue": h[3] ||= (e) => r.channel = e
			}, [...h[8] ||= [
				W("option", { value: "public" }, "公开来源", -1),
				W("option", { value: "auto" }, "自动选择", -1),
				W("option", { value: "ieee" }, "IEEE / 机构渠道", -1)
			]], 512), [[Va, r.channel]])]), W("label", Dl, [R(W("input", {
				id: "auto-archive",
				"onUpdate:modelValue": h[4] ||= (e) => r.autoArchive = e,
				type: "checkbox"
			}, null, 512), [[za, r.autoArchive]]), h[10] ||= K("核验后自动归档", -1)])]),
			W("button", {
				id: "start-download",
				type: "submit",
				class: "button primary",
				disabled: i.value
			}, [G(Q, { name: "plus" }), h[11] ||= K("创建下载任务 ", -1)], 8, Ol),
			h[15] ||= W("p", { class: "muted form-note" }, "机构认证与需要确认的操作，由后端工具返回状态。", -1)
		], 32), W("div", kl, [
			W("div", Al, [h[17] ||= W("h3", null, "任务与批次", -1), W("button", {
				id: "refresh-downloads",
				class: "button subtle",
				onClick: h[5] ||= (...e) => I(t).loadDownloads && I(t).loadDownloads(...e)
			}, [G(Q, { name: "refresh" }), h[16] ||= K("刷新 ", -1)])]),
			W("div", jl, [I(n).downloadsError ? (H(), U("div", Ml, [W("p", null, k(I(n).downloadsError), 1), W("button", {
				class: "button subtle",
				onClick: h[6] ||= (...e) => I(t).loadDownloads && I(t).loadDownloads(...e)
			}, "重试")])) : (H(!0), U(V, { key: 1 }, B(s.value, (e) => (H(), U("article", {
				key: e.id,
				class: "job-card"
			}, [
				W("div", Nl, [W("h4", null, k(e.title || e.batch || e.id), 1), W("span", { class: O(["status-badge", { failed: ["error", "failed"].includes(e.status) }]) }, k(I(Ps)[e.status] || e.status || "状态待确认"), 3)]),
				e.error ? (H(), U("p", Pl, k(u(e.error)), 1)) : q("", !0),
				W("p", null, k(e.message || e.action || ""), 1),
				c(e) ? (H(), U("p", Fl, " 批次结果：" + k(l(c(e)) || "暂无计数"), 1)) : q("", !0),
				W("details", { "data-job-details": e.id }, [h[18] ||= W("summary", null, "查看任务日志", -1), W("pre", Ll, k(d(e.log)), 1)], 8, Il)
			]))), 128)), !I(n).downloadsError && !s.value.length ? (H(), U("div", Rl, [W("span", zl, [G(Q, { name: "download" })]), h[19] ||= W("p", null, "暂无下载任务", -1)])) : q("", !0)]),
			W("div", Bl, [I(n).batches.length ? (H(), U("div", Vl, [...h[20] ||= [W("h3", null, "已有下载批次", -1)]])) : q("", !0), (H(!0), U(V, null, B(I(n).batches, (e) => (H(), U("article", {
				key: e.batch,
				class: "batch-card"
			}, [
				W("div", Hl, [W("h4", null, k(e.batch), 1), W("span", Ul, k(e.entries) + " 条", 1)]),
				W("p", null, k(l(e.counts)), 1),
				W("div", Wl, [(H(), U(V, null, B(f, ([t, n]) => W("button", {
					key: t,
					class: "button subtle",
					disabled: a.has(`${e.batch}:${t}`),
					onClick: (n) => m(e.batch, t)
				}, k(n), 9, Gl)), 64))])
			]))), 128))])
		])])]));
	}
}), Jl = { class: "import-head" }, Yl = ["disabled"], Xl = { class: "import-body" }, Zl = { class: "import-pick" }, Ql = ["disabled"], $l = { class: "import-file-icon" }, eu = { class: "import-file-text" }, tu = ["disabled"], nu = {
	key: 0,
	class: "import-list"
}, ru = { class: "import-list-head" }, iu = ["disabled"], au = { class: "import-items" }, ou = { class: "import-item-head" }, su = { class: "import-item-index" }, cu = { class: "import-item-main" }, lu = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], uu = { class: "import-item-file" }, du = {
	key: 0,
	class: "import-item-badge"
}, fu = {
	key: 1,
	class: "import-item-badge failed"
}, pu = [
	"title",
	"aria-label",
	"aria-expanded",
	"disabled",
	"onClick"
], mu = ["disabled", "onClick"], hu = {
	key: 0,
	class: "import-item-extra"
}, gu = { class: "import-field wide" }, _u = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], vu = { class: "import-field" }, yu = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], bu = { class: "import-field" }, xu = [
	"onUpdate:modelValue",
	"aria-label",
	"disabled"
], Su = { class: "import-fields" }, Cu = { class: "import-field wide" }, wu = ["disabled"], Tu = ["value"], Eu = {
	key: 1,
	class: "import-check"
}, Du = ["disabled"], Ou = {
	key: 2,
	class: "import-error",
	role: "alert"
}, ku = {
	key: 3,
	class: "import-summary",
	role: "status"
}, Au = {
	key: 4,
	class: "import-progress",
	role: "status"
}, ju = {
	key: 5,
	class: "import-log-wrap"
}, Mu = { class: "import-log" }, Nu = { class: "import-actions" }, Pu = ["disabled"], Fu = ["disabled"], Iu = 100, Lu = /* @__PURE__ */ z({
	__name: "ImportPaperDialog",
	emits: ["close", "imported"],
	setup(e, { emit: t }) {
		let n = Pn("workspace"), r = n.state, i = t, a = /* @__PURE__ */ F(null), o = /* @__PURE__ */ F(null), s = /* @__PURE__ */ F(null), c = /* @__PURE__ */ Lt({
			category: "papers/09_情感综述调研/网站导入",
			confirmed: !1
		}), l = /* @__PURE__ */ Lt([]), u = /* @__PURE__ */ F(""), d = /* @__PURE__ */ F(!1), f = /* @__PURE__ */ F(null), p = /* @__PURE__ */ F(!1), m = /* @__PURE__ */ F("idle"), h = /* @__PURE__ */ F(""), g = /* @__PURE__ */ F(0), _ = /* @__PURE__ */ F([]), v = /* @__PURE__ */ F(null), y = /* @__PURE__ */ F(null), b = 0, x = J(() => {
			let e = uo(r.categories), t = f.value;
			return t && !e.some(([e]) => e === t[0]) && e.push(t), e;
		}), S = J(() => m.value === "uploading" || m.value === "processing"), C = J(() => {
			let e = y.value?.log;
			return (Array.isArray(e) ? e.join("") : typeof e == "string" ? e : "").slice(-4e3);
		}), w = J(() => l.length - _.value.length), ee = J(() => {
			let e = y.value?.steps || [], t = e.filter((e) => e.action === "attach" && e.status === "completed").length, n = e.some((e) => e.action === "archive");
			return Math.min(t + +!!n, w.value);
		}), te = J(() => m.value === "uploading" ? "正在上传…" : m.value === "processing" ? "正在归档…" : m.value === "failed" ? "重试" : l.length > 1 ? `导入并归档 ${l.length} 篇` : "导入并归档");
		tr(() => {
			let e = a.value;
			typeof e?.showModal == "function" ? e.showModal() : e?.setAttribute("open", "");
		});
		function T() {
			if (S.value) return;
			let e = a.value;
			typeof e?.close == "function" && e.close(), i("close");
		}
		function E(e) {
			e.target === a.value && !S.value && T();
		}
		function ne(e) {
			let t = e / 1024 / 1024;
			return t >= 1 ? `${t.toFixed(1)} MB` : `${Math.max(1, Math.round(e / 1024))} KB`;
		}
		function D() {
			for (let e of [o.value, s.value]) e && (e.value = "");
		}
		function re(e) {
			le(e.target.files), D();
		}
		function ie() {
			o.value?.click();
		}
		function ae() {
			s.value?.click();
		}
		function oe(e) {
			let t = /* @__PURE__ */ new Set();
			for (let n of Array.from(e)) {
				let e = n.webkitRelativePath || "";
				e.includes("/") && t.add(e.split("/")[0]);
			}
			return t.size === 1 ? [...t][0] : "";
		}
		function se(e) {
			let t = (e) => String(e).replace(/^\d+_/, "").trim().toLocaleLowerCase(), n = x.value, r = n.find(([t]) => t.split("/")[1] === e);
			if (r) return r[0];
			let i = n.find(([n]) => t(n.split("/")[1]) === t(e));
			return i ? i[0] : "";
		}
		function ce(e) {
			let t = String(e || "").trim();
			return !t || t === "." || t === ".." || t.includes("..") || /[\\/:*?"<>|\x00-\x1f\x7f]/.test(t) || /[. ]$/.test(t) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(t) ? null : {
				value: `papers/${t}/网站导入`,
				label: `${t.replace(/^\d+_/, "")} / 网站导入（新建）`
			};
		}
		function le(e, t = "") {
			if (S.value) return;
			h.value = "";
			let n = !l.length, r = (e ? oe(e) : "") || t, i = [], a = 0, o = 0;
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
				if (l.length >= Iu) {
					o += 1;
					continue;
				}
				let e = t.webkitRelativePath || t.name;
				if (l.some((n) => n.relative === e && n.size === t.size && n.lastModified === t.lastModified)) continue;
				let n = `f${++b}`, r = t.name.replace(/\.pdf$/i, "").replace(/[_\s]+/g, " ").trim();
				l.push({
					key: n,
					file: Gt(t),
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
				let e = se(r);
				if (e) f.value = null, c.category = e;
				else {
					let e = ce(r);
					e && (f.value = [e.value, e.label], c.category = e.value);
				}
			}
			if (!u.value && l.length === 1 && (u.value = l[0]?.key ?? ""), a && (c.confirmed = !1), o && i.unshift(`每次最多导入 ${Iu} 个 PDF，其余 ${o} 个未加入`), i.length) {
				let e = i.length > 3 ? `；另有 ${i.length - 3} 个未加入` : "";
				h.value = `${i.slice(0, 3).join("；")}${e}。`;
			} else a || (h.value = "所选内容中没有可导入的 PDF。");
		}
		async function ue(e, t) {
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
				for (let n of e) await ue(n, t);
				if (t.length > Iu) break;
			}
		}
		async function de(e) {
			if (p.value = !1, S.value) return;
			let t = e.dataTransfer;
			if (!t) return;
			let n = [...t.items || []].map((e) => e.kind === "file" ? e.webkitGetAsEntry?.() : null).filter((e) => !!e);
			if (!n.length) {
				le(t.files);
				return;
			}
			let r = [];
			try {
				for (let e of n) await ue(e, r);
			} catch {
				h.value = "无法读取拖入的部分文件，请改用“选择文件”或“选择文件夹”。";
				return;
			}
			if (!r.length) {
				h.value = "拖入的内容中没有可导入的 PDF。";
				return;
			}
			let i = n[0];
			le(r, n.length === 1 && i.isDirectory ? i.name : "");
		}
		function fe(e) {
			u.value = u.value === e.key ? "" : e.key;
		}
		function pe(e) {
			if (S.value) return;
			let t = l.indexOf(e);
			t < 0 || (l.splice(t, 1), u.value === e.key && (u.value = ""), l.length || he());
		}
		function me() {
			!S.value && l.length && window.confirm("清空已选文件和已填信息？") && (l.splice(0), u.value = "", d.value = !1, f.value = null, he(), D());
		}
		function he() {
			c.confirmed = !1, m.value = "idle", h.value = "", _.value = [], v.value = null, y.value = null;
		}
		function ge() {
			if (!l.length) return "请选择要导入的 PDF。";
			for (let [e, t] of l.entries()) {
				if (!t.title.trim()) return u.value = t.key, `第 ${e + 1} 个文件缺少题名。`;
				if (t.year && !/^\d{4}$/.test(t.year.trim())) return u.value = t.key, `第 ${e + 1} 个文件的年份需为四位数字。`;
				let n = t.doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
				if (n && !/^10\.\d{4,9}\/\S+$/.test(n)) return u.value = t.key, `第 ${e + 1} 个文件的 DOI 格式不正确。`;
			}
			return c.confirmed ? "" : "请先核对题名与作者信息。";
		}
		async function _e(e) {
			for (;;) {
				let t = await n.api(`/api/jobs/${oo(e)}`);
				if (r.jobs.set(t.id, t), y.value = t, t.status === "completed") return t;
				if (t.status === "failed") throw Error(t.error || "导入任务失败。");
				await new Promise((e) => setTimeout(e, 800));
			}
		}
		async function ve() {
			if (S.value) return;
			h.value = "";
			let e = ge();
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
				let s = await _e(e.id);
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
		return (e, t) => (H(), U("dialog", {
			ref_key: "dialog",
			ref: a,
			class: "import-dialog",
			"aria-labelledby": "import-title",
			onCancel: Y(T, ["prevent"]),
			onClick: E
		}, [W("form", {
			class: "import-sheet",
			onSubmit: Y(ve, ["prevent"])
		}, [
			W("header", Jl, [t[5] ||= W("div", null, [W("h2", { id: "import-title" }, "导入 PDF"), W("p", null, "可多选或添加文件夹，核对题名后批量归档。")], -1), W("button", {
				type: "button",
				class: "icon-button",
				title: "关闭",
				"aria-label": "关闭",
				disabled: S.value,
				onClick: T
			}, [G(Q, { name: "close" })], 8, Yl)]),
			W("div", Xl, [
				W("input", {
					ref_key: "fileInput",
					ref: o,
					type: "file",
					accept: ".pdf,application/pdf",
					multiple: "",
					hidden: "",
					onChange: re
				}, null, 544),
				W("input", {
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
				W("div", Zl, [W("button", {
					type: "button",
					class: O(["import-file", {
						dragging: p.value,
						compact: l.length
					}]),
					disabled: S.value,
					onClick: ie,
					onDragover: t[0] ||= Y((e) => p.value = !0, ["prevent"]),
					onDragleave: t[1] ||= (e) => p.value = !1,
					onDrop: Y(de, ["prevent"])
				}, [W("span", $l, [G(Q, { name: "upload" })]), W("span", eu, [W("strong", null, k(l.length ? "继续添加 PDF" : "选择 PDF 文件"), 1), W("small", null, k(l.length ? "可多选，或把文件、文件夹拖到这里" : "可多选，或把文件、文件夹拖到这里，单个最大 25 MB"), 1)])], 42, Ql), W("button", {
					type: "button",
					class: "import-folder",
					disabled: S.value,
					onClick: ae
				}, [G(Q, { name: "folder" }), t[6] ||= W("span", null, "选择文件夹", -1)], 8, tu)]),
				l.length ? (H(), U("div", nu, [W("div", ru, [W("span", null, [K(k(l.length) + " 个 PDF ", 1), _.value.length ? (H(), U(V, { key: 0 }, [K(" · 跳过 " + k(_.value.length) + " 个", 1)], 64)) : q("", !0)]), W("button", {
					type: "button",
					class: "text-button",
					disabled: S.value,
					onClick: me
				}, " 清空 ", 8, iu)]), W("div", au, [(H(!0), U(V, null, B(l, (e, n) => (H(), U("article", {
					key: e.key,
					class: O(["import-item", e.status])
				}, [W("div", ou, [
					W("span", su, k(n + 1), 1),
					W("div", cu, [R(W("input", {
						"onUpdate:modelValue": (t) => e.title = t,
						class: "import-item-title",
						maxlength: "300",
						placeholder: "题名（必填，与 PDF 首页一致）",
						"aria-label": `第 ${n + 1} 个文件的题名`,
						disabled: S.value
					}, null, 8, lu), [[Ra, e.title]]), W("small", uu, [K(k(e.relative) + " · " + k(ne(e.size)), 1), e.note ? (H(), U(V, { key: 0 }, [K(" · " + k(e.note), 1)], 64)) : q("", !0)])]),
					e.status === "skipped" ? (H(), U("span", du, "已跳过")) : e.status === "error" ? (H(), U("span", fu, "未完成")) : q("", !0),
					W("button", {
						type: "button",
						class: O(["icon-button import-item-more", { open: u.value === e.key }]),
						title: u.value === e.key ? "收起作者、年份和 DOI" : "填写作者、年份和 DOI",
						"aria-label": u.value === e.key ? "收起书目信息" : "展开书目信息",
						"aria-expanded": u.value === e.key,
						disabled: S.value,
						onClick: (t) => fe(e)
					}, [G(Q, { name: "chevron" })], 10, pu),
					W("button", {
						type: "button",
						class: "icon-button",
						title: "移除",
						"aria-label": "移除",
						disabled: S.value,
						onClick: (t) => pe(e)
					}, [G(Q, { name: "close" })], 8, mu)
				]), u.value === e.key ? (H(), U("div", hu, [
					W("label", gu, [t[7] ||= W("span", null, [K("作者 "), W("small", null, "多位作者用分号隔开")], -1), R(W("input", {
						"onUpdate:modelValue": (t) => e.authors = t,
						maxlength: "3000",
						placeholder: "例如：张三; 李四",
						"aria-label": `第 ${n + 1} 个文件的作者`,
						disabled: S.value
					}, null, 8, _u), [[Ra, e.authors]])]),
					W("label", vu, [t[8] ||= W("span", null, "年份", -1), R(W("input", {
						"onUpdate:modelValue": (t) => e.year = t,
						inputmode: "numeric",
						maxlength: "4",
						placeholder: "2024",
						"aria-label": `第 ${n + 1} 个文件的年份`,
						disabled: S.value
					}, null, 8, yu), [[Ra, e.year]])]),
					W("label", bu, [t[9] ||= W("span", null, [K("DOI "), W("small", null, "可选")], -1), R(W("input", {
						"onUpdate:modelValue": (t) => e.doi = t,
						maxlength: "300",
						placeholder: "10.xxxx/xxxxx",
						"aria-label": `第 ${n + 1} 个文件的 DOI`,
						disabled: S.value
					}, null, 8, xu), [[Ra, e.doi]])])
				])) : q("", !0)], 2))), 128))])])) : q("", !0),
				W("div", Su, [W("label", Cu, [t[10] ||= W("span", null, "归档分类", -1), R(W("select", {
					"onUpdate:modelValue": t[2] ||= (e) => c.category = e,
					disabled: S.value || m.value === "done",
					onChange: t[3] ||= (e) => d.value = !0
				}, [(H(!0), U(V, null, B(x.value, ([e, t]) => (H(), U("option", {
					key: e,
					value: e
				}, k(t), 9, Tu))), 128))], 40, wu), [[Va, c.category]])])]),
				m.value === "done" ? q("", !0) : (H(), U("label", Eu, [R(W("input", {
					"onUpdate:modelValue": t[4] ||= (e) => c.confirmed = e,
					type: "checkbox",
					disabled: S.value
				}, null, 8, Du), [[za, c.confirmed]]), W("span", null, k(l.length > 1 ? "我已核对以上文件的题名与作者信息，并有权保存这些文件。" : "我已核对题名与作者与 PDF 首页一致，并有权保存该文件。"), 1)])),
				h.value ? (H(), U("p", Ou, k(h.value), 1)) : q("", !0),
				m.value === "done" ? (H(), U("p", ku, [
					K(" 已归档 " + k(v.value?.archived || 0) + " 篇", 1),
					v.value?.skipped ? (H(), U(V, { key: 0 }, [K("，跳过 " + k(v.value.skipped) + " 个重复文件", 1)], 64)) : q("", !0),
					t[11] ||= K("。 ", -1)
				])) : q("", !0),
				S.value ? (H(), U("div", Au, [t[12] ||= W("span", { class: "busy-spinner" }, null, -1), m.value === "uploading" ? (H(), U(V, { key: 0 }, [K(" 正在上传第 " + k(g.value) + " / " + k(l.length) + " 个文件… ", 1)], 64)) : (H(), U(V, { key: 1 }, [K(" 正在核验并归档 " + k(ee.value) + " / " + k(w.value) + " 篇… ", 1)], 64))])) : q("", !0),
				(m.value === "failed" || m.value === "done") && C.value ? (H(), U("details", ju, [t[13] ||= W("summary", null, "查看任务日志", -1), W("pre", Mu, k(C.value), 1)])) : q("", !0)
			]),
			W("footer", Nu, [m.value === "done" ? (H(), U("button", {
				key: 0,
				type: "button",
				class: "button primary",
				onClick: T
			}, "完成")) : (H(), U(V, { key: 1 }, [W("button", {
				type: "button",
				class: "button subtle",
				disabled: S.value,
				onClick: T
			}, " 取消 ", 8, Pu), W("button", {
				id: "import-paper-submit",
				type: "submit",
				class: "button primary",
				disabled: S.value || !l.length
			}, [G(Q, { name: "upload" }), K(k(te.value), 1)], 8, Fu)], 64))])
		], 32)], 544));
	}
}), Ru = {
	class: "shell",
	"data-framework": "vue"
}, zu = { class: "main" }, Bu = { class: "topbar" }, Vu = { id: "page-title" }, Hu = { class: "top-actions" }, Uu = {
	id: "library-summary",
	class: "muted"
}, Wu = {
	class: "mobile-tabs",
	"aria-label": "工作面板"
}, Gu = ["data-panel", "onClick"], Ku = ["data-panel"], qu = {
	id: "toast-region",
	class: "toast-region",
	role: "status",
	"aria-live": "polite"
}, Ju = /* @__PURE__ */ z({
	__name: "Workspace",
	props: { workspace: {} },
	setup(e) {
		let t = e;
		Nn("workspace", t.workspace);
		let n = t.workspace, r = n.state, i = J(() => r.papers.filter((e) => e.notes?.length).length);
		function a(e) {
			n.setView("library"), e && n.selectPaper(e);
		}
		let o = [
			["list", "文献"],
			["reader", "阅读"],
			["chat", "研究助手"]
		], s, c;
		return tr(() => {
			s = ro(document, {
				widths: r.panelWidths,
				onSave: (e) => n.saveUiState({ panelWidths: e })
			}), c = new window.AbortController(), Ln(() => r.panelWidths, (e) => s?.setWidths(e), { deep: !0 }), document.addEventListener("keydown", (e) => {
				let t = e.target;
				e.key !== "/" || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || (e.preventDefault(), n.setView("library"), n.setPanel("list"), document.querySelector("#search")?.focus());
			}, { signal: c.signal });
		}), nr(() => {
			s?.dispose(), c?.abort(), n.stop();
		}), (e, t) => (H(), U(V, null, [W("div", Ru, [
			G(Fo),
			W("main", zu, [
				W("header", Bu, [W("h1", Vu, k(I(r).view === "library" ? "文献" : "下载任务"), 1), W("div", Hu, [W("span", Uu, k(I(r).papers.length) + " 篇文献 · " + k(i.value) + " 篇有笔记", 1)])]),
				R(W("div", Wu, [(H(), U(V, null, B(o, ([e, t]) => W("button", {
					key: e,
					class: O({ active: I(r).panel === e }),
					"data-panel": e,
					onClick: (t) => I(n).setPanel(e)
				}, k(t), 11, Gu)), 64))], 512), [[ra, I(r).view === "library"]]),
				R(W("section", {
					id: "library-view",
					class: "library-layout",
					"data-panel": I(r).panel
				}, [
					G(os),
					G(cs),
					G(xl)
				], 8, Ku), [[ra, I(r).view === "library"]]),
				R(G(ql, null, null, 512), [[ra, I(r).view === "downloads"]])
			]),
			I(r).importOpen ? (H(), ui(Lu, {
				key: 0,
				onClose: t[0] ||= (e) => I(r).importOpen = !1,
				onImported: a
			})) : q("", !0)
		]), W("div", qu, [(H(!0), U(V, null, B(I(r).toasts, (e) => (H(), U("div", {
			key: e.id,
			class: O(["toast", { error: e.error }])
		}, k(e.message), 3))), 128))])], 64));
	}
});
// app/web/frontend/main.ts
function Yu(e, t = {}) {
	let n = Is(t), r = $a(Ju, { workspace: n });
	return r.mount(e), {
		app: r,
		workspace: n,
		ready: n.start(),
		version: Wi,
		unmount: () => r.unmount()
	};
}
typeof document < "u" && document.querySelector("#app") && Yu("#app");
export { Is as createWorkspace, Yu as mountWorkspace };
