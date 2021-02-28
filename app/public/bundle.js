var bundle = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
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
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
            'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        const crossorigin = is_crossorigin();
        let unsubscribe;
        if (crossorigin) {
            iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            if (crossorigin) {
                unsubscribe();
            }
            else if (unsubscribe && iframe.contentWindow) {
                unsubscribe();
            }
            detach(iframe);
        };
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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
            mount_component(component, options.target, options.anchor);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
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
        if (text.wholeText === data)
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

    function oe(n){return l=>{const o=Object.keys(n.$$.callbacks),i=[];return o.forEach(o=>i.push(listen(l,o,e=>bubble(n,e)))),{destroy:()=>{i.forEach(e=>e());}}}}function ie(){return "undefined"!=typeof window&&!(window.CSS&&window.CSS.supports&&window.CSS.supports("(--foo: red)"))}function se(e){var t;return "r"===e.charAt(0)?e=(t=(t=e).match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i))&&4===t.length?"#"+("0"+parseInt(t[1],10).toString(16)).slice(-2)+("0"+parseInt(t[2],10).toString(16)).slice(-2)+("0"+parseInt(t[3],10).toString(16)).slice(-2):"":"transparent"===e.toLowerCase()&&(e="#00000000"),e}const{document:re}=globals;function ae(e){let t;return {c(){t=element("div"),attr(t,"class","ripple svelte-po4fcb");},m(n,l){insert(n,t,l),e[4](t);},p:noop,i:noop,o:noop,d(n){n&&detach(t),e[4](null);}}}function ce(e,t){e.style.transform=t,e.style.webkitTransform=t;}function de(e,t){e.style.opacity=t.toString();}const ue=function(e,t){const n=["touchcancel","mouseleave","dragstart"];let l=t.currentTarget||t.target;if(l&&!l.classList.contains("ripple")&&(l=l.querySelector(".ripple")),!l)return;const o=l.dataset.event;if(o&&o!==e)return;l.dataset.event=e;const i=document.createElement("span"),{radius:s,scale:r,x:a,y:c,centerX:d,centerY:u}=((e,t)=>{const n=t.getBoundingClientRect(),l=function(e){return "TouchEvent"===e.constructor.name}(e)?e.touches[e.touches.length-1]:e,o=l.clientX-n.left,i=l.clientY-n.top;let s=0,r=.3;const a=t.dataset.center;t.dataset.circle?(r=.15,s=t.clientWidth/2,s=a?s:s+Math.sqrt((o-s)**2+(i-s)**2)/4):s=Math.sqrt(t.clientWidth**2+t.clientHeight**2)/2;const c=(t.clientWidth-2*s)/2+"px",d=(t.clientHeight-2*s)/2+"px";return {radius:s,scale:r,x:a?c:o-s+"px",y:a?d:i-s+"px",centerX:c,centerY:d}})(t,l),p=l.dataset.color,f=2*s+"px";i.className="animation",i.style.width=f,i.style.height=f,i.style.background=p,i.classList.add("animation--enter"),i.classList.add("animation--visible"),ce(i,`translate(${a}, ${c}) scale3d(${r},${r},${r})`),de(i,0),i.dataset.activated=String(performance.now()),l.appendChild(i),setTimeout(()=>{i.classList.remove("animation--enter"),i.classList.add("animation--in"),ce(i,`translate(${d}, ${u}) scale3d(1,1,1)`),de(i,.25);},0);const v="mousedown"===e?"mouseup":"touchend",h=function(){document.removeEventListener(v,h),n.forEach(e=>{document.removeEventListener(e,h);});const e=performance.now()-Number(i.dataset.activated),t=Math.max(250-e,0);setTimeout(()=>{i.classList.remove("animation--in"),i.classList.add("animation--out"),de(i,0),setTimeout(()=>{i&&l.removeChild(i),0===l.children.length&&delete l.dataset.event;},300);},t);};document.addEventListener(v,h),n.forEach(e=>{document.addEventListener(e,h,{passive:!0});});},pe=function(e){0===e.button&&ue(e.type,e);},fe=function(e){if(e.changedTouches)for(let t=0;t<e.changedTouches.length;++t)ue(e.type,e.changedTouches[t]);};function ve(e,t,n){let l,o,{center:i=!1}=t,{circle:s=!1}=t,{color:r="currentColor"}=t;return onMount(async()=>{await tick();try{i&&n(0,l.dataset.center="true",l),s&&n(0,l.dataset.circle="true",l),n(0,l.dataset.color=r,l),o=l.parentElement;}catch(e){}if(!o)return void console.error("Ripple: Trigger element not found.");let e=window.getComputedStyle(o);0!==e.position.length&&"static"!==e.position||(o.style.position="relative"),o.addEventListener("touchstart",fe,{passive:!0}),o.addEventListener("mousedown",pe,{passive:!0});}),onDestroy(()=>{o&&(o.removeEventListener("mousedown",pe),o.removeEventListener("touchstart",fe));}),e.$$set=e=>{"center"in e&&n(1,i=e.center),"circle"in e&&n(2,s=e.circle),"color"in e&&n(3,r=e.color);},[l,i,s,r,function(e){binding_callbacks[e?"unshift":"push"](()=>{l=e,n(0,l);});}]}class he extends SvelteComponent{constructor(e){var t;super(),re.getElementById("svelte-po4fcb-style")||((t=element("style")).id="svelte-po4fcb-style",t.textContent=".ripple.svelte-po4fcb{display:block;position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;border-radius:inherit;color:inherit;pointer-events:none;z-index:0;contain:strict}.ripple.svelte-po4fcb .animation{color:inherit;position:absolute;top:0;left:0;border-radius:50%;opacity:0;pointer-events:none;overflow:hidden;will-change:transform, opacity}.ripple.svelte-po4fcb .animation--enter{transition:none}.ripple.svelte-po4fcb .animation--in{transition:opacity 0.1s cubic-bezier(0.4, 0, 0.2, 1);transition:transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\topacity 0.1s cubic-bezier(0.4, 0, 0.2, 1)}.ripple.svelte-po4fcb .animation--out{transition:opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)}",append(re.head,t)),init(this,e,ve,ae,safe_not_equal,{center:1,circle:2,color:3});}}function me(e){let t,n;return t=new he({props:{center:e[3],circle:e[3]}}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p(e,n){const l={};8&n&&(l.center=e[3]),8&n&&(l.circle=e[3]),t.$set(l);},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function ge(t){let n,l,i,a,d;const p=t[19].default,v=create_slot(p,t,t[18],null);let h=t[10]&&me(t),b=[{class:t[1]},{style:t[2]},t[14]],L={};for(let e=0;e<b.length;e+=1)L=assign(L,b[e]);return {c(){n=element("button"),v&&v.c(),l=space(),h&&h.c(),set_attributes(n,L),toggle_class(n,"raised",t[6]),toggle_class(n,"outlined",t[8]&&!(t[6]||t[7])),toggle_class(n,"shaped",t[9]&&!t[3]),toggle_class(n,"dense",t[5]),toggle_class(n,"fab",t[4]&&t[3]),toggle_class(n,"icon-button",t[3]),toggle_class(n,"toggle",t[11]),toggle_class(n,"active",t[11]&&t[0]),toggle_class(n,"full-width",t[12]&&!t[3]),toggle_class(n,"svelte-6bcb3a",!0);},m(s,u){insert(s,n,u),v&&v.m(n,null),append(n,l),h&&h.m(n,null),t[20](n),i=!0,a||(d=[listen(n,"click",t[16]),action_destroyer(t[15].call(null,n))],a=!0);},p(e,[t]){v&&v.p&&262144&t&&update_slot(v,p,e,e[18],t,null,null),e[10]?h?(h.p(e,t),1024&t&&transition_in(h,1)):(h=me(e),h.c(),transition_in(h,1),h.m(n,null)):h&&(group_outros(),transition_out(h,1,1,()=>{h=null;}),check_outros()),set_attributes(n,L=get_spread_update(b,[(!i||2&t)&&{class:e[1]},(!i||4&t)&&{style:e[2]},16384&t&&e[14]])),toggle_class(n,"raised",e[6]),toggle_class(n,"outlined",e[8]&&!(e[6]||e[7])),toggle_class(n,"shaped",e[9]&&!e[3]),toggle_class(n,"dense",e[5]),toggle_class(n,"fab",e[4]&&e[3]),toggle_class(n,"icon-button",e[3]),toggle_class(n,"toggle",e[11]),toggle_class(n,"active",e[11]&&e[0]),toggle_class(n,"full-width",e[12]&&!e[3]),toggle_class(n,"svelte-6bcb3a",!0);},i(e){i||(transition_in(v,e),transition_in(h),i=!0);},o(e){transition_out(v,e),transition_out(h),i=!1;},d(e){e&&detach(n),v&&v.d(e),h&&h.d(),t[20](null),a=!1,run_all(d);}}}function be(e,t,n){let l,{$$slots:o={},$$scope:i}=t;const s=createEventDispatcher(),r=oe(current_component);let a,{class:c=""}=t,{style:d=null}=t,{icon:u=!1}=t,{fab:f=!1}=t,{dense:v=!1}=t,{raised:h=!1}=t,{unelevated:m=!1}=t,{outlined:g=!1}=t,{shaped:b=!1}=t,{color:x=null}=t,{ripple:w=!0}=t,{toggle:$=!1}=t,{active:z=!1}=t,{fullWidth:k=!1}=t,D={};return beforeUpdate(()=>{if(!a)return;let e=a.getElementsByTagName("svg"),t=e.length;for(let n=0;n<t;n++)e[n].setAttribute("width",l+($&&!u?2:0)),e[n].setAttribute("height",l+($&&!u?2:0));n(13,a.style.backgroundColor=h||m?x:"transparent",a);let o=getComputedStyle(a).getPropertyValue("background-color");n(13,a.style.color=h||m?function(e="#ffffff"){let t,n,l,o,i,s;if(0===e.length&&(e="#ffffff"),e=se(e),e=String(e).replace(/[^0-9a-f]/gi,""),!new RegExp(/^(?:[0-9a-f]{3}){1,2}$/i).test(e))throw new Error("Invalid HEX color!");e.length<6&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]);const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t=parseInt(r[1],16)/255,n=parseInt(r[2],16)/255,l=parseInt(r[3],16)/255,o=t<=.03928?t/12.92:Math.pow((t+.055)/1.055,2.4),i=n<=.03928?n/12.92:Math.pow((n+.055)/1.055,2.4),s=l<=.03928?l/12.92:Math.pow((l+.055)/1.055,2.4),.2126*o+.7152*i+.0722*s}(o)>.5?"#000":"#fff":x,a);}),e.$$set=e=>{n(23,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(1,c=e.class),"style"in e&&n(2,d=e.style),"icon"in e&&n(3,u=e.icon),"fab"in e&&n(4,f=e.fab),"dense"in e&&n(5,v=e.dense),"raised"in e&&n(6,h=e.raised),"unelevated"in e&&n(7,m=e.unelevated),"outlined"in e&&n(8,g=e.outlined),"shaped"in e&&n(9,b=e.shaped),"color"in e&&n(17,x=e.color),"ripple"in e&&n(10,w=e.ripple),"toggle"in e&&n(11,$=e.toggle),"active"in e&&n(0,z=e.active),"fullWidth"in e&&n(12,k=e.fullWidth),"$$scope"in e&&n(18,i=e.$$scope);},e.$$.update=()=>{{const{style:e,icon:l,fab:o,dense:i,raised:s,unelevated:r,outlined:a,shaped:c,color:d,ripple:u,toggle:p,active:f,fullWidth:v,...h}=t;!h.disabled&&delete h.disabled,delete h.class,n(14,D=h);}56&e.$$.dirty&&(l=u?f?24:v?20:24:v?16:18),139264&e.$$.dirty&&("primary"===x?n(17,x=ie()?"#1976d2":"var(--primary, #1976d2)"):"accent"==x?n(17,x=ie()?"#f50057":"var(--accent, #f50057)"):!x&&a&&n(17,x=a.style.color||a.parentElement.style.color||(ie()?"#333":"var(--color, #333)")));},t=exclude_internal_props(t),[z,c,d,u,f,v,h,m,g,b,w,$,k,a,D,r,function(e){$&&(n(0,z=!z),s("change",z));},x,i,o,function(e){binding_callbacks[e?"unshift":"push"](()=>{a=e,n(13,a);});}]}class ye extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-6bcb3a-style")||((t=element("style")).id="svelte-6bcb3a-style",t.textContent="button.svelte-6bcb3a:disabled{cursor:default}button.svelte-6bcb3a{cursor:pointer;font-family:Roboto, Helvetica, sans-serif;font-family:var(--button-font-family, Roboto, Helvetica, sans-serif);font-size:0.875rem;font-weight:500;letter-spacing:0.75px;text-decoration:none;text-transform:uppercase;will-change:transform, opacity;margin:0;padding:0 16px;display:-ms-inline-flexbox;display:inline-flex;position:relative;align-items:center;justify-content:center;box-sizing:border-box;height:36px;border:none;outline:none;line-height:inherit;user-select:none;overflow:hidden;vertical-align:middle;border-radius:4px}button.svelte-6bcb3a::-moz-focus-inner{border:0}button.svelte-6bcb3a:-moz-focusring{outline:none}button.svelte-6bcb3a:before{box-sizing:inherit;border-radius:inherit;color:inherit;bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.2s cubic-bezier(0.25, 0.8, 0.5, 1);will-change:background-color, opacity}.toggle.svelte-6bcb3a:before{box-sizing:content-box}.active.svelte-6bcb3a:before{background-color:currentColor;opacity:0.3}.raised.svelte-6bcb3a{box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 5px 0 rgba(0, 0, 0, 0.12)}.outlined.svelte-6bcb3a{padding:0 14px;border-style:solid;border-width:2px}.shaped.svelte-6bcb3a{border-radius:18px}.dense.svelte-6bcb3a{height:32px}.icon-button.svelte-6bcb3a{line-height:0.5;border-radius:50%;padding:8px;width:40px;height:40px;vertical-align:middle}.icon-button.outlined.svelte-6bcb3a{padding:6px}.icon-button.fab.svelte-6bcb3a{border:none;width:56px;height:56px;box-shadow:0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 18px 0 rgba(0, 0, 0, 0.12)}.icon-button.dense.svelte-6bcb3a{width:36px;height:36px}.icon-button.fab.dense.svelte-6bcb3a{width:40px;height:40px}.outlined.svelte-6bcb3a:not(.shaped) .ripple{border-radius:0 !important}.full-width.svelte-6bcb3a{width:100%}@media(hover: hover){button.svelte-6bcb3a:hover:not(.toggle):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.15}button.focus-visible.svelte-6bcb3a:focus:not(.toggle):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.3}button.focus-visible.toggle.svelte-6bcb3a:focus:not(.active):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.15}}",append(document.head,t)),init(this,e,be,ge,safe_not_equal,{class:1,style:2,icon:3,fab:4,dense:5,raised:6,unelevated:7,outlined:8,shaped:9,color:17,ripple:10,toggle:11,active:0,fullWidth:12});}}function xe(e){let t,n,l;const o=e[3].default,i=create_slot(o,e,e[2],null);return {c(){t=element("div"),i&&i.c(),attr(t,"class","button-group svelte-x6hf3e"),attr(t,"style",n=e[0]?`color: ${e[0]};`:""+e[1]);},m(e,n){insert(e,t,n),i&&i.m(t,null),l=!0;},p(e,[s]){i&&i.p&&4&s&&update_slot(i,o,e,e[2],s,null,null),(!l||3&s&&n!==(n=e[0]?`color: ${e[0]};`:""+e[1]))&&attr(t,"style",n);},i(e){l||(transition_in(i,e),l=!0);},o(e){transition_out(i,e),l=!1;},d(e){e&&detach(t),i&&i.d(e);}}}function we(e,t,n){let{$$slots:l={},$$scope:o}=t,{color:i=""}=t,{style:s=""}=t;return e.$$set=e=>{"color"in e&&n(0,i=e.color),"style"in e&&n(1,s=e.style),"$$scope"in e&&n(2,o=e.$$scope);},e.$$.update=()=>{1&e.$$.dirty&&("primary"===i?n(0,i=ie()?"#1976d2":"var(--primary, #1976d2)"):"accent"==i&&n(0,i=ie()?"#f50057":"var(--accent, #f50057)"));},[i,s,o,l]}class $e extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-x6hf3e-style")||((t=element("style")).id="svelte-x6hf3e-style",t.textContent=".button-group.svelte-x6hf3e{display:inline-flex;flex-wrap:wrap}.button-group.svelte-x6hf3e button{padding:0 8px}.button-group.svelte-x6hf3e button:first-child{border-top-right-radius:0;border-bottom-right-radius:0}.button-group.svelte-x6hf3e button:last-child{border-top-left-radius:0;border-bottom-left-radius:0}.button-group.svelte-x6hf3e .shaped:first-child{padding-left:12px}.button-group.svelte-x6hf3e .shaped:last-child{padding-right:12px}.button-group.svelte-x6hf3e button:not(:first-child):not(:last-child){border-radius:0}.button-group.svelte-x6hf3e button:not(:first-child){border-left:none}.button-group.svelte-x6hf3e .outlined{border-width:1px}",append(document.head,t)),init(this,e,we,xe,safe_not_equal,{color:0,style:1});}}function ze(e){let t;const n=e[12].default,l=create_slot(n,e,e[11],null);return {c(){l&&l.c();},m(e,n){l&&l.m(e,n),t=!0;},p(e,t){l&&l.p&&2048&t&&update_slot(l,n,e,e[11],t,null,null);},i(e){t||(transition_in(l,e),t=!0);},o(e){transition_out(l,e),t=!1;},d(e){l&&l.d(e);}}}function ke(e){let t,n;return {c(){t=svg_element("svg"),n=svg_element("path"),attr(n,"d",e[1]),attr(t,"xmlns","http://www.w3.org/2000/svg"),attr(t,"viewBox",e[2]),attr(t,"class","svelte-h2unzw");},m(e,l){insert(e,t,l),append(t,n);},p(e,l){2&l&&attr(n,"d",e[1]),4&l&&attr(t,"viewBox",e[2]);},i:noop,o:noop,d(e){e&&detach(t);}}}function De(e){let t,n,l,o,r,a,d;const p=[ke,ze],f=[];function v(e,t){return "string"==typeof e[1]?0:1}n=v(e),l=f[n]=p[n](e);let h=[{class:o="icon "+e[0]},e[7]],b={};for(let e=0;e<h.length;e+=1)b=assign(b,h[e]);return {c(){t=element("i"),l.c(),set_attributes(t,b),toggle_class(t,"flip",e[3]&&"boolean"==typeof e[3]),toggle_class(t,"flip-h","h"===e[3]),toggle_class(t,"flip-v","v"===e[3]),toggle_class(t,"spin",e[4]),toggle_class(t,"pulse",e[5]&&!e[4]),toggle_class(t,"svelte-h2unzw",!0);},m(l,o){insert(l,t,o),f[n].m(t,null),e[13](t),r=!0,a||(d=action_destroyer(e[8].call(null,t)),a=!0);},p(e,[i]){let s=n;n=v(e),n===s?f[n].p(e,i):(group_outros(),transition_out(f[s],1,1,()=>{f[s]=null;}),check_outros(),l=f[n],l?l.p(e,i):(l=f[n]=p[n](e),l.c()),transition_in(l,1),l.m(t,null)),set_attributes(t,b=get_spread_update(h,[(!r||1&i&&o!==(o="icon "+e[0]))&&{class:o},128&i&&e[7]])),toggle_class(t,"flip",e[3]&&"boolean"==typeof e[3]),toggle_class(t,"flip-h","h"===e[3]),toggle_class(t,"flip-v","v"===e[3]),toggle_class(t,"spin",e[4]),toggle_class(t,"pulse",e[5]&&!e[4]),toggle_class(t,"svelte-h2unzw",!0);},i(e){r||(transition_in(l),r=!0);},o(e){transition_out(l),r=!1;},d(l){l&&detach(t),f[n].d(),e[13](null),a=!1,d();}}}function Ce(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let s,{class:r=""}=t,{path:a=null}=t,{size:c=24}=t,{viewBox:d="0 0 24 24"}=t,{color:u="currentColor"}=t,{flip:f=!1}=t,{spin:v=!1}=t,{pulse:h=!1}=t,m={};return e.$$set=e=>{n(14,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,r=e.class),"path"in e&&n(1,a=e.path),"size"in e&&n(9,c=e.size),"viewBox"in e&&n(2,d=e.viewBox),"color"in e&&n(10,u=e.color),"flip"in e&&n(3,f=e.flip),"spin"in e&&n(4,v=e.spin),"pulse"in e&&n(5,h=e.pulse),"$$scope"in e&&n(11,o=e.$$scope);},e.$$.update=()=>{{const{path:e,size:l,viewBox:o,color:i,flip:s,spin:r,pulse:a,...c}=t;delete c.class,n(7,m=c);}1600&e.$$.dirty&&s&&(s.firstChild.setAttribute("width",c),s.firstChild.setAttribute("height",c),u&&s.firstChild.setAttribute("fill",u));},t=exclude_internal_props(t),[r,a,d,f,v,h,s,m,i,c,u,o,l,function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(6,s);});}]}class je extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-h2unzw-style")||((t=element("style")).id="svelte-h2unzw-style",t.textContent=".icon.svelte-h2unzw.svelte-h2unzw{display:inline-block;position:relative;vertical-align:middle;line-height:0.5}.icon.svelte-h2unzw>svg.svelte-h2unzw{display:inline-block}.flip.svelte-h2unzw.svelte-h2unzw{transform:scale(-1, -1)}.flip-h.svelte-h2unzw.svelte-h2unzw{transform:scale(-1, 1)}.flip-v.svelte-h2unzw.svelte-h2unzw{transform:scale(1, -1)}.spin.svelte-h2unzw.svelte-h2unzw{animation:svelte-h2unzw-spin 1s 0s infinite linear}.pulse.svelte-h2unzw.svelte-h2unzw{animation:svelte-h2unzw-spin 1s infinite steps(8)}@keyframes svelte-h2unzw-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}",append(document.head,t)),init(this,e,Ce,De,safe_not_equal,{class:0,path:1,size:9,viewBox:2,color:10,flip:3,spin:4,pulse:5});}}function He(e){let t;return {c(){t=element("span"),t.textContent="*",attr(t,"class","required svelte-1dzu4e7");},m(e,n){insert(e,t,n);},d(e){e&&detach(t);}}}function Oe(e){let t,n,l;return {c(){t=element("div"),n=space(),l=element("div"),attr(t,"class","input-line svelte-1dzu4e7"),attr(l,"class","focus-line svelte-1dzu4e7");},m(e,o){insert(e,t,o),insert(e,n,o),insert(e,l,o);},d(e){e&&detach(t),e&&detach(n),e&&detach(l);}}}function We(e){let t,n,l,o=(e[11]||e[10])+"";return {c(){t=element("div"),n=element("div"),l=text(o),attr(n,"class","message"),attr(t,"class","help svelte-1dzu4e7"),toggle_class(t,"persist",e[9]),toggle_class(t,"error",e[11]);},m(e,o){insert(e,t,o),append(t,n),append(n,l);},p(e,n){3072&n&&o!==(o=(e[11]||e[10])+"")&&set_data(l,o),512&n&&toggle_class(t,"persist",e[9]),2048&n&&toggle_class(t,"error",e[11]);},d(e){e&&detach(t);}}}function Xe(t){let n,l,i,p,f,v,h,m,g,b,k,D,C,L=[{class:"input"},t[12]],M={};for(let e=0;e<L.length;e+=1)M=assign(M,L[e]);let Y=t[2]&&!t[0].length&&He(),A=(!t[7]||t[8])&&Oe(),S=(!!t[10]||!!t[11])&&We(t);return {c(){n=element("div"),l=element("input"),i=space(),p=element("div"),f=space(),v=element("div"),h=text(t[6]),m=space(),Y&&Y.c(),g=space(),A&&A.c(),b=space(),S&&S.c(),set_attributes(l,M),toggle_class(l,"svelte-1dzu4e7",!0),attr(p,"class","focus-ring svelte-1dzu4e7"),attr(v,"class","label svelte-1dzu4e7"),attr(n,"class",k=null_to_empty(`text-field ${t[7]&&!t[8]?"outlined":"baseline"} ${t[3]}`)+" svelte-1dzu4e7"),attr(n,"style",t[4]),attr(n,"title",t[5]),toggle_class(n,"filled",t[8]),toggle_class(n,"dirty",t[13]),toggle_class(n,"disabled",t[1]);},m(s,a){insert(s,n,a),append(n,l),set_input_value(l,t[0]),append(n,i),append(n,p),append(n,f),append(n,v),append(v,h),append(v,m),Y&&Y.m(v,null),append(n,g),A&&A.m(n,null),append(n,b),S&&S.m(n,null),D||(C=[listen(l,"input",t[16]),action_destroyer(t[14].call(null,l))],D=!0);},p(e,[t]){set_attributes(l,M=get_spread_update(L,[{class:"input"},4096&t&&e[12]])),1&t&&l.value!==e[0]&&set_input_value(l,e[0]),toggle_class(l,"svelte-1dzu4e7",!0),64&t&&set_data(h,e[6]),e[2]&&!e[0].length?Y||(Y=He(),Y.c(),Y.m(v,null)):Y&&(Y.d(1),Y=null),!e[7]||e[8]?A||(A=Oe(),A.c(),A.m(n,b)):A&&(A.d(1),A=null),e[10]||e[11]?S?S.p(e,t):(S=We(e),S.c(),S.m(n,null)):S&&(S.d(1),S=null),392&t&&k!==(k=null_to_empty(`text-field ${e[7]&&!e[8]?"outlined":"baseline"} ${e[3]}`)+" svelte-1dzu4e7")&&attr(n,"class",k),16&t&&attr(n,"style",e[4]),32&t&&attr(n,"title",e[5]),392&t&&toggle_class(n,"filled",e[8]),8584&t&&toggle_class(n,"dirty",e[13]),394&t&&toggle_class(n,"disabled",e[1]);},i:noop,o:noop,d(e){e&&detach(n),Y&&Y.d(),A&&A.d(),S&&S.d(),D=!1,run_all(C);}}}function Pe(e,t,n){let l;const o=oe(current_component);let i,{value:s=""}=t,{disabled:r=!1}=t,{required:a=!1}=t,{class:c=""}=t,{style:d=null}=t,{title:u=null}=t,{label:p=""}=t,{outlined:f=!1}=t,{filled:v=!1}=t,{messagePersist:h=!1}=t,{message:m=""}=t,{error:g=""}=t,b={};const x=["date","datetime-local","email","month","number","password","search","tel","text","time","url","week"],w=["date","datetime-local","month","time","week"];return e.$$set=e=>{n(19,t=assign(assign({},t),exclude_internal_props(e))),"value"in e&&n(0,s=e.value),"disabled"in e&&n(1,r=e.disabled),"required"in e&&n(2,a=e.required),"class"in e&&n(3,c=e.class),"style"in e&&n(4,d=e.style),"title"in e&&n(5,u=e.title),"label"in e&&n(6,p=e.label),"outlined"in e&&n(7,f=e.outlined),"filled"in e&&n(8,v=e.filled),"messagePersist"in e&&n(9,h=e.messagePersist),"message"in e&&n(10,m=e.message),"error"in e&&n(11,g=e.error);},e.$$.update=()=>{{const{value:e,style:l,title:o,label:s,outlined:r,filled:a,messagePersist:c,message:d,error:u,...p}=t;!p.readonly&&delete p.readonly,!p.disabled&&delete p.disabled,delete p.class,p.type=x.indexOf(p.type)<0?"text":p.type,n(15,i=p.placeholder),n(12,b=p);}36865&e.$$.dirty&&n(13,l="string"==typeof s&&s.length>0||"number"==typeof s||i||w.indexOf(b.type)>=0);},t=exclude_internal_props(t),[s,r,a,c,d,u,p,f,v,h,m,g,b,l,o,i,function(){s=this.value,n(0,s);}]}class Ve extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1dzu4e7-style")||((t=element("style")).id="svelte-1dzu4e7-style",t.textContent=".text-field.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{font-family:Roboto, 'Segoe UI', sans-serif;font-weight:400;font-size:inherit;text-decoration:inherit;text-transform:inherit;box-sizing:border-box;margin:0 0 20px;position:relative;width:100%;background-color:inherit;will-change:opacity, transform, color}.outlined.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{margin-top:12px}.required.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{position:relative;top:0.175em;left:0.125em;color:#ff5252}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{box-sizing:border-box;font:inherit;width:100%;min-height:32px;background:none;text-align:left;color:#333;color:var(--color, #333);caret-color:#1976d2;caret-color:var(--primary, #1976d2);border:none;margin:0;padding:2px 0 0;outline:none}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7::placeholder{color:rgba(0, 0, 0, 0.3755);color:var(--label, rgba(0, 0, 0, 0.3755));font-weight:100}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7::-moz-focus-inner{padding:0;border:0}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7:-moz-focusring{outline:none}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7:required{box-shadow:none}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7:invalid{box-shadow:none}.input.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7:active{outline:none}.input.svelte-1dzu4e7:hover~.input-line.svelte-1dzu4e7.svelte-1dzu4e7{background:#333;background:var(--color, #333)}.label.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{font:inherit;display:inline-flex;position:absolute;left:0;top:28px;padding-right:0.2em;color:rgba(0, 0, 0, 0.3755);color:var(--label, rgba(0, 0, 0, 0.3755));background-color:inherit;pointer-events:none;-webkit-backface-visibility:hidden;backface-visibility:hidden;overflow:hidden;max-width:90%;white-space:nowrap;transform-origin:left top;transition:0.18s cubic-bezier(0.25, 0.8, 0.5, 1)}.focus-ring.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{pointer-events:none;margin:0;padding:0;border:2px solid transparent;border-radius:4px;position:absolute;left:0;top:0;right:0;bottom:0}.input-line.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{position:absolute;left:0;right:0;bottom:0;margin:0;height:1px;background:rgba(0, 0, 0, 0.3755);background:var(--label, rgba(0, 0, 0, 0.3755))}.focus-line.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{position:absolute;bottom:0;left:0;right:0;height:2px;-webkit-transform:scaleX(0);transform:scaleX(0);transition:transform 0.18s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\topacity 0.18s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\t-webkit-transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);transition:transform 0.18s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\topacity 0.18s cubic-bezier(0.4, 0, 0.2, 1);opacity:0;z-index:2;background:#1976d2;background:var(--primary, #1976d2)}.help.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{position:absolute;left:0;right:0;bottom:-18px;display:flex;justify-content:space-between;font-size:12px;line-height:normal;letter-spacing:0.4px;color:rgba(0, 0, 0, 0.3755);color:var(--label, rgba(0, 0, 0, 0.3755));opacity:0;overflow:hidden;max-width:90%;white-space:nowrap}.persist.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7,.error.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7,.input.svelte-1dzu4e7:focus~.help.svelte-1dzu4e7.svelte-1dzu4e7{opacity:1}.error.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{color:#ff5252}.baseline.dirty.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{letter-spacing:0.4px;top:6px;bottom:unset;font-size:13px}.baseline.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.label.svelte-1dzu4e7{letter-spacing:0.4px;top:6px;bottom:unset;font-size:13px;color:#1976d2;color:var(--primary, #1976d2)}.baseline.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.focus-line.svelte-1dzu4e7{transform:scaleX(1);opacity:1}.baseline.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7{height:52px;padding-top:22px}.baseline.filled.svelte-1dzu4e7.svelte-1dzu4e7.svelte-1dzu4e7{background:rgba(0, 0, 0, 0.0555);background:var(--bg-input-filled, rgba(0, 0, 0, 0.0555));border-radius:4px 4px 0 0}.baseline.filled.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{background:none}.baseline.filled.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7,.baseline.filled.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{padding-left:8px;padding-right:8px}.baseline.filled.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.label.svelte-1dzu4e7{top:6px}.baseline.filled.svelte-1dzu4e7 .help.svelte-1dzu4e7.svelte-1dzu4e7{padding-left:8px}.filled.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7:hover,.filled.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7:focus{background:rgba(0, 0, 0, 0.0555);background:var(--bg-input-filled, rgba(0, 0, 0, 0.0555))}.outlined.svelte-1dzu4e7 .help.svelte-1dzu4e7.svelte-1dzu4e7{left:18px}.outlined.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7{padding:11px 16px 9px;border-radius:4px;border:1px solid;border-color:rgba(0, 0, 0, 0.3755);border-color:var(--label, rgba(0, 0, 0, 0.3755))}.outlined.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{top:12px;bottom:unset;left:17px}.outlined.dirty.svelte-1dzu4e7 .label.svelte-1dzu4e7.svelte-1dzu4e7{top:-6px;bottom:unset;font-size:12px;letter-spacing:0.4px;padding:0 4px;left:13px}.outlined.svelte-1dzu4e7 .input.svelte-1dzu4e7.svelte-1dzu4e7:hover{border-color:#333;border-color:var(--color, #333)}.outlined.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.label.svelte-1dzu4e7{top:-6px;bottom:unset;font-size:12px;letter-spacing:0.4px;padding:0 4px;left:13px;color:#1976d2;color:var(--primary, #1976d2)}.outlined.svelte-1dzu4e7 .input.svelte-1dzu4e7:focus~.focus-ring.svelte-1dzu4e7,.outlined.svelte-1dzu4e7 .input.focus-visible.svelte-1dzu4e7~.focus-ring.svelte-1dzu4e7{border-color:#1976d2;border-color:var(--primary, #1976d2)}",append(document.head,t)),init(this,e,Pe,Xe,safe_not_equal,{value:0,disabled:1,required:2,class:3,style:4,title:5,label:6,outlined:7,filled:8,messagePersist:9,message:10,error:11});}}function Re(e,t){if("Tab"!==e.key&&9!==e.keyCode)return;let n=function(e=document){return Array.prototype.slice.call(e.querySelectorAll('button, [href], select, textarea, input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])')).filter((function(e){const t=window.getComputedStyle(e);return !e.disabled&&!e.getAttribute("disabled")&&!e.classList.contains("disabled")&&"none"!==t.display&&"hidden"!==t.visibility&&t.opacity>0}))}(t);if(0===n.length)return void e.preventDefault();let l=document.activeElement,o=n.indexOf(l);e.shiftKey?o<=0&&(n[n.length-1].focus(),e.preventDefault()):o>=n.length-1&&(n[0].focus(),e.preventDefault());}const{window:Ze}=globals;function Ue(t){let n,l,i,r,d,p,v;const h=t[17].default,b=create_slot(h,t,t[16],null);return {c(){n=element("div"),b&&b.c(),attr(n,"class",l=null_to_empty("popover "+t[1])+" svelte-5k22n0"),attr(n,"style",t[2]),attr(n,"tabindex","-1");},m(l,i){insert(l,n,i),b&&b.m(n,null),t[20](n),d=!0,p||(v=[listen(n,"introstart",t[18]),listen(n,"introend",t[19]),action_destroyer(t[4].call(null,n))],p=!0);},p(e,t){b&&b.p&&65536&t&&update_slot(b,h,e,e[16],t,null,null),(!d||2&t&&l!==(l=null_to_empty("popover "+e[1])+" svelte-5k22n0"))&&attr(n,"class",l),(!d||4&t)&&attr(n,"style",e[2]);},i(e){d||(transition_in(b,e),add_render_callback(()=>{r&&r.end(1),i||(i=create_in_transition(n,t[5],{})),i.start();}),d=!0);},o(e){transition_out(b,e),i&&i.invalidate(),r=create_out_transition(n,t[6],{}),d=!1;},d(e){e&&detach(n),b&&b.d(e),t[20](null),e&&r&&r.end(),p=!1,run_all(v);}}}function Ge(t){let n,l,o,i,s=t[0]&&Ue(t);return {c(){s&&s.c(),n=empty();},m(r,a){s&&s.m(r,a),insert(r,n,a),l=!0,o||(i=[listen(Ze,"scroll",t[8],{passive:!0}),listen(Ze,"resize",t[9],{passive:!0}),listen(Ze,"keydown",t[10],!0),listen(Ze,"click",t[11],!0)],o=!0);},p(e,[t]){e[0]?s?(s.p(e,t),1&t&&transition_in(s,1)):(s=Ue(e),s.c(),transition_in(s,1),s.m(n.parentNode,n)):s&&(group_outros(),transition_out(s,1,1,()=>{s=null;}),check_outros());},i(e){l||(transition_in(s),l=!0);},o(e){transition_out(s),l=!1;},d(e){s&&s.d(e),e&&detach(n),o=!1,run_all(i);}}}function Ke(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component),s=createEventDispatcher();let r,a,{class:c=""}=t,{style:d=null}=t,{origin:u="top left"}=t,{dx:f=0}=t,{dy:v=0}=t,{visible:h=!1}=t,{duration:m=300}=t;async function g({target:e}){setTimeout(()=>{e.style.transitionDuration=m+"ms",e.style.transitionProperty="opacity, transform",e.style.transform="scale(1)",e.style.opacity=null;},0);}function b(){if(!h||!r||!a)return;const e=a.getBoundingClientRect();e.top<-e.height||e.top>window.innerHeight?y("overflow"):(n(3,r.style.top=function(e,t){let l=0;n(13,v=+v);const o=window.innerHeight-8-e;return l=l=u.indexOf("top")>=0?t.top+v:t.top+t.height-e-v,l=Math.min(o,l),l=Math.max(8,l),l}(r.offsetHeight,e)+"px",r),n(3,r.style.left=function(e,t){let l=0;n(12,f=+f);const o=window.innerWidth-8-e;return l=l=u.indexOf("left")>=0?t.left+f:t.left+t.width-e-f,l=Math.min(o,l),l=Math.max(8,l),l}(r.offsetWidth,e)+"px",r));}function y(e){s("close",e),n(0,h=!1);}beforeUpdate(()=>{a=r?r.parentElement:null,a&&b();});return e.$$set=e=>{"class"in e&&n(1,c=e.class),"style"in e&&n(2,d=e.style),"origin"in e&&n(14,u=e.origin),"dx"in e&&n(12,f=e.dx),"dy"in e&&n(13,v=e.dy),"visible"in e&&n(0,h=e.visible),"duration"in e&&n(15,m=e.duration),"$$scope"in e&&n(16,o=e.$$scope);},[h,c,d,r,i,function(e){return e.style.transformOrigin=u,e.style.transform="scale(0.6)",e.style.opacity="0",{duration:+m}},function(e){return e.style.transformOrigin=u,e.style.transitionDuration=m+"ms",e.style.transitionProperty="opacity, transform",e.style.transform="scale(0.6)",e.style.opacity="0",{duration:+m}},g,function(){b();},function(){b();},function(e){h&&(27===e.keyCode&&(e.stopPropagation(),y("escape")),Re(e,r));},function(e){h&&a&&!a.contains(e.target)&&(e.stopPropagation(),y("clickOutside"));},f,v,u,m,o,l,e=>g(e),e=>function({target:e}){e.style.transformOrigin=null,e.style.transitionDuration=null,e.style.transitionProperty=null,e.style.transform=null,e.focus();}(e),function(e){binding_callbacks[e?"unshift":"push"](()=>{r=e,n(3,r);});}]}class Je extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-5k22n0-style")||((t=element("style")).id="svelte-5k22n0-style",t.textContent=".popover.svelte-5k22n0{color:#333;color:var(--color, #333);background:#fff;background:var(--bg-popover, #fff);backface-visibility:hidden;position:fixed;border-radius:2px;max-height:100%;max-width:80%;overflow:auto;outline:none;box-shadow:0 3px 3px -2px rgba(0, 0, 0, 0.2), 0 3px 4px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 8px 0 rgba(0, 0, 0, 0.12);z-index:50}",append(document.head,t)),init(this,e,Ke,Ge,safe_not_equal,{class:1,style:2,origin:14,dx:12,dy:13,visible:0,duration:15});}}const yn=e=>({}),xn=e=>({});function wn(e){let t,n,l;const o=e[11].default,i=create_slot(o,e,e[14],null);return {c(){t=element("ul"),i&&i.c(),attr(t,"style",n=`min-width: ${e[5]}px`),attr(t,"class","svelte-1vc5q8h");},m(e,n){insert(e,t,n),i&&i.m(t,null),l=!0;},p(e,s){i&&i.p&&16384&s&&update_slot(i,o,e,e[14],s,null,null),(!l||32&s&&n!==(n=`min-width: ${e[5]}px`))&&attr(t,"style",n);},i(e){l||(transition_in(i,e),l=!0);},o(e){transition_out(i,e),l=!1;},d(e){e&&detach(t),i&&i.d(e);}}}function $n(t){let n,l,o,i,y,w,$;const D=t[11].activator,C=create_slot(D,t,t[14],xn),j=C||function(e){let t;return {c(){t=element("span");},m(e,n){insert(e,t,n);},d(e){e&&detach(t);}}}();function L(e){t[12](e);}let M={class:t[0],style:t[1],origin:t[4],dx:t[2],dy:t[3],$$slots:{default:[wn]},$$scope:{ctx:t}};return void 0!==t[6]&&(M.visible=t[6]),o=new Je({props:M}),binding_callbacks.push(()=>bind(o,"visible",L)),o.$on("click",t[10]),{c(){n=element("div"),j&&j.c(),l=space(),create_component(o.$$.fragment),attr(n,"class","menu svelte-1vc5q8h");},m(i,s){insert(i,n,s),j&&j.m(n,null),append(n,l),mount_component(o,n,null),t[13](n),y=!0,w||($=[listen(n,"click",t[9]),action_destroyer(t[8].call(null,n))],w=!0);},p(e,[t]){C&&C.p&&16384&t&&update_slot(C,D,e,e[14],t,yn,xn);const n={};1&t&&(n.class=e[0]),2&t&&(n.style=e[1]),16&t&&(n.origin=e[4]),4&t&&(n.dx=e[2]),8&t&&(n.dy=e[3]),16416&t&&(n.$$scope={dirty:t,ctx:e}),!i&&64&t&&(i=!0,n.visible=e[6],add_flush_callback(()=>i=!1)),o.$set(n);},i(e){y||(transition_in(j,e),transition_in(o.$$.fragment,e),y=!0);},o(e){transition_out(j,e),transition_out(o.$$.fragment,e),y=!1;},d(e){e&&detach(n),j&&j.d(e),destroy_component(o),t[13](null),w=!1,run_all($);}}}function zn(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let s,{class:r=""}=t,{style:a=null}=t,{dx:c=0}=t,{dy:d=0}=t,{origin:u="top left"}=t,{width:f=112}=t,v=!1;return e.$$set=e=>{"class"in e&&n(0,r=e.class),"style"in e&&n(1,a=e.style),"dx"in e&&n(2,c=e.dx),"dy"in e&&n(3,d=e.dy),"origin"in e&&n(4,u=e.origin),"width"in e&&n(5,f=e.width),"$$scope"in e&&n(14,o=e.$$scope);},[r,a,c,d,u,f,v,s,i,function(e){try{s.childNodes[0].contains(e.target)?n(6,v=!v):e.target===s&&n(6,v=!1);}catch(e){console.error(e);}},function(e){e.target.classList.contains("menu-item")&&n(6,v=!1);},l,function(e){v=e,n(6,v);},function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(7,s);});},o]}class kn extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1vc5q8h-style")||((t=element("style")).id="svelte-1vc5q8h-style",t.textContent="@supports (-webkit-overflow-scrolling: touch){html{cursor:pointer}}.menu.svelte-1vc5q8h{position:relative;display:inline-block;vertical-align:middle}ul.svelte-1vc5q8h{margin:0;padding:8px 0;width:100%;position:relative;overflow-x:hidden;overflow-y:visible}",append(document.head,t)),init(this,e,zn,$n,safe_not_equal,{class:0,style:1,dx:2,dy:3,origin:4,width:5});}}function Dn(t){let n,l,o,i,d,p,v;const h=t[9].default,b=create_slot(h,t,t[8],null);let L=t[1]&&jn(),M=[{class:o="menu-item "+t[0]},{tabindex:i=t[2]?"-1":"0"},t[4]],Y={};for(let e=0;e<M.length;e+=1)Y=assign(Y,M[e]);return {c(){n=element("li"),b&&b.c(),l=space(),L&&L.c(),set_attributes(n,Y),toggle_class(n,"svelte-mmrniu",!0);},m(o,i){insert(o,n,i),b&&b.m(n,null),append(n,l),L&&L.m(n,null),t[11](n),d=!0,p||(v=[listen(n,"keydown",t[7]),action_destroyer(t[6].call(null,n))],p=!0);},p(e,t){b&&b.p&&256&t&&update_slot(b,h,e,e[8],t,null,null),e[1]?L?2&t&&transition_in(L,1):(L=jn(),L.c(),transition_in(L,1),L.m(n,null)):L&&(group_outros(),transition_out(L,1,1,()=>{L=null;}),check_outros()),set_attributes(n,Y=get_spread_update(M,[(!d||1&t&&o!==(o="menu-item "+e[0]))&&{class:o},(!d||4&t&&i!==(i=e[2]?"-1":"0"))&&{tabindex:i},16&t&&e[4]])),toggle_class(n,"svelte-mmrniu",!0);},i(e){d||(transition_in(b,e),transition_in(L),d=!0);},o(e){transition_out(b,e),transition_out(L),d=!1;},d(e){e&&detach(n),b&&b.d(e),L&&L.d(),t[11](null),p=!1,run_all(v);}}}function Cn(t){let n,l,o,i,d,v,h,b;const L=t[9].default,M=create_slot(L,t,t[8],null);let Y=t[1]&&En(),A=[{class:i="menu-item "+t[0]},{href:t[3]},{tabindex:d=t[2]?"-1":"0"},t[4]],T={};for(let e=0;e<A.length;e+=1)T=assign(T,A[e]);return {c(){n=element("li"),l=element("a"),M&&M.c(),o=space(),Y&&Y.c(),set_attributes(l,T),toggle_class(l,"svelte-mmrniu",!0),attr(n,"class","svelte-mmrniu");},m(i,s){insert(i,n,s),append(n,l),M&&M.m(l,null),append(l,o),Y&&Y.m(l,null),t[10](l),v=!0,h||(b=[listen(l,"keydown",t[7]),action_destroyer(t[6].call(null,l))],h=!0);},p(e,t){M&&M.p&&256&t&&update_slot(M,L,e,e[8],t,null,null),e[1]?Y?2&t&&transition_in(Y,1):(Y=En(),Y.c(),transition_in(Y,1),Y.m(l,null)):Y&&(group_outros(),transition_out(Y,1,1,()=>{Y=null;}),check_outros()),set_attributes(l,T=get_spread_update(A,[(!v||1&t&&i!==(i="menu-item "+e[0]))&&{class:i},(!v||8&t)&&{href:e[3]},(!v||4&t&&d!==(d=e[2]?"-1":"0"))&&{tabindex:d},16&t&&e[4]])),toggle_class(l,"svelte-mmrniu",!0);},i(e){v||(transition_in(M,e),transition_in(Y),v=!0);},o(e){transition_out(M,e),transition_out(Y),v=!1;},d(e){e&&detach(n),M&&M.d(e),Y&&Y.d(),t[10](null),h=!1,run_all(b);}}}function jn(e){let t,n;return t=new he({}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function En(e){let t,n;return t=new he({}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function Ln(e){let t,n,l,o;const i=[Cn,Dn],s=[];function r(e,t){return e[3]?0:1}return t=r(e),n=s[t]=i[t](e),{c(){n.c(),l=empty();},m(e,n){s[t].m(e,n),insert(e,l,n),o=!0;},p(e,[o]){let a=t;t=r(e),t===a?s[t].p(e,o):(group_outros(),transition_out(s[a],1,1,()=>{s[a]=null;}),check_outros(),n=s[t],n?n.p(e,o):(n=s[t]=i[t](e),n.c()),transition_in(n,1),n.m(l.parentNode,l));},i(e){o||(transition_in(n),o=!0);},o(e){transition_out(n),o=!1;},d(e){s[t].d(e),e&&detach(l);}}}function Mn(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let s,{class:r=""}=t,{ripple:a=!0}=t,c=!1,d=null,u={};return e.$$set=e=>{n(12,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,r=e.class),"ripple"in e&&n(1,a=e.ripple),"$$scope"in e&&n(8,o=e.$$scope);},e.$$.update=()=>{{const{href:e,ripple:l,...o}=t;delete o.class,!1===o.disabled&&delete o.disabled,n(2,c=!!o.disabled),n(3,d=e&&!c?e:null),n(4,u=o);}},t=exclude_internal_props(t),[r,a,c,d,u,s,i,function(e){if(13===e.keyCode||32===e.keyCode){e.stopPropagation(),e.preventDefault();const t=new MouseEvent("click",{bubbles:!0,cancelable:!0});s.dispatchEvent(t),s.blur();}},o,l,function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(5,s);});},function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(5,s);});}]}class Yn extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-mmrniu-style")||((t=element("style")).id="svelte-mmrniu-style",t.textContent="li.svelte-mmrniu{display:block}a.svelte-mmrniu,a.svelte-mmrniu:hover{text-decoration:none}.menu-item.svelte-mmrniu{position:relative;color:inherit;cursor:pointer;height:44px;user-select:none;display:flex;align-items:center;padding:0 16px;white-space:nowrap}.menu-item.svelte-mmrniu:focus{outline:none}.menu-item.svelte-mmrniu::-moz-focus-inner{border:0}.menu-item.svelte-mmrniu:-moz-focusring{outline:none}.menu-item.svelte-mmrniu:before{background-color:currentColor;color:inherit;bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1)}@media(hover: hover){.menu-item.svelte-mmrniu:hover:not([disabled]):not(.disabled):before{opacity:0.15}.focus-visible.menu-item:focus:not([disabled]):not(.disabled):before{opacity:0.3}}",append(document.head,t)),init(this,e,Mn,Ln,safe_not_equal,{class:0,ripple:1});}}const{document:Kn}=globals;function Jn(e,t,n){const l=e.slice();return l[17]=t[n],l[19]=n,l}function Qn(t,n){let l,o,i,d,p,f,y,w,$=n[17]+"";function z(...e){return n[12](n[19],...e)}return d=new he({props:{center:!0}}),{key:t,first:null,c(){l=element("button"),o=text($),i=space(),create_component(d.$$.fragment),attr(l,"class",p="tabbutton "+(n[0]==n[19]?"tabbuttonactive":"")+" svelte-4jfme"),this.first=l;},m(t,n){insert(t,l,n),append(l,o),append(l,i),mount_component(d,l,null),f=!0,y||(w=listen(l,"click",z),y=!0);},p(e,t){n=e,(!f||8&t)&&$!==($=n[17]+"")&&set_data(o,$),(!f||9&t&&p!==(p="tabbutton "+(n[0]==n[19]?"tabbuttonactive":"")+" svelte-4jfme"))&&attr(l,"class",p);},i(e){f||(transition_in(d.$$.fragment,e),f=!0);},o(e){transition_out(d.$$.fragment,e),f=!1;},d(e){e&&detach(l),destroy_component(d),y=!1,w();}}}function el(e){let t,n,l,o,i,d,p,v,h,E,L,M,Y=[],A=new Map,T=e[3];const N=e=>e[17];for(let t=0;t<T.length;t+=1){let n=Jn(e,T,t),l=N(n);A.set(l,Y[t]=Qn(l,n));}const I=e[11].default,B=create_slot(I,e,e[10],null);let S=[{class:h="tabbar "+e[1]},{style:e[2]},e[5]],q={};for(let e=0;e<S.length;e+=1)q=assign(q,S[e]);return {c(){t=element("div"),n=element("div");for(let e=0;e<Y.length;e+=1)Y[e].c();l=space(),o=element("span"),d=space(),p=element("div"),v=element("div"),B&&B.c(),attr(o,"class","tabindicator svelte-4jfme"),attr(o,"style",i=e[7]+"; background-color:var(--primary);"),attr(n,"class","tabbar-wrap svelte-4jfme"),attr(v,"class","tabcontent svelte-4jfme"),attr(v,"style",e[6]),attr(p,"class","tabcontent-wrap svelte-4jfme"),set_attributes(t,q),toggle_class(t,"svelte-4jfme",!0);},m(i,s){insert(i,t,s),append(t,n);for(let e=0;e<Y.length;e+=1)Y[e].m(n,null);append(n,l),append(n,o),append(t,d),append(t,p),append(p,v),B&&B.m(v,null),e[13](t),E=!0,L||(M=action_destroyer(e[8].call(null,t)),L=!0);},p(e,[s]){521&s&&(T=e[3],group_outros(),Y=update_keyed_each(Y,s,N,1,e,T,A,n,outro_and_destroy_block,Qn,l,Jn),check_outros()),(!E||128&s&&i!==(i=e[7]+"; background-color:var(--primary);"))&&attr(o,"style",i),B&&B.p&&1024&s&&update_slot(B,I,e,e[10],s,null,null),(!E||64&s)&&attr(v,"style",e[6]),set_attributes(t,q=get_spread_update(S,[(!E||2&s&&h!==(h="tabbar "+e[1]))&&{class:h},(!E||4&s)&&{style:e[2]},32&s&&e[5]])),toggle_class(t,"svelte-4jfme",!0);},i(e){if(!E){for(let e=0;e<T.length;e+=1)transition_in(Y[e]);transition_in(B,e),E=!0;}},o(e){for(let e=0;e<Y.length;e+=1)transition_out(Y[e]);transition_out(B,e),E=!1;},d(n){n&&detach(t);for(let e=0;e<Y.length;e+=1)Y[e].d();B&&B.d(n),e[13](null),L=!1,M();}}}function tl(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=createEventDispatcher(),s=oe(current_component);let r,{class:a=""}=t,{style:c=null}=t,d={},u="transform:translate3d(0%, 0px, 0px);",f="",{tabNames:v=[]}=t,{activeTab:h=0}=t;async function m(){await tick;let e=r.querySelectorAll(".tabbutton");if(e&&e.length>0){let t={};return h>=e.length&&(h>e.length?n(0,h=e.length-1):n(0,h--,h)),t.target=e[h],g(t,h),!0}return !1}function g(e,t){let l=e.target;n(6,u="transform:translate3d(-"+100*t+"%, 0px, 0px);"),n(7,f="left:"+l.offsetLeft+"px; width:"+l.offsetWidth+"px;"),n(0,h=t),i("change",{activeTab:h});}onMount(()=>{m()&&function(e,t){let n=0,l=0;function o(t){e.style.userSelect="none",l=t.touches?t.touches[0].clientX:t.clientX,document.addEventListener("mouseup",s),document.addEventListener("mousemove",i),document.addEventListener("touchmove",i,!1),document.addEventListener("touchend",s,!1);}function i(o){e.style.pointerEvents="none";const i=o.touches?o.touches[0].clientX:o.clientX;n=l-i,l=i;const s=parseInt(e.style.left)-n;e.style.left=(s>0?0:s+e.scrollWidth<=t.clientWidth?t.clientWidth-e.scrollWidth:s)+"px";}function s(){document.removeEventListener("mouseup",s),document.removeEventListener("mousemove",i),document.removeEventListener("touchmove",i),document.removeEventListener("touchend",i),e.style.pointerEvents="all",e.style.userSelect="all";}e.addEventListener("mousedown",o),e.addEventListener("touchstart",o,!1),""==e.style.left&&(e.style.left="0px");}(r.querySelector(".tabbar-wrap"),r);});return e.$$set=e=>{n(16,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(1,a=e.class),"style"in e&&n(2,c=e.style),"tabNames"in e&&n(3,v=e.tabNames),"activeTab"in e&&n(0,h=e.activeTab),"$$scope"in e&&n(10,o=e.$$scope);},e.$$.update=()=>{{const{style:e,tabNames:l,activeTab:o,...i}=t;n(5,d=i);}9&e.$$.dirty&&(n(0,h=Math.abs(parseInt(h))),Number.isInteger(h)||n(0,h=0),m());},t=exclude_internal_props(t),[h,a,c,v,r,d,u,f,s,g,o,l,(e,t)=>{g(t,e);},function(e){binding_callbacks[e?"unshift":"push"](()=>{r=e,n(4,r);});}]}class nl extends SvelteComponent{constructor(e){var t;super(),Kn.getElementById("svelte-4jfme-style")||((t=element("style")).id="svelte-4jfme-style",t.textContent=".tabbar.svelte-4jfme{width:100%;overflow:hidden}.tabbar-wrap.svelte-4jfme{display:flex;position:relative;transition:left 150ms}.tabbutton.svelte-4jfme{color:var(--color);min-width:70px;font-family:Roboto,sans-serif;-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;font-size:.875rem;font-weight:500;letter-spacing:.08929em;text-decoration:none;text-transform:uppercase;position:relative;display:flex;flex:1 0 auto;justify-content:center;align-items:center;box-sizing:border-box;height:48px;margin:0 !important;padding:0 24px;border:none;outline:none;background:none;text-align:center;white-space:nowrap;cursor:pointer;-webkit-appearance:none;z-index:1}.tabbutton.svelte-4jfme:before{bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.2s cubic-bezier(0.25, 0.8, 0.5, 1);will-change:background-color, opacity}.tabbutton.svelte-4jfme:hover:before{background-color:currentColor;opacity:0.15}.tabbuttonactive.svelte-4jfme{color:var(--primary)}.tabcontent-wrap.svelte-4jfme{overflow:hidden;transition:none}.tabcontent.svelte-4jfme{display:flex;align-items:flex-start;flex-wrap:nowrap;transform:translate3d(0%, 0px, 0px);transition:transform .35s cubic-bezier(.4,0,.2,1);will-change:transform}.tabindicator.svelte-4jfme{height:2px;position:absolute;left:0;bottom:0;transition:left .2s cubic-bezier(.4,0,.2,1);background-color:var(--primary)}",append(Kn.head,t)),init(this,e,tl,el,safe_not_equal,{class:1,style:2,tabNames:3,activeTab:0});}}function ll(e){let t,n,o,i,r;const a=e[5].default,d=create_slot(a,e,e[4],null);let p=[{class:n="tabcontent-page "+e[0]},{style:e[1]},e[2]],v={};for(let e=0;e<p.length;e+=1)v=assign(v,p[e]);return {c(){t=element("div"),d&&d.c(),set_attributes(t,v),toggle_class(t,"svelte-1cy2yx5",!0);},m(n,s){insert(n,t,s),d&&d.m(t,null),o=!0,i||(r=action_destroyer(e[3].call(null,t)),i=!0);},p(e,[l]){d&&d.p&&16&l&&update_slot(d,a,e,e[4],l,null,null),set_attributes(t,v=get_spread_update(p,[(!o||1&l&&n!==(n="tabcontent-page "+e[0]))&&{class:n},(!o||2&l)&&{style:e[1]},4&l&&e[2]])),toggle_class(t,"svelte-1cy2yx5",!0);},i(e){o||(transition_in(d,e),o=!0);},o(e){transition_out(d,e),o=!1;},d(e){e&&detach(t),d&&d.d(e),i=!1,r();}}}function ol(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let{class:s=""}=t,{style:r=null}=t,a={};return e.$$set=e=>{n(6,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,s=e.class),"style"in e&&n(1,r=e.style),"$$scope"in e&&n(4,o=e.$$scope);},e.$$.update=()=>{{const{style:e,...l}=t;n(2,a=l);}},t=exclude_internal_props(t),[s,r,a,i,o,l]}class il extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1cy2yx5-style")||((t=element("style")).id="svelte-1cy2yx5-style",t.textContent=".tabcontent-page.svelte-1cy2yx5{width:100%;flex:1 0 100%}",append(document.head,t)),init(this,e,ol,ll,safe_not_equal,{class:0,style:1});}}

    const logger = (prefix='') => {
      return {
        debug: (msg, ...rest) => console.debug(`${prefix}${msg}`, ...rest),
        info:  (msg, ...rest) => console.info( `${prefix}${msg}`, ...rest),
        warn:  (msg, ...rest) => console.warn( `${prefix}${msg}`, ...rest),
        error: (msg, ...rest) => console.error(`${prefix}${msg}`, ...rest),
      }
    };

    /* src/HeaderBar.svelte generated by Svelte v3.32.3 */

    const file = "src/HeaderBar.svelte";

    function create_fragment(ctx) {
    	let div1;
    	let div0;
    	let t;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = text(/*title*/ ctx[0]);
    			attr_dev(div0, "class", "title svelte-10jw1mw");
    			add_location(div0, file, 28, 2, 460);
    			attr_dev(div1, "class", "header-bar svelte-10jw1mw");
    			add_location(div1, file, 27, 0, 433);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*title*/ 1) set_data_dev(t, /*title*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
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
    	validate_slots("HeaderBar", slots, []);
    	let { title = "untitled" } = $$props;
    	const writable_props = ["title"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<HeaderBar> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    	};

    	$$self.$capture_state = () => ({ title });

    	$$self.$inject_state = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title];
    }

    class HeaderBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { title: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HeaderBar",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get title() {
    		throw new Error("<HeaderBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<HeaderBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    // readables
    const TEAM = readable(
      { HOME:'home', AWAY:'away' },
      () => {}
    );

    const CONTACT = readable(
      { PLAYER:'player', FLOOR:'floor' },
      () => {}
    );

    const ACTION = readable(
      {
        SERVE:'serve', ACE:'ace', SERVICE_ERROR:'service error',
        DIG_OR_ATTACK:'dig_or_attack', DIG:'dig', RECEPTION_ERROR:'reception error',
        PASS_OR_ATTACK:'pass_or_attack', PASS:'pass', PASSING_ERROR:'passing error',
        ATTACK:'attack', KILL:'kill', ATTACKING_ERROR:'attacking error',
        BLOCK_OR_ATTACK:'block_or_attack', BLOCK:'block', BLOCKING_ERROR:'blocking error',
        VIOLATION:'violation',
      },
      () => {}
    );


    // writables
    const match = writable([]); // array of sets .. array of rallies .. array of contacts

    /* src/icons/whistle.svg generated by Svelte v3.32.3 */

    const file$1 = "src/icons/whistle.svg";

    function create_fragment$1(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M38.288 20.997a2 1.993 0 00-1.856 1.472l-1.949 6.813a2 1.993 0 103.847 1.092l1.949-6.813a2 1.993 0 00-1.991-2.564zM28.3 21.772a2 1.993 0 00-1.975 2.375l1.346 7.413a2 1.993 0 103.936-.71l-1.347-7.413a2 1.993 0 00-1.96-1.665zM17.519 26.9a2 1.993 0 00-1.342 3.517l5.775 4.978a2 1.993 0 102.618-3.014l-5.776-4.978a2 1.993 0 00-1.275-.503zM37.375 35.16c-10.252-.082-19.048 6.881-21.594 16.344-.965-.553-2.095-.906-3.281-.906-3.585 0-6.5 2.936-6.5 6.5 0 3.544 2.915 6.469 6.5 6.469a6.643 6.643 0 003.281-.875c2.51 9.362 11.131 16.312 21.407 16.312 9.13 0 16.95-5.51 20.343-13.281.035-.08.092-.17.125-.25 2.912-7.603 8.238-11.918 13.625-14.563 5.792-2.755 12.817-3.75 20.532-3.75 1.153 0 2.187-1.016 2.187-2.156v-7.656c0-1.14-1.034-2.187-2.187-2.188H38c-.234.01-.422-.012-.625 0zm24.063 4.344h1.53v2.406h-1.53v-2.406zm-24.25 3.5c7.828 0 14.28 6.315 14.28 14.094 0 7.78-6.452 14.125-14.28 14.125-7.861 0-14.313-6.346-14.313-14.125 0-7.78 6.452-14.094 14.313-14.094zM12.5 54.973c1.236 0 2.188.903 2.188 2.125 0 1.164-.952 2.125-2.188 2.125-1.177 0-2.094-.961-2.094-2.125 0-1.222.917-2.125 2.094-2.125z");
    			add_location(path0, file$1, 5, 2, 175);
    			attr_dev(path1, "d", "M37.195 47.365c5.444 0 9.86 4.327 9.86 9.746 0 5.418-4.416 9.746-9.86 9.746-5.49 0-9.898-4.328-9.898-9.746 0-5.419 4.408-9.746 9.898-9.746z");
    			add_location(path1, file$1, 6, 2, 1282);
    			attr_dev(svg, "viewBox", "0 0 100 100");
    			add_location(svg, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
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

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Whistle", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Whistle> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Whistle extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Whistle",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/Court.svelte generated by Svelte v3.32.3 */
    const file$2 = "src/Court.svelte";

    function create_fragment$2(ctx) {
    	let svg_1;
    	let rect0;
    	let rect1;
    	let circle0;
    	let g0;
    	let rect2;
    	let line0;
    	let rect3;
    	let line1;
    	let g1;
    	let rect4;
    	let line2;
    	let line3;
    	let g2;
    	let rect5;
    	let line4;
    	let line5;
    	let line6;
    	let line7;
    	let rect6;
    	let rect7;
    	let g3;
    	let rect8;
    	let line8;
    	let line9;
    	let line10;
    	let line11;
    	let g4;
    	let rect9;
    	let line12;
    	let line13;
    	let g5;
    	let rect10;
    	let line14;
    	let rect11;
    	let line15;
    	let g6;
    	let circle1;
    	let rect12;
    	let line16;
    	let circle2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			svg_1 = svg_element("svg");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			circle0 = svg_element("circle");
    			g0 = svg_element("g");
    			rect2 = svg_element("rect");
    			line0 = svg_element("line");
    			rect3 = svg_element("rect");
    			line1 = svg_element("line");
    			g1 = svg_element("g");
    			rect4 = svg_element("rect");
    			line2 = svg_element("line");
    			line3 = svg_element("line");
    			g2 = svg_element("g");
    			rect5 = svg_element("rect");
    			line4 = svg_element("line");
    			line5 = svg_element("line");
    			line6 = svg_element("line");
    			line7 = svg_element("line");
    			rect6 = svg_element("rect");
    			rect7 = svg_element("rect");
    			g3 = svg_element("g");
    			rect8 = svg_element("rect");
    			line8 = svg_element("line");
    			line9 = svg_element("line");
    			line10 = svg_element("line");
    			line11 = svg_element("line");
    			g4 = svg_element("g");
    			rect9 = svg_element("rect");
    			line12 = svg_element("line");
    			line13 = svg_element("line");
    			g5 = svg_element("g");
    			rect10 = svg_element("rect");
    			line14 = svg_element("line");
    			rect11 = svg_element("rect");
    			line15 = svg_element("line");
    			g6 = svg_element("g");
    			circle1 = svg_element("circle");
    			rect12 = svg_element("rect");
    			line16 = svg_element("line");
    			circle2 = svg_element("circle");
    			attr_dev(rect0, "class", "free svelte-fq3m54");
    			attr_dev(rect0, "width", "30");
    			attr_dev(rect0, "height", "15");
    			attr_dev(rect0, "rx", "1");
    			add_location(rect0, file$2, 95, 2, 2223);
    			attr_dev(rect1, "class", "court svelte-fq3m54");
    			attr_dev(rect1, "width", "18");
    			attr_dev(rect1, "height", "9");
    			attr_dev(rect1, "x", "6");
    			attr_dev(rect1, "y", "3");
    			add_location(rect1, file$2, 96, 2, 2277);
    			attr_dev(circle0, "id", "contact");
    			attr_dev(circle0, "class", "contact svelte-fq3m54");
    			attr_dev(circle0, "cx", "15");
    			attr_dev(circle0, "cy", "7.5");
    			attr_dev(circle0, "r", "0.105");
    			add_location(circle0, file$2, 98, 2, 2337);
    			attr_dev(rect2, "id", "free-home-top-area");
    			attr_dev(rect2, "class", "area svelte-fq3m54");
    			attr_dev(rect2, "width", "15");
    			attr_dev(rect2, "height", "3");
    			attr_dev(rect2, "x", "0");
    			attr_dev(rect2, "y", "0");
    			add_location(rect2, file$2, 101, 4, 2471);
    			attr_dev(line0, "id", "free-home-top-ext");
    			attr_dev(line0, "class", "boundary extension svelte-fq3m54");
    			attr_dev(line0, "x1", "12");
    			attr_dev(line0, "y1", "3");
    			attr_dev(line0, "x2", "12");
    			attr_dev(line0, "y2", "1.25");
    			add_location(line0, file$2, 102, 4, 2555);
    			attr_dev(rect3, "id", "free-away-top-area");
    			attr_dev(rect3, "class", "area svelte-fq3m54");
    			attr_dev(rect3, "width", "15");
    			attr_dev(rect3, "height", "3");
    			attr_dev(rect3, "x", "15");
    			attr_dev(rect3, "y", "0");
    			add_location(rect3, file$2, 103, 4, 2651);
    			attr_dev(line1, "id", "free-away-top-ext");
    			attr_dev(line1, "class", "boundary extension svelte-fq3m54");
    			attr_dev(line1, "x1", "18");
    			attr_dev(line1, "y1", "3");
    			attr_dev(line1, "x2", "18");
    			attr_dev(line1, "y2", "1.25");
    			add_location(line1, file$2, 104, 4, 2736);
    			attr_dev(g0, "class", "svelte-fq3m54");
    			add_location(g0, file$2, 100, 2, 2463);
    			attr_dev(rect4, "id", "free-home-service-area");
    			attr_dev(rect4, "class", "area svelte-fq3m54");
    			attr_dev(rect4, "width", "6");
    			attr_dev(rect4, "height", "9");
    			attr_dev(rect4, "x", "0");
    			attr_dev(rect4, "y", "3");
    			add_location(rect4, file$2, 107, 4, 2845);
    			attr_dev(line2, "id", "free-home-service-extA");
    			attr_dev(line2, "class", "boundary extension svelte-fq3m54");
    			attr_dev(line2, "x1", "6");
    			attr_dev(line2, "y1", "3");
    			attr_dev(line2, "x2", "4.25");
    			attr_dev(line2, "y2", "3");
    			add_location(line2, file$2, 108, 4, 2932);
    			attr_dev(line3, "id", "free-home-service-extB");
    			attr_dev(line3, "class", "boundary extension svelte-fq3m54");
    			attr_dev(line3, "x1", "6");
    			attr_dev(line3, "y1", "12");
    			attr_dev(line3, "x2", "4.25");
    			attr_dev(line3, "y2", "12");
    			add_location(line3, file$2, 109, 4, 3031);
    			attr_dev(g1, "class", "svelte-fq3m54");
    			add_location(g1, file$2, 106, 2, 2837);
    			attr_dev(rect5, "id", "court-home-area");
    			attr_dev(rect5, "class", "area svelte-fq3m54");
    			attr_dev(rect5, "width", "7.8");
    			attr_dev(rect5, "height", "9");
    			attr_dev(rect5, "x", "6");
    			attr_dev(rect5, "y", "3");
    			add_location(rect5, file$2, 112, 4, 3145);
    			attr_dev(line4, "id", "court-home-tapeA");
    			attr_dev(line4, "class", "court boundary svelte-fq3m54");
    			attr_dev(line4, "x1", "15");
    			attr_dev(line4, "y1", "12");
    			attr_dev(line4, "x2", "6");
    			attr_dev(line4, "y2", "12");
    			add_location(line4, file$2, 113, 4, 3228);
    			attr_dev(line5, "id", "court-home-tapeB");
    			attr_dev(line5, "class", "court boundary svelte-fq3m54");
    			attr_dev(line5, "x1", "6");
    			attr_dev(line5, "y1", "12");
    			attr_dev(line5, "x2", "6");
    			attr_dev(line5, "y2", "3");
    			add_location(line5, file$2, 114, 4, 3317);
    			attr_dev(line6, "id", "court-home-tapeC");
    			attr_dev(line6, "class", "court boundary svelte-fq3m54");
    			attr_dev(line6, "x1", "6");
    			attr_dev(line6, "y1", "3");
    			attr_dev(line6, "x2", "15");
    			attr_dev(line6, "y2", "3");
    			add_location(line6, file$2, 115, 4, 3404);
    			attr_dev(line7, "id", "court-home-tapeD");
    			attr_dev(line7, "class", "court boundary svelte-fq3m54");
    			attr_dev(line7, "x1", "12");
    			attr_dev(line7, "y1", "3");
    			attr_dev(line7, "x2", "12");
    			attr_dev(line7, "y2", "12");
    			add_location(line7, file$2, 116, 4, 3491);
    			attr_dev(g2, "class", "svelte-fq3m54");
    			add_location(g2, file$2, 111, 2, 3137);
    			attr_dev(rect6, "id", "block-home-area");
    			attr_dev(rect6, "class", "block area svelte-fq3m54");
    			attr_dev(rect6, "width", "0.8");
    			attr_dev(rect6, "height", "9");
    			attr_dev(rect6, "x", "13.8");
    			attr_dev(rect6, "y", "3");
    			add_location(rect6, file$2, 118, 2, 3585);
    			attr_dev(rect7, "id", "block-away-area");
    			attr_dev(rect7, "class", "block area svelte-fq3m54");
    			attr_dev(rect7, "width", "0.8");
    			attr_dev(rect7, "height", "9");
    			attr_dev(rect7, "x", "15.4");
    			attr_dev(rect7, "y", "3");
    			add_location(rect7, file$2, 119, 2, 3674);
    			attr_dev(rect8, "id", "court-away-area");
    			attr_dev(rect8, "class", "area svelte-fq3m54");
    			attr_dev(rect8, "width", "7.8");
    			attr_dev(rect8, "height", "9");
    			attr_dev(rect8, "x", "16.2");
    			attr_dev(rect8, "y", "3");
    			add_location(rect8, file$2, 121, 4, 3771);
    			attr_dev(line8, "id", "court-away-tapeA");
    			attr_dev(line8, "class", "court boundary svelte-fq3m54");
    			attr_dev(line8, "x1", "15");
    			attr_dev(line8, "y1", "3");
    			attr_dev(line8, "x2", "24");
    			attr_dev(line8, "y2", "3");
    			add_location(line8, file$2, 122, 4, 3857);
    			attr_dev(line9, "id", "court-away-tapeB");
    			attr_dev(line9, "class", "court boundary svelte-fq3m54");
    			attr_dev(line9, "x1", "24");
    			attr_dev(line9, "y1", "3");
    			attr_dev(line9, "x2", "24");
    			attr_dev(line9, "y2", "12");
    			add_location(line9, file$2, 123, 4, 3945);
    			attr_dev(line10, "id", "court-away-tapeC");
    			attr_dev(line10, "class", "court boundary svelte-fq3m54");
    			attr_dev(line10, "x1", "24");
    			attr_dev(line10, "y1", "12");
    			attr_dev(line10, "x2", "15");
    			attr_dev(line10, "y2", "12");
    			add_location(line10, file$2, 124, 4, 4034);
    			attr_dev(line11, "id", "court-away-tapeD");
    			attr_dev(line11, "class", "court boundary svelte-fq3m54");
    			attr_dev(line11, "x1", "18");
    			attr_dev(line11, "y1", "3");
    			attr_dev(line11, "x2", "18");
    			attr_dev(line11, "y2", "12");
    			add_location(line11, file$2, 125, 4, 4124);
    			attr_dev(g3, "class", "svelte-fq3m54");
    			add_location(g3, file$2, 120, 2, 3763);
    			attr_dev(rect9, "id", "free-away-service-area");
    			attr_dev(rect9, "class", "area svelte-fq3m54");
    			attr_dev(rect9, "width", "6");
    			attr_dev(rect9, "height", "9");
    			attr_dev(rect9, "x", "24");
    			attr_dev(rect9, "y", "3");
    			add_location(rect9, file$2, 128, 4, 4226);
    			attr_dev(line12, "id", "free-away-service-extA");
    			attr_dev(line12, "class", "boundary extension svelte-fq3m54");
    			attr_dev(line12, "x1", "24");
    			attr_dev(line12, "y1", "3");
    			attr_dev(line12, "x2", "25.75");
    			attr_dev(line12, "y2", "3");
    			add_location(line12, file$2, 129, 4, 4314);
    			attr_dev(line13, "id", "free-away-service-extB");
    			attr_dev(line13, "class", "boundary extension svelte-fq3m54");
    			attr_dev(line13, "x1", "24");
    			attr_dev(line13, "y1", "12");
    			attr_dev(line13, "x2", "25.75");
    			attr_dev(line13, "y2", "12");
    			add_location(line13, file$2, 130, 4, 4415);
    			attr_dev(g4, "class", "svelte-fq3m54");
    			add_location(g4, file$2, 127, 2, 4218);
    			attr_dev(rect10, "id", "free-away-bottom-area");
    			attr_dev(rect10, "class", "area svelte-fq3m54");
    			attr_dev(rect10, "width", "15");
    			attr_dev(rect10, "height", "3");
    			attr_dev(rect10, "x", "15");
    			attr_dev(rect10, "y", "12");
    			add_location(rect10, file$2, 133, 4, 4531);
    			attr_dev(line14, "id", "free-away-bottom-ext");
    			attr_dev(line14, "class", "boundary extension svelte-fq3m54");
    			attr_dev(line14, "x1", "12");
    			attr_dev(line14, "y1", "12");
    			attr_dev(line14, "x2", "12");
    			attr_dev(line14, "y2", "13.75");
    			add_location(line14, file$2, 134, 4, 4620);
    			attr_dev(rect11, "id", "free-home-bottom-area");
    			attr_dev(rect11, "class", "area svelte-fq3m54");
    			attr_dev(rect11, "width", "15");
    			attr_dev(rect11, "height", "3");
    			attr_dev(rect11, "x", "0");
    			attr_dev(rect11, "y", "12");
    			add_location(rect11, file$2, 135, 4, 4721);
    			attr_dev(line15, "id", "free-home-bottom-ext");
    			attr_dev(line15, "class", "boundary extension svelte-fq3m54");
    			attr_dev(line15, "x1", "18");
    			attr_dev(line15, "y1", "12");
    			attr_dev(line15, "x2", "18");
    			attr_dev(line15, "y2", "13.75");
    			add_location(line15, file$2, 136, 4, 4809);
    			attr_dev(g5, "class", "svelte-fq3m54");
    			add_location(g5, file$2, 132, 2, 4523);
    			attr_dev(circle1, "id", "net-post-top");
    			attr_dev(circle1, "class", "post svelte-fq3m54");
    			attr_dev(circle1, "cx", "15");
    			attr_dev(circle1, "cy", "2");
    			attr_dev(circle1, "r", "0.1012");
    			add_location(circle1, file$2, 140, 4, 4924);
    			attr_dev(rect12, "id", "net-area");
    			attr_dev(rect12, "class", "net area svelte-fq3m54");
    			attr_dev(rect12, "width", "0.8");
    			attr_dev(rect12, "height", "9");
    			attr_dev(rect12, "x", "14.6");
    			attr_dev(rect12, "y", "3");
    			add_location(rect12, file$2, 141, 4, 5074);
    			attr_dev(line16, "id", "net-tape");
    			attr_dev(line16, "class", "court boundary svelte-fq3m54");
    			attr_dev(line16, "x1", "15");
    			attr_dev(line16, "y1", "3");
    			attr_dev(line16, "x2", "15");
    			attr_dev(line16, "y2", "12");
    			add_location(line16, file$2, 142, 4, 5158);
    			attr_dev(circle2, "id", "net-post-bottom");
    			attr_dev(circle2, "class", "post svelte-fq3m54");
    			attr_dev(circle2, "cx", "15");
    			attr_dev(circle2, "cy", "13");
    			attr_dev(circle2, "r", "0.1012");
    			add_location(circle2, file$2, 143, 4, 5241);
    			attr_dev(g6, "class", "svelte-fq3m54");
    			add_location(g6, file$2, 139, 2, 4916);
    			attr_dev(svg_1, "id", "play-area");
    			attr_dev(svg_1, "viewBox", "3 1.5 24 12");
    			attr_dev(svg_1, "class", "svelte-fq3m54");
    			add_location(svg_1, file$2, 94, 0, 2078);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg_1, anchor);
    			append_dev(svg_1, rect0);
    			append_dev(svg_1, rect1);
    			append_dev(svg_1, circle0);
    			append_dev(svg_1, g0);
    			append_dev(g0, rect2);
    			append_dev(g0, line0);
    			append_dev(g0, rect3);
    			append_dev(g0, line1);
    			append_dev(svg_1, g1);
    			append_dev(g1, rect4);
    			append_dev(g1, line2);
    			append_dev(g1, line3);
    			append_dev(svg_1, g2);
    			append_dev(g2, rect5);
    			append_dev(g2, line4);
    			append_dev(g2, line5);
    			append_dev(g2, line6);
    			append_dev(g2, line7);
    			append_dev(svg_1, rect6);
    			append_dev(svg_1, rect7);
    			append_dev(svg_1, g3);
    			append_dev(g3, rect8);
    			append_dev(g3, line8);
    			append_dev(g3, line9);
    			append_dev(g3, line10);
    			append_dev(g3, line11);
    			append_dev(svg_1, g4);
    			append_dev(g4, rect9);
    			append_dev(g4, line12);
    			append_dev(g4, line13);
    			append_dev(svg_1, g5);
    			append_dev(g5, rect10);
    			append_dev(g5, line14);
    			append_dev(g5, rect11);
    			append_dev(g5, line15);
    			append_dev(svg_1, g6);
    			append_dev(g6, circle1);
    			append_dev(g6, rect12);
    			append_dev(g6, line16);
    			append_dev(g6, circle2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg_1, "click", /*on_click*/ ctx[0], false, false, false),
    					listen_dev(svg_1, "mousemove", /*on_move*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg_1);
    			mounted = false;
    			run_all(dispose);
    		}
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Court", slots, []);
    	const dispatch = createEventDispatcher();
    	let svg;
    	let contact;

    	const on_click = mouse_event => {
    		const loc = screen_to_svg(svg, mouse_event.clientX, mouse_event.clientY);

    		dispatch("contact", {
    			area_id: mouse_event.target.getAttribute("id"),
    			court_x: Math.round(loc.x * 1000), // mm
    			court_y: Math.round(loc.y * 1000),
    			el_x: mouse_event.offsetX, // px
    			el_y: mouse_event.offsetY,
    			el_rect: svg.parentElement.getBoundingClientRect(),
    			source_event: mouse_event
    		});
    	};

    	const on_move = mouse_event => {
    		const loc = screen_to_svg(svg, mouse_event.clientX, mouse_event.clientY);
    		contact.setAttributeNS(null, "cx", loc.x);
    		contact.setAttributeNS(null, "cy", loc.y);
    	};

    	const screen_to_svg = (svg, x, y) => {
    		// transforms {x,y} in screen space (pixels), to coordinates in svg space (arbitrary units)
    		const svgpt = svg.createSVGPoint();

    		svgpt.x = x;
    		svgpt.y = y;
    		return svgpt.matrixTransform(svg.getScreenCTM().inverse());
    	};

    	onMount(async () => {
    		svg = document.getElementById("play-area");
    		contact = document.getElementById("contact");
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Court> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		dispatch,
    		svg,
    		contact,
    		on_click,
    		on_move,
    		screen_to_svg
    	});

    	$$self.$inject_state = $$props => {
    		if ("svg" in $$props) svg = $$props.svg;
    		if ("contact" in $$props) contact = $$props.contact;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [on_click, on_move];
    }

    class Court extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Court",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Score.svelte generated by Svelte v3.32.3 */
    const file$3 = "src/Score.svelte";

    function create_fragment$3(ctx) {
    	let div5;
    	let div0;
    	let span0;
    	let t0_value = /*home_score*/ ctx[1].toString().padStart(2, "0") + "";
    	let t0;
    	let t1;
    	let div1;
    	let span1;
    	let t2;
    	let t3;
    	let div2;
    	let t4;
    	let t5;
    	let div3;
    	let span2;
    	let t6;
    	let t7;
    	let div4;
    	let span3;
    	let t8_value = /*away_score*/ ctx[3].toString().padStart(2, "0") + "";
    	let t8;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			span1 = element("span");
    			t2 = text(/*home_sets*/ ctx[2]);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(/*current_set*/ ctx[0]);
    			t5 = space();
    			div3 = element("div");
    			span2 = element("span");
    			t6 = text(/*away_sets*/ ctx[4]);
    			t7 = space();
    			div4 = element("div");
    			span3 = element("span");
    			t8 = text(t8_value);
    			attr_dev(span0, "class", "home score svelte-5sw5gv");
    			add_location(span0, file$3, 54, 20, 1034);
    			attr_dev(div0, "class", "digits svelte-5sw5gv");
    			add_location(div0, file$3, 54, 0, 1014);
    			attr_dev(span1, "class", "home sets svelte-5sw5gv");
    			add_location(span1, file$3, 55, 20, 1132);
    			attr_dev(div1, "class", "digits svelte-5sw5gv");
    			add_location(div1, file$3, 55, 0, 1112);
    			attr_dev(div2, "class", "set svelte-5sw5gv");
    			add_location(div2, file$3, 56, 0, 1181);
    			attr_dev(span2, "class", "away sets svelte-5sw5gv");
    			add_location(span2, file$3, 57, 20, 1238);
    			attr_dev(div3, "class", "digits svelte-5sw5gv");
    			add_location(div3, file$3, 57, 0, 1218);
    			attr_dev(span3, "class", "away score svelte-5sw5gv");
    			add_location(span3, file$3, 58, 20, 1307);
    			attr_dev(div4, "class", "digits svelte-5sw5gv");
    			add_location(div4, file$3, 58, 0, 1287);
    			attr_dev(div5, "class", "scoreboard svelte-5sw5gv");
    			add_location(div5, file$3, 53, 0, 989);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t0);
    			append_dev(div5, t1);
    			append_dev(div5, div1);
    			append_dev(div1, span1);
    			append_dev(span1, t2);
    			append_dev(div5, t3);
    			append_dev(div5, div2);
    			append_dev(div2, t4);
    			append_dev(div5, t5);
    			append_dev(div5, div3);
    			append_dev(div3, span2);
    			append_dev(span2, t6);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div4, span3);
    			append_dev(span3, t8);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*home_score*/ 2 && t0_value !== (t0_value = /*home_score*/ ctx[1].toString().padStart(2, "0") + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*home_sets*/ 4) set_data_dev(t2, /*home_sets*/ ctx[2]);
    			if (dirty & /*current_set*/ 1) set_data_dev(t4, /*current_set*/ ctx[0]);
    			if (dirty & /*away_sets*/ 16) set_data_dev(t6, /*away_sets*/ ctx[4]);
    			if (dirty & /*away_score*/ 8 && t8_value !== (t8_value = /*away_score*/ ctx[3].toString().padStart(2, "0") + "")) set_data_dev(t8, t8_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Score", slots, []);
    	let { current_set = 0 } = $$props;
    	let { home_score = 0 } = $$props;
    	let { home_sets = 0 } = $$props;
    	let { away_score = 0 } = $$props;
    	let { away_sets = 0 } = $$props;
    	const writable_props = ["current_set", "home_score", "home_sets", "away_score", "away_sets"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Score> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("current_set" in $$props) $$invalidate(0, current_set = $$props.current_set);
    		if ("home_score" in $$props) $$invalidate(1, home_score = $$props.home_score);
    		if ("home_sets" in $$props) $$invalidate(2, home_sets = $$props.home_sets);
    		if ("away_score" in $$props) $$invalidate(3, away_score = $$props.away_score);
    		if ("away_sets" in $$props) $$invalidate(4, away_sets = $$props.away_sets);
    	};

    	$$self.$capture_state = () => ({
    		TEAM,
    		ACTION,
    		match,
    		logger,
    		current_set,
    		home_score,
    		home_sets,
    		away_score,
    		away_sets
    	});

    	$$self.$inject_state = $$props => {
    		if ("current_set" in $$props) $$invalidate(0, current_set = $$props.current_set);
    		if ("home_score" in $$props) $$invalidate(1, home_score = $$props.home_score);
    		if ("home_sets" in $$props) $$invalidate(2, home_sets = $$props.home_sets);
    		if ("away_score" in $$props) $$invalidate(3, away_score = $$props.away_score);
    		if ("away_sets" in $$props) $$invalidate(4, away_sets = $$props.away_sets);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [current_set, home_score, home_sets, away_score, away_sets];
    }

    class Score extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			current_set: 0,
    			home_score: 1,
    			home_sets: 2,
    			away_score: 3,
    			away_sets: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Score",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get current_set() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set current_set(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get home_score() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set home_score(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get home_sets() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set home_sets(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get away_score() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set away_score(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get away_sets() {
    		throw new Error("<Score>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set away_sets(value) {
    		throw new Error("<Score>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Transcript.svelte generated by Svelte v3.32.3 */
    const file$4 = "src/Transcript.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	child_ctx[12] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (119:0) {#if i <= set_index}
    function create_if_block(ctx) {
    	let div;
    	let button;
    	let t0;
    	let span;
    	let t1;
    	let div_class_value;
    	let current;

    	button = new ye({
    			props: {
    				outlined: true,
    				dense: true,
    				icon: true,
    				color: "white",
    				title: "Set " + (/*i*/ ctx[12] + 1),
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let each_value_1 = /*set*/ ctx[10].rallies;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(button.$$.fragment);
    			t0 = space();
    			span = element("span");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			add_location(span, file$4, 121, 2, 3133);
    			attr_dev(div, "class", div_class_value = "" + (/*class_for_set*/ ctx[2](/*set*/ ctx[10]) + " set" + " svelte-1ymu4a9"));
    			add_location(div, file$4, 119, 0, 3015);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(button, div, null);
    			append_dev(div, t0);
    			append_dev(div, span);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(span, null);
    			}

    			append_dev(div, t1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};

    			if (dirty & /*$$scope*/ 524288) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);

    			if (dirty & /*$stored_match, title_for_contact, color_for_contact, style_for_symbol, symbol_for_action*/ 122) {
    				each_value_1 = /*set*/ ctx[10].rallies;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(span, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*$stored_match*/ 2 && div_class_value !== (div_class_value = "" + (/*class_for_set*/ ctx[2](/*set*/ ctx[10]) + " set" + " svelte-1ymu4a9"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(button);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(119:0) {#if i <= set_index}",
    		ctx
    	});

    	return block;
    }

    // (121:2) <Button outlined dense icon color="white" title="Set {i+1}">
    function create_default_slot_1(ctx) {
    	let t_value = /*i*/ ctx[12] + 1 + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(121:2) <Button outlined dense icon color=\\\"white\\\" title=\\\"Set {i+1}\\\">",
    		ctx
    	});

    	return block;
    }

    // (125:4) <Button unelevated dense icon             title="{title_for_contact(c)}"             color="{color_for_contact(c)}"             style="{style_for_symbol(c.action)}">
    function create_default_slot(ctx) {
    	let t0_value = /*symbol_for_action*/ ctx[5](/*c*/ ctx[16].action) + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = space();
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$stored_match*/ 2 && t0_value !== (t0_value = /*symbol_for_action*/ ctx[5](/*c*/ ctx[16].action) + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(125:4) <Button unelevated dense icon             title=\\\"{title_for_contact(c)}\\\"             color=\\\"{color_for_contact(c)}\\\"             style=\\\"{style_for_symbol(c.action)}\\\">",
    		ctx
    	});

    	return block;
    }

    // (124:2) {#each rally.contacts as c}
    function create_each_block_2(ctx) {
    	let button;
    	let current;

    	button = new ye({
    			props: {
    				unelevated: true,
    				dense: true,
    				icon: true,
    				title: /*title_for_contact*/ ctx[3](/*c*/ ctx[16]),
    				color: /*color_for_contact*/ ctx[4](/*c*/ ctx[16]),
    				style: /*style_for_symbol*/ ctx[6](/*c*/ ctx[16].action),
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*$stored_match*/ 2) button_changes.title = /*title_for_contact*/ ctx[3](/*c*/ ctx[16]);
    			if (dirty & /*$stored_match*/ 2) button_changes.color = /*color_for_contact*/ ctx[4](/*c*/ ctx[16]);
    			if (dirty & /*$stored_match*/ 2) button_changes.style = /*style_for_symbol*/ ctx[6](/*c*/ ctx[16].action);

    			if (dirty & /*$$scope, $stored_match*/ 524290) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(124:2) {#each rally.contacts as c}",
    		ctx
    	});

    	return block;
    }

    // (123:2) {#each set.rallies as rally}
    function create_each_block_1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_2 = /*rally*/ ctx[13].contacts;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title_for_contact, $stored_match, color_for_contact, style_for_symbol, symbol_for_action*/ 122) {
    				each_value_2 = /*rally*/ ctx[13].contacts;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(123:2) {#each set.rallies as rally}",
    		ctx
    	});

    	return block;
    }

    // (118:0) {#each $stored_match as set, i}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*i*/ ctx[12] <= /*set_index*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*i*/ ctx[12] <= /*set_index*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*set_index*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(118:0) {#each $stored_match as set, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*$stored_match*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*class_for_set, $stored_match, title_for_contact, color_for_contact, style_for_symbol, symbol_for_action, set_index*/ 127) {
    				each_value = /*$stored_match*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $ACTION;
    	let $TEAM;
    	let $stored_match;
    	validate_store(ACTION, "ACTION");
    	component_subscribe($$self, ACTION, $$value => $$invalidate(7, $ACTION = $$value));
    	validate_store(TEAM, "TEAM");
    	component_subscribe($$self, TEAM, $$value => $$invalidate(8, $TEAM = $$value));
    	validate_store(match, "stored_match");
    	component_subscribe($$self, match, $$value => $$invalidate(1, $stored_match = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Transcript", slots, []);
    	let { set_index = 0 } = $$props;
    	const log = logger("transcript: ");

    	const class_for_set = set => {
    		switch (set.winner) {
    			case "home":
    				return "home";
    			case "away":
    				return "away";
    			default:
    				return "current";
    		}
    	};

    	const title_for_contact = contact => {
    		let t = contact.description;

    		if (contact.player) {
    			t = `${contact.player} ${t}`;
    		}

    		return t;
    	};

    	const color_for_contact = contact => {
    		switch (contact.action) {
    			case $ACTION.SERVICE_ERROR:
    			case $ACTION.RECEPTION_ERROR:
    			case $ACTION.PASSING_ERROR:
    			case $ACTION.ATTACKING_ERROR:
    			case $ACTION.BLOCKING_ERROR:
    			case $ACTION.VIOLATION:
    				return "rgb(var(--action-error-rgb))";
    			case $ACTION.ACE:
    			case $ACTION.BLOCK:
    			case $ACTION.KILL:
    				return "rgb(var(--action-point-rgb))";
    			case $ACTION.SERVE:
    			case $ACTION.DIG_OR_ATTACK:
    			case $ACTION.DIG:
    			case $ACTION.PASS_OR_ATTACK:
    			case $ACTION.PASS:
    			case $ACTION.BLOCK_OR_ATTACK:
    			case $ACTION.BLOCK:
    			case $ACTION.ATTACK:
    				return contact.team === $TEAM.HOME
    				? "rgb(var(--team-home-rgb))"
    				: "rgb(var(--team-away-rgb))";
    			default:
    				return "#555";
    		}
    	};

    	const symbol_for_action = action => {
    		switch (action) {
    			case $ACTION.SERVICE_ERROR:
    			case $ACTION.RECEPTION_ERROR:
    			case $ACTION.PASSING_ERROR:
    			case $ACTION.ATTACKING_ERROR:
    			case $ACTION.BLOCKING_ERROR:
    				return "E";
    			case $ACTION.DIG_OR_ATTACK:
    			case $ACTION.PASS_OR_ATTACK:
    			case $ACTION.BLOCK_OR_ATTACK:
    				return " ";
    			case $ACTION.VIOLATION:
    				return "V";
    			case $ACTION.ACE:
    				return "♠";
    			case $ACTION.BLOCK:
    				return "B";
    			case $ACTION.KILL:
    				return "K";
    			case $ACTION.SERVE:
    				return "S";
    			case $ACTION.DIG:
    				return "D";
    			case $ACTION.PASS:
    				return "P";
    			case $ACTION.ATTACK:
    				return "A";
    			default:
    				return "?";
    		}
    	};

    	const style_for_symbol = action => {
    		switch (action) {
    			case $ACTION.ACE:
    				return "font-size: x-large; margin-top: -0.15em";
    			default:
    				return "";
    		}
    	};

    	const writable_props = ["set_index"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Transcript> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("set_index" in $$props) $$invalidate(0, set_index = $$props.set_index);
    	};

    	$$self.$capture_state = () => ({
    		Button: ye,
    		Icon: je,
    		TEAM,
    		ACTION,
    		stored_match: match,
    		logger,
    		set_index,
    		log,
    		class_for_set,
    		title_for_contact,
    		color_for_contact,
    		symbol_for_action,
    		style_for_symbol,
    		$ACTION,
    		$TEAM,
    		$stored_match
    	});

    	$$self.$inject_state = $$props => {
    		if ("set_index" in $$props) $$invalidate(0, set_index = $$props.set_index);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		set_index,
    		$stored_match,
    		class_for_set,
    		title_for_contact,
    		color_for_contact,
    		symbol_for_action,
    		style_for_symbol
    	];
    }

    class Transcript extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { set_index: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Transcript",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get set_index() {
    		throw new Error("<Transcript>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set set_index(value) {
    		throw new Error("<Transcript>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Recorder.svelte generated by Svelte v3.32.3 */
    const file$5 = "src/Recorder.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[56] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	return child_ctx;
    }

    // (830:2) <div slot="activator" style="display:flex;">
    function create_activator_slot(ctx) {
    	let div;
    	let court;
    	let current;
    	court = new Court({ $$inline: true });
    	court.$on("contact", /*on_contact*/ ctx[12]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(court.$$.fragment);
    			attr_dev(div, "slot", "activator");
    			set_style(div, "display", "flex");
    			add_location(div, file$5, 829, 2, 33204);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(court, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(court.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(court.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(court);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_activator_slot.name,
    		type: "slot",
    		source: "(830:2) <div slot=\\\"activator\\\" style=\\\"display:flex;\\\">",
    		ctx
    	});

    	return block;
    }

    // (837:4) <Button class="menu-item" on:click={()=>on_specify(s.type, s.value)}>
    function create_default_slot_6(ctx) {
    	let t_value = /*s*/ ctx[53].value + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*current*/ 16 && t_value !== (t_value = /*s*/ ctx[53].value + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(837:4) <Button class=\\\"menu-item\\\" on:click={()=>on_specify(s.type, s.value)}>",
    		ctx
    	});

    	return block;
    }

    // (836:2) {#each g as s}
    function create_each_block_2$1(ctx) {
    	let button;
    	let current;

    	function click_handler() {
    		return /*click_handler*/ ctx[14](/*s*/ ctx[53]);
    	}

    	button = new ye({
    			props: {
    				class: "menu-item",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button.$on("click", click_handler);

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const button_changes = {};

    			if (dirty[0] & /*current*/ 16 | dirty[1] & /*$$scope*/ 1073741824) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(836:2) {#each g as s}",
    		ctx
    	});

    	return block;
    }

    // (835:6) <ButtonGroup>
    function create_default_slot_5(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_2 = /*g*/ ctx[56];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*on_specify, current*/ 1040) {
    				each_value_2 = /*g*/ ctx[56];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(835:6) <ButtonGroup>",
    		ctx
    	});

    	return block;
    }

    // (834:2) {#each current.specifiers.groups as g}
    function create_each_block_1$1(ctx) {
    	let li;
    	let buttongroup;
    	let current;

    	buttongroup = new $e({
    			props: {
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(buttongroup.$$.fragment);
    			add_location(li, file$5, 834, 2, 33339);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(buttongroup, li, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const buttongroup_changes = {};

    			if (dirty[0] & /*current*/ 16 | dirty[1] & /*$$scope*/ 1073741824) {
    				buttongroup_changes.$$scope = { dirty, ctx };
    			}

    			buttongroup.$set(buttongroup_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(buttongroup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buttongroup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(buttongroup);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(834:2) {#each current.specifiers.groups as g}",
    		ctx
    	});

    	return block;
    }

    // (843:2) <Menuitem on:click={()=>on_specify(s.type, s.value)}>
    function create_default_slot_4(ctx) {
    	let t_value = /*s*/ ctx[53].value + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(843:2) <Menuitem on:click={()=>on_specify(s.type, s.value)}>",
    		ctx
    	});

    	return block;
    }

    // (842:2) {#each specifiers.both as s}
    function create_each_block$1(ctx) {
    	let menuitem;
    	let current;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[15](/*s*/ ctx[53]);
    	}

    	menuitem = new Yn({
    			props: {
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	menuitem.$on("click", click_handler_1);

    	const block = {
    		c: function create() {
    			create_component(menuitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(menuitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const menuitem_changes = {};

    			if (dirty[1] & /*$$scope*/ 1073741824) {
    				menuitem_changes.$$scope = { dirty, ctx };
    			}

    			menuitem.$set(menuitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menuitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menuitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(menuitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(842:2) {#each specifiers.both as s}",
    		ctx
    	});

    	return block;
    }

    // (829:0) <Menu origin={menu_origin} {...menu_offset}>
    function create_default_slot_3(ctx) {
    	let t0;
    	let t1;
    	let hr;
    	let t2;
    	let each1_anchor;
    	let current;
    	let each_value_1 = /*current*/ ctx[4].specifiers.groups;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*specifiers*/ ctx[13].both;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			t0 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			hr = element("hr");
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			add_location(hr, file$5, 840, 2, 33510);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(target, anchor);
    			}

    			insert_dev(target, t1, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*current, on_specify*/ 1040) {
    				each_value_1 = /*current*/ ctx[4].specifiers.groups;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(t1.parentNode, t1);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*on_specify, specifiers*/ 9216) {
    				each_value = /*specifiers*/ ctx[13].both;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t2);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(829:0) <Menu origin={menu_origin} {...menu_offset}>",
    		ctx
    	});

    	return block;
    }

    // (851:2) <Button style="align-self: center;" outlined toggle bind:active={recording}>
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("recording");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(851:2) <Button style=\\\"align-self: center;\\\" outlined toggle bind:active={recording}>",
    		ctx
    	});

    	return block;
    }

    // (875:4) <Icon style="transform: scale(1.25);">
    function create_default_slot_1$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Whistle;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = Whistle)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(875:4) <Icon style=\\\"transform: scale(1.25);\\\">",
    		ctx
    	});

    	return block;
    }

    // (874:2) <Button icon style="margin-left: 2.0rem; transform: scale(1.5);" color="rgb(var(--action-error-rgb))" on:click={on_whistle}>
    function create_default_slot$1(ctx) {
    	let icon;
    	let current;

    	icon = new je({
    			props: {
    				style: "transform: scale(1.25);",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty[1] & /*$$scope*/ 1073741824) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(874:2) <Button icon style=\\\"margin-left: 2.0rem; transform: scale(1.5);\\\" color=\\\"rgb(var(--action-error-rgb))\\\" on:click={on_whistle}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let h2;
    	let t1;
    	let div0;
    	let menu;
    	let div0_resize_listener;
    	let t2;
    	let transcript;
    	let t3;
    	let div1;
    	let button0;
    	let updating_active;
    	let t4;
    	let textfield0;
    	let updating_value;
    	let t5;
    	let score;
    	let t6;
    	let textfield1;
    	let updating_value_1;
    	let t7;
    	let button1;
    	let current;
    	const menu_spread_levels = [{ origin: /*menu_origin*/ ctx[3] }, /*menu_offset*/ ctx[2]];

    	let menu_props = {
    		$$slots: {
    			default: [create_default_slot_3],
    			activator: [create_activator_slot]
    		},
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < menu_spread_levels.length; i += 1) {
    		menu_props = assign(menu_props, menu_spread_levels[i]);
    	}

    	menu = new kn({ props: menu_props, $$inline: true });

    	transcript = new Transcript({
    			props: { set_index: /*current*/ ctx[4].set_index },
    			$$inline: true
    		});

    	function button0_active_binding(value) {
    		/*button0_active_binding*/ ctx[17](value);
    	}

    	let button0_props = {
    		style: "align-self: center;",
    		outlined: true,
    		toggle: true,
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	if (/*recording*/ ctx[5] !== void 0) {
    		button0_props.active = /*recording*/ ctx[5];
    	}

    	button0 = new ye({ props: button0_props, $$inline: true });
    	binding_callbacks.push(() => bind(button0, "active", button0_active_binding));

    	function textfield0_value_binding(value) {
    		/*textfield0_value_binding*/ ctx[18](value);
    	}

    	let textfield0_props = {
    		outlined: true,
    		style: "margin: 0; align-self: center;",
    		label: /*$TEAM*/ ctx[7].HOME
    	};

    	if (/*team_aliases*/ ctx[6][/*$TEAM*/ ctx[7].HOME] !== void 0) {
    		textfield0_props.value = /*team_aliases*/ ctx[6][/*$TEAM*/ ctx[7].HOME];
    	}

    	textfield0 = new Ve({ props: textfield0_props, $$inline: true });
    	binding_callbacks.push(() => bind(textfield0, "value", textfield0_value_binding));

    	score = new Score({
    			props: {
    				current_set: /*current*/ ctx[4].set_index + 1,
    				home_score: /*score_for_set*/ ctx[8](/*current*/ ctx[4].match, /*current*/ ctx[4].set_index, /*$TEAM*/ ctx[7].HOME),
    				home_sets: /*num_set_wins*/ ctx[9](/*current*/ ctx[4].match, /*$TEAM*/ ctx[7].HOME),
    				away_sets: /*num_set_wins*/ ctx[9](/*current*/ ctx[4].match, /*$TEAM*/ ctx[7].AWAY),
    				away_score: /*score_for_set*/ ctx[8](/*current*/ ctx[4].match, /*current*/ ctx[4].set_index, /*$TEAM*/ ctx[7].AWAY)
    			},
    			$$inline: true
    		});

    	function textfield1_value_binding(value) {
    		/*textfield1_value_binding*/ ctx[19](value);
    	}

    	let textfield1_props = {
    		outlined: true,
    		style: "margin: 0 0 0 1.5rem; align-self: center;",
    		label: /*$TEAM*/ ctx[7].AWAY
    	};

    	if (/*team_aliases*/ ctx[6][/*$TEAM*/ ctx[7].AWAY] !== void 0) {
    		textfield1_props.value = /*team_aliases*/ ctx[6][/*$TEAM*/ ctx[7].AWAY];
    	}

    	textfield1 = new Ve({ props: textfield1_props, $$inline: true });
    	binding_callbacks.push(() => bind(textfield1, "value", textfield1_value_binding));

    	button1 = new ye({
    			props: {
    				icon: true,
    				style: "margin-left: 2.0rem; transform: scale(1.5);",
    				color: "rgb(var(--action-error-rgb))",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*on_whistle*/ ctx[11]);

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "record a match";
    			t1 = space();
    			div0 = element("div");
    			create_component(menu.$$.fragment);
    			t2 = space();
    			create_component(transcript.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			create_component(button0.$$.fragment);
    			t4 = space();
    			create_component(textfield0.$$.fragment);
    			t5 = space();
    			create_component(score.$$.fragment);
    			t6 = space();
    			create_component(textfield1.$$.fragment);
    			t7 = space();
    			create_component(button1.$$.fragment);
    			add_location(h2, file$5, 825, 0, 33048);
    			attr_dev(div0, "class", "widener svelte-uyyo2w");
    			add_render_callback(() => /*div0_elementresize_handler*/ ctx[16].call(div0));
    			add_location(div0, file$5, 827, 0, 33073);
    			attr_dev(div1, "class", "control-bar svelte-uyyo2w");
    			add_location(div1, file$5, 849, 0, 33696);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			mount_component(menu, div0, null);
    			div0_resize_listener = add_resize_listener(div0, /*div0_elementresize_handler*/ ctx[16].bind(div0));
    			insert_dev(target, t2, anchor);
    			mount_component(transcript, target, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(button0, div1, null);
    			append_dev(div1, t4);
    			mount_component(textfield0, div1, null);
    			append_dev(div1, t5);
    			mount_component(score, div1, null);
    			append_dev(div1, t6);
    			mount_component(textfield1, div1, null);
    			append_dev(div1, t7);
    			mount_component(button1, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const menu_changes = (dirty[0] & /*menu_origin, menu_offset*/ 12)
    			? get_spread_update(menu_spread_levels, [
    					dirty[0] & /*menu_origin*/ 8 && { origin: /*menu_origin*/ ctx[3] },
    					dirty[0] & /*menu_offset*/ 4 && get_spread_object(/*menu_offset*/ ctx[2])
    				])
    			: {};

    			if (dirty[0] & /*current*/ 16 | dirty[1] & /*$$scope*/ 1073741824) {
    				menu_changes.$$scope = { dirty, ctx };
    			}

    			menu.$set(menu_changes);
    			const transcript_changes = {};
    			if (dirty[0] & /*current*/ 16) transcript_changes.set_index = /*current*/ ctx[4].set_index;
    			transcript.$set(transcript_changes);
    			const button0_changes = {};

    			if (dirty[1] & /*$$scope*/ 1073741824) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_active && dirty[0] & /*recording*/ 32) {
    				updating_active = true;
    				button0_changes.active = /*recording*/ ctx[5];
    				add_flush_callback(() => updating_active = false);
    			}

    			button0.$set(button0_changes);
    			const textfield0_changes = {};
    			if (dirty[0] & /*$TEAM*/ 128) textfield0_changes.label = /*$TEAM*/ ctx[7].HOME;

    			if (!updating_value && dirty[0] & /*team_aliases, $TEAM*/ 192) {
    				updating_value = true;
    				textfield0_changes.value = /*team_aliases*/ ctx[6][/*$TEAM*/ ctx[7].HOME];
    				add_flush_callback(() => updating_value = false);
    			}

    			textfield0.$set(textfield0_changes);
    			const score_changes = {};
    			if (dirty[0] & /*current*/ 16) score_changes.current_set = /*current*/ ctx[4].set_index + 1;
    			if (dirty[0] & /*current, $TEAM*/ 144) score_changes.home_score = /*score_for_set*/ ctx[8](/*current*/ ctx[4].match, /*current*/ ctx[4].set_index, /*$TEAM*/ ctx[7].HOME);
    			if (dirty[0] & /*current, $TEAM*/ 144) score_changes.home_sets = /*num_set_wins*/ ctx[9](/*current*/ ctx[4].match, /*$TEAM*/ ctx[7].HOME);
    			if (dirty[0] & /*current, $TEAM*/ 144) score_changes.away_sets = /*num_set_wins*/ ctx[9](/*current*/ ctx[4].match, /*$TEAM*/ ctx[7].AWAY);
    			if (dirty[0] & /*current, $TEAM*/ 144) score_changes.away_score = /*score_for_set*/ ctx[8](/*current*/ ctx[4].match, /*current*/ ctx[4].set_index, /*$TEAM*/ ctx[7].AWAY);
    			score.$set(score_changes);
    			const textfield1_changes = {};
    			if (dirty[0] & /*$TEAM*/ 128) textfield1_changes.label = /*$TEAM*/ ctx[7].AWAY;

    			if (!updating_value_1 && dirty[0] & /*team_aliases, $TEAM*/ 192) {
    				updating_value_1 = true;
    				textfield1_changes.value = /*team_aliases*/ ctx[6][/*$TEAM*/ ctx[7].AWAY];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			textfield1.$set(textfield1_changes);
    			const button1_changes = {};

    			if (dirty[1] & /*$$scope*/ 1073741824) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			transition_in(transcript.$$.fragment, local);
    			transition_in(button0.$$.fragment, local);
    			transition_in(textfield0.$$.fragment, local);
    			transition_in(score.$$.fragment, local);
    			transition_in(textfield1.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			transition_out(transcript.$$.fragment, local);
    			transition_out(button0.$$.fragment, local);
    			transition_out(textfield0.$$.fragment, local);
    			transition_out(score.$$.fragment, local);
    			transition_out(textfield1.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			destroy_component(menu);
    			div0_resize_listener();
    			if (detaching) detach_dev(t2);
    			destroy_component(transcript, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			destroy_component(button0);
    			destroy_component(textfield0);
    			destroy_component(score);
    			destroy_component(textfield1);
    			destroy_component(button1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $TEAM;
    	let $CONTACT;
    	let $ACTION;
    	let $stored_match;
    	validate_store(TEAM, "TEAM");
    	component_subscribe($$self, TEAM, $$value => $$invalidate(7, $TEAM = $$value));
    	validate_store(CONTACT, "CONTACT");
    	component_subscribe($$self, CONTACT, $$value => $$invalidate(21, $CONTACT = $$value));
    	validate_store(ACTION, "ACTION");
    	component_subscribe($$self, ACTION, $$value => $$invalidate(22, $ACTION = $$value));
    	validate_store(match, "stored_match");
    	component_subscribe($$self, match, $$value => $$invalidate(23, $stored_match = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Recorder", slots, []);
    	const log = logger("recorder: ");

    	const RALLY_STATE = {
    		SERVING: "serving",
    		SERVE_RECEIVING: "serve_receiving",
    		RECEIVER_RALLYING2: "receiver_rallying2",
    		RECEIVER_RALLYING3: "receiver_rallying3",
    		RECEIVER_ATTACKING: "receiver_attacking",
    		RECEIVER_BLOCKING: "receiver_blocking",
    		SERVER_RALLYING2: "server_rallying2",
    		SERVER_RALLYING3: "server_rallying3",
    		SERVER_ATTACKING: "server_attacking",
    		SERVER_BLOCKING: "server_blocking"
    	};

    	const first = array => array[0];
    	const last = array => array[array.length - 1];

    	const new_rally = serving => ({
    		state: RALLY_STATE.SERVING,
    		serving_team: serving,
    		hits: 0,
    		contacts: []
    	});

    	const new_set = () => {
    		const set = { score: {}, rallies: [], winner: null };
    		set.score[$TEAM.HOME] = 0;
    		set.score[$TEAM.AWAY] = 0;
    		return set;
    	};

    	const reset_match = (match, num_sets) => {
    		match.splice(0, match.length, ...Array(num_sets).fill(null).map(() => new_set()));
    	};

    	const score_for_set = (match, set_index, team) => match[set_index] ? match[set_index].score[team] : 0;

    	const num_set_wins = (match, team) => {
    		return match.reduce((a, v) => a + (v.winner === team ? 1 : 0), 0);
    	};

    	const match_winner_info = (match, set_index, min_wins = 2) => {
    		let has_won = false;
    		let team = null;

    		if (set_index + 1 >= min_wins) {
    			if (num_set_wins(match, $TEAM.HOME) >= min_wins) {
    				has_won = true;
    				team = $TEAM.HOME;
    			} else if (num_set_wins(match, $TEAM.AWAY) >= min_wins) {
    				has_won = true;
    				team = $TEAM.AWAY;
    			}
    		}

    		return [has_won, team];
    	};

    	const set_winner_info = (match, set_index, min_wins = 2) => {
    		let has_won = false;
    		let team = null;
    		const h = score_for_set(match, set_index, $TEAM.HOME);
    		const a = score_for_set(match, set_index, $TEAM.AWAY);
    		const threshold = set_index < min_wins ? 25 : 15;

    		if (Math.max(h, a) >= threshold && Math.abs(h - a) >= 2) {
    			has_won = true;
    			team = h > a ? $TEAM.HOME : $TEAM.AWAY;
    		}

    		return [has_won, team];
    	};

    	const score_summary = (match, set_index) => {
    		const sets_h = num_set_wins(match, $TEAM.HOME);
    		const score_h = score_for_set(match, set_index, $TEAM.HOME);
    		const score_a = score_for_set(match, set_index, $TEAM.AWAY);
    		const sets_a = num_set_wins(match, $TEAM.AWAY);
    		return `score: (${sets_h}) H ${score_h} | ${score_a} A (${sets_a})`;
    	};

    	const point_for = (team, match, set_index) => {
    		match[set_index].score[team] += 1;
    		log.info(score_summary(match, set_index));
    	};

    	const add_new_rally_to_set = (possession, current) => {
    		const { match, set_index } = current;
    		log.info(`starting new rally in set ${set_index + 1}, ${team_aliases[possession]} (${possession}) team serving..`);
    		match[set_index].rallies.push(new_rally(possession));
    		current.rally = last(match[set_index].rallies);
    	};

    	const attribute_action_to_last_player = (rally, contact) => {
    		const latest = last(rally.contacts);
    		contact.player = latest.player;
    		log.debug(`attributed current action (${contact.action}) to ${latest.player}`);
    	};

    	const update_last_recorded_action = (rally, action) => {
    		const latest = last(rally.contacts);
    		const old = latest.action;
    		latest.action = action;
    		log.debug(`resolved last action from: ${old} to ${latest.action}`);
    	};

    	const needs_specifier = (contact, rally) => {
    		if (is_net_area(contact.area_id)) {
    			return false;
    		}

    		if (rally.state === RALLY_STATE.SERVING && !is_service_area(contact.area_id, rally.serving_team)) {
    			return false;
    		}

    		return true;
    	};

    	const is_out = area => area.startsWith(`free-`) || area.startsWith(`net-`);
    	const is_net_area = area => area.startsWith("net-");
    	const is_blocking_area = (area, team) => area.startsWith(`block-${team}`);
    	const is_service_area = (area, team) => area.startsWith(`free-${team}-service`);
    	const is_court_area = (area, team) => area.startsWith(`court-${team}`);
    	const is_free_area = (area, team) => area.startsWith(`free-${team}`);
    	const is_play_area = (area, team) => is_court_area(area, team) || is_blocking_area(area, team);
    	const team_from_area = area => area.split("-")[1];
    	const other_team = team => team === $TEAM.HOME ? $TEAM.AWAY : $TEAM.HOME;
    	const serving_team = rally => rally.serving_team;
    	const receiving_team = rally => other_team(rally.serving_team);

    	const process_contact = current => {
    		const { contact, rally, match: match$1 } = current;
    		log.debug(`ball contact with ${contact.type} in ${contact.area_id}`);
    		let servers = serving_team(rally);
    		let receivers = receiving_team(rally);
    		let possession = servers;
    		let area = contact.area_id;
    		let is_valid = true;
    		let rally_ends = true;

    		const record_action = (msg, action, team) => {
    			log.info(action.toUpperCase(), msg);
    			contact.description = msg;
    			contact.action = action;
    			contact.team = team;
    		};

    		switch (rally.state) {
    			case RALLY_STATE.SERVING:
    				if (contact.type === $CONTACT.PLAYER && is_service_area(area, servers)) {
    					record_action(`serve: ${team_aliases[servers]} (${servers}) serving ${team_aliases[receivers]}`, $ACTION.SERVE, servers);
    					rally_ends = false;
    					rally.hits = 0;
    					rally.state = RALLY_STATE.SERVE_RECEIVING;
    				} else {
    					is_valid = false;
    					log.warn(`invalid contact: expected ${$CONTACT.PLAYER} contact in service area of ${servers} team`);
    				}
    				break;
    			case RALLY_STATE.SERVE_RECEIVING:
    				if (contact.type === $CONTACT.PLAYER && is_play_area(area, receivers)) {
    					if (is_blocking_area(area, receivers)) {
    						record_action("reception error: cannot block a serve", $ACTION.RECEPTION_ERROR, receivers);
    						rally_ends = true;
    						possession = servers;
    					} else {
    						rally.hits += 1;
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					record_action("service ace", $ACTION.ACE, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					record_action("service error: net contact", $ACTION.SERVICE_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_out(area)) {
    					if (contact.type === $CONTACT.PLAYER && is_free_area(area, receivers)) {
    						rally.hits += 1;
    						record_action(`reception: dig or attack [in free area], hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					} else {
    						record_action("service error: ball landed out of bounds", $ACTION.SERVICE_ERROR, servers);
    						attribute_action_to_last_player(rally, contact);
    						rally_ends = true;
    						possession = receivers;
    					}

    					break;
    				}
    				if (is_play_area(area, servers)) {
    					record_action("service error: ball contact on serving team court", $ACTION.SERVICE_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.RECEIVER_RALLYING2:
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
    					update_last_recorded_action(rally, $ACTION.ATTACK);

    					if (is_blocking_area(area, servers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, $ACTION.BLOCK_OR_ATTACK, servers);
    						rally.state = RALLY_STATE.SERVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, servers);
    						rally.state = RALLY_STATE.SERVER_RALLYING2;
    					}

    					rally_ends = false;
    					break;
    				}
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, $ACTION.DIG);
    					record_action(`reception: pass or attack (hit ${rally.hits})`, $ACTION.PASS_OR_ATTACK, receivers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.RECEIVER_RALLYING3;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, $ACTION.ATTACK);
    					record_action("attack kill", $ACTION.KILL, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, $ACTION.DIG);
    					record_action("reception error: net contact", $ACTION.RECEPTION_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, $ACTION.DIG);
    					record_action("reception error: ball landed out of bounds", $ACTION.RECEPTION_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, $ACTION.DIG);
    					record_action("reception error: ball dropped", $ACTION.RECEPTION_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.RECEIVER_RALLYING3:
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
    					update_last_recorded_action(rally, $ACTION.ATTACK);

    					if (is_blocking_area(area, servers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, $ACTION.BLOCK_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action(`reception: attack (hit ${rally.hits})`, $ACTION.ATTACK, receivers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.RECEIVER_ATTACKING;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, $ACTION.ATTACK);
    					record_action("attack kill", $ACTION.KILL, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action("passing error: net contact", $ACTION.PASSING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action("passing error: ball landed out of bounds", $ACTION.PASSING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action("passing error: ball dropped", $ACTION.PASSING_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.RECEIVER_ATTACKING:
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits = 1; // ball crossed from receivers to servers, so reset hit count

    					if (is_blocking_area(area, servers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, $ACTION.BLOCK_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, servers)) {
    					record_action("attack kill", $ACTION.KILL, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (is_net_area(area)) {
    					record_action("attacking error: net contact", $ACTION.ATTACKING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_out(area)) {
    					record_action("attacking error: ball landed out of bounds", $ACTION.ATTACKING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					record_action("attacking error: ball dropped", $ACTION.ATTACKING_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits += 1;
    					record_action(`attacking error: too many hits (${rally.hits})`, $ACTION.ATTACKING_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				break;
    			case RALLY_STATE.RECEIVER_BLOCKING:
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
    					update_last_recorded_action(rally, $ACTION.ATTACK);

    					if (is_blocking_area(area, servers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, $ACTION.BLOCK_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, servers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.SERVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action(`reception: pass or attack (hit ${rally.hits})`, $ACTION.PASS_OR_ATTACK, receivers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.RECEIVER_RALLYING3;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, $ACTION.BLOCK);
    					record_action("block", $ACTION.KILL, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, $ACTION.ATTACK);
    					record_action("attacking error: ball landed out of bounds", $ACTION.ATTACKING_ERROR, receivers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					record_action("attacking error: ball dropped", $ACTION.ATTACKING_ERROR, receivers);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				break;
    			case RALLY_STATE.SERVER_RALLYING2:
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
    					update_last_recorded_action(rally, $ACTION.ATTACK);

    					if (is_blocking_area(area, receivers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, $ACTION.BLOCK_OR_ATTACK, receivers);
    						rally.state = RALLY_STATE.RECEIVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, receivers);
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					rally_ends = false;
    					break;
    				}
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, $ACTION.DIG);
    					record_action(`reception: pass or attack (hit ${rally.hits})`, $ACTION.PASS_OR_ATTACK, servers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.SERVER_RALLYING3;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, $ACTION.ATTACK);
    					record_action("attack kill", $ACTION.KILL, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, $ACTION.DIG);
    					record_action("reception error: net contact", $ACTION.RECEPTION_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, $ACTION.DIG);
    					record_action("reception error: ball landed out of bounds", $ACTION.RECEPTION_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, $ACTION.DIG);
    					record_action("reception error: ball dropped", $ACTION.RECEPTION_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.SERVER_RALLYING3:
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
    					update_last_recorded_action(rally, $ACTION.ATTACK);

    					if (is_blocking_area(area, receivers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, $ACTION.BLOCK_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action(`reception: attack (hit ${rally.hits})`, $ACTION.ATTACK, servers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.SERVER_ATTACKING;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, $ACTION.ATTACK);
    					record_action("attack kill", $ACTION.KILL, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action("passing error: net contact", $ACTION.PASSING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action("passing error: ball landed out of bounds", $ACTION.PASSING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, servers)) {
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action("passing error: ball dropped", $ACTION.PASSING_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				log.error(`unhandled scenario in rally state ${rally.state}`);
    				break;
    			case RALLY_STATE.SERVER_ATTACKING:
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits = 1; // ball crossed from servers to receivers, so reset hit count

    					if (is_blocking_area(area, receivers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, $ACTION.BLOCK_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					record_action("attack kill", $ACTION.KILL, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (is_net_area(area)) {
    					record_action("attacking error: net contact", $ACTION.ATTACKING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_out(area)) {
    					record_action("attacking error: ball landed out of bounds", $ACTION.ATTACKING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, servers)) {
    					record_action("attacking error: ball dropped", $ACTION.ATTACKING_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits += 1;
    					record_action(`attacking error: too many hits (${rally.hits})`, $ACTION.ATTACKING_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				break;
    			case RALLY_STATE.SERVER_BLOCKING:
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
    					rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
    					update_last_recorded_action(rally, $ACTION.ATTACK);

    					if (is_blocking_area(area, receivers)) {
    						record_action(`block or attack attempt (hit ${rally.hits})`, $ACTION.BLOCK_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_BLOCKING;
    					} else {
    						record_action(`reception: dig or attack (hit ${rally.hits})`, $ACTION.DIG_OR_ATTACK, receivers);
    						rally_ends = false;
    						rally.state = RALLY_STATE.RECEIVER_RALLYING2;
    					}

    					break;
    				}
    				if (contact.type === $CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
    					rally.hits += 1;
    					update_last_recorded_action(rally, $ACTION.PASS);
    					record_action(`reception: pass or attack (hit ${rally.hits})`, $ACTION.PASS_OR_ATTACK, servers);
    					rally_ends = false;
    					rally.state = RALLY_STATE.SERVER_RALLYING3;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, receivers)) {
    					update_last_recorded_action(rally, $ACTION.BLOCK);
    					record_action("block", $ACTION.KILL, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = servers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_out(area)) {
    					update_last_recorded_action(rally, $ACTION.ATTACK);
    					record_action("attacking error: ball landed out of bounds", $ACTION.ATTACKING_ERROR, servers);
    					attribute_action_to_last_player(rally, contact);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				if (contact.type === $CONTACT.FLOOR && is_play_area(area, servers)) {
    					record_action("attacking error: ball dropped", $ACTION.ATTACKING_ERROR, servers);
    					rally_ends = true;
    					possession = receivers;
    					break;
    				}
    				break;
    		}

    		if (!contact.action) {
    			log.debug("no action");
    		}

    		if (!is_valid) {
    			return;
    		}

    		rally.contacts.push(contact);
    		let need_new_rally = false;

    		if (rally_ends) {
    			const set_index = current.set_index;
    			log.info(`rally ends. appending to set ${set_index + 1}`);
    			point_for(possession, match$1, set_index);
    			log.debug("current:", current);
    			const [set_ends, set_winner] = set_winner_info(match$1, set_index);

    			if (set_ends) {
    				log.info(`set ${set_index + 1} ends. ${team_aliases[set_winner]} (${set_winner}) team wins.`);
    				match$1[set_index].winner = set_winner;
    				const [match_ends, match_winner] = match_winner_info(match$1, set_index);

    				if (match_ends) {
    					log.info(`match ends. ${team_aliases[match_winner]} (${match_winner}) team wins.`);
    					$$invalidate(5, recording = false);
    				} else {
    					current.set_index = set_index + 1; // TODO: signal UI and reactivate New Match button
    					need_new_rally = true;
    				}
    			} else {
    				need_new_rally = true;
    			}
    		} else {
    			log.info("rally continues..");
    		}

    		if (need_new_rally) {
    			add_new_rally_to_set(possession, current);
    		}

    		set_store_value(match, $stored_match = match$1, $stored_match); // trigger store update
    	};

    	const set_menu_props = ({ el_x: x, el_y: y, el_rect, area_id }) => {
    		// position menu to open near contact and grow towards center of court
    		const { width: w, height: h } = el_rect;

    		const tb = y < h / 2 ? "top" : "bottom";
    		const lr = x < w / 2 ? "left" : "right";
    		const k = 80; // FIXME: magic number.. where is this vertical offset coming from?
    		$$invalidate(3, menu_origin = `${tb} ${lr}`);
    		$$invalidate(2, menu_offset.dx = lr === "left" ? x : w - x, menu_offset);
    		$$invalidate(2, menu_offset.dy = tb === "top" ? y - k : h - y + k, menu_offset);

    		// set specifiers appropriate to contact location
    		$$invalidate(4, current.specifiers = specifiers[team_from_area(area_id)], current);
    	};

    	const on_specify = (type, value) => {
    		specifying = false;
    		$$invalidate(4, current.contact.type = type, current);

    		if (type === $CONTACT.PLAYER) {
    			$$invalidate(4, current.contact.player = value, current);
    		}

    		process_contact(current);
    	};

    	const on_whistle = e => {
    		log.debug("whistle!", e);
    	};

    	const on_contact = e => {
    		/* contact:
       .type
       .player
       .team
       .description
       .action
       .area_id
       .court_x
       .court_y
    */
    		if (!recording) {
    			log.debug("not in recording mode");
    			e.detail.source_event.stopPropagation();
    			return;
    		}

    		if (specifying) {
    			specifying = false;
    			log.debug("specify cancelled");
    			return;
    		}

    		// log.debug(`contact with ${e.detail.area_id} at [${e.detail.el_x}, ${e.detail.el_y}]`);
    		$$invalidate(4, current.contact = e.detail, current);

    		if (needs_specifier(current.contact, current.rally)) {
    			specifying = true;
    			set_menu_props(current.contact);
    		} else {
    			current.contact.source_event.stopPropagation();
    			process_contact(current);
    		}

    		delete current.contact.el_rect; // no longer needed after this function
    		delete current.contact.source_event; // no longer needed after this function
    	};

    	const on_match_start = (serving, num_sets = 3) => {
    		$$invalidate(5, recording = true);
    		reset_match(current.match, num_sets);
    		$$invalidate(4, current.set_index = 0, current);
    		log.info("starting new match:", current.match);
    		log.info(score_summary(current.match, current.set_index));
    		add_new_rally_to_set(serving, current);
    		$$invalidate(4, current.specifiers = specifiers[serving], current);
    	};

    	let menu_width, menu_height; // read-only
    	let menu_offset = { dx: 0, dy: 0 };
    	let menu_origin = "top left";

    	let current = {
    		match: $stored_match,
    		set_index: 0,
    		rally: null,
    		contact: null,
    		specifiers: null
    	};

    	let recording = false;
    	let specifying = false;

    	let specifiers = {
    		"home": {
    			"groups": [
    				// TODO: set these via UI
    				[
    					{ type: $CONTACT.PLAYER, value: "#01" },
    					{ type: $CONTACT.PLAYER, value: "#02" },
    					{ type: $CONTACT.PLAYER, value: "#03" },
    					{ type: $CONTACT.PLAYER, value: "#04" }
    				],
    				[
    					{ type: $CONTACT.PLAYER, value: "#05" },
    					{ type: $CONTACT.PLAYER, value: "#06" },
    					{ type: $CONTACT.PLAYER, value: "#07" },
    					{ type: $CONTACT.PLAYER, value: "#08" }
    				],
    				[
    					{ type: $CONTACT.PLAYER, value: "#09" },
    					{ type: $CONTACT.PLAYER, value: "#10" },
    					{ type: $CONTACT.PLAYER, value: "#11" }
    				]
    			]
    		},
    		"away": {
    			"groups": [[{ type: $CONTACT.PLAYER, value: "Player" }]]
    		},
    		"both": [{ type: $CONTACT.FLOOR, value: "Floor" }]
    	};

    	let team_aliases = { "home": "my team", "away": "their team" };

    	onMount(async () => {
    		// TODO: move this to a `New Match` button that prompts for serving team
    		on_match_start($TEAM.HOME);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Recorder> was created with unknown prop '${key}'`);
    	});

    	const click_handler = s => on_specify(s.type, s.value);
    	const click_handler_1 = s => on_specify(s.type, s.value);

    	function div0_elementresize_handler() {
    		menu_width = this.clientWidth;
    		menu_height = this.clientHeight;
    		$$invalidate(0, menu_width);
    		$$invalidate(1, menu_height);
    	}

    	function button0_active_binding(value) {
    		recording = value;
    		$$invalidate(5, recording);
    	}

    	function textfield0_value_binding(value) {
    		if ($$self.$$.not_equal(team_aliases[$TEAM.HOME], value)) {
    			team_aliases[$TEAM.HOME] = value;
    			$$invalidate(6, team_aliases);
    		}
    	}

    	function textfield1_value_binding(value) {
    		if ($$self.$$.not_equal(team_aliases[$TEAM.AWAY], value)) {
    			team_aliases[$TEAM.AWAY] = value;
    			$$invalidate(6, team_aliases);
    		}
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Button: ye,
    		ButtonGroup: $e,
    		Icon: je,
    		Menu: kn,
    		Menuitem: Yn,
    		Textfield: Ve,
    		TEAM,
    		CONTACT,
    		ACTION,
    		stored_match: match,
    		logger,
    		whistle: Whistle,
    		Court,
    		Score,
    		Transcript,
    		log,
    		RALLY_STATE,
    		first,
    		last,
    		new_rally,
    		new_set,
    		reset_match,
    		score_for_set,
    		num_set_wins,
    		match_winner_info,
    		set_winner_info,
    		score_summary,
    		point_for,
    		add_new_rally_to_set,
    		attribute_action_to_last_player,
    		update_last_recorded_action,
    		needs_specifier,
    		is_out,
    		is_net_area,
    		is_blocking_area,
    		is_service_area,
    		is_court_area,
    		is_free_area,
    		is_play_area,
    		team_from_area,
    		other_team,
    		serving_team,
    		receiving_team,
    		process_contact,
    		set_menu_props,
    		on_specify,
    		on_whistle,
    		on_contact,
    		on_match_start,
    		menu_width,
    		menu_height,
    		menu_offset,
    		menu_origin,
    		current,
    		recording,
    		specifying,
    		specifiers,
    		team_aliases,
    		$TEAM,
    		$CONTACT,
    		$ACTION,
    		$stored_match
    	});

    	$$self.$inject_state = $$props => {
    		if ("menu_width" in $$props) $$invalidate(0, menu_width = $$props.menu_width);
    		if ("menu_height" in $$props) $$invalidate(1, menu_height = $$props.menu_height);
    		if ("menu_offset" in $$props) $$invalidate(2, menu_offset = $$props.menu_offset);
    		if ("menu_origin" in $$props) $$invalidate(3, menu_origin = $$props.menu_origin);
    		if ("current" in $$props) $$invalidate(4, current = $$props.current);
    		if ("recording" in $$props) $$invalidate(5, recording = $$props.recording);
    		if ("specifying" in $$props) specifying = $$props.specifying;
    		if ("specifiers" in $$props) $$invalidate(13, specifiers = $$props.specifiers);
    		if ("team_aliases" in $$props) $$invalidate(6, team_aliases = $$props.team_aliases);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		menu_width,
    		menu_height,
    		menu_offset,
    		menu_origin,
    		current,
    		recording,
    		team_aliases,
    		$TEAM,
    		score_for_set,
    		num_set_wins,
    		on_specify,
    		on_whistle,
    		on_contact,
    		specifiers,
    		click_handler,
    		click_handler_1,
    		div0_elementresize_handler,
    		button0_active_binding,
    		textfield0_value_binding,
    		textfield1_value_binding
    	];
    }

    class Recorder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Recorder",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/Visualizer.svelte generated by Svelte v3.32.3 */

    const file$6 = "src/Visualizer.svelte";

    function create_fragment$6(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "visualize stats";
    			add_location(h2, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Visualizer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Visualizer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Visualizer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Visualizer",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/icons/download_for_offline.svg generated by Svelte v3.32.3 */

    const file$7 = "src/icons/download_for_offline.svg";

    function create_fragment$7(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M0 0h24v24H0V0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$7, 5, 2, 213);
    			attr_dev(path1, "d", "M12,2C6.49,2,2,6.49,2,12s4.49,10,10,10s10-4.49,10-10S17.51,2,12,2z M11,10V6h2v4h3l-4,4l-4-4H11z M17,17H7v-2h10V17z");
    			add_location(path1, file$7, 6, 2, 255);
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Download_for_offline", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Download_for_offline> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Download_for_offline extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Download_for_offline",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/icons/upload_file.svg generated by Svelte v3.32.3 */

    const file$8 = "src/icons/upload_file.svg";

    function create_fragment$8(ctx) {
    	let svg;
    	let path0;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "d", "M0 0h24v24H0V0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$8, 5, 2, 195);
    			attr_dev(path1, "d", "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z");
    			add_location(path1, file$8, 6, 2, 237);
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			add_location(svg, file$8, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Upload_file", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Upload_file> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Upload_file extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Upload_file",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/DataInterface.svelte generated by Svelte v3.32.3 */
    const file$9 = "src/DataInterface.svelte";

    // (85:8) <Icon style="transform: scale(1.5);">
    function create_default_slot_4$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Download_for_offline;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = Download_for_offline)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(85:8) <Icon style=\\\"transform: scale(1.5);\\\">",
    		ctx
    	});

    	return block;
    }

    // (84:6) <Button outlined title="download this match data" on:click={on_download}>
    function create_default_slot_3$1(ctx) {
    	let icon;
    	let current;

    	icon = new je({
    			props: {
    				style: "transform: scale(1.5);",
    				$$slots: { default: [create_default_slot_4$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(84:6) <Button outlined title=\\\"download this match data\\\" on:click={on_download}>",
    		ctx
    	});

    	return block;
    }

    // (88:8) <Icon style="transform: scale(1.5);">
    function create_default_slot_2$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = Upload_file;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = Upload_file)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(88:8) <Icon style=\\\"transform: scale(1.5);\\\">",
    		ctx
    	});

    	return block;
    }

    // (87:6) <Button outlined title="upload new match data" on:click={()=>file_input.click()}>
    function create_default_slot_1$2(ctx) {
    	let icon;
    	let t;
    	let input;
    	let current;
    	let mounted;
    	let dispose;

    	icon = new je({
    			props: {
    				style: "transform: scale(1.5);",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(icon.$$.fragment);
    			t = space();
    			input = element("input");
    			set_style(input, "display", "none");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".json, .txt");
    			add_location(input, file$9, 88, 8, 2489);
    		},
    		m: function mount(target, anchor) {
    			mount_component(icon, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, input, anchor);
    			/*input_binding*/ ctx[5](input);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*on_upload*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const icon_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				icon_changes.$$scope = { dirty, ctx };
    			}

    			icon.$set(icon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(icon, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[5](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$2.name,
    		type: "slot",
    		source: "(87:6) <Button outlined title=\\\"upload new match data\\\" on:click={()=>file_input.click()}>",
    		ctx
    	});

    	return block;
    }

    // (83:4) <ButtonGroup color="primary">
    function create_default_slot$2(ctx) {
    	let button0;
    	let t;
    	let button1;
    	let current;

    	button0 = new ye({
    			props: {
    				outlined: true,
    				title: "download this match data",
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button0.$on("click", /*on_download*/ ctx[3]);

    	button1 = new ye({
    			props: {
    				outlined: true,
    				title: "upload new match data",
    				$$slots: { default: [create_default_slot_1$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*click_handler*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(button0.$$.fragment);
    			t = space();
    			create_component(button1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(button0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(button1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				button0_changes.$$scope = { dirty, ctx };
    			}

    			button0.$set(button0_changes);
    			const button1_changes = {};

    			if (dirty & /*$$scope, file_input*/ 1025) {
    				button1_changes.$$scope = { dirty, ctx };
    			}

    			button1.$set(button1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(button1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(83:4) <ButtonGroup color=\\\"primary\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let h1;
    	let t1;
    	let div1;
    	let div0;
    	let buttongroup;
    	let t2;
    	let textarea;
    	let current;

    	buttongroup = new $e({
    			props: {
    				color: "primary",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "import / export";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			create_component(buttongroup.$$.fragment);
    			t2 = space();
    			textarea = element("textarea");
    			add_location(h1, file$9, 78, 0, 2000);
    			attr_dev(div0, "class", "toolbar svelte-vm60pp");
    			add_location(div0, file$9, 81, 2, 2048);
    			attr_dev(textarea, "autocomplete", "off");
    			attr_dev(textarea, "autocorrect", "off");
    			attr_dev(textarea, "autocapitalize", "off");
    			attr_dev(textarea, "spellcheck", "false");
    			textarea.value = /*match_data*/ ctx[1];
    			attr_dev(textarea, "class", "svelte-vm60pp");
    			add_location(textarea, file$9, 93, 2, 2645);
    			attr_dev(div1, "class", "panel svelte-vm60pp");
    			add_location(div1, file$9, 80, 0, 2026);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(buttongroup, div0, null);
    			append_dev(div1, t2);
    			append_dev(div1, textarea);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const buttongroup_changes = {};

    			if (dirty & /*$$scope, file_input*/ 1025) {
    				buttongroup_changes.$$scope = { dirty, ctx };
    			}

    			buttongroup.$set(buttongroup_changes);

    			if (!current || dirty & /*match_data*/ 2) {
    				prop_dev(textarea, "value", /*match_data*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(buttongroup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buttongroup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_component(buttongroup);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let match_data;
    	let $match;
    	validate_store(match, "match");
    	component_subscribe($$self, match, $$value => $$invalidate(4, $match = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("DataInterface", slots, []);
    	const log = logger("data_interface: ");
    	const file_name_from_match = match => "match_data.json";

    	const save_json_file = (name, data) => {
    		const blob = new Blob([data], { type: "text/json" });
    		const link = document.createElement("a");

    		const click_event = new MouseEvent("click",
    		{
    				view: window,
    				bubbles: true,
    				cancelable: true
    			});

    		link.download = name;
    		link.href = window.URL.createObjectURL(blob);
    		link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");
    		link.dispatchEvent(click_event);
    		link.remove();
    	};

    	const on_upload = e => {
    		log.debug("upload requested", e);
    		let file = e.target.files[0];
    		let reader = new FileReader();
    		reader.onload = e => set_store_value(match, $match = JSON.parse(e.target.result), $match);
    		reader.readAsText(file);
    	};

    	const on_download = e => {
    		log.debug("download requested");
    		save_json_file(file_name_from_match(), match_data);
    	};

    	let file_input;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<DataInterface> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			file_input = $$value;
    			$$invalidate(0, file_input);
    		});
    	}

    	const click_handler = () => file_input.click();

    	$$self.$capture_state = () => ({
    		Button: ye,
    		ButtonGroup: $e,
    		Icon: je,
    		match,
    		logger,
    		download_for_offline: Download_for_offline,
    		upload_file: Upload_file,
    		log,
    		file_name_from_match,
    		save_json_file,
    		on_upload,
    		on_download,
    		file_input,
    		$match,
    		match_data
    	});

    	$$self.$inject_state = $$props => {
    		if ("file_input" in $$props) $$invalidate(0, file_input = $$props.file_input);
    		if ("match_data" in $$props) $$invalidate(1, match_data = $$props.match_data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$match*/ 16) {
    			$$invalidate(1, match_data = JSON.stringify($match, null, 2));
    		}
    	};

    	return [
    		file_input,
    		match_data,
    		on_upload,
    		on_download,
    		$match,
    		input_binding,
    		click_handler
    	];
    }

    class DataInterface extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DataInterface",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.3 */

    const { Object: Object_1 } = globals;
    const file$a = "src/App.svelte";

    // (47:2) <Tab>
    function create_default_slot_3$2(ctx) {
    	let recorder;
    	let current;
    	recorder = new Recorder({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(recorder.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(recorder, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(recorder.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(recorder.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(recorder, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$2.name,
    		type: "slot",
    		source: "(47:2) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (48:2) <Tab>
    function create_default_slot_2$2(ctx) {
    	let visualizer;
    	let current;
    	visualizer = new Visualizer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(visualizer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(visualizer, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(visualizer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(visualizer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(visualizer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$2.name,
    		type: "slot",
    		source: "(48:2) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (49:2) <Tab>
    function create_default_slot_1$3(ctx) {
    	let datainterface;
    	let current;
    	datainterface = new DataInterface({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(datainterface.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(datainterface, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(datainterface.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(datainterface.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(datainterface, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$3.name,
    		type: "slot",
    		source: "(49:2) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (46:0) <Tabs tabNames={['game', 'stats', 'data']}>
    function create_default_slot$3(ctx) {
    	let tab0;
    	let t0;
    	let tab1;
    	let t1;
    	let tab2;
    	let current;

    	tab0 = new il({
    			props: {
    				$$slots: { default: [create_default_slot_3$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tab1 = new il({
    			props: {
    				$$slots: { default: [create_default_slot_2$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tab2 = new il({
    			props: {
    				$$slots: { default: [create_default_slot_1$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tab0.$$.fragment);
    			t0 = space();
    			create_component(tab1.$$.fragment);
    			t1 = space();
    			create_component(tab2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(tab1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(tab2, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab0_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    			const tab2_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				tab2_changes.$$scope = { dirty, ctx };
    			}

    			tab2.$set(tab2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab0.$$.fragment, local);
    			transition_in(tab1.$$.fragment, local);
    			transition_in(tab2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab0.$$.fragment, local);
    			transition_out(tab1.$$.fragment, local);
    			transition_out(tab2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(tab1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(tab2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$3.name,
    		type: "slot",
    		source: "(46:0) <Tabs tabNames={['game', 'stats', 'data']}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let headerbar;
    	let br0;
    	let br1;
    	let t;
    	let tabs;
    	let current;

    	headerbar = new HeaderBar({
    			props: { title: "vbstats" },
    			$$inline: true
    		});

    	tabs = new nl({
    			props: {
    				tabNames: ["game", "stats", "data"],
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(headerbar.$$.fragment);
    			br0 = element("br");
    			br1 = element("br");
    			t = space();
    			create_component(tabs.$$.fragment);
    			add_location(br0, file$a, 43, 28, 1399);
    			add_location(br1, file$a, 43, 33, 1404);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(headerbar, target, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(tabs, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tabs_changes = {};

    			if (dirty & /*$$scope*/ 16) {
    				tabs_changes.$$scope = { dirty, ctx };
    			}

    			tabs.$set(tabs_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(headerbar.$$.fragment, local);
    			transition_in(tabs.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(headerbar.$$.fragment, local);
    			transition_out(tabs.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(headerbar, detaching);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t);
    			destroy_component(tabs, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const log = logger("app: ");
    	const prefers_dark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    	const toggle_theme = palette => {
    		log.info("toggling theme");
    		const d = document.documentElement;

    		if (d.attributes.getNamedItem("style")) {
    			d.removeAttribute("style");
    		} else {
    			Object.keys(palette).map(k => d.style.setProperty(k, palette[k]));
    		}
    	};

    	const dark_theme = {
    		"--accent": "#e6942b",
    		"--alternate": "#000",
    		"--bg-app-bar": "#838383",
    		"--bg-color": "#303134",
    		"--bg-input-filled": "rgba(255,255,255, 0.1)",
    		"--bg-panel": "#434343",
    		"--bg-popover": "#3f3f3f",
    		"--border": "#555",
    		"--color": "#eee",
    		"--divider": "rgba(255,255,255, 0.175)",
    		"--focus-color": "rgba(62,166,255, 0.5)", // primary with alpha
    		"--label": "rgba(255,255,255, 0.5)",
    		"--primary": "rgba(62,166,255, 1.0)"
    	};

    	onMount(async () => {
    		if (prefers_dark()) {
    			toggle_theme(dark_theme);
    		}
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		Tab: il,
    		Tabs: nl,
    		logger,
    		HeaderBar,
    		Recorder,
    		Visualizer,
    		DataInterface,
    		log,
    		prefers_dark,
    		toggle_theme,
    		dark_theme
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
