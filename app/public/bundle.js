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

    function oe(n){return l=>{const o=Object.keys(n.$$.callbacks),i=[];return o.forEach(o=>i.push(listen(l,o,e=>bubble(n,e)))),{destroy:()=>{i.forEach(e=>e());}}}}function ie(){return "undefined"!=typeof window&&!(window.CSS&&window.CSS.supports&&window.CSS.supports("(--foo: red)"))}function se(e){var t;return "r"===e.charAt(0)?e=(t=(t=e).match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i))&&4===t.length?"#"+("0"+parseInt(t[1],10).toString(16)).slice(-2)+("0"+parseInt(t[2],10).toString(16)).slice(-2)+("0"+parseInt(t[3],10).toString(16)).slice(-2):"":"transparent"===e.toLowerCase()&&(e="#00000000"),e}const{document:re}=globals;function ae(e){let t;return {c(){t=element("div"),attr(t,"class","ripple svelte-po4fcb");},m(n,l){insert(n,t,l),e[4](t);},p:noop,i:noop,o:noop,d(n){n&&detach(t),e[4](null);}}}function ce(e,t){e.style.transform=t,e.style.webkitTransform=t;}function de(e,t){e.style.opacity=t.toString();}const ue=function(e,t){const n=["touchcancel","mouseleave","dragstart"];let l=t.currentTarget||t.target;if(l&&!l.classList.contains("ripple")&&(l=l.querySelector(".ripple")),!l)return;const o=l.dataset.event;if(o&&o!==e)return;l.dataset.event=e;const i=document.createElement("span"),{radius:s,scale:r,x:a,y:c,centerX:d,centerY:u}=((e,t)=>{const n=t.getBoundingClientRect(),l=function(e){return "TouchEvent"===e.constructor.name}(e)?e.touches[e.touches.length-1]:e,o=l.clientX-n.left,i=l.clientY-n.top;let s=0,r=.3;const a=t.dataset.center;t.dataset.circle?(r=.15,s=t.clientWidth/2,s=a?s:s+Math.sqrt((o-s)**2+(i-s)**2)/4):s=Math.sqrt(t.clientWidth**2+t.clientHeight**2)/2;const c=(t.clientWidth-2*s)/2+"px",d=(t.clientHeight-2*s)/2+"px";return {radius:s,scale:r,x:a?c:o-s+"px",y:a?d:i-s+"px",centerX:c,centerY:d}})(t,l),p=l.dataset.color,f=2*s+"px";i.className="animation",i.style.width=f,i.style.height=f,i.style.background=p,i.classList.add("animation--enter"),i.classList.add("animation--visible"),ce(i,`translate(${a}, ${c}) scale3d(${r},${r},${r})`),de(i,0),i.dataset.activated=String(performance.now()),l.appendChild(i),setTimeout(()=>{i.classList.remove("animation--enter"),i.classList.add("animation--in"),ce(i,`translate(${d}, ${u}) scale3d(1,1,1)`),de(i,.25);},0);const v="mousedown"===e?"mouseup":"touchend",h=function(){document.removeEventListener(v,h),n.forEach(e=>{document.removeEventListener(e,h);});const e=performance.now()-Number(i.dataset.activated),t=Math.max(250-e,0);setTimeout(()=>{i.classList.remove("animation--in"),i.classList.add("animation--out"),de(i,0),setTimeout(()=>{i&&l.removeChild(i),0===l.children.length&&delete l.dataset.event;},300);},t);};document.addEventListener(v,h),n.forEach(e=>{document.addEventListener(e,h,{passive:!0});});},pe=function(e){0===e.button&&ue(e.type,e);},fe=function(e){if(e.changedTouches)for(let t=0;t<e.changedTouches.length;++t)ue(e.type,e.changedTouches[t]);};function ve(e,t,n){let l,o,{center:i=!1}=t,{circle:s=!1}=t,{color:r="currentColor"}=t;return onMount(async()=>{await tick();try{i&&n(0,l.dataset.center="true",l),s&&n(0,l.dataset.circle="true",l),n(0,l.dataset.color=r,l),o=l.parentElement;}catch(e){}if(!o)return void console.error("Ripple: Trigger element not found.");let e=window.getComputedStyle(o);0!==e.position.length&&"static"!==e.position||(o.style.position="relative"),o.addEventListener("touchstart",fe,{passive:!0}),o.addEventListener("mousedown",pe,{passive:!0});}),onDestroy(()=>{o&&(o.removeEventListener("mousedown",pe),o.removeEventListener("touchstart",fe));}),e.$$set=e=>{"center"in e&&n(1,i=e.center),"circle"in e&&n(2,s=e.circle),"color"in e&&n(3,r=e.color);},[l,i,s,r,function(e){binding_callbacks[e?"unshift":"push"](()=>{l=e,n(0,l);});}]}class he extends SvelteComponent{constructor(e){var t;super(),re.getElementById("svelte-po4fcb-style")||((t=element("style")).id="svelte-po4fcb-style",t.textContent=".ripple.svelte-po4fcb{display:block;position:absolute;top:0;left:0;right:0;bottom:0;overflow:hidden;border-radius:inherit;color:inherit;pointer-events:none;z-index:0;contain:strict}.ripple.svelte-po4fcb .animation{color:inherit;position:absolute;top:0;left:0;border-radius:50%;opacity:0;pointer-events:none;overflow:hidden;will-change:transform, opacity}.ripple.svelte-po4fcb .animation--enter{transition:none}.ripple.svelte-po4fcb .animation--in{transition:opacity 0.1s cubic-bezier(0.4, 0, 0.2, 1);transition:transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),\r\n\t\t\topacity 0.1s cubic-bezier(0.4, 0, 0.2, 1)}.ripple.svelte-po4fcb .animation--out{transition:opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)}",append(re.head,t)),init(this,e,ve,ae,safe_not_equal,{center:1,circle:2,color:3});}}function me(e){let t,n;return t=new he({props:{center:e[3],circle:e[3]}}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},p(e,n){const l={};8&n&&(l.center=e[3]),8&n&&(l.circle=e[3]),t.$set(l);},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function ge(t){let n,l,i,a,d;const p=t[19].default,v=create_slot(p,t,t[18],null);let h=t[10]&&me(t),b=[{class:t[1]},{style:t[2]},t[14]],L={};for(let e=0;e<b.length;e+=1)L=assign(L,b[e]);return {c(){n=element("button"),v&&v.c(),l=space(),h&&h.c(),set_attributes(n,L),toggle_class(n,"raised",t[6]),toggle_class(n,"outlined",t[8]&&!(t[6]||t[7])),toggle_class(n,"shaped",t[9]&&!t[3]),toggle_class(n,"dense",t[5]),toggle_class(n,"fab",t[4]&&t[3]),toggle_class(n,"icon-button",t[3]),toggle_class(n,"toggle",t[11]),toggle_class(n,"active",t[11]&&t[0]),toggle_class(n,"full-width",t[12]&&!t[3]),toggle_class(n,"svelte-6bcb3a",!0);},m(s,u){insert(s,n,u),v&&v.m(n,null),append(n,l),h&&h.m(n,null),t[20](n),i=!0,a||(d=[listen(n,"click",t[16]),action_destroyer(t[15].call(null,n))],a=!0);},p(e,[t]){v&&v.p&&262144&t&&update_slot(v,p,e,e[18],t,null,null),e[10]?h?(h.p(e,t),1024&t&&transition_in(h,1)):(h=me(e),h.c(),transition_in(h,1),h.m(n,null)):h&&(group_outros(),transition_out(h,1,1,()=>{h=null;}),check_outros()),set_attributes(n,L=get_spread_update(b,[(!i||2&t)&&{class:e[1]},(!i||4&t)&&{style:e[2]},16384&t&&e[14]])),toggle_class(n,"raised",e[6]),toggle_class(n,"outlined",e[8]&&!(e[6]||e[7])),toggle_class(n,"shaped",e[9]&&!e[3]),toggle_class(n,"dense",e[5]),toggle_class(n,"fab",e[4]&&e[3]),toggle_class(n,"icon-button",e[3]),toggle_class(n,"toggle",e[11]),toggle_class(n,"active",e[11]&&e[0]),toggle_class(n,"full-width",e[12]&&!e[3]),toggle_class(n,"svelte-6bcb3a",!0);},i(e){i||(transition_in(v,e),transition_in(h),i=!0);},o(e){transition_out(v,e),transition_out(h),i=!1;},d(e){e&&detach(n),v&&v.d(e),h&&h.d(),t[20](null),a=!1,run_all(d);}}}function be(e,t,n){let l,{$$slots:o={},$$scope:i}=t;const s=createEventDispatcher(),r=oe(current_component);let a,{class:c=""}=t,{style:d=null}=t,{icon:u=!1}=t,{fab:f=!1}=t,{dense:v=!1}=t,{raised:h=!1}=t,{unelevated:m=!1}=t,{outlined:g=!1}=t,{shaped:b=!1}=t,{color:x=null}=t,{ripple:w=!0}=t,{toggle:$=!1}=t,{active:z=!1}=t,{fullWidth:k=!1}=t,D={};return beforeUpdate(()=>{if(!a)return;let e=a.getElementsByTagName("svg"),t=e.length;for(let n=0;n<t;n++)e[n].setAttribute("width",l+($&&!u?2:0)),e[n].setAttribute("height",l+($&&!u?2:0));n(13,a.style.backgroundColor=h||m?x:"transparent",a);let o=getComputedStyle(a).getPropertyValue("background-color");n(13,a.style.color=h||m?function(e="#ffffff"){let t,n,l,o,i,s;if(0===e.length&&(e="#ffffff"),e=se(e),e=String(e).replace(/[^0-9a-f]/gi,""),!new RegExp(/^(?:[0-9a-f]{3}){1,2}$/i).test(e))throw new Error("Invalid HEX color!");e.length<6&&(e=e[0]+e[0]+e[1]+e[1]+e[2]+e[2]);const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t=parseInt(r[1],16)/255,n=parseInt(r[2],16)/255,l=parseInt(r[3],16)/255,o=t<=.03928?t/12.92:Math.pow((t+.055)/1.055,2.4),i=n<=.03928?n/12.92:Math.pow((n+.055)/1.055,2.4),s=l<=.03928?l/12.92:Math.pow((l+.055)/1.055,2.4),.2126*o+.7152*i+.0722*s}(o)>.5?"#000":"#fff":x,a);}),e.$$set=e=>{n(23,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(1,c=e.class),"style"in e&&n(2,d=e.style),"icon"in e&&n(3,u=e.icon),"fab"in e&&n(4,f=e.fab),"dense"in e&&n(5,v=e.dense),"raised"in e&&n(6,h=e.raised),"unelevated"in e&&n(7,m=e.unelevated),"outlined"in e&&n(8,g=e.outlined),"shaped"in e&&n(9,b=e.shaped),"color"in e&&n(17,x=e.color),"ripple"in e&&n(10,w=e.ripple),"toggle"in e&&n(11,$=e.toggle),"active"in e&&n(0,z=e.active),"fullWidth"in e&&n(12,k=e.fullWidth),"$$scope"in e&&n(18,i=e.$$scope);},e.$$.update=()=>{{const{style:e,icon:l,fab:o,dense:i,raised:s,unelevated:r,outlined:a,shaped:c,color:d,ripple:u,toggle:p,active:f,fullWidth:v,...h}=t;!h.disabled&&delete h.disabled,delete h.class,n(14,D=h);}56&e.$$.dirty&&(l=u?f?24:v?20:24:v?16:18),139264&e.$$.dirty&&("primary"===x?n(17,x=ie()?"#1976d2":"var(--primary, #1976d2)"):"accent"==x?n(17,x=ie()?"#f50057":"var(--accent, #f50057)"):!x&&a&&n(17,x=a.style.color||a.parentElement.style.color||(ie()?"#333":"var(--color, #333)")));},t=exclude_internal_props(t),[z,c,d,u,f,v,h,m,g,b,w,$,k,a,D,r,function(e){$&&(n(0,z=!z),s("change",z));},x,i,o,function(e){binding_callbacks[e?"unshift":"push"](()=>{a=e,n(13,a);});}]}class ye extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-6bcb3a-style")||((t=element("style")).id="svelte-6bcb3a-style",t.textContent="button.svelte-6bcb3a:disabled{cursor:default}button.svelte-6bcb3a{cursor:pointer;font-family:Roboto, Helvetica, sans-serif;font-family:var(--button-font-family, Roboto, Helvetica, sans-serif);font-size:0.875rem;font-weight:500;letter-spacing:0.75px;text-decoration:none;text-transform:uppercase;will-change:transform, opacity;margin:0;padding:0 16px;display:-ms-inline-flexbox;display:inline-flex;position:relative;align-items:center;justify-content:center;box-sizing:border-box;height:36px;border:none;outline:none;line-height:inherit;user-select:none;overflow:hidden;vertical-align:middle;border-radius:4px}button.svelte-6bcb3a::-moz-focus-inner{border:0}button.svelte-6bcb3a:-moz-focusring{outline:none}button.svelte-6bcb3a:before{box-sizing:inherit;border-radius:inherit;color:inherit;bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.2s cubic-bezier(0.25, 0.8, 0.5, 1);will-change:background-color, opacity}.toggle.svelte-6bcb3a:before{box-sizing:content-box}.active.svelte-6bcb3a:before{background-color:currentColor;opacity:0.3}.raised.svelte-6bcb3a{box-shadow:0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 5px 0 rgba(0, 0, 0, 0.12)}.outlined.svelte-6bcb3a{padding:0 14px;border-style:solid;border-width:2px}.shaped.svelte-6bcb3a{border-radius:18px}.dense.svelte-6bcb3a{height:32px}.icon-button.svelte-6bcb3a{line-height:0.5;border-radius:50%;padding:8px;width:40px;height:40px;vertical-align:middle}.icon-button.outlined.svelte-6bcb3a{padding:6px}.icon-button.fab.svelte-6bcb3a{border:none;width:56px;height:56px;box-shadow:0 3px 5px -1px rgba(0, 0, 0, 0.2), 0 6px 10px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 18px 0 rgba(0, 0, 0, 0.12)}.icon-button.dense.svelte-6bcb3a{width:36px;height:36px}.icon-button.fab.dense.svelte-6bcb3a{width:40px;height:40px}.outlined.svelte-6bcb3a:not(.shaped) .ripple{border-radius:0 !important}.full-width.svelte-6bcb3a{width:100%}@media(hover: hover){button.svelte-6bcb3a:hover:not(.toggle):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.15}button.focus-visible.svelte-6bcb3a:focus:not(.toggle):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.3}button.focus-visible.toggle.svelte-6bcb3a:focus:not(.active):not([disabled]):not(.disabled):before{background-color:currentColor;opacity:0.15}}",append(document.head,t)),init(this,e,be,ge,safe_not_equal,{class:1,style:2,icon:3,fab:4,dense:5,raised:6,unelevated:7,outlined:8,shaped:9,color:17,ripple:10,toggle:11,active:0,fullWidth:12});}}function xe(e){let t,n,l;const o=e[3].default,i=create_slot(o,e,e[2],null);return {c(){t=element("div"),i&&i.c(),attr(t,"class","button-group svelte-x6hf3e"),attr(t,"style",n=e[0]?`color: ${e[0]};`:""+e[1]);},m(e,n){insert(e,t,n),i&&i.m(t,null),l=!0;},p(e,[s]){i&&i.p&&4&s&&update_slot(i,o,e,e[2],s,null,null),(!l||3&s&&n!==(n=e[0]?`color: ${e[0]};`:""+e[1]))&&attr(t,"style",n);},i(e){l||(transition_in(i,e),l=!0);},o(e){transition_out(i,e),l=!1;},d(e){e&&detach(t),i&&i.d(e);}}}function we(e,t,n){let{$$slots:l={},$$scope:o}=t,{color:i=""}=t,{style:s=""}=t;return e.$$set=e=>{"color"in e&&n(0,i=e.color),"style"in e&&n(1,s=e.style),"$$scope"in e&&n(2,o=e.$$scope);},e.$$.update=()=>{1&e.$$.dirty&&("primary"===i?n(0,i=ie()?"#1976d2":"var(--primary, #1976d2)"):"accent"==i&&n(0,i=ie()?"#f50057":"var(--accent, #f50057)"));},[i,s,o,l]}class $e extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-x6hf3e-style")||((t=element("style")).id="svelte-x6hf3e-style",t.textContent=".button-group.svelte-x6hf3e{display:inline-flex;flex-wrap:wrap}.button-group.svelte-x6hf3e button{padding:0 8px}.button-group.svelte-x6hf3e button:first-child{border-top-right-radius:0;border-bottom-right-radius:0}.button-group.svelte-x6hf3e button:last-child{border-top-left-radius:0;border-bottom-left-radius:0}.button-group.svelte-x6hf3e .shaped:first-child{padding-left:12px}.button-group.svelte-x6hf3e .shaped:last-child{padding-right:12px}.button-group.svelte-x6hf3e button:not(:first-child):not(:last-child){border-radius:0}.button-group.svelte-x6hf3e button:not(:first-child){border-left:none}.button-group.svelte-x6hf3e .outlined{border-width:1px}",append(document.head,t)),init(this,e,we,xe,safe_not_equal,{color:0,style:1});}}function Re(e,t){if("Tab"!==e.key&&9!==e.keyCode)return;let n=function(e=document){return Array.prototype.slice.call(e.querySelectorAll('button, [href], select, textarea, input:not([type="hidden"]), [tabindex]:not([tabindex="-1"])')).filter((function(e){const t=window.getComputedStyle(e);return !e.disabled&&!e.getAttribute("disabled")&&!e.classList.contains("disabled")&&"none"!==t.display&&"hidden"!==t.visibility&&t.opacity>0}))}(t);if(0===n.length)return void e.preventDefault();let l=document.activeElement,o=n.indexOf(l);e.shiftKey?o<=0&&(n[n.length-1].focus(),e.preventDefault()):o>=n.length-1&&(n[0].focus(),e.preventDefault());}const{window:Ze}=globals;function Ue(t){let n,l,i,r,d,p,v;const h=t[17].default,b=create_slot(h,t,t[16],null);return {c(){n=element("div"),b&&b.c(),attr(n,"class",l=null_to_empty("popover "+t[1])+" svelte-5k22n0"),attr(n,"style",t[2]),attr(n,"tabindex","-1");},m(l,i){insert(l,n,i),b&&b.m(n,null),t[20](n),d=!0,p||(v=[listen(n,"introstart",t[18]),listen(n,"introend",t[19]),action_destroyer(t[4].call(null,n))],p=!0);},p(e,t){b&&b.p&&65536&t&&update_slot(b,h,e,e[16],t,null,null),(!d||2&t&&l!==(l=null_to_empty("popover "+e[1])+" svelte-5k22n0"))&&attr(n,"class",l),(!d||4&t)&&attr(n,"style",e[2]);},i(e){d||(transition_in(b,e),add_render_callback(()=>{r&&r.end(1),i||(i=create_in_transition(n,t[5],{})),i.start();}),d=!0);},o(e){transition_out(b,e),i&&i.invalidate(),r=create_out_transition(n,t[6],{}),d=!1;},d(e){e&&detach(n),b&&b.d(e),t[20](null),e&&r&&r.end(),p=!1,run_all(v);}}}function Ge(t){let n,l,o,i,s=t[0]&&Ue(t);return {c(){s&&s.c(),n=empty();},m(r,a){s&&s.m(r,a),insert(r,n,a),l=!0,o||(i=[listen(Ze,"scroll",t[8],{passive:!0}),listen(Ze,"resize",t[9],{passive:!0}),listen(Ze,"keydown",t[10],!0),listen(Ze,"click",t[11],!0)],o=!0);},p(e,[t]){e[0]?s?(s.p(e,t),1&t&&transition_in(s,1)):(s=Ue(e),s.c(),transition_in(s,1),s.m(n.parentNode,n)):s&&(group_outros(),transition_out(s,1,1,()=>{s=null;}),check_outros());},i(e){l||(transition_in(s),l=!0);},o(e){transition_out(s),l=!1;},d(e){s&&s.d(e),e&&detach(n),o=!1,run_all(i);}}}function Ke(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component),s=createEventDispatcher();let r,a,{class:c=""}=t,{style:d=null}=t,{origin:u="top left"}=t,{dx:f=0}=t,{dy:v=0}=t,{visible:h=!1}=t,{duration:m=300}=t;async function g({target:e}){setTimeout(()=>{e.style.transitionDuration=m+"ms",e.style.transitionProperty="opacity, transform",e.style.transform="scale(1)",e.style.opacity=null;},0);}function b(){if(!h||!r||!a)return;const e=a.getBoundingClientRect();e.top<-e.height||e.top>window.innerHeight?y("overflow"):(n(3,r.style.top=function(e,t){let l=0;n(13,v=+v);const o=window.innerHeight-8-e;return l=l=u.indexOf("top")>=0?t.top+v:t.top+t.height-e-v,l=Math.min(o,l),l=Math.max(8,l),l}(r.offsetHeight,e)+"px",r),n(3,r.style.left=function(e,t){let l=0;n(12,f=+f);const o=window.innerWidth-8-e;return l=l=u.indexOf("left")>=0?t.left+f:t.left+t.width-e-f,l=Math.min(o,l),l=Math.max(8,l),l}(r.offsetWidth,e)+"px",r));}function y(e){s("close",e),n(0,h=!1);}beforeUpdate(()=>{a=r?r.parentElement:null,a&&b();});return e.$$set=e=>{"class"in e&&n(1,c=e.class),"style"in e&&n(2,d=e.style),"origin"in e&&n(14,u=e.origin),"dx"in e&&n(12,f=e.dx),"dy"in e&&n(13,v=e.dy),"visible"in e&&n(0,h=e.visible),"duration"in e&&n(15,m=e.duration),"$$scope"in e&&n(16,o=e.$$scope);},[h,c,d,r,i,function(e){return e.style.transformOrigin=u,e.style.transform="scale(0.6)",e.style.opacity="0",{duration:+m}},function(e){return e.style.transformOrigin=u,e.style.transitionDuration=m+"ms",e.style.transitionProperty="opacity, transform",e.style.transform="scale(0.6)",e.style.opacity="0",{duration:+m}},g,function(){b();},function(){b();},function(e){h&&(27===e.keyCode&&(e.stopPropagation(),y("escape")),Re(e,r));},function(e){h&&a&&!a.contains(e.target)&&(e.stopPropagation(),y("clickOutside"));},f,v,u,m,o,l,e=>g(e),e=>function({target:e}){e.style.transformOrigin=null,e.style.transitionDuration=null,e.style.transitionProperty=null,e.style.transform=null,e.focus();}(e),function(e){binding_callbacks[e?"unshift":"push"](()=>{r=e,n(3,r);});}]}class Je extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-5k22n0-style")||((t=element("style")).id="svelte-5k22n0-style",t.textContent=".popover.svelte-5k22n0{color:#333;color:var(--color, #333);background:#fff;background:var(--bg-popover, #fff);backface-visibility:hidden;position:fixed;border-radius:2px;max-height:100%;max-width:80%;overflow:auto;outline:none;box-shadow:0 3px 3px -2px rgba(0, 0, 0, 0.2), 0 3px 4px 0 rgba(0, 0, 0, 0.14),\r\n\t\t\t0 1px 8px 0 rgba(0, 0, 0, 0.12);z-index:50}",append(document.head,t)),init(this,e,Ke,Ge,safe_not_equal,{class:1,style:2,origin:14,dx:12,dy:13,visible:0,duration:15});}}const yn=e=>({}),xn=e=>({});function wn(e){let t,n,l;const o=e[11].default,i=create_slot(o,e,e[14],null);return {c(){t=element("ul"),i&&i.c(),attr(t,"style",n=`min-width: ${e[5]}px`),attr(t,"class","svelte-1vc5q8h");},m(e,n){insert(e,t,n),i&&i.m(t,null),l=!0;},p(e,s){i&&i.p&&16384&s&&update_slot(i,o,e,e[14],s,null,null),(!l||32&s&&n!==(n=`min-width: ${e[5]}px`))&&attr(t,"style",n);},i(e){l||(transition_in(i,e),l=!0);},o(e){transition_out(i,e),l=!1;},d(e){e&&detach(t),i&&i.d(e);}}}function $n(t){let n,l,o,i,y,w,$;const D=t[11].activator,C=create_slot(D,t,t[14],xn),j=C||function(e){let t;return {c(){t=element("span");},m(e,n){insert(e,t,n);},d(e){e&&detach(t);}}}();function L(e){t[12](e);}let M={class:t[0],style:t[1],origin:t[4],dx:t[2],dy:t[3],$$slots:{default:[wn]},$$scope:{ctx:t}};return void 0!==t[6]&&(M.visible=t[6]),o=new Je({props:M}),binding_callbacks.push(()=>bind(o,"visible",L)),o.$on("click",t[10]),{c(){n=element("div"),j&&j.c(),l=space(),create_component(o.$$.fragment),attr(n,"class","menu svelte-1vc5q8h");},m(i,s){insert(i,n,s),j&&j.m(n,null),append(n,l),mount_component(o,n,null),t[13](n),y=!0,w||($=[listen(n,"click",t[9]),action_destroyer(t[8].call(null,n))],w=!0);},p(e,[t]){C&&C.p&&16384&t&&update_slot(C,D,e,e[14],t,yn,xn);const n={};1&t&&(n.class=e[0]),2&t&&(n.style=e[1]),16&t&&(n.origin=e[4]),4&t&&(n.dx=e[2]),8&t&&(n.dy=e[3]),16416&t&&(n.$$scope={dirty:t,ctx:e}),!i&&64&t&&(i=!0,n.visible=e[6],add_flush_callback(()=>i=!1)),o.$set(n);},i(e){y||(transition_in(j,e),transition_in(o.$$.fragment,e),y=!0);},o(e){transition_out(j,e),transition_out(o.$$.fragment,e),y=!1;},d(e){e&&detach(n),j&&j.d(e),destroy_component(o),t[13](null),w=!1,run_all($);}}}function zn(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let s,{class:r=""}=t,{style:a=null}=t,{dx:c=0}=t,{dy:d=0}=t,{origin:u="top left"}=t,{width:f=112}=t,v=!1;return e.$$set=e=>{"class"in e&&n(0,r=e.class),"style"in e&&n(1,a=e.style),"dx"in e&&n(2,c=e.dx),"dy"in e&&n(3,d=e.dy),"origin"in e&&n(4,u=e.origin),"width"in e&&n(5,f=e.width),"$$scope"in e&&n(14,o=e.$$scope);},[r,a,c,d,u,f,v,s,i,function(e){try{s.childNodes[0].contains(e.target)?n(6,v=!v):e.target===s&&n(6,v=!1);}catch(e){console.error(e);}},function(e){e.target.classList.contains("menu-item")&&n(6,v=!1);},l,function(e){v=e,n(6,v);},function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(7,s);});},o]}class kn extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1vc5q8h-style")||((t=element("style")).id="svelte-1vc5q8h-style",t.textContent="@supports (-webkit-overflow-scrolling: touch){html{cursor:pointer}}.menu.svelte-1vc5q8h{position:relative;display:inline-block;vertical-align:middle}ul.svelte-1vc5q8h{margin:0;padding:8px 0;width:100%;position:relative;overflow-x:hidden;overflow-y:visible}",append(document.head,t)),init(this,e,zn,$n,safe_not_equal,{class:0,style:1,dx:2,dy:3,origin:4,width:5});}}function Dn(t){let n,l,o,i,d,p,v;const h=t[9].default,b=create_slot(h,t,t[8],null);let L=t[1]&&jn(),M=[{class:o="menu-item "+t[0]},{tabindex:i=t[2]?"-1":"0"},t[4]],Y={};for(let e=0;e<M.length;e+=1)Y=assign(Y,M[e]);return {c(){n=element("li"),b&&b.c(),l=space(),L&&L.c(),set_attributes(n,Y),toggle_class(n,"svelte-mmrniu",!0);},m(o,i){insert(o,n,i),b&&b.m(n,null),append(n,l),L&&L.m(n,null),t[11](n),d=!0,p||(v=[listen(n,"keydown",t[7]),action_destroyer(t[6].call(null,n))],p=!0);},p(e,t){b&&b.p&&256&t&&update_slot(b,h,e,e[8],t,null,null),e[1]?L?2&t&&transition_in(L,1):(L=jn(),L.c(),transition_in(L,1),L.m(n,null)):L&&(group_outros(),transition_out(L,1,1,()=>{L=null;}),check_outros()),set_attributes(n,Y=get_spread_update(M,[(!d||1&t&&o!==(o="menu-item "+e[0]))&&{class:o},(!d||4&t&&i!==(i=e[2]?"-1":"0"))&&{tabindex:i},16&t&&e[4]])),toggle_class(n,"svelte-mmrniu",!0);},i(e){d||(transition_in(b,e),transition_in(L),d=!0);},o(e){transition_out(b,e),transition_out(L),d=!1;},d(e){e&&detach(n),b&&b.d(e),L&&L.d(),t[11](null),p=!1,run_all(v);}}}function Cn(t){let n,l,o,i,d,v,h,b;const L=t[9].default,M=create_slot(L,t,t[8],null);let Y=t[1]&&En(),A=[{class:i="menu-item "+t[0]},{href:t[3]},{tabindex:d=t[2]?"-1":"0"},t[4]],T={};for(let e=0;e<A.length;e+=1)T=assign(T,A[e]);return {c(){n=element("li"),l=element("a"),M&&M.c(),o=space(),Y&&Y.c(),set_attributes(l,T),toggle_class(l,"svelte-mmrniu",!0),attr(n,"class","svelte-mmrniu");},m(i,s){insert(i,n,s),append(n,l),M&&M.m(l,null),append(l,o),Y&&Y.m(l,null),t[10](l),v=!0,h||(b=[listen(l,"keydown",t[7]),action_destroyer(t[6].call(null,l))],h=!0);},p(e,t){M&&M.p&&256&t&&update_slot(M,L,e,e[8],t,null,null),e[1]?Y?2&t&&transition_in(Y,1):(Y=En(),Y.c(),transition_in(Y,1),Y.m(l,null)):Y&&(group_outros(),transition_out(Y,1,1,()=>{Y=null;}),check_outros()),set_attributes(l,T=get_spread_update(A,[(!v||1&t&&i!==(i="menu-item "+e[0]))&&{class:i},(!v||8&t)&&{href:e[3]},(!v||4&t&&d!==(d=e[2]?"-1":"0"))&&{tabindex:d},16&t&&e[4]])),toggle_class(l,"svelte-mmrniu",!0);},i(e){v||(transition_in(M,e),transition_in(Y),v=!0);},o(e){transition_out(M,e),transition_out(Y),v=!1;},d(e){e&&detach(n),M&&M.d(e),Y&&Y.d(),t[10](null),h=!1,run_all(b);}}}function jn(e){let t,n;return t=new he({}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function En(e){let t,n;return t=new he({}),{c(){create_component(t.$$.fragment);},m(e,l){mount_component(t,e,l),n=!0;},i(e){n||(transition_in(t.$$.fragment,e),n=!0);},o(e){transition_out(t.$$.fragment,e),n=!1;},d(e){destroy_component(t,e);}}}function Ln(e){let t,n,l,o;const i=[Cn,Dn],s=[];function r(e,t){return e[3]?0:1}return t=r(e),n=s[t]=i[t](e),{c(){n.c(),l=empty();},m(e,n){s[t].m(e,n),insert(e,l,n),o=!0;},p(e,[o]){let a=t;t=r(e),t===a?s[t].p(e,o):(group_outros(),transition_out(s[a],1,1,()=>{s[a]=null;}),check_outros(),n=s[t],n?n.p(e,o):(n=s[t]=i[t](e),n.c()),transition_in(n,1),n.m(l.parentNode,l));},i(e){o||(transition_in(n),o=!0);},o(e){transition_out(n),o=!1;},d(e){s[t].d(e),e&&detach(l);}}}function Mn(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let s,{class:r=""}=t,{ripple:a=!0}=t,c=!1,d=null,u={};return e.$$set=e=>{n(12,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,r=e.class),"ripple"in e&&n(1,a=e.ripple),"$$scope"in e&&n(8,o=e.$$scope);},e.$$.update=()=>{{const{href:e,ripple:l,...o}=t;delete o.class,!1===o.disabled&&delete o.disabled,n(2,c=!!o.disabled),n(3,d=e&&!c?e:null),n(4,u=o);}},t=exclude_internal_props(t),[r,a,c,d,u,s,i,function(e){if(13===e.keyCode||32===e.keyCode){e.stopPropagation(),e.preventDefault();const t=new MouseEvent("click",{bubbles:!0,cancelable:!0});s.dispatchEvent(t),s.blur();}},o,l,function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(5,s);});},function(e){binding_callbacks[e?"unshift":"push"](()=>{s=e,n(5,s);});}]}class Yn extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-mmrniu-style")||((t=element("style")).id="svelte-mmrniu-style",t.textContent="li.svelte-mmrniu{display:block}a.svelte-mmrniu,a.svelte-mmrniu:hover{text-decoration:none}.menu-item.svelte-mmrniu{position:relative;color:inherit;cursor:pointer;height:44px;user-select:none;display:flex;align-items:center;padding:0 16px;white-space:nowrap}.menu-item.svelte-mmrniu:focus{outline:none}.menu-item.svelte-mmrniu::-moz-focus-inner{border:0}.menu-item.svelte-mmrniu:-moz-focusring{outline:none}.menu-item.svelte-mmrniu:before{background-color:currentColor;color:inherit;bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.3s cubic-bezier(0.25, 0.8, 0.5, 1)}@media(hover: hover){.menu-item.svelte-mmrniu:hover:not([disabled]):not(.disabled):before{opacity:0.15}.focus-visible.menu-item:focus:not([disabled]):not(.disabled):before{opacity:0.3}}",append(document.head,t)),init(this,e,Mn,Ln,safe_not_equal,{class:0,ripple:1});}}const{document:Kn}=globals;function Jn(e,t,n){const l=e.slice();return l[17]=t[n],l[19]=n,l}function Qn(t,n){let l,o,i,d,p,f,y,w,$=n[17]+"";function z(...e){return n[12](n[19],...e)}return d=new he({props:{center:!0}}),{key:t,first:null,c(){l=element("button"),o=text($),i=space(),create_component(d.$$.fragment),attr(l,"class",p="tabbutton "+(n[0]==n[19]?"tabbuttonactive":"")+" svelte-4jfme"),this.first=l;},m(t,n){insert(t,l,n),append(l,o),append(l,i),mount_component(d,l,null),f=!0,y||(w=listen(l,"click",z),y=!0);},p(e,t){n=e,(!f||8&t)&&$!==($=n[17]+"")&&set_data(o,$),(!f||9&t&&p!==(p="tabbutton "+(n[0]==n[19]?"tabbuttonactive":"")+" svelte-4jfme"))&&attr(l,"class",p);},i(e){f||(transition_in(d.$$.fragment,e),f=!0);},o(e){transition_out(d.$$.fragment,e),f=!1;},d(e){e&&detach(l),destroy_component(d),y=!1,w();}}}function el(e){let t,n,l,o,i,d,p,v,h,E,L,M,Y=[],A=new Map,T=e[3];const N=e=>e[17];for(let t=0;t<T.length;t+=1){let n=Jn(e,T,t),l=N(n);A.set(l,Y[t]=Qn(l,n));}const I=e[11].default,B=create_slot(I,e,e[10],null);let S=[{class:h="tabbar "+e[1]},{style:e[2]},e[5]],q={};for(let e=0;e<S.length;e+=1)q=assign(q,S[e]);return {c(){t=element("div"),n=element("div");for(let e=0;e<Y.length;e+=1)Y[e].c();l=space(),o=element("span"),d=space(),p=element("div"),v=element("div"),B&&B.c(),attr(o,"class","tabindicator svelte-4jfme"),attr(o,"style",i=e[7]+"; background-color:var(--primary);"),attr(n,"class","tabbar-wrap svelte-4jfme"),attr(v,"class","tabcontent svelte-4jfme"),attr(v,"style",e[6]),attr(p,"class","tabcontent-wrap svelte-4jfme"),set_attributes(t,q),toggle_class(t,"svelte-4jfme",!0);},m(i,s){insert(i,t,s),append(t,n);for(let e=0;e<Y.length;e+=1)Y[e].m(n,null);append(n,l),append(n,o),append(t,d),append(t,p),append(p,v),B&&B.m(v,null),e[13](t),E=!0,L||(M=action_destroyer(e[8].call(null,t)),L=!0);},p(e,[s]){521&s&&(T=e[3],group_outros(),Y=update_keyed_each(Y,s,N,1,e,T,A,n,outro_and_destroy_block,Qn,l,Jn),check_outros()),(!E||128&s&&i!==(i=e[7]+"; background-color:var(--primary);"))&&attr(o,"style",i),B&&B.p&&1024&s&&update_slot(B,I,e,e[10],s,null,null),(!E||64&s)&&attr(v,"style",e[6]),set_attributes(t,q=get_spread_update(S,[(!E||2&s&&h!==(h="tabbar "+e[1]))&&{class:h},(!E||4&s)&&{style:e[2]},32&s&&e[5]])),toggle_class(t,"svelte-4jfme",!0);},i(e){if(!E){for(let e=0;e<T.length;e+=1)transition_in(Y[e]);transition_in(B,e),E=!0;}},o(e){for(let e=0;e<Y.length;e+=1)transition_out(Y[e]);transition_out(B,e),E=!1;},d(n){n&&detach(t);for(let e=0;e<Y.length;e+=1)Y[e].d();B&&B.d(n),e[13](null),L=!1,M();}}}function tl(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=createEventDispatcher(),s=oe(current_component);let r,{class:a=""}=t,{style:c=null}=t,d={},u="transform:translate3d(0%, 0px, 0px);",f="",{tabNames:v=[]}=t,{activeTab:h=0}=t;async function m(){await tick;let e=r.querySelectorAll(".tabbutton");if(e&&e.length>0){let t={};return h>=e.length&&(h>e.length?n(0,h=e.length-1):n(0,h--,h)),t.target=e[h],g(t,h),!0}return !1}function g(e,t){let l=e.target;n(6,u="transform:translate3d(-"+100*t+"%, 0px, 0px);"),n(7,f="left:"+l.offsetLeft+"px; width:"+l.offsetWidth+"px;"),n(0,h=t),i("change",{activeTab:h});}onMount(()=>{m()&&function(e,t){let n=0,l=0;function o(t){e.style.userSelect="none",l=t.touches?t.touches[0].clientX:t.clientX,document.addEventListener("mouseup",s),document.addEventListener("mousemove",i),document.addEventListener("touchmove",i,!1),document.addEventListener("touchend",s,!1);}function i(o){e.style.pointerEvents="none";const i=o.touches?o.touches[0].clientX:o.clientX;n=l-i,l=i;const s=parseInt(e.style.left)-n;e.style.left=(s>0?0:s+e.scrollWidth<=t.clientWidth?t.clientWidth-e.scrollWidth:s)+"px";}function s(){document.removeEventListener("mouseup",s),document.removeEventListener("mousemove",i),document.removeEventListener("touchmove",i),document.removeEventListener("touchend",i),e.style.pointerEvents="all",e.style.userSelect="all";}e.addEventListener("mousedown",o),e.addEventListener("touchstart",o,!1),""==e.style.left&&(e.style.left="0px");}(r.querySelector(".tabbar-wrap"),r);});return e.$$set=e=>{n(16,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(1,a=e.class),"style"in e&&n(2,c=e.style),"tabNames"in e&&n(3,v=e.tabNames),"activeTab"in e&&n(0,h=e.activeTab),"$$scope"in e&&n(10,o=e.$$scope);},e.$$.update=()=>{{const{style:e,tabNames:l,activeTab:o,...i}=t;n(5,d=i);}9&e.$$.dirty&&(n(0,h=Math.abs(parseInt(h))),Number.isInteger(h)||n(0,h=0),m());},t=exclude_internal_props(t),[h,a,c,v,r,d,u,f,s,g,o,l,(e,t)=>{g(t,e);},function(e){binding_callbacks[e?"unshift":"push"](()=>{r=e,n(4,r);});}]}class nl extends SvelteComponent{constructor(e){var t;super(),Kn.getElementById("svelte-4jfme-style")||((t=element("style")).id="svelte-4jfme-style",t.textContent=".tabbar.svelte-4jfme{width:100%;overflow:hidden}.tabbar-wrap.svelte-4jfme{display:flex;position:relative;transition:left 150ms}.tabbutton.svelte-4jfme{color:var(--color);min-width:70px;font-family:Roboto,sans-serif;-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;font-size:.875rem;font-weight:500;letter-spacing:.08929em;text-decoration:none;text-transform:uppercase;position:relative;display:flex;flex:1 0 auto;justify-content:center;align-items:center;box-sizing:border-box;height:48px;margin:0 !important;padding:0 24px;border:none;outline:none;background:none;text-align:center;white-space:nowrap;cursor:pointer;-webkit-appearance:none;z-index:1}.tabbutton.svelte-4jfme:before{bottom:0;content:'';left:0;opacity:0;pointer-events:none;position:absolute;right:0;top:0;transition:0.2s cubic-bezier(0.25, 0.8, 0.5, 1);will-change:background-color, opacity}.tabbutton.svelte-4jfme:hover:before{background-color:currentColor;opacity:0.15}.tabbuttonactive.svelte-4jfme{color:var(--primary)}.tabcontent-wrap.svelte-4jfme{overflow:hidden;transition:none}.tabcontent.svelte-4jfme{display:flex;align-items:flex-start;flex-wrap:nowrap;transform:translate3d(0%, 0px, 0px);transition:transform .35s cubic-bezier(.4,0,.2,1);will-change:transform}.tabindicator.svelte-4jfme{height:2px;position:absolute;left:0;bottom:0;transition:left .2s cubic-bezier(.4,0,.2,1);background-color:var(--primary)}",append(Kn.head,t)),init(this,e,tl,el,safe_not_equal,{class:1,style:2,tabNames:3,activeTab:0});}}function ll(e){let t,n,o,i,r;const a=e[5].default,d=create_slot(a,e,e[4],null);let p=[{class:n="tabcontent-page "+e[0]},{style:e[1]},e[2]],v={};for(let e=0;e<p.length;e+=1)v=assign(v,p[e]);return {c(){t=element("div"),d&&d.c(),set_attributes(t,v),toggle_class(t,"svelte-1cy2yx5",!0);},m(n,s){insert(n,t,s),d&&d.m(t,null),o=!0,i||(r=action_destroyer(e[3].call(null,t)),i=!0);},p(e,[l]){d&&d.p&&16&l&&update_slot(d,a,e,e[4],l,null,null),set_attributes(t,v=get_spread_update(p,[(!o||1&l&&n!==(n="tabcontent-page "+e[0]))&&{class:n},(!o||2&l)&&{style:e[1]},4&l&&e[2]])),toggle_class(t,"svelte-1cy2yx5",!0);},i(e){o||(transition_in(d,e),o=!0);},o(e){transition_out(d,e),o=!1;},d(e){e&&detach(t),d&&d.d(e),i=!1,r();}}}function ol(e,t,n){let{$$slots:l={},$$scope:o}=t;const i=oe(current_component);let{class:s=""}=t,{style:r=null}=t,a={};return e.$$set=e=>{n(6,t=assign(assign({},t),exclude_internal_props(e))),"class"in e&&n(0,s=e.class),"style"in e&&n(1,r=e.style),"$$scope"in e&&n(4,o=e.$$scope);},e.$$.update=()=>{{const{style:e,...l}=t;n(2,a=l);}},t=exclude_internal_props(t),[s,r,a,i,o,l]}class il extends SvelteComponent{constructor(e){var t;super(),document.getElementById("svelte-1cy2yx5-style")||((t=element("style")).id="svelte-1cy2yx5-style",t.textContent=".tabcontent-page.svelte-1cy2yx5{width:100%;flex:1 0 100%}",append(document.head,t)),init(this,e,ol,ll,safe_not_equal,{class:0,style:1});}}

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
    			attr_dev(div0, "class", "title svelte-13a20qe");
    			add_location(div0, file, 28, 2, 453);
    			attr_dev(div1, "class", "header-bar svelte-13a20qe");
    			add_location(div1, file, 27, 0, 426);
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

    /* src/Court.svelte generated by Svelte v3.32.3 */
    const file$1 = "src/Court.svelte";

    function create_fragment$1(ctx) {
    	let svg_1;
    	let rect0;
    	let rect1;
    	let circle0;
    	let g0;
    	let rect2;
    	let circle1;
    	let line0;
    	let line1;
    	let g1;
    	let rect3;
    	let line2;
    	let line3;
    	let g2;
    	let rect4;
    	let line4;
    	let line5;
    	let line6;
    	let line7;
    	let rect5;
    	let g3;
    	let rect6;
    	let line8;
    	let rect7;
    	let g4;
    	let rect8;
    	let line9;
    	let line10;
    	let line11;
    	let line12;
    	let g5;
    	let rect9;
    	let line13;
    	let line14;
    	let g6;
    	let rect10;
    	let circle2;
    	let line15;
    	let line16;
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
    			circle1 = svg_element("circle");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			g1 = svg_element("g");
    			rect3 = svg_element("rect");
    			line2 = svg_element("line");
    			line3 = svg_element("line");
    			g2 = svg_element("g");
    			rect4 = svg_element("rect");
    			line4 = svg_element("line");
    			line5 = svg_element("line");
    			line6 = svg_element("line");
    			line7 = svg_element("line");
    			rect5 = svg_element("rect");
    			g3 = svg_element("g");
    			rect6 = svg_element("rect");
    			line8 = svg_element("line");
    			rect7 = svg_element("rect");
    			g4 = svg_element("g");
    			rect8 = svg_element("rect");
    			line9 = svg_element("line");
    			line10 = svg_element("line");
    			line11 = svg_element("line");
    			line12 = svg_element("line");
    			g5 = svg_element("g");
    			rect9 = svg_element("rect");
    			line13 = svg_element("line");
    			line14 = svg_element("line");
    			g6 = svg_element("g");
    			rect10 = svg_element("rect");
    			circle2 = svg_element("circle");
    			line15 = svg_element("line");
    			line16 = svg_element("line");
    			attr_dev(rect0, "class", "free svelte-1073xl5");
    			attr_dev(rect0, "width", "30");
    			attr_dev(rect0, "height", "15");
    			attr_dev(rect0, "rx", "1");
    			add_location(rect0, file$1, 95, 2, 2187);
    			attr_dev(rect1, "class", "court svelte-1073xl5");
    			attr_dev(rect1, "width", "18");
    			attr_dev(rect1, "height", "9");
    			attr_dev(rect1, "x", "6");
    			attr_dev(rect1, "y", "3");
    			add_location(rect1, file$1, 96, 2, 2241);
    			attr_dev(circle0, "id", "contact");
    			attr_dev(circle0, "class", "contact svelte-1073xl5");
    			attr_dev(circle0, "cx", "15");
    			attr_dev(circle0, "cy", "7.5");
    			attr_dev(circle0, "r", "0.105");
    			add_location(circle0, file$1, 98, 2, 2301);
    			attr_dev(rect2, "id", "free-top-area");
    			attr_dev(rect2, "class", "area svelte-1073xl5");
    			attr_dev(rect2, "width", "30");
    			attr_dev(rect2, "height", "3");
    			attr_dev(rect2, "x", "0");
    			attr_dev(rect2, "y", "0");
    			add_location(rect2, file$1, 101, 4, 2435);
    			attr_dev(circle1, "id", "free-top-post");
    			attr_dev(circle1, "class", "post svelte-1073xl5");
    			attr_dev(circle1, "cx", "15");
    			attr_dev(circle1, "cy", "2");
    			attr_dev(circle1, "r", "0.1012");
    			add_location(circle1, file$1, 102, 4, 2516);
    			attr_dev(line0, "id", "free-top-extA");
    			attr_dev(line0, "class", "boundary extension svelte-1073xl5");
    			attr_dev(line0, "x1", "12");
    			attr_dev(line0, "y1", "3");
    			attr_dev(line0, "x2", "12");
    			attr_dev(line0, "y2", "1.25");
    			add_location(line0, file$1, 103, 4, 2667);
    			attr_dev(line1, "id", "free-top-extB");
    			attr_dev(line1, "class", "boundary extension svelte-1073xl5");
    			attr_dev(line1, "x1", "18");
    			attr_dev(line1, "y1", "3");
    			attr_dev(line1, "x2", "18");
    			attr_dev(line1, "y2", "1.25");
    			add_location(line1, file$1, 104, 4, 2761);
    			attr_dev(g0, "class", "svelte-1073xl5");
    			add_location(g0, file$1, 100, 2, 2427);
    			attr_dev(rect3, "id", "free-home-area");
    			attr_dev(rect3, "class", "area svelte-1073xl5");
    			attr_dev(rect3, "width", "6");
    			attr_dev(rect3, "height", "9");
    			attr_dev(rect3, "x", "0");
    			attr_dev(rect3, "y", "3");
    			add_location(rect3, file$1, 107, 4, 2868);
    			attr_dev(line2, "id", "free-home-extA");
    			attr_dev(line2, "class", "boundary extension svelte-1073xl5");
    			attr_dev(line2, "x1", "6");
    			attr_dev(line2, "y1", "3");
    			attr_dev(line2, "x2", "4.25");
    			attr_dev(line2, "y2", "3");
    			add_location(line2, file$1, 108, 4, 2947);
    			attr_dev(line3, "id", "free-home-extB");
    			attr_dev(line3, "class", "boundary extension svelte-1073xl5");
    			attr_dev(line3, "x1", "6");
    			attr_dev(line3, "y1", "12");
    			attr_dev(line3, "x2", "4.25");
    			attr_dev(line3, "y2", "12");
    			add_location(line3, file$1, 109, 4, 3038);
    			attr_dev(g1, "class", "svelte-1073xl5");
    			add_location(g1, file$1, 106, 2, 2860);
    			attr_dev(rect4, "id", "court-home-area");
    			attr_dev(rect4, "class", "area svelte-1073xl5");
    			attr_dev(rect4, "width", "7.8");
    			attr_dev(rect4, "height", "9");
    			attr_dev(rect4, "x", "6");
    			attr_dev(rect4, "y", "3");
    			add_location(rect4, file$1, 112, 4, 3144);
    			attr_dev(line4, "id", "court-home-tapeA");
    			attr_dev(line4, "class", "court boundary svelte-1073xl5");
    			attr_dev(line4, "x1", "15");
    			attr_dev(line4, "y1", "12");
    			attr_dev(line4, "x2", "6");
    			attr_dev(line4, "y2", "12");
    			add_location(line4, file$1, 113, 4, 3227);
    			attr_dev(line5, "id", "court-home-tapeB");
    			attr_dev(line5, "class", "court boundary svelte-1073xl5");
    			attr_dev(line5, "x1", "6");
    			attr_dev(line5, "y1", "12");
    			attr_dev(line5, "x2", "6");
    			attr_dev(line5, "y2", "3");
    			add_location(line5, file$1, 114, 4, 3316);
    			attr_dev(line6, "id", "court-home-tapeC");
    			attr_dev(line6, "class", "court boundary svelte-1073xl5");
    			attr_dev(line6, "x1", "6");
    			attr_dev(line6, "y1", "3");
    			attr_dev(line6, "x2", "15");
    			attr_dev(line6, "y2", "3");
    			add_location(line6, file$1, 115, 4, 3403);
    			attr_dev(line7, "id", "court-home-tapeD");
    			attr_dev(line7, "class", "court boundary svelte-1073xl5");
    			attr_dev(line7, "x1", "12");
    			attr_dev(line7, "y1", "3");
    			attr_dev(line7, "x2", "12");
    			attr_dev(line7, "y2", "12");
    			add_location(line7, file$1, 116, 4, 3490);
    			attr_dev(g2, "class", "svelte-1073xl5");
    			add_location(g2, file$1, 111, 2, 3136);
    			attr_dev(rect5, "id", "block-home-area");
    			attr_dev(rect5, "class", "block area svelte-1073xl5");
    			attr_dev(rect5, "width", "0.8");
    			attr_dev(rect5, "height", "9");
    			attr_dev(rect5, "x", "13.8");
    			attr_dev(rect5, "y", "3");
    			add_location(rect5, file$1, 118, 2, 3584);
    			attr_dev(rect6, "id", "net-area");
    			attr_dev(rect6, "class", "net area svelte-1073xl5");
    			attr_dev(rect6, "width", "0.8");
    			attr_dev(rect6, "height", "9");
    			attr_dev(rect6, "x", "14.6");
    			attr_dev(rect6, "y", "3");
    			add_location(rect6, file$1, 120, 4, 3681);
    			attr_dev(line8, "id", "net-tape");
    			attr_dev(line8, "class", "court boundary svelte-1073xl5");
    			attr_dev(line8, "x1", "15");
    			attr_dev(line8, "y1", "3");
    			attr_dev(line8, "x2", "15");
    			attr_dev(line8, "y2", "12");
    			add_location(line8, file$1, 121, 4, 3763);
    			attr_dev(g3, "class", "svelte-1073xl5");
    			add_location(g3, file$1, 119, 2, 3673);
    			attr_dev(rect7, "id", "block-away-area");
    			attr_dev(rect7, "class", "block area svelte-1073xl5");
    			attr_dev(rect7, "width", "0.8");
    			attr_dev(rect7, "height", "9");
    			attr_dev(rect7, "x", "15.4");
    			attr_dev(rect7, "y", "3");
    			add_location(rect7, file$1, 123, 2, 3849);
    			attr_dev(rect8, "id", "court-away-area");
    			attr_dev(rect8, "class", "area svelte-1073xl5");
    			attr_dev(rect8, "width", "7.8");
    			attr_dev(rect8, "height", "9");
    			attr_dev(rect8, "x", "16.2");
    			attr_dev(rect8, "y", "3");
    			add_location(rect8, file$1, 125, 4, 3946);
    			attr_dev(line9, "id", "court-away-tapeA");
    			attr_dev(line9, "class", "court boundary svelte-1073xl5");
    			attr_dev(line9, "x1", "15");
    			attr_dev(line9, "y1", "3");
    			attr_dev(line9, "x2", "24");
    			attr_dev(line9, "y2", "3");
    			add_location(line9, file$1, 126, 4, 4032);
    			attr_dev(line10, "id", "court-away-tapeB");
    			attr_dev(line10, "class", "court boundary svelte-1073xl5");
    			attr_dev(line10, "x1", "24");
    			attr_dev(line10, "y1", "3");
    			attr_dev(line10, "x2", "24");
    			attr_dev(line10, "y2", "12");
    			add_location(line10, file$1, 127, 4, 4120);
    			attr_dev(line11, "id", "court-away-tapeC");
    			attr_dev(line11, "class", "court boundary svelte-1073xl5");
    			attr_dev(line11, "x1", "24");
    			attr_dev(line11, "y1", "12");
    			attr_dev(line11, "x2", "15");
    			attr_dev(line11, "y2", "12");
    			add_location(line11, file$1, 128, 4, 4209);
    			attr_dev(line12, "id", "court-away-tapeD");
    			attr_dev(line12, "class", "court boundary svelte-1073xl5");
    			attr_dev(line12, "x1", "18");
    			attr_dev(line12, "y1", "3");
    			attr_dev(line12, "x2", "18");
    			attr_dev(line12, "y2", "12");
    			add_location(line12, file$1, 129, 4, 4299);
    			attr_dev(g4, "class", "svelte-1073xl5");
    			add_location(g4, file$1, 124, 2, 3938);
    			attr_dev(rect9, "id", "free-away-area");
    			attr_dev(rect9, "class", "area svelte-1073xl5");
    			attr_dev(rect9, "width", "6");
    			attr_dev(rect9, "height", "9");
    			attr_dev(rect9, "x", "24");
    			attr_dev(rect9, "y", "3");
    			add_location(rect9, file$1, 132, 4, 4401);
    			attr_dev(line13, "id", "free-away-extA");
    			attr_dev(line13, "class", "boundary extension svelte-1073xl5");
    			attr_dev(line13, "x1", "24");
    			attr_dev(line13, "y1", "3");
    			attr_dev(line13, "x2", "25.75");
    			attr_dev(line13, "y2", "3");
    			add_location(line13, file$1, 133, 4, 4481);
    			attr_dev(line14, "id", "free-away-extB");
    			attr_dev(line14, "class", "boundary extension svelte-1073xl5");
    			attr_dev(line14, "x1", "24");
    			attr_dev(line14, "y1", "12");
    			attr_dev(line14, "x2", "25.75");
    			attr_dev(line14, "y2", "12");
    			add_location(line14, file$1, 134, 4, 4574);
    			attr_dev(g5, "class", "svelte-1073xl5");
    			add_location(g5, file$1, 131, 2, 4393);
    			attr_dev(rect10, "id", "free-bottom-area");
    			attr_dev(rect10, "class", "area svelte-1073xl5");
    			attr_dev(rect10, "width", "30");
    			attr_dev(rect10, "height", "3");
    			attr_dev(rect10, "x", "0");
    			attr_dev(rect10, "y", "12");
    			add_location(rect10, file$1, 137, 4, 4682);
    			attr_dev(circle2, "id", "free-bottom-post");
    			attr_dev(circle2, "class", "post svelte-1073xl5");
    			attr_dev(circle2, "cx", "15");
    			attr_dev(circle2, "cy", "13");
    			attr_dev(circle2, "r", "0.1012");
    			add_location(circle2, file$1, 138, 4, 4767);
    			attr_dev(line15, "id", "free-bottom-extA");
    			attr_dev(line15, "class", "boundary extension svelte-1073xl5");
    			attr_dev(line15, "x1", "12");
    			attr_dev(line15, "y1", "12");
    			attr_dev(line15, "x2", "12");
    			attr_dev(line15, "y2", "13.75");
    			add_location(line15, file$1, 139, 4, 4843);
    			attr_dev(line16, "id", "free-bottom-extB");
    			attr_dev(line16, "class", "boundary extension svelte-1073xl5");
    			attr_dev(line16, "x1", "18");
    			attr_dev(line16, "y1", "12");
    			attr_dev(line16, "x2", "18");
    			attr_dev(line16, "y2", "13.75");
    			add_location(line16, file$1, 140, 4, 4942);
    			attr_dev(g6, "class", "svelte-1073xl5");
    			add_location(g6, file$1, 136, 2, 4674);
    			attr_dev(svg_1, "id", "play-area");
    			attr_dev(svg_1, "viewBox", "3 1.5 24 12");
    			attr_dev(svg_1, "class", "svelte-1073xl5");
    			add_location(svg_1, file$1, 94, 0, 2042);
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
    			append_dev(g0, circle1);
    			append_dev(g0, line0);
    			append_dev(g0, line1);
    			append_dev(svg_1, g1);
    			append_dev(g1, rect3);
    			append_dev(g1, line2);
    			append_dev(g1, line3);
    			append_dev(svg_1, g2);
    			append_dev(g2, rect4);
    			append_dev(g2, line4);
    			append_dev(g2, line5);
    			append_dev(g2, line6);
    			append_dev(g2, line7);
    			append_dev(svg_1, rect5);
    			append_dev(svg_1, g3);
    			append_dev(g3, rect6);
    			append_dev(g3, line8);
    			append_dev(svg_1, rect7);
    			append_dev(svg_1, g4);
    			append_dev(g4, rect8);
    			append_dev(g4, line9);
    			append_dev(g4, line10);
    			append_dev(g4, line11);
    			append_dev(g4, line12);
    			append_dev(svg_1, g5);
    			append_dev(g5, rect9);
    			append_dev(g5, line13);
    			append_dev(g5, line14);
    			append_dev(svg_1, g6);
    			append_dev(g6, rect10);
    			append_dev(g6, circle2);
    			append_dev(g6, line15);
    			append_dev(g6, line16);

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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Court",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/Recorder.svelte generated by Svelte v3.32.3 */

    const { console: console_1 } = globals;
    const file$2 = "src/Recorder.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    // (275:2) <div slot="activator">
    function create_activator_slot(ctx) {
    	let div;
    	let court;
    	let current;
    	court = new Court({ $$inline: true });
    	court.$on("contact", /*on_contact*/ ctx[6]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(court.$$.fragment);
    			attr_dev(div, "slot", "activator");
    			add_location(div, file$2, 274, 2, 9946);
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
    		source: "(275:2) <div slot=\\\"activator\\\">",
    		ctx
    	});

    	return block;
    }

    // (282:4) <Button class='menu-item' on:click={()=>specify(s.type, s.value)}>
    function create_default_slot_3(ctx) {
    	let t0;
    	let t1_value = /*s*/ ctx[33].value + "";
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("#");
    			t1 = text(t1_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*current*/ 1 && t1_value !== (t1_value = /*s*/ ctx[33].value + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(282:4) <Button class='menu-item' on:click={()=>specify(s.type, s.value)}>",
    		ctx
    	});

    	return block;
    }

    // (281:2) {#each g as s}
    function create_each_block_2(ctx) {
    	let button;
    	let current;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*s*/ ctx[33]);
    	}

    	button = new ye({
    			props: {
    				class: "menu-item",
    				$$slots: { default: [create_default_slot_3] },
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

    			if (dirty[0] & /*current*/ 1 | dirty[1] & /*$$scope*/ 1024) {
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
    		source: "(281:2) {#each g as s}",
    		ctx
    	});

    	return block;
    }

    // (280:6) <ButtonGroup>
    function create_default_slot_2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_2 = /*g*/ ctx[36];
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
    			if (dirty[0] & /*specify, current*/ 33) {
    				each_value_2 = /*g*/ ctx[36];
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
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(280:6) <ButtonGroup>",
    		ctx
    	});

    	return block;
    }

    // (279:2) {#each current.specifiers.groups as g}
    function create_each_block_1(ctx) {
    	let li;
    	let buttongroup;
    	let current;

    	buttongroup = new $e({
    			props: {
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			create_component(buttongroup.$$.fragment);
    			add_location(li, file$2, 279, 2, 10059);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(buttongroup, li, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const buttongroup_changes = {};

    			if (dirty[0] & /*current*/ 1 | dirty[1] & /*$$scope*/ 1024) {
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
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(279:2) {#each current.specifiers.groups as g}",
    		ctx
    	});

    	return block;
    }

    // (288:2) <Menuitem on:click={()=>specify(s.type, s.value)}>
    function create_default_slot_1(ctx) {
    	let t_value = /*s*/ ctx[33].value + "";
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
    		source: "(288:2) <Menuitem on:click={()=>specify(s.type, s.value)}>",
    		ctx
    	});

    	return block;
    }

    // (287:2) {#each specifiers.both as s}
    function create_each_block(ctx) {
    	let menuitem;
    	let current;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[9](/*s*/ ctx[33]);
    	}

    	menuitem = new Yn({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
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

    			if (dirty[1] & /*$$scope*/ 1024) {
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
    		id: create_each_block.name,
    		type: "each",
    		source: "(287:2) {#each specifiers.both as s}",
    		ctx
    	});

    	return block;
    }

    // (274:0) <Menu origin={menu_origin} {...menu_offset}>
    function create_default_slot(ctx) {
    	let t0;
    	let t1;
    	let hr;
    	let t2;
    	let each1_anchor;
    	let current;
    	let each_value_1 = /*current*/ ctx[0].specifiers.groups;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*specifiers*/ ctx[7].both;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			add_location(hr, file$2, 285, 2, 10228);
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
    			if (dirty[0] & /*current, specify*/ 33) {
    				each_value_1 = /*current*/ ctx[0].specifiers.groups;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
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

    			if (dirty[0] & /*specify, specifiers*/ 160) {
    				each_value = /*specifiers*/ ctx[7].both;
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
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(274:0) <Menu origin={menu_origin} {...menu_offset}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let h2;
    	let t1;
    	let div;
    	let menu;
    	let div_resize_listener;
    	let current;
    	const menu_spread_levels = [{ origin: /*menu_origin*/ ctx[4] }, /*menu_offset*/ ctx[3]];

    	let menu_props = {
    		$$slots: {
    			default: [create_default_slot],
    			activator: [create_activator_slot]
    		},
    		$$scope: { ctx }
    	};

    	for (let i = 0; i < menu_spread_levels.length; i += 1) {
    		menu_props = assign(menu_props, menu_spread_levels[i]);
    	}

    	menu = new kn({ props: menu_props, $$inline: true });

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "record a match";
    			t1 = space();
    			div = element("div");
    			create_component(menu.$$.fragment);
    			add_location(h2, file$2, 270, 0, 9790);
    			attr_dev(div, "class", "widener svelte-1pn1iis");
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[10].call(div));
    			add_location(div, file$2, 272, 0, 9815);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(menu, div, null);
    			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[10].bind(div));
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const menu_changes = (dirty[0] & /*menu_origin, menu_offset*/ 24)
    			? get_spread_update(menu_spread_levels, [
    					dirty[0] & /*menu_origin*/ 16 && { origin: /*menu_origin*/ ctx[4] },
    					dirty[0] & /*menu_offset*/ 8 && get_spread_object(/*menu_offset*/ ctx[3])
    				])
    			: {};

    			if (dirty[0] & /*current*/ 1 | dirty[1] & /*$$scope*/ 1024) {
    				menu_changes.$$scope = { dirty, ctx };
    			}

    			menu.$set(menu_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			destroy_component(menu);
    			div_resize_listener();
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
    	validate_slots("Recorder", slots, []);
    	const TEAM = { HOME: "home", AWAY: "away" };

    	const RALLY_STATE = {
    		SERVING: "serving",
    		SERVE_RECEIVING: "serve_receiving",
    		RECEIVING: "receiving"
    	};

    	const CONTACT = { PLAYER: "player", FLOOR: "floor" };

    	const ACTION = {
    		SERVE: "serve",
    		ACE: "ace",
    		SERVICE_ERROR: "service error",
    		DIG: "dig",
    		RECEPTION_ERROR: "reception error",
    		PASS: "pass",
    		PASSING_ERROR: "passing error",
    		ATTACK: "attack",
    		KILL: "kill",
    		ATACKING_ERROR: "attacking error",
    		BLOCK: "block",
    		BLOCKING_ERROR: "blocking error",
    		VIOLATION: "violation"
    	};

    	const on_new_match = serving => {
    		reset_match(match);
    		console.log("starting new match:", match);
    		recording = true;
    		$$invalidate(0, current.rally = new_rally(serving), current);
    		$$invalidate(0, current.specifiers = specifiers[serving], current);
    		console.log(`starting new rally, ${serving} team serving..`);
    		console.log("rally:", current.rally);
    	};

    	const reset_match = m => {
    		m.score.home = 0;
    		m.score.away = 0;
    		m.sets.forEach(s => s.splice(0));
    	};

    	const new_rally = serving => ({
    		state: RALLY_STATE.SERVING,
    		attacking_team: serving,
    		contacts: []
    	});

    	const needs_specifier = (contact, rally) => {
    		if (is_net_area(contact.area_id)) {
    			return false;
    		}

    		if (rally.state === RALLY_STATE.SERVING && !is_service_area(contact.area_id, rally.attacking_team)) {
    			return false;
    		}

    		return true;
    	};

    	const specify = (type, jersey = null) => {
    		specifying = false;
    		console.log(`specifying a ${type} contact${jersey ? ` (Jersey #${jersey})` : ""}`);
    		$$invalidate(0, current.contact.type = type, current);
    		$$invalidate(0, current.contact.player = jersey, current);
    		process_contact(current);
    	};

    	const set_menu_props = ({ el_x: x, el_y: y, el_rect }) => {
    		const { width: w, height: h } = el_rect;
    		const tb = y < h / 2 ? "top" : "bottom";
    		const lr = x < w / 2 ? "left" : "right";
    		const k = 80; // FIXME: where is this vertical offset coming from?
    		$$invalidate(4, menu_origin = `${tb} ${lr}`);
    		$$invalidate(3, menu_offset.dx = lr === "left" ? x : w - x, menu_offset);
    		$$invalidate(3, menu_offset.dy = tb === "top" ? y - k : h - y + k, menu_offset);
    	};

    	const is_out = area => area.startsWith(`free-top`) || area.startsWith(`free-bottom`);
    	const is_net_area = area => area.startsWith("net-");
    	const is_blocking_area = (area, team) => area.startsWith(`block-${team}`);
    	const is_service_area = (area, team) => area.startsWith(`free-${team}`);
    	const is_court_area = (area, team) => area.startsWith(`court-${team}`);
    	const other_team = team => team === TEAM.HOME ? TEAM.AWAY : TEAM.HOME;
    	const attacking_team = rally => rally.attacking_team;
    	const defending_team = rally => other_team(rally.attacking_team);

    	const process_contact = ({ contact, rally, match }) => {
    		console.log(`processing contact with ${contact.area_id}`);

    		// if contact is valid, record to rally: rally.contacts.push(contact);
    		// determine action
    		// if rally complete..
    		//   add rally to set: match.sets[current.set_index].push(current.rally)
    		//   update score
    		//   start new rally with correct server
    		// if set complete..
    		//   is game complete?
    		//   update set index
    		//   start new rally with correct server
    		let is_valid = true;

    		let rally_ends = true;
    		let next_team = rally.attacking_team; // default to same team
    		let action;

    		switch (rally.state) {
    			case RALLY_STATE.SERVING:
    				if (!is_service_area(contact.area_id, rally.attacking_team)) {
    					is_valid = false;
    					console.log(`invalid contact; expected service area of ${rally.attacking_team} team`);
    				} else {
    					action = ACTION.SERVE;
    					rally.state = RALLY_STATE.SERVE_RECEIVING;
    					rally_ends = false;
    				}
    				break;
    			case RALLY_STATE.SERVE_RECEIVING:
    				if (is_court_area(contact.area_id, rally.attacking_team) || is_blocking_area(contact.area_id, rally.attacking_team)) {
    					console.log("service error, ball contact on serving team court");
    					action = ACTION.SERVICE_ERROR;

    					// point for defending team
    					next_team = other_team(rally.attacking_team);
    				}
    				if (is_net_area(contact.area_id)) {
    					console.log("service error, net contact");
    					action = ACTION.SERVICE_ERROR;

    					// point for defending team
    					next_team = other_team(rally.attacking_team);
    				}
    				if (is_out(contact.area_id)) {
    					console.log(`service error, unless defending team touched it; check contact type (${contact.type})`);
    				}
    				// action = ACTION.DIG
    				// next_team = other_team(rally.attacking_team);
    				if (is_blocking_area(contact.area_id, defending_team(rally))) {
    					console.log("reception error; cannot block a serve"); // if defender touched it:
    					// rally_ends = false;

    					action = ACTION.RECEPTION_ERROR;
    				}
    				if (is_court_area(contact.area_id, defending_team(rally))) {
    					console.log(`some kind of reception; check contact type (${contact.type})`); // point for attacking team

    					// if proper reception:
    					// count 1 hit
    					rally_ends = false;

    					next_team = other_team(rally.attacking_team);
    				}
    				break;
    			case RALLY_STATE.RECEIVING:
    				if (is_court_area(contact.area_id, rally.attacking_team) || is_blocking_area(contact.area_id, rally.attacking_team)) {
    					console.log("attack, block, pass, or error; ball contact on attacking team court");

    					// check count and previous action
    					action = ACTION.ATTACK_ERROR;

    					// point for defending team
    					next_team = other_team(rally.attacking_team);
    				}
    				if (is_net_area(contact.area_id)) {
    					console.log("attack, block, or pass error; ball contact with net");
    					action = ACTION.ATTACK_ERROR;

    					// point for defending team
    					next_team = other_team(rally.attacking_team);
    				}
    				if (is_out(contact.area_id)) {
    					console.log(`attack, block, or pass error, unless attacking team touched it and has hits left; check contact type (${contact.type})`);
    				}
    				// action = ACTION.DIG
    				// next_team = other_team(rally.attacking_team);
    				if (is_blocking_area(contact.area_id, defending_team(rally))) {
    					console.log(`block or attack attempt if person (check next contact), attack, block, or pass error if floor; check contact type (${contact.type})`); // if attacker touched it:
    					// rally_ends = false;
    				}
    				if (is_court_area(contact.area_id, defending_team(rally))) {
    					console.log(`pass or attack attempt if person (check next contact), attack, block, or pass error if floor; check contact type (${contact.type})`); // action gets set after next analysis?

    					// if proper reception:
    					// count 1 hit
    					rally_ends = false;

    					action = ACTION.DIG;
    				}
    				break;
    		}

    		if (is_valid) {
    			if (action) {
    				contact.action = action;
    				console.log(`action: ${contact.action.toUpperCase()}`);
    			} else {
    				console.log("no action");
    			}

    			rally.contacts.push(contact);
    			$$invalidate(0, current.specifiers = specifiers[next_team], current);

    			if (rally_ends) {
    				console.log("rally ends");
    				console.log(`starting new rally, ${next_team} team serving..`);
    				$$invalidate(0, current.rally = new_rally(next_team), current);
    				$$invalidate(0, current.rally.state = RALLY_STATE.SERVING, current);
    			} else {
    				console.log("rally continues"); // award a point
    			}

    			// match ends?
    			console.log("rally:", current.rally);
    		}
    	};

    	const on_contact = e => {
    		if (specifying) {
    			specifying = false;
    			console.log("specify cancelled");
    			return;
    		}

    		if (!recording) {
    			console.log("not in recording mode");
    			return;
    		}

    		const contact = e.detail;
    		const { area_id, court_x, court_y, screen_x, screen_y } = contact;
    		console.log(`contact with ${area_id} at [${contact.el_x}, ${contact.el_y}]`);
    		$$invalidate(0, current.contact = contact, current);

    		if (needs_specifier(current.contact, current.rally)) {
    			specifying = true;
    			set_menu_props(current.contact);
    		} else {
    			contact.source_event.stopPropagation();
    			process_contact(current);
    		}
    	};

    	let recording = false;
    	let specifying = false;
    	let action_log = [];

    	let match = {
    		score: { home: 0, away: 0 },
    		sets: [[], [], []]
    	};

    	let current = {
    		set_index: -1,
    		rally: null,
    		contact: null,
    		specifiers: null
    	};

    	let menu_width, menu_height; // read-only
    	let menu_offset = { dx: 0, dy: 0 };
    	let menu_origin = "top left";

    	let specifiers = {
    		"home": {
    			"groups": [
    				[
    					{ type: CONTACT.PLAYER, value: "02" },
    					{ type: CONTACT.PLAYER, value: "03" },
    					{ type: CONTACT.PLAYER, value: "04" },
    					{ type: CONTACT.PLAYER, value: "06" }
    				],
    				[
    					{ type: CONTACT.PLAYER, value: "08" },
    					{ type: CONTACT.PLAYER, value: "09" },
    					{ type: CONTACT.PLAYER, value: "10" },
    					{ type: CONTACT.PLAYER, value: "11" }
    				],
    				[
    					{ type: CONTACT.PLAYER, value: "12" },
    					{ type: CONTACT.PLAYER, value: "27" }
    				]
    			]
    		},
    		"away": {
    			"groups": [[{ type: CONTACT.PLAYER, value: "Player" }]]
    		},
    		"both": [{ type: CONTACT.FLOOR, value: "Floor" }]
    	};

    	onMount(async () => {
    		// TODO: move this to a `New Match` button that prompts for serving team
    		on_new_match(TEAM.HOME);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Recorder> was created with unknown prop '${key}'`);
    	});

    	const click_handler = s => specify(s.type, s.value);
    	const click_handler_1 = s => specify(s.type, s.value);

    	function div_elementresize_handler() {
    		menu_width = this.clientWidth;
    		menu_height = this.clientHeight;
    		$$invalidate(1, menu_width);
    		$$invalidate(2, menu_height);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		ButtonGroup: $e,
    		Button: ye,
    		Menu: kn,
    		Menuitem: Yn,
    		Court,
    		TEAM,
    		RALLY_STATE,
    		CONTACT,
    		ACTION,
    		on_new_match,
    		reset_match,
    		new_rally,
    		needs_specifier,
    		specify,
    		set_menu_props,
    		is_out,
    		is_net_area,
    		is_blocking_area,
    		is_service_area,
    		is_court_area,
    		other_team,
    		attacking_team,
    		defending_team,
    		process_contact,
    		on_contact,
    		recording,
    		specifying,
    		action_log,
    		match,
    		current,
    		menu_width,
    		menu_height,
    		menu_offset,
    		menu_origin,
    		specifiers
    	});

    	$$self.$inject_state = $$props => {
    		if ("recording" in $$props) recording = $$props.recording;
    		if ("specifying" in $$props) specifying = $$props.specifying;
    		if ("action_log" in $$props) action_log = $$props.action_log;
    		if ("match" in $$props) match = $$props.match;
    		if ("current" in $$props) $$invalidate(0, current = $$props.current);
    		if ("menu_width" in $$props) $$invalidate(1, menu_width = $$props.menu_width);
    		if ("menu_height" in $$props) $$invalidate(2, menu_height = $$props.menu_height);
    		if ("menu_offset" in $$props) $$invalidate(3, menu_offset = $$props.menu_offset);
    		if ("menu_origin" in $$props) $$invalidate(4, menu_origin = $$props.menu_origin);
    		if ("specifiers" in $$props) $$invalidate(7, specifiers = $$props.specifiers);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		current,
    		menu_width,
    		menu_height,
    		menu_offset,
    		menu_origin,
    		specify,
    		on_contact,
    		specifiers,
    		click_handler,
    		click_handler_1,
    		div_elementresize_handler
    	];
    }

    class Recorder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Recorder",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Visualizer.svelte generated by Svelte v3.32.3 */

    const file$3 = "src/Visualizer.svelte";

    function create_fragment$3(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "visualize stats";
    			add_location(h2, file$3, 0, 0, 0);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Visualizer",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.3 */

    const { Object: Object_1 } = globals;
    const file$4 = "src/App.svelte";

    // (41:2) <Tab>
    function create_default_slot_2$1(ctx) {
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
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(41:2) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (42:2) <Tab>
    function create_default_slot_1$1(ctx) {
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
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(42:2) <Tab>",
    		ctx
    	});

    	return block;
    }

    // (40:0) <Tabs tabNames={['record', 'visualize']}>
    function create_default_slot$1(ctx) {
    	let tab0;
    	let t;
    	let tab1;
    	let current;

    	tab0 = new il({
    			props: {
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	tab1 = new il({
    			props: {
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tab0.$$.fragment);
    			t = space();
    			create_component(tab1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(tab1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab0_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				tab0_changes.$$scope = { dirty, ctx };
    			}

    			tab0.$set(tab0_changes);
    			const tab1_changes = {};

    			if (dirty & /*$$scope*/ 8) {
    				tab1_changes.$$scope = { dirty, ctx };
    			}

    			tab1.$set(tab1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab0.$$.fragment, local);
    			transition_in(tab1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab0.$$.fragment, local);
    			transition_out(tab1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab0, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(tab1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(40:0) <Tabs tabNames={['record', 'visualize']}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
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
    				tabNames: ["record", "visualize"],
    				$$slots: { default: [create_default_slot$1] },
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
    			add_location(br0, file$4, 37, 28, 1234);
    			add_location(br1, file$4, 37, 33, 1239);
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

    			if (dirty & /*$$scope*/ 8) {
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const prefers_dark = () => window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    	const toggle_theme = palette => {
    		const d = document.documentElement;

    		if (d.attributes.getNamedItem("style")) {
    			d.removeAttribute("style");
    		} else {
    			Object.keys(palette).map(k => d.style.setProperty(k, palette[k]));
    		}
    	};

    	const dark_theme = {
    		"--accent": "#ff6fab",
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
    		HeaderBar,
    		Recorder,
    		Visualizer,
    		prefers_dark,
    		toggle_theme,
    		dark_theme
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
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
