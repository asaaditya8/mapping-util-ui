
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Jaro.svelte generated by Svelte v3.59.2 */

    function create_fragment$2(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const JaroWrinker = (s1, s2) => {
    	let m = 0;

    	// Exit early if either are empty.
    	if (s1.length === 0 || s2.length === 0) {
    		return 0;
    	}

    	// Exit early if they're an exact match.
    	if (s1 === s2) {
    		return 1;
    	}

    	let range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1,
    		s1Matches = new Array(s1.length),
    		s2Matches = new Array(s2.length);

    	let i = 0;
    	let j = 0;

    	for (i = 0; i < s1.length; i++) {
    		let low = i >= range ? i - range : 0,
    			high = i + range <= s2.length ? i + range : s2.length - 1;

    		for (j = low; j <= high; j++) {
    			if (s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j]) {
    				++m;
    				s1Matches[i] = s2Matches[j] = true;
    				break;
    			}
    		}
    	}

    	// Exit early if no matches were found.
    	if (m === 0) {
    		return 0;
    	}

    	// Count the transpositions.
    	let k = 0;

    	let n_trans = 0;

    	for (i = 0; i < s1.length; i++) {
    		if (s1Matches[i] === true) {
    			for (j = k; j < s2.length; j++) {
    				if (s2Matches[j] === true) {
    					k = j + 1;
    					break;
    				}
    			}

    			if (s1[i] !== s2[j]) {
    				++n_trans;
    			}
    		}
    	}

    	let weight = (m / s1.length + m / s2.length + (m - n_trans / 2) / m) / 3,
    		l = 0,
    		p = 0.1;

    	if (weight > 0.7) {
    		while (s1[l] === s2[l] && l < 4) {
    			++l;
    		}

    		weight = weight + l * p * (1 - weight);
    	}

    	return weight;
    };

    const naiveSort = (a, b) => {
    	let fa = a.text.toLowerCase();
    	let fb = b.text.toLowerCase();

    	if (fa < fb) {
    		return -1;
    	}

    	if (fa > fb) {
    		return 1;
    	}

    	return 0;
    };

    const bigSort = (o1, o2, common) => {
    	// console.log(o1, o2, common);
    	let v1 = JaroWrinker(o1, common);

    	let v2 = JaroWrinker(o2, common);

    	// console.log('sort', v1, v2);
    	return v2 - v1;
    };

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Jaro', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Jaro> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ JaroWrinker, naiveSort, bigSort });
    	return [];
    }

    class Jaro extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Jaro",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/List.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$1 = "src/List.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (107:16) {#each mapped_l_keys as item}
    function create_each_block_3(ctx) {
    	let div;
    	let button;
    	let t0_value = /*data_l*/ ctx[7][/*item*/ ctx[23]] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(button, file$1, 108, 20, 3732);
    			attr_dev(div, "class", "box jr svelte-75kzfj");
    			add_location(div, file$1, 107, 16, 3691);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data_l, mapped_l_keys*/ 136 && t0_value !== (t0_value = /*data_l*/ ctx[7][/*item*/ ctx[23]] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(107:16) {#each mapped_l_keys as item}",
    		ctx
    	});

    	return block;
    }

    // (117:16) {#each mapped_r_keys as item}
    function create_each_block_2(ctx) {
    	let div;
    	let button;
    	let t0_value = /*data_r*/ ctx[8][/*item*/ ctx[23]] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(button, file$1, 118, 20, 4022);
    			attr_dev(div, "class", "box jl svelte-75kzfj");
    			add_location(div, file$1, 117, 16, 3981);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data_r, mapped_r_keys*/ 272 && t0_value !== (t0_value = /*data_r*/ ctx[8][/*item*/ ctx[23]] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(117:16) {#each mapped_r_keys as item}",
    		ctx
    	});

    	return block;
    }

    // (133:16) {#each unmapped_l_keys as i}
    function create_each_block_1(ctx) {
    	let div;
    	let button;
    	let t0_value = /*data_l*/ ctx[7][/*i*/ ctx[18]] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[16](/*i*/ ctx[18]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(button, file$1, 134, 20, 4437);
    			attr_dev(div, "class", "box jr svelte-75kzfj");
    			add_location(div, file$1, 133, 16, 4396);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_2, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*data_l, unmapped_l_keys*/ 160 && t0_value !== (t0_value = /*data_l*/ ctx[7][/*i*/ ctx[18]] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(133:16) {#each unmapped_l_keys as i}",
    		ctx
    	});

    	return block;
    }

    // (146:16) {#each unmapped_r_keys as i}
    function create_each_block(ctx) {
    	let div;
    	let button;
    	let t0_value = /*data_r*/ ctx[8][/*i*/ ctx[18]] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[17](/*i*/ ctx[18]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(button, file$1, 147, 20, 4836);
    			attr_dev(div, "class", "box jl svelte-75kzfj");
    			add_location(div, file$1, 146, 16, 4795);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_3, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*data_r, unmapped_r_keys*/ 320 && t0_value !== (t0_value = /*data_r*/ ctx[8][/*i*/ ctx[18]] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(146:16) {#each unmapped_r_keys as i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let div0;
    	let button0;
    	let t1;
    	let textarea0;
    	let t2;
    	let button1;
    	let t4;
    	let div1;
    	let button2;
    	let t6;
    	let textarea1;
    	let t7;
    	let div13;
    	let div7;
    	let div3;
    	let t9;
    	let div6;
    	let div4;
    	let t10;
    	let div5;
    	let t11;
    	let div12;
    	let div8;
    	let t13;
    	let div11;
    	let div9;
    	let t14;
    	let div10;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*mapped_l_keys*/ ctx[3];
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*mapped_r_keys*/ ctx[4];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*unmapped_l_keys*/ ctx[5];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*unmapped_r_keys*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "+ Spec";
    			t1 = space();
    			textarea0 = element("textarea");
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "+ Dict";
    			t4 = space();
    			div1 = element("div");
    			button2 = element("button");
    			button2.textContent = "Export";
    			t6 = space();
    			textarea1 = element("textarea");
    			t7 = space();
    			div13 = element("div");
    			div7 = element("div");
    			div3 = element("div");
    			div3.textContent = "Mapped";
    			t9 = space();
    			div6 = element("div");
    			div4 = element("div");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t10 = space();
    			div5 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t11 = space();
    			div12 = element("div");
    			div8 = element("div");
    			div8.textContent = "Unmapped";
    			t13 = space();
    			div11 = element("div");
    			div9 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t14 = space();
    			div10 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(button0, file$1, 89, 8, 3153);
    			add_location(textarea0, file$1, 90, 8, 3216);
    			add_location(button1, file$1, 91, 8, 3267);
    			add_location(div0, file$1, 88, 4, 3139);
    			add_location(button2, file$1, 94, 8, 3351);
    			textarea1.value = /*exportText*/ ctx[1];
    			add_location(textarea1, file$1, 95, 8, 3410);
    			add_location(div1, file$1, 93, 4, 3337);
    			attr_dev(div2, "class", "row svelte-75kzfj");
    			add_location(div2, file$1, 87, 0, 3117);
    			attr_dev(div3, "class", "row svelte-75kzfj");
    			add_location(div3, file$1, 101, 8, 3521);
    			attr_dev(div4, "class", "col svelte-75kzfj");
    			add_location(div4, file$1, 105, 12, 3611);
    			attr_dev(div5, "class", "col svelte-75kzfj");
    			add_location(div5, file$1, 115, 12, 3901);
    			attr_dev(div6, "class", "row svelte-75kzfj");
    			add_location(div6, file$1, 104, 8, 3581);
    			attr_dev(div7, "class", "col m1 svelte-75kzfj");
    			add_location(div7, file$1, 100, 4, 3492);
    			attr_dev(div8, "class", "row svelte-75kzfj");
    			add_location(div8, file$1, 127, 8, 4225);
    			attr_dev(div9, "class", "col svelte-75kzfj");
    			add_location(div9, file$1, 131, 12, 4317);
    			attr_dev(div10, "class", "col svelte-75kzfj");
    			add_location(div10, file$1, 144, 12, 4716);
    			attr_dev(div11, "class", "row svelte-75kzfj");
    			add_location(div11, file$1, 130, 8, 4287);
    			attr_dev(div12, "class", "col m1 svelte-75kzfj");
    			add_location(div12, file$1, 126, 4, 4196);
    			attr_dev(div13, "class", "row svelte-75kzfj");
    			add_location(div13, file$1, 99, 0, 3470);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t1);
    			append_dev(div0, textarea0);
    			set_input_value(textarea0, /*newText*/ ctx[0]);
    			append_dev(div0, t2);
    			append_dev(div0, button1);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, button2);
    			append_dev(div1, t6);
    			append_dev(div1, textarea1);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div7);
    			append_dev(div7, div3);
    			append_dev(div7, t9);
    			append_dev(div7, div6);
    			append_dev(div6, div4);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				if (each_blocks_3[i]) {
    					each_blocks_3[i].m(div4, null);
    				}
    			}

    			append_dev(div6, t10);
    			append_dev(div6, div5);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(div5, null);
    				}
    			}

    			append_dev(div13, t11);
    			append_dev(div13, div12);
    			append_dev(div12, div8);
    			append_dev(div12, t13);
    			append_dev(div12, div11);
    			append_dev(div11, div9);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(div9, null);
    				}
    			}

    			append_dev(div11, t14);
    			append_dev(div11, div10);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div10, null);
    				}
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[13], false, false, false, false),
    					listen_dev(textarea0, "input", /*textarea0_input_handler*/ ctx[14]),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[15], false, false, false, false),
    					listen_dev(button2, "click", /*exportHandler*/ ctx[11], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*newText*/ 1) {
    				set_input_value(textarea0, /*newText*/ ctx[0]);
    			}

    			if (dirty & /*exportText*/ 2) {
    				prop_dev(textarea1, "value", /*exportText*/ ctx[1]);
    			}

    			if (dirty & /*data_l, mapped_l_keys*/ 136) {
    				each_value_3 = /*mapped_l_keys*/ ctx[3];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty & /*data_r, mapped_r_keys*/ 272) {
    				each_value_2 = /*mapped_r_keys*/ ctx[4];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div5, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*selected_l, unmapped_l_keys, sort_r, data_l*/ 4260) {
    				each_value_1 = /*unmapped_l_keys*/ ctx[5];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div9, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*popHandler, unmapped_r_keys, data_r*/ 1344) {
    				each_value = /*unmapped_r_keys*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div10, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div13);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('List', slots, []);
    	let newText;
    	let exportText;
    	let selected_l;
    	let mapped_l_keys = [];
    	let mapped_r_keys = [];
    	let unmapped_l_keys = [];
    	let unmapped_r_keys = [];
    	let data_l = {};
    	let data_r = {};

    	// let unmapped_l_keys = [0, 1, 2, 3, 4];
    	// let unmapped_r_keys = [0, 1, 2, 3, 4];
    	// let data_l = {0:"Member ID",1:"SSN",2:"Revenue",3:"Code",4:"Quantity"};
    	// let data_r = {0:"Service NPI", 1:"Member Num", 2:"Claim Num", 3:"Drug Code", 4:"Drug Quantity"};
    	const addHandler = sel_id => {
    		if (sel_id == 0) {
    			if (newText) {
    				let rows = newText.split('\n');

    				let idx = Object.keys(data_l).length > 0
    				? Object.keys(data_l).reduce((a, b) => Math.max(parseInt(a), parseInt(b))) + 1
    				: 0;

    				for (let i = 0; i < rows.length; i++) {
    					const element = rows[i];
    					let j = idx + i;
    					$$invalidate(7, data_l[j] = element, data_l);
    					unmapped_l_keys.push(j);
    				}

    				$$invalidate(7, data_l);
    				$$invalidate(5, unmapped_l_keys);
    				$$invalidate(0, newText = '');
    			}
    		} else if (sel_id == 1) {
    			if (newText) {
    				let rows = newText.split('\n');

    				let idx = Object.keys(data_r).length > 0
    				? Object.keys(data_r).reduce((a, b) => Math.max(parseInt(a), parseInt(b))) + 1
    				: 0;

    				for (let i = 0; i < rows.length; i++) {
    					const element = rows[i];
    					let j = idx + i;
    					$$invalidate(8, data_r[j] = element, data_r);
    					unmapped_r_keys.push(j);
    				}

    				$$invalidate(8, data_r);
    				$$invalidate(6, unmapped_r_keys);
    				$$invalidate(0, newText = '');
    			}
    		} else ;
    	};

    	const popHandler = selected_r => {
    		console.log(selected_r);

    		if (selected_l > -1) {
    			$$invalidate(5, unmapped_l_keys = unmapped_l_keys.filter(x => x != selected_l));
    			$$invalidate(6, unmapped_r_keys = unmapped_r_keys.filter(x => x != selected_r));
    			$$invalidate(3, mapped_l_keys = [...mapped_l_keys, selected_l]);
    			$$invalidate(4, mapped_r_keys = [...mapped_r_keys, selected_r]);
    			$$invalidate(2, selected_l = -1);
    		}
    	};

    	const exportHandler = () => {
    		$$invalidate(1, exportText = '');

    		for (let i = 0; i < mapped_l_keys.length; i++) {
    			let l = data_l[mapped_l_keys[i]];
    			let r = data_r[mapped_r_keys[i]];
    			$$invalidate(1, exportText += l + ', ' + r + '\n');
    		}

    		for (let i = 0; i < unmapped_l_keys.length; i++) {
    			let l = data_l[unmapped_l_keys[i]];
    			$$invalidate(1, exportText += l + ',\n');
    		}
    	};

    	const sort_r = idx => {
    		console.log(idx);
    		unmapped_r_keys.sort((a, b) => bigSort(data_r[a], data_r[b], data_l[idx]));

    		// data_r.sort((a, b) => bigSort(a.text, b.text, data_l.filter((x)=>x.id==idx)[0].text));
    		// (a, b) => bigSort(a, b, data_l[idx].text)
    		$$invalidate(6, unmapped_r_keys);
    	};

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => addHandler(0);

    	function textarea0_input_handler() {
    		newText = this.value;
    		$$invalidate(0, newText);
    	}

    	const click_handler_1 = () => addHandler(1);

    	const click_handler_2 = i => {
    		$$invalidate(2, selected_l = i);
    		sort_r(i);
    	};

    	const click_handler_3 = i => {
    		popHandler(i);
    	};

    	$$self.$capture_state = () => ({
    		Jaro,
    		bigSort,
    		newText,
    		exportText,
    		selected_l,
    		mapped_l_keys,
    		mapped_r_keys,
    		unmapped_l_keys,
    		unmapped_r_keys,
    		data_l,
    		data_r,
    		addHandler,
    		popHandler,
    		exportHandler,
    		sort_r
    	});

    	$$self.$inject_state = $$props => {
    		if ('newText' in $$props) $$invalidate(0, newText = $$props.newText);
    		if ('exportText' in $$props) $$invalidate(1, exportText = $$props.exportText);
    		if ('selected_l' in $$props) $$invalidate(2, selected_l = $$props.selected_l);
    		if ('mapped_l_keys' in $$props) $$invalidate(3, mapped_l_keys = $$props.mapped_l_keys);
    		if ('mapped_r_keys' in $$props) $$invalidate(4, mapped_r_keys = $$props.mapped_r_keys);
    		if ('unmapped_l_keys' in $$props) $$invalidate(5, unmapped_l_keys = $$props.unmapped_l_keys);
    		if ('unmapped_r_keys' in $$props) $$invalidate(6, unmapped_r_keys = $$props.unmapped_r_keys);
    		if ('data_l' in $$props) $$invalidate(7, data_l = $$props.data_l);
    		if ('data_r' in $$props) $$invalidate(8, data_r = $$props.data_r);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		newText,
    		exportText,
    		selected_l,
    		mapped_l_keys,
    		mapped_r_keys,
    		unmapped_l_keys,
    		unmapped_r_keys,
    		data_l,
    		data_r,
    		addHandler,
    		popHandler,
    		exportHandler,
    		sort_r,
    		click_handler,
    		textarea0_input_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "List",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let list;
    	let current;
    	list = new List({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(list.$$.fragment);
    			attr_dev(main, "class", "svelte-1h6otfa");
    			add_location(main, file, 4, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(list, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(list);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ List });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
